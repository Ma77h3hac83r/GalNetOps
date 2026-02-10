/** Filter panel: search, date range, session dropdown, clear. */
import type { RouteHistoryFilter, RouteSession } from '@shared/types';
import { formatSessionLabel } from './formatters';

interface RouteHistoryFiltersProps {
  filter: RouteHistoryFilter;
  searchInput: string;
  setSearchInput: (v: string) => void;
  updateFilter: (updates: Partial<RouteHistoryFilter>) => void;
  sessions: RouteSession[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

export function RouteHistoryFilters({
  filter,
  searchInput,
  setSearchInput,
  updateFilter,
  sessions,
  hasActiveFilters,
  clearFilters,
}: RouteHistoryFiltersProps) {
  return (
    <div className="card p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                type="button"
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

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            From Date
          </label>
          <input
            type="date"
            value={filter.dateFrom ?? ''}
            onChange={(e) => updateFilter({ dateFrom: e.target.value || '' })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            To Date
          </label>
          <input
            type="date"
            value={filter.dateTo ?? ''}
            onChange={(e) => updateFilter({ dateTo: e.target.value || '' })}
            className="input"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Session
          </label>
          <select
            value={filter.sessionId ?? ''}
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

      {hasActiveFilters && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
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
  );
}
