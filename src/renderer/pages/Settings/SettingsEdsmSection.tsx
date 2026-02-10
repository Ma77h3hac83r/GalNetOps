/**
 * EDSM section: spoiler-free toggle, cache stats, clear cache, link to EDSM.
 */
import type { SettingsState } from './useSettingsState';
import { formatFileSize } from './utils';

export interface SettingsEdsmSectionProps {
  state: SettingsState;
}

export function SettingsEdsmSection({ state }: SettingsEdsmSectionProps) {
  const {
    edsmSpoilerFree,
    setEdsmSpoilerFree,
    edsmCacheStats,
    isLoadingEdsmCache,
    isClearingEdsmCache,
    handleClearEdsmCache,
  } = state;

  return (
    <section className="card p-6" key="edsm">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        EDSM Integration
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Configure Elite Dangerous Star Map (EDSM) integration
      </p>

      <div className="space-y-4">
        <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={edsmSpoilerFree}
              onChange={(e) => setEdsmSpoilerFree(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 dark:peer-focus:ring-accent-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-accent-600"></div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Spoiler-free mode
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              When enabled, EDSM data only shows body count without revealing body types. Discover
              what&apos;s in each system yourself!
            </p>
          </div>
        </label>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">EDSM Cache</h3>
            <button
              onClick={handleClearEdsmCache}
              disabled={isClearingEdsmCache}
              className="text-xs px-2 py-1 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isClearingEdsmCache ? 'Clearing...' : 'Clear Cache'}
            </button>
          </div>

          {isLoadingEdsmCache ? (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm">Loading...</span>
            </div>
          ) : edsmCacheStats ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Memory Cache</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {edsmCacheStats.memoryCacheSize} entries
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Database Cache</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {edsmCacheStats.dbStats?.validEntries ?? 0} entries
                </p>
              </div>
              {edsmCacheStats.dbStats && (
                <>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Cache Size</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {formatFileSize(edsmCacheStats.dbStats.sizeBytes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Expired</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {edsmCacheStats.dbStats.expiredEntries} entries
                    </p>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Unable to load cache stats</p>
          )}

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            EDSM responses are cached for 24 hours to reduce API calls. Clear the cache if you
            need fresh data.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">EDSM Website</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Elite Dangerous Star Map - Community exploration database
            </p>
          </div>
          <button
            onClick={() => window.electron.openExternal('https://www.edsm.net')}
            className="btn btn-secondary text-sm"
          >
            <svg
              className="w-4 h-4 mr-1.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Visit EDSM
          </button>
        </div>
      </div>
    </section>
  );
}
