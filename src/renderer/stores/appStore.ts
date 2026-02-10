/** Zustand app store: current system, bodies, biologicals, EDSM state, settings (theme, value thresholds, zoom), UI state (view, details panel, collapsed nodes), and actions (set system, add/update body, fetch EDSM, etc.). */
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { System, CelestialBody, Biological, CommanderInfo } from '@shared/types';
import { convertEDSMBodyToCelestialBody, type EDSMBodyInfo } from '../utils/edsmUtils';
import { parseSystem, parseCelestialBody, parseCelestialBodyArray } from '../utils/boundarySchemas';

export type AppView = 'explorer' | 'route-history' | 'route-planner' | 'statistics' | 'codex' | 'settings';

// EDSM request state for tracking loading/results and cancelling stale requests
interface EDSMState {
  bodyCount: number | null;
  isLoading: boolean;
  isUnknown: boolean; // System not found in EDSM
  error: string | null;
  requestId: number; // For cancellation of stale requests
}

/** State data only (no actions). Used for initialState and reset. */
export interface AppStoreState {
  currentSystem: System | null;
  bodies: CelestialBody[];
  selectedBodyId: number | null;
  biologicals: Map<number, Biological[]>;
  edsm: EDSMState;
  journalPath: string | null;
  theme: 'light' | 'dark' | 'system' | 'elite';
  showFirstDiscoveryValues: boolean;
  edsmSpoilerFree: boolean;
  bioSignalsHighlightThreshold: number;
  planetHighlightCriteria: Record<
    string,
    {
      track?: boolean;
      atmosphere?: boolean | null;
      landable?: boolean | null;
      terraformable?: boolean | null;
      geological?: boolean | null;
      biological?: boolean | null;
    }
  >;
  defaultIconZoomIndex: number;
  defaultTextZoomIndex: number;
  isLoading: boolean;
  bodiesLoadError: string | null;
  detailsPanelOpen: boolean;
  detailsPanelWidth: number;
  routePlannerOpen: boolean;
  routePlannerPanelWidth: number;
  currentView: AppView;
  collapsedNodes: Map<number, Set<number>>;
  commanderInfo: CommanderInfo | null;
}

/** Returns fresh initial state (new Map refs each time). Use in create() and reset(). */
function getInitialState(): AppStoreState {
  return {
    currentSystem: null,
    bodies: [],
    selectedBodyId: null,
    biologicals: new Map(),
    edsm: {
      bodyCount: null,
      isLoading: false,
      isUnknown: false,
      error: null,
      requestId: 0,
    },
    journalPath: null,
    theme: 'system',
    showFirstDiscoveryValues: true,
    edsmSpoilerFree: false,
    bioSignalsHighlightThreshold: 2,
    planetHighlightCriteria: {},
    defaultIconZoomIndex: 2,
    defaultTextZoomIndex: 2,
    isLoading: true,
    bodiesLoadError: null,
    detailsPanelOpen: true,
    detailsPanelWidth: 320,
    routePlannerOpen: false,
    routePlannerPanelWidth: 320,
    currentView: 'explorer',
    collapsedNodes: new Map(),
    commanderInfo: null,
  };
}

/** Initial state for init/reset and tests. Read-only reference; reset() uses getInitialState() for fresh Maps. */
export const initialState: AppStoreState = getInitialState();

