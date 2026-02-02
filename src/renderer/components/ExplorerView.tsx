/** Explorer tab: system header, system map (with icon/text zoom from store defaults and reset), and body details panel; fetches EDSM body count when system changes. */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAppStore } from '../stores/appStore';
import { parseBiologicalArray } from '../utils/boundarySchemas';
import type { Biological } from '@shared/types';
import SystemHeader from './SystemHeader';
import SystemMap, { ICON_SCALE_STEPS, TEXT_SCALE_STEPS } from './SystemMap';
import BodyDetails from './BodyDetails';
import RoutePlannerPanel from './RoutePlannerPanel';

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
  }, [bodyIdsNeedingVerification.join(',')]);

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
  }, [bodyIdsNeedingVerification.join(',')]);

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
  const handleResetScales = useCallback(() => {
    setIconScaleIndex(defaultIconZoomIndex);
    setTextScaleIndex(defaultTextZoomIndex);
  }, [defaultIconZoomIndex, defaultTextZoomIndex]);

  const rightContent = (
    <div className="flex items-start gap-4 flex-shrink-0">
      {/* Zoom / display controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-500 dark:text-slate-400 w-10">Icons</span>
          <button
            onClick={handleIconScaleDown}
            disabled={iconScaleIndex === 0}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Decrease icon size"
            aria-label="Decrease icon size"
          >
            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-[9px] text-slate-500 min-w-[32px] text-center">{Math.round((iconScale ?? 1) * 100)}%</span>
          <button
            onClick={handleIconScaleUp}
            disabled={iconScaleIndex === ICON_SCALE_STEPS.length - 1}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Increase icon size"
            aria-label="Increase icon size"
          >
            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-slate-500 dark:text-slate-400 w-10">Text</span>
          <button
            onClick={handleTextScaleDown}
            disabled={textScaleIndex === 0}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Decrease text size"
            aria-label="Decrease text size"
          >
            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="text-[9px] text-slate-500 min-w-[32px] text-center">{Math.round((textScale ?? 1) * 100)}%</span>
          <button
            onClick={handleTextScaleUp}
            disabled={textScaleIndex === TEXT_SCALE_STEPS.length - 1}
            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Increase text size"
            aria-label="Increase text size"
          >
            <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleResetScales}
          className="text-[8px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-left"
          title="Reset to defaults"
          aria-label="Reset zoom to defaults"
        >
          Reset
        </button>
      </div>

      {/* Legend — colors from theme (tailwind.config.js) */}
      <div className="text-[9px] text-slate-600 dark:text-slate-400">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span><span className="font-bold text-valuable">$$$</span> High Value</span>
          <span><span className="font-bold text-value-medium">$</span> Medium Value</span>
          <span><span className="font-bold text-legend-bio">B</span> Biological</span>
          <span><span className="font-bold text-geological">G</span> Geological</span>
          <span><span className="font-bold text-human">Hu</span> Human</span>
          <span><span className="font-bold text-guardian">Ga</span> Guardian</span>
          <span><span className="font-bold text-thargoid">Th</span> Thargoid</span>
          <span><span className="font-bold text-landable">L</span> Landable</span>
          <span><span className="font-bold text-biological">T</span> Terraformable</span>
          <span><span className="font-bold text-atmosphere">A</span> Atmosphere</span>
          <span><span className="font-bold text-discovered">FD</span> First Discovered</span>
          <span><span className="font-bold text-mapped">FM</span> First Mapped</span>
          <span><span className="font-bold text-dss">S</span> DSS Scanned</span>
          <span><span className="font-bold text-mapped-alt">M</span> Mapped</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SystemHeader system={currentSystem} rightContent={rightContent} />
      {showPhase1Banner && bodiesWithIncompleteScans.length > 0 && (
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
        <RoutePlannerPanel />
        <div className="flex-1 flex overflow-hidden min-w-0">
          <div className="flex-1 overflow-hidden p-4 min-h-0">
            <SystemMap iconScale={iconScale ?? 1} textScale={textScale ?? 1} />
          </div>
          <BodyDetails />
        </div>
      </div>
    </>
  );
}

export default ExplorerView;
