/**
 * Body scan value formulas and constants.
 * Base values from BODY_SCAN_VALUES.md; multipliers per Elite Dangerous exploration bonuses.
 */
import { normalizePlanetClass, normalizeStarType } from './normalization';

/** Lowest FSS base values from BODY_SCAN_VALUES.md; keyed by canonical planet class or star type (see normalization.ts). */
export const BASE_SCAN_VALUES: Record<string, number> = {
  // Stars (canonical star type)
  o: 4170,
  b: 3012,
  a: 2950,
  f: 2932,
  g: 2923,
  k: 2911,
  m: 2887,
  l: 2881,
  t: 2881,
  y: 2881,
  tts: 2900,
  aebe: 2900,
  w: 2900,
  wn: 2900,
  wnc: 2900,
  wc: 2900,
  wo: 2900,
  cs: 2900,
  s: 2900,
  d: 14000,
  n: 22000,
  h: 22000,
  supermassive_black_hole: 22000,
  // Terrestrial (canonical planet class)
  earth_like_world: 270000,
  ammonia_world: 143000,
  water_world: 99000,
  metal_rich_body: 31000,
  high_metal_content_world: 14000,
  rocky_body: 500,
  rocky_ice_body: 500,
  icy_body: 500,
  rocky_ice_world: 500,
  // Gas giants
  gas_giant_with_water_based_life: 900,
  gas_giant_with_ammonia_based_life: 900,
  class_i_gas_giant: 3800,
  class_ii_gas_giant: 28000,
  class_iii_gas_giant: 900,
  class_iv_gas_giant: 900,
  class_v_gas_giant: 900,
  helium_rich_gas_giant: 900,
  helium_gas_giant: 900,
  water_giant: 900,
  water_giant_with_life: 900,
};

/** Case-insensitive lookup via normalization: subType (journal or canonical) → canonical key → base value. */
export function getBaseScanValue(subType: string): number {
  if (!subType) return 500;
  const asPlanet = normalizePlanetClass(subType);
  const fromPlanet = asPlanet ? BASE_SCAN_VALUES[asPlanet] : undefined;
  if (fromPlanet !== undefined) return fromPlanet;
  const asStar = normalizeStarType(subType);
  const fromStar = asStar ? BASE_SCAN_VALUES[asStar] : undefined;
  if (fromStar !== undefined) return fromStar;
  return 500;
}

/** Terraformable additive bonus (canonical planet class keys). */
export const TERRAFORMABLE_BONUS: Record<string, number> = {
  high_metal_content_world: 149000,
  metal_rich_body: 0,
  rocky_body: 128500,
  water_world: 169000,
};

/** Lookup terraform bonus via normalization: subType → canonical planet class (normalization.ts). */
export function getTerraformBonus(subType: string): number | undefined {
  if (!subType) return undefined;
  const canonical = normalizePlanetClass(subType);
  return canonical ? TERRAFORMABLE_BONUS[canonical] : undefined;
}

/** First Discovered: +50% of base FSS value (1.5x) */
export const FIRST_DISCOVERY_MULTIPLIER = 1.5;
/** DSS mapping: ~3.33x base FSS value */
export const DSS_MAPPING_MULTIPLIER = 3.33;
/** First Mapped: +50% on DSS value (~1.5x on mapping) */
export const FIRST_MAPPED_MULTIPLIER = 1.5;
/** Efficiency bonus: +10% when mapping with minimum probes */
export const EFFICIENCY_BONUS_MULTIPLIER = 1.1;

/** Per-body-type reference values (FSS/FSS+FD/FSS+DSS/FSS+FD+DSS) and optional median mass for display/reference. */
export interface ScanReferenceValues {
  fss: number;
  fssFd: number;
  fssDss: number;
  fssFdDss: number;
  medianMass?: number;
}

/** Reference values (lowest from doc); keyed by canonical planet class. */
export const BODY_SCAN_REFERENCE_VALUES: Record<string, ScanReferenceValues> = {
  ammonia_world: { fss: 143000, fssFd: 214500, fssDss: 570000, fssFdDss: 855000, medianMass: 0.43914 },
  earth_like_world: { fss: 270000, fssFd: 405000, fssDss: 1100000, fssFdDss: 1650000, medianMass: 0.498039 },
  water_world: { fss: 99000, fssFd: 148500, fssDss: 396000, fssFdDss: 594000, medianMass: 0.780638 },
  high_metal_content_world: { fss: 14000, fssFd: 21000, fssDss: 56000, fssFdDss: 84000, medianMass: 0.344919 },
  icy_body: { fss: 500, fssFd: 750, fssDss: 1500, fssFdDss: 2250, medianMass: 0.01854 },
  metal_rich_body: { fss: 31000, fssFd: 46500, fssDss: 124000, fssFdDss: 186000, medianMass: 0.323933 },
  rocky_body: { fss: 500, fssFd: 750, fssDss: 1500, fssFdDss: 2250, medianMass: 0.003359 },
  rocky_ice_body: { fss: 500, fssFd: 750, fssDss: 1500, fssFdDss: 2250, medianMass: 0.180686 },
  class_i_gas_giant: { fss: 3800, fssFd: 5700, fssDss: 15200, fssFdDss: 22800, medianMass: 69.551636 },
  class_ii_gas_giant: { fss: 28000, fssFd: 42000, fssDss: 112000, fssFdDss: 168000, medianMass: 476.240875 },
  class_iii_gas_giant: { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 1148.921509 },
  class_iv_gas_giant: { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 2615.635376 },
  class_v_gas_giant: { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 925.575806 },
  gas_giant_with_ammonia_based_life: { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 170.455071 },
  gas_giant_with_water_based_life: { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 477.001832 },
  helium_rich_gas_giant: { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 550.141846 },
  water_giant: { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 47.163769 },
};

