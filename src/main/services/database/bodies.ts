/**
 * Body CRUD: upsert from scan event, get by system/name/bodyId, update mapped/signals, merge genuses/ring materials.
 */
import type Database from 'better-sqlite3';
import type { CelestialBody } from '../../../shared/types';
import type { ScanEvent } from '../../../shared/types';
import { calculateScanValue, NO_SCAN_VALUE_BODY_TYPES } from '../../../shared/scanValueFormulas';
import { normalizePlanetClass, normalizeStarType } from '../../../shared/normalization';
import { rowToBody } from './mappers';
import { determineBodyType, extractParentBodyId } from './helpers';
import { updateSystemTotalValue } from './systems';

export function upsertBody(db: Database.Database, systemId: number, scanEvent: ScanEvent): CelestialBody {
  const bodyType = determineBodyType(scanEvent);
  const rawSubType = scanEvent.StarType || scanEvent.PlanetClass || '';
  const subType = scanEvent.StarType
    ? normalizeStarType(scanEvent.StarType)
    : scanEvent.PlanetClass
      ? normalizePlanetClass(scanEvent.PlanetClass)
      : '';
  const terraformable = scanEvent.TerraformState === 'Terraformable';
  const isDetailedScan = scanEvent.ScanType === 'Detailed';
  const parentBodyId = extractParentBodyId(scanEvent);
  const hasNoScanValue = NO_SCAN_VALUE_BODY_TYPES.includes(bodyType as 'Belt' | 'Ring');
  const scanValueResult = hasNoScanValue
    ? { finalValue: 0, baseValue: 0, terraformBonus: 0, subtotal: 0, discoveryMultiplier: 1, mappingMultiplier: 1 }
    : calculateScanValue({
        subType: rawSubType,
        terraformable,
        wasDiscovered: scanEvent.WasDiscovered ?? false,
        wasMapped: scanEvent.WasMapped ?? false,
        isMapped: false,
      });

  const stmt = db.prepare(`
    INSERT INTO bodies (
      system_id, body_id, name, body_type, sub_type, distance_ls,
      mass, radius, gravity, temperature, atmosphere_type, volcanism,
      landable, terraformable, was_discovered, was_mapped, was_footfalled,
      discovered_by_me, mapped_by_me, footfalled_by_me, scan_type, scan_value, parent_id, semi_major_axis, raw_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(system_id, body_id) DO UPDATE SET
      body_type = excluded.body_type,
      sub_type = CASE
        WHEN excluded.sub_type IS NOT NULL AND excluded.sub_type != '' THEN excluded.sub_type
        ELSE COALESCE(bodies.sub_type, excluded.sub_type)
      END,
      distance_ls = COALESCE(excluded.distance_ls, bodies.distance_ls),
      mass = COALESCE(excluded.mass, bodies.mass),
      radius = COALESCE(excluded.radius, bodies.radius),
      gravity = COALESCE(excluded.gravity, bodies.gravity),
      temperature = COALESCE(excluded.temperature, bodies.temperature),
      atmosphere_type = COALESCE(excluded.atmosphere_type, bodies.atmosphere_type),
      volcanism = COALESCE(excluded.volcanism, bodies.volcanism),
      landable = MAX(bodies.landable, excluded.landable),
      terraformable = MAX(bodies.terraformable, excluded.terraformable),
      was_discovered = MAX(bodies.was_discovered, excluded.was_discovered),
      was_mapped = MAX(bodies.was_mapped, excluded.was_mapped),
      was_footfalled = MAX(bodies.was_footfalled, excluded.was_footfalled),
      discovered_by_me = MAX(bodies.discovered_by_me, excluded.discovered_by_me),
      mapped_by_me = MAX(bodies.mapped_by_me, excluded.mapped_by_me),
      footfalled_by_me = MAX(bodies.footfalled_by_me, excluded.footfalled_by_me),
      scan_type = CASE
        WHEN bodies.scan_type = 'Mapped' THEN 'Mapped'
        WHEN excluded.scan_type = 'Detailed' OR bodies.scan_type = 'Detailed' THEN 'Detailed'
        ELSE excluded.scan_type
      END,
      scan_value = CASE
        WHEN bodies.scan_type = 'Mapped' THEN bodies.scan_value
        WHEN excluded.scan_value > bodies.scan_value THEN excluded.scan_value
        ELSE bodies.scan_value
      END,
      parent_id = excluded.parent_id,
      semi_major_axis = COALESCE(excluded.semi_major_axis, bodies.semi_major_axis),
      raw_json = CASE
        WHEN bodies.scan_type = 'Mapped' THEN bodies.raw_json
        WHEN bodies.scan_type = 'Detailed' AND excluded.scan_type != 'Detailed' THEN bodies.raw_json
        ELSE excluded.raw_json
      END
    RETURNING *
  `);

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
    scanEvent.WasFootfalled ? 1 : 0,
    discoveredByMe,
    0,
    0,
    isDetailedScan ? 'Detailed' : 'Basic',
    scanValueResult.finalValue,
    parentBodyId,
    scanEvent.SemiMajorAxis ?? null,
    JSON.stringify(scanEvent)
  ) as Record<string, unknown>;

  const body = rowToBody(row);
  updateSystemTotalValue(db, systemId);
  return body;
}

