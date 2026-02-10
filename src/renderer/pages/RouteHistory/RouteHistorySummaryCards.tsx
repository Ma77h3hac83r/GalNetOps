/** Summary cards: total jumps, distance, fuel. */
import type { RouteHistoryTotals } from './types';
import { formatLargeNumber } from './formatters';

interface RouteHistorySummaryCardsProps {
  totalCount: number;
  totals: RouteHistoryTotals | null;
  hasActiveFilters: boolean;
}

export function RouteHistorySummaryCards({
  totalCount,
  totals,
  hasActiveFilters,
}: RouteHistorySummaryCardsProps) {
  return (
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
          {totals ? `${formatLargeNumber(totals.totalDistance)} ly` : '-'}
        </div>
      </div>
      <div className="card p-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {hasActiveFilters ? 'Filtered Fuel' : 'Total Fuel Used'}
        </div>
        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
          {totals ? `${formatLargeNumber(totals.totalFuel)} t` : '-'}
        </div>
      </div>
    </div>
  );
}
