/** Statistics page: overview, commander, rare finds, body type chart. */
import { useStatisticsData } from './useStatisticsData';
import { StatisticsOverviewCards } from './StatisticsOverviewCards';
import { StatisticsCommanderPanel } from './StatisticsCommanderPanel';
import { StatisticsRareFinds } from './StatisticsRareFinds';
import { StatisticsBodyTypeChart } from './StatisticsBodyTypeChart';

export function Statistics() {
  const data = useStatisticsData();

  const {
    stats,
    isLoading,
    error,
    sanitizedBodyDist,
    rareCounts,
    showBodyTable,
    setShowBodyTable,
    getNextMilestone,
    getPrevMilestone,
    formatNumber,
    formatCredits,
    pieTooltipFormatter,
    pieLabelRenderer,
  } = data;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <svg
            className="w-12 h-12 mx-auto mb-2 opacity-50"
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
          <p>{error ?? 'Unable to load statistics'}</p>
        </div>
      </div>
    );
  }

  const discoveryRate =
    stats.totalBodies > 0 ? ((stats.firstDiscoveries / stats.totalBodies) * 100).toFixed(1) : '0';
  const mappingRate =
    stats.totalBodies > 0 ? ((stats.firstMapped / stats.totalBodies) * 100).toFixed(1) : '0';

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4">
      <div className="shrink-0 px-4 py-2 mb-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">Work In Progress</p>
      </div>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Exploration Statistics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Your exploration progress at a glance
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6 mb-6">
        <StatisticsOverviewCards
          stats={stats}
          discoveryRate={discoveryRate}
          mappingRate={mappingRate}
          formatNumber={formatNumber}
          formatCredits={formatCredits}
        />
        <StatisticsBodyTypeChart
          sanitizedBodyDist={sanitizedBodyDist}
          showBodyTable={showBodyTable}
          setShowBodyTable={setShowBodyTable}
          formatNumber={formatNumber}
          formatCredits={formatCredits}
          pieTooltipFormatter={pieTooltipFormatter}
          pieLabelRenderer={pieLabelRenderer}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <StatisticsCommanderPanel formatCredits={formatCredits} />
        <StatisticsRareFinds
          rareCounts={rareCounts}
          formatNumber={formatNumber}
          getNextMilestone={getNextMilestone}
          getPrevMilestone={getPrevMilestone}
        />
      </div>
    </div>
  );
}
