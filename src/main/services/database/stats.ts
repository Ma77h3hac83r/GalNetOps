/**
 * Database statistics and chart data: totals, scan values by date, session discovery counts, body type distribution.
 */
import type Database from 'better-sqlite3';

export function getStatistics(db: Database.Database): Record<string, unknown> {
  const stats = {
    totalSystems: 0,
    totalBodies: 0,
    firstDiscoveries: 0,
    firstMapped: 0,
    totalValue: 0,
    biologicalsScanned: 0,
    bodiesByType: {} as Record<string, number>,
  };

  const systemCount = db.prepare('SELECT COUNT(*) as count FROM systems').get() as { count: number };
  stats.totalSystems = systemCount.count;

  const bodyCount = db.prepare('SELECT COUNT(*) as count FROM bodies').get() as { count: number };
  stats.totalBodies = bodyCount.count;

  const firstDisc = db.prepare('SELECT COUNT(*) as count FROM bodies WHERE discovered_by_me = 1').get() as {
    count: number;
  };
  stats.firstDiscoveries = firstDisc.count;

  const firstMap = db.prepare('SELECT COUNT(*) as count FROM bodies WHERE mapped_by_me = 1').get() as {
    count: number;
  };
  stats.firstMapped = firstMap.count;

  const totalVal = db.prepare('SELECT SUM(scan_value) as total FROM bodies').get() as { total: number | null };
  stats.totalValue = totalVal.total ?? 0;

  const bioCount = db.prepare('SELECT COUNT(*) as count FROM biologicals WHERE scanned = 1').get() as {
    count: number;
  };
  stats.biologicalsScanned = bioCount.count;

  const byType = db
    .prepare('SELECT sub_type, COUNT(*) as count FROM bodies GROUP BY sub_type')
    .all() as Array<{ sub_type: string; count: number }>;
  for (const row of byType) {
    if (row.sub_type) {
      stats.bodiesByType[row.sub_type] = row.count;
    }
  }

  return stats;
}

export function getScanValuesByDate(
  db: Database.Database
): Array<{ date: string; value: number; bodies: number }> {
  const stmt = db.prepare(`
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

export function getSessionDiscoveryCounts(
  db: Database.Database
): Array<{
  sessionId: string;
  startTime: string;
  systems: number;
  bodies: number;
  firstDiscoveries: number;
  value: number;
}> {
  const stmt = db.prepare(`
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
  return rows.map((row) => ({
    sessionId: row.session_id,
    startTime: row.start_time,
    systems: row.systems,
    bodies: row.bodies || 0,
    firstDiscoveries: row.first_discoveries || 0,
    value: row.value || 0,
  }));
}

export function getBodyTypeDistribution(
  db: Database.Database
): Array<{ category: string; count: number; value: number }> {
  const stmt = db.prepare(`
    SELECT
      body_type as category,
      COUNT(*) as count,
      SUM(scan_value) as value
    FROM bodies
    GROUP BY body_type
    ORDER BY count DESC
  `);
  const rows = stmt.all() as Array<{ category: string; count: number; value: number }>;
  return rows.map((row) => ({
    category: row.category,
    count: row.count,
    value: row.value || 0,
  }));
}
