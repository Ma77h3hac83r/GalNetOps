/**
 * System data storage using Cloudflare D1 SQL Database
 * Stores detailed information about star systems discovered from journal files
 */

import type { D1Database } from '@cloudflare/workers-types';

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

// D1 binding type
declare global {
  interface Env {
    DB: D1Database;
  }
}

/**
 * Get D1 database from runtime
 */
function getDB(context?: any): D1Database | null {
  if (context?.locals?.runtime?.env?.DB) {
    return context.locals.runtime.env.DB;
  }
  if (context?.env?.DB) {
    return context.env.DB;
  }
  if (context?.runtime?.env?.DB) {
    return context.runtime.env.DB;
  }
  return null;
}

/**
 * Store system data in D1
 */
export async function storeSystem(
  systemData: SystemData,
  context?: any
): Promise<boolean> {
  const db = getDB(context);
  if (!db) {
    return false;
  }

  try {
    const now = new Date().toISOString();
    const starsJson = JSON.stringify(systemData.stars);
    const planetsJson = systemData.planets ? JSON.stringify(systemData.planets) : null;
    const bodiesJson = systemData.bodies ? JSON.stringify(systemData.bodies) : null;
    const biologicalsJson = systemData.biologicals ? JSON.stringify(systemData.biologicals) : null;

    // Use INSERT OR REPLACE to handle updates
    await db.prepare(`
      INSERT OR REPLACE INTO systems (
        name, system_address, stars, planets, bodies, biologicals,
        discovered_by, discovered_timestamp, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      systemData.name,
      systemData.systemAddress,
      starsJson,
      planetsJson,
      bodiesJson,
      biologicalsJson,
      systemData.discoveredBy || null,
      systemData.discoveredTimestamp || null,
      now
    ).run();

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
  const db = getDB(context);
  if (!db) {
    return null;
  }

  try {
    const row = await db.prepare('SELECT * FROM systems WHERE LOWER(name) = LOWER(?)').bind(systemName).first();
    if (!row) {
      return null;
    }

    return {
      name: row.name as string,
      systemAddress: row.system_address as number,
      stars: JSON.parse(row.stars as string) as Star[],
      planets: row.planets ? JSON.parse(row.planets as string) as Planet[] : [],
      bodies: row.bodies ? JSON.parse(row.bodies as string) : undefined,
      biologicals: row.biologicals ? JSON.parse(row.biologicals as string) as Biological[] : undefined,
      discoveredBy: row.discovered_by as string | undefined,
      discoveredTimestamp: row.discovered_timestamp as string | undefined,
      lastUpdated: row.last_updated as string,
    };
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
  const db = getDB(context);
  if (!db) {
    return [];
  }

  try {
    const { results } = await db.prepare(`
      SELECT name FROM systems 
      WHERE LOWER(name) LIKE LOWER(?) 
      ORDER BY name 
      LIMIT ?
    `).bind(`${query}%`, limit).all();

    if (!results) {
      return [];
    }

    return results.map(row => row.name as string);
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
  const db = getDB(context);
  if (!db) {
    return [];
  }

  try {
    const { results } = await db.prepare('SELECT name FROM systems ORDER BY name').all();
    if (!results) {
      return [];
    }

    return results.map(row => row.name as string);
  } catch (error) {
    console.error('Error getting system names:', error);
    return [];
  }
}

