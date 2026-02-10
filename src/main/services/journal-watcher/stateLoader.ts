/**
 * Load state from a journal file: collect location, LoadGame, scans, mapped, signals.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type {
  JournalEvent,
  LoadGameEvent,
  RankEvent,
  ProgressEvent,
  ReputationEvent,
  PowerplayEvent,
  ScanEvent,
  SAAScanCompleteEvent,
  FSSBodySignalsEvent,
  SAASignalsFoundEvent,
} from '../../../shared/types';
import { JOURNAL_EVENTS, MAX_LINES_PER_FILE } from './constants';
import { logWarn } from '../../logger';

export interface LoadedState {
  latestLoadGameEvent: LoadGameEvent | null;
  latestRankEvent: RankEvent | null;
  latestProgressEvent: ProgressEvent | null;
  latestReputationEvent: ReputationEvent | null;
  latestPowerplayEvent: PowerplayEvent | null;
  latestLocationEvent: JournalEvent | null;
  scanEventsBySystem: Map<number, ScanEvent[]>;
  mappedBodiesBySystem: Map<number, SAAScanCompleteEvent[]>;
  signalsBySystem: Map<number, (FSSBodySignalsEvent | SAASignalsFoundEvent)[]>;
}

export async function loadStateFromFile(filePath: string): Promise<LoadedState> {
  let latestLoadGameEvent: LoadGameEvent | null = null;
  let latestRankEvent: RankEvent | null = null;
  let latestProgressEvent: ProgressEvent | null = null;
  let latestReputationEvent: ReputationEvent | null = null;
  let latestPowerplayEvent: PowerplayEvent | null = null;
  let latestLocationEvent: JournalEvent | null = null;
  const scanEventsBySystem = new Map<number, ScanEvent[]>();
  const mappedBodiesBySystem = new Map<number, SAAScanCompleteEvent[]>();
  const signalsBySystem = new Map<number, (FSSBodySignalsEvent | SAASignalsFoundEvent)[]>();

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (lineCount > MAX_LINES_PER_FILE) {
      logWarn(
        'JournalWatcher',
        `File ${path.basename(filePath)} exceeded ${MAX_LINES_PER_FILE} lines during state load; stopping`
      );
      break;
    }
    if (!line.trim()) {
      continue;
    }
    try {
      const event = JSON.parse(line) as JournalEvent;
      if (event.event === JOURNAL_EVENTS.LOAD_GAME) {
        latestLoadGameEvent = event as LoadGameEvent;
      }
      if (event.event === JOURNAL_EVENTS.RANK) {
        latestRankEvent = event as RankEvent;
      }
      if (event.event === JOURNAL_EVENTS.PROGRESS) {
        latestProgressEvent = event as ProgressEvent;
      }
      if (event.event === JOURNAL_EVENTS.REPUTATION) {
        latestReputationEvent = event as ReputationEvent;
      }
      if (event.event === JOURNAL_EVENTS.POWERPLAY) {
        latestPowerplayEvent = event as PowerplayEvent;
      }
      if (
        event.event === JOURNAL_EVENTS.LOCATION ||
        event.event === JOURNAL_EVENTS.FSD_JUMP ||
        event.event === JOURNAL_EVENTS.CARRIER_JUMP
      ) {
        latestLocationEvent = event;
      }
      if (event.event === JOURNAL_EVENTS.SCAN) {
        const scanEvent = event as ScanEvent;
        const existing = scanEventsBySystem.get(scanEvent.SystemAddress) || [];
        existing.push(scanEvent);
        scanEventsBySystem.set(scanEvent.SystemAddress, existing);
      }
      if (event.event === JOURNAL_EVENTS.SAA_SCAN_COMPLETE) {
        const saaEvent = event as SAAScanCompleteEvent;
        const existing = mappedBodiesBySystem.get(saaEvent.SystemAddress) || [];
        existing.push(saaEvent);
        mappedBodiesBySystem.set(saaEvent.SystemAddress, existing);
      }
      if (
        event.event === JOURNAL_EVENTS.FSS_BODY_SIGNALS ||
        event.event === JOURNAL_EVENTS.SAA_SIGNALS_FOUND
      ) {
        const signalEvent = event as FSSBodySignalsEvent | SAASignalsFoundEvent;
        const existing = signalsBySystem.get(signalEvent.SystemAddress) || [];
        existing.push(signalEvent);
        signalsBySystem.set(signalEvent.SystemAddress, existing);
      }
    } catch (e: unknown) {
      // Skip invalid lines
    }
  }

  return {
    latestLoadGameEvent,
    latestRankEvent,
    latestProgressEvent,
    latestReputationEvent,
    latestPowerplayEvent,
    latestLocationEvent,
    scanEventsBySystem,
    mappedBodiesBySystem,
    signalsBySystem,
  };
}
