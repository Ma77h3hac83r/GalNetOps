/** Galactic region lookup from RegionMapData (run-length encoded grid); used for codex/statistics region names. */
import regionMapData from './RegionMapData.json';

const regions: (string | null)[] = regionMapData.regions;
const regionmap: number[][][] = regionMapData.regionmap;

/** Grid origin in ly (X, Z) for mapping star coordinates to region grid indices. */
const X0 = -49985;
const Z0 = -24105;

export interface GalacticRegion {
  id: number;
  name: string | null;
}

/** Map 3D star position (x, _y, z) in ly to galactic region id and name; returns null if out of grid. */
export function findGalacticRegion(x: number, _y: number, z: number): GalacticRegion | null {
  const px = Math.floor((x - X0) * 83 / 4096);
  const pz = Math.floor((z - Z0) * 83 / 4096);

  if (px < 0 || pz < 0 || pz >= regionmap.length) {
    return null;
  }

  const row = regionmap[pz];
  if (!row) {
    return null;
  }

  let rx = 0;
  let pv = 0;

  for (const v of row) {
    const rl = v[0];
    if (rl === undefined) continue;
    if (px < rx + rl) {
      const pvVal = v[1];
      if (pvVal !== undefined) pv = pvVal;
      break;
    } else {
      rx += rl;
    }
  }

  if (pv === 0) {
    return { id: 0, name: null };
  }

  return { id: pv, name: regions[pv] ?? null };
}
