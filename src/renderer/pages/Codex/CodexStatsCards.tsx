/** Stats overview cards for the Codex page. */
import type { CodexStats } from './types';
import { formatCredits, formatNumber } from './formatters';

interface CodexStatsCardsProps {
  stats: CodexStats;
}

export function CodexStatsCards({ stats }: CodexStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="card p-4">
        <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
          {formatNumber(stats.totalEntries)}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Unique Discoveries
        </div>
      </div>
      <div className="card p-4">
        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {formatNumber(stats.newEntries)}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          First Discoveries
        </div>
      </div>
      <div className="card p-4">
        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
          {formatCredits(stats.totalVouchers)}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Total Vouchers
        </div>
      </div>
      <div className="card p-4">
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          {Object.keys(stats.byRegion).length}
        </div>
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Regions Visited
        </div>
      </div>
    </div>
  );
}
