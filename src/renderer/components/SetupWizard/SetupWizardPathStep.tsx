/** Setup Wizard step 1: journal folder path selection and validation. */
import type { JournalValidationResult } from '../../../shared/types';
import { DEFAULT_JOURNAL_PATH } from './constants';
import { formatDate, formatFileSize } from './formatters';

interface SetupWizardPathStepProps {
  manualPath: string;
  onPathChange: (path: string) => void;
  isChecking: boolean;
  validationResult: JournalValidationResult | null;
  detectedPaths: string[];
  isDetecting: boolean;
  onValidate: () => void;
  onBrowse: () => void;
  onSubmit: () => void;
  onSelectDetectedPath: (path: string) => void;
}

export function SetupWizardPathStep({
  manualPath,
  onPathChange,
  isChecking,
  validationResult,
  detectedPaths,
  isDetecting,
  onValidate,
  onBrowse,
  onSubmit,
  onSelectDetectedPath,
}: SetupWizardPathStepProps) {
  return (
    <>
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Journal Folder Location
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          GalNetOps needs to know where Elite Dangerous stores its journal files.
          This is typically:
        </p>

        <code className="block p-3 bg-slate-100 dark:bg-slate-700 rounded text-sm text-slate-700 dark:text-slate-300 mb-4 break-all">
          {DEFAULT_JOURNAL_PATH}
        </code>

        {!isDetecting && detectedPaths.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <svg
                className="w-4 h-4 inline-block mr-1 text-green-500"
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
              Detected Elite Dangerous installation
              {detectedPaths.length > 1 ? 's' : ''}:
            </p>
            <div className="space-y-2">
              {detectedPaths.map((path, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => onSelectDetectedPath(path)}
                  className={`w-full text-left p-2 rounded border text-sm transition-colors ${
                    manualPath === path
                      ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20 text-accent-700 dark:text-accent-300'
                      : 'border-slate-200 dark:border-slate-600 hover:border-accent-300 dark:hover:border-accent-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {path}
                </button>
              ))}
            </div>
          </div>
        )}

        {isDetecting && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-accent-500"
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
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Detecting Elite Dangerous installation...
            </span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="journalPath"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Journal Folder Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="journalPath"
                value={manualPath}
                onChange={(e) => onPathChange(e.target.value)}
                onBlur={onValidate}
                placeholder={DEFAULT_JOURNAL_PATH}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={onBrowse}
                className="btn btn-secondary"
                title="Browse for folder"
                aria-label="Browse for folder"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {validationResult && (
            <div className="space-y-2">
              {validationResult.errors.length > 0 && (
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
                    <div>
                      {validationResult.errors.map((error, i) => (
                        <p
                          key={i}
                          className="text-sm text-red-600 dark:text-red-400"
                        >
                          {error}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5"
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
                    <div>
                      {validationResult.warnings.map((warning, i) => (
                        <p
                          key={i}
                          className="text-sm text-yellow-700 dark:text-yellow-400"
                        >
                          {warning}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {validationResult.isValid && validationResult.errors.length === 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
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
                      <p className="font-medium">Valid journal folder found!</p>
                      <p className="text-green-600 dark:text-green-500 mt-1">
                        {validationResult.journalCount} journal file
                        {validationResult.journalCount !== 1 ? 's' : ''} found
                      </p>
                      {validationResult.latestJournalDate && (
                        <p className="text-green-600 dark:text-green-500">
                          Latest:{' '}
                          {formatDate(validationResult.latestJournalDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {validationResult.isValid &&
                validationResult.recentJournals &&
                validationResult.recentJournals.length > 0 && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      Recent Journal Files
                    </p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {validationResult.recentJournals.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white dark:bg-slate-700/50"
                        >
                          <span className="text-slate-600 dark:text-slate-300 truncate font-mono">
                            {file.name}
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 ml-2 flex-shrink-0">
                            {formatFileSize(file.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}

          <button
            type="button"
            onClick={onSubmit}
            disabled={
              isChecking || (validationResult?.errors?.length ?? 0) > 0
            }
            className="btn btn-primary w-full"
          >
            {isChecking ? (
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
                Validating...
              </>
            ) : validationResult?.warnings?.length && !validationResult?.isValid ? (
              'Continue Anyway'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-4">
        You can change this later in Settings
      </p>
    </>
  );
}
