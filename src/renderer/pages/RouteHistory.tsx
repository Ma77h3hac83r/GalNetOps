/** Route History tab: paginated table of visited systems (from DB) with filters (search, date, session), Current/Max value columns; row click opens SystemDetailModal, optional "Load into Explorer". */
import { useState, useEffect, useCallback, useMemo } from 'react';
import type { RouteEntry, RouteHistoryFilter, RouteSession } from '@shared/types';
import SystemDetailModal from '../components/SystemDetailModal';
import { useAppStore } from '../stores/appStore';
import {
  parseRouteSessionArray,
  parseRouteEntryArray,
  parseRouteHistoryTotals,
} from '../utils/boundarySchemas';

const ITEMS_PER_PAGE = 50;
const STORAGE_KEY = 'galnetops_route_history_filters';

interface RouteHistoryTotals {
  totalDistance: number;
  totalFuel: number;
}

// Load filters from localStorage
function loadFiltersFromStorage(): RouteHistoryFilter {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load filters from storage:', e);
  }
  return {};
}

// Save filters to localStorage
function saveFiltersToStorage(filter: RouteHistoryFilter): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filter));
  } catch (e) {
    console.error('Failed to save filters to storage:', e);
  }
}

function RouteHistory() {
  const setCurrentSystem = useAppStore((s) => s.setCurrentSystem);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const [entries, setEntries] = useState<RouteEntry[]>([]);
  const [totals, setTotals] = useState<RouteHistoryTotals | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [sessions, setSessions] = useState<RouteSession[]>([]);
  
  // Modal state
  const [selectedSystemId, setSelectedSystemId] = useState<number | null>(null);

  // Filter state
  const [filter, setFilter] = useState<RouteHistoryFilter>(() => loadFiltersFromStorage());
  const [searchInput, setSearchInput] = useState(filter.search || '');
  const [showFilters, setShowFilters] = useState(
    Boolean(filter.search || filter.dateFrom || filter.dateTo || filter.sessionId)
  );

  // Debounced search - update filter after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filter.search) {
        updateFilter(searchInput ? { search: searchInput } : {});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Save filters to localStorage when they change
  useEffect(() => {
    saveFiltersToStorage(filter);
  }, [filter]);

  // Load sessions for dropdown
  useEffect(() => {
    window.electron
      .getRouteSessions()
      .then((raw) => setSessions(parseRouteSessionArray(raw)))
      .catch(console.error);
  }, []);

  // Calculate running totals for visible entries
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
      { items: [] as (RouteEntry & { runningDistance: number; runningFuel: number })[], cumulativeDistance: 0, cumulativeFuel: 0 }
    ).items;
  }, [entries]);

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
    } catch (error) {
      console.error('Failed to load route history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset to first page when filter changes
  const updateFilter = useCallback((updates: Partial<RouteHistoryFilter>) => {
    setFilter(prev => {
      const newFilter = { ...prev, ...updates };
      // Remove undefined/empty values
      Object.keys(newFilter).forEach(key => {
        if (newFilter[key as keyof RouteHistoryFilter] === undefined || 
            newFilter[key as keyof RouteHistoryFilter] === '') {
          delete newFilter[key as keyof RouteHistoryFilter];
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

  const hasActiveFilters = Boolean(filter.search || filter.dateFrom || filter.dateTo || filter.sessionId);
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const formatDistance = (ly: number): string => {
    if (ly === 0) return '—';
    return `${ly.toFixed(2)} ly`;
  };

  const formatFuel = (tons: number): string => {
    if (tons === 0) return '—';
    return `${tons.toFixed(2)} t`;
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(2)}K`;
    }
    return num.toFixed(2);
  };

  const formatCredits = (value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  /** Show main sequence letter (e.g. K) when sub_type is long like "K (Yellow-Orange) Star". */
  const formatStarType = (subType: string | null): string => {
    if (!subType) return '—';
    const trimmed = subType.trim();
    const match = trimmed.match(/^([A-Za-z0-9]+)/);
    return match && match[1] ? match[1] : trimmed;
  };

  const formatSessionLabel = (session: RouteSession): string => {
    const startDate = new Date(session.startTime ?? '');
    const endDate = new Date(session.endTime ?? '');
    const dateStr = startDate.toLocaleDateString(undefined, { dateStyle: 'short' });
    const startTime = startDate.toLocaleTimeString(undefined, { timeStyle: 'short' });
    const endTime = endDate.toLocaleTimeString(undefined, { timeStyle: 'short' });
    return `${dateStr} ${startTime}–${endTime} (${session.jumpCount} jumps)`;
  };

  // Export state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch all filtered entries for export (up to 10000)
  const fetchAllForExport = useCallback(async (): Promise<RouteEntry[]> => {
    try {
      const raw = await window.electron.getRouteHistory(10000, 0, filter);
      return parseRouteEntryArray(raw);
    } catch (error) {
      console.error('Failed to fetch data for export:', error);
      return [];
    }
  }, [filter]);

  // Export to CSV
  const exportToCSV = useCallback(async () => {
    setIsExporting(true);
    setShowExportMenu(false);
    try {
      const data = await fetchAllForExport();
      if (data.length === 0) {
        alert('No data to export');
        return;
      }

      // CSV header
      const headers = ['System Name', 'Timestamp', 'Jump Distance (ly)', 'Fuel Used (t)', 'X', 'Y', 'Z', 'Session ID'];
      
      // CSV rows
      const rows = data.map(entry => [
        `"${entry.systemName.replace(/"/g, '""')}"`,
        entry.timestamp,
        entry.jumpDistance.toFixed(2),
        entry.fuelUsed.toFixed(2),
        entry.starPosX.toFixed(5),
        entry.starPosY.toFixed(5),
        entry.starPosZ.toFixed(5),
        entry.sessionId,
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      
      // Download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `route-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export CSV:', error);
      alert('Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  }, [fetchAllForExport]);

  // Export to JSON
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
        entries: data.map(entry => ({
          systemName: entry.systemName,
          timestamp: entry.timestamp,
          jumpDistance: entry.jumpDistance,
          fuelUsed: entry.fuelUsed,
          coordinates: {
            x: entry.starPosX,
            y: entry.starPosY,
            z: entry.starPosZ,
          },
          sessionId: entry.sessionId,
        })),
      };

      const json = JSON.stringify(exportData, null, 2);
      
      // Download file
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `route-history-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export JSON:', error);
      alert('Failed to export JSON');
    } finally {
      setIsExporting(false);
    }
  }, [fetchAllForExport, filter]);

  // Copy system names to clipboard
  const copySystemNames = useCallback(async () => {
    setShowExportMenu(false);
    try {
      const data = await fetchAllForExport();
      if (data.length === 0) {
        alert('No data to copy');
        return;
      }

      // Get unique system names in order
      const systemNames = [...new Set(data.map(e => e.systemName))].join('\n');
      
      await navigator.clipboard.writeText(systemNames);
      
      // Show brief success feedback
      const uniqueCount = new Set(data.map(e => e.systemName)).size;
      alert(`Copied ${uniqueCount} system names to clipboard`);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard');
    }
  }, [fetchAllForExport]);

  // Close export menu when clicking outside
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {/* Header with stats */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
            Route History
          </h1>
          <div className="flex items-center space-x-2">
            {/* Export dropdown */}
            <div className="relative" data-export-menu>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting || totalCount === 0}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm transition-colors ${
                  showExportMenu
                    ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isExporting ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                )}
                <span>Export</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-10">
                  <button
                    onClick={exportToCSV}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Export as CSV</span>
                  </button>
                  <button
                    onClick={exportToJSON}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>Export as JSON</span>
                  </button>
                  <hr className="my-1 border-slate-200 dark:border-slate-700" />
                  <button
                    onClick={copySystemNames}
                    className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    <span>Copy System Names</span>
                  </button>
                </div>
              )}
            </div>

            {/* Filter button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded text-sm transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filters</span>
              {hasActiveFilters && (
                <span className="bg-accent-600 text-white text-xs rounded-full px-1.5 py-0.5">
                  {[filter.search, filter.dateFrom, filter.dateTo, filter.sessionId].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="card p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  System Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search systems..."
                    className="input pr-8"
                  />
                  {searchInput && (
                    <button
                      onClick={() => setSearchInput('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filter.dateFrom || ''}
                  onChange={(e) => updateFilter({ dateFrom: e.target.value || '' })}
                  className="input"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filter.dateTo || ''}
                  onChange={(e) => updateFilter({ dateTo: e.target.value || '' })}
                  className="input"
                />
              </div>

              {/* Session */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Session
                </label>
                <select
                  value={filter.sessionId || ''}
                  onChange={(e) => updateFilter({ sessionId: e.target.value || '' })}
                  className="input"
                >
                  <option value="">All sessions</option>
                  {sessions.map((session) => (
                    <option key={session.sessionId} value={session.sessionId}>
                      {formatSessionLabel(session)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={clearFilters}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear all filters</span>
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {hasActiveFilters ? 'Matching Jumps' : 'Total Jumps'}
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {totalCount.toLocaleString()}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {hasActiveFilters ? 'Filtered Distance' : 'Total Distance'}
            </div>
            <div className="text-2xl font-bold text-accent-600 dark:text-accent-400">
              {totals ? `${formatLargeNumber(totals.totalDistance)} ly` : '—'}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {hasActiveFilters ? 'Filtered Fuel' : 'Total Fuel Used'}
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totals ? `${formatLargeNumber(totals.totalFuel)} t` : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading route history...</span>
              </div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 dark:text-slate-400">
              <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {hasActiveFilters ? (
                <>
                  <p>No matching entries</p>
                  <p className="text-sm">Try adjusting your filters</p>
                </>
              ) : (
                <>
                  <p>No route history yet</p>
                  <p className="text-sm">Jump to a system to start tracking your journey</p>
                </>
              )}
            </div>
          ) : (
            <table className="w-full border-collapse text-left table-fixed">
              <colgroup>
                <col style={{ width: '250px' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '3rem' }} />
                <col style={{ width: '5rem' }} />
                <col style={{ width: '5rem' }} />
                <col style={{ width: '5rem' }} />
                <col style={{ width: '5rem' }} />
                <col style={{ width: '20rem' }} />
                <col />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  <th className="py-1.5 px-1 font-medium text-left">System</th>
                  <th className="py-1.5 px-1 font-medium text-left border-l border-slate-200 dark:border-slate-600" title="Primary star type">Star</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Bodies in system">Bodies</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Earth-Like World">ELW</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Terraformable Water World">TWW</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Terraformable HMC">THMC</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Ammonia World">AM</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Terraformable Rocky">TR</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Water World">WW</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="First discovered count">FD</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Current scan value from your scans">Current</th>
                  <th className="py-1.5 px-1 font-medium text-left" title="Max value if full FSS + DSS">Max</th>
                  <th className="py-1.5 px-1 font-medium text-left whitespace-nowrap border-l border-slate-200 dark:border-slate-600">Jump</th>
                  <th className="py-1.5 px-1 font-medium text-left whitespace-nowrap">Fuel</th>
                  <th className="py-1.5 px-1 font-medium text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {runningTotals.map((entry, index) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedSystemId(entry.systemId)}
                    className={`border-b border-slate-100 dark:border-slate-700/50 hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-1 px-1 font-medium text-slate-800 dark:text-slate-100 max-w-0 truncate text-left" title={entry.systemName}>
                      <span className="inline-flex items-center gap-1 min-w-0">
                        <span className="truncate">{entry.systemName}</span>
                        <svg className="w-3 h-3 flex-shrink-0 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </span>
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left border-l border-slate-200 dark:border-slate-600" title={entry.primaryStarType ?? undefined}>
                      {formatStarType(entry.primaryStarType)}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.bodyCount != null ? entry.bodyCount : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.highValueBodies.elw > 0 ? entry.highValueBodies.elw : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.highValueBodies.tww > 0 ? entry.highValueBodies.tww : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.highValueBodies.thmc > 0 ? entry.highValueBodies.thmc : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.highValueBodies.ammonia > 0 ? entry.highValueBodies.ammonia : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.highValueBodies.trocky > 0 ? entry.highValueBodies.trocky : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.highValueBodies.ww > 0 ? entry.highValueBodies.ww : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.firstDiscovered > 0 ? entry.firstDiscovered : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.totalValue > 0 ? formatCredits(entry.totalValue) : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                      {entry.estimatedDssValue > 0 ? formatCredits(entry.estimatedDssValue) : '—'}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left whitespace-nowrap border-l border-slate-200 dark:border-slate-600">
                      {formatDistance(entry.jumpDistance)}
                    </td>
                    <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left whitespace-nowrap">
                      {formatFuel(entry.fuelUsed)}
                    </td>
                    <td className="py-1 px-1 text-slate-500 dark:text-slate-400 text-sm text-left">
                      {formatTimestamp(entry.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing {currentPage * ITEMS_PER_PAGE + 1}–{Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} entries
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                title="First page"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                title="Previous page"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-300 px-2">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                title="Next page"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
                title="Last page"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* System Detail Modal */}
      {selectedSystemId !== null && (
        <SystemDetailModal
          systemId={selectedSystemId}
          onClose={() => setSelectedSystemId(null)}
          onLoadInExplorer={(system) => {
            setCurrentSystem(system);
            setCurrentView('explorer');
            setSelectedSystemId(null);
          }}
        />
      )}
    </div>
  );
}

export default RouteHistory;
