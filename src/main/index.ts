/** Main process entry: init services, CSP, IPC, window; journal watcher and optional auto-backfill. */
import { app, BrowserWindow, session } from 'electron';
import * as path from 'path';
import { isDev } from './env';
import { createWindow } from './window';
import { initializeServices, type MainServices } from './initServices';
import { setupIPC } from './ipc';
import { logInfo, logError } from './logger';
import { isAllowedExternalUrl } from './ipc-validation';
import { checkForUpdate } from './services/versionCheck';
import { runGalacticRecordsCheckIfNeeded } from './services/edastro-records';

function setupCSPInMain(dev: boolean): void {
  if (dev) {
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

let mainWindow: BrowserWindow | null = null;
let servicesRef: MainServices | null = null;

app.whenReady().then(async () => {
  const services = await initializeServices();
  servicesRef = services;
  const ctx = {
    getMainWindow: (): BrowserWindow | null => mainWindow,
    dbService: services.dbService,
    journalWatcher: services.journalWatcher,
    settingsService: services.settingsService,
    edsmService: services.edsmService,
  };

  setupCSPInMain(isDev());
  setupIPC(ctx);

  const preloadPath = path.join(__dirname, 'preload.js');
  mainWindow = createWindow(
    services.settingsService,
    isDev(),
    preloadPath,
    (url: string) => isAllowedExternalUrl(url)
  );

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check for new version on load (non-blocking)
  setTimeout(async () => {
    try {
      const result = await checkForUpdate(app.getVersion());
      if (result.available && result.version && result.url && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('app:update-available', {
          version: result.version,
          url: result.url,
        });
      }
    } catch (err: unknown) {
      logError('Main', 'Update check failed', err);
    }
  }, 2000);

  // Galactic records: scrape once every 7 days if data missing or stale (non-blocking)
  setTimeout(() => {
    runGalacticRecordsCheckIfNeeded(
      () => mainWindow?.webContents.send('edastro:records-check-started'),
      (payload) =>
        mainWindow?.webContents.send('edastro:records-check-finished', payload)
    );
  }, 3000);

  const journalPath = services.settingsService.getJournalPath();
  if (journalPath) {
    services.journalWatcher.start();

    if (!services.settingsService.hasBackfilled()) {
      logInfo('Main', 'Starting automatic journal history import');

      setTimeout(async () => {
        try {
          const result = await services.journalWatcher.backfill(
            (progress, total, currentFile) => {
              mainWindow?.webContents.send('journal:backfill-progress', {
                progress,
                total,
                currentFile,
                isComplete: false,
              });
            }
          );

          if (!result.cancelled) {
            services.settingsService.setBackfilled(true);
            logInfo(
              'Main',
              `Auto-import complete: ${result.filesProcessed} of ${result.totalFiles} files`
            );
          }

          mainWindow?.webContents.send('journal:backfill-progress', {
            progress: result.filesProcessed,
            total: result.totalFiles,
            currentFile: '',
            isComplete: true,
            result,
          });
        } catch (error: unknown) {
          logError('Main', 'Auto-import failed', error);
        }
      }, 1000);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && servicesRef) {
      mainWindow = createWindow(
        servicesRef.settingsService,
        isDev(),
        preloadPath,
        (url: string) => isAllowedExternalUrl(url)
      );
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
    }
  });
});

app.on('window-all-closed', () => {
  if (servicesRef) {
    servicesRef.journalWatcher.stop();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (servicesRef) {
    servicesRef.journalWatcher.stop();
    servicesRef.dbService.close();
  }
});
