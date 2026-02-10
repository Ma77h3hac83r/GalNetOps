/**
 * System CRUD: upsert, get current/by address/by id/by name, search, update aggregates.
 */
import type Database from 'better-sqlite3';
import type { System } from '../../../shared/types';
import {
  estimateFssValueForBody,
  estimateDssValueForBody,
  calculateScanValue,
  NO_SCAN_VALUE_BODY_TYPES,
} from '../../../shared/scanValueFormulas';
import { rowToSystem } from './mappers';
import { escapeLikeLiteral } from './helpers';

export function upsertSystem(
  db: Database.Database,
  systemAddress: number,
  name: string,
  starPos: [number, number, number],
  bodyCount?: number
): System {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
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
  return rowToSystem(row);
}

export function getCurrentSystem(db: Database.Database): System | null {
  const stmt = db.prepare(`SELECT * FROM systems ORDER BY last_visited DESC LIMIT 1`);
  const row = stmt.get() as Record<string, unknown> | undefined;
  return row ? rowToSystem(row) : null;
}

export function getSystemByAddress(db: Database.Database, systemAddress: number): System | null {
  const stmt = db.prepare(`SELECT * FROM systems WHERE system_address = ?`);
  const row = stmt.get(systemAddress) as Record<string, unknown> | undefined;
  return row ? rowToSystem(row) : null;
}

export function getSystemById(db: Database.Database, id: number): System | null {
  const stmt = db.prepare(`SELECT * FROM systems WHERE id = ?`);
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToSystem(row) : null;
}

export function searchSystems(db: Database.Database, query: string, limit: number = 10): System[] {
  if (!query || query.trim().length === 0) {
    return [];
  }
  const trimmedQuery = query.trim();
  const escapedForLike = escapeLikeLiteral(trimmedQuery);
  const stmt = db.prepare(`
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
  return rows.map((row) => rowToSystem(row));
}

export function getSystemByName(db: Database.Database, name: string): System | null {
  if (!name || name.trim().length === 0) {
    return null;
  }
  const stmt = db.prepare(`SELECT * FROM systems WHERE LOWER(name) = LOWER(?)`);
  const row = stmt.get(name.trim()) as Record<string, unknown> | undefined;
  return row ? rowToSystem(row) : null;
}

export function updateSystemBodyCount(db: Database.Database, systemAddress: number, bodyCount: number): void {
  const stmt = db.prepare(`UPDATE systems SET body_count = ? WHERE system_address = ?`);
  stmt.run(bodyCount, systemAddress);
}

export function markSystemAllBodiesFound(db: Database.Database, systemAddress: number): void {
  const stmt = db.prepare(`UPDATE systems SET all_bodies_found = 1 WHERE system_address = ?`);
  stmt.run(systemAddress);
}

export function updateSystemTotalValue(db: Database.Database, systemId: number): void {
  const totalValueStmt = db.prepare(`
    SELECT COALESCE(SUM(scan_value), 0) as total
    FROM bodies
    WHERE system_id = ? AND body_type NOT IN ('Belt', 'Ring')
  `);
  const totalRow = totalValueStmt.get(systemId) as { total: number };

  const bodiesStmt = db.prepare(`
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

  const updateStmt = db.prepare(`
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

export function recalculateSystemValues(db: Database.Database, systemId: number): void {
  const bodies = db
    .prepare(
      `SELECT id, body_type, sub_type, terraformable, was_discovered, was_mapped, scan_type FROM bodies WHERE system_id = ?`
    )
    .all(systemId) as Array<{
      id: number;
      body_type: string;
      sub_type: string;
      terraformable: number;
      was_discovered: number;
      was_mapped: number;
      scan_type: string;
    }>;

  const updateStmt = db.prepare(`UPDATE bodies SET scan_value = ? WHERE id = ?`);
  for (const body of bodies) {
    const isBeltOrRing = NO_SCAN_VALUE_BODY_TYPES.includes(body.body_type as 'Belt' | 'Ring');
    const finalValue = isBeltOrRing
      ? 0
      : calculateScanValue({
          subType: body.sub_type || '',
          terraformable: Boolean(body.terraformable),
          wasDiscovered: Boolean(body.was_discovered),
          wasMapped: Boolean(body.was_mapped),
          isMapped: body.scan_type === 'Mapped',
        }).finalValue;
    updateStmt.run(finalValue, body.id);
  }
  updateSystemTotalValue(db, systemId);
}
