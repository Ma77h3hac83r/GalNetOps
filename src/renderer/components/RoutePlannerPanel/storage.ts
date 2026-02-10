/** Load/save route planner system names and POI names to localStorage. */
import { ROUTE_PLANNER_STORAGE_KEY, ROUTE_PLANNER_POIS_KEY } from './constants';

export function loadStoredSystemNames(): string[] {
  try {
    const s = localStorage.getItem(ROUTE_PLANNER_STORAGE_KEY);
    if (typeof s !== 'string') {
      return [];
    }
    const parsed = JSON.parse(s) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every((x) => typeof x === 'string')
    ) {
      return parsed;
    }
    const legacy = String(s)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
    return legacy;
  } catch {
    return [];
  }
}

export function saveStoredSystemNames(names: string[]): void {
  try {
    localStorage.setItem(ROUTE_PLANNER_STORAGE_KEY, JSON.stringify(names));
  } catch {
    // ignore
  }
}

export function loadStoredPoiNames(systemCount: number): string[] {
  try {
    const s = localStorage.getItem(ROUTE_PLANNER_POIS_KEY);
    if (typeof s !== 'string') {
      return Array(systemCount).fill('');
    }
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) {
      return Array(systemCount).fill('');
    }
    const arr = parsed
      .filter((x): x is string => typeof x === 'string')
      .slice(0, systemCount);
    while (arr.length < systemCount) {
      arr.push('');
    }
    return arr;
  } catch {
    return Array(systemCount).fill('');
  }
}

export function saveStoredPoiNames(pois: string[]): void {
  try {
    localStorage.setItem(ROUTE_PLANNER_POIS_KEY, JSON.stringify(pois));
  } catch {
    // ignore
  }
}
