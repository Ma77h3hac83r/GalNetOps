/** IPC: EDAstro galactic records status and events (scraper runs on startup when data missing or >7 days old). */
import { ipcMain } from 'electron';
import {
  getGalacticRecordsStatus,
  getGalacticRecords,
} from '../services/edastro-records';

export function registerEdastroRecordsIpc(): void {
  ipcMain.handle(
    'edastro:get-galactic-records-status',
    () => getGalacticRecordsStatus()
  );

  ipcMain.handle('edastro:get-galactic-records', () => getGalacticRecords());
}
