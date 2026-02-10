/**
 * Exobiology helpers: materials, parent star, mismatch characteristics, estimate log, mismatch check.
 */
import type { CelestialBody } from '../../../shared/types';
import type { DatabaseService } from '../database';
import {
  estimatePossibleGenera,
  computeSystemHas,
  formatScannedSpecies,
  normalizeVariantForComparison,
  parseStarClass,
} from '../../../shared/exobiologyEstimator';
import { logInfo, logWarn } from '../../logger';

export function parseBodyMaterials(body: CelestialBody): Array<{ Name: string }> {
  if (!body?.rawJson) return [];
  try {
    const d = JSON.parse(body.rawJson) as Record<string, unknown>;
    const raw = d.Materials ?? d.materials;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((m): m is Record<string, unknown> => m != null && typeof m === 'object')
      .map((m) => ({ Name: String(m.Name ?? m.name ?? '') }))
      .filter((m) => m.Name.length > 0);
  } catch (e: unknown) {
    return [];
  }
}

export function findParentStar(
  body: CelestialBody,
  bodies: CelestialBody[]
): CelestialBody | null {
  if (body.bodyType === 'Star') return body;
  let current: CelestialBody | null = body;
  while (current?.parentId != null) {
    const parent = bodies.find((b) => b.bodyId === current!.parentId);
    if (!parent) break;
    if (parent.bodyType === 'Star') return parent;
    current = parent;
  }
  return bodies.find((b) => b.bodyType === 'Star') || null;
}

export function buildMismatchCharacteristics(
  body: CelestialBody,
  bodies: CelestialBody[]
): {
  mainStarClass: string;
  bodyType: string;
  bodyDistanceLs: number | null;
  planetTypesInSystem: string;
  gravity: number | null;
  temperature: number | null;
  atmosphere: string | null;
  volcanism: string | null;
} {
  const star = findParentStar(body, bodies);
  const mainStarClass = star?.subType ? parseStarClass(star.subType) || star.subType : '';
  const systemHas = computeSystemHas(bodies);
  const specialTypes: string[] = [];
  if (systemHas.elw) specialTypes.push('Earth-Like World');
  if (systemHas.ammoniaWorld) specialTypes.push('Ammonia World');
  if (systemHas.ggWater) specialTypes.push('Gas Giant with Water-Based Life');
  if (systemHas.ggAmmonia) specialTypes.push('Gas Giant with Ammonia-Based Life');
  if (systemHas.waterGiant) specialTypes.push('Water Giant');
  const nonStarTypes = bodies
    .filter((b) => b.bodyType !== 'Star' && b.subType)
    .map((b) => b.subType as string);
  const uniqueTypes = [...new Set([...specialTypes, ...nonStarTypes])];
  const planetTypesInSystem = uniqueTypes.length > 0 ? uniqueTypes.join(', ') : 'N/A';
  return {
    mainStarClass: mainStarClass || 'N/A',
    bodyType: body.subType || body.bodyType || 'N/A',
    bodyDistanceLs: body.distanceLS ?? null,
    planetTypesInSystem,
    gravity: body.gravity ?? null,
    temperature: body.temperature ?? null,
    atmosphere: body.atmosphereType ?? null,
    volcanism: body.volcanism ?? null,
  };
}

