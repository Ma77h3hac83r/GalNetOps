/**
 * IPC payload validation: Zod schemas and helpers for main process handlers.
 * Treat all IPC payloads as untrusted; validate and sanitize before use.
 */
import * as path from 'path';
import { z } from 'zod';

// --- Allowed settings keys (must match StoreSchema + any legacy keys used by renderer)
const SETTINGS_KEYS = [
  'journalPath',
  'theme',
  'showFirstDiscoveryValues',
  'windowBounds',
  'hasBackfilled',
  'defaultIconZoomIndex',
  'defaultTextZoomIndex',
  'edsmSpoilerFree',
  'bioSignalsHighlightThreshold',
  'planetHighlightCriteria',
] as const;

const planetHighlightRowSchema = z.object({
  track: z.boolean().optional(),
  atmosphere: z.boolean().nullable().optional(),
  landable: z.boolean().nullable().optional(),
  terraformable: z.boolean().nullable().optional(),
  geological: z.boolean().nullable().optional(),
  biological: z.boolean().nullable().optional(),
});

const planetHighlightCriteriaSchema = z.record(z.string(), planetHighlightRowSchema);

export const settingsKeySchema = z.enum([...SETTINGS_KEYS] as [string, ...string[]]);

export const settingsSetSchema = z.object({
  key: z.enum(SETTINGS_KEYS),
  value: z.union([
    z.string().nullable(),
    z.boolean(),
    z.number(),
    z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }).nullable(),
    planetHighlightCriteriaSchema,
  ]),
}).strict();

export type SettingsSetPayload = z.infer<typeof settingsSetSchema>;

const pathStringSchema = z.string().max(4096).refine((s: string) => !s.includes('\0'), 'Path must not contain null bytes');

export const journalPathSchema = pathStringSchema;

const safeIntegerSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const dbGetSystemByIdSchema = z.object({ id: safeIntegerSchema }).strict();
export const dbGetSystemBodiesSchema = z.object({ systemId: safeIntegerSchema }).strict();
export const dbSearchSystemsSchema = z.object({
  query: z.string().min(0).max(1000),
  limit: z.number().int().min(1).max(100).optional(),
}).strict();
export const dbGetSystemByNameSchema = z.object({ name: z.string().min(0).max(500) }).strict();

const routeFilterSchema = z.object({
  search: z.string().max(500).optional(),
  dateFrom: z.string().max(50).optional(),
  dateTo: z.string().max(50).optional(),
  sessionId: z.string().max(200).optional(),
}).strict().optional();

export const dbGetRouteHistorySchema = z.object({
  limit: z.number().int().min(0).max(1000).optional(),
  offset: z.number().int().min(0).optional(),
  filter: routeFilterSchema,
}).strict();

export const dbGetRouteHistoryCountSchema = z.object({ filter: routeFilterSchema }).strict();
export const dbGetRouteHistoryTotalsSchema = z.object({ filter: routeFilterSchema }).strict();

export const dbGetBodyBiologicalsSchema = z.object({ bodyDbId: safeIntegerSchema }).strict();

export const dbGetCodexEntriesSchema = z.object({
  filter: z.object({
    category: z.string().max(200).optional(),
    subcategory: z.string().max(200).optional(),
    region: z.string().max(200).optional(),
    isNewOnly: z.boolean().optional(),
  }).strict().optional(),
}).strict();

export const dbImportDatabaseSchema = z.object({ importPath: pathStringSchema }).strict();

const ALLOWED_EXTERNAL_PROTOCOLS = ['https:', 'http:', 'mailto:'];

/**
 * Returns true if the URL is allowed for shell.openExternal (http, https, mailto only).
 */
export function isAllowedExternalUrl(url: unknown): boolean {
  if (typeof url !== 'string' || url.length === 0 || url.length > 8192) return false;
  try {
    const parsed = new URL(url);
    return ALLOWED_EXTERNAL_PROTOCOLS.includes(parsed.protocol);
  } catch (e: unknown) {
    return false;
  }
}

/**
 * Sanitize a path from the renderer: resolve, normalize, and reject if it contains
 * '..' or null bytes (path traversal / invalid). Returns the normalized path or null if invalid.
 */
export function sanitizePath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 4096) return null;
  if (raw.includes('\0')) return null;
  try {
    const resolved = path.resolve(raw);
    const normalized = path.normalize(resolved);
    if (normalized.includes('..')) return null;
    return normalized;
  } catch (e: unknown) {
    return null;
  }
}

export const edsmGetSystemSchema = z.object({ systemName: z.string().min(0).max(500) }).strict();
export const edsmGetSystemBodiesSchema = z.object({ systemName: z.string().min(0).max(500) }).strict();
export const edsmGetSystemValueSchema = z.object({ systemName: z.string().min(0).max(500) }).strict();
export const edsmGetSystemBodyCountSchema = z.object({ systemName: z.string().min(0).max(500) }).strict();
export const edsmSearchSystemsSchema = z.object({
  namePrefix: z.string().min(0).max(500),
  limit: z.number().int().min(1).max(50).optional(),
}).strict();
export const edsmClearCacheSchema = z.object({ type: z.string().max(100).optional() }).strict();

export const appOpenExternalSchema = z.object({ url: z.string().min(1).max(8192) }).strict();
