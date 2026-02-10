/**
 * Scanning: Scan, SAAScanComplete, FSSBodySignals/SAASignalsFound, ScanOrganic, CodexEntry.
 */
import type {
  ScanEvent,
  SAAScanCompleteEvent,
  FSSBodySignalsEvent,
  SAASignalsFoundEvent,
  ScanOrganicEvent,
  CodexEntryEvent,
} from '../../../../shared/types';
import { getBiologicalValue } from '../../../../shared/exobiologyFormulas';
import type { JournalWatcherContext } from './context';
import { parseSignalCounts, processSignalEvent } from '../processSignal';
import {
  logExobiologyEstimate,
  checkExobiologyMismatch,
} from '../exobiology';

export async function handleScan(
  ctx: JournalWatcherContext,
  event: ScanEvent,
  isBackfill: boolean
): Promise<void> {
  let system = ctx.db.getSystemByAddress(event.SystemAddress);
  if (!system) {
    system = ctx.db.upsertSystem(
      event.SystemAddress,
      event.StarSystem,
      [0, 0, 0]
    );
  }

  let body = ctx.db.upsertBody(system.id, event);

  const pendingKey = `${event.SystemAddress}_${event.BodyID}`;
  const pending = ctx.getPendingSignals().get(pendingKey);
  if (pending) {
    ctx.db.updateBodySignals(
      system.id,
      event.BodyID,
      pending.bioSignals,
      pending.geoSignals,
      pending.humanSignals,
      pending.thargoidSignals
    );
    ctx.getPendingSignals().delete(pendingKey);
    body = ctx.db.getBodyBySystemIdAndBodyId(system.id, event.BodyID) || body;
  }

  if (!isBackfill) {
    const bodies = ctx.db.getSystemBodies(system.id);
    logExobiologyEstimate(system.name, body.name, body, bodies);
    ctx.emit('body-scanned', body);
  }
}

export async function handleSAAScan(
  ctx: JournalWatcherContext,
  event: SAAScanCompleteEvent,
  isBackfill: boolean
): Promise<void> {
  const system = ctx.db.getSystemByAddress(event.SystemAddress);
  if (!system) return;

  ctx.db.updateBodyMapped(system.id, event.BodyID);

  if (!isBackfill) {
    ctx.emit('body-mapped', {
      bodyId: event.BodyID,
      systemAddress: event.SystemAddress,
    });
  }
}

export async function handleBodySignals(
  ctx: JournalWatcherContext,
  event: FSSBodySignalsEvent | SAASignalsFoundEvent,
  isBackfill: boolean
): Promise<void> {
  const system = ctx.db.getSystemByAddress(event.SystemAddress);
  if (!system) return;

  const existingBody = ctx.db.getBodyBySystemIdAndBodyId(system.id, event.BodyID);

  if (!existingBody) {
    const isRing = /\s+[A-Z]\s+Ring$/.test(event.BodyName || '');
    if (!isRing) {
      const pendingKey = `${event.SystemAddress}_${event.BodyID}`;
      ctx.getPendingSignals().set(pendingKey, parseSignalCounts(event.Signals));
    }
    return;
  }

  const payload = processSignalEvent(ctx.db, system.id, event);
  if (payload) {
    ctx.emit('body-signals-updated', {
      systemAddress: event.SystemAddress,
      bodyId: event.BodyID,
      bioSignals: payload.bioSignals,
      geoSignals: payload.geoSignals,
      humanSignals: payload.humanSignals,
      thargoidSignals: payload.thargoidSignals,
    });
    // Run exobiology estimator when bio signals arrive after Scan (e.g. honk AutoScan before FSSBodySignals)
    if (!isBackfill && payload.bioSignals > 0) {
      const body = ctx.db.getBodyBySystemIdAndBodyId(system.id, event.BodyID);
      if (body) {
        const bodies = ctx.db.getSystemBodies(system.id);
        logExobiologyEstimate(system.name, body.name, body, bodies);
      }
    }
  }
}

export async function handleScanOrganic(
  ctx: JournalWatcherContext,
  event: ScanOrganicEvent,
  isBackfill: boolean
): Promise<void> {
  const system = ctx.db.getSystemByAddress(event.SystemAddress);
  if (!system) return;

  const bodies = ctx.db.getSystemBodies(system.id);
  const body = bodies.find((b) => b.bodyId === event.Body);
  if (!body) return;

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

  const speciesKey = event.Species_Localised || event.Species;
  const value = getBiologicalValue(speciesKey);

  const bio = ctx.db.upsertBiological(
    body.id,
    event.Genus_Localised || event.Genus,
    speciesKey,
    event.Variant_Localised || event.Variant || null,
    value,
    scanProgress
  );

  if (!isBackfill) {
    // Only check mismatch on Analyse (3/3) to avoid repeated popups during Log/Sample stages
    if (event.ScanType === 'Analyse') {
      const bodiesList = ctx.db.getSystemBodies(system.id);
      checkExobiologyMismatch(
        system.name,
        body.name,
        event.Genus_Localised || event.Genus,
        speciesKey,
        event.Variant_Localised || event.Variant || null,
        body,
        bodiesList,
        ctx.db,
        (ev, payload) => ctx.emit(ev, payload)
      );
    }
    ctx.emit('bio-scanned', bio);
  }
}

export async function handleCodexEntry(
  ctx: JournalWatcherContext,
  event: CodexEntryEvent,
  isBackfill: boolean
): Promise<void> {
  const entry = ctx.db.upsertCodexEntry(
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
    ctx.emit('codex-entry', entry);
  }
}
