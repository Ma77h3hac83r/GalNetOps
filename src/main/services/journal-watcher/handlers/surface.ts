/**
 * Surface: Touchdown, Liftoff, Disembark.
 */
import type { TouchdownEvent, LiftoffEvent, DisembarkEvent } from '../../../../shared/types';
import type { JournalWatcherContext } from './context';
import { logDebug, isDev } from '../../../logger';

export async function handleTouchdown(
  ctx: JournalWatcherContext,
  event: TouchdownEvent,
  isBackfill: boolean
): Promise<void> {
  if (!event.PlayerControlled) return;

  ctx.setSurfaceState({
    isLanded: true,
    bodyName: event.Body,
    bodyId: event.BodyID,
    latitude: event.Latitude,
    longitude: event.Longitude,
    nearestDestination:
      event.NearestDestination_Localised || event.NearestDestination || null,
  });

  if (!isBackfill) {
    const surfaceState = ctx.getSurfaceState();
    ctx.emit('touchdown', {
      bodyName: event.Body,
      bodyId: event.BodyID,
      latitude: event.Latitude,
      longitude: event.Longitude,
      nearestDestination: surfaceState.nearestDestination,
      systemName: event.StarSystem,
      systemAddress: event.SystemAddress,
      timestamp: event.timestamp,
    });
    logDebug(
      'JournalWatcher',
      isDev()
        ? `Landed on ${event.Body} at ${event.Latitude.toFixed(4)}, ${event.Longitude.toFixed(4)}`
        : 'Landed on surface'
    );
  }
}

export async function handleLiftoff(
  ctx: JournalWatcherContext,
  event: LiftoffEvent,
  isBackfill: boolean
): Promise<void> {
  if (!event.PlayerControlled) return;

  ctx.setSurfaceState({
    isLanded: false,
    bodyName: null,
    bodyId: null,
    latitude: null,
    longitude: null,
    nearestDestination: null,
  });

  if (!isBackfill) {
    ctx.emit('liftoff', {
      bodyName: event.Body,
      bodyId: event.BodyID,
      latitude: event.Latitude,
      longitude: event.Longitude,
      systemName: event.StarSystem,
      systemAddress: event.SystemAddress,
      timestamp: event.timestamp,
    });
    logDebug(
      'JournalWatcher',
      isDev() ? `Lifted off from ${event.Body}` : 'Lifted off'
    );
  }
}

export async function handleDisembark(
  ctx: JournalWatcherContext,
  event: DisembarkEvent,
  isBackfill: boolean
): Promise<void> {
  // Only count on-foot disembark on a planet surface (not SRV, not on station)
  if (event.SRV || event.OnStation || !event.OnPlanet) return;

  const system = ctx.getCurrentSystem();
  if (!system) return;

  const wasFirstFootfall = ctx.db.updateBodyFootfalled(system.id, event.BodyID);

  if (wasFirstFootfall && !isBackfill) {
    ctx.emit('body-footfalled', {
      bodyId: event.BodyID,
      systemAddress: event.SystemAddress,
    });
    logDebug(
      'JournalWatcher',
      isDev()
        ? `First Footfall on ${event.Body}`
        : 'First Footfall recorded'
    );
  }
}
