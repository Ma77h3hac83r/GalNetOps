/** SQLite database service: migrations, systems/bodies/biologicals/route_history/codex CRUD, scan value calculation, and import/backup. */
import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import { 
  System, 
  CelestialBody, 
  Biological,
  CodexEntry,
  RouteEntry,
  RouteHistoryFilter,
  RouteSession,
  ScanEvent,
  BodyType,
  ScanStatus 
} from '../../shared/types';
import { DB_NAME, calculateScanValue, estimateFssValueForBody, estimateDssValueForBody, NO_SCAN_VALUE_BODY_TYPES } from '../../shared/constants';
import { migrations, getPendingMigrations, getLatestVersion } from '../migrations';
import { logInfo, logError } from '../logger';

/** Classification of SQLite errors for handling: retry, user message, or fatal. */
export type DbErrorKind = 'transient' | 'constraint' | 'corruption' | 'config' | 'unknown';

export interface DbErrorClassification {
  kind: DbErrorKind;
  code: string;
  message: string;
  retryable: boolean;
  userMessage: string;
}

/**
 * Classify a SQLite/better-sqlite3 error for handling.
 * Transient (SQLITE_BUSY, SQLITE_LOCKED) → retry; constraint → user message; corruption/config → alert.
 */
export function classifyDbError(error: unknown): DbErrorClassification {
  const message = error instanceof Error ? error.message : String(error);
  const code =
    error != null && typeof (error as { code?: string }).code === 'string'
      ? (error as { code: string }).code
      : '';

  if (code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED') {
    return { kind: 'transient', code, message, retryable: true, userMessage: 'Database is busy; please try again.' };
  }
  if (code.startsWith('SQLITE_CONSTRAINT')) {
    return { kind: 'constraint', code, message, retryable: false, userMessage: 'A database constraint was violated.' };
  }
  if (code === 'SQLITE_CORRUPT' || code === 'SQLITE_NOTADB') {
    return { kind: 'corruption', code, message, retryable: false, userMessage: 'Database file may be corrupted.' };
  }
  if (code === 'SQLITE_READONLY' || code === 'SQLITE_CANTOPEN' || code === 'SQLITE_FULL') {
    return { kind: 'config', code, message, retryable: false, userMessage: 'Database configuration error.' };
  }
  return { kind: 'unknown', code, message, retryable: false, userMessage: message };
}

export class DatabaseService {
  private db: Database.Database | null = null;

  /**
   * Escape LIKE special characters (%, _) and backslash so user input is treated as literal.
   * Use with LIKE ... ESCAPE '\' so that \% \_ and \\ match literal % _ and \.
   */
  private static escapeLikeLiteral(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  /** Open DB at userData path, set pragmas (WAL, synchronous, foreign_keys, busy_timeout), and run pending migrations. */
  async initialize(): Promise<void> {
    const dbPath = path.join(app.getPath('userData'), DB_NAME);
    this.db = new Database(dbPath);

    // Configure pragmas immediately after open (per-connection; SQLite safety 2.1)
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');

    // Verify critical settings at runtime
    const fkEnabled = this.db.pragma('foreign_keys', { simple: true }) as number;
    if (fkEnabled !== 1) {
      this.db.close();
      this.db = null;
      throw new Error('Database configuration failed: foreign_keys could not be enabled');
    }

    // Run database migrations
    this.runMigrations();
  }

  /**
   * Run all pending database migrations
   * Migrations are run in order of version number within a transaction
   */
  private runMigrations(): void {
    if (!this.db) throw new Error('Database not initialized');

    // Ensure settings table exists for version tracking
    // This is the only table we create outside of migrations
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    const currentVersion = this.getSchemaVersion();
    const pendingMigrations = getPendingMigrations(currentVersion);
    const latestVersion = getLatestVersion();

    if (pendingMigrations.length === 0) {
      logInfo('Database', `Schema up to date (version ${currentVersion})`);
      return;
    }

    logInfo('Database', `Running ${pendingMigrations.length} migration(s) from version ${currentVersion} to ${latestVersion}`);

    for (const migration of pendingMigrations) {
      logInfo('Database', `Running migration ${migration.version}: ${migration.description}`);
      
      try {
        // Run each migration in its own transaction for safety
        this.db.exec('BEGIN TRANSACTION');
        
        migration.up(this.db);
        this.setSchemaVersion(migration.version);
        
        this.db.exec('COMMIT');
        logInfo('Database', `Migration ${migration.version} completed`);
      } catch (error) {
        this.db.exec('ROLLBACK');
        const c = classifyDbError(error);
        logError('Database', `Migration ${migration.version} failed [${c.kind}] ${c.code}`, error);
        const err = new Error(`Database migration ${migration.version} failed: ${c.userMessage}`) as Error & { dbCode?: string; retryable?: boolean };
        err.dbCode = c.code;
        err.retryable = c.retryable;
        throw err;
      }
    }

    logInfo('Database', `Migrations complete. Schema version: ${latestVersion}`);
  }

  /**
   * Get the current database schema version
   * @returns Current version number, or 0 if not set (fresh install)
   */
  getSchemaVersion(): number {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const stmt = this.db.prepare(`SELECT value FROM settings WHERE key = 'schema_version'`);
      const row = stmt.get() as { value: string } | undefined;
      return row ? parseInt(row.value, 10) : 0;
    } catch {
      // Settings table might not exist yet
      return 0;
    }
  }

  /**
   * Set the current database schema version
   * @param version The version number to set
   */
  private setSchemaVersion(version: number): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('schema_version', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(version.toString());
  }

  // System CRUD: upsert by system_address, get current/by-id/by-name, bodies, search
  upsertSystem(
    systemAddress: number,
    name: string,
    starPos: [number, number, number],
    bodyCount?: number
  ): System {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO systems (system_address, name, star_pos_x, star_pos_y, star_pos_z, first_visited, last_visited, body_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(system_address) DO UPDATE SET
        last_visited = excluded.last_visited,
        body_count = COALESCE(excluded.body_count, body_count)
      RETURNING *
    `);

    const row = stmt.get(
      systemAddress, 
      name, 
      starPos[0], 
      starPos[1], 
      starPos[2], 
      now, 
      now,
      bodyCount ?? null
    ) as Record<string, unknown>;

    return this.rowToSystem(row);
  }

  getCurrentSystem(): System | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT * FROM systems ORDER BY last_visited DESC LIMIT 1
    `);

    const row = stmt.get() as Record<string, unknown> | undefined;
    return row ? this.rowToSystem(row) : null;
  }

