/**
 * Planet Highlight: matches bodies against user-defined criteria by planet type.
 * Table: Body Type, Track, Atmosphere, Landable, Terraformable, Geological, Biological.
 * Cell types: required (always on), default (checkbox default checked), optional (checkbox), na (not applicable).
 */
import type { CelestialBody } from '@shared/types';
import { normalizePlanetClass } from '@shared/normalization';

export type PlanetHighlightCharacteristic =
  | 'track'
  | 'atmosphere'
  | 'landable'
  | 'terraformable'
  | 'geological'
  | 'biological';

/** Cell config: required=always on, default=checkbox default true, optional=checkbox default false, na=not applicable */
export type CellConfig = 'required' | 'default' | 'optional' | 'na';

export interface PlanetHighlightRowConfig {
  key: string;
  label: string;
  track: 'default' | 'optional';
  atmosphere: CellConfig;
  landable: CellConfig;
  terraformable: CellConfig;
  geological: CellConfig;
  biological: CellConfig;
}

/** Stored row values. Only store what user has changed; use config for defaults. */
export interface PlanetHighlightRow {
  track?: boolean;
  atmosphere?: boolean | null;
  landable?: boolean | null;
  terraformable?: boolean | null;
  geological?: boolean | null;
  biological?: boolean | null;
}

export type PlanetHighlightCriteria = Record<string, PlanetHighlightRow>;

