/** IPC: EDSM API and cache management, EDAstro GEC POI list. */
import { ipcMain } from 'electron';
import type { MainContext } from './context';
import { getGecPoiList } from '../services/edastro-gec';
import {
  edsmGetSystemSchema,
  edsmGetSystemBodiesSchema,
  edsmGetSystemValueSchema,
  edsmGetSystemBodyCountSchema,
  edsmSearchSystemsSchema,
  edsmClearCacheSchema,
} from '../ipc-validation';

export function registerEdsmIpc(ctx: MainContext): void {
  const { edsmService } = ctx;

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

  ipcMain.handle('edsm:get-cache-stats', () => edsmService.getCacheStats());
  ipcMain.handle('edsm:get-last-error', () => edsmService.getLastError());
  ipcMain.handle('edsm:clear-last-error', () => {
    edsmService.clearLastError();
    return { success: true };
  });

  ipcMain.handle('edastro:get-poi-list', () => getGecPoiList());
}
