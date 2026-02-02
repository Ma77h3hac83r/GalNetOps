/** Main process entry: creates window, initializes services, and registers all IPC handlers for settings, DB, journal, EDSM, and app controls. */
import { app, BrowserWindow, ipcMain, shell, dialog, screen, session, type BrowserWindowConstructorOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { DatabaseService } from './services/database';
import { JournalWatcher } from './services/journal-watcher';
import { EDSMService } from './services/edsm';
import { getGecPoiList } from './services/edastro-gec';
import SettingsService from './services/settings';
import { logInfo, logWarn, logError } from './logger';
import {
  settingsKeySchema,
  settingsSetSchema,
  journalPathSchema,
  sanitizePath,
  isAllowedExternalUrl,
  dbGetSystemByIdSchema,
  dbGetSystemBodiesSchema,
  dbSearchSystemsSchema,
  dbGetSystemByNameSchema,
  dbGetRouteHistorySchema,
  dbGetRouteHistoryCountSchema,
  dbGetRouteHistoryTotalsSchema,
  dbGetBodyBiologicalsSchema,
  dbGetCodexEntriesSchema,
  dbImportDatabaseSchema,
  appOpenExternalSchema,
  edsmGetSystemSchema,
  edsmGetSystemBodiesSchema,
  edsmGetSystemValueSchema,
  edsmGetSystemBodyCountSchema,
  edsmSearchSystemsSchema,
  edsmClearCacheSchema,
} from './ipc-validation';

// Services (initialized in initializeServices before app ready)
let dbService: DatabaseService;
let journalWatcher: JournalWatcher;
let edsmService: EDSMService;
let settingsService: SettingsService;

// Main window reference
let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

/** Content-Security-Policy: default-src and script-src 'self', no inline scripts; style-src allows 'unsafe-inline' for Tailwind. */
function setupCSP(): void {
  // Skip CSP in dev to avoid blocking Vite HMR, script loading, or module resolution
  if (isDev) {
    logInfo('Main', 'CSP disabled in development');
    return;
  }

  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    responseHeaders['content-security-policy'] = [csp];
    callback({ responseHeaders });
  });
}

/** Create main BrowserWindow with custom titlebar, load dev or prod URL, and attach window-state and external-link handlers. */
function createWindow(): void {
  // Get saved window state
  const savedBounds = settingsService.getWindowBounds();
  const wasMaximized = settingsService.getIsMaximized();
  
  // Validate saved bounds are on a visible display
  const validatedBounds = validateWindowBounds(savedBounds);

  const windowOpts: {
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
    x?: number;
    y?: number;
    frame: false;
    backgroundColor: string;
    webPreferences: NonNullable<BrowserWindowConstructorOptions['webPreferences']>;
  } = {
    width: validatedBounds?.width ?? 1200,
    height: validatedBounds?.height ?? 800,
    minWidth: 800,
    minHeight: 600,
    frame: false, // Custom titlebar
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  };
  if (validatedBounds?.x !== undefined && validatedBounds?.y !== undefined) {
    windowOpts.x = validatedBounds.x;
    windowOpts.y = validatedBounds.y;
  }
  mainWindow = new BrowserWindow(windowOpts);

  // Restore maximized state after window is created
  if (wasMaximized) {
    mainWindow.maximize();
  }

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Save window state on changes
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', () => settingsService.setIsMaximized(true));
  mainWindow.on('unmaximize', () => settingsService.setIsMaximized(false));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Crash and hang recovery: log and optionally recover
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logError('Main', `Render process gone: ${details.reason} (exit ${details.exitCode})`);
    mainWindow = null;
  });

  mainWindow.on('unresponsive', () => {
    logWarn('Main', 'Window unresponsive');
  });

  mainWindow.webContents.on('responsive', () => {
    // Window became responsive again after unresponsive
  });

  // Open external links in browser (validate URL: only http/https/mailto)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
}

/**
 * Validate that window bounds are on a visible display
 * Returns the bounds if valid, or null if window would be off-screen
 */