/** Row configs per user spec. Order matches table. */
export const PLANET_HIGHLIGHT_ROW_CONFIGS: PlanetHighlightRowConfig[] = [
  { key: 'earth_like_world', label: 'Earth-Like World', track: 'default', atmosphere: 'required', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'water_world', label: 'Water World', track: 'default', atmosphere: 'required', landable: 'na', terraformable: 'default', geological: 'na', biological: 'na' },
  { key: 'high_metal_content_world', label: 'High Metal Content World', track: 'default', atmosphere: 'optional', landable: 'optional', terraformable: 'default', geological: 'optional', biological: 'optional' },
  { key: 'icy_body', label: 'Icy Body', track: 'optional', atmosphere: 'optional', landable: 'optional', terraformable: 'optional', geological: 'optional', biological: 'optional' },
  { key: 'rocky_body', label: 'Rocky Body', track: 'default', atmosphere: 'optional', landable: 'optional', terraformable: 'default', geological: 'optional', biological: 'optional' },
  { key: 'rocky_ice_world', label: 'Rocky Ice World', track: 'optional', atmosphere: 'optional', landable: 'optional', terraformable: 'optional', geological: 'optional', biological: 'optional' },
  { key: 'metal_rich_body', label: 'Metal-Rich Body', track: 'optional', atmosphere: 'optional', landable: 'optional', terraformable: 'optional', geological: 'optional', biological: 'optional' },
  { key: 'ammonia_world', label: 'Ammonia World', track: 'default', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'class_i_gas_giant', label: 'Class I Gas Giant', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'class_ii_gas_giant', label: 'Class II Gas Giant', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'class_iii_gas_giant', label: 'Class III Gas Giant', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'class_iv_gas_giant', label: 'Class IV Gas Giant', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'class_v_gas_giant', label: 'Class V Gas Giant', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'helium_rich_gas_giant', label: 'Class Helium-Rich Gas Giant', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'helium_gas_giant', label: 'Class Helium Gas Giant', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'water_giant', label: 'Class Water Giant', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'gas_giant_with_ammonia_based_life', label: 'Class Gas Giant with Ammonia-Based Life', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
  { key: 'gas_giant_with_water_based_life', label: 'Class Gas Giant with Water-Based Life', track: 'optional', atmosphere: 'na', landable: 'na', terraformable: 'na', geological: 'na', biological: 'na' },
];

const CHAR_KEYS: Exclude<PlanetHighlightCharacteristic, 'track'>[] = [
  'atmosphere',
  'landable',
  'terraformable',
  'geological',
  'biological',
];

function bodyHasCharacteristic(
  body: CelestialBody,
  char: Exclude<PlanetHighlightCharacteristic, 'track'>
): boolean {
  switch (char) {
    case 'atmosphere':
      return !!(
        body.atmosphereType &&
        body.atmosphereType !== 'None' &&
        body.atmosphereType !== 'No atmosphere'
      );
    case 'landable':
      return body.landable ?? false;
    case 'terraformable':
      return body.terraformable ?? false;
    case 'geological':
      return (body.geoSignals ?? 0) > 0;
    case 'biological':
      return (body.bioSignals ?? 0) > 0;
    default:
      return false;
  }
}

/** Get effective value for a characteristic from config + stored. */
function getEffectiveCharValue(
  config: PlanetHighlightRowConfig,
  stored: PlanetHighlightRow | undefined,
  char: Exclude<PlanetHighlightCharacteristic, 'track'>
): boolean | null {
  const cellConfig = config[char];
  if (cellConfig === 'na') return null;

  const raw = stored != null && typeof stored === 'object' ? stored[char] : undefined;
  const storedVal = typeof raw === 'boolean' ? raw : raw === null ? null : undefined;
  if (cellConfig === 'required') return true;
  if (cellConfig === 'default') return storedVal ?? true;
  if (cellConfig === 'optional') return storedVal ?? false;
  return null;
}

/** Get effective track value. */
function getEffectiveTrack(config: PlanetHighlightRowConfig, stored: PlanetHighlightRow | undefined): boolean {
  const raw = stored != null && typeof stored === 'object' ? stored.track : undefined;
  const storedVal = typeof raw === 'boolean' ? raw : undefined;
  if (config.track === 'default') return storedVal ?? true;
  return storedVal ?? false;
}

/** Get the criteria key for a body (canonical planet class). */
function getBodyCriteriaKey(body: CelestialBody): string {
  if (body.bodyType === 'Star') return 'Star';
  if (body.bodyType === 'Belt') return 'Belt';
  if (body.bodyType === 'Ring') return 'Ring';
  return normalizePlanetClass(body.subType);
}

/**
 * Returns true if the body should be highlighted (gold background).
 * Body matches when: (1) its type is tracked, and (2) it has all required/checked characteristics.
 */
export function bodyMatchesPlanetHighlight(
  body: CelestialBody,
  criteria: PlanetHighlightCriteria
): boolean {
  if (!body || criteria == null || typeof criteria !== 'object') return false;

  const key = getBodyCriteriaKey(body);
  const config = PLANET_HIGHLIGHT_ROW_CONFIGS.find((c) => c.key === key);
  if (!config) return false;

  const stored = criteria[key];
  if (!getEffectiveTrack(config, stored)) return false;

  for (const char of CHAR_KEYS) {
    const effective = getEffectiveCharValue(config, stored, char);
    if (effective === null) continue; // na - don't filter
    if (effective && !bodyHasCharacteristic(body, char)) return false;
  }
  return true;
}

/** Get effective row for display and matching. */
export function getEffectiveRow(
  config: PlanetHighlightRowConfig,
  stored: PlanetHighlightRow | undefined
): {
  track: boolean;
  atmosphere: boolean | null;
  landable: boolean | null;
  terraformable: boolean | null;
  geological: boolean | null;
  biological: boolean | null;
} {
  return {
    track: getEffectiveTrack(config, stored),
    atmosphere: getEffectiveCharValue(config, stored, 'atmosphere'),
    landable: getEffectiveCharValue(config, stored, 'landable'),
    terraformable: getEffectiveCharValue(config, stored, 'terraformable'),
    geological: getEffectiveCharValue(config, stored, 'geological'),
    biological: getEffectiveCharValue(config, stored, 'biological'),
  };
}

/** Get cell config for a characteristic. */
export function getCellConfig(
  config: PlanetHighlightRowConfig,
  char: Exclude<PlanetHighlightCharacteristic, 'track'>
): CellConfig {
  return config[char];
}

/** Toggle track. Returns new criteria. */
export function toggleTrack(
  criteria: PlanetHighlightCriteria,
  typeKey: string,
  config: PlanetHighlightRowConfig,
  checked: boolean
): PlanetHighlightCriteria {
  const next = { ...criteria };
  const existing = next[typeKey] ?? {};
  next[typeKey] = { ...existing, track: checked };
  return next;
}

/** Toggle a characteristic. Returns new criteria. */
export function toggleCharacteristic(
  criteria: PlanetHighlightCriteria,
  typeKey: string,
  char: Exclude<PlanetHighlightCharacteristic, 'track'>,
  checked: boolean
): PlanetHighlightCriteria {
  const next = { ...criteria };
  const existing = next[typeKey] ?? {};
  next[typeKey] = { ...existing, [char]: checked };
  return next;
}
