/**
 * Central state and handlers for the Settings page.
 */
import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { JournalValidationResult } from '../../../shared/types';
import { parseAppInfo, parseDatabaseInfo, parseEdsmCacheStats, parseBoolean } from '../../utils/boundarySchemas';
import type { DatabaseInfo, ImportValidation, AppInfo, EdsmCacheStats, SettingsSection } from './types';

export type SettingsState = ReturnType<typeof useSettingsState>;

export function useSettingsState() {
  const journalPath = useAppStore((state) => state.journalPath);
  const setJournalPath = useAppStore((state) => state.setJournalPath);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const showFirstDiscoveryValues = useAppStore((state) => state.showFirstDiscoveryValues);
  const setShowFirstDiscoveryValues = useAppStore((state) => state.setShowFirstDiscoveryValues);
  const bioSignalsHighlightThreshold = useAppStore((state) => state.bioSignalsHighlightThreshold);
  const setBioSignalsHighlightThreshold = useAppStore((state) => state.setBioSignalsHighlightThreshold);
  const planetHighlightCriteria = useAppStore((state) => state.planetHighlightCriteria);
  const setPlanetHighlightCriteria = useAppStore((state) => state.setPlanetHighlightCriteria);
  const defaultIconZoomIndex = useAppStore((state) => state.defaultIconZoomIndex);
  const setDefaultIconZoomIndex = useAppStore((state) => state.setDefaultIconZoomIndex);
  const defaultTextZoomIndex = useAppStore((state) => state.defaultTextZoomIndex);
  const setDefaultTextZoomIndex = useAppStore((state) => state.setDefaultTextZoomIndex);
  const edsmSpoilerFree = useAppStore((state) => state.edsmSpoilerFree);
  const setEdsmSpoilerFree = useAppStore((state) => state.setEdsmSpoilerFree);
  const setCurrentSystem = useAppStore((state) => state.setCurrentSystem);
  const clearBodies = useAppStore((state) => state.clearBodies);

  const [editPath, setEditPath] = useState(journalPath || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<JournalValidationResult | null>(null);

  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isLoadingDbInfo, setIsLoadingDbInfo] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{
    success: boolean;
    path?: string;
    error?: string;
  } | null>(null);
  const [importValidation, setImportValidation] = useState<ImportValidation | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{
    progress: number;
    total: number;
    currentFile: string;
    percentage: number;
  } | null>(null);
  const [backfillResult, setBackfillResult] = useState<{
    filesProcessed: number;
    totalFiles: number;
    cancelled: boolean;
    error?: string;
  } | null>(null);

  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  const [edsmCacheStats, setEdsmCacheStats] = useState<EdsmCacheStats | null>(null);
  const [isLoadingEdsmCache, setIsLoadingEdsmCache] = useState(false);
  const [isClearingEdsmCache, setIsClearingEdsmCache] = useState(false);

  const [selectedSection, setSelectedSection] = useState<SettingsSection>('about');

  useEffect(() => {
    if (!isEditing) {
      setEditPath(journalPath || '');
    }
  }, [journalPath, isEditing]);

  useEffect(() => {
    loadDatabaseInfo();
    loadAppInfo();
    loadEdsmCacheStats();
    window.electron
      .getSettings('edsmSpoilerFree')
      .then((value) => {
        const parsed = parseBoolean(value);
        if (parsed !== undefined) {
          setEdsmSpoilerFree(parsed);
        }
      })
      .catch((err) => {
        console.error('Failed to load EDSM spoiler-free setting:', err);
      });
  }, []);

  const loadAppInfo = async () => {
    try {
      const raw = await window.electron.getAppInfo();
      const info = parseAppInfo(raw);
      if (info) {
        setAppInfo(info);
      }
    } catch (err) {
      console.error('Failed to load app info:', err);
    }
  };

  const loadDatabaseInfo = async () => {
    setIsLoadingDbInfo(true);
    try {
      const raw = await window.electron.getDatabaseInfo();
      const info = parseDatabaseInfo(raw);
      if (info) {
        setDbInfo(info);
      }
    } catch (err) {
      console.error('Failed to load database info:', err);
    } finally {
      setIsLoadingDbInfo(false);
    }
  };

  const loadEdsmCacheStats = async () => {
    setIsLoadingEdsmCache(true);
    try {
      const raw = await window.electron.edsmGetCacheStats();
      const stats = parseEdsmCacheStats(raw);
      if (stats) {
        setEdsmCacheStats(stats);
      }
    } catch (err) {
      console.error('Failed to load EDSM cache stats:', err);
    } finally {
      setIsLoadingEdsmCache(false);
    }
  };

  const handleClearEdsmCache = async () => {
    setIsClearingEdsmCache(true);
    try {
      await window.electron.edsmClearCache();
      await loadEdsmCacheStats();
    } catch (err) {
      console.error('Failed to clear EDSM cache:', err);
    } finally {
      setIsClearingEdsmCache(false);
    }
  };

  const handleBrowse = async () => {
    try {
      const result = await window.electron.browseJournalPath();
      if (result) {
        setEditPath(result.path);
        setValidationResult(result.validation as JournalValidationResult);
        setIsEditing(true);
      }
    } catch (err) {
      console.error('Failed to open folder picker:', err);
    }
  };

  const handleValidate = async () => {
    if (!editPath.trim()) {
      setValidationResult(null);
      return;
    }
    setIsValidating(true);
    try {
      const result = await window.electron.validateJournalPath(editPath.trim());
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
      setIsValidating(false);
    }
  };

  const handleSavePath = async () => {
    if (!validationResult?.isValid || validationResult.errors.length > 0) {
      return;
    }
    try {
      await window.electron.setJournalPath(editPath.trim());
      setJournalPath(editPath.trim());
      setIsEditing(false);
      setValidationResult(null);
    } catch (err) {
      console.error('Failed to save journal path:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditPath(journalPath || '');
    setIsEditing(false);
    setValidationResult(null);
  };

  const handlePathChange = (newPath: string) => {
    setEditPath(newPath);
    setValidationResult(null);
    setIsEditing(true);
  };

  const handleClearData = async () => {
    setIsClearing(true);
    setClearError(null);
    try {
      const result = await window.electron.clearExplorationData();
      if (result.success) {
        setCurrentSystem(null);
        clearBodies();
        await loadDatabaseInfo();
        setShowClearConfirm(false);
      } else {
        setClearError(result.error || 'Failed to clear data');
      }
    } catch (err) {
      setClearError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsClearing(false);
    }
  };

  const handleBackup = async () => {
    setIsBackingUp(true);
    setBackupResult(null);
    try {
      const result = await window.electron.backupDatabase();
      if (!result.cancelled) {
        setBackupResult(result);
      }
    } catch (err) {
      setBackupResult({
        success: false,
        error: err instanceof Error ? err.message : 'Backup failed',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleSelectImportFile = async () => {
    setImportValidation(null);
    setImportError(null);
    try {
      const result = await window.electron.validateImportDatabase();
      if (!result.cancelled) {
        setImportValidation(result);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to select file');
    }
  };

  const handleImport = async () => {
    if (!importValidation?.path) {
      return;
    }
    setIsImporting(true);
    setImportError(null);
    try {
      const result = await window.electron.importDatabase(importValidation.path);
      if (result.success) {
        setCurrentSystem(null);
        clearBodies();
        await loadDatabaseInfo();
        setImportValidation(null);
      } else {
        setImportError(result.error || 'Import failed');
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCancelImport = () => {
    setImportValidation(null);
    setImportError(null);
  };

  const handleStartBackfill = async () => {
    setIsBackfilling(true);
    setBackfillProgress(null);
    setBackfillResult(null);
    const unsubscribe = window.electron.onBackfillProgress((data) => {
      setBackfillProgress(data);
    });
    try {
      const result = await window.electron.startBackfill();
      setBackfillResult(result);
      await loadDatabaseInfo();
    } catch (err) {
      console.error('Backfill failed:', err);
    } finally {
      setIsBackfilling(false);
      unsubscribe();
    }
  };

  const handleCancelBackfill = async () => {
    await window.electron.cancelBackfill();
  };

  const dismissClearConfirm = () => {
    setShowClearConfirm(false);
    setClearError(null);
  };

  return {
    // Store
    journalPath,
    setJournalPath,
    theme,
    setTheme,
    showFirstDiscoveryValues,
    setShowFirstDiscoveryValues,
    bioSignalsHighlightThreshold,
    setBioSignalsHighlightThreshold,
    planetHighlightCriteria,
    setPlanetHighlightCriteria,
    defaultIconZoomIndex,
    setDefaultIconZoomIndex,
    defaultTextZoomIndex,
    setDefaultTextZoomIndex,
    edsmSpoilerFree,
    setEdsmSpoilerFree,
    // Journal
    editPath,
    isEditing,
    isValidating,
    validationResult,
    handleBrowse,
    handleValidate,
    handleSavePath,
    handleCancelEdit,
    handlePathChange,
    // Data management
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
    // Backfill
    isBackfilling,
    backfillProgress,
    backfillResult,
    handleStartBackfill,
    handleCancelBackfill,
    // App info
    appInfo,
    // EDSM cache
    edsmCacheStats,
    isLoadingEdsmCache,
    isClearingEdsmCache,
    handleClearEdsmCache,
    // Section
    selectedSection,
    setSelectedSection,
  };
}
