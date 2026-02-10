/** Route History page: paginated table, filters, export, system detail modal. */
import { useAppStore } from '../../stores/appStore';
import SystemDetailModal from '../../components/SystemDetailModal';
import { useRouteHistoryData } from './useRouteHistoryData';
import { RouteHistoryHeader } from './RouteHistoryHeader';
import { RouteHistoryFilters } from './RouteHistoryFilters';
import { RouteHistorySummaryCards } from './RouteHistorySummaryCards';
import { RouteHistoryTable } from './RouteHistoryTable';

export function RouteHistory() {
  const setCurrentSystem = useAppStore((s) => s.setCurrentSystem);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  const data = useRouteHistoryData();

  const {
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
  } = data;

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <div className="mb-4">
        <RouteHistoryHeader
          showExportMenu={showExportMenu}
          setShowExportMenu={setShowExportMenu}
          isExporting={isExporting}
          totalCount={totalCount}
          exportToCSV={exportToCSV}
          exportToJSON={exportToJSON}
          copySystemNames={copySystemNames}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          hasActiveFilters={hasActiveFilters}
          filter={filter}
        />

        {showFilters && (
          <RouteHistoryFilters
            filter={filter}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            updateFilter={updateFilter}
            sessions={sessions}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
          />
        )}

        <RouteHistorySummaryCards
          totalCount={totalCount}
          totals={totals}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      <RouteHistoryTable
        runningTotals={runningTotals}
        isLoading={isLoading}
        hasActiveFilters={hasActiveFilters}
        onRowClick={setSelectedSystemId}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />

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
