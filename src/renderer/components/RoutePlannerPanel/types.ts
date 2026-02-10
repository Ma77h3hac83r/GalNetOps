/** Types for the Route Planner panel. */

export interface RoutePlannerRow {
  name: string;
  poiName: string;
  inEdsm: boolean | null;
  visited: boolean | null;
}
