/** Root component: theme init, app state init from IPC, journal event subscriptions, setup wizard when no journal path, and view routing (Explorer/RouteHistory/Statistics/Codex/Settings). */
import { useEffect, useState, Suspense, lazy } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from './stores/appStore';
import { useTheme } from './hooks/useTheme';
import { parseJournalPath, parseBoolean, parseNumber } from './utils/boundarySchemas';
import TitleBar from './components/TitleBar';
import SetupWizard from './components/SetupWizard';

// Lazy-load views so loading and errors are scoped by Suspense/ErrorBoundary
const ExplorerView = lazy(() => import('./components/ExplorerView').then((m) => ({ default: m.default })));
const RouteHistory = lazy(() => import('./pages/RouteHistory').then((m) => ({ default: m.default })));
const Statistics = lazy(() => import('./pages/Statistics').then((m) => ({ default: m.default })));
const Codex = lazy(() => import('./pages/Codex').then((m) => ({ default: m.default })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.default })));

interface BackfillProgress {
  progress: number;
  total: number;
  currentFile: string;
  isComplete: boolean;
}

function App() {
  const {
    journalPath,
    currentView,
    setCurrentSystem,
    addBody,
    updateBodyMapped,
    updateBodySignals,
    setJournalPath,
    setEdsmSpoilerFree,
    setBodyScanHighValue,
    setBodyScanMediumValue,
    setBioHighValue,
    setBioMediumValue,
    setDefaultIconZoomIndex,
    setDefaultTextZoomIndex,
    setLoading,
    isLoading,
  } = useAppStore(
    useShallow((s) => ({
      journalPath: s.journalPath,
      currentView: s.currentView,
      setCurrentSystem: s.setCurrentSystem,
      addBody: s.addBody,
      updateBodyMapped: s.updateBodyMapped,
      updateBodySignals: s.updateBodySignals,
      setJournalPath: s.setJournalPath,
      setEdsmSpoilerFree: s.setEdsmSpoilerFree,
      setBodyScanHighValue: s.setBodyScanHighValue,
      setBodyScanMediumValue: s.setBodyScanMediumValue,
      setBioHighValue: s.setBioHighValue,
      setBioMediumValue: s.setBioMediumValue,
      setDefaultIconZoomIndex: s.setDefaultIconZoomIndex,
      setDefaultTextZoomIndex: s.setDefaultTextZoomIndex,
      setLoading: s.setLoading,
      isLoading: s.isLoading,
    }))
  );
  
  const [importProgress, setImportProgress] = useState<BackfillProgress | null>(null);
  const [bridgeMissing, setBridgeMissing] = useState(false);

  interface ExobiologyMismatch {
    systemName: string;
    bodyName: string;
    genus: string;
    species: string;
    foundVariant: string;
    estimatedVariant: string;
    reason: string;
    characteristics?: {
      mainStarClass: string;
      bodyType: string;
      bodyDistanceLs: number | null;
      planetTypesInSystem: string;
      gravity: number | null;
      temperature: number | null;
      atmosphere: string | null;
      volcanism: string | null;
    };
    speciesNotVerified?: string[];
  }
  const [exobiologyMismatch, setExobiologyMismatch] = useState<ExobiologyMismatch | null>(null);

  // Initialize theme
  useTheme();

  // Load persisted settings and current system from main process on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) {
      setBridgeMissing(true);
      setLoading(false);
      return;
    }
    const init = async () => {
      try {
        const path = parseJournalPath(await window.electron.getJournalPath());
        if (path) setJournalPath(path);

        const edsmSpoilerFree = parseBoolean(await window.electron.getSettings('edsmSpoilerFree'));
        if (edsmSpoilerFree !== undefined) setEdsmSpoilerFree(edsmSpoilerFree);

        const [bodyHigh, bodyMed, bioHigh, bioMed, defaultIconZoom, defaultTextZoom] = await Promise.all([
          window.electron.getSettings('bodyScanHighValue'),
          window.electron.getSettings('bodyScanMediumValue'),
          window.electron.getSettings('bioHighValue'),
          window.electron.getSettings('bioMediumValue'),
          window.electron.getSettings('defaultIconZoomIndex'),
          window.electron.getSettings('defaultTextZoomIndex'),
        ]);
        const vHigh = parseNumber(bodyHigh);
        const vMed = parseNumber(bodyMed);
        const vBioHigh = parseNumber(bioHigh);
        const vBioMed = parseNumber(bioMed);
        const vZoomI = parseNumber(defaultIconZoom);
        const vZoomT = parseNumber(defaultTextZoom);
        if (vHigh !== undefined) setBodyScanHighValue(vHigh);
        if (vMed !== undefined) setBodyScanMediumValue(vMed);
        if (vBioHigh !== undefined) setBioHighValue(vBioHigh);
        if (vBioMed !== undefined) setBioMediumValue(vBioMed);
        if (vZoomI !== undefined && vZoomI >= 0 && vZoomI <= 5) setDefaultIconZoomIndex(vZoomI);
        if (vZoomT !== undefined && vZoomT >= 0 && vZoomT <= 5) setDefaultTextZoomIndex(vZoomT);

        const system = await window.electron.getCurrentSystem();
        setCurrentSystem(system ?? null);
      } catch (err) {
        console.error('Init failed:', err);
        setLoading(false);
      }
    };

    init().catch((err) => {
      console.error('Init promise rejected:', err);
      setLoading(false);
    });
  }, [setJournalPath, setEdsmSpoilerFree, setBodyScanHighValue, setBodyScanMediumValue, setBioHighValue, setBioMediumValue, setDefaultIconZoomIndex, setDefaultTextZoomIndex, setCurrentSystem, setLoading]);

  // Subscribe to journal events (system changed, body scanned/mapped, signals) and cleanup on unmount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) return () => {};
    const unsubSystem = window.electron.onSystemChanged((system: unknown) => {
      setCurrentSystem(system);
    });

    const unsubBody = window.electron.onBodyScanned((body: unknown) => {
      addBody(body);
    });

    const unsubMapped = window.electron.onBodyMapped((data: unknown) => {
      if (data != null && typeof data === 'object' && 'bodyId' in data && typeof (data as { bodyId: unknown }).bodyId === 'number') {
        updateBodyMapped((data as { bodyId: number }).bodyId);
      }
    });

    const unsubSignals = window.electron.onBodySignalsUpdated((data) => {
      updateBodySignals(data);
    });

    return () => {
      unsubSystem();
      unsubBody();
      unsubMapped();
      unsubSignals();
    };
  }, []);

  // Subscribe to auto-import progress
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron) return () => {};
    const unsubProgress = window.electron.onBackfillProgress((data) => {
      if (data && typeof data === 'object' && 'isComplete' in data && (data as { isComplete: unknown }).isComplete) {
        setTimeout(() => setImportProgress(null), 2000);
      }
      setImportProgress(data as BackfillProgress);
    });

    return () => {
      unsubProgress();
    };
  }, []);

  // Subscribe to exobiology mismatch (estimator vs verified genetic scan)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electron?.onExobiologyMismatch) return () => {};
    const unsub = window.electron.onExobiologyMismatch((data: unknown) => {
      if (data && typeof data === 'object' && 'systemName' in data && 'species' in data) {
        setExobiologyMismatch(data as ExobiologyMismatch);
      }
    });
    return () => {
      unsub();
    };
  }, []);

  // Show diagnostic if Electron preload bridge is missing
  if (bridgeMissing) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6">
        <h1 className="text-xl font-semibold mb-2">GalNetOps</h1>
        <p className="text-amber-400 mb-4">Preload bridge unavailable (window.electron is undefined)</p>
        <p className="text-slate-400 text-sm text-center max-w-md">
          The Electron preload script may have failed. Check DevTools console and main process logs.
          Try setting webPreferences.sandbox: false in src/main/index.ts for debugging.
        </p>
      </div>
    );
  }

  // Show setup wizard if no journal path configured
  if (!journalPath && !isLoading) {
    return (
      <div className="h-screen flex flex-col bg-surface">
        <TitleBar />
        <SetupWizard />
      </div>
    );
  }

  // Render the current view (lazy-loaded; Suspense fallback scopes loading)
  const renderView = () => {
    switch (currentView) {
      case 'route-history':
        return <RouteHistory />;
      case 'statistics':
        return <Statistics />;
      case 'codex':
        return <Codex />;
      case 'settings':
        return <Settings />;
      case 'explorer':
      default:
        return <ExplorerView />;
    }
  };

  const viewFallback = (
    <div className="flex-1 flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3 text-content-muted">
        <svg className="animate-spin h-8 w-8" fill="none" viewBox="0 0 24 24" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.638z" />
        </svg>
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-surface">
      <TitleBar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={viewFallback}>
          {renderView()}
        </Suspense>
      </main>
      
      {/* Auto-import progress indicator */}
      {importProgress && !importProgress.isComplete && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 dark:bg-slate-900 text-white px-4 py-2 z-50">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Importing journal history...
            </span>
            <span className="text-slate-400">
              {importProgress.progress} / {importProgress.total} files
            </span>
          </div>
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-500 transition-all duration-300"
              style={{ width: `${importProgress.total > 0 ? (importProgress.progress / importProgress.total) * 100 : 0}%` }}
            />
          </div>
          {importProgress.currentFile && (
            <div className="text-xs text-slate-400 mt-1 truncate">
              {importProgress.currentFile}
            </div>
          )}
        </div>
      )}
      
      {/* Import complete notification */}
      {importProgress?.isComplete && (
        <div className="fixed bottom-0 left-0 right-0 bg-green-600 dark:bg-green-700 text-white px-4 py-2 z-50">
          <div className="flex items-center gap-2 text-sm">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Journal history import complete!
          </div>
        </div>
      )}

      {/* Exobiology estimator mismatch – prompt to submit feedback (Phase 2, after 3/3 genetic scan) */}
      {exobiologyMismatch && (
        <div className="fixed top-12 left-0 right-0 bg-amber-600 dark:bg-amber-700 text-white px-4 py-3 z-[100] shadow-lg">
          <div className="max-w-4xl mx-auto flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">
                Exobiology estimate mismatch: {exobiologyMismatch.systemName} {exobiologyMismatch.bodyName}
              </p>
              <p className="text-amber-100 text-xs mt-0.5">
                Found: {exobiologyMismatch.species}
                {exobiologyMismatch.foundVariant ? ` ${exobiologyMismatch.foundVariant}` : ''}
                {exobiologyMismatch.estimatedVariant && exobiologyMismatch.reason === 'variant_mismatch' && (
                  <> · Estimated: {exobiologyMismatch.estimatedVariant}</>
                )}
                {exobiologyMismatch.reason === 'genus_not_estimated' && ' · Genus was not in our estimate'}
                {exobiologyMismatch.reason === 'species_not_estimated' && ' · Species was not in our estimate'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => {
                  const title = encodeURIComponent('Exobiology estimator mismatch');
                  const c = exobiologyMismatch.characteristics;
                  const charBlock =
                    c &&
                    `\n**Characteristics** (in case system not yet in EDSM):\n` +
                      `- Main Star Class: ${c.mainStarClass}\n` +
                      `- Body Type: ${c.bodyType}\n` +
                      `- Body Distance from Main Star: ${c.bodyDistanceLs != null ? `${c.bodyDistanceLs} Ls` : 'N/A'}\n` +
                      `- Planet Types in System: ${c.planetTypesInSystem}\n` +
                      `- Gravity: ${c.gravity != null ? `${c.gravity}g` : 'N/A'}\n` +
                      `- Temperature: ${c.temperature != null ? `${Math.round(c.temperature)} K` : 'N/A'}\n` +
                      `- Atmosphere: ${c.atmosphere ?? 'N/A'}\n` +
                      `- Volcanism: ${c.volcanism ?? 'N/A'}\n`;
                  const notVerifiedBlock =
                    exobiologyMismatch.speciesNotVerified?.length &&
                    `\n**Species not verified** (not scanned by CMDR): ${exobiologyMismatch.speciesNotVerified.join(', ')}\n`;
                  const body = encodeURIComponent(
                    `**System:** ${exobiologyMismatch.systemName}\n` +
                      `**Body:** ${exobiologyMismatch.bodyName}\n` +
                      `**Found:** ${exobiologyMismatch.species}${exobiologyMismatch.foundVariant ? ` ${exobiologyMismatch.foundVariant}` : ''}\n` +
                      `**Estimated:** ${exobiologyMismatch.estimatedVariant || 'N/A'}\n` +
                      `**Reason:** ${exobiologyMismatch.reason}` +
                      (notVerifiedBlock || '') +
                      (charBlock || '') +
                      `\n\nPlease describe what you observed. This helps us improve the wiki-derived estimator data.`
                  );
                  window.electron.openExternal(
                    `https://github.com/Ma77h3hac83r/GalNetOps/issues/new?title=${title}&body=${body}`
                  );
                  setExobiologyMismatch(null);
                }}
                className="px-3 py-1.5 text-sm font-medium bg-white text-amber-800 rounded hover:bg-amber-50 transition-colors"
              >
                Submit Report
              </button>
              <button
                onClick={() => setExobiologyMismatch(null)}
                className="p-1.5 rounded hover:bg-amber-500/50 transition-colors"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
