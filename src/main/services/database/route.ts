/**
 * Route history CRUD: add entry, get history with filter, count, totals, sessions.
 */
import type Database from 'better-sqlite3';
import type { RouteEntry, RouteHistoryFilter, RouteSession } from '../../../shared/types';
import { rowToRouteEntry } from './mappers';
import { escapeLikeLiteral } from './helpers';

export function buildRouteHistoryWhereClause(
  filter?: RouteHistoryFilter
): { whereClause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.search) {
    conditions.push("s.name LIKE ? ESCAPE '\\'");
    params.push(`%${escapeLikeLiteral(filter.search)}%`);
  }
  if (filter?.dateFrom) {
    conditions.push('r.timestamp >= ?');
    params.push(filter.dateFrom);
  }
  if (filter?.dateTo) {
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

export function addRouteEntry(
  db: Database.Database,
  systemId: number,
  timestamp: string,
  jumpDistance: number,
  fuelUsed: number,
  sessionId: string
): void {
  const stmt = db.prepare(`
    INSERT INTO route_history (system_id, timestamp, jump_distance, fuel_used, session_id)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(systemId, timestamp, jumpDistance, fuelUsed, sessionId);
}

export function getRouteHistory(
  db: Database.Database,
  limit = 100,
  offset = 0,
  filter?: RouteHistoryFilter
): RouteEntry[] {
  const { whereClause, params } = buildRouteHistoryWhereClause(filter);
  const stmt = db.prepare(`
    SELECT r.*, s.name as system_name, s.star_pos_x, s.star_pos_y, s.star_pos_z,
      COALESCE(s.body_count, (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id)) as body_count,
      s.total_value,
      s.estimated_fss_value,
      s.estimated_dss_value,
      (SELECT b.sub_type FROM bodies b WHERE b.system_id = r.system_id AND b.body_type = 'Star' ORDER BY b.body_id ASC LIMIT 1) as primary_star_type,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.discovered_by_me = 1) as first_discovered,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.sub_type = 'earth_like_world') as elw_count,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.sub_type = 'water_world') as ww_count,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.sub_type = 'water_world' AND b.terraformable = 1) as tww_count,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.sub_type = 'ammonia_world') as ammonia_count,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.sub_type = 'high_metal_content_world') as hmc_count,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.sub_type = 'high_metal_content_world' AND b.terraformable = 1) as thmc_count,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.sub_type = 'metal_rich_body') as metal_rich_count,
      (SELECT COUNT(*) FROM bodies b WHERE b.system_id = r.system_id AND b.sub_type = 'rocky_body' AND b.terraformable = 1) as trocky_count
    FROM route_history r
    JOIN systems s ON r.system_id = s.id
    ${whereClause}
    ORDER BY r.timestamp DESC
    LIMIT ? OFFSET ?
  `);
  const rows = stmt.all(...params, limit, offset) as Record<string, unknown>[];
  return rows.map((row) => rowToRouteEntry(row));
}

export function getRouteHistoryCount(db: Database.Database, filter?: RouteHistoryFilter): number {
  const { whereClause, params } = buildRouteHistoryWhereClause(filter);
  const stmt = db.prepare(`
    SELECT COUNT(*) as count
    FROM route_history r
    JOIN systems s ON r.system_id = s.id
    ${whereClause}
  `);
  const result = stmt.get(...params) as { count: number };
  return result.count;
}

export function getRouteHistoryTotals(
  db: Database.Database,
  filter?: RouteHistoryFilter
): { totalDistance: number; totalFuel: number } {
  const { whereClause, params } = buildRouteHistoryWhereClause(filter);
  const stmt = db.prepare(`
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

export function getRouteSessions(db: Database.Database): RouteSession[] {
  const stmt = db.prepare(`
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
  return rows.map((row) => ({
    sessionId: row.session_id,
    startTime: row.start_time,
    endTime: row.end_time,
    jumpCount: row.jump_count,
  }));
}
