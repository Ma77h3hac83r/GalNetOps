/**
 * DatabaseService: owns the SQLite connection and delegates to domain modules.
 */
import Database from 'better-sqlite3';
import { getDatabasePath } from './lifecycle';
import { migrations, getPendingMigrations, getLatestVersion } from '../../migrations';
import { logInfo, logError } from '../../logger';
import { classifyDbError } from './errors';
import * as systems from './systems';
import * as bodies from './bodies';
import * as biologicals from './biologicals';
import * as codex from './codex';
import * as route from './route';
import * as stats from './stats';
import * as edsmCache from './edsmCache';
import * as lifecycle from './lifecycle';
import type {
  System,
  CelestialBody,
  Biological,
  CodexEntry,
  RouteEntry,
  RouteHistoryFilter,
  RouteSession,
  ScanEvent,
} from '../../../shared/types';

export class DatabaseService {
  private db: Database.Database | null = null;

  async initialize(): Promise<void> {
    const dbPath = getDatabasePath();
    this.db = new Database(dbPath);

    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');

    const fkEnabled = this.db.pragma('foreign_keys', { simple: true }) as number;
    if (fkEnabled !== 1) {
      this.db.close();
      this.db = null;
      throw new Error('Database configuration failed: foreign_keys could not be enabled');
    }

    this.runMigrations();
  }

  private runMigrations(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

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

    logInfo(
      'Database',
      `Running ${pendingMigrations.length} migration(s) from version ${currentVersion} to ${latestVersion}`
    );

    for (const migration of pendingMigrations) {
      logInfo('Database', `Running migration ${migration.version}: ${migration.description}`);

      try {
        this.db.exec('BEGIN TRANSACTION');
        migration.up(this.db);
        this.setSchemaVersion(migration.version);
        this.db.exec('COMMIT');
        logInfo('Database', `Migration ${migration.version} completed`);
      } catch (error: unknown) {
        this.db.exec('ROLLBACK');
        const c = classifyDbError(error);
        logError('Database', `Migration ${migration.version} failed [${c.kind}] ${c.code}`, error);
        const err = new Error(
          `Database migration ${migration.version} failed: ${c.userMessage}`
        ) as Error & { dbCode?: string; retryable?: boolean };
        err.dbCode = c.code;
        err.retryable = c.retryable;
        throw err;
      }
    }

    logInfo('Database', `Migrations complete. Schema version: ${latestVersion}`);
  }

  getSchemaVersion(): number {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    try {
      const stmt = this.db.prepare(`SELECT value FROM settings WHERE key = 'schema_version'`);
      const row = stmt.get() as { value: string } | undefined;
      return row ? parseInt(row.value, 10) : 0;
    } catch (e: unknown) {
      return 0;
    }
  }

