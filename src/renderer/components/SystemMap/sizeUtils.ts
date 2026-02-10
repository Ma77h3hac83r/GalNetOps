/**
 * Mass-based icon size calculation for system map bodies.
 */
import type { CelestialBody } from '@shared/types';
import {
  ICON_MIN_SIZE,
  ICON_MAX_STAR_SIZE,
  ICON_MAX_PLANET_SIZE,
  ICON_BELT_SIZE,
} from './constants';

export function calculateMassBasedSize(
  body: CelestialBody,
  maxStarMass: number,
  maxPlanetMass: number
): number {
  const mass = body.mass || 0.001;
  const isStar = body.bodyType === 'Star';
  const isBelt = body.bodyType === 'Belt';
  if (isBelt) return ICON_BELT_SIZE;
  const scalePower = 0.25;
  let size: number;
  if (isStar) {
    const maxMass = Math.max(maxStarMass, 0.01);
    const scaleFactor = Math.pow(mass / maxMass, scalePower);
    size = ICON_MIN_SIZE + (ICON_MAX_STAR_SIZE - ICON_MIN_SIZE) * scaleFactor;
  } else {
    const maxMass = Math.max(maxPlanetMass, 0.0001);
    const scaleFactor = Math.pow(mass / maxMass, scalePower);
    size = ICON_MIN_SIZE + (ICON_MAX_PLANET_SIZE - ICON_MIN_SIZE) * scaleFactor;
  }
  return Math.max(ICON_MIN_SIZE, size);
}
