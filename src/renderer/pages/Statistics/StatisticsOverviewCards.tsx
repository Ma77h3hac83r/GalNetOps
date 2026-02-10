/** Main stats grid: systems, bodies, value, first discoveries, first mapped, species. */
import type { Statistics as StatisticsData } from '@shared/types';

interface StatisticsOverviewCardsProps {
  stats: StatisticsData;
  discoveryRate: string;
  mappingRate: string;
  formatNumber: (num: number) => string;
  formatCredits: (credits: number) => string;
}

export function StatisticsOverviewCards({
  stats,
  discoveryRate,
  mappingRate,
  formatNumber,
  formatCredits,
}: StatisticsOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Systems Visited</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {formatNumber(stats.totalSystems)}
            </div>
          </div>
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Bodies Scanned</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {formatNumber(stats.totalBodies)}
            </div>
          </div>
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Total Scan Value</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCredits(stats.totalValue)}
            </div>
          </div>
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">First Discoveries</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatNumber(stats.firstDiscoveries)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{discoveryRate}% of scanned bodies</div>
          </div>
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">First Mapped</div>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
              {formatNumber(stats.firstMapped)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{mappingRate}% of scanned bodies</div>
          </div>
          <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
            <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Species Scanned</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatNumber(stats.biologicalsScanned)}
            </div>
          </div>
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
