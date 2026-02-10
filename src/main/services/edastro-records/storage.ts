/** Galactic records storage: read/write JSON in userData, check age. */
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import type { GalacticRecordsStore } from '../../../shared/galacticRecords';
import { GALACTIC_RECORDS_FILENAME, GALACTIC_RECORDS_MAX_AGE_DAYS } from '../../../shared/constants';

export function getGalacticRecordsPath(): string {
  return path.join(app.getPath('userData'), GALACTIC_RECORDS_FILENAME);
}

export function loadGalacticRecords(): GalacticRecordsStore | null {
  const filePath = getGalacticRecordsPath();
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as unknown;
    if (data == null || typeof data !== 'object' || !('scrapedAt' in data) || !('records' in data)) {
      return null;
    }
    const store = data as GalacticRecordsStore;
    if (!Array.isArray(store.records)) return null;
    return store;
  } catch {
    return null;
  }
}

export function saveGalacticRecords(store: GalacticRecordsStore): void {
  const filePath = getGalacticRecordsPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Returns true if we should run the scraper: no data or data older than GALACTIC_RECORDS_MAX_AGE_DAYS.
 */
export function shouldRefreshGalacticRecords(): boolean {
  const store = loadGalacticRecords();
  if (!store || store.records.length === 0) return true;
  const scraped = new Date(store.scrapedAt).getTime();
  const ageDays = (Date.now() - scraped) / (24 * 60 * 60 * 1000);
  return ageDays >= GALACTIC_RECORDS_MAX_AGE_DAYS;
}