function validateWindowBounds(
  bounds: { x: number; y: number; width: number; height: number } | null
): { x: number; y: number; width: number; height: number } | null {
  if (!bounds) return null;

  // Get all displays
  const displays = screen.getAllDisplays();
  
  // Check if the window center point is within any display
  const windowCenterX = bounds.x + bounds.width / 2;
  const windowCenterY = bounds.y + bounds.height / 2;
  
  const isOnScreen = displays.some((display) => {
    const { x, y, width, height } = display.workArea;
    return (
      windowCenterX >= x &&
      windowCenterX <= x + width &&
      windowCenterY >= y &&
      windowCenterY <= y + height
    );
  });

  if (isOnScreen) {
    return bounds;
  }

  // Window is off-screen, return null to use defaults
  // But preserve the size if it's reasonable
  if (bounds.width >= 800 && bounds.height >= 600) {
    return {
      x: undefined as unknown as number, // Let Electron center the window
      y: undefined as unknown as number,
      width: bounds.width,
      height: bounds.height,
    };
  }

  return null;
}

/**
 * Save window bounds (only when not maximized)
 */
function saveWindowState(): void {
  if (mainWindow && !mainWindow.isMaximized()) {
    const bounds = mainWindow.getBounds();
    settingsService.setWindowBounds(bounds);
  }
}

// Initialize services
async function initializeServices(): Promise<void> {
  // Settings first (other services depend on it)
  settingsService = new SettingsService();

  // Database
  dbService = new DatabaseService();
  await dbService.initialize();

  // EDSM API
  edsmService = new EDSMService();
  edsmService.setDatabaseService(dbService);

  // Journal watcher (depends on settings for path)
  journalWatcher = new JournalWatcher(dbService, settingsService);
}

