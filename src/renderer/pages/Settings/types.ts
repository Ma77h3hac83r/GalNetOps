/**
 * Types used by the Settings page and sections.
 */

export interface DatabaseInfo {
  path: string;
  size: number;
  systemCount: number;
  bodyCount: number;
}

export interface ImportValidation {
  valid: boolean;
  cancelled?: boolean;
  path?: string;
  error?: string;
  systemCount?: number;
  bodyCount?: number;
}

export interface AppInfo {
  version: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  platform: string;
  arch: string;
}

export interface EdsmCacheStats {
  memoryCacheSize: number;
  dbStats: {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    sizeBytes: number;
    byType: Record<string, number>;
  } | null;
}

export type SettingsSection =
  | 'about'
  | 'journal'
  | 'appearance'
  | 'exploration'
  | 'edsm'
  | 'data';
