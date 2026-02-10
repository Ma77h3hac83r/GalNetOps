// ============================================
// Elite Dangerous Journal Types
// ============================================
// TypeScript interfaces for Elite Dangerous journal events; used by main process when parsing journal files and by IPC.

export interface JournalEvent {
  timestamp: string;
  event: string;
}

// Session events: game start, load, shutdown (used for session boundaries and Commander identity).
// Session Events
export interface FileheaderEvent extends JournalEvent {
  event: 'Fileheader';
  part: number;
  language: string;
  Odyssey: boolean;
  gameversion: string;
  build: string;
}

export interface LoadGameEvent extends JournalEvent {
  event: 'LoadGame';
  FID: string;
  Commander: string;
  Horizons: boolean;
  Odyssey: boolean;
  Ship: string;
  Ship_Localised?: string;
  ShipID: number;
  ShipName: string;
  ShipIdent: string;
  FuelLevel: number;
  FuelCapacity: number;
  GameMode: string;
  Credits: number;
  Loan: number;
}

export interface ContinuedEvent extends JournalEvent {
  event: 'Continued';
  Part: number;
}

export interface ShutdownEvent extends JournalEvent {
  event: 'Shutdown';
}

// Navigation events: jumps, location, FSS discovery; drive current system and route history.
// Navigation Events
export interface FSDJumpEvent extends JournalEvent {
  event: 'FSDJump';
  StarSystem: string;
  SystemAddress: number;
  StarPos: [number, number, number];
  Body: string;
  BodyID: number;
  BodyType: string;
  JumpDist: number;
  FuelUsed: number;
  FuelLevel: number;
}

export interface CarrierJumpEvent extends JournalEvent {
  event: 'CarrierJump';
  StarSystem: string;
  SystemAddress: number;
  StarPos: [number, number, number];
  Body: string;
  BodyID: number;
  BodyType: string;
  Docked: boolean;
  OnFoot: boolean;
  // Carrier-specific fields
  StationName?: string;
  StationType?: string;
  MarketID?: number;
  Taxi?: boolean;
  Multicrew?: boolean;
}

export interface LocationEvent extends JournalEvent {
  event: 'Location';
  StarSystem: string;
  SystemAddress: number;
  StarPos: [number, number, number];
  Body: string;
  BodyID: number;
  BodyType: string;
  Docked: boolean;
}

export interface FSSDiscoveryScanEvent extends JournalEvent {
  event: 'FSSDiscoveryScan';
  Progress: number;
  BodyCount: number;
  NonBodyCount: number;
  SystemName: string;
  SystemAddress: number;
}

export interface FSSAllBodiesFoundEvent extends JournalEvent {
  event: 'FSSAllBodiesFound';
  SystemName: string;
  SystemAddress: number;
  Count: number;
}

// Route events: nav route set/clear (used for planned route display).
// Route Events
export interface NavRouteEvent extends JournalEvent {
  event: 'NavRoute';
  Route?: Array<{
    StarSystem: string;
    SystemAddress: number;
    StarPos: [number, number, number];
    StarClass: string;
  }>;
}

export interface NavRouteClearEvent extends JournalEvent {
  event: 'NavRouteClear';
}

// Surface events: touchdown/liftoff (optional for surface/body context).
// Surface Events
export interface TouchdownEvent extends JournalEvent {
  event: 'Touchdown';
  PlayerControlled: boolean;
  Latitude: number;
  Longitude: number;
  NearestDestination?: string;
  NearestDestination_Localised?: string;
  StarSystem: string;
  SystemAddress: number;
  Body: string;
  BodyID: number;
  OnStation?: boolean;
  OnPlanet?: boolean;
}

export interface LiftoffEvent extends JournalEvent {
  event: 'Liftoff';
  PlayerControlled: boolean;
  Latitude: number;
  Longitude: number;
  NearestDestination?: string;
  NearestDestination_Localised?: string;
  StarSystem: string;
  SystemAddress: number;
  Body: string;
  BodyID: number;
  OnStation?: boolean;
  OnPlanet?: boolean;
}

export interface DisembarkEvent extends JournalEvent {
  event: 'Disembark';
  SRV: boolean;
  Taxi: boolean;
  Multicrew: boolean;
  ID: number;
  StarSystem: string;
  SystemAddress: number;
  Body: string;
  BodyID: number;
  OnStation: boolean;
  OnPlanet: boolean;
}

