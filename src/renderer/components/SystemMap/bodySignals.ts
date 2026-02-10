/**
 * Parse body signals from rawJson and format numbers for display.
 */
import type { CelestialBody } from '@shared/types';
import type { BodySignals } from './types';

export function parseBodySignals(body: CelestialBody): BodySignals {
  const signals: BodySignals = { human: 0, guardian: 0, thargoid: 0 };
  try {
    const data = JSON.parse(body.rawJson);
    const signalList = data.Signals || data.signals || [];
    for (const signal of signalList) {
      const type = (signal.Type || signal.type || '').toLowerCase();
      const count = signal.Count || signal.count || 1;
      if (type.includes('human')) signals.human += count;
      else if (type.includes('guardian')) signals.guardian += count;
      else if (type.includes('thargoid')) signals.thargoid += count;
    }
  } catch {
    // No signals or parse error
  }
  return signals;
}

export function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}