interface AppState extends AppStoreState {
  // Actions
  /** Accepts System | null or unknown (e.g. from IPC); validates and sets or ignores invalid data. */
  setCurrentSystem: (system: System | null | unknown) => void;
  addBody: (body: unknown) => void;
  updateBodyMapped: (bodyId: number) => void;
  updateBodyFootfalled: (bodyId: number) => void;
  /** Update bio/geo/human/thargoid signals for a body (e.g. after FSSBodySignals). Only applies if body is in current system. */
  updateBodySignals: (payload: {
    systemAddress: number;
    bodyId: number;
    bioSignals: number;
    geoSignals: number;
    humanSignals?: number;
    thargoidSignals?: number;
  }) => void;
  setSelectedBody: (bodyId: number | null) => void;
  setBiologicals: (bodyId: number, bios: Biological[]) => void;
  setJournalPath: (path: string | null) => void;
  setTheme: (theme: 'light' | 'dark' | 'system' | 'elite') => void;
  setShowFirstDiscoveryValues: (show: boolean) => void;
  setEdsmSpoilerFree: (enabled: boolean) => void;
  setBioSignalsHighlightThreshold: (v: number) => void;
  setPlanetHighlightCriteria: (v: AppStoreState['planetHighlightCriteria']) => void;
  setDefaultIconZoomIndex: (v: number) => void;
  setDefaultTextZoomIndex: (v: number) => void;
  setLoading: (loading: boolean) => void;
  toggleDetailsPanel: () => void;
  setDetailsPanelWidth: (width: number) => void;
  setRoutePlannerOpen: (open: boolean) => void;
  setRoutePlannerPanelWidth: (width: number) => void;
  clearBodies: () => void;
  setCurrentView: (view: AppView) => void;
  /** Toggle collapsed state for a node in the current system */
  toggleNodeCollapsed: (bodyId: number) => void;
  /** Expand all nodes in the current system */
  expandAllNodes: () => void;
  /** Collapse all nodes with children in the current system */
  collapseAllNodes: (bodyIdsWithChildren: number[]) => void;
  /** Check if a node is collapsed */
  isNodeCollapsed: (bodyId: number) => boolean;
  /** Fetch EDSM data for current system */
  fetchEdsmData: (systemName: string) => Promise<void>;
  /** Clear EDSM state */
  clearEdsmState: () => void;
  /** Set commander info from journal events (LoadGame, Rank, Progress, Reputation). */
  setCommanderInfo: (info: CommanderInfo | null) => void;
  /** Reset store to initialState (state only; use for init or full reset). */
  reset: () => void;
}

// Incrementing ID for EDSM requests so we can ignore outdated responses
let edsmRequestCounter = 0;

