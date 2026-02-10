/**
 * Codex CRUD: upsert entry, get entries with filter, get stats.
 */
import type Database from 'better-sqlite3';
import type { CodexEntry } from '../../../shared/types';
import { rowToCodexEntry } from './mappers';

export function upsertCodexEntry(
  db: Database.Database,
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
  const stmt = db.prepare(`
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
  return rowToCodexEntry(row);
}

export function getCodexEntries(
  db: Database.Database,
  filter?: {
    category?: string;
    subcategory?: string;
    region?: string;
    isNewOnly?: boolean;
  }
): CodexEntry[] {
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
  const stmt = db.prepare(`
    SELECT * FROM codex_entries
    ${whereClause}
    ORDER BY timestamp DESC
  `);
  const rows = stmt.all(...params) as Record<string, unknown>[];
  return rows.map((row) => rowToCodexEntry(row));
}

export function getCodexStats(db: Database.Database): {
  totalEntries: number;
  newEntries: number;
  totalVouchers: number;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
} {
  const totalStmt = db.prepare('SELECT COUNT(DISTINCT entry_id) as count FROM codex_entries');
  const totalRow = totalStmt.get() as { count: number };

  const newStmt = db.prepare('SELECT COUNT(*) as count FROM codex_entries WHERE is_new_entry = 1');
  const newRow = newStmt.get() as { count: number };

  const voucherStmt = db.prepare('SELECT COALESCE(SUM(voucher_amount), 0) as total FROM codex_entries');
  const voucherRow = voucherStmt.get() as { total: number };

  const categoryStmt = db.prepare(`
    SELECT category, COUNT(DISTINCT entry_id) as count
    FROM codex_entries
    GROUP BY category
  `);
  const categoryRows = categoryStmt.all() as Array<{ category: string; count: number }>;
  const byCategory: Record<string, number> = {};
  for (const row of categoryRows) {
    byCategory[row.category] = row.count;
  }

  const regionStmt = db.prepare(`
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
