/**
 * Estimated scan value for bodies (when not yet stored).
 */
import type { CelestialBody } from '@shared/types';
import { getBaseScanValue, getTerraformBonus, NO_SCAN_VALUE_BODY_TYPES } from '@shared/scanValueFormulas';

export function estimateScanValue(body: CelestialBody): number {
  if (body.scanValue > 0) return body.scanValue;
  if (NO_SCAN_VALUE_BODY_TYPES.includes(body.bodyType as 'Belt' | 'Ring')) return 0;
  let baseValue = getBaseScanValue(body.subType ?? '');
  const terraBonus = getTerraformBonus(body.subType ?? '');
  if (body.terraformable && terraBonus !== undefined) {
    baseValue += terraBonus;
  }
  let multiplier = 1;
  if (!body.wasDiscovered) multiplier *= 1.5;
  if (body.scanType === 'Mapped') multiplier *= body.wasMapped ? 3.33 : 5.0;
  return Math.round(baseValue * multiplier);
}
