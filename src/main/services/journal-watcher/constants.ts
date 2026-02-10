/**
 * Journal event names we listen for.
 */
export const JOURNAL_EVENTS = {
  FILEHEADER: 'Fileheader',
  LOAD_GAME: 'LoadGame',
  CONTINUED: 'Continued',
  SHUTDOWN: 'Shutdown',
  FSD_JUMP: 'FSDJump',
  CARRIER_JUMP: 'CarrierJump',
  LOCATION: 'Location',
  FSS_DISCOVERY_SCAN: 'FSSDiscoveryScan',
  FSS_ALL_BODIES_FOUND: 'FSSAllBodiesFound',
  NAV_ROUTE: 'NavRoute',
  NAV_ROUTE_CLEAR: 'NavRouteClear',
  TOUCHDOWN: 'Touchdown',
  LIFTOFF: 'Liftoff',
  DISEMBARK: 'Disembark',
  SCAN: 'Scan',
  SAA_SCAN_COMPLETE: 'SAAScanComplete',
  FSS_BODY_SIGNALS: 'FSSBodySignals',
  SAA_SIGNALS_FOUND: 'SAASignalsFound',
  SCAN_ORGANIC: 'ScanOrganic',
  CODEX_ENTRY: 'CodexEntry',
  RANK: 'Rank',
  PROGRESS: 'Progress',
  REPUTATION: 'Reputation',
  POWERPLAY: 'Powerplay',
  PROMOTION: 'Promotion',
} as const;

/**
 * Loop bounds to prevent unbounded iteration.
 */
export const MAX_FILES_IN_DIRECTORY = 10000;
export const MAX_BACKFILL_FILES = 1000;
export const MAX_LINES_PER_FILE = 1000000;