export function logExobiologyEstimate(
  systemName: string,
  bodyName: string,
  body: CelestialBody,
  bodies: CelestialBody[]
): void {
  if ((body.bioSignals ?? 0) <= 0) return;
  try {
    const star = findParentStar(body, bodies);
    const starClassLetter = parseStarClass(star?.subType);
    const systemHas = computeSystemHas(bodies);
    const materials = parseBodyMaterials(body);
    const estimates = estimatePossibleGenera({
      atmosphere: body.atmosphereType,
      tempK: body.temperature,
      gravityG: body.gravity,
      planetType: body.subType,
      volcanism: body.volcanism,
      distanceLS: body.distanceLS,
      starClassLetter,
      systemHas,
      ...(materials.length > 0 ? { materials } : {}),
    });
    if (estimates.length > 0) {
      const lines = estimates.flatMap((e) => e.possible.map((p) => p.fullLabel));
      logInfo('Exobiology', `${systemName} ${bodyName}: estimated ${lines.join(', ')}`);
    }
  } catch (err: unknown) {
    logWarn(
      'Exobiology',
      `Failed to estimate for ${systemName} ${bodyName}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

export function checkExobiologyMismatch(
  systemName: string,
  bodyName: string,
  genus: string,
  species: string,
  variant: string | null,
  body: CelestialBody,
  bodies: CelestialBody[],
  db: DatabaseService,
  emit: (event: string, payload: unknown) => void
): void {
  try {
    const star = findParentStar(body, bodies);
    const starClassLetter = parseStarClass(star?.subType);
    const systemHas = computeSystemHas(bodies);
    const materials = parseBodyMaterials(body);
    const estimates = estimatePossibleGenera({
      atmosphere: body.atmosphereType,
      tempK: body.temperature,
      gravityG: body.gravity,
      planetType: body.subType,
      volcanism: body.volcanism,
      distanceLS: body.distanceLS,
      starClassLetter,
      systemHas,
      ...(materials.length > 0 ? { materials } : {}),
    });
    const characteristics = buildMismatchCharacteristics(body, bodies);
    const scannedBios = db.getBodyBiologicals(body.id);
    const verifiedKeys = new Set<string>();
    for (const b of scannedBios.filter((x) => x.scanProgress >= 1)) {
      verifiedKeys.add(`${b.genus}|${b.species}`);
      if (b.species.startsWith(b.genus + ' ')) {
        verifiedKeys.add(`${b.genus}|${b.species.slice(b.genus.length + 1)}`);
      }
    }
    const allEstimated = estimates.flatMap((e) =>
      e.possible.map((p) => ({ genus: e.genus, fullLabel: p.fullLabel }))
    );
    const speciesNotVerified = [
      ...new Set(
        allEstimated
          .filter(({ genus: g, fullLabel }) => {
            const shortSp = fullLabel.startsWith(g + ' ')
              ? fullLabel.slice(g.length + 1).replace(/\s+[\w-]+$/, '').trim()
              : fullLabel.replace(/\s+[\w-]+$/, '').trim();
            const speciesName = shortSp ? `${g} ${shortSp}` : g;
            const key = `${g}|${speciesName}`;
            const keyAlt = `${g}|${shortSp}`;
            return !verifiedKeys.has(key) && !verifiedKeys.has(keyAlt);
          })
          .map(({ genus: g, fullLabel }) => {
            const shortSp = fullLabel.startsWith(g + ' ')
              ? fullLabel.slice(g.length + 1).replace(/\s+[\w-]+$/, '').trim()
              : fullLabel.replace(/\s+[\w-]+$/, '').trim();
            return shortSp ? `${g} ${shortSp}` : g;
          })
      ),
    ];

    // Parse DSS-confirmed genuses from body rawJson
    let dssGenuses: string[] = [];
    try {
      const d = body.rawJson ? (JSON.parse(body.rawJson) as Record<string, unknown>) : null;
      const g = d?.Genuses ?? d?.genuses;
      dssGenuses = Array.isArray(g)
        ? (g as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
    } catch (e: unknown) {
      // ignore
    }

    // Helper: build a DSS-perspective string for a single genus
    const getDssForGenus = (g: string): string => {
      if (!dssGenuses.includes(g)) return 'N/A (genus not in DSS)';
      const genusEst = estimates.find((e) => e.genus === g);
      if (!genusEst) return `Confirmed ${g} - Unknown`;
      const possibleParts = genusEst.possible.flatMap((p) =>
        p.variantColor
          ? p.variantColor.split(',').map((v) => `${p.species} - ${v.trim()}`)
          : [p.species]
      );
      return `Confirmed ${g} - Possible ${possibleParts.join(', ')}`;
    };

    const currentScanFormatted = formatScannedSpecies(genus, species, variant);

    // Emit payload now takes per-mismatch filtered FSS/DSS/scanned strings
    const emitPayload = (estimatedVariant: string, reason: string, fssSpecies: string, dssSpecies: string) => ({
      systemName,
      bodyName,
      genus,
      species,
      foundVariant: variant ?? '',
      estimatedVariant,
      reason,
      characteristics,
      speciesNotVerified: speciesNotVerified.length > 0 ? speciesNotVerified : undefined,
      estimatedFssSpecies: fssSpecies || 'None',
      estimatedDssSpecies: dssSpecies || 'N/A (no DSS yet)',
      confirmedSpecies: currentScanFormatted,
    });

    const eg = estimates.find((e) => e.genus === genus);
    if (!eg) {
      emit('exobiology-mismatch', emitPayload(
        '', 'genus_not_estimated',
        'Not estimated',
        getDssForGenus(genus),
      ));
      return;
    }
    const shortSpecies = species.startsWith(genus + ' ')
      ? species.slice(genus.length + 1)
      : species;
    const possible = eg.possible.find(
      (p) => p.species === shortSpecies || species.endsWith(' ' + p.species)
    );
    if (!possible) {
      // Species not found in estimates for this genus — show all estimated species for this genus
      const genusFss = eg.possible.map((p) => p.fullLabel).join(', ');
      emit('exobiology-mismatch', emitPayload(
        '', 'species_not_estimated',
        genusFss,
        getDssForGenus(genus),
      ));
      return;
    }
    if (possible.variantColor) {
      const foundNorm = normalizeVariantForComparison(variant);
      const estimatedList = possible.variantColor.split(',').map((v) => v.trim().toLowerCase());
      const matches = foundNorm && estimatedList.some((e) => e === foundNorm);
      if (foundNorm && !matches) {
        emit('exobiology-mismatch', emitPayload(
          possible.fullLabel, 'variant_mismatch',
          possible.fullLabel,
          getDssForGenus(genus),
        ));
      }
    }
  } catch (err: unknown) {
    logWarn(
      'Exobiology',
      `Failed to check mismatch for ${species}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
