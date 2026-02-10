/**
 * State types for the journal watcher.
 */

export interface GameState {
  isRunning: boolean;
  commander: string | null;
  gameMode: string | null;
  ship: string | null;
  isOdyssey: boolean;
  isHorizons: boolean;
}

export interface CarrierState {
  isOnCarrier: boolean;
  carrierName: string | null;
  carrierMarketId: number | null;
  isDocked: boolean;
}

export interface RouteInfo {
  hasRoute: boolean;
  routeLength: number;
  destination: string | null;
  jumpsRemaining: number;
}

export interface SurfaceState {
  isLanded: boolean;
  bodyName: string | null;
  bodyId: number | null;
  latitude: number | null;
  longitude: number | null;
  nearestDestination: string | null;
}

export interface CommanderState {
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

export interface PendingSignalsPayload {
  bioSignals: number;
  geoSignals: number;
  humanSignals?: number;
  thargoidSignals?: number;
}