// Scan events: FSS/DSS scans, SAA, body signals; primary source for body data and scan values.
// Scan Events
export interface ScanEvent extends JournalEvent {
  event: 'Scan';
  ScanType: 'Basic' | 'Detailed' | 'NavBeaconDetail' | 'AutoScan';
  BodyName: string;
  BodyID: number;
  StarSystem: string;
  SystemAddress: number;
  DistanceFromArrivalLS: number;
  
  // Star properties (if star)
  StarType?: string;
  Subclass?: number;
  StellarMass?: number;
  Radius?: number;
  AbsoluteMagnitude?: number;
  Age_MY?: number;
  StellarSurfaceTemperature?: number;
  Luminosity?: string;
  
  // Planet/Moon properties
  PlanetClass?: string;
  TidalLock?: boolean;
  TerraformState?: string;
  Atmosphere?: string;
  AtmosphereType?: string;
  AtmosphereComposition?: Array<{ Name: string; Percent: number }>;
  Volcanism?: string;
  MassEM?: number;
  SurfaceGravity?: number;
  SurfaceTemperature?: number;
  SurfacePressure?: number;
  Landable?: boolean;
  
  // Orbital properties
  SemiMajorAxis?: number;
  Eccentricity?: number;
  OrbitalInclination?: number;
  Periapsis?: number;
  OrbitalPeriod?: number;
  RotationPeriod?: number;
  AxialTilt?: number;
  
  // Ring properties
  Rings?: Array<{
    Name: string;
    RingClass: string;
    MassMT: number;
    InnerRad: number;
    OuterRad: number;
  }>;
  
  // Discovery status
  WasDiscovered: boolean;
  WasMapped: boolean;
  WasFootfalled?: boolean;
  
  // Parent bodies
  Parents?: Array<{ [key: string]: number }>;
}

export interface SAAScanCompleteEvent extends JournalEvent {
  event: 'SAAScanComplete';
  BodyName: string;
  BodyID: number;
  SystemAddress: number;
  ProbesUsed: number;
  EfficiencyTarget: number;
}

export interface FSSBodySignalsEvent extends JournalEvent {
  event: 'FSSBodySignals';
  BodyName: string;
  BodyID: number;
  SystemAddress: number;
  Signals: Array<{
    Type: string;
    Type_Localised?: string;
    Count: number;
  }>;
}

export interface SAASignalsFoundEvent extends JournalEvent {
  event: 'SAASignalsFound';
  BodyName: string;
  BodyID: number;
  SystemAddress: number;
  Signals: Array<{
    Type: string;
    Type_Localised?: string;
    Count: number;
  }>;
  Genuses?: Array<{
    Genus: string;
    Genus_Localised?: string;
  }>;
}

// Odyssey biological/organic scans and codex entries; used for exobiology and codex.
// Odyssey Biological Events
export interface ScanOrganicEvent extends JournalEvent {
  event: 'ScanOrganic';
  ScanType: 'Log' | 'Sample' | 'Analyse';
  Genus: string;
  Genus_Localised?: string;
  Species: string;
  Species_Localised?: string;
  Variant?: string;
  Variant_Localised?: string;
  SystemAddress: number;
  Body: number;
}

export interface CodexEntryEvent extends JournalEvent {
  event: 'CodexEntry';
  EntryID: number;
  Name: string;
  Name_Localised?: string;
  SubCategory: string;
  SubCategory_Localised?: string;
  Category: string;
  Category_Localised?: string;
  Region: string;
  Region_Localised?: string;
  System: string;
  SystemAddress: number;
  BodyID?: number;
  IsNewEntry: boolean;
  NewTraitsDiscovered: boolean;
  VoucherAmount?: number;
}

// Commander status events: ranks, progress, reputation (fired after LoadGame at session start).
export interface RankEvent extends JournalEvent {
  event: 'Rank';
  Combat: number;
  Trade: number;
  Explore: number;
  Soldier: number;
  Exobiologist: number;
  Empire: number;
  Federation: number;
  CQC: number;
}

export interface ProgressEvent extends JournalEvent {
  event: 'Progress';
  Combat: number;
  Trade: number;
  Explore: number;
  Soldier: number;
  Exobiologist: number;
  Empire: number;
  Federation: number;
  CQC: number;
}

