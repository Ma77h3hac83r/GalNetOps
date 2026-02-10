/** IPC: database queries and management (backup, import). */
import { ipcMain, dialog } from 'electron';
import * as fs from 'fs';
import type { MainContext } from './context';
import {
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
  sanitizePath,
} from '../ipc-validation';

export function registerDatabaseIpc(ctx: MainContext): void {
  const { dbService } = ctx;

  ipcMain.handle('db:get-current-system', () => dbService.getCurrentSystem());

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
    type RouteHistoryFilter = import('../../shared/types').RouteHistoryFilter;
    return dbService.getRouteHistory(
      parsed.data.limit,
      parsed.data.offset,
      parsed.data.filter as RouteHistoryFilter | undefined
    );
  });

  ipcMain.handle('db:get-route-history-count', (_event, filter: unknown) => {
    const parsed = dbGetRouteHistoryCountSchema.safeParse({ filter });
    if (!parsed.success) return 0;
    type RouteHistoryFilter = import('../../shared/types').RouteHistoryFilter;
    return dbService.getRouteHistoryCount(
      parsed.data.filter as RouteHistoryFilter | undefined
    );
  });

  ipcMain.handle('db:get-route-history-totals', (_event, filter: unknown) => {
    const parsed = dbGetRouteHistoryTotalsSchema.safeParse({ filter });
    if (!parsed.success) return { totalDistance: 0, totalFuel: 0 };
    type RouteHistoryFilter = import('../../shared/types').RouteHistoryFilter;
    return dbService.getRouteHistoryTotals(
      parsed.data.filter as RouteHistoryFilter | undefined
    );
  });

  ipcMain.handle('db:get-route-sessions', () => dbService.getRouteSessions());
  ipcMain.handle('db:get-statistics', () => dbService.getStatistics());

  ipcMain.handle('db:get-body-biologicals', (_event, bodyDbId: unknown) => {
    const parsed = dbGetBodyBiologicalsSchema.safeParse({ bodyDbId });
    if (!parsed.success) return [];
    return dbService.getBodyBiologicals(parsed.data.bodyDbId);
  });

  ipcMain.handle('db:get-all-biologicals', () => dbService.getAllBiologicals());
  ipcMain.handle('db:get-biological-stats', () => dbService.getBiologicalStats());

  ipcMain.handle('db:get-codex-entries', (_event, payload: unknown) => {
    const parsed = dbGetCodexEntriesSchema.safeParse(payload ?? {});
    if (!parsed.success) return [];
    type CodexFilter = {
      category?: string;
      subcategory?: string;
      region?: string;
      isNewOnly?: boolean;
    };
    return dbService.getCodexEntries(
      parsed.data.filter as CodexFilter | undefined
    );
  });

  ipcMain.handle('db:get-codex-stats', () => dbService.getCodexStats());
  ipcMain.handle('db:get-scan-values-by-date', () => dbService.getScanValuesByDate());
  ipcMain.handle('db:get-session-discovery-counts', () =>
    dbService.getSessionDiscoveryCounts()
  );
  ipcMain.handle('db:get-body-type-distribution', () =>
    dbService.getBodyTypeDistribution()
  );

  ipcMain.handle('db:get-database-info', () => dbService.getDatabaseInfo());
  ipcMain.handle('db:clear-exploration-data', () => {
    const result = dbService.clearExplorationData();
    if (result.success) {
      ctx.settingsService.setBackfilled(false);
    }
    return result;
  });

  ipcMain.handle('db:backup-database', async () => {
    const win = ctx.getMainWindow();
    if (!win) return { success: false, error: 'No main window' };

    const dbInfo = dbService.getDatabaseInfo();
    const defaultName = `galnetops-backup-${new Date().toISOString().slice(0, 10)}.db`;

    const result = await dialog.showSaveDialog(win, {
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
      fs.copyFileSync(dbInfo.path, result.filePath);
      return { success: true, path: result.filePath };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to backup database',
      };
    }
  });

  ipcMain.handle('db:validate-import-database', async () => {
    const win = ctx.getMainWindow();
    if (!win) return { valid: false, error: 'No main window' };

    const result = await dialog.showOpenDialog(win, {
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
    return { ...validation, path: importPath };
  });

  ipcMain.handle('db:import-database', async (_event, rawImportPath: unknown) => {
    const { logInfo } = await import('../logger');
    logInfo('DatabaseIpc', `db:import-database invoked with path: ${rawImportPath}`);
    const parsed = dbImportDatabaseSchema.safeParse({ importPath: rawImportPath });
    if (!parsed.success) {
      return { success: false, error: 'No import path provided' };
    }
    const importPath = sanitizePath(parsed.data.importPath);
    if (!importPath) {
      return { success: false, error: 'Invalid import path' };
    }

    const validation = dbService.validateImportDatabase(importPath);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      const dbInfo = dbService.getDatabaseInfo();
      const currentDbPath = dbInfo.path;

      dbService.close();

      const backupPath = currentDbPath + '.backup-' + Date.now();
      if (fs.existsSync(currentDbPath)) {
        fs.copyFileSync(currentDbPath, backupPath);
      }

      try {
        fs.copyFileSync(importPath, currentDbPath);
        const walPath = importPath + '-wal';
        const shmPath = importPath + '-shm';
        if (fs.existsSync(walPath)) {
          fs.copyFileSync(walPath, currentDbPath + '-wal');
        }
        if (fs.existsSync(shmPath)) {
          fs.copyFileSync(shmPath, currentDbPath + '-shm');
        }

        await dbService.initialize();

        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }

        return { success: true };
      } catch (importError: unknown) {
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, currentDbPath);
          fs.unlinkSync(backupPath);
        }
        await dbService.initialize();
        throw importError;
      }
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to import database',
      };
    }
  });
}
