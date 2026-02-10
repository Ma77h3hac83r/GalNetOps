/** Formatters for Route History page. */
import type { RouteSession } from '@shared/types';

export function formatDistance(ly: number): string {
  if (ly === 0) {
    return '-';
  }
  return `${ly.toFixed(2)} ly`;
}

export function formatFuel(tons: number): string {
  if (tons === 0) {
    return '-';
  }
  return `${tons.toFixed(2)} t`;
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function formatLargeNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }
  return num.toFixed(2);
}

export function formatCredits(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/** Show main sequence letter (e.g. K) when sub_type is long like "K (Yellow-Orange) Star". */
export function formatStarType(subType: string | null): string {
  if (!subType) {
    return '-';
  }
  const trimmed = subType.trim();
  const match = trimmed.match(/^([A-Za-z0-9]+)/);
  return (match?.[1] ?? trimmed).toUpperCase();
}

export function formatSessionLabel(session: RouteSession): string {
  const startDate = new Date(session.startTime ?? '');
  const endDate = new Date(session.endTime ?? '');
  const dateStr = startDate.toLocaleDateString(undefined, { dateStyle: 'short' });
  const startTime = startDate.toLocaleTimeString(undefined, { timeStyle: 'short' });
  const endTime = endDate.toLocaleTimeString(undefined, { timeStyle: 'short' });
  return `${dateStr} ${startTime}–${endTime} (${session.jumpCount} jumps)`;
}
