/**
 * Appearance section: theme selector, default icon/text zoom.
 */
import type { SettingsState } from './useSettingsState';

export interface SettingsAppearanceSectionProps {
  state: SettingsState;
}

export function SettingsAppearanceSection({ state }: SettingsAppearanceSectionProps) {
  const {
    theme,
    setTheme,
    defaultIconZoomIndex,
    setDefaultIconZoomIndex,
    defaultTextZoomIndex,
    setDefaultTextZoomIndex,
  } = state;

  return (
    <section className="card p-6" key="appearance">
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
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
        Appearance
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Theme
          </label>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            {(['light', 'dark', 'elite', 'system'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex-1 p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  theme === t
                    ? t === 'elite'
                      ? 'border-orange-500 bg-orange-900/20'
                      : 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                {t === 'light' && (
                  <svg
                    className={`w-6 h-6 ${
                      theme === t ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                )}
                {t === 'dark' && (
                  <svg
                    className={`w-6 h-6 ${
                      theme === t ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
                {t === 'elite' && (
                  <svg
                    className={`w-6 h-6 ${theme === t ? 'text-orange-500' : 'text-slate-400'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                )}
                {t === 'system' && (
                  <svg
                    className={`w-6 h-6 ${
                      theme === t ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400'
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
                <span
                  className={`text-sm font-medium ${
                    theme === t
                      ? t === 'elite'
                        ? 'text-orange-500'
                        : 'text-accent-700 dark:text-accent-300'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t === 'elite' ? 'Elite Dangerous' : t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Default zoom</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Default icon and text zoom when opening the Explorer tab. You can still adjust zoom
            with the +/- controls in the header.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="settings-default-icon-zoom"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Icon zoom
              </label>
              <select
                id="settings-default-icon-zoom"
                value={defaultIconZoomIndex}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 0 && v <= 5) {
                    setDefaultIconZoomIndex(v);
                  }
                }}
                className="input w-full text-sm"
              >
                <option value={0}>50%</option>
                <option value={1}>75%</option>
                <option value={2}>100%</option>
                <option value={3}>125%</option>
                <option value={4}>150%</option>
                <option value={5}>200%</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="settings-default-text-zoom"
                className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1"
              >
                Text zoom
              </label>
              <select
                id="settings-default-text-zoom"
                value={defaultTextZoomIndex}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 0 && v <= 5) {
                    setDefaultTextZoomIndex(v);
                  }
                }}
                className="input w-full text-sm"
              >
                <option value={0}>50%</option>
                <option value={1}>75%</option>
                <option value={2}>100%</option>
                <option value={3}>125%</option>
                <option value={4}>150%</option>
                <option value={5}>200%</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
