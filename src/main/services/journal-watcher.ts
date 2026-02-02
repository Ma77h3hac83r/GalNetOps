/** Watches Elite Dangerous journal folder, parses events, updates DB, and emits system/body/signals/bio/codex and game-state events for the renderer. */
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { EventEmitter } from 'events';
import chokidar, { FSWatcher } from 'chokidar';
import { DatabaseService } from './database';
import type SettingsService from './settings';
import {
  JournalEvent,
  FSDJumpEvent,
  CarrierJumpEvent,
  LocationEvent,
  FSSDiscoveryScanEvent,
  FSSAllBodiesFoundEvent,
  NavRouteEvent,
  TouchdownEvent,
  LiftoffEvent,
  ScanEvent,
  SAAScanCompleteEvent,
  FSSBodySignalsEvent,
  SAASignalsFoundEvent,
  ScanOrganicEvent,
  CodexEntryEvent,
  LoadGameEvent,
  ContinuedEvent,
  System,
} from '../../shared/types';
import { JOURNAL_EVENTS, BIOLOGICAL_VALUES } from '../../shared/constants';
import { estimatePossibleGenera, computeSystemHas, parseStarClass } from '../../shared/exobiologyEstimator';
import type { CelestialBody } from '../../shared/types';
import { logInfo, logWarn, logError, logDebug, isDev } from '../logger';

// Loop bounds: prevent unbounded iteration over file lists and file contents
const MAX_FILES_IN_DIRECTORY = 10000; // Max files to read from journal directory
const MAX_BACKFILL_FILES = 1000; // Max journal files to process in a single backfill
const MAX_LINES_PER_FILE = 1000000; // Max lines to read from a single journal file

interface GameState {
  isRunning: boolean;
  commander: string | null;
  gameMode: string | null;
  ship: string | null;
  isOdyssey: boolean;
  isHorizons: boolean;
}

interface CarrierState {
  isOnCarrier: boolean;
  carrierName: string | null;
  carrierMarketId: number | null;
  isDocked: boolean;
}

interface RouteInfo {
  hasRoute: boolean;
  routeLength: number;
  destination: string | null;
  jumpsRemaining: number;
}

interface SurfaceState {
  isLanded: boolean;
  bodyName: string | null;
  bodyId: number | null;
  latitude: number | null;
  longitude: number | null;
  nearestDestination: string | null;
}

export class JournalWatcher extends EventEmitter {
  private db: DatabaseService;
  private settings: SettingsService;
  private watcher: FSWatcher | null = null;
  private journalPath: string | null = null;
  private currentFile: string | null = null;
  private filePosition: number = 0;
  private sessionId: string;
  private currentSystem: System | null = null;
  // Game/carrier/route/surface state and pending body signals (FSSBodySignals before Scan)
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
  // Pending signals for bodies that haven't been scanned yet (FSSBodySignals comes before Scan)
  private pendingSignals: Map<string, { bioSignals: number; geoSignals: number; humanSignals?: number; thargoidSignals?: number }> = new Map();
  private isProcessingNewFile: boolean = false;
  private backfillCancelled: boolean = false;
  private isBackfilling: boolean = false;

