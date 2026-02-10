/** Commander panel: ranks with progress bars, reputation levels, powerplay info. */
import { useCommanderInfo } from '../../stores/appStore';
import { getRankName, getReputationLevel, getPowerplayRating } from '@shared/rankNames';

/** Progress bar color based on rank category. */
function rankBarColor(rankKey: string): string {
  switch (rankKey) {
    case 'explore': return 'bg-cyan-500';
    case 'exobiologist': return 'bg-emerald-500';
    case 'trade': return 'bg-amber-500';
    case 'combat': return 'bg-red-500';
    case 'soldier': return 'bg-orange-500';
    case 'cqc': return 'bg-violet-500';
    case 'federation': return 'bg-blue-500';
    case 'empire': return 'bg-purple-500';
    default: return 'bg-slate-500';
  }
}

/** Icon background color for rank category. */
function rankIconBg(rankKey: string): string {
  switch (rankKey) {
    case 'explore': return 'bg-cyan-100 dark:bg-cyan-900/30';
    case 'exobiologist': return 'bg-emerald-100 dark:bg-emerald-900/30';
    case 'trade': return 'bg-amber-100 dark:bg-amber-900/30';
    case 'combat': return 'bg-red-100 dark:bg-red-900/30';
    case 'soldier': return 'bg-orange-100 dark:bg-orange-900/30';
    case 'cqc': return 'bg-violet-100 dark:bg-violet-900/30';
    case 'federation': return 'bg-blue-100 dark:bg-blue-900/30';
    case 'empire': return 'bg-purple-100 dark:bg-purple-900/30';
    default: return 'bg-slate-100 dark:bg-slate-900/30';
  }
}

/** Color class for a reputation level. */
function reputationColor(level: string): string {
  switch (level) {
    case 'Allied': return 'text-cyan-500 dark:text-cyan-400';
    case 'Friendly': return 'text-green-500 dark:text-green-400';
    case 'Cordial': return 'text-lime-500 dark:text-lime-400';
    case 'Neutral': return 'text-yellow-500 dark:text-yellow-400';
    case 'Unfriendly': return 'text-orange-500 dark:text-orange-400';
    case 'Hostile': return 'text-red-500 dark:text-red-400';
    default: return 'text-slate-400 dark:text-slate-500';
  }
}

/** Reputation bar color. */
function reputationBarColor(level: string): string {
  switch (level) {
    case 'Allied': return 'bg-cyan-500';
    case 'Friendly': return 'bg-green-500';
    case 'Cordial': return 'bg-lime-500';
    case 'Neutral': return 'bg-yellow-500';
    case 'Unfriendly': return 'bg-orange-500';
    case 'Hostile': return 'bg-red-500';
    default: return 'bg-slate-500';
  }
}

type RankKey = 'combat' | 'trade' | 'explore' | 'soldier' | 'exobiologist' | 'empire' | 'federation' | 'cqc';

const RANK_DISPLAY: { key: RankKey; label: string }[] = [
  { key: 'explore', label: 'Explorer' },
  { key: 'exobiologist', label: 'Exobiologist' },
  { key: 'trade', label: 'Trade' },
  { key: 'combat', label: 'Combat' },
  { key: 'soldier', label: 'Mercenary' },
  { key: 'cqc', label: 'CQC' },
];

const SUPERPOWER_DISPLAY: { key: 'federation' | 'empire'; label: string }[] = [
  { key: 'federation', label: 'Federation' },
  { key: 'empire', label: 'Empire' },
];

const REPUTATION_DISPLAY: { key: 'federation' | 'empire' | 'alliance' | 'independent'; label: string }[] = [
  { key: 'federation', label: 'Federation' },
  { key: 'empire', label: 'Empire' },
  { key: 'alliance', label: 'Alliance' },
  { key: 'independent', label: 'Independent' },
];

interface StatisticsCommanderPanelProps {
  formatCredits: (credits: number) => string;
}

