/** Setup Wizard step 3: completion and start exploring. */
import type { BackfillResult } from './types';

interface SetupWizardCompleteStepProps {
  backfillResult: BackfillResult | null;
  onFinish: () => void;
}

export function SetupWizardCompleteStep({
  backfillResult,
  onFinish,
}: SetupWizardCompleteStepProps) {
  return (
    <div className="card p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Setup Complete!
      </h2>

      {backfillResult && !backfillResult.cancelled ? (
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Your exploration history has been imported.
          </p>
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <p className="font-medium text-slate-900 dark:text-white mb-1">
                Import Summary
              </p>
              <p>{backfillResult.filesProcessed} journal files processed</p>
            </div>
          </div>
        </div>
      ) : backfillResult?.cancelled ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Import was cancelled. You can import your history later from Settings.
        </p>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          GalNetOps is ready to track your exploration. You can import your
          history later from Settings.
        </p>
      )}

      <button type="button" onClick={onFinish} className="btn btn-primary w-full">
        Start Exploring
      </button>
    </div>
  );
}