export interface ReputationEvent extends JournalEvent {
  event: 'Reputation';
  Empire: number;
  Federation: number;
  Alliance: number;
  Independent: number;
}

export interface PowerplayEvent extends JournalEvent {
  event: 'Powerplay';
  Power: string;
  Rank: number;
  Merits: number;
  TimePledged: number;
}

export interface PromotionEvent extends JournalEvent {
  event: 'Promotion';
  Combat?: number;
  Trade?: number;
  Explore?: number;
  Soldier?: number;
  Exobiologist?: number;
  Empire?: number;
  Federation?: number;
  CQC?: number;
}

// Union of all journal event types we parse and handle (used for type-safe event dispatch).
// Union type for all journal events we care about
export type EliteJournalEvent =
  | FileheaderEvent
  | LoadGameEvent
  | ContinuedEvent
  | ShutdownEvent
  | FSDJumpEvent
  | CarrierJumpEvent
  | LocationEvent
  | FSSDiscoveryScanEvent
  | FSSAllBodiesFoundEvent
  | NavRouteEvent
  | NavRouteClearEvent
  | TouchdownEvent
  | LiftoffEvent
  | DisembarkEvent
  | ScanEvent
  | SAAScanCompleteEvent
  | FSSBodySignalsEvent
  | SAASignalsFoundEvent
  | ScanOrganicEvent
  | CodexEntryEvent
  | RankEvent
  | ProgressEvent
  | ReputationEvent
  | PowerplayEvent
  | PromotionEvent;

// ============================================
// Application Data Types
// ============================================
// Domain types for systems, bodies, routes, codex, etc.; used by DB, IPC, and renderer.

/** Commander status aggregated from LoadGame, Rank, Progress, Reputation, Powerplay events. */
export interface CommanderInfo {
  name: string | null;
  credits: number;
  loan: number;
  ship: string | null;
  shipName: string | null;
  shipIdent: string | null;
  ranks: {
    combat: number;
    trade: number;
    explore: number;
    soldier: number;
    exobiologist: number;
    empire: number;
    federation: number;
    cqc: number;
  } | null;
  progress: {
    combat: number;
    trade: number;
    explore: number;
    soldier: number;
    exobiologist: number;
    empire: number;
    federation: number;
    cqc: number;
  } | null;
  reputation: {
    empire: number;
    federation: number;
    alliance: number;
    independent: number;
  } | null;
  powerplay: {
    power: string;
    rank: number;
    merits: number;
    timePledged: number;
  } | null;
}

export interface System {
  id: number;
  systemAddress: number;
  name: string;
  starPosX: number;
  starPosY: number;
  starPosZ: number;
  firstVisited: string;
  lastVisited: string;
  bodyCount: number | null;
  discoveredCount: number;
  mappedCount: number;
  /** Current scan value (from scans so far). */
  totalValue: number;
  /** Estimated FSS-only value (lowest; all bodies FSS with first discovery). */
  estimatedFssValue: number;
  /** Estimated max value if full FSS + DSS (first discovery + first mapped). */
  estimatedDssValue: number;
  allBodiesFound: boolean;
}

export type BodyType = 'Star' | 'Planet' | 'Moon' | 'Belt' | 'Ring';

export type ScanStatus = 'None' | 'Basic' | 'Detailed' | 'Mapped';

export interface CelestialBody {
  id: number;
  systemId: number;
  bodyId: number;
  name: string;
  bodyType: BodyType;
  subType: string;
  distanceLS: number;
  mass: number | null;
  radius: number | null;
  gravity: number | null;
  temperature: number | null;
  atmosphereType: string | null;
  volcanism: string | null;
  landable: boolean;
  terraformable: boolean;
  wasDiscovered: boolean;
  wasMapped: boolean;
  wasFootfalled: boolean;
  discoveredByMe: boolean;
  mappedByMe: boolean;
  footfalledByMe: boolean;
  scanType: ScanStatus;
  scanValue: number;
  bioSignals: number;
  geoSignals: number;
  humanSignals: number;
  thargoidSignals: number;
  parentId: number | null;
  semiMajorAxis: number | null; // Orbital semi-major axis in meters
  rawJson: string;
}

