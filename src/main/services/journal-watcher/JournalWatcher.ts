/**
 * Watches journal folder, parses events, updates DB, emits for renderer.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import type { DatabaseService } from '../database';
import type { SettingsService } from '../settings';
import type {
  JournalEvent,
  LoadGameEvent,
  RankEvent,
  ProgressEvent,
  ReputationEvent,
  PowerplayEvent,
  PromotionEvent,
  FSDJumpEvent,
  CarrierJumpEvent,
  LocationEvent,
  ScanEvent,
  SAAScanCompleteEvent,
  FSSBodySignalsEvent,
  SAASignalsFoundEvent,
  System,
} from '../../../shared/types';
import { logInfo, logWarn, logError, logDebug, isDev } from '../../logger';

import type { GameState, CarrierState, RouteInfo, SurfaceState, CommanderState } from './types';
import { JOURNAL_EVENTS, MAX_BACKFILL_FILES, MAX_LINES_PER_FILE } from './constants';
import { getJournalFiles, findLatestJournal } from './journalFiles';
import { loadStateFromFile } from './stateLoader';
import { processSignalEvent } from './processSignal';
import type { JournalWatcherContext } from './handlers/context';
import * as sessionHandlers from './handlers/session';
import * as navHandlers from './handlers/nav';
import * as surfaceHandlers from './handlers/surface';
import * as scanHandlers from './handlers/scan';

export class JournalWatcher extends EventEmitter {
  private db: DatabaseService;
  private settings: SettingsService;
  private watcher: FSWatcher | null = null;
  private journalPath: string | null = null;
  private currentFile: string | null = null;
  private filePosition: number = 0;
  private sessionId: string;
  private currentSystem: System | null = null;
  private gameState: GameState = {
    isRunning: false,
    commander: null,
    gameMode: null,
    ship: null,
    isOdyssey: false,
    isHorizons: false,
  };
  private carrierState: CarrierState = {
    isOnCarrier: false,
    carrierName: null,
    carrierMarketId: null,
    isDocked: false,
  };
  private routeInfo: RouteInfo = {
    hasRoute: false,
    routeLength: 0,
    destination: null,
    jumpsRemaining: 0,
  };
  private surfaceState: SurfaceState = {
    isLanded: false,
    bodyName: null,
    bodyId: null,
    latitude: null,
    longitude: null,
    nearestDestination: null,
  };
  private commanderState: CommanderState = {
    name: null,
    credits: 0,
    loan: 0,
    ship: null,
    shipName: null,
    shipIdent: null,
    ranks: null,
    progress: null,
    reputation: null,
    powerplay: null,
  };
  private pendingSignals = new Map<
    string,
    { bioSignals: number; geoSignals: number; humanSignals?: number; thargoidSignals?: number }
  >();
  private isProcessingNewFile = false;
  private backfillCancelled = false;
  private isBackfilling = false;
  private readonly ctx: JournalWatcherContext;

  constructor(db: DatabaseService, settings: SettingsService) {
    super();
    this.db = db;
    this.settings = settings;
    this.sessionId = this.generateSessionId();
    this.ctx = this.buildContext();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /** Build the handler context once; closures capture `this` so state is always current. */
  private buildContext(): JournalWatcherContext {
    return {
      db: this.db,
      settings: this.settings,
      getGameState: () => ({ ...this.gameState }),
      setGameState: (g) => {
        this.gameState = g;
      },
      getCarrierState: () => ({ ...this.carrierState }),
      setCarrierState: (c) => {
        this.carrierState = c;
      },
      getRouteInfo: () => ({ ...this.routeInfo }),
      setRouteInfo: (r) => {
        this.routeInfo = r;
      },
      getSurfaceState: () => ({ ...this.surfaceState }),
      setSurfaceState: (s) => {
        this.surfaceState = s;
      },
      getCommanderState: () => ({ ...this.commanderState }),
      setCommanderState: (c) => {
        this.commanderState = c;
      },
      getCurrentSystem: () => this.currentSystem,
      setCurrentSystem: (s) => {
        this.currentSystem = s;
      },
      getPendingSignals: () => this.pendingSignals,
      getSessionId: () => this.sessionId,
      emit: (event: string, payload?: unknown) => this.emit(event, payload),
    };
  }

  async setPath(journalPath: string): Promise<void> {
    this.journalPath = journalPath;
    if (this.watcher) {
      this.stop();
      await this.start();
    }
  }

  async start(): Promise<void> {
    this.journalPath = this.settings.getJournalPath();
    if (!this.journalPath) {
      logInfo('JournalWatcher', 'No journal path configured');
      return;
    }
    if (!fs.existsSync(this.journalPath)) {
      logError('JournalWatcher', 'Journal path does not exist');
      return;
    }

    this.currentFile = findLatestJournal(this.journalPath);
    if (this.currentFile) {
      await this.loadCurrentStateFromJournal(this.currentFile);
      const stats = fs.statSync(this.currentFile);
      this.filePosition = stats.size;
      logInfo('JournalWatcher', `Starting with journal file: ${path.basename(this.currentFile)}`);
    }

    this.watcher = chokidar.watch(this.journalPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 100 },
    });
    this.watcher.on('add', (filePath) => this.onFileAdded(filePath));
    this.watcher.on('change', (filePath) => this.onFileChanged(filePath));

    logInfo('JournalWatcher', isDev() ? `Journal watcher started: ${this.journalPath}` : 'Journal watcher started');
    this.emit('watcher-started', { path: this.journalPath });
  }

  private async loadCurrentStateFromJournal(filePath: string): Promise<void> {
    logInfo('JournalWatcher', `Loading current state from journal: ${path.basename(filePath)}`);
    const loaded = await loadStateFromFile(filePath);

    if (loaded.latestLoadGameEvent) {
      const e = loaded.latestLoadGameEvent;
      this.gameState = {
        isRunning: true,
        commander: e.Commander,
        gameMode: e.GameMode,
        ship: e.Ship_Localised || e.Ship,
        isOdyssey: e.Odyssey ?? false,
        isHorizons: e.Horizons ?? false,
      };
      this.commanderState = {
        ...this.commanderState,
        name: e.Commander,
        credits: e.Credits ?? 0,
        loan: e.Loan ?? 0,
        ship: e.Ship_Localised || e.Ship,
        shipName: e.ShipName || null,
        shipIdent: e.ShipIdent || null,
      };
      logDebug('JournalWatcher', isDev() ? `Loaded commander: ${e.Commander}` : 'Loaded commander');
    }

    if (loaded.latestRankEvent) {
      const r = loaded.latestRankEvent;
      this.commanderState.ranks = {
        combat: r.Combat,
        trade: r.Trade,
        explore: r.Explore,
        soldier: r.Soldier,
        exobiologist: r.Exobiologist,
        empire: r.Empire,
        federation: r.Federation,
        cqc: r.CQC,
      };
    }
    if (loaded.latestProgressEvent) {
      const p = loaded.latestProgressEvent;
      this.commanderState.progress = {
        combat: p.Combat,
        trade: p.Trade,
        explore: p.Explore,
        soldier: p.Soldier,
        exobiologist: p.Exobiologist,
        empire: p.Empire,
        federation: p.Federation,
        cqc: p.CQC,
      };
    }
    if (loaded.latestReputationEvent) {
      const rep = loaded.latestReputationEvent;
      this.commanderState.reputation = {
        empire: rep.Empire,
        federation: rep.Federation,
        alliance: rep.Alliance,
        independent: rep.Independent,
      };
    }
    if (loaded.latestPowerplayEvent) {
      const pp = loaded.latestPowerplayEvent;
      this.commanderState.powerplay = {
        power: pp.Power,
        rank: pp.Rank,
        merits: pp.Merits,
        timePledged: pp.TimePledged,
      };
    }

    if (loaded.latestLocationEvent) {
      let system: System | null = null;
      let systemAddress: number | null = null;
      const ev = loaded.latestLocationEvent;

      if (ev.event === 'Location') {
        const e = ev as LocationEvent;
        systemAddress = e.SystemAddress;
        system = this.db.upsertSystem(e.SystemAddress, e.StarSystem, e.StarPos);
      } else if (ev.event === 'FSDJump') {
        const e = ev as FSDJumpEvent;
        systemAddress = e.SystemAddress;
        system = this.db.upsertSystem(e.SystemAddress, e.StarSystem, e.StarPos);
      } else if (ev.event === 'CarrierJump') {
        const e = ev as CarrierJumpEvent;
        systemAddress = e.SystemAddress;
        system = this.db.upsertSystem(e.SystemAddress, e.StarSystem, e.StarPos);
      }

      if (system) {
        this.currentSystem = system;
        logDebug('JournalWatcher', isDev() ? `Loaded current system: ${system.name}` : 'Loaded current system');

        if (systemAddress !== null) {
          const scans = loaded.scanEventsBySystem.get(systemAddress) || [];
          for (const scanEvent of scans) {
            this.db.upsertBody(system.id, scanEvent);
          }
          if (scans.length > 0) {
            logInfo('JournalWatcher', `Loaded ${scans.length} bodies for current system`);
          }
          const mapped = loaded.mappedBodiesBySystem.get(systemAddress) || [];
          for (const saaEvent of mapped) {
            this.db.updateBodyMapped(system.id, saaEvent.BodyID);
          }
          if (mapped.length > 0) {
            logInfo('JournalWatcher', `Loaded ${mapped.length} mapped bodies`);
          }
          const signals = loaded.signalsBySystem.get(systemAddress) || [];
          for (const signalEvent of signals) {
            processSignalEvent(this.db, system.id, signalEvent);
          }
          if (signals.length > 0) {
            logInfo('JournalWatcher', `Loaded signals for ${signals.length} bodies`);
          }
        }
        this.emit('system-changed', system);
      }
    } else {
      logInfo('JournalWatcher', 'No location event found in latest journal');
    }

    // Emit commander state if we have any data from this journal
    if (this.commanderState.name) {
      this.emit('commander-updated', { ...this.commanderState });
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    this.gameState.isRunning = false;
    logInfo('JournalWatcher', 'Journal watcher stopped');
    this.emit('watcher-stopped');
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }
  getCarrierState(): CarrierState {
    return { ...this.carrierState };
  }
  getRouteInfo(): RouteInfo {
    return { ...this.routeInfo };
  }
  getSurfaceState(): SurfaceState {
    return { ...this.surfaceState };
  }
  getCommanderState(): CommanderState {
    return { ...this.commanderState };
  }
  getCurrentFileInfo(): { file: string | null; position: number } {
    return {
      file: this.currentFile ? path.basename(this.currentFile) : null,
      position: this.filePosition,
    };
  }

  async backfill(progressCallback?: (progress: number, total: number, currentFile: string) => void): Promise<{
    filesProcessed: number;
    totalFiles: number;
    cancelled: boolean;
  }> {
    const pathFromSettings = this.settings.getJournalPath();
    const pathToUse = this.journalPath ?? pathFromSettings;
    logInfo('JournalWatcher', 'Backfill starting');
    if (!pathToUse) {
      return { filesProcessed: 0, totalFiles: 0, cancelled: false };
    }
    this.isBackfilling = true;
    this.backfillCancelled = false;
    const allJournalFiles = getJournalFiles(pathToUse);
    const journalFiles = allJournalFiles.slice(0, MAX_BACKFILL_FILES);
    if (pathToUse !== this.journalPath) {
      this.journalPath = pathToUse;
    }
    logInfo('JournalWatcher', `Backfill: found ${journalFiles.length} journal files`);
    if (allJournalFiles.length > MAX_BACKFILL_FILES) {
      logWarn('JournalWatcher', `Found ${allJournalFiles.length} journal files; limiting backfill to ${MAX_BACKFILL_FILES}`);
    }
    const total = journalFiles.length;
    let filesProcessed = 0;
    try {
      for (let i = 0; i < journalFiles.length; i++) {
        if (this.backfillCancelled) {
          logInfo('JournalWatcher', 'Backfill cancelled by user');
          return { filesProcessed, totalFiles: total, cancelled: true };
        }
        const fileName = path.basename(journalFiles[i]!);
        progressCallback?.(i + 1, total, fileName);
        await this.processJournalFile(journalFiles[i]!, true);
        filesProcessed++;
      }
    } finally {
      this.isBackfilling = false;
      this.backfillCancelled = false;
    }
    logInfo('JournalWatcher', `Backfill complete: processed ${filesProcessed}/${total} files`);
    return { filesProcessed, totalFiles: total, cancelled: false };
  }

  cancelBackfill(): void {
    if (this.isBackfilling) {
      this.backfillCancelled = true;
    }
  }

  isBackfillingInProgress(): boolean {
    return this.isBackfilling;
  }

  private async onFileAdded(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    if (!filename.startsWith('Journal.') || !filename.endsWith('.log')) return;
    logInfo('JournalWatcher', `New journal file detected: ${filename}`);
    const previousFile = this.currentFile;
    this.currentFile = filePath;
    this.filePosition = 0;
    this.sessionId = this.generateSessionId();
    this.emit('journal-file-changed', {
      previousFile: previousFile ? path.basename(previousFile) : null,
      newFile: filename,
      timestamp: new Date().toISOString(),
    });
    await this.processNewJournalFile(filePath);
  }

  private async processNewJournalFile(filePath: string): Promise<void> {
    if (this.isProcessingNewFile) {
      logInfo('JournalWatcher', 'Already processing a new file, skipping');
      return;
    }
    this.isProcessingNewFile = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!fs.existsSync(filePath)) {
        logError('JournalWatcher', 'New journal file no longer exists');
        return;
      }
      const stream = fs.createReadStream(filePath, { start: 0, encoding: 'utf8' });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      let lineCount = 0;
      for await (const line of rl) {
        lineCount++;
        if (lineCount > MAX_LINES_PER_FILE) {
          logWarn('JournalWatcher', `New file ${path.basename(filePath)} exceeded ${MAX_LINES_PER_FILE} lines; stopping`);
          break;
        }
        if (line.trim()) {
          try {
            const event = JSON.parse(line) as JournalEvent;
            await this.processEvent(event, false);
          } catch (err: unknown) {
            logError('JournalWatcher', 'Failed to parse journal line in new file', err);
          }
        }
      }
      // Re-stat after reading so filePosition reflects the actual end of what was read,
      // not a stale size captured before the stream opened.
      this.filePosition = fs.statSync(filePath).size;
      logInfo('JournalWatcher', `Processed new journal file: ${path.basename(filePath)}, position: ${this.filePosition}`);
    } catch (err: unknown) {
      logError('JournalWatcher', 'Error processing new journal file', err);
    } finally {
      this.isProcessingNewFile = false;
    }
  }

  private async onFileChanged(filePath: string): Promise<void> {
    if (filePath !== this.currentFile) return;
    if (this.isProcessingNewFile) return;
    await this.readNewLines();
  }

  private async readNewLines(): Promise<void> {
    if (!this.currentFile) return;
    let initialSize: number;
    try {
      initialSize = fs.statSync(this.currentFile).size;
    } catch (err: unknown) {
      logError('JournalWatcher', 'Error getting file stats', err);
      return;
    }
    if (initialSize <= this.filePosition) return;

    const stream = fs.createReadStream(this.currentFile, {
      start: this.filePosition,
      encoding: 'utf8',
    });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineCount = 0;
    for await (const line of rl) {
      lineCount++;
      if (lineCount > MAX_LINES_PER_FILE) {
        logWarn('JournalWatcher', `File exceeded ${MAX_LINES_PER_FILE} new lines; stopping incremental read`);
        break;
      }
      if (line.trim()) {
        try {
          const event = JSON.parse(line) as JournalEvent;
          await this.processEvent(event);
        } catch (err: unknown) {
          logError('JournalWatcher', 'Failed to parse journal line', err);
        }
      }
    }
    // Re-stat after reading so filePosition reflects the actual end of what was read,
    // not a stale size captured before the stream opened.
    this.filePosition = fs.statSync(this.currentFile).size;
  }

  private async processJournalFile(filePath: string, isBackfill: boolean): Promise<void> {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineCount = 0;
    for await (const line of rl) {
      lineCount++;
      if (lineCount > MAX_LINES_PER_FILE) {
        logWarn('JournalWatcher', `File ${path.basename(filePath)} exceeded ${MAX_LINES_PER_FILE} lines; stopping`);
        break;
      }
      if (line.trim()) {
        try {
          const event = JSON.parse(line) as JournalEvent;
          await this.processEvent(event, isBackfill);
        } catch (err: unknown) {
          if (isBackfill) {
            logError('JournalWatcher', `Backfill: failed to process event (file=${path.basename(filePath)} line=${lineCount})`, err);
          }
          // Skip invalid lines; during live watch we already log in readNewLines/processNewJournalFile
        }
      }
    }
  }

  private async processEvent(event: JournalEvent, isBackfill = false): Promise<void> {
    if (event == null || typeof event !== 'object' || Array.isArray(event)) {
      return;
    }
    const eventType = (event as { event?: string }).event;
    if (typeof eventType !== 'string') {
      return;
    }
    try {
      switch (eventType) {
        case JOURNAL_EVENTS.LOAD_GAME:
          await sessionHandlers.handleLoadGame(this.ctx, event as LoadGameEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.CONTINUED:
          await sessionHandlers.handleContinued(this.ctx, event as import('../../../shared/types').ContinuedEvent);
          break;
        case JOURNAL_EVENTS.SHUTDOWN:
          await sessionHandlers.handleShutdown(this.ctx);
          break;
        case JOURNAL_EVENTS.RANK:
          await sessionHandlers.handleRank(this.ctx, event as RankEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.PROGRESS:
          await sessionHandlers.handleProgress(this.ctx, event as ProgressEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.REPUTATION:
          await sessionHandlers.handleReputation(this.ctx, event as ReputationEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.POWERPLAY:
          await sessionHandlers.handlePowerplay(this.ctx, event as PowerplayEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.PROMOTION:
          await sessionHandlers.handlePromotion(this.ctx, event as PromotionEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.FSD_JUMP:
          await navHandlers.handleFSDJump(this.ctx, event as FSDJumpEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.CARRIER_JUMP:
          await navHandlers.handleCarrierJump(this.ctx, event as CarrierJumpEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.LOCATION:
          await navHandlers.handleLocation(this.ctx, event as LocationEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.FSS_DISCOVERY_SCAN:
          await navHandlers.handleDiscoveryScan(this.ctx, event as import('../../../shared/types').FSSDiscoveryScanEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.FSS_ALL_BODIES_FOUND:
          await navHandlers.handleAllBodiesFound(this.ctx, event as import('../../../shared/types').FSSAllBodiesFoundEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.NAV_ROUTE:
          await navHandlers.handleNavRoute(this.ctx, event as import('../../../shared/types').NavRouteEvent);
          break;
        case JOURNAL_EVENTS.NAV_ROUTE_CLEAR:
          await navHandlers.handleNavRouteClear(this.ctx);
          break;
        case JOURNAL_EVENTS.TOUCHDOWN:
          await surfaceHandlers.handleTouchdown(this.ctx, event as import('../../../shared/types').TouchdownEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.LIFTOFF:
          await surfaceHandlers.handleLiftoff(this.ctx, event as import('../../../shared/types').LiftoffEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.DISEMBARK:
          await surfaceHandlers.handleDisembark(this.ctx, event as import('../../../shared/types').DisembarkEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.SCAN:
          await scanHandlers.handleScan(this.ctx, event as ScanEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.SAA_SCAN_COMPLETE:
          await scanHandlers.handleSAAScan(this.ctx, event as SAAScanCompleteEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.FSS_BODY_SIGNALS:
        case JOURNAL_EVENTS.SAA_SIGNALS_FOUND:
          await scanHandlers.handleBodySignals(this.ctx, event as FSSBodySignalsEvent | SAASignalsFoundEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.SCAN_ORGANIC:
          await scanHandlers.handleScanOrganic(this.ctx, event as import('../../../shared/types').ScanOrganicEvent, isBackfill);
          break;
        case JOURNAL_EVENTS.CODEX_ENTRY:
          await scanHandlers.handleCodexEntry(this.ctx, event as import('../../../shared/types').CodexEntryEvent, isBackfill);
          break;
        default:
          // Not a tracked event type — skip silently
          return;
      }
    } catch (err: unknown) {
      logError('JournalWatcher', `Handler error for ${eventType}`, err);
    }
  }
}