/** Register all IPC handlers: window controls, settings, DB, journal, EDSM, backfill, and journal event forwarding. */
function setupIPC(): void {
  // Window controls (minimize, maximize, close)
  ipcMain.on('app:minimize', () => mainWindow?.minimize());
  ipcMain.on('app:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('app:close', () => mainWindow?.close());

  // Settings get/set, journal path, validation, detect paths, browse folder
  ipcMain.handle('settings:get', (_event, key: unknown) => {
    const parsed = settingsKeySchema.safeParse(key);
    if (!parsed.success) return undefined;
    return (settingsService as { get(key: string): unknown }).get(parsed.data);
  });

  ipcMain.handle('settings:set', (_event, payload: unknown) => {
    const parsed = settingsSetSchema.safeParse(payload);
    if (!parsed.success) return;
    const { key, value } = parsed.data;
    (settingsService as { set(key: string, value: unknown): void }).set(key, value);
  });

  ipcMain.handle('settings:get-journal-path', () => {
    return settingsService.getJournalPath();
  });

  ipcMain.handle('settings:set-journal-path', (_event, rawPath: unknown) => {
    const pathParsed = journalPathSchema.safeParse(rawPath);
    if (!pathParsed.success) throw new Error('Invalid journal path');
    const sanitized = sanitizePath(pathParsed.data);
    if (!sanitized) throw new Error('Invalid journal path');
    settingsService.setJournalPath(sanitized);
    journalWatcher.setPath(sanitized);
  });

  ipcMain.handle('settings:validate-journal-path', (_event, rawPath: unknown) => {
    const pathParsed = journalPathSchema.safeParse(rawPath);
    const invalidResult = { isValid: false, exists: false, isReadable: false, journalCount: 0, latestJournal: null as string | null, latestJournalDate: null as string | null, eliteInstalled: false, errors: ['Invalid path'] as string[], warnings: [] as string[], recentJournals: [] as { name: string; size: number; modified: string }[] };
    if (!pathParsed.success) return invalidResult;
    const sanitized = sanitizePath(pathParsed.data);
    if (!sanitized) return invalidResult;
    return settingsService.validateJournalFolder(sanitized);
  });

  ipcMain.handle('settings:detect-elite-paths', () => {
    return settingsService.detectElitePaths();
  });

  // Native folder picker for journal path
  ipcMain.handle('settings:browse-journal-path', async () => {
    if (!mainWindow) return null;

    const journalPath = settingsService.getJournalPath();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Elite Dangerous Journal Folder',
      ...(journalPath ? { defaultPath: journalPath } : {}),
      properties: ['openDirectory'],
      buttonLabel: 'Select Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    if (selectedPath === undefined) return null;

    // Validate the selected path
    const validation = settingsService.validateJournalFolder(selectedPath);
    
    return {
      path: selectedPath,
      validation,
    };
  });

  // Database queries (current system, bodies, route history, statistics, biologicals, codex, scan values, sessions, body-type distribution)
  ipcMain.handle('db:get-current-system', () => {
    return dbService.getCurrentSystem();
  });

  ipcMain.handle('db:get-system-by-id', (_event, id: unknown) => {
    const parsed = dbGetSystemByIdSchema.safeParse({ id });
    if (!parsed.success) return null;
    return dbService.getSystemById(parsed.data.id);
  });

  ipcMain.handle('db:get-system-bodies', (_event, systemId: unknown) => {
    const parsed = dbGetSystemBodiesSchema.safeParse({ systemId });
    if (!parsed.success) return [];
    return dbService.getSystemBodies(parsed.data.systemId);
  });

  ipcMain.handle('db:search-systems', (_event, query: unknown, limit?: unknown) => {
    const parsed = dbSearchSystemsSchema.safeParse({ query, limit });
    if (!parsed.success) return [];
    return dbService.searchSystems(parsed.data.query, parsed.data.limit);
  });

  ipcMain.handle('db:get-system-by-name', (_event, name: unknown) => {
    const parsed = dbGetSystemByNameSchema.safeParse({ name });
    if (!parsed.success) return null;
    return dbService.getSystemByName(parsed.data.name);
  });

  ipcMain.handle('db:get-route-history', (_event, options: unknown) => {
    const parsed = dbGetRouteHistorySchema.safeParse(options ?? {});
    if (!parsed.success) return [];
    type RouteHistoryFilter = import('../shared/types').RouteHistoryFilter;
    return dbService.getRouteHistory(parsed.data.limit, parsed.data.offset, parsed.data.filter as RouteHistoryFilter | undefined);
  });

  ipcMain.handle('db:get-route-history-count', (_event, filter: unknown) => {
    const parsed = dbGetRouteHistoryCountSchema.safeParse({ filter });
    if (!parsed.success) return 0;
    type RouteHistoryFilter = import('../shared/types').RouteHistoryFilter;
    return dbService.getRouteHistoryCount(parsed.data.filter as RouteHistoryFilter | undefined);
  });

  ipcMain.handle('db:get-route-history-totals', (_event, filter: unknown) => {
    const parsed = dbGetRouteHistoryTotalsSchema.safeParse({ filter });
    if (!parsed.success) return { totalDistance: 0, totalFuel: 0 };
    type RouteHistoryFilter = import('../shared/types').RouteHistoryFilter;
    return dbService.getRouteHistoryTotals(parsed.data.filter as RouteHistoryFilter | undefined);
  });

  ipcMain.handle('db:get-route-sessions', () => {
    return dbService.getRouteSessions();
  });

  ipcMain.handle('db:get-statistics', () => {
    return dbService.getStatistics();
  });

  ipcMain.handle('db:get-body-biologicals', (_event, bodyDbId: unknown) => {
    const parsed = dbGetBodyBiologicalsSchema.safeParse({ bodyDbId });
    if (!parsed.success) return [];
    return dbService.getBodyBiologicals(parsed.data.bodyDbId);
  });

  ipcMain.handle('db:get-all-biologicals', () => {
    return dbService.getAllBiologicals();
  });

  ipcMain.handle('db:get-biological-stats', () => {
    return dbService.getBiologicalStats();
  });

  // Codex handlers
  ipcMain.handle('db:get-codex-entries', (_event, payload: unknown) => {
    const parsed = dbGetCodexEntriesSchema.safeParse(payload ?? {});
    if (!parsed.success) return [];
    type CodexFilter = { category?: string; subcategory?: string; region?: string; isNewOnly?: boolean };
    return dbService.getCodexEntries(parsed.data.filter as CodexFilter | undefined);
  });

  ipcMain.handle('db:get-codex-stats', () => {
    return dbService.getCodexStats();
  });

  ipcMain.handle('db:get-scan-values-by-date', () => {
    return dbService.getScanValuesByDate();
  });

  ipcMain.handle('db:get-session-discovery-counts', () => {
    return dbService.getSessionDiscoveryCounts();
  });

  ipcMain.handle('db:get-body-type-distribution', () => {
    return dbService.getBodyTypeDistribution();
  });

  // Database management (info, clear, backup, validate import, import with backup/restore)
  ipcMain.handle('db:get-database-info', () => {
    return dbService.getDatabaseInfo();
  });

  ipcMain.handle('db:clear-exploration-data', () => {
    return dbService.clearExplorationData();
  });

  ipcMain.handle('db:backup-database', async () => {
    if (!mainWindow) return { success: false, error: 'No main window' };

    const dbInfo = dbService.getDatabaseInfo();
    const defaultName = `galnetops-backup-${new Date().toISOString().slice(0, 10)}.db`;

    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Backup Database',
      defaultPath: defaultName,
      filters: [
        { name: 'SQLite Database', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      buttonLabel: 'Save Backup',
    });

    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true };
    }

    try {
      // Close database to ensure all data is flushed
      // Actually, better-sqlite3 handles this well, just copy the file
      fs.copyFileSync(dbInfo.path, result.filePath);
      return { success: true, path: result.filePath };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to backup database' 
      };
    }
  });

  ipcMain.handle('db:validate-import-database', async () => {
    if (!mainWindow) return { valid: false, error: 'No main window' };

    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Database to Import',
      filters: [
        { name: 'SQLite Database', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
      buttonLabel: 'Select Database',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { valid: false, cancelled: true };
    }

    const importPath = result.filePaths[0];
    if (importPath === undefined) return { valid: false, cancelled: true };
    const validation = dbService.validateImportDatabase(importPath);

    return {
      ...validation,
      path: importPath,
    };
  });

  ipcMain.handle('db:import-database', async (_event, rawImportPath: unknown) => {
    const parsed = dbImportDatabaseSchema.safeParse({ importPath: rawImportPath });
    if (!parsed.success) {
      return { success: false, error: 'No import path provided' };
    }
    const importPath = sanitizePath(parsed.data.importPath);
    if (!importPath) {
      return { success: false, error: 'Invalid import path' };
    }

    // Validate first
    const validation = dbService.validateImportDatabase(importPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const dbInfo = dbService.getDatabaseInfo();
      const currentDbPath = dbInfo.path;

      // Close current database
      dbService.close();

      // Create backup of current database
      const backupPath = currentDbPath + '.backup-' + Date.now();
      if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, backupPath);
      }

      try {
        // Copy imported database over current
        fs.copyFileSync(importPath, currentDbPath);
        
        // Also copy WAL and SHM files if they exist (for WAL mode databases)
        const walPath = importPath + '-wal';
        const shmPath = importPath + '-shm';
        if (fs.existsSync(walPath)) {
          fs.copyFileSync(walPath, currentDbPath + '-wal');
        }
        if (fs.existsSync(shmPath)) {
          fs.copyFileSync(shmPath, currentDbPath + '-shm');
        }

        // Reinitialize database
        await dbService.initialize();

        // Clean up backup
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }

        return { success: true };
      } catch (importError) {
        // Restore from backup if import failed
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, currentDbPath);
          fs.unlinkSync(backupPath);
        }
        await dbService.initialize();
        throw importError;
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to import database' 
      };
    }
  });

  // Backfill operations (start with progress events, cancel, is-backfilling, has-backfilled)
  ipcMain.handle('journal:start-backfill', async () => {
    if (journalWatcher.isBackfillingInProgress()) {
      return { error: 'Backfill already in progress' };
    }

    // Run backfill with progress reporting via IPC
    const result = await journalWatcher.backfill((progress, total, currentFile) => {
      mainWindow?.webContents.send('journal:backfill-progress', {
        progress,
        total,
        currentFile,
        percentage: Math.round((progress / total) * 100),
        isComplete: false,
      });
    });

    // Mark as backfilled if successful
    if (!result.cancelled && result.filesProcessed > 0) {
      settingsService.setBackfilled(true);
    }

    // Send completion event so the progress bar hides
    mainWindow?.webContents.send('journal:backfill-progress', {
      progress: result.filesProcessed,
      total: result.totalFiles,
      currentFile: '',
      percentage: 100,
      isComplete: true,
    });

    return result;
  });

  ipcMain.handle('journal:cancel-backfill', () => {
    journalWatcher.cancelBackfill();
  });

  ipcMain.handle('journal:is-backfilling', () => {
    return journalWatcher.isBackfillingInProgress();
  });

  ipcMain.handle('settings:has-backfilled', () => {
    return settingsService.hasBackfilled();
  });

  // App info
  ipcMain.handle('app:get-info', () => {
    return {
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      platform: process.platform,
      arch: process.arch,
    };
  });

  // Open external URL in browser (only http, https, mailto)
  ipcMain.handle('app:open-external', (_event, url: unknown) => {
    const parsed = appOpenExternalSchema.safeParse({ url });
    if (!parsed.success || !isAllowedExternalUrl(parsed.data.url)) return;
    shell.openExternal(parsed.data.url);
  });

  // EDSM API (get system, bodies, value, body count, search) and cache management (clear, cleanup, stats, last error)
  ipcMain.handle('edsm:get-system', async (_event, systemName: unknown) => {
    const parsed = edsmGetSystemSchema.safeParse({ systemName });
    if (!parsed.success) return null;
    return edsmService.getSystem(parsed.data.systemName);
  });

  ipcMain.handle('edsm:get-system-bodies', async (_event, systemName: unknown) => {
    const parsed = edsmGetSystemBodiesSchema.safeParse({ systemName });
    if (!parsed.success) return null;
    return edsmService.getSystemBodies(parsed.data.systemName);
  });

  ipcMain.handle('edsm:get-system-value', async (_event, systemName: unknown) => {
    const parsed = edsmGetSystemValueSchema.safeParse({ systemName });
    if (!parsed.success) return null;
    return edsmService.getSystemValue(parsed.data.systemName);
  });

  ipcMain.handle('edsm:get-system-body-count', async (_event, systemName: unknown) => {
    const parsed = edsmGetSystemBodyCountSchema.safeParse({ systemName });
    if (!parsed.success) return null;
    return edsmService.getSystemBodyCount(parsed.data.systemName);
  });

  ipcMain.handle('edsm:search-systems', async (_event, namePrefix: unknown, limit?: unknown) => {
    const parsed = edsmSearchSystemsSchema.safeParse({ namePrefix, limit });
    if (!parsed.success) return [];
    return edsmService.searchSystems(parsed.data.namePrefix, parsed.data.limit);
  });

  // EDSM Cache Management
  ipcMain.handle('edsm:clear-cache', (_event, type?: unknown) => {
    const parsed = edsmClearCacheSchema.safeParse({ type });
    if (!parsed.success) {
      edsmService.clearCache();
    } else {
      edsmService.clearCache(parsed.data.type);
    }
    return { success: true };
  });

  ipcMain.handle('edsm:cleanup-expired-cache', () => {
    const removed = edsmService.cleanupExpiredCache();
    return { removed };
  });

  ipcMain.handle('edsm:get-cache-stats', () => {
    return edsmService.getCacheStats();
  });

  ipcMain.handle('edsm:get-last-error', () => {
    return edsmService.getLastError();
  });

  ipcMain.handle('edsm:clear-last-error', () => {
    edsmService.clearLastError();
    return { success: true };
  });

  // EDAstro GEC (Galactic Exploration Catalog) – POI list for route planner suggestions
  ipcMain.handle('edastro:get-poi-list', () => getGecPoiList());

  // Forward journal watcher events to renderer (system, body scanned/mapped, signals, bio; file-changed, continued, game, carrier, exploration, route, surface)
  journalWatcher.on('system-changed', (system) => {
    mainWindow?.webContents.send('journal:system-changed', system);
  });

  journalWatcher.on('body-scanned', (body) => {
    mainWindow?.webContents.send('journal:body-scanned', body);
  });

  journalWatcher.on('body-mapped', (data) => {
    mainWindow?.webContents.send('journal:body-mapped', data);
  });

  journalWatcher.on('body-signals-updated', (data) => {
    mainWindow?.webContents.send('journal:body-signals-updated', data);
  });

  journalWatcher.on('bio-scanned', (bio) => {
    mainWindow?.webContents.send('journal:bio-scanned', bio);
  });

  journalWatcher.on('exobiology-mismatch', (data) => {
    mainWindow?.webContents.send('journal:exobiology-mismatch', data);
  });

  // Forward journal file rotation and game state events
  journalWatcher.on('journal-file-changed', (data) => {
    mainWindow?.webContents.send('journal:file-changed', data);
  });

  journalWatcher.on('journal-continued', (data) => {
    mainWindow?.webContents.send('journal:continued', data);
  });

  journalWatcher.on('game-started', (data) => {
    mainWindow?.webContents.send('journal:game-started', data);
  });

  journalWatcher.on('game-stopped', (data) => {
    mainWindow?.webContents.send('journal:game-stopped', data);
  });

  // Forward carrier-specific events
  journalWatcher.on('carrier-jumped', (data) => {
    mainWindow?.webContents.send('journal:carrier-jumped', data);
  });

  // Forward exploration events
  journalWatcher.on('all-bodies-found', (data) => {
    mainWindow?.webContents.send('journal:all-bodies-found', data);
  });

  // Forward route events
  journalWatcher.on('route-plotted', (data) => {
    mainWindow?.webContents.send('journal:route-plotted', data);
  });

  journalWatcher.on('route-cleared', (data) => {
    mainWindow?.webContents.send('journal:route-cleared', data);
  });

  // Forward surface events
  journalWatcher.on('touchdown', (data) => {
    mainWindow?.webContents.send('journal:touchdown', data);
  });

  journalWatcher.on('liftoff', (data) => {
    mainWindow?.webContents.send('journal:liftoff', data);
  });
}

