/**
 * System data storage using Cloudflare KV
 * Stores detailed information about star systems discovered from journal files
 */

export interface Star {
  name: string;
  type: string;
  stellarMass?: number;
  radius?: number;
  absoluteMagnitude?: number;
  ageMY?: number;
  surfaceTemperature?: number;
  luminosity?: string;
  isMainStar?: boolean;
}

export interface Planet {
  name: string;
  planetClass: string;
  atmosphere?: string;
  atmosphereType?: string;
  volcanism?: string;
  massEM?: number;
  radius?: number;
  surfaceGravity?: number;
  surfaceTemperature?: number;
  surfacePressure?: number;
  landable?: boolean;
  terraformState?: string;
  composition?: {
    ice?: number;
    rock?: number;
    metal?: number;
  };
  materials?: Array<{
    name: string;
    percent: number;
  }>;
  parents?: Array<{
    name: string;
    type: string;
  }>;
  moons?: Moon[];
}

export interface Moon {
  name: string;
  planetClass: string;
  atmosphere?: string;
  atmosphereType?: string;
  volcanism?: string;
  massEM?: number;
  radius?: number;
  surfaceGravity?: number;
  surfaceTemperature?: number;
  landable?: boolean;
  parents?: Array<{
    name: string;
    type: string;
  }>;
}

export interface Biological {
  name: string;
  bodyName: string;
  bodyID: number;
  latitude?: number;
  longitude?: number;
}

export interface SystemData {
  name: string;
  systemAddress: number;
  stars: Star[];
  planets: Planet[];
  discoveredBy?: string;
  discoveredTimestamp?: string;
  lastUpdated: string;
  bodies?: Array<{
    name: string;
    bodyID: number;
    bodyType: string;
  }>;
  biologicals?: Biological[];
}

// KV binding type
declare global {
  interface Env {
    SYSTEMS: KVNamespace;
  }
}

/**
 * Get KV namespace from runtime
 */
function getKV(context?: any): KVNamespace | null {
  if (context?.locals?.runtime?.env?.SYSTEMS) {
    return context.locals.runtime.env.SYSTEMS;
  }
  if (context?.env?.SYSTEMS) {
    return context.env.SYSTEMS;
  }
  return null;
}

/**
 * Store system data in KV
 */
export async function storeSystem(
  systemData: SystemData,
  context?: any
): Promise<boolean> {
  const kv = getKV(context);
  if (!kv) {
    return false;
  }

  try {
    const key = `system:${systemData.name.toLowerCase()}`;
    await kv.put(key, JSON.stringify(systemData));
    return true;
  } catch (error) {
    console.error('Error storing system:', error);
    return false;
  }
}

/**
 * Get system data by name
 */
export async function getSystem(
  systemName: string,
  context?: any
): Promise<SystemData | null> {
  const kv = getKV(context);
  if (!kv) {
    return null;
  }

  try {
    const key = `system:${systemName.toLowerCase()}`;
    const data = await kv.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as SystemData;
  } catch (error) {
    console.error('Error getting system:', error);
    return null;
  }
}

/**
 * Search systems by name (prefix match)
 */
export async function searchSystems(
  query: string,
  limit: number = 20,
  context?: any
): Promise<string[]> {
  const kv = getKV(context);
  if (!kv) {
    return [];
  }

  try {
    const prefix = `system:${query.toLowerCase()}`;
    const list = await kv.list({ prefix, limit });
    
    return list.keys
      .map(key => key.name.replace('system:', ''))
      .slice(0, limit);
  } catch (error) {
    console.error('Error searching systems:', error);
    return [];
  }
}

/**
 * Get all system names (for autocomplete)
 */
export async function getAllSystemNames(
  context?: any
): Promise<string[]> {
  const kv = getKV(context);
  if (!kv) {
    return [];
  }

  try {
    const list = await kv.list({ prefix: 'system:' });
    return list.keys.map(key => key.name.replace('system:', ''));
  } catch (error) {
    console.error('Error getting system names:', error);
    return [];
  }
}

