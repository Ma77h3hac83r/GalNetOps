/** Codex page: list of Codex entries from DB with filters and expandable subcategories. */
import { useCodexData } from './useCodexData';
import { CodexStatsCards } from './CodexStatsCards';
import { CodexCategoryBreakdown } from './CodexCategoryBreakdown';
import { CodexFilters } from './CodexFilters';
import { CodexEntriesList } from './CodexEntriesList';
import { CodexRegionStats } from './CodexRegionStats';

export function Codex() {
  const {
    entries,
    stats,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    selectedRegion,
    setSelectedRegion,
    showNewOnly,
    setShowNewOnly,
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    categories,
    regions,
    filteredEntries,
    groupedEntries,
    expandedSubcategories,
    toggleSubcategory,
    getCategoryConfig,
    clearFilters,
    hasActiveFilters,
  } = useCodexData();

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="card p-8 text-center">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">{error}</h3>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="shrink-0 px-4 py-2 mb-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Work In Progress</p>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Codex</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your personal discovery log of unique phenomena across the galaxy
          </p>
        </div>

        {stats && <CodexStatsCards stats={stats} />}

        {stats && (
          <CodexCategoryBreakdown
            stats={stats}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            getCategoryConfig={getCategoryConfig}
          />
        )}

        <CodexFilters
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          regions={regions}
          sortMode={sortMode}
          onSortModeChange={setSortMode}
          showNewOnly={showNewOnly}
          onShowNewOnlyChange={setShowNewOnly}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <CodexEntriesList
          entries={entries}
          filteredEntries={filteredEntries}
          groupedEntries={groupedEntries}
          expandedSubcategories={expandedSubcategories}
          onToggleSubcategory={toggleSubcategory}
          getCategoryConfig={getCategoryConfig}
        />

        {stats && (
          <CodexRegionStats
            stats={stats}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />
        )}
      </div>
    </div>
  );
}
