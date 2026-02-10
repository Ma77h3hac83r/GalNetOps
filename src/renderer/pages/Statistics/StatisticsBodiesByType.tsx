/** Bodies by type: categorized list with body type icons. */
import type { Statistics as StatisticsData } from '@shared/types';
import { BODY_CATEGORIES, RARE_BODY_TYPES } from './constants';
import { BodyTypeIcon } from './BodyTypeIcon';

interface StatisticsBodiesByTypeProps {
  stats: StatisticsData;
  categorizedBodies: Record<string, { type: string; count: number }[]> | null;
  formatNumber: (num: number) => string;
}

export function StatisticsBodiesByType({
  stats,
  categorizedBodies,
  formatNumber,
}: StatisticsBodiesByTypeProps) {
  if (Object.keys(stats.bodiesByType).length === 0) {
    return (
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Bodies by Type</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Breakdown of all scanned celestial bodies by category
          </p>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>No bodies scanned yet</p>
              <p className="text-sm">Explore systems to see body statistics</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex-1 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Bodies by Type</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Breakdown of all scanned celestial bodies by category
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-6">
          {categorizedBodies &&
            Object.entries(categorizedBodies).map(([category, bodies]) => {
              if (bodies.length === 0) {
                return null;
              }

              const categoryDef = BODY_CATEGORIES.find((c) => c.label === category);
              const categoryTotal = bodies.reduce((sum, b) => sum + b.count, 0);

              return (
                <div key={category}>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${categoryDef?.color ?? 'bg-slate-400'}`} />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                      {category}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      ({formatNumber(categoryTotal)} total)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                    {bodies.map(({ type, count }) => {
                      const isRare = RARE_BODY_TYPES.some((r) =>
                        r.matches.some((m) => type.toLowerCase().includes(m))
                      );

                      return (
                        <div
                          key={type}
                          className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                            isRare
                              ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50'
                              : 'bg-slate-50 dark:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <BodyTypeIcon type={type} />
                            <span
                              className={`text-sm truncate ${
                                isRare
                                  ? 'text-amber-800 dark:text-amber-200 font-medium'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                              title={type}
                            >
                              {type}
                            </span>
                            {isRare && (
                              <svg
                                className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-sm font-medium ml-2 flex-shrink-0 ${
                              isRare ? 'text-amber-700 dark:text-amber-300' : 'text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {formatNumber(count)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
