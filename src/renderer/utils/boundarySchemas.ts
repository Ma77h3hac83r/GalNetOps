/**
 * Runtime validation at store boundaries: data from IPC (window.electron) must be
 * validated with Zod before use. Use these schemas at addBody, setCurrentSystem,
 * getSystemBodies / getCurrentSystem, and for Statistics, RouteHistory, Codex,
 * BodyDetails, Settings, and App init.
 */
import { z } from 'zod';
import type {
  System,
  CelestialBody,
  Biological,
  RouteEntry,
  RouteSession,
  CodexEntry,
  Statistics,
} from '@shared/types';

const bodyTypeSchema = z.enum(['Star', 'Planet', 'Moon', 'Belt', 'Ring']);
const scanStatusSchema = z.enum(['None', 'Basic', 'Detailed', 'Mapped']);

export const systemSchema = z.object({
  id: z.number(),
  systemAddress: z.number(),
  name: z.string(),
  starPosX: z.number(),
  starPosY: z.number(),
  starPosZ: z.number(),
  firstVisited: z.string(),
  lastVisited: z.string(),
  bodyCount: z.number().nullable(),
  discoveredCount: z.number(),
  mappedCount: z.number(),
  totalValue: z.number(),
  estimatedFssValue: z.number(),
  estimatedDssValue: z.number(),
  allBodiesFound: z.boolean(),
}).strict();

export const celestialBodySchema = z.object({
  id: z.number(),
  systemId: z.number(),
  bodyId: z.number(),
  name: z.string(),
  bodyType: bodyTypeSchema,
  subType: z.string(),
  distanceLS: z.number(),
  mass: z.number().nullable(),
  radius: z.number().nullable(),
  gravity: z.number().nullable(),
  temperature: z.number().nullable(),
  atmosphereType: z.string().nullable(),
  volcanism: z.string().nullable(),
  landable: z.boolean(),
  terraformable: z.boolean(),
  wasDiscovered: z.boolean(),
  wasMapped: z.boolean(),
  wasFootfalled: z.boolean(),
  discoveredByMe: z.boolean(),
  mappedByMe: z.boolean(),
  footfalledByMe: z.boolean(),
  scanType: scanStatusSchema,
  scanValue: z.number(),
  bioSignals: z.number(),
  geoSignals: z.number(),
  humanSignals: z.number(),
  thargoidSignals: z.number(),
  parentId: z.number().nullable(),
  semiMajorAxis: z.number().nullable(),
  rawJson: z.string(),
}).strict();

/**
 * Parse unknown value as System. Returns null if invalid.
 */
export function parseSystem(value: unknown): System | null {
  const result = systemSchema.safeParse(value);
  if (!result.success) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.warn('[boundarySchemas] Invalid system:', result.error.flatten());
    }
    return null;
  }
  return result.data as System;
}

/**
 * Parse unknown value as CelestialBody. Returns null if invalid.
 */
export function parseCelestialBody(value: unknown): CelestialBody | null {
  const result = celestialBodySchema.safeParse(value);
  if (!result.success) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.warn('[boundarySchemas] Invalid CelestialBody:', result.error.flatten());
    }
    return null;
  }
  return result.data as CelestialBody;
}

/**
 * Parse unknown value as array of CelestialBody. Returns array of valid items only; invalid entries are skipped.
 */
