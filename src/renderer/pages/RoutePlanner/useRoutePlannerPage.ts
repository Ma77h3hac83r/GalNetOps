/** Hook: Route Planner page state — waypoints, POIs, EDSM/visited checks, reorder, CRUD, cross-panel prefill. */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { loadWaypoints, saveWaypoints, loadPois, savePois, loadCustomCategories, saveCustomCategories } from './storage';
import { findGalacticRegion } from '@shared/galacticRegions';
import { POI_CATEGORIES } from './constants';
import type { Waypoint, PointOfInterest } from './types';

/** Extract leading star-class letter(s) from a sub_type like "K (Yellow-Orange) Star". */
function formatStarType(subType: string | null | undefined): string | null {
  if (!subType) return null;
  const match = subType.trim().match(/^([A-Za-z0-9]+)/);
  return match?.[1]?.toUpperCase() ?? null;
}

export function useRoutePlannerPage() {
  // ── Waypoints ──────────────────────────────────────────
  const [waypoints, setWaypoints] = useState<Waypoint[]>(loadWaypoints);
  const [waypointInput, setWaypointInput] = useState('');
  const [isFetchingWaypoints, setIsFetchingWaypoints] = useState(false);
  const [draggedWaypointIndex, setDraggedWaypointIndex] = useState<number | null>(null);
  const [editingWaypointIndex, setEditingWaypointIndex] = useState<number | null>(null);
  const [editingWaypointValue, setEditingWaypointValue] = useState('');
  const editingWaypointRef = useRef('');
  editingWaypointRef.current = editingWaypointValue;
  const waypointEditInputRef = useRef<HTMLInputElement>(null);
  const [copiedWaypointIndex, setCopiedWaypointIndex] = useState<number | null>(null);

  // Persist waypoints on change
  useEffect(() => {
    saveWaypoints(waypoints);
  }, [waypoints]);

  // Add one or more waypoints (supports multi-line paste)
  const addWaypoints = useCallback((text: string) => {
    const names = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) return;
    setWaypoints((prev) => [
      ...prev,
      ...names.map((name) => ({
        name,
        inEdsm: null,
        visited: null,
        starType: null,
        poiName: '',
        notes: '',
      })),
    ]);
    setWaypointInput('');
  }, []);

  const handleWaypointKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addWaypoints(waypointInput);
      }
    },
    [addWaypoints, waypointInput]
  );

  const removeWaypoint = useCallback((index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAllWaypoints = useCallback(() => {
    setWaypoints([]);
  }, []);

  const reorderWaypoints = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setWaypoints((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (moved) next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const startEditingWaypoint = useCallback((index: number, currentName: string) => {
    setEditingWaypointIndex(index);
    setEditingWaypointValue(currentName);
    setTimeout(() => waypointEditInputRef.current?.focus(), 0);
  }, []);

  const commitWaypointEdit = useCallback((index: number) => {
    const newName = editingWaypointRef.current.trim();
    if (newName === '' || newName === waypoints[index]?.name) {
      setEditingWaypointIndex(null);
      setEditingWaypointValue('');
      return;
    }
    setWaypoints((prev) =>
      prev.map((w, i) =>
        i === index
          ? { ...w, name: newName, inEdsm: null, visited: null, starType: null }
          : w
      )
    );
    setEditingWaypointIndex(null);
    setEditingWaypointValue('');
  }, [waypoints]);

  const cancelWaypointEdit = useCallback(() => {
    setEditingWaypointIndex(null);
    setEditingWaypointValue('');
  }, []);

  const updateWaypointNotes = useCallback((index: number, notes: string) => {
    setWaypoints((prev) =>
      prev.map((w, i) => (i === index ? { ...w, notes } : w))
    );
  }, []);

  // Copy system name to clipboard
  const handleCopySystemName = useCallback((index: number, name: string) => {
    navigator.clipboard.writeText(name).then(
      () => {
        setCopiedWaypointIndex(index);
        setTimeout(() => setCopiedWaypointIndex(null), 2000);
      },
      () => {}
    );
  }, []);

  // Open EDSM system page in external browser
  const handleOpenEdsmPage = useCallback(async (systemName: string) => {
    if (!systemName || !window.electron?.openExternal) return;
    const nameForUrl = systemName.replace(/ /g, '+');
    try {
      const edsmSystem = await window.electron.edsmGetSystem(systemName);
      const edsmId =
        edsmSystem && typeof (edsmSystem as { id?: number }).id === 'number'
          ? (edsmSystem as { id: number }).id
          : null;
      const url =
        edsmId != null
          ? `https://www.edsm.net/en/system/id/${edsmId}/name/${nameForUrl}`
          : `https://www.edsm.net/en/system/bodies/name/${encodeURIComponent(systemName)}`;
      window.electron.openExternal(url);
    } catch {
      window.electron.openExternal(
        `https://www.edsm.net/en/system/bodies/name/${encodeURIComponent(systemName)}`
      );
    }
  }, []);

  // Fetch EDSM / visited / star type for all waypoints
  const waypointNames = waypoints.map((w) => w.name);
  const fetchKey = waypointNames.length > 0 ? [...waypointNames].sort().join('\n') : '';

  useEffect(() => {
    if (waypoints.length === 0) return;
    let cancelled = false;
    setIsFetchingWaypoints(true);

    const run = async () => {
      const results = await Promise.all(
        waypoints.map(async (wp) => {
          if (cancelled) return wp;
          try {
            const [edsmResult, dbResult] = await Promise.all([
              window.electron.edsmGetSystem(wp.name).catch(() => null),
              window.electron.getSystemByName(wp.name).catch(() => null),
            ]);
            if (cancelled) return wp;

            const inEdsm = edsmResult != null && Object.keys(edsmResult).length > 0;
            const visited = dbResult != null;

            // Resolve star type: prefer local DB bodies, fallback to EDSM primaryStar
            let starType: string | null = null;
            if (visited && dbResult && typeof (dbResult as { id?: number }).id === 'number') {
              try {
                const bodies = await window.electron.getSystemBodies(
                  (dbResult as { id: number }).id
                );
                if (Array.isArray(bodies) && bodies.length > 0) {
                  const star = bodies.find(
                    (b: { bodyType?: string }) => b.bodyType === 'Star'
                  );
                  if (star && typeof (star as { subType?: string }).subType === 'string') {
                    starType = formatStarType((star as { subType: string }).subType);
                  }
                }
              } catch {
                // ignore body fetch failure
              }
            }
            if (
              !starType &&
              inEdsm &&
              edsmResult &&
              typeof edsmResult === 'object' &&
              'primaryStar' in edsmResult
            ) {
              const ps = (edsmResult as { primaryStar?: { type?: string } }).primaryStar;
              if (ps?.type) {
                starType = formatStarType(ps.type);
              }
            }

            return { ...wp, inEdsm, visited, starType };
          } catch {
            return wp;
          }
        })
      );
      if (!cancelled) {
        setWaypoints(results);
        setIsFetchingWaypoints(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchKey]);

  // ── Points of Interest ─────────────────────────────────
  const [pois, setPois] = useState<PointOfInterest[]>(loadPois);
  const [poiSearch, setPoiSearch] = useState('');

  // New POI form state
  const [newPoiSystem, setNewPoiSystem] = useState('');
  const [newPoiBody, setNewPoiBody] = useState('');
  const [newPoiLabel, setNewPoiLabel] = useState('');
  const [newPoiCategory, setNewPoiCategory] = useState<string>('Other');

  // ── Custom categories ──────────────────────────────────
  const [customCategories, setCustomCategories] = useState<string[]>(loadCustomCategories);

  // Persist custom categories
  useEffect(() => {
    saveCustomCategories(customCategories);
  }, [customCategories]);

  /** Full category list: predefined + custom (deduplicated). */
  const allCategories = useMemo(() => {
    const predefined = [...POI_CATEGORIES] as string[];
    const merged = [...predefined];
    for (const c of customCategories) {
      if (!merged.includes(c)) merged.push(c);
    }
    return merged;
  }, [customCategories]);

  /** Add a new custom category (no-op if it already exists). */
  const addCustomCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const predefined = [...POI_CATEGORIES] as string[];
    if (predefined.includes(trimmed)) return; // already built-in
    setCustomCategories((prev) => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  }, []);

  /** Remove a custom category. */
  const removeCustomCategory = useCallback((name: string) => {
    setCustomCategories((prev) => prev.filter((c) => c !== name));
  }, []);
  const [newPoiNotes, setNewPoiNotes] = useState('');
  const poiLabelInputRef = useRef<HTMLInputElement>(null);
  const [editingPoiId, setEditingPoiId] = useState<string | null>(null);
  const [copiedPoiId, setCopiedPoiId] = useState<string | null>(null);

  /** Pre-fill the POI form with a system name and focus the label input. */
  const prefillPoiForSystem = useCallback((systemName: string) => {
    setEditingPoiId(null);
    setNewPoiSystem(systemName);
    setNewPoiBody('');
    setNewPoiLabel('');
    setNewPoiCategory('Other');
    setNewPoiNotes('');
    // Focus the label field after React re-renders
    setTimeout(() => poiLabelInputRef.current?.focus(), 0);
  }, []);

  /** Load a POI into the form for editing. */
  const startEditingPoi = useCallback((poi: PointOfInterest) => {
    setEditingPoiId(poi.id);
    setNewPoiSystem(poi.systemName);
    setNewPoiBody(poi.bodyName);
    setNewPoiLabel(poi.label);
    setNewPoiCategory(poi.category);
    setNewPoiNotes(poi.notes);
    setTimeout(() => poiLabelInputRef.current?.focus(), 0);
  }, []);

  /** Cancel editing and clear the form. */
  const cancelEditingPoi = useCallback(() => {
    setEditingPoiId(null);
    setNewPoiSystem('');
    setNewPoiBody('');
    setNewPoiLabel('');
    setNewPoiCategory('Other');
    setNewPoiNotes('');
  }, []);

  /** Copy POI system name to clipboard. */
  const handleCopyPoiSystemName = useCallback((poiId: string, name: string) => {
    navigator.clipboard.writeText(name).then(
      () => {
        setCopiedPoiId(poiId);
        setTimeout(() => setCopiedPoiId(null), 2000);
      },
      () => {}
    );
  }, []);

  // Persist POIs on change
  useEffect(() => {
    savePois(pois);
  }, [pois]);

  // Build POI lookup: system name (lower) -> first matching POI label
  const poiBySystem = useMemo(() => {
    const map = new Map<string, string>();
    for (const poi of pois) {
      const key = poi.systemName.trim().toLowerCase();
      if (key && !map.has(key)) {
        map.set(key, poi.label);
      }
    }
    return map;
  }, [pois]);

  // Sync POI names into waypoints when POI list changes
  useEffect(() => {
    setWaypoints((prev) => {
      let changed = false;
      const next = prev.map((wp) => {
        const poiName = poiBySystem.get(wp.name.trim().toLowerCase()) ?? '';
        if (wp.poiName !== poiName) {
          changed = true;
          return { ...wp, poiName };
        }
        return wp;
      });
      return changed ? next : prev;
    });
  }, [poiBySystem]);

  const addOrUpdatePoi = useCallback(() => {
    const systemName = newPoiSystem.trim();
    const label = newPoiLabel.trim();
    if (!systemName || !label) return;

    if (editingPoiId) {
      // Update existing POI
      setPois((prev) =>
        prev.map((p) => {
          if (p.id !== editingPoiId) return p;
          const systemChanged = p.systemName.toLowerCase() !== systemName.toLowerCase();
          return {
            ...p,
            systemName,
            bodyName: newPoiBody.trim(),
            label,
            category: newPoiCategory,
            notes: newPoiNotes.trim(),
            // Re-resolve star/sector if system changed
            starType: systemChanged ? null : p.starType,
            galacticSector: systemChanged ? null : p.galacticSector,
          };
        })
      );
      setEditingPoiId(null);
    } else {
      // Add new POI
      const poi: PointOfInterest = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        systemName,
        bodyName: newPoiBody.trim(),
        label,
        category: newPoiCategory,
        notes: newPoiNotes.trim(),
        starType: null,
        galacticSector: null,
      };
      setPois((prev) => [...prev, poi]);
    }

    // Reset form
    setNewPoiSystem('');
    setNewPoiBody('');
    setNewPoiLabel('');
    setNewPoiCategory('Other');
    setNewPoiNotes('');
  }, [newPoiSystem, newPoiBody, newPoiLabel, newPoiCategory, newPoiNotes, editingPoiId]);

  // Fetch star type and galactic sector for POIs that haven't been resolved yet
  const unresolvedPoiIds = pois
    .filter((p) => p.starType === null || p.galacticSector === null)
    .map((p) => p.id)
    .join(',');

  useEffect(() => {
    const toResolve = pois.filter(
      (p) => p.starType === null || p.galacticSector === null
    );
    if (toResolve.length === 0) return;
    let cancelled = false;

    const run = async () => {
      // Deduplicate system names to avoid redundant fetches
      const systemNames = [...new Set(toResolve.map((p) => p.systemName))];
      const systemData = new Map<
        string,
        { starType: string | null; galacticSector: string | null }
      >();

      await Promise.all(
        systemNames.map(async (name) => {
          if (cancelled) return;
          let starType: string | null = null;
          let galacticSector: string | null = null;

          try {
            const [edsmResult, dbResult] = await Promise.all([
              window.electron.edsmGetSystem(name).catch(() => null),
              window.electron.getSystemByName(name).catch(() => null),
            ]);
            if (cancelled) return;

            const inEdsm = edsmResult != null && Object.keys(edsmResult).length > 0;
            const visited = dbResult != null;

            // Star type from local DB bodies or EDSM
            if (visited && dbResult && typeof (dbResult as { id?: number }).id === 'number') {
              try {
                const bodies = await window.electron.getSystemBodies(
                  (dbResult as { id: number }).id
                );
                if (Array.isArray(bodies) && bodies.length > 0) {
                  const star = bodies.find(
                    (b: { bodyType?: string }) => b.bodyType === 'Star'
                  );
                  if (star && typeof (star as { subType?: string }).subType === 'string') {
                    starType = formatStarType((star as { subType: string }).subType);
                  }
                }
              } catch {
                // ignore
              }
            }
            if (!starType && inEdsm && edsmResult && typeof edsmResult === 'object' && 'primaryStar' in edsmResult) {
              const ps = (edsmResult as { primaryStar?: { type?: string } }).primaryStar;
              if (ps?.type) starType = formatStarType(ps.type);
            }

            // Galactic sector from coordinates
            // Try local DB system coords first
            if (visited && dbResult && typeof dbResult === 'object') {
              const sys = dbResult as { starPosX?: number; starPosY?: number; starPosZ?: number };
              if (typeof sys.starPosX === 'number' && typeof sys.starPosZ === 'number') {
                const region = findGalacticRegion(sys.starPosX, sys.starPosY ?? 0, sys.starPosZ);
                if (region?.name) galacticSector = region.name;
              }
            }
            // Fallback to EDSM coords
            if (!galacticSector && inEdsm && edsmResult && typeof edsmResult === 'object' && 'coords' in edsmResult) {
              const coords = (edsmResult as { coords?: { x?: number; y?: number; z?: number } }).coords;
              if (typeof coords?.x === 'number' && typeof coords?.z === 'number') {
                const region = findGalacticRegion(coords.x, coords.y ?? 0, coords.z);
                if (region?.name) galacticSector = region.name;
              }
            }
          } catch {
            // ignore
          }

          systemData.set(name, {
            starType: starType ?? '',
            galacticSector: galacticSector ?? '',
          });
        })
      );

      if (!cancelled) {
        setPois((prev) =>
          prev.map((p) => {
            const data = systemData.get(p.systemName);
            if (!data) return p;
            if (p.starType !== null && p.galacticSector !== null) return p;
            return {
              ...p,
              starType: p.starType ?? (data.starType || null),
              galacticSector: p.galacticSector ?? (data.galacticSector || null),
            };
          })
        );
      }
    };

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unresolvedPoiIds]);

  const removePoi = useCallback((id: string) => {
    setPois((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAllPois = useCallback(() => {
    setPois([]);
  }, []);

  // Filtered POIs for display
  const filteredPois = poiSearch.trim()
    ? pois.filter((p) => {
        const q = poiSearch.trim().toLowerCase();
        return (
          p.systemName.toLowerCase().includes(q) ||
          p.bodyName.toLowerCase().includes(q) ||
          p.label.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.notes.toLowerCase().includes(q)
        );
      })
    : pois;

  return {
    // Waypoints
    waypoints,
    waypointInput,
    setWaypointInput,
    isFetchingWaypoints,
    draggedWaypointIndex,
    setDraggedWaypointIndex,
    editingWaypointIndex,
    editingWaypointValue,
    setEditingWaypointValue,
    waypointEditInputRef,
    copiedWaypointIndex,
    addWaypoints,
    handleWaypointKeyDown,
    removeWaypoint,
    clearAllWaypoints,
    reorderWaypoints,
    startEditingWaypoint,
    commitWaypointEdit,
    cancelWaypointEdit,
    updateWaypointNotes,
    handleCopySystemName,
    handleOpenEdsmPage,
    // POIs
    pois,
    filteredPois,
    poiSearch,
    setPoiSearch,
    newPoiSystem,
    setNewPoiSystem,
    newPoiBody,
    setNewPoiBody,
    newPoiLabel,
    setNewPoiLabel,
    newPoiCategory,
    setNewPoiCategory,
    newPoiNotes,
    setNewPoiNotes,
    addOrUpdatePoi,
    removePoi,
    clearAllPois,
    poiLabelInputRef,
    prefillPoiForSystem,
    editingPoiId,
    startEditingPoi,
    cancelEditingPoi,
    copiedPoiId,
    handleCopyPoiSystemName,
    allCategories,
    addCustomCategory,
    removeCustomCategory,
    customCategories,
  };
}