export const TERRAFORMABLE_SCAN_REFERENCE_VALUES: Record<string, ScanReferenceValues> = {
  water_world: { fss: 268000, fssFd: 402000, fssDss: 1070000, fssFdDss: 1605000, medianMass: 0.453011 },
  high_metal_content_world: { fss: 163000, fssFd: 244500, fssDss: 650000, fssFdDss: 975000, medianMass: 0.466929 },
  rocky_body: { fss: 129000, fssFd: 193500, fssDss: 516000, fssFdDss: 774000, medianMass: 0.142312 },
};

/** Inputs for scan value calculation (body type, discovery/mapping flags). */
export interface ScanValueParams {
  subType: string;
  terraformable: boolean;
  wasDiscovered: boolean;
  wasMapped: boolean;
  isMapped: boolean;
}

/** Result of calculateScanValue: base, terraform bonus, multipliers, and final CR value. */
export interface ScanValueResult {
  baseValue: number;
  terraformBonus: number;
  subtotal: number;
  discoveryMultiplier: number;
  mappingMultiplier: number;
  finalValue: number;
}

/** Computes body scan value from base + terraform bonus and discovery/mapping multipliers; used when persisting scan values. */
export function calculateScanValue(params: ScanValueParams): ScanValueResult {
  const { subType, terraformable, wasDiscovered, wasMapped, isMapped } = params;

  const baseValue = getBaseScanValue(subType);
  const bonusVal = getTerraformBonus(subType);
  const terraformBonus = terraformable && bonusVal !== undefined ? bonusVal : 0;

  const subtotal = baseValue + terraformBonus;

  // First Discovered: +50% (1.5x); otherwise 1.0
  const discoveryMultiplier = wasDiscovered ? 1.0 : FIRST_DISCOVERY_MULTIPLIER;

  // DSS: ~3.33x; First Mapped: +50% on DSS (~4.995x combined)
  const mappingMultiplier = isMapped
    ? (wasMapped ? DSS_MAPPING_MULTIPLIER : DSS_MAPPING_MULTIPLIER * FIRST_MAPPED_MULTIPLIER)
    : 1.0;

  const finalValue = Math.round(subtotal * discoveryMultiplier * mappingMultiplier);

  return {
    baseValue,
    terraformBonus,
    subtotal,
    discoveryMultiplier,
    mappingMultiplier,
    finalValue,
  };
}

/** Body types that have no scan value (belts, rings). */
export const NO_SCAN_VALUE_BODY_TYPES = ['Belt', 'Ring'] as const;

export interface EstimateValueParams {
  subType: string;
  terraformable: boolean;
  bodyType: string;
}

/**
 * Estimated FSS-only value (lowest): base + terraform bonus, with first-discovery multiplier (1.5).
 * Used for "Est. FSS Value". Returns 0 for Belt and Ring.
 */
export function estimateFssValueForBody(params: EstimateValueParams): number {
  const { subType, terraformable, bodyType } = params;
  if (NO_SCAN_VALUE_BODY_TYPES.includes(bodyType as 'Belt' | 'Ring')) return 0;
  const baseValue = getBaseScanValue(subType);
  const bonusVal = getTerraformBonus(subType);
  const terraformBonus = terraformable && bonusVal !== undefined ? bonusVal : 0;
  const subtotal = baseValue + terraformBonus;
  return Math.round(subtotal * FIRST_DISCOVERY_MULTIPLIER);
}

/**
 * Estimated max value if fully FSS + DSS mapped with first discovery + first mapped.
 * Stars cannot be mapped, so for Star this equals FSS estimate. Returns 0 for Belt and Ring.
 */
export function estimateDssValueForBody(params: EstimateValueParams): number {
  const { subType, terraformable, bodyType } = params;
  if (NO_SCAN_VALUE_BODY_TYPES.includes(bodyType as 'Belt' | 'Ring')) return 0;
  const baseValue = getBaseScanValue(subType);
  const bonusVal = getTerraformBonus(subType);
  const terraformBonus = terraformable && bonusVal !== undefined ? bonusVal : 0;
  const subtotal = baseValue + terraformBonus;
  if (bodyType === 'Star') {
    return Math.round(subtotal * FIRST_DISCOVERY_MULTIPLIER);
  }
  const mappingMultiplier = DSS_MAPPING_MULTIPLIER * FIRST_MAPPED_MULTIPLIER;
  return Math.round(subtotal * FIRST_DISCOVERY_MULTIPLIER * mappingMultiplier);
}