  constructor(db: DatabaseService, settings: SettingsService) {
    super();
    this.db = db;
    this.settings = settings;
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setPath(journalPath: string): void {
    this.journalPath = journalPath;
    if (this.watcher) {
      this.stop();
      this.start();
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

    // Find the most recent journal file
    this.currentFile = this.findLatestJournal();
    
    if (this.currentFile) {
      // Read the latest journal to determine current state (system, commander, etc.)
      await this.loadCurrentStateFromJournal(this.currentFile);
      
      // Set position to end of file for live watching
      const stats = fs.statSync(this.currentFile);
      this.filePosition = stats.size;
      
      logInfo('JournalWatcher', `Starting with journal file: ${path.basename(this.currentFile)}`);
    }

    // Start watching the directory
    this.watcher = chokidar.watch(this.journalPath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    this.watcher.on('add', (filePath) => this.onFileAdded(filePath));
    this.watcher.on('change', (filePath) => this.onFileChanged(filePath));

    logInfo('JournalWatcher', isDev() ? `Journal watcher started: ${this.journalPath}` : 'Journal watcher started');
    this.emit('watcher-started', { path: this.journalPath });
  }

  /**
   * Load current state (system, commander, etc.) from the latest journal file
   * This is called on startup to determine where the player currently is
   */
  private async loadCurrentStateFromJournal(filePath: string): Promise<void> {
    logInfo('JournalWatcher', `Loading current state from journal: ${path.basename(filePath)}`);

    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

    // Track the most recent location-related event
    let latestLocationEvent: JournalEvent | null = null;
    let latestLoadGameEvent: LoadGameEvent | null = null;
    // Track scan events by SystemAddress to only keep scans for the current system
    const scanEventsBySystem = new Map<number, ScanEvent[]>();
    const mappedBodiesBySystem = new Map<number, SAAScanCompleteEvent[]>();
    const signalsBySystem = new Map<number, FSSBodySignalsEvent[]>();

    let lineCount = 0;
    for await (const line of rl) {
      lineCount++;
      if (lineCount > MAX_LINES_PER_FILE) {
        logWarn('JournalWatcher', `File ${path.basename(filePath)} exceeded ${MAX_LINES_PER_FILE} lines during state load; stopping`);
        break;
      }
      if (line.trim()) {
        try {
          const event = JSON.parse(line) as JournalEvent;
          
          // Track LoadGame for commander info
          if (event.event === JOURNAL_EVENTS.LOAD_GAME) {
            latestLoadGameEvent = event as LoadGameEvent;
          }
          
          // Track location-determining events (keep the latest one)
          if (
            event.event === JOURNAL_EVENTS.LOCATION ||
            event.event === JOURNAL_EVENTS.FSD_JUMP ||
            event.event === JOURNAL_EVENTS.CARRIER_JUMP
          ) {
            latestLocationEvent = event;
          }

          // Track Scan events grouped by system
          if (event.event === JOURNAL_EVENTS.SCAN) {
            const scanEvent = event as ScanEvent;
            const existing = scanEventsBySystem.get(scanEvent.SystemAddress) || [];
            existing.push(scanEvent);
            scanEventsBySystem.set(scanEvent.SystemAddress, existing);
          }

          // Track SAAScanComplete (mapped bodies)
          if (event.event === JOURNAL_EVENTS.SAA_SCAN_COMPLETE) {
            const saaEvent = event as SAAScanCompleteEvent;
            const existing = mappedBodiesBySystem.get(saaEvent.SystemAddress) || [];
            existing.push(saaEvent);
            mappedBodiesBySystem.set(saaEvent.SystemAddress, existing);
          }

          // Track body signals (FSSBodySignals and SAASignalsFound)
          if (event.event === JOURNAL_EVENTS.FSS_BODY_SIGNALS || event.event === JOURNAL_EVENTS.SAA_SIGNALS_FOUND) {
            const signalEvent = event as FSSBodySignalsEvent;
            const existing = signalsBySystem.get(signalEvent.SystemAddress) || [];
            existing.push(signalEvent);
            signalsBySystem.set(signalEvent.SystemAddress, existing);
          }
        } catch {
          // Skip invalid lines
        }
      }
    }

    // Process LoadGame first to set commander info
    if (latestLoadGameEvent) {
      this.gameState = {
        isRunning: true,
        commander: latestLoadGameEvent.Commander,
        gameMode: latestLoadGameEvent.GameMode,
        ship: latestLoadGameEvent.Ship_Localised || latestLoadGameEvent.Ship,
        isOdyssey: latestLoadGameEvent.Odyssey ?? false,
        isHorizons: latestLoadGameEvent.Horizons ?? false,
      };
      logDebug('JournalWatcher', isDev() ? `Loaded commander: ${latestLoadGameEvent.Commander}` : 'Loaded commander');
    }

    // Process the latest location event to set current system
    if (latestLocationEvent) {
      let system: System | null = null;
      let systemAddress: number | null = null;

      if (latestLocationEvent.event === JOURNAL_EVENTS.LOCATION) {
        const event = latestLocationEvent as LocationEvent;
        systemAddress = event.SystemAddress;
        system = this.db.upsertSystem(
          event.SystemAddress,
          event.StarSystem,
          event.StarPos
        );
      } else if (latestLocationEvent.event === JOURNAL_EVENTS.FSD_JUMP) {
        const event = latestLocationEvent as FSDJumpEvent;
        systemAddress = event.SystemAddress;
        system = this.db.upsertSystem(
          event.SystemAddress,
          event.StarSystem,
          event.StarPos
        );
      } else if (latestLocationEvent.event === JOURNAL_EVENTS.CARRIER_JUMP) {
        const event = latestLocationEvent as CarrierJumpEvent;
        systemAddress = event.SystemAddress;
        system = this.db.upsertSystem(
          event.SystemAddress,
          event.StarSystem,
          event.StarPos
        );
      }

      if (system) {
        this.currentSystem = system;
        logDebug('JournalWatcher', isDev() ? `Loaded current system: ${system.name}` : 'Loaded current system');

        // Process Scan events for the current system to populate bodies
        if (systemAddress) {
          const scansForCurrentSystem = scanEventsBySystem.get(systemAddress) || [];
          let bodiesLoaded = 0;
          for (const scanEvent of scansForCurrentSystem) {
            this.db.upsertBody(system.id, scanEvent);
            bodiesLoaded++;
          }
          if (bodiesLoaded > 0) {
            logInfo('JournalWatcher', `Loaded ${bodiesLoaded} bodies for current system`);
          }

          // Process mapped bodies (SAAScanComplete)
          const mappedForCurrentSystem = mappedBodiesBySystem.get(systemAddress) || [];
          for (const saaEvent of mappedForCurrentSystem) {
            this.db.updateBodyMapped(system.id, saaEvent.BodyID);
          }
          if (mappedForCurrentSystem.length > 0) {
            logInfo('JournalWatcher', `Loaded ${mappedForCurrentSystem.length} mapped bodies`);
          }

          // Process body signals (FSSBodySignals + SAASignalsFound: bio/geo, Genuses, ring materials)
          const signalsForCurrentSystem = signalsBySystem.get(systemAddress) || [];
          for (const signalEvent of signalsForCurrentSystem) {
            this.processSignalEvent(system.id, signalEvent as FSSBodySignalsEvent | SAASignalsFoundEvent);
          }
          if (signalsForCurrentSystem.length > 0) {
            logInfo('JournalWatcher', `Loaded signals for ${signalsForCurrentSystem.length} bodies`);
          }
        }

        // Emit system-changed so the UI can update
        this.emit('system-changed', system);
      }
    } else {
      logInfo('JournalWatcher', 'No location event found in latest journal');
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

  // Get current game state
  getGameState(): GameState {
    return { ...this.gameState };
  }

  // Get current carrier state
  getCarrierState(): CarrierState {
    return { ...this.carrierState };
  }

  // Get current route info
  getRouteInfo(): RouteInfo {
    return { ...this.routeInfo };
  }

  // Get current surface state
  getSurfaceState(): SurfaceState {
    return { ...this.surfaceState };
  }

  // Get current journal file info
  getCurrentFileInfo(): { file: string | null; position: number } {
    return {
      file: this.currentFile ? path.basename(this.currentFile) : null,
      position: this.filePosition,
    };
  }

  // Backfill historical data from existing journal files
  async backfill(progressCallback?: (progress: number, total: number, currentFile: string) => void): Promise<{
    filesProcessed: number;
    totalFiles: number;
    cancelled: boolean;
  }> {
    if (!this.journalPath) {
      return { filesProcessed: 0, totalFiles: 0, cancelled: false };
    }

    this.isBackfilling = true;
    this.backfillCancelled = false;

    const allJournalFiles = this.getJournalFiles();
    // Limit backfill to MAX_BACKFILL_FILES to prevent unbounded processing
    const journalFiles = allJournalFiles.slice(0, MAX_BACKFILL_FILES);
    if (allJournalFiles.length > MAX_BACKFILL_FILES) {
      logWarn('JournalWatcher', `Found ${allJournalFiles.length} journal files; limiting backfill to ${MAX_BACKFILL_FILES}`);
    }
    const total = journalFiles.length;
    let filesProcessed = 0;

    try {
      for (let i = 0; i < journalFiles.length; i++) {
        // Check for cancellation
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

    return { filesProcessed, totalFiles: total, cancelled: false };
  }

  // Cancel an in-progress backfill
  cancelBackfill(): void {
    if (this.isBackfilling) {
      this.backfillCancelled = true;
    }
  }

  // Check if backfill is in progress
  isBackfillingInProgress(): boolean {
    return this.isBackfilling;
  }

  private findLatestJournal(): string | null {
    if (!this.journalPath) return null;

    const journalFiles = this.getJournalFiles();
    const last = journalFiles[journalFiles.length - 1];
    return last !== undefined ? last : null;
  }

  private getJournalFiles(): string[] {
    if (!this.journalPath) return [];

    const files = fs.readdirSync(this.journalPath);
    // Limit files to prevent unbounded iteration
    const limited = files.slice(0, MAX_FILES_IN_DIRECTORY);
    if (files.length > MAX_FILES_IN_DIRECTORY) {
      logWarn('JournalWatcher', `Journal directory has ${files.length} files; limiting to ${MAX_FILES_IN_DIRECTORY}`);
    }
    return limited
      .filter(f => f.startsWith('Journal.') && f.endsWith('.log'))
      .map(f => path.join(this.journalPath!, f))
      .sort();
  }

  /**
   * Handle new file being added to the journal directory
   * This is called when Elite creates a new journal file (game start or file rotation)
   */
  private async onFileAdded(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    
    // Check if it's a new journal file
    if (filename.startsWith('Journal.') && filename.endsWith('.log')) {
      logInfo('JournalWatcher', `New journal file detected: ${filename}`);
      
      const previousFile = this.currentFile;
      this.currentFile = filePath;
      this.filePosition = 0;
      
      // Generate new session ID for new journal file
      this.sessionId = this.generateSessionId();
      
      // Emit file rotation event
      this.emit('journal-file-changed', {
        previousFile: previousFile ? path.basename(previousFile) : null,
        newFile: filename,
        timestamp: new Date().toISOString(),
      });

      // Read the new file from the beginning to catch LoadGame, Location, etc.
      // This ensures we don't miss the initial events
      await this.processNewJournalFile(filePath);
    }
  }

  /**
   * Process a new journal file from the beginning
   * This is called when a new journal file is detected (not during backfill)
   */
  private async processNewJournalFile(filePath: string): Promise<void> {
    if (this.isProcessingNewFile) {
      logInfo('JournalWatcher', 'Already processing a new file, skipping');
      return;
    }

    this.isProcessingNewFile = true;

    try {
      // Wait a brief moment for Elite to finish writing initial events
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!fs.existsSync(filePath)) {
        logError('JournalWatcher', 'New journal file no longer exists');
        return;
      }

      const stats = fs.statSync(filePath);
      
      // Read from the beginning
      const stream = fs.createReadStream(filePath, {
        start: 0,
        encoding: 'utf8',
      });

      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

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
          } catch (err) {
            logError('JournalWatcher', 'Failed to parse journal line in new file', err);
          }
        }
      }

      // Update position to end of file
      this.filePosition = stats.size;
      
      logInfo('JournalWatcher', `Processed new journal file: ${path.basename(filePath)}, position: ${this.filePosition}`);
    } catch (err) {
      logError('JournalWatcher', 'Error processing new journal file', err);
    } finally {
      this.isProcessingNewFile = false;
    }
  }

  private async onFileChanged(filePath: string): Promise<void> {
    // Only process the current journal file
    if (filePath !== this.currentFile) return;
    
    // Don't process changes while we're reading a new file
    if (this.isProcessingNewFile) return;

    await this.readNewLines();
  }

  private async readNewLines(): Promise<void> {
    if (!this.currentFile) return;

    let stats: fs.Stats;
    try {
      stats = fs.statSync(this.currentFile);
    } catch (err) {
      logError('JournalWatcher', 'Error getting file stats', err);
      return;
    }
    
    // File hasn't grown
    if (stats.size <= this.filePosition) return;

    const stream = fs.createReadStream(this.currentFile, {
      start: this.filePosition,
      encoding: 'utf8',
    });

    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

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
        } catch (err) {
          logError('JournalWatcher', 'Failed to parse journal line', err);
        }
      }
    }

    this.filePosition = stats.size;
  }