export interface Biological {
  id: number;
  bodyId: number;
  genus: string;
  species: string;
  variant: string | null;
  value: number;
  scanned: boolean;
  scanProgress: number;
}

export interface RouteEntry {
  id: number;
  systemId: number;
  systemName: string;
  timestamp: string;
  jumpDistance: number;
  fuelUsed: number;
  sessionId: string;
  starPosX: number;
  starPosY: number;
  starPosZ: number;
  /** Primary star type (e.g. K, M, G) from body_id 0. */
  primaryStarType: string | null;
  /** Number of bodies in the system (from systems.body_count). */
  bodyCount: number | null;
  /** Count of bodies first discovered by commander in this system. */
  firstDiscovered: number;
  /** Total scan value of the system (from systems.total_value; current scans). */
  totalValue: number;
  /** Estimated FSS-only value (lowest; from systems.estimated_fss_value). */
  estimatedFssValue: number;
  /** Estimated max value if full FSS + DSS (from systems.estimated_dss_value). */
  estimatedDssValue: number;
  /** High-value body counts in this system (from bodies by sub_type). */
  highValueBodies: {
    elw: number;
    ww: number;
    tww: number;
    ammonia: number;
    hmc: number;
    thmc: number;
    metalRich: number;
    trocky: number;
  };
}

export interface RouteHistoryFilter {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sessionId?: string;
}

export interface RouteSession {
  sessionId: string;
  startTime: string;
  endTime: string;
  jumpCount: number;
}

export interface CodexEntry {
  id: number;
  entryId: number;
  name: string;
  category: string;
  subcategory: string;
  region: string;
  systemName: string;
  systemAddress: number;
  bodyId: number | null;
  isNewEntry: boolean;
  newTraitsDiscovered: boolean;
  voucherAmount: number;
  timestamp: string;
}

export interface Statistics {
  totalSystems: number;
  totalBodies: number;
  firstDiscoveries: number;
  firstMapped: number;
  totalValue: number;
  biologicalsScanned: number;
  bodiesByType: Record<string, number>;
}

// ============================================
// IPC Channel Types
// ============================================
// Channel names and payload types for main↔renderer IPC; used by preload and handlers.

export interface IPCChannels {
  // Journal events from main to renderer
  'journal:event': EliteJournalEvent;
  'journal:system-changed': System;
  'journal:body-scanned': CelestialBody;
  'journal:body-mapped': { bodyId: number; systemAddress: number };
  'journal:body-signals-updated': {
    systemAddress: number;
    bodyId: number;
    bioSignals: number;
    geoSignals: number;
    humanSignals?: number;
    thargoidSignals?: number;
  };
  'journal:bio-scanned': Biological;
  
  // Database queries from renderer to main
  'db:get-current-system': void;
  'db:get-system-bodies': number; // systemId
  'db:get-route-history': { limit?: number; offset?: number };
  'db:get-statistics': void;
  
  // EDSM requests
  'edsm:get-system': string; // system name
  'edsm:get-system-bodies': string; // system name
  
  // Settings
  'settings:get': string; // key
  'settings:set': { key: string; value: unknown };
  'settings:get-journal-path': void;
  'settings:set-journal-path': string;
  
  // App controls
  'app:minimize': void;
  'app:maximize': void;
  'app:close': void;
}

// ============================================
// UI State Types
// ============================================
// Settings and UI state persisted or used in renderer (theme, window bounds, etc.).

export interface AppSettings {
  journalPath: string | null;
  theme: 'light' | 'dark' | 'system';
  showFirstDiscoveryValues: boolean;
  windowBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface SystemMapNode {
  body: CelestialBody;
  children: SystemMapNode[];
  biologicals: Biological[];
  isHighValue: boolean;
  estimatedValue: {
    base: number;
    withFirstDiscovery: number;
  };
}

// ============================================
// Journal Validation Types
// ============================================
// Types for journal path validation and import UI (file list, errors, Elite install check).

export interface JournalFileInfo {
  name: string;
  size: number;
  modified: string;
}

export interface JournalValidationResult {
  isValid: boolean;
  exists: boolean;
  isReadable: boolean;
  journalCount: number;
  latestJournal: string | null;
  latestJournalDate: string | null;
  eliteInstalled: boolean;
  errors: string[];
  warnings: string[];
  recentJournals?: JournalFileInfo[];
}