/** Canonical planet classes that are always high-value (ELW, ammonia, water world); used for route history highlights. */
export const HIGH_VALUE_BODY_TYPES = [
  'earth_like_world',
  'ammonia_world',
  'water_world',
];

/** Canonical planet classes that are high-value only when terraformable; used for route history highlights. */
export const HIGH_VALUE_IF_TERRAFORMABLE = [
  'high_metal_content_world',
  'rocky_body',
  'water_world',
];

/** One line in the scan value formula breakdown. */
export interface ScanValueBreakdownLine {
  label: string;
  description: string;
  value: number;
}

/** Result of getScanValueBreakdown: body type label, formula components, and total. */
export interface ScanValueBreakdown {
  bodyTypeLabel: string;
  formulaSummary: string;
  lines: ScanValueBreakdownLine[];
  total: number;
}

/**
 * Returns the scan value formula breakdown for display in the body details pane.
 * Shows FSS, FD, DSS, FM, and DSS Efficiency with credit values.
 * Stars only show FSS + FD (no mapping). Belts/Rings return null.
 */
export function getScanValueBreakdown(
  subType: string,
  terraformable: boolean,
  bodyType: string,
  bodyTypeLabel: string
): ScanValueBreakdown | null {
  if (NO_SCAN_VALUE_BODY_TYPES.includes(bodyType as 'Belt' | 'Ring')) {
    return null;
  }

  const baseValue = getBaseScanValue(subType);
  const bonusVal = getTerraformBonus(subType);
  const terraformBonus = terraformable && bonusVal !== undefined ? bonusVal : 0;
  const fss = baseValue + terraformBonus;

  const lines: ScanValueBreakdownLine[] = [];
  let total = 0;

  // FSS: base value
  lines.push({
    label: 'FSS',
    description: 'Base scan value',
    value: Math.round(fss),
  });
  total += Math.round(fss);

  // FD: +50% FSS bonus
  const fdValue = Math.round(fss * 0.5);
  lines.push({
    label: 'FD',
    description: '+50% FSS bonus',
    value: fdValue,
  });
  total += fdValue;

  if (bodyType !== 'Star') {
    // DSS: ~3.33x FSS value
    const dssValue = Math.round(fss * DSS_MAPPING_MULTIPLIER);
    lines.push({
      label: 'DSS',
      description: `~${DSS_MAPPING_MULTIPLIER}x FSS value`,
      value: dssValue,
    });
    total += dssValue;

    // FM: +50% DSS bonus
    const fmValue = Math.round(dssValue * 0.5);
    lines.push({
      label: 'FM',
      description: '+50% DSS bonus',
      value: fmValue,
    });
    total += fmValue;

    // DSS Efficiency: +10% DSS bonus
    const dsseValue = Math.round(dssValue * 0.1);
    lines.push({
      label: 'DSS Efficiency',
      description: '+10% DSS bonus',
      value: dsseValue,
    });
    total += dsseValue;
  }

  const formulaParts = lines.map((l) => l.label);
  const formulaSummary = `${bodyTypeLabel} - ${formulaParts.join(' + ')}`;

  return {
    bodyTypeLabel,
    formulaSummary,
    lines,
    total,
  };
}

/**
 * Returns the scan value formula breakdown aggregated across multiple bodies (e.g. system total).
 * Same structure as getScanValueBreakdown but with summed FSS, FD, DSS, FM, DSS Efficiency values.
 */
export function getAggregatedScanValueBreakdown(
  bodies: Array<{ subType: string; terraformable: boolean; bodyType: string }>
): ScanValueBreakdown {
  const labelOrder = ['FSS', 'FD', 'DSS', 'FM', 'DSS Efficiency'];
  const sums: Record<string, number> = { FSS: 0, FD: 0, DSS: 0, FM: 0, 'DSS Efficiency': 0 };
  const descriptions: Record<string, string> = {
    FSS: 'Base scan value',
    FD: '+50% FSS bonus',
    DSS: `~${DSS_MAPPING_MULTIPLIER}x FSS value`,
    FM: '+50% DSS bonus',
    'DSS Efficiency': '+10% DSS bonus',
  };

  for (const b of bodies) {
    const breakdown = getScanValueBreakdown(b.subType, b.terraformable, b.bodyType, '');
    if (!breakdown) continue;
    for (const line of breakdown.lines) {
      sums[line.label] = (sums[line.label] ?? 0) + line.value;
    }
  }

  const lines: ScanValueBreakdownLine[] = labelOrder
    .filter((label) => (sums[label] ?? 0) > 0)
    .map((label) => ({
      label,
      description: descriptions[label] ?? '',
      value: sums[label] ?? 0,
    }));

  const total = lines.reduce((acc, l) => acc + l.value, 0);
  const formulaSummary = lines.length > 0 ? `System total - ${lines.map((l) => l.label).join(' + ')}` : 'System total';

  return {
    bodyTypeLabel: 'System total',
    formulaSummary,
    lines,
    total,
  };
}
