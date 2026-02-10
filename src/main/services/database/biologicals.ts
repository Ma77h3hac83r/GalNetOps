/**
 * Biological CRUD: upsert, get by body, get all with system/body names, get stats.
 */
import type Database from 'better-sqlite3';
import type { Biological } from '../../../shared/types';
import { rowToBiological } from './mappers';

export function upsertBiological(
  db: Database.Database,
  bodyDbId: number,
  genus: string,
  species: string,
  variant: string | null,
  value: number,
  scanProgress: number
): Biological {
  const stmt = db.prepare(`
    INSERT INTO biologicals (body_id, genus, species, variant, value, scan_progress, scanned)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(body_id, genus, species) DO UPDATE SET
      variant = COALESCE(excluded.variant, variant),
      value = CASE WHEN excluded.value > 0 THEN excluded.value ELSE value END,
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
  return rowToBiological(row);
}

export function getBodyBiologicals(db: Database.Database, bodyDbId: number): Biological[] {
  const stmt = db.prepare(`SELECT * FROM biologicals WHERE body_id = ?`);
  const rows = stmt.all(bodyDbId) as Record<string, unknown>[];
  return rows.map((row) => rowToBiological(row));
}

export function getAllBiologicals(
  db: Database.Database
): Array<Biological & { systemName: string; bodyName: string }> {
  const stmt = db.prepare(`
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
  return rows.map((row) => ({
    ...rowToBiological(row),
    systemName: row.system_name as string,
    bodyName: row.body_name as string,
  }));
}

export function getBiologicalStats(db: Database.Database): {
  totalSpecies: number;
  completedScans: number;
  totalValue: number;
  genusCounts: Record<string, { total: number; scanned: number; value: number }>;
} {
  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM biologicals');
  const totalRow = totalStmt.get() as { count: number };

  const completedStmt = db.prepare('SELECT COUNT(*) as count FROM biologicals WHERE scanned = 1');
  const completedRow = completedStmt.get() as { count: number };

  const valueStmt = db.prepare('SELECT SUM(value) as total FROM biologicals WHERE scanned = 1');
  const valueRow = valueStmt.get() as { total: number | null };

  const genusStmt = db.prepare(`
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
