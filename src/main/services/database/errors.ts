/**
 * SQLite error classification for handling: retry, user message, or fatal.
 */

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