  private setSchemaVersion(version: number): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    const stmt = this.db.prepare(`
      INSERT INTO settings (key, value) VALUES ('schema_version', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(version.toString());
  }

  private assertDb(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // --- Systems ---
  upsertSystem(
    systemAddress: number,
    name: string,
    starPos: [number, number, number],
    bodyCount?: number
  ): System {
    return systems.upsertSystem(this.assertDb(), systemAddress, name, starPos, bodyCount);
  }

  getCurrentSystem(): System | null {
    return systems.getCurrentSystem(this.assertDb());
  }

  getSystemByAddress(systemAddress: number): System | null {
    return systems.getSystemByAddress(this.assertDb(), systemAddress);
  }

  getSystemById(id: number): System | null {
    return systems.getSystemById(this.assertDb(), id);
  }

  searchSystems(query: string, limit: number = 10): System[] {
    return systems.searchSystems(this.assertDb(), query, limit);
  }

  getSystemByName(name: string): System | null {
    return systems.getSystemByName(this.assertDb(), name);
  }

  updateSystemBodyCount(systemAddress: number, bodyCount: number): void {
    systems.updateSystemBodyCount(this.assertDb(), systemAddress, bodyCount);
  }

  markSystemAllBodiesFound(systemAddress: number): void {
    systems.markSystemAllBodiesFound(this.assertDb(), systemAddress);
  }

  updateSystemTotalValue(systemId: number): void {
    systems.updateSystemTotalValue(this.assertDb(), systemId);
  }

  recalculateSystemValues(systemId: number): void {
    systems.recalculateSystemValues(this.assertDb(), systemId);
  }

  // --- Bodies ---
  upsertBody(systemId: number, scanEvent: ScanEvent): CelestialBody {
    return bodies.upsertBody(this.assertDb(), systemId, scanEvent);
  }

  getSystemBodies(systemId: number): CelestialBody[] {
    return bodies.getSystemBodies(this.assertDb(), systemId);
  }

  updateBodyMapped(systemId: number, bodyId: number): void {
    bodies.updateBodyMapped(this.assertDb(), systemId, bodyId);
  }

  updateBodyFootfalled(systemId: number, bodyId: number): boolean {
    return bodies.updateBodyFootfalled(this.assertDb(), systemId, bodyId);
  }

  updateBodySignals(
    systemId: number,
    bodyId: number,
    bioSignals: number,
    geoSignals: number,
    humanSignals?: number,
    thargoidSignals?: number
  ): void {
    bodies.updateBodySignals(
      this.assertDb(),
      systemId,
      bodyId,
      bioSignals,
      geoSignals,
      humanSignals,
      thargoidSignals
    );
  }

  getBodyBySystemIdAndName(systemId: number, name: string): CelestialBody | null {
    return bodies.getBodyBySystemIdAndName(this.assertDb(), systemId, name);
  }

  getBodyBySystemIdAndBodyId(systemId: number, bodyId: number): CelestialBody | null {
    return bodies.getBodyBySystemIdAndBodyId(this.assertDb(), systemId, bodyId);
  }

  mergeBodyGenuses(systemId: number, bodyId: number, genuses: string[]): void {
    bodies.mergeBodyGenuses(this.assertDb(), systemId, bodyId, genuses);
  }

  mergeRingMaterialsIntoParent(
    systemId: number,
    parentBodyName: string,
    ringFullName: string,
    materials: Array<{ Name: string; Count: number }>
  ): void {
    bodies.mergeRingMaterialsIntoParent(
      this.assertDb(),
      systemId,
      parentBodyName,
      ringFullName,
      materials
    );
  }

  // --- Biologicals ---
  upsertBiological(
    bodyDbId: number,
    genus: string,
    species: string,
    variant: string | null,
    value: number,
    scanProgress: number
  ): Biological {
    return biologicals.upsertBiological(
      this.assertDb(),
      bodyDbId,
      genus,
      species,
      variant,
      value,
      scanProgress
    );
  }

  getBodyBiologicals(bodyDbId: number): Biological[] {
    return biologicals.getBodyBiologicals(this.assertDb(), bodyDbId);
  }

  getAllBiologicals(): Array<Biological & { systemName: string; bodyName: string }> {
    return biologicals.getAllBiologicals(this.assertDb());
  }

  getBiologicalStats(): {
    totalSpecies: number;
    completedScans: number;
    totalValue: number;
    genusCounts: Record<string, { total: number; scanned: number; value: number }>;
  } {
    return biologicals.getBiologicalStats(this.assertDb());
  }

  // --- Codex ---
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
    return codex.upsertCodexEntry(
      this.assertDb(),
      entryId,
      name,
      category,
      subcategory,
      region,
      systemName,
      systemAddress,
      bodyId,
      isNewEntry,
      newTraitsDiscovered,
      voucherAmount,
      timestamp
    );
  }

  getCodexEntries(filter?: {
    category?: string;
    subcategory?: string;
    region?: string;
    isNewOnly?: boolean;
  }): CodexEntry[] {
    return codex.getCodexEntries(this.assertDb(), filter);
  }

  getCodexStats(): {
    totalEntries: number;
    newEntries: number;
    totalVouchers: number;
    byCategory: Record<string, number>;
    byRegion: Record<string, number>;
  } {
    return codex.getCodexStats(this.assertDb());
  }

  // --- Route ---
  addRouteEntry(
    systemId: number,
    timestamp: string,
    jumpDistance: number,
    fuelUsed: number,
    sessionId: string
  ): void {
    route.addRouteEntry(this.assertDb(), systemId, timestamp, jumpDistance, fuelUsed, sessionId);
  }

  getRouteHistory(limit = 100, offset = 0, filter?: RouteHistoryFilter): RouteEntry[] {
    return route.getRouteHistory(this.assertDb(), limit, offset, filter);
  }

  getRouteHistoryCount(filter?: RouteHistoryFilter): number {
    return route.getRouteHistoryCount(this.assertDb(), filter);
  }

  getRouteHistoryTotals(filter?: RouteHistoryFilter): { totalDistance: number; totalFuel: number } {
    return route.getRouteHistoryTotals(this.assertDb(), filter);
  }

  getRouteSessions(): RouteSession[] {
    return route.getRouteSessions(this.assertDb());
  }

  // --- Stats ---
  getStatistics(): Record<string, unknown> {
    return stats.getStatistics(this.assertDb());
  }

  getScanValuesByDate(): Array<{ date: string; value: number; bodies: number }> {
    return stats.getScanValuesByDate(this.assertDb());
  }

  getSessionDiscoveryCounts(): Array<{
    sessionId: string;
    startTime: string;
    systems: number;
    bodies: number;
    firstDiscoveries: number;
    value: number;
  }> {
    return stats.getSessionDiscoveryCounts(this.assertDb());
  }

  getBodyTypeDistribution(): Array<{ category: string; count: number; value: number }> {
    return stats.getBodyTypeDistribution(this.assertDb());
  }

  // --- Lifecycle ---
  close(): void {
    this.db?.close();
    this.db = null;
  }

  getDatabasePath(): string {
    return getDatabasePath();
  }

  getDatabaseInfo(): { path: string; size: number; systemCount: number; bodyCount: number } {
    return lifecycle.getDatabaseInfo(this.assertDb());
  }

  clearExplorationData(): {
    success: boolean;
    error?: string;
    errorCode?: string;
    retryable?: boolean;
  } {
    return lifecycle.clearExplorationData(this.assertDb());
  }

  validateImportDatabase(importPath: string): {
    valid: boolean;
    error?: string;
    errorCode?: string;
    systemCount?: number;
    bodyCount?: number;
  } {
    return lifecycle.validateImportDatabase(importPath);
  }

  // --- EDSM cache ---
  getEdsmCache<T>(key: string): T | null {
    return edsmCache.getEdsmCache(this.assertDb(), key);
  }

  setEdsmCache(key: string, type: string, data: unknown, expiryHours = 24): void {
    edsmCache.setEdsmCache(this.assertDb(), key, type, data, expiryHours);
  }

  deleteEdsmCache(key: string): void {
    edsmCache.deleteEdsmCache(this.assertDb(), key);
  }

  clearEdsmCache(type?: string): void {
    edsmCache.clearEdsmCache(this.assertDb(), type);
  }

  cleanupExpiredEdsmCache(): number {
    return edsmCache.cleanupExpiredEdsmCache(this.assertDb());
  }

  getEdsmCacheStats(): {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    sizeBytes: number;
    byType: Record<string, number>;
  } {
    return edsmCache.getEdsmCacheStats(this.assertDb());
  }
}
