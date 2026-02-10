/** Types for the Route Planner page. */

/** A waypoint in the planned route. */
export interface Waypoint {
  /** System name entered by the user. */
  name: string;
  /** Whether the system exists in EDSM (null = not checked yet). */
  inEdsm: boolean | null;
  /** Whether the system has been visited locally (null = not checked yet). */
  visited: boolean | null;
  /** Primary star type abbreviation, e.g. "K", "M", "G" (null = unknown/not checked). */
  starType: string | null;
  /** POI label pulled from the POI list (empty string if none). */
  poiName: string;
  /** Optional notes for this waypoint. */
  notes: string;
}

/** A point-of-interest associated with a system/body. */
export interface PointOfInterest {
  /** Unique ID for this POI (timestamp-based). */
  id: string;
  /** System name where the POI is located. */
  systemName: string;
  /** Optional body name within the system. */
  bodyName: string;
  /** Short label / name for the POI. */
  label: string;
  /** Category tag — one of the predefined types or a user-created custom grouping. */
  category: string;
  /** Free-form notes. */
  notes: string;
  /** Primary star type abbreviation (resolved from EDSM/DB; null = not checked yet). */
  starType: string | null;
  /** Galactic region/sector name (resolved from coordinates; null = not checked yet). */
  galacticSector: string | null;
}

/** Predefined POI categories (used for built-in colour badges). */
export type PoiCategory =
  | 'Biological'
  | 'Geological'
  | 'Guardian'
  | 'Thargoid'
  | 'Scenic'
  | 'Station'
  | 'Mining'
  | 'Other';

/** Type-guard: is the value a built-in predefined category? */
export function isPoiCategory(value: string): value is PoiCategory {
  return [
    'Biological', 'Geological', 'Guardian', 'Thargoid',
    'Scenic', 'Station', 'Mining', 'Other',
  ].includes(value);
}
