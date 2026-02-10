/**
 * Process FSSBodySignals / SAASignalsFound: update body signals, ring materials, genuses.
 */
import type { DatabaseService } from '../database';
import type { FSSBodySignalsEvent, SAASignalsFoundEvent } from '../../../shared/types';
import { JOURNAL_EVENTS } from './constants';
import type { PendingSignalsPayload } from './types';

/** Extract bio/geo/human/thargoid signal counts from a signal event's Signals array. */
export function parseSignalCounts(
  signals: ReadonlyArray<{ Type: string; Count: number }> | undefined
): PendingSignalsPayload {
  let bioSignals = 0;
  let geoSignals = 0;
  let humanSignals: number | undefined;
  let thargoidSignals: number | undefined;
  for (const signal of signals || []) {
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
  return {
    bioSignals,
    geoSignals,
    ...(humanSignals !== undefined ? { humanSignals } : {}),
    ...(thargoidSignals !== undefined ? { thargoidSignals } : {}),
  };
}

export function processSignalEvent(
  db: DatabaseService,
  systemId: number,
  event: FSSBodySignalsEvent | SAASignalsFoundEvent
): PendingSignalsPayload | null {
  const isRing = /\s+[A-Z]\s+Ring$/.test(event.BodyName || '');

  if (isRing) {
    const parentName = (event.BodyName || '').replace(/\s+[A-Z]\s+Ring$/, '');
    const materials = (event.Signals || []).map((s) => ({ Name: s.Type, Count: s.Count }));
    if (parentName && materials.length > 0 && event.BodyName) {
      db.mergeRingMaterialsIntoParent(systemId, parentName, event.BodyName, materials);
    }
    return null;
  }

  const counts = parseSignalCounts(event.Signals);
  db.updateBodySignals(
    systemId,
    event.BodyID,
    counts.bioSignals,
    counts.geoSignals,
    counts.humanSignals,
    counts.thargoidSignals
  );

  if (event.event === JOURNAL_EVENTS.SAA_SIGNALS_FOUND) {
    const genuses = (event as SAASignalsFoundEvent).Genuses;
    if (genuses?.length) {
      const names = genuses.map((g) => g.Genus_Localised || g.Genus);
      db.mergeBodyGenuses(systemId, event.BodyID, names);
    }
  }

  return counts;
}
