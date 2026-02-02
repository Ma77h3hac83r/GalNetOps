/** Settings page: journal path (browse/validate), theme, value highlights (body/bio), default zoom, EDSM spoiler-free; data management (DB info, clear, backup, import). */
import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import type { JournalValidationResult } from '../../shared/types';
import { parseAppInfo, parseDatabaseInfo, parseEdsmCacheStats, parseBoolean } from '../utils/boundarySchemas';

interface DatabaseInfo {
  path: string;
  size: number;
  systemCount: number;
  bodyCount: number;
}

interface ImportValidation {
  valid: boolean;
  cancelled?: boolean;
  path?: string;
  error?: string;
  systemCount?: number;
  bodyCount?: number;
}

interface AppInfo {
  version: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  platform: string;
  arch: string;
}

interface EdsmCacheStats {
  memoryCacheSize: number;
  dbStats: {
    totalEntries: number;
    validEntries: number;
    expiredEntries: number;
    sizeBytes: number;
    byType: Record<string, number>;
  } | null;
}

type SettingsSection = 'about' | 'journal' | 'appearance' | 'exploration' | 'edsm' | 'data';

const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'journal', label: 'Journal' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'exploration', label: 'Exploration' },
  { id: 'edsm', label: 'EDSM' },
  { id: 'data', label: 'Data Management' },
];

