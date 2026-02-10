/** IPC: window controls, app info, open external. */
import { ipcMain, app, shell } from 'electron';
import type { MainContext } from './context';
import { appOpenExternalSchema, isAllowedExternalUrl } from '../ipc-validation';

export function registerAppIpc(ctx: MainContext): void {
  ipcMain.on('app:minimize', () => ctx.getMainWindow()?.minimize());
  ipcMain.on('app:maximize', () => {
    const win = ctx.getMainWindow();
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });
  ipcMain.on('app:close', () => ctx.getMainWindow()?.close());

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

  ipcMain.handle('app:open-external', (_event, url: unknown) => {
    const parsed = appOpenExternalSchema.safeParse({ url });
    if (!parsed.success || !isAllowedExternalUrl(parsed.data.url)) {
      return;
    }
    shell.openExternal(parsed.data.url);
  });
}
