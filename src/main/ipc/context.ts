/** Context passed to IPC handler registration (window + services). */
import type { BrowserWindow } from 'electron';
import type { DatabaseService } from '../services/database';
import type { JournalWatcher } from '../services/journal-watcher';
import type { SettingsService } from '../services/settings';
import type { EDSMService } from '../services/edsm';

export interface MainContext {
  getMainWindow(): BrowserWindow | null;
  dbService: DatabaseService;
  journalWatcher: JournalWatcher;
  settingsService: SettingsService;
  edsmService: EDSMService;
}
