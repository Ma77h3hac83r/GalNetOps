/** Types used by the Route History page. */
import type { RouteEntry } from '@shared/types';

export interface RouteHistoryTotals {
  totalDistance: number;
  totalFuel: number;
}

export type RouteEntryWithRunning = RouteEntry & {
  runningDistance: number;
  runningFuel: number;
};
