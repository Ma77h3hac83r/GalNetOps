/** Main window creation, bounds validation, and state persistence. */
import { BrowserWindow, screen, shell, type BrowserWindowConstructorOptions } from 'electron';
import * as path from 'path';
import type { SettingsService } from './services/settings';
import { logError, logWarn } from './logger';

export interface WindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Validate that window bounds are on a visible display.
 * Returns the bounds if valid, or null if window would be off-screen.
 */
export function validateWindowBounds(
  bounds: WindowBounds | null
): { x?: number; y?: number; width: number; height: number } | null {
  if (!bounds) {
    return null;
  }

  const displays = screen.getAllDisplays();
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

  if (bounds.width >= 800 && bounds.height >= 600) {
    return {
      x: undefined as unknown as number,
      y: undefined as unknown as number,
      width: bounds.width,
      height: bounds.height,
    };
  }

  return null;
}

export function saveWindowState(
  win: BrowserWindow | null,
  settingsService: SettingsService
): void {
  if (win && !win.isMaximized()) {
    const bounds = win.getBounds();
    settingsService.setWindowBounds(bounds);
  }
}

export function createWindow(
  settingsService: SettingsService,
  isDev: boolean,
  preloadPath: string,
  isAllowedExternalUrl: (url: string) => boolean
): BrowserWindow {
  const savedBounds = settingsService.getWindowBounds();
  const wasMaximized = settingsService.getIsMaximized();
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
    frame: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: preloadPath,
    },
  };
  if (validatedBounds?.x !== undefined && validatedBounds?.y !== undefined) {
    windowOpts.x = validatedBounds.x;
    windowOpts.y = validatedBounds.y;
  }

  const win = new BrowserWindow(windowOpts);

  if (wasMaximized) {
    win.maximize();
  }

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(path.dirname(preloadPath), '../renderer/index.html'));
  }

  win.on('resize', () => saveWindowState(win, settingsService));
  win.on('move', () => saveWindowState(win, settingsService));
  win.on('maximize', () => settingsService.setIsMaximized(true));
  win.on('unmaximize', () => settingsService.setIsMaximized(false));

  win.webContents.on('render-process-gone', (_event, details) => {
    logError('Main', `Render process gone: ${details.reason} (exit ${details.exitCode})`);
  });

  win.on('unresponsive', () => {
    logWarn('Main', 'Window unresponsive');
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  return win;
}
