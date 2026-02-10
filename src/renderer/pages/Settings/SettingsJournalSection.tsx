/**
 * Journal section: path input, browse, validate, save/cancel.
 */
import type { SettingsState } from './useSettingsState';
import { formatDate } from './utils';

export interface SettingsJournalSectionProps {
  state: SettingsState;
}

export function SettingsJournalSection({ state }: SettingsJournalSectionProps) {
  const {
    editPath,
    isEditing,
    isValidating,
    validationResult,
    handleBrowse,
    handleValidate,
    handleSavePath,
    handleCancelEdit,
    handlePathChange,
  } = state;

  return (
    <section className="card p-6" key="journal">
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
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        Journal Folder
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Location of your Elite Dangerous journal files
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="settings-journal-path"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sr-only"
          >
            Journal folder path
          </label>
          <div className="flex gap-2">
            <input
              id="settings-journal-path"
              type="text"
              value={editPath}
              onChange={(e) => handlePathChange(e.target.value)}
              onBlur={() => {
                if (isEditing) {
                  handleValidate();
                }
              }}
              placeholder="%USERPROFILE%\Saved Games\Frontier Developments\Elite Dangerous"
              className="input flex-1 font-mono text-sm"
              aria-describedby={validationResult ? 'settings-journal-validation' : undefined}
            />
            <button
              onClick={handleBrowse}
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
          <div
            id="settings-journal-validation"
            className="space-y-2"
            role="status"
            aria-live="polite"
          >
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
                      <p key={i} className="text-sm text-red-600 dark:text-red-400">
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
                      <p key={i} className="text-sm text-yellow-700 dark:text-yellow-400">
                        {warning}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {validationResult.isValid &&
              validationResult.errors.length === 0 && (
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
                      <p className="font-medium">Valid journal folder!</p>
                      <p className="text-green-600 dark:text-green-500 mt-1">
                        {validationResult.journalCount} journal file
                        {validationResult.journalCount !== 1 ? 's' : ''} found
                      </p>
                      {validationResult.latestJournalDate && (
                        <p className="text-green-600 dark:text-green-500">
                          Latest: {formatDate(validationResult.latestJournalDate)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

        {isEditing && (
          <div className="flex gap-2 justify-end">
            <button onClick={handleCancelEdit} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleSavePath}
              disabled={
                isValidating ||
                !validationResult?.isValid ||
                (validationResult?.errors?.length ?? 0) > 0
              }
              className="btn btn-primary"
            >
              {isValidating ? (
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
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