function Settings() {
  const journalPath = useAppStore((state) => state.journalPath);
  const setJournalPath = useAppStore((state) => state.setJournalPath);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const showFirstDiscoveryValues = useAppStore((state) => state.showFirstDiscoveryValues);
  const setShowFirstDiscoveryValues = useAppStore((state) => state.setShowFirstDiscoveryValues);
  const bodyScanHighValue = useAppStore((state) => state.bodyScanHighValue);
  const setBodyScanHighValue = useAppStore((state) => state.setBodyScanHighValue);
  const bodyScanMediumValue = useAppStore((state) => state.bodyScanMediumValue);
  const setBodyScanMediumValue = useAppStore((state) => state.setBodyScanMediumValue);
  const bioHighValue = useAppStore((state) => state.bioHighValue);
  const setBioHighValue = useAppStore((state) => state.setBioHighValue);
  const bioMediumValue = useAppStore((state) => state.bioMediumValue);
  const setBioMediumValue = useAppStore((state) => state.setBioMediumValue);
  const defaultIconZoomIndex = useAppStore((state) => state.defaultIconZoomIndex);
  const setDefaultIconZoomIndex = useAppStore((state) => state.setDefaultIconZoomIndex);
  const defaultTextZoomIndex = useAppStore((state) => state.defaultTextZoomIndex);
  const setDefaultTextZoomIndex = useAppStore((state) => state.setDefaultTextZoomIndex);
  const edsmSpoilerFree = useAppStore((state) => state.edsmSpoilerFree);
  const setEdsmSpoilerFree = useAppStore((state) => state.setEdsmSpoilerFree);
  const setCurrentSystem = useAppStore((state) => state.setCurrentSystem);
  const clearBodies = useAppStore((state) => state.clearBodies);

  // Local state for journal path editing
  const [editPath, setEditPath] = useState(journalPath || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<JournalValidationResult | null>(null);

  // Data management state
  const [dbInfo, setDbInfo] = useState<DatabaseInfo | null>(null);
  const [isLoadingDbInfo, setIsLoadingDbInfo] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupResult, setBackupResult] = useState<{ success: boolean; path?: string; error?: string } | null>(null);
  const [importValidation, setImportValidation] = useState<ImportValidation | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Backfill state
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillProgress, setBackfillProgress] = useState<{ progress: number; total: number; currentFile: string; percentage: number } | null>(null);
  const [backfillResult, setBackfillResult] = useState<{ filesProcessed: number; totalFiles: number; cancelled: boolean } | null>(null);

  // App info state
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  // EDSM cache state
  const [edsmCacheStats, setEdsmCacheStats] = useState<EdsmCacheStats | null>(null);
  const [isLoadingEdsmCache, setIsLoadingEdsmCache] = useState(false);
  const [isClearingEdsmCache, setIsClearingEdsmCache] = useState(false);

  // Selected settings section (About loads first)
  const [selectedSection, setSelectedSection] = useState<SettingsSection>('about');

  // Sync editPath when journalPath changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditPath(journalPath || '');
    }
  }, [journalPath, isEditing]);

  // Load database info, app info, and EDSM cache stats on mount
  useEffect(() => {
    loadDatabaseInfo();
    loadAppInfo();
    loadEdsmCacheStats();
    
    window.electron.getSettings('edsmSpoilerFree').then((value) => {
      const parsed = parseBoolean(value);
      if (parsed !== undefined) setEdsmSpoilerFree(parsed);
    }).catch((err) => {
      console.error('Failed to load EDSM spoiler-free setting:', err);
    });
  }, []);

  const loadAppInfo = async () => {
    try {
      const raw = await window.electron.getAppInfo();
      const info = parseAppInfo(raw);
      if (info) setAppInfo(info);
    } catch (err) {
      console.error('Failed to load app info:', err);
    }
  };

  const loadDatabaseInfo = async () => {
    setIsLoadingDbInfo(true);
    try {
      const raw = await window.electron.getDatabaseInfo();
      const info = parseDatabaseInfo(raw);
      if (info) setDbInfo(info);
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
      if (stats) setEdsmCacheStats(stats);
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
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Data management handlers
  const handleClearData = async () => {
    setIsClearing(true);
    setClearError(null);
    try {
      const result = await window.electron.clearExplorationData();
      if (result.success) {
        // Clear local state
        setCurrentSystem(null);
        clearBodies();
        // Reload database info
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
      setBackupResult({ success: false, error: err instanceof Error ? err.message : 'Backup failed' });
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
    if (!importValidation?.path) return;
    
    setIsImporting(true);
    setImportError(null);
    try {
      const result = await window.electron.importDatabase(importValidation.path);
      if (result.success) {
        // Clear local state and reload
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

  // Backfill handlers
  const handleStartBackfill = async () => {
    setIsBackfilling(true);
    setBackfillProgress(null);
    setBackfillResult(null);

    // Subscribe to progress updates
    const unsubscribe = window.electron.onBackfillProgress((data) => {
      setBackfillProgress(data);
    });

    try {
      const result = await window.electron.startBackfill();
      setBackfillResult(result);
      // Reload database info after backfill
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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        {/* Section list - directly above content */}
        <nav className="flex flex-wrap gap-1 mb-6" aria-label="Settings sections">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSelectedSection(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSection === id
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-current={selectedSection === id ? 'page' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>
          {selectedSection === 'about' && (
            <section className="card p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                About
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="w-16 h-16 rounded-xl bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center flex-shrink-0">
                    <svg className="w-8 h-8 text-accent-600 dark:text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">GalNetOps</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Elite Dangerous Exploration Companion</p>
                    <p className="text-sm font-medium text-accent-600 dark:text-accent-400 mt-1">Version {appInfo?.version || '...'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.electron.openExternal('https://github.com/Ma77h3hac83r/GalNetOps')} className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">GitHub</span>
                  </button>
                  <button onClick={() => window.electron.openExternal('https://github.com/Ma77h3hac83r/GalNetOps/issues')} className="flex-1 flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Report Issue</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Credits & Acknowledgments</h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                    <p>Built with Electron, React, and TypeScript.</p>
                    <p>Elite Dangerous is a trademark of Frontier Developments.</p>
                    <p>This application is not affiliated with Frontier Developments or Elite Dangerous.</p>
                    <p className="pt-1">Thanks to the Elite Dangerous community for documentation and resources.</p>
                  </div>
                </div>
                <details className="group">
                  <summary className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">System Information</span>
                    <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                    {appInfo ? (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><p className="text-slate-500 dark:text-slate-400">Electron</p><p className="font-mono text-slate-700 dark:text-slate-300">{appInfo.electronVersion}</p></div>
                        <div><p className="text-slate-500 dark:text-slate-400">Node.js</p><p className="font-mono text-slate-700 dark:text-slate-300">{appInfo.nodeVersion}</p></div>
                        <div><p className="text-slate-500 dark:text-slate-400">Chrome</p><p className="font-mono text-slate-700 dark:text-slate-300">{appInfo.chromeVersion}</p></div>
                        <div><p className="text-slate-500 dark:text-slate-400">Platform</p><p className="font-mono text-slate-700 dark:text-slate-300">{appInfo.platform} ({appInfo.arch})</p></div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Loading...</p>
                    )}
                  </div>
                </details>
              </div>
            </section>
          )}

          {selectedSection === 'journal' && (
        <section className="card p-6" key="journal">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Journal Folder
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Location of your Elite Dangerous journal files
          </p>

          <div className="space-y-4">
            {/* Path input and browse button */}
            <div>
              <label htmlFor="settings-journal-path" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 sr-only">
                Journal folder path
              </label>
              <div className="flex gap-2">
                <input
                  id="settings-journal-path"
                  type="text"
                  value={editPath}
                  onChange={(e) => handlePathChange(e.target.value)}
                  onBlur={() => { if (isEditing) handleValidate(); }}
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
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </button>
              </div>
            </div>

            {/* Validation Result */}
            {validationResult && (
              <div id="settings-journal-validation" className="space-y-2" role="status" aria-live="polite">
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
                        <p className="font-medium">Valid journal folder!</p>
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
              </div>
            )}

            {/* Save/Cancel buttons when editing */}
            {isEditing && (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleCancelEdit}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePath}
                  disabled={isValidating || !validationResult?.isValid || (validationResult?.errors?.length ?? 0) > 0}
                  className="btn btn-primary"
                >
                  {isValidating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
          )}

          {selectedSection === 'appearance' && (
        <section className="card p-6" key="appearance">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Appearance
          </h2>

          <div className="space-y-4">
            {/* Theme selector */}
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
                      <svg className={`w-6 h-6 ${theme === t ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                    {t === 'dark' && (
                      <svg className={`w-6 h-6 ${theme === t ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )}
                    {t === 'elite' && (
                      <svg className={`w-6 h-6 ${theme === t ? 'text-orange-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                    {t === 'system' && (
                      <svg className={`w-6 h-6 ${theme === t ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span className={`text-sm font-medium ${
                      theme === t 
                        ? t === 'elite' ? 'text-orange-500' : 'text-accent-700 dark:text-accent-300' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {t === 'elite' ? 'Elite Dangerous' : t.charAt(0).toUpperCase() + t.slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Default zoom */}
            <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Default zoom</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Default icon and text zoom when opening the Explorer tab. You can still adjust zoom with the +/- controls in the header.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-default-icon-zoom" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Icon zoom</label>
                  <select
                    id="settings-default-icon-zoom"
                    value={defaultIconZoomIndex}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 0 && v <= 5) setDefaultIconZoomIndex(v);
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
                  <label htmlFor="settings-default-text-zoom" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Text zoom</label>
                  <select
                    id="settings-default-text-zoom"
                    value={defaultTextZoomIndex}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 0 && v <= 5) setDefaultTextZoomIndex(v);
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
          )}

          {selectedSection === 'exploration' && (
        <section className="card p-6" key="exploration">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Exploration
          </h2>

          <div className="space-y-4">
            {/* First Discovery Values Toggle */}
            <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={showFirstDiscoveryValues}
                  onChange={(e) => setShowFirstDiscoveryValues(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 dark:peer-focus:ring-accent-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-accent-600"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Show first discovery values
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  When enabled, displays the higher scan values for bodies you discover first (2.6x multiplier) or map first (8.45x multiplier). Disable to show base values only.
                </p>
              </div>
            </label>

            {/* Value highlight thresholds */}
            <div className="space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Value highlights</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Minimum CR to highlight body names in the system map and biological lines in the details pane. High = gold (e.g. $$$), Medium = orange (e.g. $).
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-body-scan-high" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Body scan high (gold) – system map</label>
                  <input
                    id="settings-body-scan-high"
                    type="number"
                    min={0}
                    step={10000}
                    value={bodyScanHighValue}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 0) setBodyScanHighValue(v); }}
                    className="input w-full text-sm"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Default 500,000 CR (FSS+DSS high value)</p>
                </div>
                <div>
                  <label htmlFor="settings-body-scan-medium" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Body scan medium (orange) – system map</label>
                  <input
                    id="settings-body-scan-medium"
                    type="number"
                    min={0}
                    step={10000}
                    value={bodyScanMediumValue}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 0) setBodyScanMediumValue(v); }}
                    className="input w-full text-sm"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Default 100,000 CR</p>
                </div>
                <div>
                  <label htmlFor="settings-bio-high" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Biological high (gold) – details pane</label>
                  <input
                    id="settings-bio-high"
                    type="number"
                    min={0}
                    step={100000}
                    value={bioHighValue}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 0) setBioHighValue(v); }}
                    className="input w-full text-sm"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Default 15,000,000 CR</p>
                </div>
                <div>
                  <label htmlFor="settings-bio-medium" className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Biological medium (orange) – details pane</label>
                  <input
                    id="settings-bio-medium"
                    type="number"
                    min={0}
                    step={100000}
                    value={bioMediumValue}
                    onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v >= 0) setBioMediumValue(v); }}
                    className="input w-full text-sm"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Default 7,500,000 CR</p>
                </div>
              </div>
            </div>

            {/* Scan multipliers – collapsible details */}
            <details className="group">
              <summary className="cursor-pointer p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
                About scan value multipliers
                <svg className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <ul className="text-xs text-blue-700 dark:text-blue-400 list-disc list-inside space-y-0.5">
                  <li>First Discovered: +50% FSS (1.5x)</li>
                  <li>First Mapped: +50% on DSS value</li>
                  <li>Efficiency bonus: +10% (min probes for mapping)</li>
                  <li>Odyssey bonus: +30% on mapping</li>
                </ul>
              </div>
            </details>
          </div>
        </section>
          )}

          {selectedSection === 'edsm' && (
        <section className="card p-6" key="edsm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            EDSM Integration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Configure Elite Dangerous Star Map (EDSM) integration
          </p>

          <div className="space-y-4">
            {/* Spoiler-Free Mode Toggle */}
            <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={edsmSpoilerFree}
                  onChange={(e) => setEdsmSpoilerFree(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 dark:peer-focus:ring-accent-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-accent-600"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Spoiler-free mode
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  When enabled, EDSM data only shows body count without revealing body types. Discover what's in each system yourself!
                </p>
              </div>
            </label>

            {/* EDSM Cache Info */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">EDSM Cache</h3>
                <button
                  onClick={handleClearEdsmCache}
                  disabled={isClearingEdsmCache}
                  className="text-xs px-2 py-1 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  {isClearingEdsmCache ? 'Clearing...' : 'Clear Cache'}
                </button>
              </div>
              
              {isLoadingEdsmCache ? (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">Loading...</span>
                </div>
              ) : edsmCacheStats ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Memory Cache</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {edsmCacheStats.memoryCacheSize} entries
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Database Cache</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">
                      {edsmCacheStats.dbStats?.validEntries ?? 0} entries
                    </p>
                  </div>
                  {edsmCacheStats.dbStats && (
                    <>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Cache Size</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {formatFileSize(edsmCacheStats.dbStats.sizeBytes)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Expired</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {edsmCacheStats.dbStats.expiredEntries} entries
                        </p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Unable to load cache stats</p>
              )}

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
                EDSM responses are cached for 24 hours to reduce API calls. Clear the cache if you need fresh data.
              </p>
            </div>

            {/* EDSM Link */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">EDSM Website</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Elite Dangerous Star Map - Community exploration database
                </p>
              </div>
              <button
                onClick={() => window.electron.openExternal('https://www.edsm.net')}
                className="btn btn-secondary text-sm"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Visit EDSM
              </button>
            </div>
          </div>
        </section>
          )}

          {selectedSection === 'data' && (
        <section className="card p-6" key="data">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
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
                <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400">Import Journal History</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                    Import your exploration history from past journal files. This will scan all journal files and populate the database with systems, bodies, and route history.
                  </p>
                  
                  {/* Backfill Progress */}
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

                  {/* Backfill Result */}
                  {backfillResult && !isBackfilling && (
                    <div className={`mt-3 p-2 rounded text-xs ${
                      backfillResult.cancelled 
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                      {backfillResult.cancelled 
                        ? `Cancelled. Processed ${backfillResult.filesProcessed} of ${backfillResult.totalFiles} files.`
                        : `Complete! Processed ${backfillResult.filesProcessed} journal files.`
                      }
                    </div>
                  )}

                  {/* Action Buttons */}
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
                        <svg className="w-4 h-4 inline mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Database Information</h3>
              {isLoadingDbInfo ? (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">Loading...</span>
                </div>
              ) : dbInfo ? (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">File Size</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{formatFileSize(dbInfo.size)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Systems</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{dbInfo.systemCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Bodies</p>
                    <p className="font-medium text-slate-700 dark:text-slate-300">{dbInfo.bodyCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">Location</p>
                    <p className="font-mono text-xs text-slate-600 dark:text-slate-400 truncate" title={dbInfo.path}>
                      {dbInfo.path}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Unable to load database info</p>
              )}
            </div>

            {/* Backup Database */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Backup Database</p>
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
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Backing up...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Backup
                  </>
                )}
              </button>
            </div>

            {backupResult && (
              <div className={`p-3 rounded-lg ${
                backupResult.success 
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}>
                <div className="flex items-start gap-2">
                  {backupResult.success ? (
                    <>
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-sm text-green-700 dark:text-green-400">
                        <p className="font-medium">Backup created successfully</p>
                        <p className="text-xs mt-0.5 font-mono truncate">{backupResult.path}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-600 dark:text-red-400">{backupResult.error}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Import Database */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Import Database</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Restore from a backup file (replaces current data)
                  </p>
                </div>
                {!importValidation && (
                  <button
                    onClick={handleSelectImportFile}
                    className="btn btn-secondary text-sm"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
                        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="text-sm text-blue-700 dark:text-blue-400">
                          <p className="font-medium">Ready to import</p>
                          <p className="text-xs mt-1">
                            {importValidation.systemCount?.toLocaleString()} systems, {importValidation.bodyCount?.toLocaleString()} bodies
                          </p>
                          <p className="text-xs font-mono truncate mt-0.5">{importValidation.path}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-red-600 dark:text-red-400">{importValidation.error}</p>
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
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">Clear Exploration Data</p>
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
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl max-w-md w-full p-6" role="dialog" aria-modal="true" aria-labelledby="clear-dialog-title" aria-describedby="clear-dialog-desc">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0" aria-hidden>
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h3 id="clear-dialog-title" className="text-lg font-semibold text-slate-900 dark:text-white">
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
                      onClick={() => {
                        setShowClearConfirm(false);
                        setClearError(null);
                      }}
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
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 inline" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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
          )}
      </div>
    </div>
  );
}

export default Settings;
