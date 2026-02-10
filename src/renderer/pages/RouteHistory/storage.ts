/** Persist route history filters to localStorage. */
import type { RouteHistoryFilter } from '@shared/types';
import { STORAGE_KEY } from './constants';

export function loadFiltersFromStorage(): RouteHistoryFilter {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as RouteHistoryFilter;
    }
  } catch (e: unknown) {
    console.error('Failed to load filters from storage:', e);
  }
  return {};
}

export function saveFiltersToStorage(filter: RouteHistoryFilter): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
  } catch (e: unknown) {
    console.error('Failed to save filters to storage:', e);
  }
}
