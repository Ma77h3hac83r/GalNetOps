/**
 * About section: app info, GitHub/Issues links, credits, system information.
 */
import type { SettingsState } from './useSettingsState';

export interface SettingsAboutSectionProps {
  state: SettingsState;
}

export function SettingsAboutSection({ state }: SettingsAboutSectionProps) {
  const { appInfo } = state;

  return (
    <section className="card p-6">
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
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        About
      </h2>
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="w-16 h-16 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-8 h-8 text-accent-600 dark:text-accent-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">GalNetOps</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Elite Dangerous Exploration Companion
            </p>
            <p className="text-sm font-medium text-accent-600 dark:text-accent-400 mt-1">
              Version {appInfo?.version || '...'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() =>
              window.electron.openExternal('https://github.com/Ma77h3hac83r/GalNetOps')
            }
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-600 dark:text-slate-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              />
            </svg>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">GitHub</span>
          </button>
          <button
            onClick={() =>
              window.electron.openExternal('https://github.com/Ma77h3hac83r/GalNetOps/issues')
            }
            className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-600 dark:text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Report Issue
            </span>
          </button>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Credits & Acknowledgments
          </h3>
          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
            <p>Built with Electron, React, and TypeScript.</p>
            <p>Elite Dangerous is a trademark of Frontier Developments.</p>
            <p>This application is not affiliated with Frontier Developments or Elite Dangerous.</p>
            <p>Thanks to the Elite Dangerous community for documentation and resources.</p>
          </div>
        </div>
        <details className="group">
          <summary className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              System Information
            </span>
            <svg
              className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            {appInfo ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Electron</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300">
                    {appInfo.electronVersion}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Node.js</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300">
                    {appInfo.nodeVersion}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Chrome</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300">
                    {appInfo.chromeVersion}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Platform</p>
                  <p className="font-mono text-slate-700 dark:text-slate-300">
                    {appInfo.platform} ({appInfo.arch})
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading...</p>
            )}
          </div>
        </details>
      </div>
    </section>
  );
}
