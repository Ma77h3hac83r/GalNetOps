/**
 * EDAstro Galactic Records: load/store and optional scrape on startup.
 * Runs scraper at most every 7 days; notifies renderer via IPC when check runs.
 */
import { logInfo, logError } from '../../logger';
import { scrapeAllBodyTypes } from './scraper';
import {
  loadGalacticRecords,
  saveGalacticRecords,
  shouldRefreshGalacticRecords,
} from './storage';
import type { GalacticRecordsStore } from '../../../shared/galacticRecords';

let isChecking = false;

export function isGalacticRecordsCheckRunning(): boolean {
  return isChecking;
}

export function getGalacticRecordsStatus(): {
  isChecking: boolean;
  lastScrapedAt: string | null;
  recordCount: number;
  error?: string;
} {
  const store = loadGalacticRecords();
  return {
    isChecking,
    lastScrapedAt: store?.scrapedAt ?? null,
    recordCount: store?.records?.length ?? 0,
  };
}

export function getGalacticRecords(): GalacticRecordsStore | null {
  return loadGalacticRecords();
}

export type SendRecordsCheckStarted = () => void;
export type SendRecordsCheckFinished = (payload: { success: boolean; error?: string }) => void;

/**
 * If no stored data or data is older than 7 days, run the scraper and save.
 * Call sendStarted/sendFinished to notify the renderer (banner).
 */
export async function runGalacticRecordsCheckIfNeeded(
  sendStarted: SendRecordsCheckStarted,
  sendFinished: SendRecordsCheckFinished
): Promise<void> {
  if (isChecking) return;
  if (!shouldRefreshGalacticRecords()) {
    logInfo('EDAstro Records', 'Galactic records are fresh; skipping scrape');
    return;
  }

  isChecking = true;
  sendStarted();

  try {
    logInfo('EDAstro Records', 'Starting galactic records scrape');
    const records = await scrapeAllBodyTypes();
    const scrapedAt = new Date().toISOString();
    const store: GalacticRecordsStore = { scrapedAt, records };
    saveGalacticRecords(store);
    logInfo('EDAstro Records', `Saved ${records.length} body type records`);
    sendFinished({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError('EDAstro Records', 'Scrape failed', err);
    sendFinished({ success: false, error: message });
  } finally {
    isChecking = false;
  }
}
