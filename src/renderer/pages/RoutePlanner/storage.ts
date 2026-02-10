/** Load/save Route Planner waypoints, POIs, and custom categories to localStorage. */
import { RP_WAYPOINTS_KEY, RP_POIS_KEY, RP_CUSTOM_CATEGORIES_KEY } from './constants';
import type { Waypoint, PointOfInterest } from './types';

// ── Waypoints ──────────────────────────────────────────────

export function loadWaypoints(): Waypoint[] {
  try {
    const raw = localStorage.getItem(RP_WAYPOINTS_KEY);
    if (typeof raw !== 'string') return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (w): w is Waypoint =>
        w != null &&
        typeof w === 'object' &&
        typeof (w as Waypoint).name === 'string'
    );
  } catch {
    return [];
  }
}

export function saveWaypoints(waypoints: Waypoint[]): void {
  try {
    localStorage.setItem(RP_WAYPOINTS_KEY, JSON.stringify(waypoints));
  } catch {
    // ignore
  }
}

// ── Points of Interest ─────────────────────────────────────

export function loadPois(): PointOfInterest[] {
  try {
    const raw = localStorage.getItem(RP_POIS_KEY);
    if (typeof raw !== 'string') return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is PointOfInterest =>
        p != null &&
        typeof p === 'object' &&
        typeof (p as PointOfInterest).id === 'string' &&
        typeof (p as PointOfInterest).systemName === 'string'
    );
  } catch {
    return [];
  }
}

export function savePois(pois: PointOfInterest[]): void {
  try {
    localStorage.setItem(RP_POIS_KEY, JSON.stringify(pois));
  } catch {
    // ignore
  }
}

// ── Custom POI Categories ─────────────────────────────────

export function loadCustomCategories(): string[] {
  try {
    const raw = localStorage.getItem(RP_CUSTOM_CATEGORIES_KEY);
    if (typeof raw !== 'string') return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((c): c is string => typeof c === 'string');
  } catch {
    return [];
  }
}

export function saveCustomCategories(categories: string[]): void {
  try {
    localStorage.setItem(RP_CUSTOM_CATEGORIES_KEY, JSON.stringify(categories));
  } catch {
    // ignore
  }
}
