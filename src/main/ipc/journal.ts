/** IPC: journal backfill, has-backfilled, and forwarding journal events to renderer. */
import { ipcMain } from 'electron';
import type { MainContext } from './context';
import { logInfo } from '../logger';

export function registerJournalIpc(ctx: MainContext): void {
  const { journalWatcher, settingsService } = ctx;

  ipcMain.handle('journal:start-backfill', async () => {
    if (journalWatcher.isBackfillingInProgress()) {
      return { error: 'Backfill already in progress' };
    }

    const journalPath = settingsService.getJournalPath();
    if (!journalPath) {
      ctx.getMainWindow()?.webContents.send('journal:backfill-progress', {
        progress: 0,
        total: 0,
        currentFile: '',
        percentage: 100,
        isComplete: true,
      });
      return {
        filesProcessed: 0,
        totalFiles: 0,
        cancelled: false,
        error: 'Journal path not configured. Set the journal path in Exploration settings first.',
      };
    }

    const dbBefore = ctx.dbService.getDatabaseInfo();
    logInfo('JournalIpc', `DB before backfill: ${dbBefore.systemCount} systems, ${dbBefore.bodyCount} bodies`);

    const result = await journalWatcher.backfill((progress, total, currentFile) => {
      ctx.getMainWindow()?.webContents.send('journal:backfill-progress', {
        progress,
        total,
        currentFile,
        percentage: Math.round((progress / total) * 100),
        isComplete: false,
      });
    });

    const dbAfter = ctx.dbService.getDatabaseInfo();
    logInfo('JournalIpc', `Backfill result: ${result.filesProcessed}/${result.totalFiles} files, cancelled=${result.cancelled}, DB after: ${dbAfter.systemCount} systems, ${dbAfter.bodyCount} bodies`);
    if (!result.cancelled && result.filesProcessed > 0) {
      settingsService.setBackfilled(true);

      // Backfill suppresses UI events, so notify the renderer to refresh now that data is available.
      const currentSystem = ctx.dbService.getCurrentSystem();
      logInfo('JournalIpc', `Post-backfill current system: ${currentSystem ? currentSystem.name : 'null'}`);
      if (currentSystem) {
        ctx.getMainWindow()?.webContents.send('journal:system-changed', currentSystem);
      }
    }

    const resolvedResult: {
      filesProcessed: number;
      totalFiles: number;
      cancelled: boolean;
      error?: string;
    } = { ...result };
    if (result.totalFiles === 0 && result.filesProcessed === 0 && !result.cancelled) {
      resolvedResult.error =
        'No journal files (Journal.*.log) found in the configured folder. Check the journal path in Exploration settings.';
    }

    ctx.getMainWindow()?.webContents.send('journal:backfill-progress', {
      progress: result.filesProcessed,
      total: result.totalFiles,
      currentFile: '',
      percentage: 100,
      isComplete: true,
    });

    return resolvedResult;
  });

  ipcMain.handle('journal:cancel-backfill', () => journalWatcher.cancelBackfill());
  ipcMain.handle('journal:is-backfilling', () => journalWatcher.isBackfillingInProgress());
  ipcMain.handle('settings:has-backfilled', () => settingsService.hasBackfilled());

  ipcMain.handle('journal:get-commander-info', () => journalWatcher.getCommanderState());
}

/** Subscribe journal watcher events and forward to renderer. */
export function registerJournalEventForwarding(ctx: MainContext): void {
  const send = (channel: string, payload?: unknown) => {
    ctx.getMainWindow()?.webContents.send(channel, payload);
  };

  ctx.journalWatcher.on('system-changed', (system) => send('journal:system-changed', system));
  ctx.journalWatcher.on('body-scanned', (body) => send('journal:body-scanned', body));
  ctx.journalWatcher.on('body-mapped', (data) => send('journal:body-mapped', data));
  ctx.journalWatcher.on('body-signals-updated', (data) => send('journal:body-signals-updated', data));
  ctx.journalWatcher.on('bio-scanned', (bio) => send('journal:bio-scanned', bio));
  ctx.journalWatcher.on('exobiology-mismatch', (data) => send('journal:exobiology-mismatch', data));
  ctx.journalWatcher.on('journal-file-changed', (data) => send('journal:file-changed', data));
  ctx.journalWatcher.on('journal-continued', (data) => send('journal:continued', data));
  ctx.journalWatcher.on('game-started', (data) => send('journal:game-started', data));
  ctx.journalWatcher.on('game-stopped', (data) => send('journal:game-stopped', data));
  ctx.journalWatcher.on('carrier-jumped', (data) => send('journal:carrier-jumped', data));
  ctx.journalWatcher.on('all-bodies-found', (data) => send('journal:all-bodies-found', data));
  ctx.journalWatcher.on('route-plotted', (data) => send('journal:route-plotted', data));
  ctx.journalWatcher.on('route-cleared', (data) => send('journal:route-cleared', data));
  ctx.journalWatcher.on('touchdown', (data) => send('journal:touchdown', data));
  ctx.journalWatcher.on('liftoff', (data) => send('journal:liftoff', data));
  ctx.journalWatcher.on('body-footfalled', (data) => send('journal:body-footfalled', data));
  ctx.journalWatcher.on('commander-updated', (data) => send('journal:commander-updated', data));
}
