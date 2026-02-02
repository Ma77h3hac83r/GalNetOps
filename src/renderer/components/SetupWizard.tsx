/** First-run wizard: detect or pick journal path, validate folder, optional backfill with progress; persists path and closes on complete. */
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import type { JournalValidationResult } from '../../shared/types';

interface BackfillProgress {
  progress: number;
  total: number;
  currentFile: string;
  percentage: number;
}

interface BackfillResult {
  filesProcessed: number;
  totalFiles: number;
  cancelled: boolean;
}

function SetupWizard() {
  const setJournalPath = useAppStore((state) => state.setJournalPath);
  const [manualPath, setManualPath] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [validationResult, setValidationResult] = useState<JournalValidationResult | null>(null);
  const [detectedPaths, setDetectedPaths] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);

  // Backfill state
  const [step, setStep] = useState<'path' | 'backfill' | 'complete'>('path');
  const [importHistory, setImportHistory] = useState(true);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(null);
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(null);

  // Detect Elite Dangerous paths on mount
  useEffect(() => {
    const detect = async () => {
      try {
        const paths = await window.electron.detectElitePaths();
        setDetectedPaths(paths);
        
        // If we found exactly one path, auto-fill and validate it
        if (paths.length === 1) {
          setManualPath(paths[0]);
          await validatePath(paths[0]);
        } else if (paths.length > 1) {
          // If multiple paths found, validate the first one
          setManualPath(paths[0]);
          await validatePath(paths[0]);
        }
      } catch (err) {
        console.error('Failed to detect Elite paths:', err);
      } finally {
        setIsDetecting(false);
      }
    };
    detect();
  }, []);

  const validatePath = async (pathToValidate: string) => {
    if (!pathToValidate.trim()) {
      setValidationResult(null);
      return;
    }

    setIsChecking(true);
    try {
      const result = await window.electron.validateJournalPath(pathToValidate.trim());
      setValidationResult(result);
    } catch (err) {
      setValidationResult({
        isValid: false,
        exists: false,
        isReadable: false,
        journalCount: 0,
        latestJournal: null,
        latestJournalDate: null,
        eliteInstalled: false,
        errors: ['Failed to validate path'],
        warnings: [],
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handlePathChange = (newPath: string) => {
    setManualPath(newPath);
    setValidationResult(null); // Clear previous validation
  };

  const handleValidate = async () => {
    await validatePath(manualPath);
  };

  const handleBrowse = async () => {
    try {
      const result = await window.electron.browseJournalPath();
      if (result) {
        setManualPath(result.path);
        setValidationResult(result.validation as JournalValidationResult);
      }
    } catch (err) {
      console.error('Failed to open folder picker:', err);
    }
  };

  const handleSubmit = async () => {
    if (!manualPath.trim()) {
      setValidationResult({
        isValid: false,
        exists: false,
        isReadable: false,
        journalCount: 0,
        latestJournal: null,
        latestJournalDate: null,
        eliteInstalled: false,
        errors: ['Please enter a journal folder path'],
        warnings: [],
      });
      return;
    }

    // Validate before submitting
    if (!validationResult) {
      await validatePath(manualPath);
      return;
    }

    // Allow submission even with warnings (but not errors)
    if (validationResult.errors.length > 0) {
      return;
    }

    // Go to backfill step instead of finishing
    await handleProceedToBackfill();
  };

  const handleSelectDetectedPath = async (path: string) => {
    setManualPath(path);
    await validatePath(path);
  };

  // Set up backfill progress listener
  useEffect(() => {
    const unsubscribe = window.electron.onBackfillProgress((data) => {
      setBackfillProgress(data);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleStartBackfill = useCallback(async () => {
    setIsBackfilling(true);
    setBackfillProgress(null);
    setBackfillResult(null);

    try {
      const result = await window.electron.startBackfill();
      if ('error' in result) {
        console.error('Backfill error:', result.error);
        setBackfillResult({ filesProcessed: 0, totalFiles: 0, cancelled: true });
      } else {
        setBackfillResult(result);
      }
    } catch (err) {
      console.error('Backfill failed:', err);
      setBackfillResult({ filesProcessed: 0, totalFiles: 0, cancelled: true });
    } finally {
      setIsBackfilling(false);
      setStep('complete');
    }
  }, []);

  const handleCancelBackfill = useCallback(async () => {
    await window.electron.cancelBackfill();
  }, []);

  const handleProceedToBackfill = async () => {
    // Save the path first
    try {
      await window.electron.setJournalPath(manualPath.trim());
      setJournalPath(manualPath.trim());
      setStep('backfill');
    } catch (err) {
      setValidationResult({
        ...validationResult!,
        errors: ['Failed to set journal path. Please try again.'],
      });
    }
  };

  const handleSkipBackfill = () => {
    setStep('complete');
    setBackfillResult(null);
  };

  const handleFinish = () => {
    // This is handled by the parent component watching journalPath
    // Just close the wizard
  };

  const defaultPath = '%USERPROFILE%\\Saved Games\\Frontier Developments\\Elite Dangerous';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Render Step 1: Path Selection
  const renderPathStep = () => (
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
          {defaultPath}
        </code>

        {/* Detected Paths */}
        {!isDetecting && detectedPaths.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              <svg className="w-4 h-4 inline-block mr-1 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Detected Elite Dangerous installation{detectedPaths.length > 1 ? 's' : ''}:
            </p>
            <div className="space-y-2">
              {detectedPaths.map((path, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectDetectedPath(path)}
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
            <svg className="animate-spin h-4 w-4 text-accent-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-sm text-slate-600 dark:text-slate-400">Detecting Elite Dangerous installation...</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="journalPath" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Journal Folder Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="journalPath"
                value={manualPath}
                onChange={(e) => handlePathChange(e.target.value)}
                onBlur={handleValidate}
                placeholder={defaultPath}
                className="input flex-1"
              />
              <button
                onClick={handleBrowse}
                className="btn btn-secondary"
                title="Browse for folder"
                aria-label="Browse for folder"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Validation Result */}
          {validationResult && (
            <div className="space-y-2">
              {/* Errors */}
              {validationResult.errors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      {validationResult.errors.map((error, i) => (
                        <p key={i} className="text-sm text-red-600 dark:text-red-400">{error}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validationResult.warnings.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      {validationResult.warnings.map((warning, i) => (
                        <p key={i} className="text-sm text-yellow-700 dark:text-yellow-400">{warning}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Success info */}
              {validationResult.isValid && validationResult.errors.length === 0 && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="text-sm text-green-700 dark:text-green-400">
                      <p className="font-medium">Valid journal folder found!</p>
                      <p className="text-green-600 dark:text-green-500 mt-1">
                        {validationResult.journalCount} journal file{validationResult.journalCount !== 1 ? 's' : ''} found
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

              {/* Folder Contents Preview */}
              {validationResult.isValid && validationResult.recentJournals && validationResult.recentJournals.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
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
            onClick={handleSubmit}
            disabled={isChecking || (validationResult?.errors?.length ?? 0) > 0}
            className="btn btn-primary w-full"
          >
            {isChecking ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Validating...
              </>
            ) : validationResult?.warnings.length && !validationResult?.isValid ? (
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

  // Render Step 2: Backfill Option
  const renderBackfillStep = () => (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        Import Exploration History
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        GalNetOps can import your existing exploration data from previous journal files.
        This lets you see your complete exploration history and statistics.
      </p>

      {!isBackfilling && !backfillResult && (
        <>
          {/* Import checkbox */}
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
                Process {validationResult?.journalCount || 0} journal files to import your previous discoveries, 
                system visits, and biological scans.
              </p>
            </div>
          </label>

          {/* Info about what gets imported */}
          {importHistory && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
              onClick={handleSkipBackfill}
              className="btn btn-secondary flex-1"
            >
              Skip
            </button>
            <button
              onClick={importHistory ? handleStartBackfill : handleSkipBackfill}
              className="btn btn-primary flex-1"
            >
              {importHistory ? 'Start Import' : 'Continue'}
            </button>
          </div>
        </>
      )}

      {/* Progress during backfill */}
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

          {/* Progress bar */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div 
              className="bg-accent-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${backfillProgress.percentage}%` }}
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
            <p>File {backfillProgress.progress} of {backfillProgress.total}</p>
            <p className="font-mono truncate">{backfillProgress.currentFile}</p>
          </div>

          <button
            onClick={handleCancelBackfill}
            className="btn btn-secondary w-full"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel Import
          </button>
        </div>
      )}
    </div>
  );

  // Render Step 3: Complete
  const renderCompleteStep = () => (
    <div className="card p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
              <p className="font-medium text-slate-900 dark:text-white mb-1">Import Summary</p>
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
          GalNetOps is ready to track your exploration.
          You can import your history later from Settings.
        </p>
      )}

      <button
        onClick={handleFinish}
        className="btn btn-primary w-full"
      >
        Start Exploring
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          {/* Logo/Icon */}
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome to GalNetOps
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            {step === 'path' && "Let's get you set up for exploration"}
            {step === 'backfill' && 'Import your exploration history'}
            {step === 'complete' && "You're all set!"}
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {['path', 'backfill', 'complete'].map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step
                    ? 'bg-accent-500'
                    : ['path', 'backfill', 'complete'].indexOf(step) > i
                    ? 'bg-accent-300 dark:bg-accent-700'
                    : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
            ))}
          </div>
        </div>

        {step === 'path' && renderPathStep()}
        {step === 'backfill' && renderBackfillStep()}
        {step === 'complete' && renderCompleteStep()}
      </div>
    </div>
  );
}

export default SetupWizard;
