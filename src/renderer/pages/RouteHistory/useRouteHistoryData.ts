/** Hook: route history data, filters, pagination, export. */
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { RouteEntry, RouteHistoryFilter, RouteSession } from '@shared/types';
import {
  parseRouteSessionArray,
  parseRouteEntryArray,
  parseRouteHistoryTotals,
} from '../../utils/boundarySchemas';
import { loadFiltersFromStorage, saveFiltersToStorage } from './storage';
import type { RouteHistoryTotals } from './types';
import { ITEMS_PER_PAGE, EXPORT_PAGE_LIMIT } from './constants';

export function useRouteHistoryData() {
  const [entries, setEntries] = useState<RouteEntry[]>([]);
  const [totals, setTotals] = useState<RouteHistoryTotals | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<RouteSession[]>([]);

  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);

  const [filter, setFilter] = useState<RouteHistoryFilter>(() => loadFiltersFromStorage());
  const [searchInput, setSearchInput] = useState(filter.search ?? '');
  const [showFilters, setShowFilters] = useState(
    Boolean(filter.search ?? filter.dateFrom ?? filter.dateTo ?? filter.sessionId)
  );

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filter.search) {
        updateFilter(searchInput ? { search: searchInput } : {});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    saveFiltersToStorage(filter);
  }, [filter]);

  useEffect(() => {
    window.electron
      .getRouteSessions()
      .then((raw) => setSessions(parseRouteSessionArray(raw)))
      .catch(console.error);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [historyData, countData, totalsData] = await Promise.all([
        window.electron.getRouteHistory(ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE, filter),
        window.electron.getRouteHistoryCount(filter),
        window.electron.getRouteHistoryTotals(filter),
      ]);
      setEntries(parseRouteEntryArray(historyData));
      setTotalCount(typeof countData === 'number' ? countData : 0);
      const parsedTotals = parseRouteHistoryTotals(totalsData);
      setTotals(parsedTotals);
    } catch (error: unknown) {
      console.error('Failed to load route history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh when a new jump is recorded (FSDJump/CarrierJump add route entries; system-changed is emitted)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.onSystemChanged) return () => {};
    const unsub = window.electron.onSystemChanged(() => {
      loadData();
    });
    return () => unsub();
  }, [loadData]);

  const updateFilter = useCallback((updates: Partial<RouteHistoryFilter>) => {
    setFilter((prev) => {
      const newFilter = { ...prev, ...updates };
      Object.keys(newFilter).forEach((key) => {
        const k = key as keyof RouteHistoryFilter;
        if (newFilter[k] === undefined || newFilter[k] === '') {
          delete newFilter[k];
        }
      });
      return newFilter;
    });
    setCurrentPage(0);
  }, []);

  const clearFilters = useCallback(() => {
    setFilter({});
    setSearchInput('');
    setCurrentPage(0);
  }, []);

  const runningTotals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        const newDistance = acc.cumulativeDistance + entry.jumpDistance;
        const newFuel = acc.cumulativeFuel + entry.fuelUsed;
        acc.items.push({
          ...entry,
          runningDistance: newDistance,
          runningFuel: newFuel,
        });
        acc.cumulativeDistance = newDistance;
        acc.cumulativeFuel = newFuel;
        return acc;
      },
      {
        items: [] as (RouteEntry & { runningDistance: number; runningFuel: number })[],
        cumulativeDistance: 0,
        cumulativeFuel: 0,
      }
    ).items;
  }, [entries]);

  const hasActiveFilters = Boolean(
    filter.search ?? filter.dateFrom ?? filter.dateTo ?? filter.sessionId
  );
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const fetchAllForExport = useCallback(async (): Promise<RouteEntry[]> => {
    try {
      const raw = await window.electron.getRouteHistory(EXPORT_PAGE_LIMIT, 0, filter);
      return parseRouteEntryArray(raw);
    } catch (error: unknown) {
      console.error('Failed to fetch data for export:', error);
      return [];
    }
  }, [filter]);

  const exportToCSV = useCallback(async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const data = await fetchAllForExport();
      if (data.length === 0) {
        alert('No data to export');
        return;
      }

      const headers = [
        'System Name',
        'Timestamp',
        'Jump Distance (ly)',
        'Fuel Used (t)',
        'X',
        'Y',
        'Z',
        'Session ID',
      ];
      const rows = data.map((entry) =>
        [
          `"${entry.systemName.replace(/"/g, '""')}"`,
          entry.timestamp,
          entry.jumpDistance.toFixed(2),
          entry.fuelUsed.toFixed(2),
          entry.starPosX.toFixed(5),
          entry.starPosY.toFixed(5),
          entry.starPosZ.toFixed(5),
          entry.sessionId,
        ].join(',')
      );
      const csv = [headers.join(','), ...rows].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `route-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [fetchAllForExport]);

  const exportToJSON = useCallback(async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const data = await fetchAllForExport();
      if (data.length === 0) {
        alert('No data to export');
        return;
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        filters: filter,
        totalEntries: data.length,
        entries: data.map((entry) => ({
          systemName: entry.systemName,
          timestamp: entry.timestamp,
          jumpDistance: entry.jumpDistance,
          fuelUsed: entry.fuelUsed,
          coordinates: { x: entry.starPosX, y: entry.starPosY, z: entry.starPosZ },
          sessionId: entry.sessionId,
        })),
      };
      const json = JSON.stringify(exportData, null, 2);

      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `route-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('Failed to export JSON:', error);
      alert('Failed to export JSON');
    } finally {
      setIsExporting(false);
    }
  }, [fetchAllForExport, filter]);

  const copySystemNames = useCallback(async () => {
    setShowExportMenu(false);
    try {
      const data = await fetchAllForExport();
      if (data.length === 0) {
        alert('No data to copy');
        return;
      }
      const systemNames = [...new Set(data.map((e) => e.systemName))].join('\n');
      await navigator.clipboard.writeText(systemNames);
      const uniqueCount = new Set(data.map((e) => e.systemName)).size;
      alert(`Copied ${uniqueCount} system names to clipboard`);
    } catch (error: unknown) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  }, [fetchAllForExport]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-export-menu]')) {
          setShowExportMenu(false);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu]);

  return {
    entries,
    totals,
    totalCount,
    currentPage,
    setCurrentPage,
    isLoading,
    sessions,
    selectedSystemId,
    setSelectedSystemId,
    filter,
    searchInput,
    setSearchInput,
    showFilters,
    setShowFilters,
    showExportMenu,
    setShowExportMenu,
    isExporting,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    totalPages,
    runningTotals,
    exportToCSV,
    exportToJSON,
    copySystemNames,
  };
}