  private async processJournalFile(filePath: string, isBackfill: boolean): Promise<void> {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity,
    });

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
        } catch (err) {
          // Skip invalid lines during backfill
        }
      }
    }
  }

  private async processEvent(event: JournalEvent, isBackfill = false): Promise<void> {
    switch (event.event) {
      // Session lifecycle events
      case JOURNAL_EVENTS.LOAD_GAME:
        await this.handleLoadGame(event as LoadGameEvent, isBackfill);
        break;

      case JOURNAL_EVENTS.CONTINUED:
        await this.handleContinued(event as ContinuedEvent);
        break;

      case JOURNAL_EVENTS.SHUTDOWN:
        await this.handleShutdown();
        break;

      // Navigation events
      case JOURNAL_EVENTS.FSD_JUMP:
        await this.handleFSDJump(event as FSDJumpEvent, isBackfill);
        break;

      case JOURNAL_EVENTS.CARRIER_JUMP:
        await this.handleCarrierJump(event as CarrierJumpEvent, isBackfill);
        break;

      case JOURNAL_EVENTS.LOCATION:
        await this.handleLocation(event as LocationEvent, isBackfill);
        break;

      case JOURNAL_EVENTS.FSS_DISCOVERY_SCAN:
        await this.handleDiscoveryScan(event as FSSDiscoveryScanEvent);
        break;

      case JOURNAL_EVENTS.FSS_ALL_BODIES_FOUND:
        await this.handleAllBodiesFound(event as FSSAllBodiesFoundEvent);
        break;

      case JOURNAL_EVENTS.NAV_ROUTE:
        await this.handleNavRoute(event as NavRouteEvent);
        break;

      case JOURNAL_EVENTS.NAV_ROUTE_CLEAR:
        await this.handleNavRouteClear();
        break;

      case JOURNAL_EVENTS.TOUCHDOWN:
        await this.handleTouchdown(event as TouchdownEvent, isBackfill);
        break;

      case JOURNAL_EVENTS.LIFTOFF:
        await this.handleLiftoff(event as LiftoffEvent, isBackfill);
        break;

      // Scanning events
      case JOURNAL_EVENTS.SCAN:
        await this.handleScan(event as ScanEvent, isBackfill);
        break;

      case JOURNAL_EVENTS.SAA_SCAN_COMPLETE:
        await this.handleSAAScan(event as SAAScanCompleteEvent, isBackfill);
        break;

      case JOURNAL_EVENTS.FSS_BODY_SIGNALS:
      case JOURNAL_EVENTS.SAA_SIGNALS_FOUND:
        await this.handleBodySignals(event as FSSBodySignalsEvent | SAASignalsFoundEvent);
        break;

      case JOURNAL_EVENTS.SCAN_ORGANIC:
        await this.handleScanOrganic(event as ScanOrganicEvent, isBackfill);
        break;

      case JOURNAL_EVENTS.CODEX_ENTRY:
        await this.handleCodexEntry(event as CodexEntryEvent, isBackfill);
        break;
    }
  }

  /**
   * Handle LoadGame event - indicates game has started/restarted
   */
  private async handleLoadGame(event: LoadGameEvent, isBackfill: boolean): Promise<void> {
    this.gameState = {
      isRunning: true,
      commander: event.Commander,
      gameMode: event.GameMode,
      ship: event.Ship_Localised || event.Ship,
      isOdyssey: event.Odyssey ?? false,
      isHorizons: event.Horizons ?? false,
    };

    logDebug('JournalWatcher', isDev() ? `Game loaded: Commander ${event.Commander} in ${event.GameMode} mode` : 'Game loaded');

    if (!isBackfill) {
      this.emit('game-started', {
        commander: event.Commander,
        gameMode: event.GameMode,
        ship: this.gameState.ship,
        isOdyssey: this.gameState.isOdyssey,
        timestamp: event.timestamp,
      });
    }
  }

  /**
   * Handle Continued event - indicates journal file rotation mid-session
   */
  private async handleContinued(event: ContinuedEvent): Promise<void> {
    logInfo('JournalWatcher', `Journal continued in part ${event.Part}`);
    
    this.emit('journal-continued', {
      part: event.Part,
      timestamp: event.timestamp,
    });
  }

  /**
   * Handle Shutdown event - indicates game is closing
   */
  private async handleShutdown(): Promise<void> {
    this.gameState.isRunning = false;
    logInfo('JournalWatcher', 'Game shutdown detected');
    
    this.emit('game-stopped', {
      timestamp: new Date().toISOString(),
    });
  }

  private async handleFSDJump(event: FSDJumpEvent, isBackfill: boolean): Promise<void> {
    // If player uses FSD, they're no longer on a carrier
    if (this.carrierState.isOnCarrier) {
      this.carrierState = {
        isOnCarrier: false,
        carrierName: null,
        carrierMarketId: null,
        isDocked: false,
      };
    }

    // If player uses FSD, they've left any surface
    if (this.surfaceState.isLanded) {
      this.surfaceState = {
        isLanded: false,
        bodyName: null,
        bodyId: null,
        latitude: null,
        longitude: null,
        nearestDestination: null,
      };
    }

    // Update route progress if we have an active route
    if (this.routeInfo.hasRoute && this.routeInfo.jumpsRemaining > 0) {
      this.routeInfo.jumpsRemaining--;
      
      // Check if we've reached the destination
      if (this.routeInfo.jumpsRemaining === 0 || event.StarSystem === this.routeInfo.destination) {
        this.routeInfo = {
          hasRoute: false,
          routeLength: 0,
          destination: null,
          jumpsRemaining: 0,
        };
      }
    }

    // Upsert system
    const system = this.db.upsertSystem(
      event.SystemAddress,
      event.StarSystem,
      event.StarPos
    );

    // Clear pending signals from old system when jumping to a new one
    if (this.currentSystem?.systemAddress !== event.SystemAddress) {
      this.pendingSignals.clear();
    }

    this.currentSystem = system;

    // Add to route history
    this.db.addRouteEntry(
      system.id,
      event.timestamp,
      event.JumpDist,
      event.FuelUsed,
      this.sessionId
    );

    if (!isBackfill) {
      this.emit('system-changed', system);
    }
  }

  /**
   * Handle CarrierJump event - similar to FSDJump but for fleet carriers
   */
  /**
   * Handle CarrierJump event - triggered when a fleet carrier jumps to a new system
   * This affects all players aboard the carrier
   */
  private async handleCarrierJump(event: CarrierJumpEvent, isBackfill: boolean): Promise<void> {
    // Update carrier state
    this.carrierState = {
      isOnCarrier: true,
      carrierName: event.StationName || null,
      carrierMarketId: event.MarketID || null,
      isDocked: event.Docked ?? false,
    };

    // Upsert system
    const system = this.db.upsertSystem(
      event.SystemAddress,
      event.StarSystem,
      event.StarPos
    );

    this.currentSystem = system;

    // Route history tracks only FSDJump events (not carrier jumps)

    if (!isBackfill) {
      // Emit system change event (same as FSD jump)
      this.emit('system-changed', system);

      // Emit carrier-specific jump event with additional details
      this.emit('carrier-jumped', {
        system,
        carrierName: this.carrierState.carrierName,
        carrierMarketId: this.carrierState.carrierMarketId,
        isDocked: this.carrierState.isDocked,
        isOnFoot: event.OnFoot ?? false,
        timestamp: event.timestamp,
      });
    }

    logDebug('JournalWatcher', isDev() ? `Carrier jump to ${event.StarSystem}${event.StationName ? ` (${event.StationName})` : ''}` : 'Carrier jump');
  }

  private async handleLocation(event: LocationEvent, isBackfill: boolean): Promise<void> {
    const system = this.db.upsertSystem(
      event.SystemAddress,
      event.StarSystem,
      event.StarPos
    );

    // Clear pending signals from old system when changing systems
    if (this.currentSystem?.systemAddress !== event.SystemAddress) {
      this.pendingSignals.clear();
    }

    this.currentSystem = system;
    
    if (!isBackfill) {
      this.emit('system-changed', system);
    }
  }

  private async handleDiscoveryScan(event: FSSDiscoveryScanEvent): Promise<void> {
    this.db.updateSystemBodyCount(event.SystemAddress, event.BodyCount);
    
    // Refresh current system
    const system = this.db.getSystemByAddress(event.SystemAddress);
    if (system) {
      this.currentSystem = system;
      this.emit('system-changed', system);
    }
  }

  /**
   * Handle FSSAllBodiesFound - marks system as fully discovered
   */
  private async handleAllBodiesFound(event: FSSAllBodiesFoundEvent): Promise<void> {
    this.db.markSystemAllBodiesFound(event.SystemAddress);
    
    // Refresh current system
    const system = this.db.getSystemByAddress(event.SystemAddress);
    if (system) {
      this.currentSystem = system;
      this.emit('system-changed', system);
      this.emit('all-bodies-found', {
        systemName: event.SystemName,
        systemAddress: event.SystemAddress,
        bodyCount: event.Count,
        timestamp: event.timestamp,
      });
    }

    logInfo('JournalWatcher', isDev() ? `All ${event.Count} bodies found in ${event.SystemName}` : `All ${event.Count} bodies found`);
  }

  /**
   * Handle NavRoute - track plotted route
   */
  private async handleNavRoute(event: NavRouteEvent): Promise<void> {
    if (event.Route && event.Route.length > 0) {
      const destination = event.Route[event.Route.length - 1];
      if (destination === undefined) return;
      this.routeInfo = {
        hasRoute: true,
        routeLength: event.Route.length,
        destination: destination.StarSystem,
        jumpsRemaining: event.Route.length,
      };

      this.emit('route-plotted', {
        destination: destination.StarSystem,
        jumpsTotal: event.Route.length,
        route: event.Route,
        timestamp: event.timestamp,
      });

      logInfo('JournalWatcher', isDev() ? `Route plotted to ${destination.StarSystem} (${event.Route.length} jumps)` : `Route plotted (${event.Route.length} jumps)`);
    }
  }

  /**
   * Handle NavRouteClear - route has been cleared
   */
  private async handleNavRouteClear(): Promise<void> {
    const hadRoute = this.routeInfo.hasRoute;
    
    this.routeInfo = {
      hasRoute: false,
      routeLength: 0,
      destination: null,
      jumpsRemaining: 0,
    };

    if (hadRoute) {
      this.emit('route-cleared', {
        timestamp: new Date().toISOString(),
      });
      logInfo('JournalWatcher', 'Route cleared');
    }
  }

  /**
   * Handle Touchdown - player has landed on a surface
   */
  private async handleTouchdown(event: TouchdownEvent, isBackfill: boolean): Promise<void> {
    // Only track player-controlled touchdowns
    if (!event.PlayerControlled) return;

    this.surfaceState = {
      isLanded: true,
      bodyName: event.Body,
      bodyId: event.BodyID,
      latitude: event.Latitude,
      longitude: event.Longitude,
      nearestDestination: event.NearestDestination_Localised || event.NearestDestination || null,
    };

    if (!isBackfill) {
      this.emit('touchdown', {
        bodyName: event.Body,
        bodyId: event.BodyID,
        latitude: event.Latitude,
        longitude: event.Longitude,
        nearestDestination: this.surfaceState.nearestDestination,
        systemName: event.StarSystem,
        systemAddress: event.SystemAddress,
        timestamp: event.timestamp,
      });

      logDebug('JournalWatcher', isDev() ? `Landed on ${event.Body} at ${event.Latitude.toFixed(4)}, ${event.Longitude.toFixed(4)}` : 'Landed on surface');
    }
  }

  /**
   * Handle Liftoff - player has lifted off from a surface
   */
  private async handleLiftoff(event: LiftoffEvent, isBackfill: boolean): Promise<void> {
    // Only track player-controlled liftoffs
    if (!event.PlayerControlled) return;

    const previousBody = this.surfaceState.bodyName;

    this.surfaceState = {
      isLanded: false,
      bodyName: null,
      bodyId: null,
      latitude: null,
      longitude: null,
      nearestDestination: null,
    };

    if (!isBackfill) {
      this.emit('liftoff', {
        bodyName: event.Body,
        bodyId: event.BodyID,
        latitude: event.Latitude,
        longitude: event.Longitude,
        systemName: event.StarSystem,
        systemAddress: event.SystemAddress,
        timestamp: event.timestamp,
      });

      logDebug('JournalWatcher', isDev() ? `Lifted off from ${event.Body}` : 'Lifted off');
    }
  }

  /** Parse materials from body rawJson (from Scan event). */
  private parseBodyMaterials(body: CelestialBody): Array<{ Name: string }> {
    if (!body?.rawJson) return [];
    try {
      const d = JSON.parse(body.rawJson) as Record<string, unknown>;
      const raw = d.Materials ?? d.materials;
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((m): m is Record<string, unknown> => m != null && typeof m === 'object')
        .map((m) => ({ Name: String(m.Name ?? m.name ?? '') }))
        .filter((m) => m.Name.length > 0);
    } catch {
      return [];
    }
  }

  /** Run exobiology estimator for a body and log possible genera (FSS bio signals). */
  private logExobiologyEstimate(systemName: string, bodyName: string, body: CelestialBody, bodies: CelestialBody[]): void {
    if ((body.bioSignals ?? 0) <= 0) return;
    try {
      const star = this.findParentStar(body, bodies);
      const starClassLetter = parseStarClass(star?.subType);
      const systemHas = computeSystemHas(bodies);
      const materials = this.parseBodyMaterials(body);
      const estimates = estimatePossibleGenera({
        atmosphere: body.atmosphereType,
        tempK: body.temperature,
        gravityG: body.gravity,
        planetType: body.subType,
        volcanism: body.volcanism,
        distanceLS: body.distanceLS,
        starClassLetter,
        systemHas,
        ...(materials.length > 0 ? { materials } : {}),
      });
      if (estimates.length > 0) {
        const lines = estimates.flatMap((e) => e.possible.map((p) => p.fullLabel));
        logInfo('Exobiology', `${systemName} ${bodyName}: estimated ${lines.join(', ')}`);
      }
    } catch (err) {
      logWarn('Exobiology', `Failed to estimate for ${systemName} ${bodyName}: ${err instanceof Error ? err.message : err}`);
    }
  }

  private findParentStar(body: CelestialBody, bodies: CelestialBody[]): CelestialBody | null {
    if (body.bodyType === 'Star') return body;
    let current: CelestialBody | null = body;
    while (current?.parentId != null) {
      const parent = bodies.find((b) => b.bodyId === current!.parentId);
      if (!parent) break;
      if (parent.bodyType === 'Star') return parent;
      current = parent;
    }
    return bodies.find((b) => b.bodyType === 'Star') || null;
  }

  /** Build body/system characteristics for exobiology feedback reports (when system may not be in EDSM). */
  private buildMismatchCharacteristics(body: CelestialBody, bodies: CelestialBody[]): {
    mainStarClass: string;
    bodyType: string;
    bodyDistanceLs: number | null;
    planetTypesInSystem: string;
    gravity: number | null;
    temperature: number | null;
    atmosphere: string | null;
    volcanism: string | null;
  } {
    const star = this.findParentStar(body, bodies);
    const mainStarClass = star?.subType ? parseStarClass(star.subType) || star.subType : '';
    const systemHas = computeSystemHas(bodies);
    const specialTypes: string[] = [];
    if (systemHas.elw) specialTypes.push('Earth-Like World');
    if (systemHas.ammoniaWorld) specialTypes.push('Ammonia World');
    if (systemHas.ggWater) specialTypes.push('Gas Giant with Water-Based Life');
    if (systemHas.ggAmmonia) specialTypes.push('Gas Giant with Ammonia-Based Life');
    if (systemHas.waterGiant) specialTypes.push('Water Giant');
    const nonStarTypes = bodies
      .filter((b) => b.bodyType !== 'Star' && b.subType)
      .map((b) => b.subType as string);
    const uniqueTypes = [...new Set([...specialTypes, ...nonStarTypes])];
    const planetTypesInSystem = uniqueTypes.length > 0 ? uniqueTypes.join(', ') : 'N/A';

    return {
      mainStarClass: mainStarClass || 'N/A',
      bodyType: body.subType || body.bodyType || 'N/A',
      bodyDistanceLs: body.distanceLS ?? null,
      planetTypesInSystem,
      gravity: body.gravity ?? null,
      temperature: body.temperature ?? null,
      atmosphere: body.atmosphereType ?? null,
      volcanism: body.volcanism ?? null,
    };
  }

  /** Compare verified bio to estimate; emit exobiology-mismatch if variant or species/genus wrong. */
  private checkExobiologyMismatch(
    systemName: string,
    bodyName: string,
    genus: string,
    species: string,
    variant: string | null,
    body: CelestialBody,
    bodies: CelestialBody[]
  ): void {
    try {
      const star = this.findParentStar(body, bodies);
      const starClassLetter = parseStarClass(star?.subType);
      const systemHas = computeSystemHas(bodies);
      const materials = this.parseBodyMaterials(body);
      const estimates = estimatePossibleGenera({
        atmosphere: body.atmosphereType,
        tempK: body.temperature,
        gravityG: body.gravity,
        planetType: body.subType,
        volcanism: body.volcanism,
        distanceLS: body.distanceLS,
        starClassLetter,
        systemHas,
        ...(materials.length > 0 ? { materials } : {}),
      });
      const characteristics = this.buildMismatchCharacteristics(body, bodies);
      const scannedBios = this.db.getBodyBiologicals(body.id);
      const verifiedKeys = new Set<string>();
      for (const b of scannedBios.filter((x) => x.scanProgress >= 1)) {
        verifiedKeys.add(`${b.genus}|${b.species}`);
        if (b.species.startsWith(b.genus + ' ')) {
          verifiedKeys.add(`${b.genus}|${b.species.slice(b.genus.length + 1)}`);
        }
      }
      const allEstimated = estimates.flatMap((e) =>
        e.possible.map((p) => ({ genus: e.genus, fullLabel: p.fullLabel }))
      );
      const speciesNotVerified = [
        ...new Set(
          allEstimated
            .filter(({ genus, fullLabel }) => {
              const shortSp = fullLabel.startsWith(genus + ' ')
                ? fullLabel.slice(genus.length + 1).replace(/\s+[\w-]+$/, '').trim()
                : fullLabel.replace(/\s+[\w-]+$/, '').trim();
              const speciesName = shortSp ? `${genus} ${shortSp}` : genus;
              const key = `${genus}|${speciesName}`;
              const keyAlt = `${genus}|${shortSp}`;
              return !verifiedKeys.has(key) && !verifiedKeys.has(keyAlt);
            })
            .map(({ genus, fullLabel }) => {
              const shortSp = fullLabel.startsWith(genus + ' ')
                ? fullLabel.slice(genus.length + 1).replace(/\s+[\w-]+$/, '').trim()
                : fullLabel.replace(/\s+[\w-]+$/, '').trim();
              return shortSp ? `${genus} ${shortSp}` : genus;
            })
        ),
      ];

      const emitPayload = (estimatedVariant: string, reason: string) => ({
        systemName,
        bodyName,
        genus,
        species,
        foundVariant: variant ?? '',
        estimatedVariant,
        reason,
        characteristics,
        speciesNotVerified: speciesNotVerified.length > 0 ? speciesNotVerified : undefined,
      });

      const eg = estimates.find((e) => e.genus === genus);
      if (!eg) {
        this.emit('exobiology-mismatch', emitPayload('', 'genus_not_estimated'));
        return;
      }
      const shortSpecies = species.startsWith(genus + ' ') ? species.slice(genus.length + 1) : species;
      const possible = eg.possible.find((p) => p.species === shortSpecies || species.endsWith(' ' + p.species));
      if (!possible) {
        this.emit('exobiology-mismatch', emitPayload('', 'species_not_estimated'));
        return;
      }
      if (possible.variantColor) {
        const foundNorm = (variant ?? '').split(/[\s–\-]+/)[0]?.toLowerCase() ?? '';
        const estimatedList = possible.variantColor.split(',').map((v) => v.trim().toLowerCase());
        const matches = foundNorm && estimatedList.some((e) => e === foundNorm);
        if (foundNorm && !matches) {
          this.emit('exobiology-mismatch', emitPayload(possible.fullLabel, 'variant_mismatch'));
        }
      }
    } catch (err) {
      logWarn('Exobiology', `Failed to check mismatch for ${species}: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async handleScan(event: ScanEvent, isBackfill: boolean): Promise<void> {
    // Get or create system
    let system = this.db.getSystemByAddress(event.SystemAddress);
    
    if (!system) {
      // We might get scans before location event during backfill
      system = this.db.upsertSystem(
        event.SystemAddress,
        event.StarSystem,
        [0, 0, 0] // Position will be updated when we get location event
      );
    }

    let body = this.db.upsertBody(system.id, event);

    // Check for pending signals (FSSBodySignals often comes before Scan event)
    const pendingKey = `${event.SystemAddress}_${event.BodyID}`;
    const pending = this.pendingSignals.get(pendingKey);
    if (pending) {
      this.db.updateBodySignals(
        system.id,
        event.BodyID,
        pending.bioSignals,
        pending.geoSignals,
        pending.humanSignals,
        pending.thargoidSignals
      );
      this.pendingSignals.delete(pendingKey);
      // Re-fetch body with updated signals so body-scanned includes the signal data
      body = this.db.getBodyBySystemIdAndBodyId(system.id, event.BodyID) || body;
    }

    if (!isBackfill) {
      const bodies = this.db.getSystemBodies(system.id);
      this.logExobiologyEstimate(system.name, body.name, body, bodies);
      this.emit('body-scanned', body);
    }
  }

  private async handleSAAScan(event: SAAScanCompleteEvent, isBackfill: boolean): Promise<void> {
    const system = this.db.getSystemByAddress(event.SystemAddress);
    if (!system) return;

    this.db.updateBodyMapped(system.id, event.BodyID);

    if (!isBackfill) {
      this.emit('body-mapped', {
        bodyId: event.BodyID,
        systemAddress: event.SystemAddress,
      });
    }
  }

  private async handleBodySignals(event: FSSBodySignalsEvent | SAASignalsFoundEvent): Promise<void> {
    const system = this.db.getSystemByAddress(event.SystemAddress);
    if (!system) return;

    // Check if the body exists in the database
    // FSSBodySignals often comes before the Scan event that creates the body
    const existingBody = this.db.getBodyBySystemIdAndBodyId(system.id, event.BodyID);
    
    if (!existingBody) {
      // Body doesn't exist yet - store signals as pending
      // They will be applied when the Scan event creates the body
      const isRing = /\s+[A-Z]\s+Ring$/.test(event.BodyName || '');
      if (!isRing) {
        let bioSignals = 0;
        let geoSignals = 0;
        let humanSignals: number | undefined;
        let thargoidSignals: number | undefined;
        for (const signal of event.Signals || []) {
          if (signal.Type === '$SAA_SignalType_Biological;') {
            bioSignals = signal.Count;
          } else if (signal.Type === '$SAA_SignalType_Geological;') {
            geoSignals = signal.Count;
          } else if (signal.Type === '$SAA_SignalType_Human;') {
            humanSignals = signal.Count;
          } else if (signal.Type === '$SAA_SignalType_Thargoid;') {
            thargoidSignals = signal.Count;
          }
        }
        const pendingKey = `${event.SystemAddress}_${event.BodyID}`;
        const payload: { bioSignals: number; geoSignals: number; humanSignals?: number; thargoidSignals?: number } = {
          bioSignals,
          geoSignals,
          ...(humanSignals !== undefined ? { humanSignals } : {}),
          ...(thargoidSignals !== undefined ? { thargoidSignals } : {}),
        };
        this.pendingSignals.set(pendingKey, payload);
      }
      return;
    }

    // Body exists - process normally
    const payload = this.processSignalEvent(system.id, event);
    if (payload) {
      this.emit('body-signals-updated', {
        systemAddress: event.SystemAddress,
        bodyId: event.BodyID,
        bioSignals: payload.bioSignals,
        geoSignals: payload.geoSignals,
        humanSignals: payload.humanSignals,
        thargoidSignals: payload.thargoidSignals,
      });
    }
  }

  /**
   * Process FSSBodySignals or SAASignalsFound: bio/geo counts, Genuses (SAASignalsFound
   * for non‑ring bodies), and ring materials (SAASignalsFound for ring bodies).
   * Returns signals payload for non-ring bodies so the renderer can update the UI.
   */
  private processSignalEvent(
    systemId: number,
    event: FSSBodySignalsEvent | SAASignalsFoundEvent
  ): { bioSignals: number; geoSignals: number; humanSignals?: number; thargoidSignals?: number } | null {
    const isRing = /\s+[A-Z]\s+Ring$/.test(event.BodyName || '');

    if (isRing) {
      const parentName = (event.BodyName || '').replace(/\s+[A-Z]\s+Ring$/, '');
      const materials = (event.Signals || []).map((s) => ({ Name: s.Type, Count: s.Count }));
      if (parentName && materials.length > 0) {
        this.db.mergeRingMaterialsIntoParent(systemId, parentName, event.BodyName!, materials);
      }
      return null;
    }

    let bioSignals = 0;
    let geoSignals = 0;
    let humanSignals: number | undefined;
    let thargoidSignals: number | undefined;
    for (const signal of event.Signals || []) {
      if (signal.Type === '$SAA_SignalType_Biological;') {
        bioSignals = signal.Count;
      } else if (signal.Type === '$SAA_SignalType_Geological;') {
        geoSignals = signal.Count;
      } else if (signal.Type === '$SAA_SignalType_Human;') {
        humanSignals = signal.Count;
      } else if (signal.Type === '$SAA_SignalType_Thargoid;') {
        thargoidSignals = signal.Count;
      }
    }
    this.db.updateBodySignals(systemId, event.BodyID, bioSignals, geoSignals, humanSignals, thargoidSignals);

    if (event.event === JOURNAL_EVENTS.SAA_SIGNALS_FOUND) {
      const genuses = (event as SAASignalsFoundEvent).Genuses;
      if (genuses?.length) {
        const names = genuses.map((g) => g.Genus_Localised || g.Genus);
        this.db.mergeBodyGenuses(systemId, event.BodyID, names);
      }
    }

    const result: { bioSignals: number; geoSignals: number; humanSignals?: number; thargoidSignals?: number } = {
      bioSignals,
      geoSignals,
      ...(humanSignals !== undefined ? { humanSignals } : {}),
      ...(thargoidSignals !== undefined ? { thargoidSignals } : {}),
    };
    return result;
  }

  private async handleScanOrganic(event: ScanOrganicEvent, isBackfill: boolean): Promise<void> {
    const system = this.db.getSystemByAddress(event.SystemAddress);
    if (!system) return;

    const bodies = this.db.getSystemBodies(system.id);
    const body = bodies.find(b => b.bodyId === event.Body);
    if (!body) return;

    // Determine scan progress
    let scanProgress = 0;
    switch (event.ScanType) {
      case 'Log':
        scanProgress = 1;
        break;
      case 'Sample':
        scanProgress = 2;
        break;
      case 'Analyse':
        scanProgress = 3;
        break;
    }

    // Get value from constants
    const speciesKey = event.Species_Localised || event.Species;
    const value = BIOLOGICAL_VALUES[speciesKey] ?? 0;

    const bio = this.db.upsertBiological(
      body.id,
      event.Genus_Localised || event.Genus,
      speciesKey,
      event.Variant_Localised || event.Variant || null,
      value,
      scanProgress
    );

    if (!isBackfill) {
      // Run mismatch check on any scan (Log/Sample/Analyse) so CMDRs who do 1 scan per species still get the prompt
      if (event.ScanType === 'Log' || event.ScanType === 'Sample' || event.ScanType === 'Analyse') {
        const bodies = this.db.getSystemBodies(system.id);
        this.checkExobiologyMismatch(
          system.name,
          body.name,
          event.Genus_Localised || event.Genus,
          speciesKey,
          event.Variant_Localised || event.Variant || null,
          body,
          bodies
        );
      }
      this.emit('bio-scanned', bio);
    }
  }

  /**
   * Handle CodexEntry event - tracks discoveries in the Codex
   */
  private async handleCodexEntry(event: CodexEntryEvent, isBackfill: boolean): Promise<void> {
    const entry = this.db.upsertCodexEntry(
      event.EntryID,
      event.Name_Localised || event.Name,
      event.Category_Localised || event.Category,
      event.SubCategory_Localised || event.SubCategory,
      event.Region_Localised || event.Region,
      event.System,
      event.SystemAddress,
      event.BodyID ?? null,
      event.IsNewEntry,
      event.NewTraitsDiscovered,
      event.VoucherAmount ?? 0,
      event.timestamp
    );

    if (!isBackfill) {
      this.emit('codex-entry', entry);
    }
  }
}
