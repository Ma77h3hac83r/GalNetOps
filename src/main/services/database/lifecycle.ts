/**
 * Database lifecycle: path, info, clear exploration data, validate/import database.
 */
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { DB_NAME } from '../../../shared/constants';
import { classifyDbError } from './errors';
import { logError } from '../../logger';

export function getDatabasePath(): string {
  return path.join(app.getPath('userData'), DB_NAME);
}

export function getDatabaseInfo(db: Database.Database): {
  path: string;
  size: number;
  systemCount: number;
  bodyCount: number;
} {
  const dbPath = getDatabasePath();
  let size = 0;
  try {
    const stats = fs.statSync(dbPath);
    size = stats.size;
  } catch (e: unknown) {
    // File might not exist yet
  }
  const systemCount = (db.prepare('SELECT COUNT(*) as count FROM systems').get() as { count: number }).count;
  const bodyCount = (db.prepare('SELECT COUNT(*) as count FROM bodies').get() as { count: number }).count;
  return {
    path: dbPath,
    size,
    systemCount,
    bodyCount,
  };
}

export function clearExplorationData(db: Database.Database): {
  success: boolean;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
} {
  try {
    db.exec('BEGIN TRANSACTION');
    db.exec('DELETE FROM biologicals');
    db.exec('DELETE FROM route_history');
    db.exec('DELETE FROM bodies');
    db.exec('DELETE FROM systems');
    db.exec('COMMIT');
    db.exec('VACUUM');
    return { success: true };
  } catch (error: unknown) {
    db.exec('ROLLBACK');
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

export function validateImportDatabase(importPath: string): {
  valid: boolean;
  error?: string;
  errorCode?: string;
  systemCount?: number;
  bodyCount?: number;
} {
  try {
    if (!fs.existsSync(importPath)) {
      return { valid: false, error: 'File does not exist' };
    }

    const testDb = new Database(importPath, { readonly: true });

    try {
      const tables = testDb
        .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
        .all() as Array<{ name: string }>;
      const tableNames = tables.map((t) => t.name);
      const requiredTables = ['systems', 'bodies', 'settings'];

      for (const table of requiredTables) {
        if (!tableNames.includes(table)) {
          testDb.close();
          return { valid: false, error: `Missing required table: ${table}` };
        }
      }

      const systemCount = (testDb.prepare('SELECT COUNT(*) as count FROM systems').get() as { count: number }).count;
      const bodyCount = (testDb.prepare('SELECT COUNT(*) as count FROM bodies').get() as { count: number }).count;
      testDb.close();
      return { valid: true, systemCount, bodyCount };
    } catch (err: unknown) {
      testDb.close();
      const c = classifyDbError(err);
      logError('Database', `validateImportDatabase (inner) [${c.kind}] ${c.code}`, err);
      throw err;
    }
  } catch (error: unknown) {
    const c = classifyDbError(error);
    logError('Database', `validateImportDatabase [${c.kind}] ${c.code}`, error);
    return {
      valid: false,
      error: c.userMessage,
      errorCode: c.code,
    };
  }
}
