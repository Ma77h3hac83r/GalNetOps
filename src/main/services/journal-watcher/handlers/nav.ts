/**
 * Navigation: FSDJump, CarrierJump, Location, DiscoveryScan, AllBodiesFound, NavRoute, NavRouteClear.
 */
import type {
  FSDJumpEvent,
  CarrierJumpEvent,
  LocationEvent,
  FSSDiscoveryScanEvent,
  FSSAllBodiesFoundEvent,
  NavRouteEvent,
} from '../../../../shared/types';
import type { JournalWatcherContext } from './context';
import { logInfo, logDebug, isDev } from '../../../logger';

export async function handleFSDJump(
  ctx: JournalWatcherContext,
  event: FSDJumpEvent,
  isBackfill: boolean
): Promise<void> {
  const carrierState = ctx.getCarrierState();
  if (carrierState.isOnCarrier) {
    ctx.setCarrierState({
      isOnCarrier: false,
      carrierName: null,
      carrierMarketId: null,
      isDocked: false,
    });
  }

  const surfaceState = ctx.getSurfaceState();
  if (surfaceState.isLanded) {
    ctx.setSurfaceState({
      isLanded: false,
      bodyName: null,
      bodyId: null,
      latitude: null,
      longitude: null,
      nearestDestination: null,
    });
  }

  const routeInfo = ctx.getRouteInfo();
  if (routeInfo.hasRoute && routeInfo.jumpsRemaining > 0) {
    const newRemaining = routeInfo.jumpsRemaining - 1;
    const reached =
      newRemaining === 0 || event.StarSystem === routeInfo.destination;
    if (reached) {
      ctx.setRouteInfo({
        hasRoute: false,
        routeLength: 0,
        destination: null,
        jumpsRemaining: 0,
      });
    } else {
      ctx.setRouteInfo({ ...routeInfo, jumpsRemaining: newRemaining });
    }
  }

  const system = ctx.db.upsertSystem(
    event.SystemAddress,
    event.StarSystem,
    event.StarPos
  );

  const currentSystem = ctx.getCurrentSystem();
  if (currentSystem?.systemAddress !== event.SystemAddress) {
    ctx.getPendingSignals().clear();
  }

  ctx.setCurrentSystem(system);

  ctx.db.addRouteEntry(
    system.id,
    event.timestamp,
    event.JumpDist,
    event.FuelUsed,
    ctx.getSessionId()
  );

  if (!isBackfill) {
    ctx.emit('system-changed', system);
  }
}

export async function handleCarrierJump(
  ctx: JournalWatcherContext,
  event: CarrierJumpEvent,
  isBackfill: boolean
): Promise<void> {
  ctx.setCarrierState({
    isOnCarrier: true,
    carrierName: event.StationName || null,
    carrierMarketId: event.MarketID || null,
    isDocked: event.Docked ?? false,
  });

  const system = ctx.db.upsertSystem(
    event.SystemAddress,
    event.StarSystem,
    event.StarPos
  );

  const currentSystem = ctx.getCurrentSystem();
  if (currentSystem?.systemAddress !== event.SystemAddress) {
    ctx.getPendingSignals().clear();
  }

  ctx.setCurrentSystem(system);

  if (!isBackfill) {
    ctx.emit('system-changed', system);
    const carrierState = ctx.getCarrierState();
    ctx.emit('carrier-jumped', {
      system,
      carrierName: carrierState.carrierName,
      carrierMarketId: carrierState.carrierMarketId,
      isDocked: carrierState.isDocked,
      isOnFoot: event.OnFoot ?? false,
      timestamp: event.timestamp,
    });
  }

  logDebug(
    'JournalWatcher',
    isDev()
      ? `Carrier jump to ${event.StarSystem}${event.StationName ? ` (${event.StationName})` : ''}`
      : 'Carrier jump'
  );
}

export async function handleLocation(
  ctx: JournalWatcherContext,
  event: LocationEvent,
  isBackfill: boolean
): Promise<void> {
  const system = ctx.db.upsertSystem(
    event.SystemAddress,
    event.StarSystem,
    event.StarPos
  );

  const currentSystem = ctx.getCurrentSystem();
  if (currentSystem?.systemAddress !== event.SystemAddress) {
    ctx.getPendingSignals().clear();
  }

  ctx.setCurrentSystem(system);

  if (!isBackfill) {
    ctx.emit('system-changed', system);
  }
}

export async function handleDiscoveryScan(
  ctx: JournalWatcherContext,
  event: FSSDiscoveryScanEvent,
  isBackfill: boolean
): Promise<void> {
  ctx.db.updateSystemBodyCount(event.SystemAddress, event.BodyCount);
  const system = ctx.db.getSystemByAddress(event.SystemAddress);
  if (system) {
    ctx.setCurrentSystem(system);
    if (!isBackfill) {
      ctx.emit('system-changed', system);
    }
  }
}

export async function handleAllBodiesFound(
  ctx: JournalWatcherContext,
  event: FSSAllBodiesFoundEvent,
  isBackfill: boolean
): Promise<void> {
  ctx.db.markSystemAllBodiesFound(event.SystemAddress);
  const system = ctx.db.getSystemByAddress(event.SystemAddress);
  if (system) {
    ctx.setCurrentSystem(system);
    if (!isBackfill) {
      ctx.emit('system-changed', system);
      ctx.emit('all-bodies-found', {
        systemName: event.SystemName,
        systemAddress: event.SystemAddress,
        bodyCount: event.Count,
        timestamp: event.timestamp,
      });
    }
  }
  logInfo(
    'JournalWatcher',
    isDev() ? `All ${event.Count} bodies found in ${event.SystemName}` : `All ${event.Count} bodies found`
  );
}

export async function handleNavRoute(
  ctx: JournalWatcherContext,
  event: NavRouteEvent
): Promise<void> {
  if (event.Route && event.Route.length > 0) {
    const destination = event.Route[event.Route.length - 1];
    if (destination === undefined) return;
    const jumpsRemaining = event.Route.length - 1;
    ctx.setRouteInfo({
      hasRoute: true,
      routeLength: event.Route.length,
      destination: destination.StarSystem,
      jumpsRemaining,
    });
    ctx.emit('route-plotted', {
      destination: destination.StarSystem,
      jumpsTotal: jumpsRemaining,
      route: event.Route,
      timestamp: event.timestamp,
    });
    logInfo(
      'JournalWatcher',
      isDev()
        ? `Route plotted to ${destination.StarSystem} (${event.Route.length} jumps)`
        : `Route plotted (${event.Route.length} jumps)`
    );
  }
}

export async function handleNavRouteClear(ctx: JournalWatcherContext): Promise<void> {
  const hadRoute = ctx.getRouteInfo().hasRoute;
  ctx.setRouteInfo({
    hasRoute: false,
    routeLength: 0,
    destination: null,
    jumpsRemaining: 0,
  });
  if (hadRoute) {
    ctx.emit('route-cleared', { timestamp: new Date().toISOString() });
    logInfo('JournalWatcher', 'Route cleared');
  }
}
