/** Setup Wizard step 2: optional import history (backfill) with progress. */
import type { BackfillProgress } from './types';
import type { JournalValidationResult } from '../../../shared/types';

interface SetupWizardBackfillStepProps {
  importHistory: boolean;
  setImportHistory: (v: boolean) => void;
  isBackfilling: boolean;
  backfillProgress: BackfillProgress | null;
  validationResult: JournalValidationResult | null;
  onStartBackfill: () => void;
  onSkipBackfill: () => void;
  onCancelBackfill: () => void;
}

export function SetupWizardBackfillStep({
  importHistory,
  setImportHistory,
  isBackfilling,
  backfillProgress,
  validationResult,
  onStartBackfill,
  onSkipBackfill,
  onCancelBackfill,
}: SetupWizardBackfillStepProps) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Import Exploration History
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        GalNetOps can import your existing exploration data from previous
        journal files. This lets you see your complete exploration history and
        statistics.
      </p>

      {!isBackfilling && (
        <>
          <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors mb-4">
            <input
              type="checkbox"
              checked={importHistory}
              onChange={(e) => setImportHistory(e.target.checked)}
              className="mt-1 w-4 h-4 text-accent-600 border-slate-300 rounded focus:ring-accent-500"
            />
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Import exploration history
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Process {validationResult?.journalCount ?? 0} journal files to
                import your previous discoveries, system visits, and biological
                scans.
              </p>
            </div>
          </label>

          {importHistory && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
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
                <div className="text-xs text-blue-700 dark:text-blue-400">
                  <p className="font-medium">This will import:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li>System discoveries and visits</li>
                    <li>Body scans and mapping data</li>
                    <li>Biological species scans</li>
                    <li>First discovery and first mapped statuses</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSkipBackfill}
              className="btn btn-secondary flex-1"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={importHistory ? onStartBackfill : onSkipBackfill}
              className="btn btn-primary flex-1"
            >
              {importHistory ? 'Start Import' : 'Continue'}
            </button>
          </div>
        </>
      )}

      {isBackfilling && backfillProgress && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Processing journals...
            </span>
            <span className="text-slate-900 dark:text-white font-medium">
              {backfillProgress.percentage}%
            </span>
          </div>

          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div
              className="bg-accent-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${backfillProgress.percentage}%` }}
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>
              File {backfillProgress.progress} of {backfillProgress.total}
            </p>
            <p className="font-mono truncate">{backfillProgress.currentFile}</p>
          </div>

          <button
            type="button"
            onClick={onCancelBackfill}
            className="btn btn-secondary w-full"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Cancel Import
          </button>
        </div>
      )}
    </div>
  );
}
