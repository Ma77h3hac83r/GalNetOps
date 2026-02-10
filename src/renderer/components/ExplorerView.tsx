/** Explorer tab: system header, system map (with icon/text zoom from store defaults and reset), and body details panel; fetches EDSM body count when system changes. */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { parseBiologicalArray } from '../utils/boundarySchemas';
import type { Biological } from '@shared/types';
import SystemHeader from './SystemHeader';
import { SystemMap, ICON_SCALE_STEPS, TEXT_SCALE_STEPS } from './SystemMap';
import { BodyDetails } from './BodyDetails';


function ExplorerView() {
  const currentSystem = useAppStore((state) => state.currentSystem);
  const bodies = useAppStore((state) => state.bodies);
  const selectedBodyId = useAppStore((state) => state.selectedBodyId);
  const defaultIconZoomIndex = useAppStore((state) => state.defaultIconZoomIndex);
  const defaultTextZoomIndex = useAppStore((state) => state.defaultTextZoomIndex);

  // Bodies that need genetic scan verification: bio signals + DSS (mapped or genuses) + incomplete scans
  const bodiesNeedingVerification = useMemo(() => {
    return bodies.filter((b) => {
      if ((b.bioSignals ?? 0) <= 0) return false;
      const isDss = b.scanType === 'Mapped' || (() => {
        try {
          const d = b.rawJson ? JSON.parse(b.rawJson) : null;
          const g = d?.Genuses ?? d?.genuses;
          return Array.isArray(g) && g.length > 0;
        } catch {
          return false;
        }
      })();
      if (!isDss) return false;
      return true;
    });
  }, [bodies]);

  const [biologicalsByBodyId, setBiologicalsByBodyId] = useState<Map<number, Biological[]>>(new Map());

  const bodyIdsNeedingVerification = useMemo(
    () => bodiesNeedingVerification.filter((b) => b.id > 0).map((b) => b.id),
    [bodiesNeedingVerification]
  );

  // Fetch biologicals for all bodies that need verification
  useEffect(() => {
    if (bodyIdsNeedingVerification.length === 0) {
      setBiologicalsByBodyId(new Map());
      return;
    }
    Promise.all(
      bodyIdsNeedingVerification.map((id) =>
        window.electron.getBodyBiologicals(id).then((raw) => [id, [...(parseBiologicalArray(raw) ?? [])]] as const).catch(() => [id, []] as const)
      )
    ).then((results) => {
      const next = new Map<number, Biological[]>();
      for (const [id, bios] of results) next.set(id, [...bios]);
      setBiologicalsByBodyId(next);
    });
  }, [bodyIdsNeedingVerification]);

  // Refetch biologicals when bio-scanned
  useEffect(() => {
    if (!window.electron?.onBioScanned || bodyIdsNeedingVerification.length === 0) return () => {};
    const ids = new Set(bodyIdsNeedingVerification);
    const unsub = window.electron.onBioScanned((bio: unknown) => {
      if (bio != null && typeof bio === 'object' && 'bodyId' in bio) {
        const bid = (bio as { bodyId: number }).bodyId;
        if (ids.has(bid)) {
          window.electron.getBodyBiologicals(bid).then((raw) => {
            setBiologicalsByBodyId((prev) => {
              const next = new Map(prev);
              next.set(bid, [...(parseBiologicalArray(raw) ?? [])]);
              return next;
            });
          }).catch(() => {});
        }
      }
    });
    return () => { unsub(); };
  }, [bodyIdsNeedingVerification]);

  const bodiesWithIncompleteScans = useMemo(() => {
    return bodiesNeedingVerification.filter((b) => {
      const bios = biologicalsByBodyId.get(b.id) ?? [];
      const scannedCount = bios.filter((x) => x.scanProgress >= 1).length;
      const bioCount = b.bioSignals ?? 0;
      // Incomplete: no biologicals yet, or not all species have at least 1 scan (players may skip low-value 3/3)
      return bios.length === 0 || scannedCount < Math.max(1, bioCount);
    });
  }, [bodiesNeedingVerification, biologicalsByBodyId]);

  const showPhase1Banner = bodiesWithIncompleteScans.length > 0;

  const [iconScaleIndex, setIconScaleIndex] = useState(defaultIconZoomIndex);
  const [textScaleIndex, setTextScaleIndex] = useState(defaultTextZoomIndex);
  const [legendVisible, setLegendVisible] = useState(true);
  const iconScale = ICON_SCALE_STEPS[iconScaleIndex];
  const textScale = TEXT_SCALE_STEPS[textScaleIndex];

  useEffect(() => {
    setIconScaleIndex((prev) => {
      const idx = Math.min(Math.max(defaultIconZoomIndex, 0), ICON_SCALE_STEPS.length - 1);
      return prev !== idx ? idx : prev;
    });
    setTextScaleIndex((prev) => {
      const idx = Math.min(Math.max(defaultTextZoomIndex, 0), TEXT_SCALE_STEPS.length - 1);
      return prev !== idx ? idx : prev;
    });
  }, [defaultIconZoomIndex, defaultTextZoomIndex]);

  const handleIconScaleUp = useCallback(() => {
    setIconScaleIndex((prev) => Math.min(prev + 1, ICON_SCALE_STEPS.length - 1));
  }, []);
  const handleIconScaleDown = useCallback(() => {
    setIconScaleIndex((prev) => Math.max(prev - 1, 0));
  }, []);
  const handleTextScaleUp = useCallback(() => {
    setTextScaleIndex((prev) => Math.min(prev + 1, TEXT_SCALE_STEPS.length - 1));
  }, []);
  const handleTextScaleDown = useCallback(() => {
    setTextScaleIndex((prev) => Math.max(prev - 1, 0));
  }, []);
  const zoomAndLegend = (
    <div className="flex flex-col gap-3 flex-shrink-0 text-[13.5px]">
      {/* Zoom / display controls - above legend */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 w-12">Icons</span>
          <button
            onClick={handleIconScaleDown}
            disabled={iconScaleIndex === 0}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Decrease icon size"
            aria-label="Decrease icon size"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-slate-500 min-w-[36px] text-center">{Math.round((iconScale ?? 1) * 100)}%</span>
          <button
            onClick={handleIconScaleUp}
            disabled={iconScaleIndex === ICON_SCALE_STEPS.length - 1}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Increase icon size"
            aria-label="Increase icon size"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 w-12">Text</span>
          <button
            onClick={handleTextScaleDown}
            disabled={textScaleIndex === 0}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Decrease text size"
            aria-label="Decrease text size"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-slate-500 min-w-[36px] text-center">{Math.round((textScale ?? 1) * 100)}%</span>
          <button
            onClick={handleTextScaleUp}
            disabled={textScaleIndex === TEXT_SCALE_STEPS.length - 1}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Increase text size"
            aria-label="Increase text size"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Legend - below zoom: Column 1 = FD/FM/FF/S/M/values, Column 2 = L/A/T/G/B/Hu/Th/Ga */}
      <div className="text-[13.5px] text-slate-600 dark:text-slate-400">
        <button
          type="button"
          onClick={() => setLegendVisible((v) => !v)}
          className="flex items-center gap-1.5 w-full text-left font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 py-0.5 -mx-0.5 px-0.5 rounded"
          title={legendVisible ? 'Hide legend' : 'Show legend'}
        >
          Legend
          {legendVisible ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          )}
        </button>
        {legendVisible && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span><span className="font-bold text-discovered">FD</span> First Discovered</span>
          <span><span className="font-bold text-landable">L</span> Landable</span>
          <span><span className="font-bold text-mapped">FM</span> First Mapped</span>
          <span><span className="font-bold text-atmosphere">A</span> Atmosphere</span>
          <span><span className="font-bold text-footfall">FF</span> First Footfall</span>
          <span><span className="font-bold text-biological">T</span> Terraformable</span>
          <span><span className="font-bold text-dss">S</span> FSS Scanned</span>
          <span><span className="font-bold text-geological">G</span> Geological</span>
          <span><span className="font-bold text-mapped-alt">M</span> DSS Mapped</span>
          <span><span className="font-bold text-legend-bio">B</span> Biological</span>
          <span><span className="font-bold text-human">Hu</span> Human Signals</span>
          <span><span className="font-bold text-thargoid">Th</span> Thargoid Signals</span>
          <span><span className="font-bold text-guardian">Ga</span> Guardian Signals</span>
        </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <SystemHeader system={currentSystem} />
      {showPhase1Banner && (
        <div className="shrink-0 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Exobiology Estimator Database Mismatch: Please complete a full genetic scan of {bodiesWithIncompleteScans.length === 1 ? (
              <>body <span className="font-semibold">{bodiesWithIncompleteScans[0]!.name}</span></>
            ) : (
              <>bodies <span className="font-semibold">{bodiesWithIncompleteScans.map((b) => b.name).join(', ')}</span></>
            )} to ensure we update our database appropriately.
          </p>
        </div>
      )}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden p-4 min-h-0 relative">
            <SystemMap iconScale={iconScale ?? 1} textScale={textScale ?? 1} />
            {/* Zoom and legend in bottom right of map area - above map content */}
            <div className="absolute bottom-3 right-3 z-10 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-600 shadow-sm">
              {zoomAndLegend}
            </div>
          </div>
          <BodyDetails />
        </div>
      </div>
    </>
  );
}

export default ExplorerView;