export const useAppStore = create<AppState>((set, get) => ({
  ...getInitialState(),

  reset: () => set(getInitialState()),

  setCurrentSystem: (system) => {
    get().clearEdsmState();
    if (system === null || system === undefined) {
      set({ currentSystem: null, bodies: [], selectedBodyId: null, bodiesLoadError: null });
      return;
    }
    const parsed = parseSystem(system);
    if (!parsed) {
      set({ currentSystem: null, bodies: [], selectedBodyId: null, bodiesLoadError: null });
      return;
    }
    set({ currentSystem: parsed, bodies: [], selectedBodyId: null, bodiesLoadError: null });

    if (parsed.id > 0) {
      const loadingForId = parsed.id;
      window.electron
        .getSystemBodies(loadingForId)
        .then((loaded) => {
          if (get().currentSystem?.id !== loadingForId) return;
          const list = parseCelestialBodyArray(loaded);
          set((state) => {
            const byId = new Map(state.bodies.map((b) => [b.bodyId, b]));
            for (const b of list) {
              if (!byId.has(b.bodyId)) byId.set(b.bodyId, b);
            }
            return { bodies: [...byId.values()].sort((a, b) => a.distanceLS - b.distanceLS), bodiesLoadError: null };
          });
        })
        .catch((err) => {
          if (get().currentSystem?.id !== loadingForId) return;
          const message = err instanceof Error ? err.message : 'Failed to load bodies';
          set({ bodiesLoadError: message });
        });
    }

    if (!get().edsmSpoilerFree) get().fetchEdsmData(parsed.name);
  },

  addBody: (body) => {
    const parsed = parseCelestialBody(body);
    if (!parsed) return;
    set((state) => {
      const existing = state.bodies.find(b => b.bodyId === parsed.bodyId);
      if (existing) {
        // If incoming is EDSM (id=0) and we have a DB body (id>0), keep DB id, signals, rawJson, and scan-related fields (DB has authoritative scan data)
        const merged =
          parsed.id === 0 && existing.id > 0
            ? {
                ...parsed,
                id: existing.id,
                systemId: existing.systemId,
                subType: parsed.subType || existing.subType,
                terraformable: existing.terraformable ?? parsed.terraformable,
                wasDiscovered: existing.wasDiscovered,
                wasMapped: existing.wasMapped,
                wasFootfalled: existing.wasFootfalled,
                discoveredByMe: existing.discoveredByMe,
                mappedByMe: existing.mappedByMe,
                footfalledByMe: existing.footfalledByMe,
                scanType: existing.scanType,
                scanValue: existing.scanValue,
                bioSignals: existing.bioSignals,
                geoSignals: existing.geoSignals,
                humanSignals: existing.humanSignals,
                thargoidSignals: existing.thargoidSignals,
                rawJson: existing.rawJson || parsed.rawJson,
              }
            : parsed;
        return {
          bodies: state.bodies.map(b =>
            b.bodyId === parsed.bodyId ? merged : b
          ),
        };
      }
      return { bodies: [...state.bodies, parsed] };
    });
  },

  updateBodyMapped: (bodyId) => {
    set((state) => ({
      bodies: state.bodies.map(b =>
        b.bodyId === bodyId
          ? { ...b, scanType: 'Mapped' as const, mappedByMe: true }
          : b
      ),
    }));
  },

  updateBodyFootfalled: (bodyId) => {
    set((state) => ({
      bodies: state.bodies.map(b =>
        b.bodyId === bodyId
          ? { ...b, footfalledByMe: true }
          : b
      ),
    }));
  },

  updateBodySignals: (payload) => {
    set((state) => {
      if (state.currentSystem?.systemAddress !== payload.systemAddress) return state;
      return {
        bodies: state.bodies.map((b) =>
          b.bodyId === payload.bodyId
            ? {
                ...b,
                bioSignals: payload.bioSignals,
                geoSignals: payload.geoSignals,
                humanSignals: payload.humanSignals ?? b.humanSignals,
                thargoidSignals: payload.thargoidSignals ?? b.thargoidSignals,
              }
            : b
        ),
      };
    });
  },

  setSelectedBody: (bodyId) => {
    set({ selectedBodyId: bodyId, detailsPanelOpen: bodyId !== null });
  },

  setBiologicals: (bodyId, bios) => {
    set((state) => {
      const newMap = new Map(state.biologicals);
      newMap.set(bodyId, bios);
      return { biologicals: newMap };
    });
  },

  setJournalPath: (path) => {
    set({ journalPath: path, isLoading: false });
  },

  setTheme: (theme) => {
    set({ theme });
    window.electron.setSettings('theme', theme);
  },

  setShowFirstDiscoveryValues: (show) => {
    set({ showFirstDiscoveryValues: show });
    window.electron.setSettings('showFirstDiscoveryValues', show);
  },

  setBioSignalsHighlightThreshold: (v) => {
    set({ bioSignalsHighlightThreshold: v });
    window.electron.setSettings('bioSignalsHighlightThreshold', v);
  },
  setPlanetHighlightCriteria: (v) => {
    set({ planetHighlightCriteria: v });
    window.electron.setSettings('planetHighlightCriteria', v);
  },
  setDefaultIconZoomIndex: (v) => {
    set({ defaultIconZoomIndex: v });
    window.electron.setSettings('defaultIconZoomIndex', v);
  },
  setDefaultTextZoomIndex: (v) => {
    set({ defaultTextZoomIndex: v });
    window.electron.setSettings('defaultTextZoomIndex', v);
  },
  setEdsmSpoilerFree: (enabled) => {
    const currentSystem = get().currentSystem;
    set({ edsmSpoilerFree: enabled });
    window.electron.setSettings('edsmSpoilerFree', enabled);
    if (currentSystem) {
      if (enabled) {
        set((state) => ({
          bodies: state.bodies.filter(b => b.id !== 0 && b.systemId !== 0),
        }));
        get().clearEdsmState();
      } else {
        get().fetchEdsmData(currentSystem.name);
        // Fire async EDSM body fetch in background (action stays synchronous; type remains () => void)
        void (async () => {
          try {
            const edsmBodies = await window.electron.edsmGetSystemBodies(currentSystem.name);
            if (edsmBodies?.bodies?.length) {
              if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) {
                console.log(`[Store] Loading ${edsmBodies.bodies.length} EDSM bodies for ${currentSystem.name}`);
              }
              edsmBodies.bodies.forEach((edsmBody: EDSMBodyInfo) => {
                const celestialBody = convertEDSMBodyToCelestialBody(edsmBody);
                get().addBody(celestialBody);
              });
            }
          } catch (err) {
            console.error('[Store] Failed to fetch EDSM bodies:', err);
          }
        })();
      }
    }
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  toggleDetailsPanel: () => {
    set((state) => ({ detailsPanelOpen: !state.detailsPanelOpen }));
  },

  setDetailsPanelWidth: (width) => {
    set({ detailsPanelWidth: Math.min(640, Math.max(240, width)) });
  },
  setRoutePlannerOpen: (open) => {
    set({ routePlannerOpen: open });
  },
  setRoutePlannerPanelWidth: (width) => {
    set({ routePlannerPanelWidth: Math.min(640, Math.max(240, width)) });
  },

  clearBodies: () => {
    set({ bodies: [], selectedBodyId: null });
  },

  setCurrentView: (view) => {
    set({ currentView: view });
  },

  toggleNodeCollapsed: (bodyId) => {
    const { currentSystem, collapsedNodes } = get();
    if (!currentSystem) return;

    const systemAddress = currentSystem.systemAddress;
    const newCollapsedNodes = new Map(collapsedNodes);
    
    // Get or create the set for this system
    const systemCollapsed = new Set(newCollapsedNodes.get(systemAddress) || []);
    
    // Toggle the collapsed state
    if (systemCollapsed.has(bodyId)) {
      systemCollapsed.delete(bodyId);
    } else {
      systemCollapsed.add(bodyId);
    }
    
    newCollapsedNodes.set(systemAddress, systemCollapsed);
    set({ collapsedNodes: newCollapsedNodes });
  },

  expandAllNodes: () => {
    const { currentSystem, collapsedNodes } = get();
    if (!currentSystem) return;

    const newCollapsedNodes = new Map(collapsedNodes);
    // Clear all collapsed nodes for this system
    newCollapsedNodes.set(currentSystem.systemAddress, new Set());
    set({ collapsedNodes: newCollapsedNodes });
  },

  collapseAllNodes: (bodyIdsWithChildren) => {
    const { currentSystem, collapsedNodes } = get();
    if (!currentSystem) return;

    const newCollapsedNodes = new Map(collapsedNodes);
    // Collapse all nodes that have children
    newCollapsedNodes.set(currentSystem.systemAddress, new Set(bodyIdsWithChildren));
    set({ collapsedNodes: newCollapsedNodes });
  },

  isNodeCollapsed: (bodyId) => {
    const { currentSystem, collapsedNodes } = get();
    if (!currentSystem) return false;

    const systemCollapsed = collapsedNodes.get(currentSystem.systemAddress);
    return systemCollapsed?.has(bodyId) ?? false;
  },

  fetchEdsmData: async (systemName) => {
    // Generate a new request ID to track this request
    const requestId = ++edsmRequestCounter;
    
    set({
      edsm: {
        bodyCount: null,
        isLoading: true,
        isUnknown: false,
        error: null,
        requestId,
      },
    });

    try {
      const bodyCount = await window.electron.edsmGetSystemBodyCount(systemName);
      
      // Check if this request is still current (not cancelled by newer request)
      if (get().edsm.requestId !== requestId) {
        return; // Stale request, ignore result
      }

      if (bodyCount === null) {
        // System not found in EDSM
        set({
          edsm: {
            bodyCount: null,
            isLoading: false,
            isUnknown: true,
            error: null,
            requestId,
          },
        });
      } else {
        set({
          edsm: {
            bodyCount,
            isLoading: false,
            isUnknown: false,
            error: null,
            requestId,
          },
        });
      }
    } catch (error) {
      // Check if this request is still current
      if (get().edsm.requestId !== requestId) {
        return;
      }

      set({
        edsm: {
          bodyCount: null,
          isLoading: false,
          isUnknown: false,
          error: error instanceof Error ? error.message : 'Failed to fetch EDSM data',
          requestId,
        },
      });
    }
  },

  setCommanderInfo: (info) => {
    set({ commanderInfo: info });
  },

  clearEdsmState: () => {
    // Increment request ID to invalidate any pending requests
    edsmRequestCounter++;
    set({
      edsm: {
        bodyCount: null,
        isLoading: false,
        isUnknown: false,
        error: null,
        requestId: edsmRequestCounter,
      },
    });
  },
}));

