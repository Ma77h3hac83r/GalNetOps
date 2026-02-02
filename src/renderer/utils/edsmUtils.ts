/** Converts EDSM API body shape to app CelestialBody (bodyType from parents, parentId, mass from earthMasses/solarMasses, scan values 0). */
import type { CelestialBody, BodyType } from '@shared/types';

export interface EDSMBodyInfo {
  bodyId: number;
  name: string;
  type: string;
  subType?: string;
  distanceToArrival: number;
  isMainStar?: boolean;
  isScoopable?: boolean;
  solarMasses?: number;
  solarRadius?: number;
  surfaceTemperature?: number;
  semiMajorAxis?: number;
  orbitalPeriod?: number;
  orbitalEccentricity?: number;
  orbitalInclination?: number;
  rotationalPeriod?: number;
  rotationalPeriodTidallyLocked?: boolean;
  axialTilt?: number;
  isLandable?: boolean;
  gravity?: number;
  earthMasses?: number;
  radius?: number;
  volcanismType?: string;
  atmosphereType?: string;
  terraformingState?: string;
  parents?: Array<{ [key: string]: number }>;
  rings?: Array<{
    name: string;
    type: string;
    mass: number;
    innerRadius: number;
    outerRadius: number;
  }>;
}

/** Map EDSM body to CelestialBody: infer Star/Planet/Moon from type and parents, set parentId and mass/radius/gravity/temp/atmo from EDSM fields. */
export function convertEDSMBodyToCelestialBody(edsmBody: EDSMBodyInfo): CelestialBody {
  let bodyType: BodyType = 'Planet';
  if (edsmBody.type === 'Star') {
    bodyType = 'Star';
  } else if (edsmBody.type === 'Planet') {
    if (edsmBody.parents) {
      const hasStarParent = edsmBody.parents.some(p => 'Star' in p);
      const hasPlanetParent = edsmBody.parents.some(p => 'Planet' in p);
      if (hasPlanetParent && !hasStarParent) {
        bodyType = 'Moon';
      } else if (hasPlanetParent) {
        bodyType = 'Moon';
      }
    }
  }

  let parentId: number | null = null;
  if (edsmBody.parents && edsmBody.parents.length > 0) {
    const firstParent = edsmBody.parents[0];
    if (firstParent != null) {
      const keys = Object.keys(firstParent);
      const parentType = keys[0];
      if (parentType !== undefined) {
        const id = firstParent[parentType];
        parentId = typeof id === 'number' ? id : null;
      }
    }
  }

  let mass: number | null = null;
  if (edsmBody.earthMasses) {
    mass = edsmBody.earthMasses;
  } else if (edsmBody.solarMasses) {
    mass = edsmBody.solarMasses;
  }

  return {
    id: 0,
    systemId: 0,
    bodyId: edsmBody.bodyId,
    name: edsmBody.name,
    bodyType,
    subType: (edsmBody.subType != null && String(edsmBody.subType)) ? String(edsmBody.subType) : '',
    distanceLS: Number(edsmBody.distanceToArrival) || 0,
    mass,
    radius: edsmBody.radius || edsmBody.solarRadius || null,
    gravity: edsmBody.gravity || null,
    temperature: edsmBody.surfaceTemperature || null,
    atmosphereType: edsmBody.atmosphereType || null,
    volcanism: edsmBody.volcanismType || null,
    landable: edsmBody.isLandable || false,
    terraformable: edsmBody.terraformingState === 'Terraformable' || edsmBody.terraformingState === 'Candidate for terraforming',
    wasDiscovered: true,
    wasMapped: true,
    discoveredByMe: false,
    mappedByMe: false,
    scanType: 'Detailed',
    scanValue: 0,
    bioSignals: 0,
    geoSignals: 0,
    humanSignals: 0,
    thargoidSignals: 0,
    parentId,
    semiMajorAxis: edsmBody.semiMajorAxis || null,
    rawJson: JSON.stringify({ ...edsmBody, Parents: edsmBody.parents }),
  };
}
