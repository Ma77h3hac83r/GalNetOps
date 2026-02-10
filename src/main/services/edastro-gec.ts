/** EDAstro GEC (Galactic Exploration Catalog) API: fetch combined GEC+GMP POI list for route planner POI suggestions. */
import { logInfo, logWarn, logError, logDebug, isDev } from '../logger';

const EDASTRO_GEC_COMBINED_URL = 'https://edastro.com/gec/json/combined';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface GECPoiEntry {
  id: number;
  type: string;
  name: string;
  galMapSearch: string;
  galMapUrl?: string;
  coordinates?: [number, number, number];
  descr?: string;
  source?: string;
}

let cachedPois: GECPoiEntry[] | null = null;
let cacheTimestamp = 0;

/**
 * Fetch combined GEC + GMP POI list. Cached for CACHE_TTL_MS.
 * Returns array of { name, galMapSearch } for route planner POI suggestions by system name.
 */
export async function getGecPoiList(): Promise<Array<{ name: string; galMapSearch: string }>> {
  const now = Date.now();
  if (cachedPois != null && now - cacheTimestamp < CACHE_TTL_MS) {
    logDebug('EDAstro GEC', isDev() ? 'Cache hit for POI list' : 'Cache hit');
    return cachedPois.map((p) => ({ name: p.name, galMapSearch: p.galMapSearch ?? '' }));
  }

  try {
    logInfo('EDAstro GEC', isDev() ? `Fetching ${EDASTRO_GEC_COMBINED_URL}` : 'Fetching POI list');
    const response = await fetch(EDASTRO_GEC_COMBINED_URL, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      logWarn('EDAstro GEC', `HTTP ${response.status} ${response.statusText}`);
      return cachedPois != null
        ? cachedPois.map((p) => ({ name: p.name, galMapSearch: p.galMapSearch ?? '' }))
        : [];
    }
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      logWarn('EDAstro GEC', 'Response was not an array');
      return cachedPois != null
        ? cachedPois.map((p) => ({ name: p.name, galMapSearch: p.galMapSearch ?? '' }))
        : [];
    }
    const pois = data.filter(
      (item: unknown): item is GECPoiEntry =>
        typeof item === 'object' &&
        item != null &&
        'name' in item &&
        typeof (item as GECPoiEntry).name === 'string' &&
        'galMapSearch' in item &&
        typeof (item as GECPoiEntry).galMapSearch === 'string'
    );
    cachedPois = pois;
    cacheTimestamp = now;
    logInfo('EDAstro GEC', isDev() ? `Cached ${pois.length} POIs` : 'POI list cached');
    return pois.map((p) => ({ name: p.name, galMapSearch: p.galMapSearch }));
  } catch (err: unknown) {
    logError('EDAstro GEC', 'Fetch failed', err);
    return cachedPois != null
      ? cachedPois.map((p) => ({ name: p.name, galMapSearch: p.galMapSearch ?? '' }))
      : [];
  }
}
