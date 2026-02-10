/** Region stats: clickable region chips that filter entries. */
import type { CodexStats } from './types';

interface CodexRegionStatsProps {
  stats: CodexStats;
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}

export function CodexRegionStats({
  stats,
  selectedRegion,
  onSelectRegion,
}: CodexRegionStatsProps) {
  if (Object.keys(stats.byRegion).length === 0) {
    return null;
  }

  return (
    <div className="card p-4 mt-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
        Discoveries by Region
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {Object.entries(stats.byRegion)
          .sort((a, b) => b[1] - a[1])
          .map(([region, count]) => (
            <button
              key={region}
              onClick={() => onSelectRegion(selectedRegion === region ? '' : region)}
              className={`px-3 py-2 rounded-lg text-sm text-left transition-all ${
                selectedRegion === region
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <div className="font-medium truncate">{region}</div>
              <div className="text-xs opacity-75">
                {count} {count === 1 ? 'entry' : 'entries'}
              </div>
            </button>
          ))}
      </div>
    </div>
  );
}
