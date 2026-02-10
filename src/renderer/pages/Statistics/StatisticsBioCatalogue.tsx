/** Exobiology catalogue: genus list with search and expand. */
import type { BiologicalStats } from './types';

interface StatisticsBioCatalogueProps {
  bioStats: BiologicalStats;
  bioSearch: string;
  setBioSearch: (value: string) => void;
  filteredGenera: Array<[string, { total: number; scanned: number; value: number }]>;
  expandedGenera: Set<string>;
  toggleGenus: (genus: string) => void;
  formatNumber: (num: number) => string;
  formatCredits: (credits: number) => string;
}

export function StatisticsBioCatalogue({
  bioStats,
  bioSearch,
  setBioSearch,
  filteredGenera,
  expandedGenera,
  toggleGenus,
  formatNumber,
  formatCredits,
}: StatisticsBioCatalogueProps) {
  return (
    <div className="card mb-6">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Exobiology Catalogue</h2>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatCredits(bioStats.totalValue)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Total exobiology earnings</div>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {formatNumber(bioStats.completedScans)} of {formatNumber(bioStats.totalSpecies)} species fully scanned
        </p>
      </div>

      <div className="p-4 border-b border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {formatNumber(bioStats.totalSpecies)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Species Found</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumber(bioStats.completedScans)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Fully Analysed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {Object.keys(bioStats.genusCounts).length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Genera Discovered</div>
        </div>
      </div>

      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={bioSearch}
            onChange={(e) => setBioSearch(e.target.value)}
            placeholder="Search genus..."
            className="input pl-10"
          />
          {bioSearch && (
            <button
              type="button"
              onClick={() => setBioSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="max-h-80 overflow-auto">
        {filteredGenera.length === 0 ? (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            {bioSearch ? (
              <>
                <p>No genera matching "{bioSearch}"</p>
                <p className="text-sm">Try a different search term</p>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <p>No biological species scanned yet</p>
                <p className="text-sm">Scan organic life forms to see them here</p>
              </>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredGenera.map(([genus, data]) => {
              const scanRate = data.total > 0 ? (data.scanned / data.total) * 100 : 0;
              const isExpanded = expandedGenera.has(genus);

              return (
                <div key={genus} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <button
                    type="button"
                    onClick={() => toggleGenus(genus)}
                    className="w-full p-3 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                          {genus.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-100 truncate">{genus}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {data.scanned}/{data.total} species • {scanRate.toFixed(0)}% complete
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {formatCredits(data.value)}
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pl-14">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${scanRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-right">
                          {scanRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-center">
                          <div className="font-medium text-slate-700 dark:text-slate-300">{data.total}</div>
                          <div className="text-slate-500 dark:text-slate-400">Found</div>
                        </div>
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded p-2 text-center">
                          <div className="font-medium text-emerald-700 dark:text-emerald-300">{data.scanned}</div>
                          <div className="text-emerald-600 dark:text-emerald-400">Analysed</div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-center">
                          <div className="font-medium text-slate-700 dark:text-slate-300">{data.total - data.scanned}</div>
                          <div className="text-slate-500 dark:text-slate-400">Pending</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
