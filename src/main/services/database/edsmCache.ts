/**
 * EDSM cache: get/set/delete/clear/cleanup expired, get stats.
 */
import type Database from 'better-sqlite3';

export function getEdsmCache<T>(db: Database.Database, key: string): T | null {
  const stmt = db.prepare(`
    SELECT data FROM edsm_cache
    WHERE cache_key = ? AND expires_at > datetime('now')
  `);
  const row = stmt.get(key) as { data: string } | undefined;
  if (!row) {
    return null;
  }
  try {
    return JSON.parse(row.data) as T;
  } catch (e: unknown) {
    deleteEdsmCache(db, key);
    return null;
  }
}

export function setEdsmCache(
  db: Database.Database,
  key: string,
  type: string,
  data: unknown,
  expiryHours = 24
): void {
  const stmt = db.prepare(`
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

export function deleteEdsmCache(db: Database.Database, key: string): void {
  const stmt = db.prepare('DELETE FROM edsm_cache WHERE cache_key = ?');
  stmt.run(key);
}

export function clearEdsmCache(db: Database.Database, type?: string): void {
  if (type) {
    const stmt = db.prepare('DELETE FROM edsm_cache WHERE cache_type = ?');
    stmt.run(type);
  } else {
    db.exec('DELETE FROM edsm_cache');
  }
}

export function cleanupExpiredEdsmCache(db: Database.Database): number {
  const stmt = db.prepare(`
    DELETE FROM edsm_cache WHERE expires_at <= datetime('now')
  `);
  const result = stmt.run();
  return result.changes;
}

export function getEdsmCacheStats(db: Database.Database): {
  totalEntries: number;
  validEntries: number;
  expiredEntries: number;
  sizeBytes: number;
  byType: Record<string, number>;
} {
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM edsm_cache');
  const totalRow = totalStmt.get() as { count: number };

  const validStmt = db.prepare(`
    SELECT COUNT(*) as count FROM edsm_cache
    WHERE expires_at > datetime('now')
  `);
  const validRow = validStmt.get() as { count: number };

  const expiredStmt = db.prepare(`
    SELECT COUNT(*) as count FROM edsm_cache
    WHERE expires_at <= datetime('now')
  `);
  const expiredRow = expiredStmt.get() as { count: number };

  const sizeStmt = db.prepare(`
    SELECT SUM(LENGTH(data)) as size FROM edsm_cache
  `);
  const sizeRow = sizeStmt.get() as { size: number | null };

  const byTypeStmt = db.prepare(`
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
