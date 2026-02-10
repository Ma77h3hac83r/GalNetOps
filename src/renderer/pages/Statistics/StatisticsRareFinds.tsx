/** Rare finds section: ELW, ammonia, water world milestones. */
import { RARE_BODY_TYPES, MILESTONES } from './constants';

interface StatisticsRareFindsProps {
  rareCounts: Record<string, number>;
  formatNumber: (num: number) => string;
  getNextMilestone: (count: number) => number;
  getPrevMilestone: (count: number) => number;
}

export function StatisticsRareFinds({
  rareCounts,
  formatNumber,
  getNextMilestone,
  getPrevMilestone,
}: StatisticsRareFindsProps) {
  return (
    <div className="card">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Rare Finds</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Track your progress toward exploration milestones
        </p>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {RARE_BODY_TYPES.map((rare) => {
          const count = rareCounts[rare.key] ?? 0;
          const nextMilestone = getNextMilestone(count);
          const prevMilestone = getPrevMilestone(count);
          const progress =
            nextMilestone > prevMilestone
              ? ((count - prevMilestone) / (nextMilestone - prevMilestone)) * 100
              : 100;

          return (
            <div key={rare.key} className={`p-4 rounded-lg ${rare.bgColor}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full ${rare.color}`} />
                  <span className="font-medium text-slate-800 dark:text-slate-100">{rare.label}</span>
                </div>
                <span className={`text-2xl font-bold ${rare.textColor}`}>{formatNumber(count)}</span>
              </div>

              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                  <span>Progress to {nextMilestone}</span>
                  <span>
                    {count}/{nextMilestone}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${rare.barColor} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {MILESTONES.filter((m) => m <= Math.max(count, 100)).map((milestone) => (
                    <span
                      key={milestone}
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        count >= milestone
                          ? `${rare.textColor} bg-white/50 dark:bg-black/20 font-medium`
                          : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      {milestone}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
