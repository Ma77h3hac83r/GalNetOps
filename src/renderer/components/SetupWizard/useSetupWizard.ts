/** Hook: setup wizard state, path validation, backfill, and step flow. */
import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { JournalValidationResult } from '../../../shared/types';
import type { BackfillProgress, BackfillResult, SetupWizardStep } from './types';

const INVALID_RESULT: JournalValidationResult = {
  isValid: false,
  exists: false,
  isReadable: false,
  journalCount: 0,
  latestJournal: null,
  latestJournalDate: null,
  eliteInstalled: false,
  errors: [],
  warnings: [],
  recentJournals: [],
};

export function useSetupWizard() {
  const setJournalPath = useAppStore((state) => state.setJournalPath);

  const [manualPath, setManualPath] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [validationResult, setValidationResult] =
    useState<JournalValidationResult | null>(null);
  const [detectedPaths, setDetectedPaths] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(true);

  const [step, setStep] = useState<SetupWizardStep>('path');
  const [importHistory, setImportHistory] = useState(true);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(
    null
  );
  const [backfillResult, setBackfillResult] = useState<BackfillResult | null>(
    null
  );

  const validatePath = useCallback(async (pathToValidate: string) => {
    if (!pathToValidate.trim()) {
      setValidationResult(null);
      return;
    }

    setIsChecking(true);
    try {
      const result = await window.electron.validateJournalPath(
        pathToValidate.trim()
      );
      setValidationResult(result as JournalValidationResult);
    } catch (err: unknown) {
      setValidationResult({
        ...INVALID_RESULT,
        errors: ['Failed to validate path'],
      });
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const detect = async () => {
      try {
        const paths = await window.electron.detectElitePaths();
        setDetectedPaths(paths);

        if (paths.length >= 1) {
          const first = paths[0];
          if (first) {
            setManualPath(first);
            await validatePath(first);
          }
        }
      } catch (err: unknown) {
        console.error('Failed to detect Elite paths:', err);
      } finally {
        setIsDetecting(false);
      }
    };
    detect();
  }, [validatePath]);

  useEffect(() => {
    const unsubscribe = window.electron.onBackfillProgress((data) => {
      setBackfillProgress(data);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handlePathChange = useCallback((newPath: string) => {
    setManualPath(newPath);
    setValidationResult(null);
  }, []);

  const handleValidate = useCallback(async () => {
    await validatePath(manualPath);
  }, [manualPath, validatePath]);

  const handleBrowse = useCallback(async () => {
    try {
      const result = await window.electron.browseJournalPath();
      if (result) {
        setManualPath(result.path);
        setValidationResult(result.validation as JournalValidationResult);
      }
    } catch (err: unknown) {
      console.error('Failed to open folder picker:', err);
    }
  }, []);

  const handleSelectDetectedPath = useCallback(
    async (path: string) => {
      setManualPath(path);
      await validatePath(path);
    },
    [validatePath]
  );

  const handleProceedToBackfill = useCallback(async () => {
    try {
      await window.electron.setJournalPath(manualPath.trim());
      setJournalPath(manualPath.trim());
      setStep('backfill');
    } catch (err: unknown) {
      setValidationResult((prev) =>
        prev
          ? {
              ...prev,
              errors: ['Failed to set journal path. Please try again.'],
            }
          : { ...INVALID_RESULT, errors: ['Failed to set journal path.'] }
      );
    }
  }, [manualPath, setJournalPath]);

  const handleSubmit = useCallback(async () => {
    if (!manualPath.trim()) {
      setValidationResult({
        ...INVALID_RESULT,
        errors: ['Please enter a journal folder path'],
      });
      return;
    }

    if (!validationResult) {
      await validatePath(manualPath);
      return;
    }

    if (validationResult.errors.length > 0) {
      return;
    }

    await handleProceedToBackfill();
  }, [manualPath, validationResult, validatePath, handleProceedToBackfill]);

  const handleStartBackfill = useCallback(async () => {
    setIsBackfilling(true);
    setBackfillProgress(null);
    setBackfillResult(null);

    try {
      const result = await window.electron.startBackfill();
      if (result && 'error' in result) {
        console.error('Backfill error:', (result as { error: string }).error);
        setBackfillResult({ filesProcessed: 0, totalFiles: 0, cancelled: true });
      } else {
        setBackfillResult(result as BackfillResult);
      }
    } catch (err: unknown) {
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

  const handleSkipBackfill = useCallback(() => {
    setStep('complete');
    setBackfillResult(null);
  }, []);

  const handleFinish = useCallback(() => {
    // Parent watches journalPath; wizard just closes
  }, []);

  return {
    step,
    manualPath,
    setManualPath: handlePathChange,
    isChecking,
    validationResult,
    detectedPaths,
    isDetecting,
    importHistory,
    setImportHistory,
    isBackfilling,
    backfillProgress,
    backfillResult,
    handleValidate,
    handleBrowse,
    handleSubmit,
    handleSelectDetectedPath,
    handleStartBackfill,
    handleCancelBackfill,
    handleSkipBackfill,
    handleFinish,
  };
}
