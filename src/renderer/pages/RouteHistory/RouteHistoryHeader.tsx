/** Route History page header: title, Export dropdown, Filters button. */
import type { RouteHistoryFilter } from '@shared/types';

interface RouteHistoryHeaderProps {
  showExportMenu: boolean;
  setShowExportMenu: (v: boolean) => void;
  isExporting: boolean;
  totalCount: number;
  exportToCSV: () => void;
  exportToJSON: () => void;
  copySystemNames: () => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  hasActiveFilters: boolean;
  filter: RouteHistoryFilter;
}

export function RouteHistoryHeader({
  showExportMenu,
  setShowExportMenu,
  isExporting,
  totalCount,
  exportToCSV,
  exportToJSON,
  copySystemNames,
  showFilters,
  setShowFilters,
  hasActiveFilters,
  filter,
}: RouteHistoryHeaderProps) {
  const activeFilterCount = [
    filter.search,
    filter.dateFrom,
    filter.dateTo,
    filter.sessionId,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Route History</h1>
      <div className="flex items-center space-x-2">
        <div className="relative" data-export-menu>
          <button
            type="button"
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
                type="button"
                onClick={exportToCSV}
                className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export as CSV</span>
              </button>
              <button
                type="button"
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
                type="button"
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

        <button
          type="button"
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
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