export function parseCelestialBodyArray(value: unknown): CelestialBody[] {
  if (!Array.isArray(value)) return [];
  const out: CelestialBody[] = [];
  for (const item of value) {
    const parsed = parseCelestialBody(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

// --- Settings / primitives ---
/** Parse journal path from IPC; returns null if not a string or empty. */
export function parseJournalPath(value: unknown): string | null {
  const result = z.union([z.string(), z.null()]).safeParse(value);
  if (!result.success) return null;
  const s = result.data;
  return typeof s === 'string' ? s : null;
}

/** Parse boolean from settings IPC; returns undefined if invalid. */
export function parseBoolean(value: unknown): boolean | undefined {
  const result = z.boolean().safeParse(value);
  return result.success ? result.data : undefined;
}

/** Parse number from settings IPC; returns undefined if invalid. */
export function parseNumber(value: unknown): number | undefined {
  const result = z.number().safeParse(value);
  return result.success ? result.data : undefined;
}

const planetHighlightRowSchema = z.object({
  track: z.boolean().optional(),
  atmosphere: z.boolean().nullable().optional(),
  landable: z.boolean().nullable().optional(),
  terraformable: z.boolean().nullable().optional(),
  geological: z.boolean().nullable().optional(),
  biological: z.boolean().nullable().optional(),
});

const planetHighlightCriteriaSchema = z.record(z.string(), planetHighlightRowSchema);

/** Parse planet highlight criteria from settings IPC; returns default if invalid. */
export function parsePlanetHighlightCriteria(
  value: unknown
): Record<string, Record<string, boolean | null | undefined>> {
  const result = planetHighlightCriteriaSchema.safeParse(value);
  if (result.success) return result.data;
  return {};
}

// --- Statistics ---
const statisticsSchema = z.object({
  totalSystems: z.number(),
  totalBodies: z.number(),
  firstDiscoveries: z.number(),
  firstMapped: z.number(),
  totalValue: z.number(),
  biologicalsScanned: z.number(),
  bodiesByType: z.record(z.string(), z.number()),
}).strict();

export function parseStatistics(value: unknown): Statistics | null {
  const result = statisticsSchema.safeParse(value);
  if (!result.success) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.warn('[boundarySchemas] Invalid statistics:', result.error.flatten());
    }
    return null;
  }
  return result.data as Statistics;
}

const scanValueByDateSchema = z.object({ date: z.string(), value: z.number(), bodies: z.number() }).strict();
export function parseScanValuesByDate(value: unknown): Array<{ date: string; value: number; bodies: number }> {
  if (!Array.isArray(value)) return [];
  const out: Array<{ date: string; value: number; bodies: number }> = [];
  for (const item of value) {
    const parsed = scanValueByDateSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

const sessionDiscoverySchema = z.object({
  sessionId: z.string(),
  startTime: z.string(),
  systems: z.number(),
  bodies: z.number(),
  firstDiscoveries: z.number(),
  value: z.number(),
}).strict();
export function parseSessionDiscoveryCounts(value: unknown): Array<z.infer<typeof sessionDiscoverySchema>> {
  if (!Array.isArray(value)) return [];
  const out: Array<z.infer<typeof sessionDiscoverySchema>> = [];
  for (const item of value) {
    const parsed = sessionDiscoverySchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

const bodyTypeDistItemSchema = z.object({ category: z.string(), count: z.number(), value: z.number() }).strict();
export function parseBodyTypeDistribution(value: unknown): Array<{ category: string; count: number; value: number }> {
  if (!Array.isArray(value)) return [];
  const out: Array<{ category: string; count: number; value: number }> = [];
  for (const item of value) {
    const parsed = bodyTypeDistItemSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

const biologicalStatsSchema = z.object({
  totalSpecies: z.number(),
  completedScans: z.number(),
  totalValue: z.number(),
  genusCounts: z.record(z.string(), z.object({ total: z.number(), scanned: z.number(), value: z.number() }).strict()),
}).strict();
export function parseBiologicalStats(value: unknown): z.infer<typeof biologicalStatsSchema> | null {
  const result = biologicalStatsSchema.safeParse(value);
  if (!result.success) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.warn('[boundarySchemas] Invalid biological stats:', result.error.flatten());
    }
    return null;
  }
  return result.data;
}

// --- Biological ---
const biologicalSchema = z.object({
  id: z.number(),
  bodyId: z.number(),
  genus: z.string(),
  species: z.string(),
  variant: z.string().nullable(),
  value: z.number(),
  scanned: z.boolean(),
  scanProgress: z.number(),
}).strict();

export function parseBiological(value: unknown): Biological | null {
  const result = biologicalSchema.safeParse(value);
  if (!result.success) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.warn('[boundarySchemas] Invalid biological:', result.error.flatten());
    }
    return null;
  }
  return result.data as Biological;
}

export function parseBiologicalArray(value: unknown): Biological[] {
  if (!Array.isArray(value)) return [];
  const out: Biological[] = [];
  for (const item of value) {
    const parsed = parseBiological(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

// --- Route ---
const highValueBodiesSchema = z.object({
  elw: z.number(),
  ww: z.number(),
  tww: z.number(),
  ammonia: z.number(),
  hmc: z.number(),
  thmc: z.number(),
  metalRich: z.number(),
  trocky: z.number(),
}).strict();

const routeEntrySchema = z.object({
  id: z.number(),
  systemId: z.number(),
  systemName: z.string(),
  timestamp: z.string(),
  jumpDistance: z.number(),
  fuelUsed: z.number(),
  sessionId: z.string(),
  starPosX: z.number(),
  starPosY: z.number(),
  starPosZ: z.number(),
  primaryStarType: z.string().nullable(),
  bodyCount: z.number().nullable(),
  firstDiscovered: z.number(),
  totalValue: z.number(),
  estimatedFssValue: z.number(),
  estimatedDssValue: z.number(),
  highValueBodies: highValueBodiesSchema,
}).strict();

const routeSessionSchema = z.object({
  sessionId: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  jumpCount: z.number(),
}).strict();

export function parseRouteEntry(value: unknown): RouteEntry | null {
  const result = routeEntrySchema.safeParse(value);
  if (!result.success) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.warn('[boundarySchemas] Invalid route entry:', result.error.flatten());
    }
    return null;
  }
  return result.data as RouteEntry;
}

export function parseRouteEntryArray(value: unknown): RouteEntry[] {
  if (!Array.isArray(value)) return [];
  const out: RouteEntry[] = [];
  for (const item of value) {
    const parsed = parseRouteEntry(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function parseRouteSessionArray(value: unknown): RouteSession[] {
  if (!Array.isArray(value)) return [];
  const out: RouteSession[] = [];
  for (const item of value) {
    const parsed = routeSessionSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data as RouteSession);
  }
  return out;
}

// --- Codex ---
const codexEntrySchema = z.object({
  id: z.number(),
  entryId: z.number(),
  name: z.string(),
  category: z.string(),
  subcategory: z.string(),
  region: z.string(),
  systemName: z.string(),
  systemAddress: z.number(),
  bodyId: z.number().nullable(),
  isNewEntry: z.boolean(),
  newTraitsDiscovered: z.boolean(),
  voucherAmount: z.number(),
  timestamp: z.string(),
}).strict();

const codexStatsSchema = z.object({
  totalEntries: z.number(),
  newEntries: z.number(),
  totalVouchers: z.number(),
  byCategory: z.record(z.string(), z.number()),
  byRegion: z.record(z.string(), z.number()),
}).strict();

export function parseCodexEntry(value: unknown): CodexEntry | null {
  const result = codexEntrySchema.safeParse(value);
  if (!result.success) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.warn('[boundarySchemas] Invalid codex entry:', result.error.flatten());
    }
    return null;
  }
  return result.data as CodexEntry;
}

export function parseCodexEntryArray(value: unknown): CodexEntry[] {
  if (!Array.isArray(value)) return [];
  const out: CodexEntry[] = [];
  for (const item of value) {
    const parsed = parseCodexEntry(item);
    if (parsed) out.push(parsed);
  }
  return out;
}

export function parseCodexStats(value: unknown): z.infer<typeof codexStatsSchema> | null {
  const result = codexStatsSchema.safeParse(value);
  if (!result.success) {
    if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
      console.warn('[boundarySchemas] Invalid codex stats:', result.error.flatten());
    }
    return null;
  }
  return result.data;
}

// --- Route history totals ---
const routeHistoryTotalsSchema = z.object({ totalDistance: z.number(), totalFuel: z.number() }).strict();
export function parseRouteHistoryTotals(value: unknown): { totalDistance: number; totalFuel: number } | null {
  const result = routeHistoryTotalsSchema.safeParse(value);
  if (!result.success) return null;
  return result.data;
}

// --- App / DB info (Settings page) ---
const appInfoSchema = z.object({
  version: z.string(),
  electronVersion: z.string(),
  nodeVersion: z.string(),
  chromeVersion: z.string(),
  platform: z.string(),
  arch: z.string(),
}).strict();
export function parseAppInfo(value: unknown): z.infer<typeof appInfoSchema> | null {
  const result = appInfoSchema.safeParse(value);
  if (!result.success) return null;
  return result.data;
}

const databaseInfoSchema = z.object({
  path: z.string(),
  size: z.number(),
  systemCount: z.number(),
  bodyCount: z.number(),
}).strict();
export function parseDatabaseInfo(value: unknown): z.infer<typeof databaseInfoSchema> | null {
  const result = databaseInfoSchema.safeParse(value);
  if (!result.success) return null;
  return result.data;
}

const edsmCacheStatsSchema = z.object({
  memoryCacheSize: z.number(),
  dbStats: z.object({
    totalEntries: z.number(),
    validEntries: z.number(),
    expiredEntries: z.number(),
    sizeBytes: z.number(),
    byType: z.record(z.string(), z.number()),
  }).strict().nullable(),
}).strict();
export function parseEdsmCacheStats(value: unknown): z.infer<typeof edsmCacheStatsSchema> | null {
  const result = edsmCacheStatsSchema.safeParse(value);
  if (!result.success) return null;
  return result.data;
}