export function StatisticsCommanderPanel({ formatCredits }: StatisticsCommanderPanelProps) {
  const cmdr = useCommanderInfo();

  if (!cmdr?.name) {
    return (
      <div className="card">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Commander</h2>
          </div>
        </div>
        <div className="p-6 text-center text-slate-500 dark:text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <p>No commander data available</p>
          <p className="text-sm mt-1">Load a game session to see commander stats</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              CMDR {cmdr.name}
            </h2>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatCredits(cmdr.credits)}
            </div>
            {cmdr.loan > 0 && (
              <div className="text-xs text-red-500 dark:text-red-400">
                Loan: {formatCredits(cmdr.loan)}
              </div>
            )}
          </div>
        </div>
        {cmdr.ship && (
          <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500 dark:text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="font-medium text-slate-600 dark:text-slate-300">{cmdr.ship}</span>
            {cmdr.shipName && (
              <>
                <span className="text-slate-300 dark:text-slate-600">-</span>
                <span className="italic">{cmdr.shipName}</span>
              </>
            )}
            {cmdr.shipIdent && (
              <span className="text-slate-400 dark:text-slate-500">[{cmdr.shipIdent}]</span>
            )}
          </div>
        )}
      </div>

      {/* Ranks */}
      {cmdr.ranks && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Ranks
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RANK_DISPLAY.map(({ key, label }) => {
              const level = cmdr.ranks![key];
              const name = getRankName(key, level);
              const prog = cmdr.progress?.[key] ?? 0;
              const isElite = name.startsWith('Elite');

              return (
                <div key={key} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${rankIconBg(key)}`}>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {label.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
                      {!isElite && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">{prog}%</span>
                      )}
                    </div>
                    <div className={`text-sm font-medium truncate ${isElite ? 'text-amber-500 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {name}
                    </div>
                    {!isElite && (
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${rankBarColor(key)}`}
                          style={{ width: `${Math.min(prog, 100)}%` }}
                        />
                      </div>
                    )}
                    {isElite && (
                      <div className="h-1.5 bg-amber-200 dark:bg-amber-900/50 rounded-full overflow-hidden mt-1">
                        <div className="h-full rounded-full bg-amber-500 dark:bg-amber-400" style={{ width: '100%' }} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Superpower Ranks (Federation / Empire) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {SUPERPOWER_DISPLAY.map(({ key, label }) => {
              const level = cmdr.ranks![key];
              const name = getRankName(key, level);
              const prog = cmdr.progress?.[key] ?? 0;
              const isNone = name === 'None';

              return (
                <div key={key} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${rankIconBg(key)}`}>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      {label.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
                      {!isNone && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">{prog}%</span>
                      )}
                    </div>
                    <div className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">
                      {name}
                    </div>
                    {!isNone && (
                      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${rankBarColor(key)}`}
                          style={{ width: `${Math.min(prog, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reputation */}
      {cmdr.reputation && (
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Reputation
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {REPUTATION_DISPLAY.map(({ key, label }) => {
              const value = cmdr.reputation![key];
              const level = getReputationLevel(value);
              // Normalize -100..100 to 0..100 for progress bar
              const normalized = (value + 100) / 2;

              return (
                <div key={key} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
                  <div className={`text-sm font-semibold mt-0.5 ${reputationColor(level)}`}>{level}</div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${reputationBarColor(level)}`}
                      style={{ width: `${Math.min(Math.max(normalized, 0), 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 tabular-nums">{value.toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Powerplay */}
      {cmdr.powerplay && (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-3">
            Powerplay
          </h3>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/50">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-purple-700 dark:text-purple-300">{cmdr.powerplay.power}</div>
              <div className="text-sm text-purple-600 dark:text-purple-400">
                {getPowerplayRating(cmdr.powerplay.rank)}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-medium text-purple-700 dark:text-purple-300 tabular-nums">
                {cmdr.powerplay.merits.toLocaleString()}
              </div>
              <div className="text-xs text-purple-500 dark:text-purple-400">merits</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
