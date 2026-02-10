/** Filters bar: search, region, sort, first-discoveries toggle, clear. */
import type { SortMode } from './types';

interface CodexFiltersProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  selectedRegion: string;
  onRegionChange: (value: string) => void;
  regions: string[];
  sortMode: SortMode;
  onSortModeChange: (value: SortMode) => void;
  showNewOnly: boolean;
  onShowNewOnlyChange: (value: boolean) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function CodexFilters({
  searchQuery,
  onSearchQueryChange,
  selectedRegion,
  onRegionChange,
  regions,
  sortMode,
  onSortModeChange,
  showNewOnly,
  onShowNewOnlyChange,
  onClearFilters,
  hasActiveFilters,
}: CodexFiltersProps) {
  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              placeholder="Search entries..."
              className="input pl-10 w-full"
            />
          </div>
        </div>

        <select
          value={selectedRegion}
          onChange={(e) => onRegionChange(e.target.value)}
          className="input min-w-[180px]"
        >
          <option value="">All Regions</option>
          {regions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label
            htmlFor="codex-sort"
            className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap"
          >
            Sort
          </label>
          <select
            id="codex-sort"
            value={sortMode}
            onChange={(e) => onSortModeChange(e.target.value as SortMode)}
            className="input min-w-[140px]"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="value_desc">Highest Value</option>
            <option value="name_asc">Name (A–Z)</option>
          </select>
        </div>

        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showNewOnly}
            onChange={(e) => onShowNewOnlyChange(e.target.checked)}
            className="w-4 h-4 text-orange-500 rounded border-slate-300 dark:border-slate-600 focus:ring-orange-500"
          />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            First Discoveries Only
          </span>
        </label>

        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
