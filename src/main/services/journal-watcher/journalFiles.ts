/**
 * Journal directory listing and latest file resolution.
 */
import * as fs from 'fs';
import * as path from 'path';
import { MAX_FILES_IN_DIRECTORY } from './constants';
import { logWarn } from '../../logger';

export function getJournalFiles(journalPath: string | null): string[] {
  if (!journalPath) {
    return [];
  }
  const files = fs.readdirSync(journalPath);
  const journalFiles = files
    .filter((f) => f.startsWith('Journal.') && f.endsWith('.log'))
    .map((f) => path.join(journalPath, f))
    .sort();
  if (journalFiles.length > MAX_FILES_IN_DIRECTORY) {
    logWarn(
      'JournalWatcher',
      `Journal directory has ${journalFiles.length} journal files; limiting to ${MAX_FILES_IN_DIRECTORY}`
    );
    return journalFiles.slice(0, MAX_FILES_IN_DIRECTORY);
  }
  return journalFiles;
}

export function findLatestJournal(journalPath: string | null): string | null {
  if (!journalPath) {
    return null;
  }
  const journalFiles = getJournalFiles(journalPath);
  const last = journalFiles[journalFiles.length - 1];
  return last !== undefined ? last : null;
}
