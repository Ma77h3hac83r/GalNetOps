/**
 * Data Management section: backfill, database info, backup, import, clear data.
 */
import type { SettingsState } from './useSettingsState';
import { formatFileSize } from './utils';

export interface SettingsDataSectionProps {
  state: SettingsState;
}

export function SettingsDataSection({ state }: SettingsDataSectionProps) {
  const {
    dbInfo,
    isLoadingDbInfo,
    showClearConfirm,
    setShowClearConfirm,
    isClearing,
    clearError,
    backupResult,
    isBackingUp,
    importValidation,
    isImporting,
    importError,
    handleClearData,
    handleBackup,
    handleSelectImportFile,
    handleImport,
    handleCancelImport,
    dismissClearConfirm,
    isBackfilling,
    backfillProgress,
    backfillResult,
    handleStartBackfill,
    handleCancelBackfill,
  } = state;

  return (
    <section className="card p-6" key="data">
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
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
          />
        </svg>
        Data Management
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Manage your exploration database
      </p>

      <div className="space-y-4">
        {/* Import Journal History */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Import Journal History
              </h3>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                Import your exploration history from past journal files. This will scan all journal
                files and populate the database with systems, bodies, and route history.
              </p>

              {isBackfilling && backfillProgress && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400">
                    <span>Processing: {backfillProgress.currentFile}</span>
                    <span>{backfillProgress.percentage}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${backfillProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-500">
                    File {backfillProgress.progress} of {backfillProgress.total}
                  </p>
                </div>
              )}

              {backfillResult && !isBackfilling && (
                <div
                  className={`mt-3 p-2 rounded text-xs ${
                    backfillResult.error
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                      : backfillResult.cancelled
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  }`}
                >
                  {backfillResult.error
                    ? backfillResult.error
                    : backfillResult.cancelled
                      ? `Cancelled. Processed ${backfillResult.filesProcessed} of ${backfillResult.totalFiles} files.`
                      : `Complete! Processed ${backfillResult.filesProcessed} journal files.`}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {isBackfilling ? (
                  <button
                    onClick={handleCancelBackfill}
                    className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={handleStartBackfill}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <svg
                      className="w-4 h-4 inline mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Import History
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Database Info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Database Information
          </h3>
          {isLoadingDbInfo ? (
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
          ) : dbInfo ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">File Size</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {formatFileSize(dbInfo.size)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Systems</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {dbInfo.systemCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Bodies</p>
                <p className="font-medium text-slate-700 dark:text-slate-300">
                  {dbInfo.bodyCount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Location</p>
                <p
                  className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate"
                  title={dbInfo.path}
                >
                  {dbInfo.path}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Unable to load database info</p>
          )}
        </div>

        {/* Backup */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Backup Database
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export your exploration data to a backup file
            </p>
          </div>
          <button
            onClick={handleBackup}
            disabled={isBackingUp}
            className="btn btn-secondary text-sm"
          >
            {isBackingUp ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
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
                Backing up...
              </>
            ) : (
              <>
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                Backup
              </>
            )}
          </button>
        </div>

        {backupResult && (
          <div
            className={`p-3 rounded-lg ${
              backupResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-start gap-2">
              {backupResult.success ? (
                <>
                  <svg
                    className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-green-700 dark:text-green-400">
                    <p className="font-medium">Backup created successfully</p>
                    <p className="text-xs mt-0.5 font-mono truncate">{backupResult.path}</p>
                  </div>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
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
                  <p className="text-sm text-red-600 dark:text-red-400">{backupResult.error}</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Import */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Import Database
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Restore from a backup file (replaces current data)
              </p>
            </div>
            {!importValidation && (
              <button onClick={handleSelectImportFile} className="btn btn-secondary text-sm">
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Select File
              </button>
            )}
          </div>

          {importValidation && (
            <div className="space-y-3">
              {importValidation.valid ? (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
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
                    <div className="text-sm text-blue-700 dark:text-blue-400">
                      <p className="font-medium">Ready to import</p>
                      <p className="text-xs mt-1">
                        {importValidation.systemCount?.toLocaleString()} systems,{' '}
                        {importValidation.bodyCount?.toLocaleString()} bodies
                      </p>
                      <p className="text-xs font-mono truncate mt-0.5">{importValidation.path}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
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
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {importValidation.error}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelImport}
                  className="btn btn-secondary text-sm"
                  disabled={isImporting}
                >
                  Cancel
                </button>
                {importValidation.valid && (
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="btn btn-primary text-sm"
                  >
                    {isImporting ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
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
                        Importing...
                      </>
                    ) : (
                      'Import'
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {importError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
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
                <p className="text-sm text-red-600 dark:text-red-400">{importError}</p>
              </div>
            </div>
          )}
        </div>

        {/* Clear Data */}
        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Clear Exploration Data
              </p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                Permanently delete all systems, bodies, and route history
              </p>
            </div>
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              Clear Data
            </button>
          </div>
        </div>

        {/* Clear Confirmation Dialog */}
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div
              className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="clear-dialog-title"
              aria-describedby="clear-dialog-desc"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0"
                  aria-hidden
                >
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3
                  id="clear-dialog-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white"
                >
                  Clear All Exploration Data?
                </h3>
              </div>

              <div id="clear-dialog-desc">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-slate-600 dark:text-slate-400 list-disc list-inside mb-4 space-y-1">
                  <li>{dbInfo?.systemCount.toLocaleString() || 0} systems visited</li>
                  <li>{dbInfo?.bodyCount.toLocaleString() || 0} bodies scanned</li>
                  <li>All biological scan data</li>
                  <li>All route history</li>
                </ul>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-4">
                  This action cannot be undone. Consider creating a backup first.
                </p>
              </div>

              {clearError && (
                <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{clearError}</p>
                </div>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={dismissClearConfirm}
                  disabled={isClearing}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearData}
                  disabled={isClearing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isClearing ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 inline"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
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
                      Clearing...
                    </>
                  ) : (
                    'Yes, Clear All Data'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
