/**
 * Context passed to journal event handlers.
 */
import type { DatabaseService } from '../../database';
import type { SettingsService } from '../../settings';
import type { System } from '../../../../shared/types';
import type {
  GameState,
  CarrierState,
  RouteInfo,
  SurfaceState,
  CommanderState,
  PendingSignalsPayload,
} from '../types';

export interface JournalWatcherContext {
  db: DatabaseService;
  settings: SettingsService;
  getGameState(): GameState;
  setGameState(g: GameState): void;
  getCarrierState(): CarrierState;
  setCarrierState(c: CarrierState): void;
  getRouteInfo(): RouteInfo;
  setRouteInfo(r: RouteInfo): void;
  getSurfaceState(): SurfaceState;
  setSurfaceState(s: SurfaceState): void;
  getCommanderState(): CommanderState;
  setCommanderState(c: CommanderState): void;
  getCurrentSystem(): System | null;
  setCurrentSystem(s: System | null): void;
  getPendingSignals(): Map<string, PendingSignalsPayload>;
  getSessionId(): string;
  emit(event: string, payload?: unknown): void;
}