// Selector hooks for specific pieces of state
export const useCurrentSystem = () => useAppStore((state) => state.currentSystem);
export const useBodies = () => useAppStore((state) => state.bodies);
export const useBodiesLoadError = () => useAppStore((state) => state.bodiesLoadError);
export const useSelectedBody = () => {
  const bodies = useAppStore((state) => state.bodies);
  const selectedId = useAppStore((state) => state.selectedBodyId);
  return bodies.find((b) => b.bodyId === selectedId) ?? null;
};
export const useThemeState = () => useAppStore((state) => state.theme);
export const useCurrentView = () => useAppStore((state) => state.currentView);
/** Stable empty set for useCollapsedNodes when system has no collapsed nodes (avoids new Set() every render). */
const EMPTY_COLLAPSED_SET = new Set<number>();

export const useEdsmState = () => useAppStore(useShallow((state) => state.edsm));
export const useEdsmSpoilerFree = () => useAppStore((state) => state.edsmSpoilerFree);
export const useCommanderInfo = () => useAppStore((state) => state.commanderInfo);

// Collapse state selectors
export const useCollapsedNodes = (): Set<number> => {
  const currentSystem = useAppStore((state) => state.currentSystem);
  const collapsedNodes = useAppStore((state) => state.collapsedNodes);
  if (!currentSystem) return EMPTY_COLLAPSED_SET;
  return collapsedNodes.get(currentSystem.systemAddress) ?? EMPTY_COLLAPSED_SET;
};
