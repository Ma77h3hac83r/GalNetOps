/** Initialize main process services (settings, database, EDSM, journal watcher). */
import { DatabaseService } from './services/database';
import { JournalWatcher } from './services/journal-watcher';
import { EDSMService } from './services/edsm';
import { SettingsService } from './services/settings';

export interface MainServices {
  dbService: DatabaseService;
  journalWatcher: JournalWatcher;
  settingsService: SettingsService;
  edsmService: EDSMService;
}

export async function initializeServices(): Promise<MainServices> {
  const settingsService = new SettingsService();

  const dbService = new DatabaseService();
  await dbService.initialize();

  const edsmService = new EDSMService();
  edsmService.setDatabaseService(dbService);

  const journalWatcher = new JournalWatcher(dbService, settingsService);

  return {
    dbService,
    journalWatcher,
    settingsService,
    edsmService,
  };
}
