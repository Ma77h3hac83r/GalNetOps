/** Route history table with running totals and pagination. */
import type { RouteEntry } from '@shared/types';
import { ITEMS_PER_PAGE } from './constants';
import {
  formatDistance,
  formatFuel,
  formatTimestamp,
  formatCredits,
  formatStarType,
} from './formatters';

type RouteEntryWithRunning = RouteEntry & { runningDistance: number; runningFuel: number };

interface RouteHistoryTableProps {
  runningTotals: RouteEntryWithRunning[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  onRowClick: (systemId: number) => void;
  currentPage: number;
  setCurrentPage: (fn: (p: number) => number) => void;
  totalPages: number;
  totalCount: number;
}

export function RouteHistoryTable({
  runningTotals,
  isLoading,
  hasActiveFilters,
  onRowClick,
  currentPage,
  setCurrentPage,
  totalPages,
  totalCount,
}: RouteHistoryTableProps) {
  return (
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
        ) : runningTotals.length === 0 ? (
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
                  onClick={() => onRowClick(entry.systemId)}
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
                    {entry.bodyCount != null ? entry.bodyCount : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.highValueBodies.elw > 0 ? entry.highValueBodies.elw : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.highValueBodies.tww > 0 ? entry.highValueBodies.tww : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.highValueBodies.thmc > 0 ? entry.highValueBodies.thmc : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.highValueBodies.ammonia > 0 ? entry.highValueBodies.ammonia : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.highValueBodies.trocky > 0 ? entry.highValueBodies.trocky : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.highValueBodies.ww > 0 ? entry.highValueBodies.ww : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.firstDiscovered > 0 ? entry.firstDiscovered : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.totalValue > 0 ? formatCredits(entry.totalValue) : '-'}
                  </td>
                  <td className="py-1 px-1 text-slate-600 dark:text-slate-300 text-sm tabular-nums text-left">
                    {entry.estimatedDssValue > 0 ? formatCredits(entry.estimatedDssValue) : '-'}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Showing {currentPage * ITEMS_PER_PAGE + 1}–{Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalCount)} of {totalCount.toLocaleString()} entries
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setCurrentPage(() => 0)}
              disabled={currentPage === 0}
              className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
              title="First page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
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
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 dark:text-slate-300"
              title="Next page"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(() => totalPages - 1)}
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
  );
}