export function getSystemBodies(db: Database.Database, systemId: number): CelestialBody[] {
  const stmt = db.prepare(`SELECT * FROM bodies WHERE system_id = ? ORDER BY distance_ls`);
  const rows = stmt.all(systemId) as Record<string, unknown>[];
  return rows.map((row) => rowToBody(row));
}

export function updateBodyMapped(db: Database.Database, systemId: number, bodyId: number): void {
  const getStmt = db.prepare(`
    SELECT sub_type, terraformable, was_discovered, was_mapped
    FROM bodies WHERE system_id = ? AND body_id = ?
  `);
  const body = getStmt.get(systemId, bodyId) as
    | { sub_type: string; terraformable: number; was_discovered: number; was_mapped: number }
    | undefined;

  if (body) {
    const scanValueResult = calculateScanValue({
      subType: body.sub_type || '',
      terraformable: Boolean(body.terraformable),
      wasDiscovered: Boolean(body.was_discovered),
      wasMapped: Boolean(body.was_mapped),
      isMapped: true,
    });
    const mappedByMe = body.was_mapped === 0 ? 1 : 0;
    const updateStmt = db.prepare(`
      UPDATE bodies
      SET scan_type = 'Mapped', mapped_by_me = ?, scan_value = ?
      WHERE system_id = ? AND body_id = ?
    `);
    updateStmt.run(mappedByMe, scanValueResult.finalValue, systemId, bodyId);
    updateSystemTotalValue(db, systemId);
  }
}

export function updateBodySignals(
  db: Database.Database,
  systemId: number,
  bodyId: number,
  bioSignals: number,
  geoSignals: number,
  humanSignals?: number,
  thargoidSignals?: number
): void {
  const stmt = db.prepare(`
    UPDATE bodies SET
      bio_signals = ?,
      geo_signals = ?,
      human_signals = COALESCE(?, human_signals),
      thargoid_signals = COALESCE(?, thargoid_signals)
    WHERE system_id = ? AND body_id = ?
  `);
  stmt.run(bioSignals, geoSignals, humanSignals ?? null, thargoidSignals ?? null, systemId, bodyId);
}

export function updateBodyFootfalled(db: Database.Database, systemId: number, bodyId: number): boolean {
  const getStmt = db.prepare(`
    SELECT was_footfalled FROM bodies WHERE system_id = ? AND body_id = ?
  `);
  const body = getStmt.get(systemId, bodyId) as { was_footfalled: number } | undefined;

  if (body && body.was_footfalled === 0) {
    const updateStmt = db.prepare(`
      UPDATE bodies SET footfalled_by_me = 1 WHERE system_id = ? AND body_id = ?
    `);
    updateStmt.run(systemId, bodyId);
    return true;
  }
  return false;
}

export function getBodyBySystemIdAndName(db: Database.Database, systemId: number, name: string): CelestialBody | null {
  if (!name || name.trim().length === 0) {
    return null;
  }
  const stmt = db.prepare(`SELECT * FROM bodies WHERE system_id = ? AND name = ?`);
  const row = stmt.get(systemId, name.trim()) as Record<string, unknown> | undefined;
  return row ? rowToBody(row) : null;
}

export function getBodyBySystemIdAndBodyId(db: Database.Database, systemId: number, bodyId: number): CelestialBody | null {
  const stmt = db.prepare(`SELECT * FROM bodies WHERE system_id = ? AND body_id = ?`);
  const row = stmt.get(systemId, bodyId) as Record<string, unknown> | undefined;
  return row ? rowToBody(row) : null;
}

export function mergeBodyGenuses(db: Database.Database, systemId: number, bodyId: number, genuses: string[]): void {
  if (!genuses || genuses.length === 0) {
    return;
  }
  const stmt = db.prepare(`SELECT raw_json FROM bodies WHERE system_id = ? AND body_id = ?`);
  const row = stmt.get(systemId, bodyId) as { raw_json: string } | undefined;
  if (!row?.raw_json) {
    return;
  }
  try {
    const obj = JSON.parse(row.raw_json) as Record<string, unknown>;
    obj.Genuses = genuses;
    const updateStmt = db.prepare(`UPDATE bodies SET raw_json = ? WHERE system_id = ? AND body_id = ?`);
    updateStmt.run(JSON.stringify(obj), systemId, bodyId);
  } catch (e: unknown) {
    // If parsing fails, skip merge
  }
}

export function mergeRingMaterialsIntoParent(
  db: Database.Database,
  systemId: number,
  parentBodyName: string,
  ringFullName: string,
  materials: Array<{ Name: string; Count: number }>
): void {
  if (!parentBodyName || !ringFullName || !materials?.length) {
    return;
  }
  const parent = getBodyBySystemIdAndName(db, systemId, parentBodyName);
  if (!parent?.rawJson) {
    return;
  }
  try {
    const obj = JSON.parse(parent.rawJson) as Record<string, unknown>;
    const rings = (obj.Rings || obj.rings) as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(rings)) {
      return;
    }
    const ring = rings.find((r) => (r.Name || r.name) === ringFullName);
    if (!ring) {
      return;
    }
    ring.Materials = materials;
    const updateStmt = db.prepare(`UPDATE bodies SET raw_json = ? WHERE system_id = ? AND body_id = ?`);
    updateStmt.run(JSON.stringify(obj), systemId, parent.bodyId);
  } catch (e: unknown) {
    // If parsing fails, skip merge
  }
}