  getSystemByAddress(systemAddress: number): System | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`SELECT * FROM systems WHERE system_address = ?`);
    const row = stmt.get(systemAddress) as Record<string, unknown> | undefined;
    return row ? this.rowToSystem(row) : null;
  }

  getSystemById(id: number): System | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`SELECT * FROM systems WHERE id = ?`);
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.rowToSystem(row) : null;
  }

  /**
   * Search for systems by name (partial match)
   * Returns up to `limit` results, ordered by relevance
   */
  searchSystems(query: string, limit: number = 10): System[] {
    if (!this.db) throw new Error('Database not initialized');
    if (!query || query.trim().length === 0) return [];

    const trimmedQuery = query.trim();
    const escapedForLike = DatabaseService.escapeLikeLiteral(trimmedQuery);

    // Search with exact match first, then partial matches. Escape % and _ in user input so they are literals.
    const stmt = this.db.prepare(`
      SELECT *, 
        CASE 
          WHEN LOWER(name) = LOWER(?) THEN 0
          WHEN LOWER(name) LIKE LOWER(? || '%') THEN 1
          ELSE 2
        END as relevance
      FROM systems 
      WHERE LOWER(name) LIKE LOWER('%' || ? || '%') ESCAPE '\\'
      ORDER BY relevance, last_visited DESC
      LIMIT ?
    `);

    const rows = stmt.all(trimmedQuery, trimmedQuery, escapedForLike, limit) as Record<string, unknown>[];
    return rows.map(row => this.rowToSystem(row));
  }

  /**
   * Get a system by exact name match
   */
  getSystemByName(name: string): System | null {
    if (!this.db) throw new Error('Database not initialized');
    if (!name || name.trim().length === 0) return null;

    const stmt = this.db.prepare(`SELECT * FROM systems WHERE LOWER(name) = LOWER(?)`);
    const row = stmt.get(name.trim()) as Record<string, unknown> | undefined;
    return row ? this.rowToSystem(row) : null;
  }

  updateSystemBodyCount(systemAddress: number, bodyCount: number): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE systems SET body_count = ? WHERE system_address = ?
    `);
    stmt.run(bodyCount, systemAddress);
  }

  markSystemAllBodiesFound(systemAddress: number): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE systems SET all_bodies_found = 1 WHERE system_address = ?
    `);
    stmt.run(systemAddress);
  }

  /**
   * Update the total_value aggregate for a system based on body scan values.
   * Belts and rings are excluded (no scan value). Also updates estimated_fss_value,
   * estimated_dss_value, discovered_count, and mapped_count.
   */
  updateSystemTotalValue(systemId: number): void {
    if (!this.db) throw new Error('Database not initialized');

    const totalValueStmt = this.db.prepare(`
      SELECT COALESCE(SUM(scan_value), 0) as total
      FROM bodies
      WHERE system_id = ? AND body_type NOT IN ('Belt', 'Ring')
    `);
    const totalRow = totalValueStmt.get(systemId) as { total: number };

    const bodiesStmt = this.db.prepare(`
      SELECT body_type, sub_type, terraformable
      FROM bodies
      WHERE system_id = ?
    `);
    const bodies = bodiesStmt.all(systemId) as Array<{ body_type: string; sub_type: string; terraformable: number }>;
    let estimatedFss = 0;
    let estimatedDss = 0;
    for (const b of bodies) {
      estimatedFss += estimateFssValueForBody({
        subType: b.sub_type || '',
        terraformable: Boolean(b.terraformable),
        bodyType: b.body_type,
      });
      estimatedDss += estimateDssValueForBody({
        subType: b.sub_type || '',
        terraformable: Boolean(b.terraformable),
        bodyType: b.body_type,
      });
    }

    const updateStmt = this.db.prepare(`
      UPDATE systems SET 
        total_value = ?,
        estimated_fss_value = ?,
        estimated_dss_value = ?,
        discovered_count = (SELECT COUNT(*) FROM bodies WHERE system_id = ? AND scan_type != 'None'),
        mapped_count = (SELECT COUNT(*) FROM bodies WHERE system_id = ? AND scan_type = 'Mapped')
      WHERE id = ?
    `);
    updateStmt.run(totalRow.total, estimatedFss, estimatedDss, systemId, systemId, systemId);
  }

  /**
   * Recalculate scan values for all bodies in a system
   * Useful for fixing data after schema changes or recalculation formula updates
   */
  recalculateSystemValues(systemId: number): void {
    if (!this.db) throw new Error('Database not initialized');

    const bodies = this.db.prepare(`
      SELECT id, body_type, sub_type, terraformable, was_discovered, was_mapped, scan_type
      FROM bodies WHERE system_id = ?
    `).all(systemId) as Array<{
      id: number;
      body_type: string;
      sub_type: string;
      terraformable: number;
      was_discovered: number;
      was_mapped: number;
      scan_type: string;
    }>;

    const updateStmt = this.db.prepare(`
      UPDATE bodies SET scan_value = ? WHERE id = ?
    `);

    for (const body of bodies) {
      const isBeltOrRing = NO_SCAN_VALUE_BODY_TYPES.includes(body.body_type as 'Belt' | 'Ring');
      const finalValue = isBeltOrRing ? 0 : calculateScanValue({
        subType: body.sub_type || '',
        terraformable: Boolean(body.terraformable),
        wasDiscovered: Boolean(body.was_discovered),
        wasMapped: Boolean(body.was_mapped),
        isMapped: body.scan_type === 'Mapped',
      }).finalValue;
      updateStmt.run(finalValue, body.id);
    }

    // Update system total
    this.updateSystemTotalValue(systemId);
  }

  // Body operations
  /**
   * Insert or update a celestial body from a scan event
   * 
   * Handles duplicate scans gracefully by:
   * - Preserving highest-fidelity scan type (Mapped > Detailed > Basic)
   * - Using COALESCE to keep existing non-null data when new data is null
   * - Preserving discovery/mapping flags once set (they can't be "undiscovered")
   * - Keeping the most detailed raw_json (Detailed scans have more data)
   * - Recalculating scan value only when appropriate
   */
  upsertBody(systemId: number, scanEvent: ScanEvent): CelestialBody {
    if (!this.db) throw new Error('Database not initialized');

    const bodyType = this.determineBodyType(scanEvent);
    const subType = scanEvent.StarType || scanEvent.PlanetClass || '';
    const terraformable = scanEvent.TerraformState === 'Terraformable';
    const isDetailedScan = scanEvent.ScanType === 'Detailed';
    
    // Extract the immediate parent bodyId from the Parents array
    const parentBodyId = this.extractParentBodyId(scanEvent);
    
    // Belts and rings have no scan value
    const hasNoScanValue = NO_SCAN_VALUE_BODY_TYPES.includes(bodyType as 'Belt' | 'Ring');
    const scanValueResult = hasNoScanValue
      ? { finalValue: 0, baseValue: 0, terraformBonus: 0, subtotal: 0, discoveryMultiplier: 1, mappingMultiplier: 1 }
      : calculateScanValue({
          subType,
          terraformable,
          wasDiscovered: scanEvent.WasDiscovered ?? false,
          wasMapped: scanEvent.WasMapped ?? false,
          isMapped: false, // Not mapped yet on initial scan
        });

    // Scan type priority: Mapped (3) > Detailed (2) > Basic (1) > None (0)
    // We use a numeric priority in the CASE statement to ensure we keep the highest
    const scanTypePriority = isDetailedScan ? 2 : 1;

    const stmt = this.db.prepare(`
      INSERT INTO bodies (
        system_id, body_id, name, body_type, sub_type, distance_ls,
        mass, radius, gravity, temperature, atmosphere_type, volcanism,
        landable, terraformable, was_discovered, was_mapped,
        discovered_by_me, mapped_by_me, scan_type, scan_value, parent_id, semi_major_axis, raw_json
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(system_id, body_id) DO UPDATE SET
        -- Re-compute body_type on update so fixes (e.g. Moon for orbiters of brown dwarfs) apply on re-import
        body_type = excluded.body_type,
        -- Keep existing sub_type if new one is empty
        sub_type = CASE 
          WHEN excluded.sub_type IS NOT NULL AND excluded.sub_type != '' THEN excluded.sub_type 
          ELSE COALESCE(bodies.sub_type, excluded.sub_type) 
        END,
        -- Use COALESCE to preserve existing non-null values for nullable fields
        distance_ls = COALESCE(excluded.distance_ls, bodies.distance_ls),
        mass = COALESCE(excluded.mass, bodies.mass),
        radius = COALESCE(excluded.radius, bodies.radius),
        gravity = COALESCE(excluded.gravity, bodies.gravity),
        temperature = COALESCE(excluded.temperature, bodies.temperature),
        atmosphere_type = COALESCE(excluded.atmosphere_type, bodies.atmosphere_type),
        volcanism = COALESCE(excluded.volcanism, bodies.volcanism),
        -- For boolean flags, take the "true" value if either is true
        landable = MAX(bodies.landable, excluded.landable),
        terraformable = MAX(bodies.terraformable, excluded.terraformable),
        was_discovered = MAX(bodies.was_discovered, excluded.was_discovered),
        was_mapped = MAX(bodies.was_mapped, excluded.was_mapped),
        -- Preserve discovery/mapping flags once set (can't be "undiscovered")
        discovered_by_me = MAX(bodies.discovered_by_me, excluded.discovered_by_me),
        mapped_by_me = MAX(bodies.mapped_by_me, excluded.mapped_by_me),
        -- Scan type hierarchy: Mapped (highest) > Detailed > Basic
        scan_type = CASE 
          WHEN bodies.scan_type = 'Mapped' THEN 'Mapped'
          WHEN excluded.scan_type = 'Detailed' OR bodies.scan_type = 'Detailed' THEN 'Detailed'
          ELSE excluded.scan_type 
        END,
        -- Only update scan_value if not already mapped (mapped has highest value)
        -- and if the new value is higher (more detailed scan = more accurate value)
        scan_value = CASE
          WHEN bodies.scan_type = 'Mapped' THEN bodies.scan_value
          WHEN excluded.scan_value > bodies.scan_value THEN excluded.scan_value
          ELSE bodies.scan_value
        END,
        -- Parent ID: use recomputed value (e.g. null when immediate parent is Null/barycentre)
        parent_id = excluded.parent_id,
        -- Semi-major axis: preserve existing if new one is null
        semi_major_axis = COALESCE(excluded.semi_major_axis, bodies.semi_major_axis),
        -- Keep raw_json from most detailed scan (Detailed has more data than Basic)
        raw_json = CASE
          WHEN bodies.scan_type = 'Mapped' THEN bodies.raw_json
          WHEN bodies.scan_type = 'Detailed' AND excluded.scan_type != 'Detailed' THEN bodies.raw_json
          ELSE excluded.raw_json
        END
      RETURNING *
    `);

    // Determine discovered_by_me: true if body wasn't already discovered
    const discoveredByMe = !(scanEvent.WasDiscovered ?? false) ? 1 : 0;

    const row = stmt.get(
      systemId,
      scanEvent.BodyID,
      scanEvent.BodyName,
      bodyType,
      subType,
      scanEvent.DistanceFromArrivalLS,
      scanEvent.MassEM ?? scanEvent.StellarMass ?? null,
      scanEvent.Radius ?? null,
      scanEvent.SurfaceGravity ? scanEvent.SurfaceGravity / 9.81 : null,
      scanEvent.SurfaceTemperature ?? scanEvent.StellarSurfaceTemperature ?? null,
      scanEvent.AtmosphereType ?? null,
      scanEvent.Volcanism ?? null,
      scanEvent.Landable ? 1 : 0,
      terraformable ? 1 : 0,
      scanEvent.WasDiscovered ? 1 : 0,
      scanEvent.WasMapped ? 1 : 0,
      discoveredByMe,
      0, // mapped_by_me - set via updateBodyMapped when SAAScanComplete received
      isDetailedScan ? 'Detailed' : 'Basic',
      scanValueResult.finalValue,
      parentBodyId,
      scanEvent.SemiMajorAxis ?? null, // Semi-major axis in meters
      JSON.stringify(scanEvent)
    ) as Record<string, unknown>;

    const body = this.rowToBody(row);
    
    // Update system total value
    this.updateSystemTotalValue(systemId);
    
    return body;
  }

  getSystemBodies(systemId: number): CelestialBody[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT * FROM bodies WHERE system_id = ? ORDER BY distance_ls
    `);
    
    const rows = stmt.all(systemId) as Record<string, unknown>[];
    return rows.map(row => this.rowToBody(row));
  }

  updateBodyMapped(systemId: number, bodyId: number): void {
    if (!this.db) throw new Error('Database not initialized');

    // First, get the body to recalculate its value with mapping bonus
    const getStmt = this.db.prepare(`
      SELECT sub_type, terraformable, was_discovered, was_mapped 
      FROM bodies WHERE system_id = ? AND body_id = ?
    `);
    const body = getStmt.get(systemId, bodyId) as { 
      sub_type: string; 
      terraformable: number; 
      was_discovered: number; 
      was_mapped: number;
    } | undefined;

    if (body) {
      // Recalculate scan value with mapping bonus
      const scanValueResult = calculateScanValue({
        subType: body.sub_type || '',
        terraformable: Boolean(body.terraformable),
        wasDiscovered: Boolean(body.was_discovered),
        wasMapped: Boolean(body.was_mapped),
        isMapped: true, // Now being mapped
      });

      // Only set mapped_by_me = 1 if was_mapped was 0 (we're the first to map it)
      const mappedByMe = body.was_mapped === 0 ? 1 : 0;

      const updateStmt = this.db.prepare(`
        UPDATE bodies 
        SET scan_type = 'Mapped', mapped_by_me = ?, scan_value = ?
        WHERE system_id = ? AND body_id = ?
      `);
      updateStmt.run(mappedByMe, scanValueResult.finalValue, systemId, bodyId);
      
      // Update system total value
      this.updateSystemTotalValue(systemId);
    }
  }

  updateBodySignals(
    systemId: number,
    bodyId: number,
    bioSignals: number,
    geoSignals: number,
    humanSignals?: number,
    thargoidSignals?: number
  ): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      UPDATE bodies SET
        bio_signals = ?,
        geo_signals = ?,
        human_signals = COALESCE(?, human_signals),
        thargoid_signals = COALESCE(?, thargoid_signals)
      WHERE system_id = ? AND body_id = ?
    `);
    stmt.run(bioSignals, geoSignals, humanSignals ?? null, thargoidSignals ?? null, systemId, bodyId);
  }

  /**
   * Get a body by system id and exact name (e.g. for resolving ring parent).
   */
  getBodyBySystemIdAndName(systemId: number, name: string): CelestialBody | null {
    if (!this.db) throw new Error('Database not initialized');
    if (!name || name.trim().length === 0) return null;

    const stmt = this.db.prepare(`
      SELECT * FROM bodies WHERE system_id = ? AND name = ?
    `);
    const row = stmt.get(systemId, name.trim()) as Record<string, unknown> | undefined;
    return row ? this.rowToBody(row) : null;
  }

  /**
   * Get a body by system id and body id.
   */
  getBodyBySystemIdAndBodyId(systemId: number, bodyId: number): CelestialBody | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT * FROM bodies WHERE system_id = ? AND body_id = ?
    `);
    const row = stmt.get(systemId, bodyId) as Record<string, unknown> | undefined;
    return row ? this.rowToBody(row) : null;
  }

  /**
   * Merge Genuses (from SAASignalsFound) into a body's raw_json.
   * Only applies to SAASignalsFound for non-ring bodies with biological signals.
   */
  mergeBodyGenuses(systemId: number, bodyId: number, genuses: string[]): void {
    if (!this.db) throw new Error('Database not initialized');
    if (!genuses || genuses.length === 0) return;

    const stmt = this.db.prepare(`
      SELECT raw_json FROM bodies WHERE system_id = ? AND body_id = ?
    `);
    const row = stmt.get(systemId, bodyId) as { raw_json: string } | undefined;
    if (!row?.raw_json) return;

    try {
      const obj = JSON.parse(row.raw_json) as Record<string, unknown>;
      obj.Genuses = genuses;
      const updateStmt = this.db.prepare(`
        UPDATE bodies SET raw_json = ? WHERE system_id = ? AND body_id = ?
      `);
      updateStmt.run(JSON.stringify(obj), systemId, bodyId);
    } catch {
      // If parsing fails, skip merge
    }
  }

  /**
   * Merge ring materials (from SAASignalsFound for a ring) into the parent body's raw_json.
   * Finds the parent by name (BodyName with " A Ring" / " B Ring" etc. stripped) and
   * sets Materials on the matching Rings[] entry.
   */
  mergeRingMaterialsIntoParent(
    systemId: number,
    parentBodyName: string,
    ringFullName: string,
    materials: Array<{ Name: string; Count: number }>
  ): void {
    if (!this.db) throw new Error('Database not initialized');
    if (!parentBodyName || !ringFullName || !materials?.length) return;

    const parent = this.getBodyBySystemIdAndName(systemId, parentBodyName);
    if (!parent?.rawJson) return;

    try {
      const obj = JSON.parse(parent.rawJson) as Record<string, unknown>;
      const rings = (obj.Rings || obj.rings) as Array<Record<string, unknown>> | undefined;
      if (!Array.isArray(rings)) return;

      const ring = rings.find(
        (r) => (r.Name || r.name) === ringFullName
      );
      if (!ring) return;

      ring.Materials = materials;
      const updateStmt = this.db.prepare(`
        UPDATE bodies SET raw_json = ? WHERE system_id = ? AND body_id = ?
      `);
      updateStmt.run(JSON.stringify(obj), systemId, parent.bodyId);
    } catch {
      // If parsing fails, skip merge
    }
  }

  // Biological operations
  upsertBiological(
    bodyDbId: number,
    genus: string,
    species: string,
    variant: string | null,
    value: number,
    scanProgress: number
  ): Biological {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO biologicals (body_id, genus, species, variant, value, scan_progress, scanned)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT DO UPDATE SET
        scan_progress = MAX(scan_progress, excluded.scan_progress),
        scanned = CASE WHEN excluded.scan_progress >= 3 THEN 1 ELSE scanned END
      RETURNING *
    `);

    const row = stmt.get(
      bodyDbId,
      genus,
      species,
      variant,
      value,
      scanProgress,
      scanProgress >= 3 ? 1 : 0
    ) as Record<string, unknown>;

    return this.rowToBiological(row);
  }

  getBodyBiologicals(bodyDbId: number): Biological[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`SELECT * FROM biologicals WHERE body_id = ?`);
    const rows = stmt.all(bodyDbId) as Record<string, unknown>[];
    return rows.map(row => this.rowToBiological(row));
  }

  getAllBiologicals(): Array<Biological & { systemName: string; bodyName: string }> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT 
        bio.*,
        b.name as body_name,
        s.name as system_name
      FROM biologicals bio
      JOIN bodies b ON bio.body_id = b.id
      JOIN systems s ON b.system_id = s.id
      ORDER BY bio.genus, bio.species, bio.variant
    `);

    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map(row => ({
      ...this.rowToBiological(row),
      systemName: row.system_name as string,
      bodyName: row.body_name as string,
    }));
  }

  getBiologicalStats(): {
    totalSpecies: number;
    completedScans: number;
    totalValue: number;
    genusCounts: Record<string, { total: number; scanned: number; value: number }>;
  } {
    if (!this.db) throw new Error('Database not initialized');

    // Total species count
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM biologicals');
    const totalRow = totalStmt.get() as { count: number };

    // Completed scans count
    const completedStmt = this.db.prepare('SELECT COUNT(*) as count FROM biologicals WHERE scanned = 1');
    const completedRow = completedStmt.get() as { count: number };

    // Total value from completed scans
    const valueStmt = this.db.prepare('SELECT SUM(value) as total FROM biologicals WHERE scanned = 1');
    const valueRow = valueStmt.get() as { total: number | null };

    // Genus breakdown
    const genusStmt = this.db.prepare(`
      SELECT 
        genus,
        COUNT(*) as total,
        SUM(CASE WHEN scanned = 1 THEN 1 ELSE 0 END) as scanned,
        SUM(CASE WHEN scanned = 1 THEN value ELSE 0 END) as value
      FROM biologicals
      GROUP BY genus
      ORDER BY genus
    `);
    const genusRows = genusStmt.all() as Array<{ genus: string; total: number; scanned: number; value: number }>;

    const genusCounts: Record<string, { total: number; scanned: number; value: number }> = {};
    for (const row of genusRows) {
      genusCounts[row.genus] = {
        total: row.total,
        scanned: row.scanned,
        value: row.value,
      };
    }

    return {
      totalSpecies: totalRow.count,
      completedScans: completedRow.count,
      totalValue: valueRow.total ?? 0,
      genusCounts,
    };
  }

  // Codex operations
  upsertCodexEntry(
    entryId: number,
    name: string,
    category: string,
    subcategory: string,
    region: string,
    systemName: string,
    systemAddress: number,
    bodyId: number | null,
    isNewEntry: boolean,
    newTraitsDiscovered: boolean,
    voucherAmount: number,
    timestamp: string
  ): CodexEntry {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO codex_entries (
        entry_id, name, category, subcategory, region, system_name, system_address,
        body_id, is_new_entry, new_traits_discovered, voucher_amount, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entry_id, region) DO UPDATE SET
        new_traits_discovered = MAX(new_traits_discovered, excluded.new_traits_discovered),
        voucher_amount = MAX(voucher_amount, excluded.voucher_amount)
      RETURNING *
    `);

    const row = stmt.get(
      entryId,
      name,
      category,
      subcategory,
      region,
      systemName,
      systemAddress,
      bodyId,
      isNewEntry ? 1 : 0,
      newTraitsDiscovered ? 1 : 0,
      voucherAmount,
      timestamp
    ) as Record<string, unknown>;

    return this.rowToCodexEntry(row);
  }

  getCodexEntries(filter?: {
    category?: string;
    subcategory?: string;
    region?: string;
    isNewOnly?: boolean;
  }): CodexEntry[] {
    if (!this.db) throw new Error('Database not initialized');

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.category) {
      conditions.push('category = ?');
      params.push(filter.category);
    }
    if (filter?.subcategory) {
      conditions.push('subcategory = ?');
      params.push(filter.subcategory);
    }
    if (filter?.region) {
      conditions.push('region = ?');
      params.push(filter.region);
    }
    if (filter?.isNewOnly) {
      conditions.push('is_new_entry = 1');
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const stmt = this.db.prepare(`
      SELECT * FROM codex_entries
      ${whereClause}
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map(row => this.rowToCodexEntry(row));
  }

  getCodexStats(): {
    totalEntries: number;
    newEntries: number;
    totalVouchers: number;
    byCategory: Record<string, number>;
    byRegion: Record<string, number>;
  } {
    if (!this.db) throw new Error('Database not initialized');

    // Total unique entries
    const totalStmt = this.db.prepare('SELECT COUNT(DISTINCT entry_id) as count FROM codex_entries');
    const totalRow = totalStmt.get() as { count: number };

    // New entries (first discoveries)
    const newStmt = this.db.prepare('SELECT COUNT(*) as count FROM codex_entries WHERE is_new_entry = 1');
    const newRow = newStmt.get() as { count: number };

    // Total voucher earnings
    const voucherStmt = this.db.prepare('SELECT COALESCE(SUM(voucher_amount), 0) as total FROM codex_entries');
    const voucherRow = voucherStmt.get() as { total: number };

    // Count by category
    const categoryStmt = this.db.prepare(`
      SELECT category, COUNT(DISTINCT entry_id) as count
      FROM codex_entries
      GROUP BY category
    `);
    const categoryRows = categoryStmt.all() as Array<{ category: string; count: number }>;
    const byCategory: Record<string, number> = {};
    for (const row of categoryRows) {
      byCategory[row.category] = row.count;
    }

    // Count by region
    const regionStmt = this.db.prepare(`
      SELECT region, COUNT(DISTINCT entry_id) as count
      FROM codex_entries
      GROUP BY region
    `);
    const regionRows = regionStmt.all() as Array<{ region: string; count: number }>;
    const byRegion: Record<string, number> = {};
    for (const row of regionRows) {
      byRegion[row.region] = row.count;
    }

    return {
      totalEntries: totalRow.count,
      newEntries: newRow.count,
      totalVouchers: voucherRow.total,
      byCategory,
      byRegion,
    };
  }

  // Route history operations
  addRouteEntry(
    systemId: number,
    timestamp: string,
    jumpDistance: number,
    fuelUsed: number,
    sessionId: string
  ): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO route_history (system_id, timestamp, jump_distance, fuel_used, session_id)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(systemId, timestamp, jumpDistance, fuelUsed, sessionId);
  }

  getRouteHistory(limit = 100, offset = 0, filter?: RouteHistoryFilter): RouteEntry[] {
    if (!this.db) throw new Error('Database not initialized');

    const { whereClause, params } = this.buildRouteHistoryWhereClause(filter);

    const stmt = this.db.prepare(`
      SELECT r.*, s.name as system_name, s.star_pos_x, s.star_pos_y, s.star_pos_z,
        COALESCE(s.body_count, (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id)) as body_count,
        s.total_value,
        s.estimated_fss_value,
        s.estimated_dss_value,
        (SELECT b.sub_type FROM bodies b WHERE b.system_id = r.system_id AND b.body_type = 'Star' ORDER BY b.body_id ASC LIMIT 1) as primary_star_type,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.discovered_by_me = 1) as first_discovered,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND (LOWER(b.sub_type) LIKE '%earthlike%' OR LOWER(b.sub_type) LIKE '%earth-like%')) as elw_count,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND LOWER(b.sub_type) LIKE '%water world%') as ww_count,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND LOWER(b.sub_type) LIKE '%water world%' AND b.terraformable = 1) as tww_count,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND LOWER(b.sub_type) LIKE '%ammonia%') as ammonia_count,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND LOWER(b.sub_type) LIKE '%high metal%') as hmc_count,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND LOWER(b.sub_type) LIKE '%high metal%' AND b.terraformable = 1) as thmc_count,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND LOWER(b.sub_type) LIKE '%metal rich%') as metal_rich_count,
        (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND LOWER(b.sub_type) LIKE '%rocky%' AND LOWER(b.sub_type) NOT LIKE '%ice%' AND b.terraformable = 1) as trocky_count
      FROM route_history r
      JOIN systems s ON r.system_id = s.id
      ${whereClause}
      ORDER BY r.timestamp DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...params, limit, offset) as Record<string, unknown>[];
    return rows.map(row => this.rowToRouteEntry(row));
  }

  private buildRouteHistoryWhereClause(filter?: RouteHistoryFilter): { whereClause: string; params: unknown[] } {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter?.search) {
      conditions.push("s.name LIKE ? ESCAPE '\\'");
      params.push(`%${DatabaseService.escapeLikeLiteral(filter.search)}%`);
    }

    if (filter?.dateFrom) {
      conditions.push('r.timestamp >= ?');
      params.push(filter.dateFrom);
    }

    if (filter?.dateTo) {
      // Add one day to include the entire end date
      conditions.push('r.timestamp < ?');
      params.push(filter.dateTo + 'T23:59:59.999Z');
    }

    if (filter?.sessionId) {
      conditions.push('r.session_id = ?');
      params.push(filter.sessionId);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
    return { whereClause, params };
  }

  // Statistics
  getStatistics(): Record<string, unknown> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = {
      totalSystems: 0,
      totalBodies: 0,
      firstDiscoveries: 0,
      firstMapped: 0,
      totalValue: 0,
      biologicalsScanned: 0,
      bodiesByType: {} as Record<string, number>,
    };

    // Total systems
    const systemCount = this.db.prepare('SELECT COUNT(*) as count FROM systems').get() as { count: number };
    stats.totalSystems = systemCount.count;

    // Total bodies
    const bodyCount = this.db.prepare('SELECT COUNT(*) as count FROM bodies').get() as { count: number };
    stats.totalBodies = bodyCount.count;

    // First discoveries
    const firstDisc = this.db.prepare(
      'SELECT COUNT(*) as count FROM bodies WHERE discovered_by_me = 1'
    ).get() as { count: number };
    stats.firstDiscoveries = firstDisc.count;

    // First mapped
    const firstMap = this.db.prepare(
      'SELECT COUNT(*) as count FROM bodies WHERE mapped_by_me = 1'
    ).get() as { count: number };
    stats.firstMapped = firstMap.count;

    // Total value
    const totalVal = this.db.prepare(
      'SELECT SUM(scan_value) as total FROM bodies'
    ).get() as { total: number | null };
    stats.totalValue = totalVal.total ?? 0;

    // Biologicals scanned
    const bioCount = this.db.prepare(
      'SELECT COUNT(*) as count FROM biologicals WHERE scanned = 1'
    ).get() as { count: number };
    stats.biologicalsScanned = bioCount.count;

    // Bodies by type
    const byType = this.db.prepare(
      'SELECT sub_type, COUNT(*) as count FROM bodies GROUP BY sub_type'
    ).all() as Array<{ sub_type: string; count: number }>;
    
    for (const row of byType) {
      if (row.sub_type) {
        stats.bodiesByType[row.sub_type] = row.count;
      }
    }

    return stats;
  }

  // Chart data methods
  getScanValuesByDate(): Array<{ date: string; value: number; bodies: number }> {
    if (!this.db) throw new Error('Database not initialized');

    // Group scan values by date from systems' first_visited timestamp
    const stmt = this.db.prepare(`
      SELECT 
        DATE(s.first_visited) as date,
        SUM(b.scan_value) as value,
        COUNT(b.id) as bodies
      FROM systems s
      JOIN bodies b ON b.system_id = s.id
      WHERE s.first_visited IS NOT NULL
      GROUP BY DATE(s.first_visited)
      ORDER BY date ASC
    `);

    const rows = stmt.all() as Array<{ date: string; value: number; bodies: number }>;
    return rows;
  }

  getSessionDiscoveryCounts(): Array<{
    sessionId: string;
    startTime: string;
    systems: number;
    bodies: number;
    firstDiscoveries: number;
    value: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    // Get discovery stats per session from route history
    const stmt = this.db.prepare(`
      SELECT 
        r.session_id,
        MIN(r.timestamp) as start_time,
        COUNT(DISTINCT r.system_id) as systems,
        (
          SELECT COUNT(*) 
          FROM bodies b 
          JOIN systems s ON b.system_id = s.id 
          WHERE DATE(s.first_visited) BETWEEN DATE(MIN(r.timestamp)) AND DATE(MAX(r.timestamp))
        ) as bodies,
        (
          SELECT COUNT(*) 
          FROM bodies b 
          JOIN systems s ON b.system_id = s.id 
          WHERE b.discovered_by_me = 1 
          AND DATE(s.first_visited) BETWEEN DATE(MIN(r.timestamp)) AND DATE(MAX(r.timestamp))
        ) as first_discoveries,
        (
          SELECT COALESCE(SUM(b.scan_value), 0)
          FROM bodies b 
          JOIN systems s ON b.system_id = s.id 
          WHERE DATE(s.first_visited) BETWEEN DATE(MIN(r.timestamp)) AND DATE(MAX(r.timestamp))
        ) as value
      FROM route_history r
      GROUP BY r.session_id
      ORDER BY start_time DESC
      LIMIT 20
    `);

    const rows = stmt.all() as Array<{
      session_id: string;
      start_time: string;
      systems: number;
      bodies: number;
      first_discoveries: number;
      value: number;
    }>;

    return rows.map(row => ({
      sessionId: row.session_id,
      startTime: row.start_time,
      systems: row.systems,
      bodies: row.bodies || 0,
      firstDiscoveries: row.first_discoveries || 0,
      value: row.value || 0,
    }));
  }

  getBodyTypeDistribution(): Array<{ category: string; count: number; value: number }> {
    if (!this.db) throw new Error('Database not initialized');

    // Group bodies by high-level type with total value
    const stmt = this.db.prepare(`
      SELECT 
        body_type as category,
        COUNT(*) as count,
        SUM(scan_value) as value
      FROM bodies
      GROUP BY body_type
      ORDER BY count DESC
    `);

    const rows = stmt.all() as Array<{ category: string; count: number; value: number }>;
    return rows.map(row => ({
      category: row.category,
      count: row.count,
      value: row.value || 0,
    }));
  }

  close(): void {
    this.db?.close();
    this.db = null;
  }

  /**
   * Get the database file path
   */
  getDatabasePath(): string {
    return path.join(app.getPath('userData'), DB_NAME);
  }

  /**
   * Get database info including path and file size
   */
  getDatabaseInfo(): { path: string; size: number; systemCount: number; bodyCount: number } {
    if (!this.db) throw new Error('Database not initialized');

    const dbPath = this.getDatabasePath();
    
    // Get file size using fs
    let size = 0;
    try {
      const fs = require('fs');
      const stats = fs.statSync(dbPath);
      size = stats.size;
    } catch {
      // File might not exist yet
    }

    // Get record counts
    const systemCount = (this.db.prepare('SELECT COUNT(*) as count FROM systems').get() as { count: number }).count;
    const bodyCount = (this.db.prepare('SELECT COUNT(*) as count FROM bodies').get() as { count: number }).count;

    return {
      path: dbPath,
      size,
      systemCount,
      bodyCount,
    };
  }

  /**
   * Clear all exploration data (systems, bodies, biologicals, route history)
   * Preserves settings and schema version
   */
  clearExplorationData(): { success: boolean; error?: string; errorCode?: string; retryable?: boolean } {
    if (!this.db) throw new Error('Database not initialized');

    try {
      this.db.exec('BEGIN TRANSACTION');
      
      // Clear in order to respect foreign key constraints
      this.db.exec('DELETE FROM biologicals');
      this.db.exec('DELETE FROM route_history');
      this.db.exec('DELETE FROM bodies');
      this.db.exec('DELETE FROM systems');
      
      this.db.exec('COMMIT');
      
      // Run VACUUM to reclaim space
      this.db.exec('VACUUM');
      
      return { success: true };
    } catch (error) {
      this.db.exec('ROLLBACK');
      const c = classifyDbError(error);
      logError('Database', `clearExplorationData failed [${c.kind}] ${c.code}`, error);
      return {
        success: false,
        error: c.userMessage,
        errorCode: c.code,
        retryable: c.retryable,
      };
    }
  }

  /**
   * Validate a database file for import
   * Checks if it has the expected tables and schema
   */
  validateImportDatabase(importPath: string): {
    valid: boolean;
    error?: string;
    errorCode?: string;
    systemCount?: number;
    bodyCount?: number;
  } {
    try {
      const fs = require('fs');
      
      // Check file exists
      if (!fs.existsSync(importPath)) {
        return { valid: false, error: 'File does not exist' };
      }

      // Try to open as SQLite database
      const testDb = new Database(importPath, { readonly: true });
      
      try {
        // Check for required tables
        const tables = testDb.prepare(`
          SELECT name FROM sqlite_master WHERE type='table'
        `).all() as Array<{ name: string }>;
        
        const tableNames = tables.map(t => t.name);
        const requiredTables = ['systems', 'bodies', 'settings'];
        
        for (const table of requiredTables) {
          if (!tableNames.includes(table)) {
            testDb.close();
            return { valid: false, error: `Missing required table: ${table}` };
          }
        }

        // Get counts
        const systemCount = (testDb.prepare('SELECT COUNT(*) as count FROM systems').get() as { count: number }).count;
        const bodyCount = (testDb.prepare('SELECT COUNT(*) as count FROM bodies').get() as { count: number }).count;
        
        testDb.close();
        
        return { 
          valid: true, 
          systemCount,
          bodyCount,
        };
      } catch (err) {
        testDb.close();
        const c = classifyDbError(err);
        logError('Database', `validateImportDatabase (inner) [${c.kind}] ${c.code}`, err);
        throw err;
      }
    } catch (error) {
      const c = classifyDbError(error);
      logError('Database', `validateImportDatabase [${c.kind}] ${c.code}`, error);
      return {
        valid: false,
        error: c.userMessage,
        errorCode: c.code,
      };
    }
  }

  // Helper methods
  private determineBodyType(scanEvent: ScanEvent): BodyType {
    if (scanEvent.StarType) return 'Star';

    // Planetary rings have no scan value (BODY_SCAN_DATA_VALUES.md)
    if (scanEvent.BodyName?.includes(' Ring')) return 'Ring';

    // Asteroid belt clusters - they have Ring in parents and "Belt" in name
    if (scanEvent.BodyName?.includes('Belt') || scanEvent.BodyName?.includes('Cluster')) {
      if (scanEvent.Parents) {
        for (const parent of scanEvent.Parents) {
          if ('Ring' in parent) return 'Belt';
        }
      }
    }

    if (scanEvent.PlanetClass) {
      // Check if it's a moon: orbits a Planet, or orbits a non-primary Star (e.g. brown dwarf)
      if (scanEvent.Parents && scanEvent.Parents.length > 0) {
        const first = scanEvent.Parents[0] as Record<string, number>;
        if ('Planet' in first) return 'Moon';
        // Bodies orbiting a secondary star (e.g. Colonia 3's moons) are moons, not planets
        if ('Star' in first && first.Star != null && first.Star !== 0) return 'Moon';
      }
      return 'Planet';
    }
    
    // Bodies without StarType or PlanetClass are likely belt clusters
    if (!scanEvent.StarType && !scanEvent.PlanetClass) {
      return 'Belt';
    }
    
    return 'Planet'; // Default fallback
  }

  /**
   * Extract the immediate parent bodyId from a scan event's Parents array
   * 
   * The Parents array in Elite Dangerous scan events looks like:
   * - [{"Planet": 5}, {"Star": 0}] - body orbits Planet with BodyID 5
   * - [{"Null": 2}, {"Star": 0}] - body orbits barycenter with BodyID 2
   * - [{"Star": 0}] - body orbits star directly
   * 
   * The first entry is always the immediate parent.
   * Keys can be: "Null" (barycenter), "Star", "Planet"
   * 
   * @param scanEvent The scan event to extract parent from
   * @returns The immediate parent's bodyId, or null if no parent (star at origin)
   */
  private extractParentBodyId(scanEvent: ScanEvent): number | null {
    if (!scanEvent.Parents || scanEvent.Parents.length === 0) {
      return null;
    }

    // The first entry in Parents is the immediate parent
    const immediateParent = scanEvent.Parents[0];
    if (immediateParent === undefined) return null;

    // Get the first (and only) key-value pair from the parent object
    // Keys can be "Null", "Star", or "Planet"
    const keys = Object.keys(immediateParent);
    if (keys.length === 0) {
      return null;
    }

    const parentType = keys[0];
    if (parentType === undefined) return null;
    // Barycentres (Null) are not persisted as bodies—we only get ScanBaryCentre, not Scan.
    // Storing their bodyId would create a dangling parent_id. Use null so the UI can
    // resolve the effective parent from rawJson (e.g. findActualParent skips missing Nulls).
    if (parentType === 'Null') return null;

    const parentBodyId = immediateParent[parentType];
    return typeof parentBodyId === 'number' ? parentBodyId : null;
  }

  private rowToSystem(row: Record<string, unknown>): System {
    return {
      id: row.id as number,
      systemAddress: row.system_address as number,
      name: row.name as string,
      starPosX: row.star_pos_x as number,
      starPosY: row.star_pos_y as number,
      starPosZ: row.star_pos_z as number,
      firstVisited: row.first_visited as string,
      lastVisited: row.last_visited as string,
      bodyCount: row.body_count as number | null,
      discoveredCount: row.discovered_count as number,
      mappedCount: row.mapped_count as number,
      totalValue: row.total_value as number,
      estimatedFssValue: (row.estimated_fss_value as number) ?? 0,
      estimatedDssValue: (row.estimated_dss_value as number) ?? 0,
      allBodiesFound: Boolean(row.all_bodies_found),
    };
  }

  private rowToBody(row: Record<string, unknown>): CelestialBody {
    return {
      id: row.id as number,
      systemId: row.system_id as number,
      bodyId: row.body_id as number,
      name: row.name as string,
      bodyType: row.body_type as BodyType,
      subType: row.sub_type as string,
      distanceLS: row.distance_ls as number,
      mass: row.mass as number | null,
      radius: row.radius as number | null,
      gravity: row.gravity as number | null,
      temperature: row.temperature as number | null,
      atmosphereType: row.atmosphere_type as string | null,
      volcanism: row.volcanism as string | null,
      landable: Boolean(row.landable),
      terraformable: Boolean(row.terraformable),
      wasDiscovered: Boolean(row.was_discovered),
      wasMapped: Boolean(row.was_mapped),
      discoveredByMe: Boolean(row.discovered_by_me),
      mappedByMe: Boolean(row.mapped_by_me),
      scanType: row.scan_type as ScanStatus,
      scanValue: row.scan_value as number,
      bioSignals: row.bio_signals as number,
      geoSignals: row.geo_signals as number,
      humanSignals: (row.human_signals as number) ?? 0,
      thargoidSignals: (row.thargoid_signals as number) ?? 0,
      parentId: row.parent_id as number | null,
      semiMajorAxis: row.semi_major_axis as number | null,
      rawJson: row.raw_json as string,
    };
  }

  private rowToBiological(row: Record<string, unknown>): Biological {
    return {
      id: row.id as number,
      bodyId: row.body_id as number,
      genus: row.genus as string,
      species: row.species as string,
      variant: row.variant as string | null,
      value: row.value as number,
      scanned: Boolean(row.scanned),
      scanProgress: row.scan_progress as number,
    };
  }

  private rowToCodexEntry(row: Record<string, unknown>): CodexEntry {
    return {
      id: row.id as number,
      entryId: row.entry_id as number,
      name: row.name as string,
      category: row.category as string,
      subcategory: row.subcategory as string,
      region: row.region as string,
      systemName: row.system_name as string,
      systemAddress: row.system_address as number,
      bodyId: row.body_id as number | null,
      isNewEntry: Boolean(row.is_new_entry),
      newTraitsDiscovered: Boolean(row.new_traits_discovered),
      voucherAmount: row.voucher_amount as number,
      timestamp: row.timestamp as string,
    };
  }

  private rowToRouteEntry(row: Record<string, unknown>): RouteEntry {
    return {
      id: row.id as number,
      systemId: row.system_id as number,
      systemName: row.system_name as string,
      timestamp: row.timestamp as string,
      jumpDistance: row.jump_distance as number,
      fuelUsed: row.fuel_used as number,
      sessionId: row.session_id as string,
      starPosX: row.star_pos_x as number,
      starPosY: row.star_pos_y as number,
      starPosZ: row.star_pos_z as number,
      primaryStarType: (row.primary_star_type as string) ?? null,
      bodyCount: row.body_count != null ? (row.body_count as number) : null,
      firstDiscovered: (row.first_discovered as number) ?? 0,
      totalValue: (row.total_value as number) ?? 0,
      estimatedFssValue: (row.estimated_fss_value as number) ?? 0,
      estimatedDssValue: (row.estimated_dss_value as number) ?? 0,
      highValueBodies: {
        elw: (row.elw_count as number) ?? 0,
        ww: (row.ww_count as number) ?? 0,
        tww: (row.tww_count as number) ?? 0,
        ammonia: (row.ammonia_count as number) ?? 0,
        hmc: (row.hmc_count as number) ?? 0,
        thmc: (row.thmc_count as number) ?? 0,
        metalRich: (row.metal_rich_count as number) ?? 0,
        trocky: (row.trocky_count as number) ?? 0,
      },
    };
  }

  getRouteHistoryCount(filter?: RouteHistoryFilter): number {
    if (!this.db) throw new Error('Database not initialized');

    const { whereClause, params } = this.buildRouteHistoryWhereClause(filter);

    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM route_history r
      JOIN systems s ON r.system_id = s.id
      ${whereClause}
    `);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  getRouteHistoryTotals(filter?: RouteHistoryFilter): { totalDistance: number; totalFuel: number } {
    if (!this.db) throw new Error('Database not initialized');

    const { whereClause, params } = this.buildRouteHistoryWhereClause(filter);

    const stmt = this.db.prepare(`
      SELECT 
        COALESCE(SUM(r.jump_distance), 0) as total_distance,
        COALESCE(SUM(r.fuel_used), 0) as total_fuel
      FROM route_history r
      JOIN systems s ON r.system_id = s.id
      ${whereClause}
    `);
    const result = stmt.get(...params) as { total_distance: number; total_fuel: number };
    return {
      totalDistance: result.total_distance,
      totalFuel: result.total_fuel,
    };
  }

  getRouteSessions(): RouteSession[] {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT 
        session_id,
        MIN(timestamp) as start_time,
        MAX(timestamp) as end_time,
        COUNT(*) as jump_count
      FROM route_history
      GROUP BY session_id
      ORDER BY start_time DESC
    `);

    const rows = stmt.all() as Array<{
      session_id: string;
      start_time: string;
      end_time: string;
      jump_count: number;
    }>;

    return rows.map(row => ({
      sessionId: row.session_id,
      startTime: row.start_time,
      endTime: row.end_time,
      jumpCount: row.jump_count,
    }));
  }

  // ============================================
  // EDSM Cache Operations
  // ============================================

  /**
   * Get a cached EDSM response if it exists and hasn't expired
   * @param key The cache key (e.g., "system:Sol")
   * @returns The cached data or null if not found/expired
   */
  getEdsmCache<T>(key: string): T | null {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      SELECT data FROM edsm_cache 
      WHERE cache_key = ? AND expires_at > datetime('now')
    `);
    
    const row = stmt.get(key) as { data: string } | undefined;
    
    if (!row) return null;
    
    try {
      return JSON.parse(row.data) as T;
    } catch {
      // Invalid JSON, delete the entry
      this.deleteEdsmCache(key);
      return null;
    }
  }

  /**
   * Store an EDSM response in the cache
   * @param key The cache key (e.g., "system:Sol")
   * @param type The cache type for categorization (e.g., "system", "bodies", "value")
   * @param data The data to cache
   * @param expiryHours Number of hours until expiry (default: 24)
   */
  setEdsmCache(key: string, type: string, data: unknown, expiryHours = 24): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO edsm_cache (cache_key, cache_type, data, created_at, expires_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now', '+' || ? || ' hours'))
      ON CONFLICT(cache_key) DO UPDATE SET
        cache_type = excluded.cache_type,
        data = excluded.data,
        created_at = excluded.created_at,
        expires_at = excluded.expires_at
    `);
    
    stmt.run(key, type, JSON.stringify(data), expiryHours);
  }

  /**
   * Delete a specific cache entry
   * @param key The cache key to delete
   */
  deleteEdsmCache(key: string): void {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare('DELETE FROM edsm_cache WHERE cache_key = ?');
    stmt.run(key);
  }

  /**
   * Clear all EDSM cache entries
   * @param type Optional: only clear entries of a specific type
   */
  clearEdsmCache(type?: string): void {
    if (!this.db) throw new Error('Database not initialized');

    if (type) {
      const stmt = this.db.prepare('DELETE FROM edsm_cache WHERE cache_type = ?');
      stmt.run(type);
    } else {
      this.db.exec('DELETE FROM edsm_cache');
    }
  }

  /**
   * Remove all expired cache entries
   * Should be called periodically to keep the cache clean
   * @returns Number of entries removed
   */
  cleanupExpiredEdsmCache(): number {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      DELETE FROM edsm_cache WHERE expires_at <= datetime('now')
    `);
    const result = stmt.run();
    return result.changes;
  }

  /**
   * Get statistics about the EDSM cache
   */
  getEdsmCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    sizeBytes: number;
    byType: Record<string, number>;
  } {
    if (!this.db) throw new Error('Database not initialized');

    // Total entries
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM edsm_cache');
    const totalRow = totalStmt.get() as { count: number };

    // Valid (not expired) entries
    const validStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM edsm_cache 
      WHERE expires_at > datetime('now')
    `);
    const validRow = validStmt.get() as { count: number };

    // Expired entries
    const expiredStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM edsm_cache 
      WHERE expires_at <= datetime('now')
    `);
    const expiredRow = expiredStmt.get() as { count: number };

    // Approximate size in bytes
    const sizeStmt = this.db.prepare(`
      SELECT SUM(LENGTH(data)) as size FROM edsm_cache
    `);
    const sizeRow = sizeStmt.get() as { size: number | null };

    // Count by type
    const byTypeStmt = this.db.prepare(`
      SELECT cache_type, COUNT(*) as count FROM edsm_cache GROUP BY cache_type
    `);
    const byTypeRows = byTypeStmt.all() as Array<{ cache_type: string; count: number }>;
    
    const byType: Record<string, number> = {};
    for (const row of byTypeRows) {
      byType[row.cache_type] = row.count;
    }

    return {
      totalEntries: totalRow.count,
      validEntries: validRow.count,
      expiredEntries: expiredRow.count,
      sizeBytes: sizeRow.size ?? 0,
      byType,
    };
  }
}
