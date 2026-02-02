/**
 * Structured logger for main process: level, timestamp, category.
 * Never logs passwords, tokens, API keys, or PII in production.
 * In production, avoid logging user-provided data (system names, commander, paths, URLs with params).
 */
import { app } from 'electron';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

/** True when running in development (unpackaged or NODE_ENV=development). */
export function isDev(): boolean {
  try {
    return !app.isPackaged;
  } catch {
    return process.env.NODE_ENV === 'development';
  }
}

/**
 * Redact error for production: do not log raw messages that may contain paths, URLs, or PII.
 */
export function redactError(err: unknown): string {
  if (isDev()) {
    return err instanceof Error ? err.message : String(err);
  }
  return err instanceof Error ? 'Operation failed' : 'Operation failed';
}

function formatMessage(level: LogLevel, category: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] [${category}] ${message}`;
}

export function logInfo(category: string, message: string): void {
  console.log(formatMessage('info', category, message));
}

export function logWarn(category: string, message: string): void {
  console.warn(formatMessage('warn', category, message));
}

export function logError(category: string, message: string, err?: unknown): void {
  const full = err !== undefined ? `${message}: ${redactError(err)}` : message;
  console.error(formatMessage('error', category, full));
}

export function logDebug(category: string, message: string): void {
  if (isDev()) {
    console.debug(formatMessage('debug', category, message));
  }
}
