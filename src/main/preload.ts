/** Preload script: exposes a type-safe electronAPI to the renderer via contextBridge (window controls, settings, DB, EDSM, journal events, backfill). */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type-safe API exposed to renderer (invoke = request/response, on = subscribe to main→renderer events)
const electronAPI = {
  // Window controls (send to main)
  minimize: () => ipcRenderer.send('app:minimize'),
  maximize: () => ipcRenderer.send('app:maximize'),
  close: () => ipcRenderer.send('app:close'),

  // App info
  getAppInfo: () =>
    ipcRenderer.invoke('app:get-info') as Promise<{
      version: string;
      electronVersion: string;
      nodeVersion: string;
      chromeVersion: string;
      platform: string;
      arch: string;
    }>,
  openExternal: (url: string) =>
    ipcRenderer.invoke('app:open-external', url),

  onUpdateAvailable: (callback: (data: { version: string; url: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { version: string; url: string }) => callback(data);
    ipcRenderer.on('app:update-available', handler);
    return () => ipcRenderer.removeListener('app:update-available', handler);
  },

  // Settings
  getSettings: (key: string) => ipcRenderer.invoke('settings:get', key),
  setSettings: (key: string, value: unknown) => 
    ipcRenderer.invoke('settings:set', { key, value }),
  getJournalPath: () => ipcRenderer.invoke('settings:get-journal-path'),
  setJournalPath: (path: string) => 
    ipcRenderer.invoke('settings:set-journal-path', path),
  validateJournalPath: (path: string) => 
    ipcRenderer.invoke('settings:validate-journal-path', path),
  detectElitePaths: () => 
    ipcRenderer.invoke('settings:detect-elite-paths'),
  browseJournalPath: () => 
    ipcRenderer.invoke('settings:browse-journal-path') as Promise<{ path: string; validation: unknown } | null>,

  // Database queries
  getCurrentSystem: () => ipcRenderer.invoke('db:get-current-system'),
  getSystemById: (id: number) => 
    ipcRenderer.invoke('db:get-system-by-id', id),
  getSystemBodies: (systemId: number) => 
    ipcRenderer.invoke('db:get-system-bodies', systemId),
  searchSystems: (query: string, limit?: number) =>
    ipcRenderer.invoke('db:search-systems', query, limit),
  getSystemByName: (name: string) =>
    ipcRenderer.invoke('db:get-system-by-name', name),
  getRouteHistory: (limit?: number, offset?: number, filter?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sessionId?: string;
  }) => 
    ipcRenderer.invoke('db:get-route-history', { limit, offset, filter }),
  getRouteHistoryCount: (filter?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sessionId?: string;
  }) => 
    ipcRenderer.invoke('db:get-route-history-count', filter) as Promise<number>,
  getRouteHistoryTotals: (filter?: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sessionId?: string;
  }) => 
    ipcRenderer.invoke('db:get-route-history-totals', filter) as Promise<{
      totalDistance: number;
      totalFuel: number;
    }>,
  getRouteSessions: () =>
    ipcRenderer.invoke('db:get-route-sessions') as Promise<Array<{
      sessionId: string;
      startTime: string;
      endTime: string;
      jumpCount: number;
    }>>,
  getStatistics: () => ipcRenderer.invoke('db:get-statistics') as Promise<{
    totalSystems: number;
    totalBodies: number;
    firstDiscoveries: number;
    firstMapped: number;
    totalValue: number;
    biologicalsScanned: number;
    bodiesByType: Record<string, number>;
  }>,
  getBodyBiologicals: (bodyDbId: number) =>
    ipcRenderer.invoke('db:get-body-biologicals', bodyDbId),
  getAllBiologicals: () =>
    ipcRenderer.invoke('db:get-all-biologicals') as Promise<Array<{
      id: number;
      bodyId: number;
      genus: string;
      species: string;
      variant: string | null;
      value: number;
      scanned: boolean;
      scanProgress: number;
      systemName: string;
      bodyName: string;
    }>>,
  getBiologicalStats: () =>
    ipcRenderer.invoke('db:get-biological-stats') as Promise<{
      totalSpecies: number;
      completedScans: number;
      totalValue: number;
      genusCounts: Record<string, { total: number; scanned: number; value: number }>;
    }>,
  getCodexEntries: (filter?: {
    category?: string;
    subcategory?: string;
    region?: string;
    isNewOnly?: boolean;
  }) =>
    ipcRenderer.invoke('db:get-codex-entries', filter) as Promise<Array<{
      id: number;
      entryId: number;
      name: string;
      category: string;
      subcategory: string;
      region: string;
      systemName: string;
      systemAddress: number;
      bodyId: number | null;
      isNewEntry: boolean;
      newTraitsDiscovered: boolean;
      voucherAmount: number;
      timestamp: string;
    }>>,
  getCodexStats: () =>
    ipcRenderer.invoke('db:get-codex-stats') as Promise<{
      totalEntries: number;
      newEntries: number;
      totalVouchers: number;
      byCategory: Record<string, number>;
      byRegion: Record<string, number>;
    }>,
  getScanValuesByDate: () =>
    ipcRenderer.invoke('db:get-scan-values-by-date') as Promise<Array<{
      date: string;
      value: number;
      bodies: number;
    }>>,
  getSessionDiscoveryCounts: () =>
    ipcRenderer.invoke('db:get-session-discovery-counts') as Promise<Array<{
      sessionId: string;
      startTime: string;
      systems: number;
      bodies: number;
      firstDiscoveries: number;
      value: number;
    }>>,
  getBodyTypeDistribution: () =>
    ipcRenderer.invoke('db:get-body-type-distribution') as Promise<Array<{
      category: string;
      count: number;
      value: number;
    }>>,

  // Database management
  getDatabaseInfo: () =>
    ipcRenderer.invoke('db:get-database-info') as Promise<{
      path: string;
      size: number;
      systemCount: number;
      bodyCount: number;
    }>,
  clearExplorationData: () =>
    ipcRenderer.invoke('db:clear-exploration-data') as Promise<{
      success: boolean;
      error?: string;
    }>,
  backupDatabase: () =>
    ipcRenderer.invoke('db:backup-database') as Promise<{
      success: boolean;
      cancelled?: boolean;
      path?: string;
      error?: string;
    }>,
  validateImportDatabase: () =>
    ipcRenderer.invoke('db:validate-import-database') as Promise<{
      valid: boolean;
      cancelled?: boolean;
      path?: string;
      error?: string;
      systemCount?: number;
      bodyCount?: number;
    }>,
  importDatabase: (importPath: string) =>
    ipcRenderer.invoke('db:import-database', importPath) as Promise<{
      success: boolean;
      error?: string;
    }>,

  // Backfill operations
  startBackfill: () => 
    ipcRenderer.invoke('journal:start-backfill') as Promise<{
      filesProcessed: number;
      totalFiles: number;
      cancelled: boolean;
      error?: string;
    }>,
  cancelBackfill: () => 
    ipcRenderer.invoke('journal:cancel-backfill'),
  isBackfilling: () => 
    ipcRenderer.invoke('journal:is-backfilling') as Promise<boolean>,
  hasBackfilled: () => 
    ipcRenderer.invoke('settings:has-backfilled') as Promise<boolean>,

  // Backfill progress listener
  onBackfillProgress: (callback: (data: {
    progress: number;
    total: number;
    currentFile: string;
    percentage: number;
    isComplete?: boolean;
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: {
      progress: number;
      total: number;
      currentFile: string;
      percentage: number;
      isComplete?: boolean;
    }) => callback(data);
    ipcRenderer.on('journal:backfill-progress', handler);
    return () => ipcRenderer.removeListener('journal:backfill-progress', handler);
  },

  // EDSM API
  edsmGetSystem: (systemName: string) => 
    ipcRenderer.invoke('edsm:get-system', systemName),
  edsmGetSystemBodies: (systemName: string) => 
    ipcRenderer.invoke('edsm:get-system-bodies', systemName),
  edsmGetSystemValue: (systemName: string) =>
    ipcRenderer.invoke('edsm:get-system-value', systemName),
  edsmGetSystemBodyCount: (systemName: string) =>
    ipcRenderer.invoke('edsm:get-system-body-count', systemName) as Promise<number | null>,
  edsmSearchSystems: (namePrefix: string, limit?: number) =>
    ipcRenderer.invoke('edsm:search-systems', namePrefix, limit) as Promise<Array<{
      name: string;
      id?: number;
      id64?: number;
      coords?: { x: number; y: number; z: number };
      primaryStar?: { type: string; name: string; isScoopable: boolean };
    }>>,

  // EDSM Cache Management
  edsmClearCache: (type?: string) =>
    ipcRenderer.invoke('edsm:clear-cache', type) as Promise<{ success: boolean }>,
  edsmCleanupExpiredCache: () =>
    ipcRenderer.invoke('edsm:cleanup-expired-cache') as Promise<{ removed: number }>,
  edsmGetCacheStats: () =>
    ipcRenderer.invoke('edsm:get-cache-stats') as Promise<{
      memoryCacheSize: number;
      dbStats: {
        totalEntries: number;
        validEntries: number;
        expiredEntries: number;
        sizeBytes: number;
        byType: Record<string, number>;
      } | null;
    }>,
  edsmGetLastError: () =>
    ipcRenderer.invoke('edsm:get-last-error') as Promise<string | null>,
  edsmClearLastError: () =>
    ipcRenderer.invoke('edsm:clear-last-error') as Promise<{ success: boolean }>,

  // EDAstro GEC (Galactic Exploration Catalog) – POI list for route planner suggestions
  getGecPoiList: () =>
    ipcRenderer.invoke('edastro:get-poi-list') as Promise<Array<{ name: string; galMapSearch: string }>>,

  // EDAstro Galactic Records (scraped weekly; used for record comparison)
  getGalacticRecordsStatus: () =>
    ipcRenderer.invoke('edastro:get-galactic-records-status') as Promise<{
      isChecking: boolean;
      lastScrapedAt: string | null;
      recordCount: number;
      error?: string;
    }>,
  onGalacticRecordsCheckStarted: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('edastro:records-check-started', handler);
    return () => ipcRenderer.removeListener('edastro:records-check-started', handler);
  },
  onGalacticRecordsCheckFinished: (callback: (payload: { success: boolean; error?: string }) => void) => {
    const handler = (_event: IpcRendererEvent, payload: { success: boolean; error?: string }) => callback(payload);
    ipcRenderer.on('edastro:records-check-finished', handler);
    return () => ipcRenderer.removeListener('edastro:records-check-finished', handler);
  },

  // Event listeners
  onSystemChanged: (callback: (system: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, system: unknown) => callback(system);
    ipcRenderer.on('journal:system-changed', handler);
    return () => ipcRenderer.removeListener('journal:system-changed', handler);
  },

  onBodyScanned: (callback: (body: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, body: unknown) => callback(body);
    ipcRenderer.on('journal:body-scanned', handler);
    return () => ipcRenderer.removeListener('journal:body-scanned', handler);
  },

  onBodyMapped: (callback: (data: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, data: unknown) => callback(data);
    ipcRenderer.on('journal:body-mapped', handler);
    return () => ipcRenderer.removeListener('journal:body-mapped', handler);
  },

  onBodySignalsUpdated: (callback: (data: {
    systemAddress: number;
    bodyId: number;
    bioSignals: number;
    geoSignals: number;
    humanSignals?: number;
    thargoidSignals?: number;
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: {
      systemAddress: number;
      bodyId: number;
      bioSignals: number;
      geoSignals: number;
      humanSignals?: number;
      thargoidSignals?: number;
    }) => callback(data);
    ipcRenderer.on('journal:body-signals-updated', handler);
    return () => ipcRenderer.removeListener('journal:body-signals-updated', handler);
  },

  onBioScanned: (callback: (bio: unknown) => void) => {
    const handler = (_event: IpcRendererEvent, bio: unknown) => callback(bio);
    ipcRenderer.on('journal:bio-scanned', handler);
    return () => ipcRenderer.removeListener('journal:bio-scanned', handler);
  },

  onExobiologyMismatch: (callback: (data: {
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
  }) => void) => {
    const handler = (
      _event: IpcRendererEvent,
      data: {
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
    ) => callback(data);
    ipcRenderer.on('journal:exobiology-mismatch', handler);
    return () => ipcRenderer.removeListener('journal:exobiology-mismatch', handler);
  },

  // Journal file rotation events
  onJournalFileChanged: (callback: (data: { previousFile: string | null; newFile: string; timestamp: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { previousFile: string | null; newFile: string; timestamp: string }) => callback(data);
    ipcRenderer.on('journal:file-changed', handler);
    return () => ipcRenderer.removeListener('journal:file-changed', handler);
  },

  onJournalContinued: (callback: (data: { part: number; timestamp: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { part: number; timestamp: string }) => callback(data);
    ipcRenderer.on('journal:continued', handler);
    return () => ipcRenderer.removeListener('journal:continued', handler);
  },

  // Game state events
  onGameStarted: (callback: (data: { commander: string; gameMode: string; ship: string; isOdyssey: boolean; timestamp: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { commander: string; gameMode: string; ship: string; isOdyssey: boolean; timestamp: string }) => callback(data);
    ipcRenderer.on('journal:game-started', handler);
    return () => ipcRenderer.removeListener('journal:game-started', handler);
  },

  // Commander info
  getCommanderInfo: () =>
    ipcRenderer.invoke('journal:get-commander-info') as Promise<{
      name: string | null;
      credits: number;
      loan: number;
      ship: string | null;
      shipName: string | null;
      shipIdent: string | null;
      ranks: {
        combat: number; trade: number; explore: number;
        soldier: number; exobiologist: number;
        empire: number; federation: number; cqc: number;
      } | null;
      progress: {
        combat: number; trade: number; explore: number;
        soldier: number; exobiologist: number;
        empire: number; federation: number; cqc: number;
      } | null;
      reputation: {
        empire: number; federation: number;
        alliance: number; independent: number;
      } | null;
      powerplay: {
        power: string; rank: number;
        merits: number; timePledged: number;
      } | null;
    }>,

  onCommanderUpdated: (callback: (data: {
    name: string | null;
    credits: number;
    loan: number;
    ship: string | null;
    shipName: string | null;
    shipIdent: string | null;
    ranks: {
      combat: number; trade: number; explore: number;
      soldier: number; exobiologist: number;
      empire: number; federation: number; cqc: number;
    } | null;
    progress: {
      combat: number; trade: number; explore: number;
      soldier: number; exobiologist: number;
      empire: number; federation: number; cqc: number;
    } | null;
    reputation: {
      empire: number; federation: number;
      alliance: number; independent: number;
    } | null;
    powerplay: {
      power: string; rank: number;
      merits: number; timePledged: number;
    } | null;
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: Parameters<typeof callback>[0]) => callback(data);
    ipcRenderer.on('journal:commander-updated', handler);
    return () => ipcRenderer.removeListener('journal:commander-updated', handler);
  },

  onGameStopped: (callback: (data: { timestamp: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { timestamp: string }) => callback(data);
    ipcRenderer.on('journal:game-stopped', handler);
    return () => ipcRenderer.removeListener('journal:game-stopped', handler);
  },

  // Carrier events
  onCarrierJumped: (callback: (data: { 
    system: unknown; 
    carrierName: string | null; 
    carrierMarketId: number | null; 
    isDocked: boolean; 
    isOnFoot: boolean; 
    timestamp: string 
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { 
      system: unknown; 
      carrierName: string | null; 
      carrierMarketId: number | null; 
      isDocked: boolean; 
      isOnFoot: boolean; 
      timestamp: string 
    }) => callback(data);
    ipcRenderer.on('journal:carrier-jumped', handler);
    return () => ipcRenderer.removeListener('journal:carrier-jumped', handler);
  },

  // Exploration events
  onAllBodiesFound: (callback: (data: {
    systemName: string;
    systemAddress: number;
    bodyCount: number;
    timestamp: string;
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: {
      systemName: string;
      systemAddress: number;
      bodyCount: number;
      timestamp: string;
    }) => callback(data);
    ipcRenderer.on('journal:all-bodies-found', handler);
    return () => ipcRenderer.removeListener('journal:all-bodies-found', handler);
  },

  // Route events
  onRoutePlotted: (callback: (data: {
    destination: string;
    jumpsTotal: number;
    route: unknown[];
    timestamp: string;
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: {
      destination: string;
      jumpsTotal: number;
      route: unknown[];
      timestamp: string;
    }) => callback(data);
    ipcRenderer.on('journal:route-plotted', handler);
    return () => ipcRenderer.removeListener('journal:route-plotted', handler);
  },

  onRouteCleared: (callback: (data: { timestamp: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { timestamp: string }) => callback(data);
    ipcRenderer.on('journal:route-cleared', handler);
    return () => ipcRenderer.removeListener('journal:route-cleared', handler);
  },

  // Surface events
  onTouchdown: (callback: (data: {
    bodyName: string;
    bodyId: number;
    latitude: number;
    longitude: number;
    nearestDestination: string | null;
    systemName: string;
    systemAddress: number;
    timestamp: string;
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: {
      bodyName: string;
      bodyId: number;
      latitude: number;
      longitude: number;
      nearestDestination: string | null;
      systemName: string;
      systemAddress: number;
      timestamp: string;
    }) => callback(data);
    ipcRenderer.on('journal:touchdown', handler);
    return () => ipcRenderer.removeListener('journal:touchdown', handler);
  },

  onLiftoff: (callback: (data: {
    bodyName: string;
    bodyId: number;
    latitude: number;
    longitude: number;
    systemName: string;
    systemAddress: number;
    timestamp: string;
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: {
      bodyName: string;
      bodyId: number;
      latitude: number;
      longitude: number;
      systemName: string;
      systemAddress: number;
      timestamp: string;
    }) => callback(data);
    ipcRenderer.on('journal:liftoff', handler);
    return () => ipcRenderer.removeListener('journal:liftoff', handler);
  },

  onBodyFootfalled: (callback: (data: {
    bodyId: number;
    systemAddress: number;
  }) => void) => {
    const handler = (_event: IpcRendererEvent, data: {
      bodyId: number;
      systemAddress: number;
    }) => callback(data);
    ipcRenderer.on('journal:body-footfalled', handler);
    return () => ipcRenderer.removeListener('journal:body-footfalled', handler);
  },
};

// Expose to renderer
contextBridge.exposeInMainWorld('electron', electronAPI);

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI;