// App lifecycle: init services, setup IPC, set CSP, create window; start journal watcher and optionally auto-backfill on first run.
app.whenReady().then(async () => {
  await initializeServices();
  setupCSP();
  setupIPC();
  createWindow();

  // Start watching journals (and run one-time auto-backfill if not yet done)
  const journalPath = settingsService.getJournalPath();
  if (journalPath) {
    journalWatcher.start();
    
    // Auto-import journal history if not done before
    if (!settingsService.hasBackfilled()) {
      logInfo('Main', 'Starting automatic journal history import');
      
      // Small delay to ensure window is ready to receive events
      setTimeout(async () => {
        try {
          const result = await journalWatcher.backfill((progress, total, currentFile) => {
            mainWindow?.webContents.send('journal:backfill-progress', {
              progress,
              total,
              currentFile,
              isComplete: false,
            });
          });
          
          if (!result.cancelled) {
            settingsService.setBackfilled(true);
            logInfo('Main', `Auto-import complete: ${result.filesProcessed} of ${result.totalFiles} files`);
          }
          
          // Send completion event
          mainWindow?.webContents.send('journal:backfill-progress', {
            progress: result.filesProcessed,
            total: result.totalFiles,
            currentFile: '',
            isComplete: true,
            result,
          });
        } catch (error) {
          logError('Main', 'Auto-import failed', error);
        }
      }, 1000);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  journalWatcher?.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Sync cleanup only (journal watcher stop and DB close are synchronous); no async wait or timeout needed.
app.on('before-quit', () => {
  journalWatcher?.stop();
  dbService?.close();
});
