/** Sanitization and helpers for Statistics chart data. */
import type { SessionDiscovery, BodyTypeDistribution } from './types';

/** Coerce to finite number or NaN (caller can filter). */
export function toFinite(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : NaN;
}

/** Sanitize scan-value-by-date for charts: drop invalid points, ensure finite value/bodies. */
export function sanitizeScanValuesByDate(
  data: Array<{ date: string; value: number; bodies: number }>
): Array<{ date: string; value: number; bodies: number }> {
  return data
    .filter((d) => {
      const value = toFinite(d.value);
      const bodies = toFinite(d.bodies);
      return (
        typeof d.date === 'string' &&
        d.date.length > 0 &&
        !Number.isNaN(value) &&
        !Number.isNaN(bodies)
      );
    })
    .map((d) => ({
      date: String(d.date),
      value: toFinite(d.value),
      bodies: toFinite(d.bodies),
    }));
}

/** Sanitize session discovery rows: drop invalid, ensure finite numbers. */
export function sanitizeSessionDiscoveries(
  data: Array<{
    sessionId: string;
    startTime: string;
    systems: number;
    bodies: number;
    firstDiscoveries: number;
    value: number;
  }>
): SessionDiscovery[] {
  return data
    .filter((d) => {
      return (
        typeof d.sessionId === 'string' &&
        typeof d.startTime === 'string' &&
        !Number.isNaN(toFinite(d.systems)) &&
        !Number.isNaN(toFinite(d.bodies)) &&
        !Number.isNaN(toFinite(d.firstDiscoveries)) &&
        !Number.isNaN(toFinite(d.value))
      );
    })
    .map((d) => ({
      sessionId: String(d.sessionId),
      startTime: String(d.startTime),
      systems: toFinite(d.systems),
      bodies: toFinite(d.bodies),
      firstDiscoveries: toFinite(d.firstDiscoveries),
      value: toFinite(d.value),
    }));
}

/** Sanitize body type distribution: drop invalid, ensure finite count/value. */
export function sanitizeBodyTypeDistribution(
  data: Array<{ category: string; count: number; value: number }>
): BodyTypeDistribution[] {
  return data
    .filter((d) => {
      return (
        typeof d.category === 'string' &&
        !Number.isNaN(toFinite(d.count)) &&
        !Number.isNaN(toFinite(d.value))
      );
    })
    .map((d) => ({
      category: String(d.category),
      count: toFinite(d.count),
      value: toFinite(d.value),
    }));
}
