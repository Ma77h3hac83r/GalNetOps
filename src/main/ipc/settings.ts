/** IPC: settings get/set, journal path, validation, detect paths, browse folder. */
import { ipcMain, dialog } from 'electron';
import type { MainContext } from './context';
import {
  settingsKeySchema,
  settingsSetSchema,
  journalPathSchema,
  sanitizePath,
} from '../ipc-validation';

const INVALID_PATH_RESULT = {
  isValid: false,
  exists: false,
  isReadable: false,
  journalCount: 0,
  latestJournal: null as string | null,
  latestJournalDate: null as string | null,
  eliteInstalled: false,
  errors: ['Invalid path'] as string[],
  warnings: [] as string[],
  recentJournals: [] as { name: string; size: number; modified: string }[],
};

export function registerSettingsIpc(ctx: MainContext): void {
  ipcMain.handle('settings:get', (_event, key: unknown) => {
    const parsed = settingsKeySchema.safeParse(key);
    if (!parsed.success) {
      return undefined;
    }
    return (ctx.settingsService as { get(key: string): unknown }).get(parsed.data);
  });

  ipcMain.handle('settings:set', (_event, payload: unknown) => {
    const parsed = settingsSetSchema.safeParse(payload);
    if (!parsed.success) {
      return;
    }
    const { key, value } = parsed.data;
    (ctx.settingsService as { set(key: string, value: unknown): void }).set(key, value);
  });

  ipcMain.handle('settings:get-journal-path', () => {
    return ctx.settingsService.getJournalPath();
  });

  ipcMain.handle('settings:set-journal-path', async (_event, rawPath: unknown) => {
    const pathParsed = journalPathSchema.safeParse(rawPath);
    if (!pathParsed.success) {
      throw new Error('Invalid journal path');
    }
    const sanitized = sanitizePath(pathParsed.data);
    if (!sanitized) {
      throw new Error('Invalid journal path');
    }
    ctx.settingsService.setJournalPath(sanitized);
    await ctx.journalWatcher.setPath(sanitized);
  });

  ipcMain.handle('settings:validate-journal-path', (_event, rawPath: unknown) => {
    const pathParsed = journalPathSchema.safeParse(rawPath);
    if (!pathParsed.success) {
      return INVALID_PATH_RESULT;
    }
    const sanitized = sanitizePath(pathParsed.data);
    if (!sanitized) {
      return INVALID_PATH_RESULT;
    }
    return ctx.settingsService.validateJournalFolder(sanitized);
  });

  ipcMain.handle('settings:detect-elite-paths', () => {
    return ctx.settingsService.detectElitePaths();
  });

  ipcMain.handle('settings:browse-journal-path', async () => {
    const win = ctx.getMainWindow();
    if (!win) {
      return null;
    }

    const journalPath = ctx.settingsService.getJournalPath();
    const result = await dialog.showOpenDialog(win, {
      title: 'Select Elite Dangerous Journal Folder',
      ...(journalPath ? { defaultPath: journalPath } : {}),
      properties: ['openDirectory'],
      buttonLabel: 'Select Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    if (selectedPath === undefined) {
      return null;
    }

    const validation = ctx.settingsService.validateJournalFolder(selectedPath);
    return {
      path: selectedPath,
      validation,
    };
  });
}
