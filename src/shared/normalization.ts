/**
 * Standardization of journal/EDSM strings to canonical keys (case-insensitive).
 * Canonical keys use snake_case for planet classes and species; lowercase codes for star types.
 * Use these when storing, comparing, or keying constants; use toDisplay*() for UI.
 */

// ─── Planet class (PlanetClass / subType for bodies) ─────────────────────────

/** Canonical planet class keys (snake_case). Use these in code and DB. */
export type CanonicalPlanetClass =
  | 'metal_rich_body'
  | 'high_metal_content_world'
  | 'rocky_body'
  | 'rocky_ice_body'
  | 'icy_body'
  | 'rocky_ice_world'
  | 'earth_like_world'
  | 'ammonia_world'
  | 'water_world'
  | 'water_giant'
  | 'water_giant_with_life'
  | 'gas_giant_with_water_based_life'
  | 'gas_giant_with_ammonia_based_life'
  | 'class_i_gas_giant'
  | 'class_ii_gas_giant'
  | 'class_iii_gas_giant'
  | 'class_iv_gas_giant'
  | 'class_v_gas_giant'
  | 'helium_rich_gas_giant'
  | 'helium_gas_giant';

/** Display form for UI (title case, one consistent form per type). */
export const PLANET_CLASS_DISPLAY: Record<CanonicalPlanetClass, string> = {
  metal_rich_body: 'Metal Rich Body',
  high_metal_content_world: 'High Metal Content World',
  rocky_body: 'Rocky Body',
  rocky_ice_body: 'Rocky Ice Body',
  icy_body: 'Icy Body',
  rocky_ice_world: 'Rocky Ice World',
  earth_like_world: 'Earth-Like World',
  ammonia_world: 'Ammonia World',
  water_world: 'Water World',
  water_giant: 'Water Giant',
  water_giant_with_life: 'Water Giant with Life',
  gas_giant_with_water_based_life: 'Gas Giant with Water-Based Life',
  gas_giant_with_ammonia_based_life: 'Gas Giant with Ammonia-Based Life',
  class_i_gas_giant: 'Class I Gas Giant',
  class_ii_gas_giant: 'Class II Gas Giant',
  class_iii_gas_giant: 'Class III Gas Giant',
  class_iv_gas_giant: 'Class IV Gas Giant',
  class_v_gas_giant: 'Class V Gas Giant',
  helium_rich_gas_giant: 'Helium Rich Gas Giant',
  helium_gas_giant: 'Helium Gas Giant',
};

/** Build lowercase → canonical map from display forms (one per type) plus journal alternates. */
const PLANET_CLASS_MAP = new Map<string, CanonicalPlanetClass>();

for (const [canonical, display] of Object.entries(PLANET_CLASS_DISPLAY)) {
  PLANET_CLASS_MAP.set(display.toLowerCase().trim(), canonical as CanonicalPlanetClass);
}

const PLANET_CLASS_ALTERNATES: Array<[string, CanonicalPlanetClass]> = [
  ['High Metal Content Body', 'high_metal_content_world'],
  ['Earthlike body', 'earth_like_world'],
  ['Earth-like world', 'earth_like_world'],
  ['Rocky ice body', 'rocky_ice_body'],
  ['Rocky Ice World', 'rocky_ice_world'],
];
for (const [variant, canonical] of PLANET_CLASS_ALTERNATES) {
  const key = variant.toLowerCase().trim();
  if (!PLANET_CLASS_MAP.has(key)) {
    PLANET_CLASS_MAP.set(key, canonical);
  }
}
// DB-stored canonical subType (e.g. rocky_body) resolves in one lookup
for (const c of Object.keys(PLANET_CLASS_DISPLAY)) {
  if (!PLANET_CLASS_MAP.has(c)) {
    PLANET_CLASS_MAP.set(c, c as CanonicalPlanetClass);
  }
}

/**
 * Normalize journal/EDSM planet class or body subType to canonical key.
 * Returns canonical snake_case key, or the input lowercased and trimmed with spaces → underscores if unknown.
 * Strips "Sudarsky " prefix (EDSM uses "Sudarsky Class IV Gas Giant" etc.) so we map to Class I–V Gas Giant.
 */
export function normalizePlanetClass(input: string | null | undefined): string {
  if (input == null || input === '') {
    return '';
  }
  const trimmed = input
    .trim()
    .replace(/^sudarsky\s+/i, '')
    .replace(/^sudarsky_/i, '');
  const key = trimmed.toLowerCase();
  const canonical = PLANET_CLASS_MAP.get(key);
  if (canonical !== undefined) {
    return canonical;
  }
  // Fuzzy: normalize common patterns so unknown journal variants still match
  const normalized = key.replace(/\s+/g, '_').replace(/-/g, '_');
  const fuzzy = PLANET_CLASS_MAP.get(normalized);
  if (fuzzy !== undefined) {
    return fuzzy;
  }
  // Already canonical-looking (snake_case)?
  const asIs = Array.from(PLANET_CLASS_MAP.values()).find((c) => c === normalized);
  if (asIs !== undefined) {
    return asIs;
  }
  return normalized || key;
}

/**
 * Return display string for UI from canonical planet class key.
 * If input is already display-style or unknown, returns it as-is (trimmed).
 */
export function planetClassToDisplay(canonicalOrRaw: string | null | undefined): string {
  if (canonicalOrRaw == null || canonicalOrRaw === '') {
    return '';
  }
  const s = canonicalOrRaw.trim();
  const canonical = normalizePlanetClass(s);
  if (canonical === '') {
    return s;
  }
  const display = PLANET_CLASS_DISPLAY[canonical as CanonicalPlanetClass];
  if (display !== undefined) {
    return display;
  }
  return s;
}

/** All canonical planet classes (for iteration and validation). */
export const CANONICAL_PLANET_CLASSES: readonly CanonicalPlanetClass[] = [
  'metal_rich_body',
  'high_metal_content_world',
  'rocky_body',
  'rocky_ice_body',
  'icy_body',
  'rocky_ice_world',
  'earth_like_world',
  'ammonia_world',
  'water_world',
  'water_giant',
  'water_giant_with_life',
  'gas_giant_with_water_based_life',
  'gas_giant_with_ammonia_based_life',
  'class_i_gas_giant',
  'class_ii_gas_giant',
  'class_iii_gas_giant',
  'class_iv_gas_giant',
  'class_v_gas_giant',
  'helium_rich_gas_giant',
  'helium_gas_giant',
] as const;

// ─── Star type (StarType / subType for stars) ─────────────────────────────────

/** Canonical star type keys: spectral code (lowercase) or special name. */
export type CanonicalStarType =
  | 'o'
  | 'b'
  | 'a'
  | 'f'
  | 'g'
  | 'k'
  | 'm'
  | 'l'
  | 't'
  | 'y'
  | 'tts'
  | 'aebe'
  | 'w'
  | 'wn'
  | 'wnc'
  | 'wc'
  | 'wo'
  | 'cs'
  | 'c'
  | 'cn'
  | 'cj'
  | 'ch'
  | 'chd'
  | 'ms'
  | 's'
  | 'd'
  | 'da'
  | 'dab'
  | 'dao'
  | 'dav'
  | 'daz'
  | 'db'
  | 'dbv'
  | 'dbz'
  | 'dc'
  | 'dcv'
  | 'do'
  | 'dov'
  | 'dq'
  | 'dx'
  | 'n'
  | 'h'
  | 'supermassive_black_hole';

/** Display form for star type (typical journal style). */
export const STAR_TYPE_DISPLAY: Partial<Record<CanonicalStarType, string>> = {
  o: 'O-Class',
  b: 'B-Class',
  a: 'A-Class',
  f: 'F-Class',
  g: 'G-Class',
  k: 'K-Class',
  m: 'M-Class (Red dwarf)',
  l: 'L-Class (Brown dwarf)',
  t: 'T-Class (Brown dwarf)',
  y: 'Y-Class (Brown dwarf)',
  tts: 'T Tauri Star',
  aebe: 'Herbig Ae/Be',
  w: 'Wolf-Rayet',
  wn: 'Wolf-Rayet (Nitrogen)',
  wnc: 'Wolf-Rayet (Nitrogen/Carbon))',
  wc: 'Wolf-Rayet (Carbon)',
  wo: 'Wolf-Rayet (Oxygen)',
  cs: 'Carbon Star',
  c: 'Carbon Star',
  cn: 'Carbon (Nitrogen)',
  cj: 'Carbon (J-type)',
  ch: 'Carbon (Hydrogen',
  chd: 'Carbon (Hydrogen/Dwarf)',
  ms: 'M-S Transition Star',
  s: 'S-Type Star',
  d: 'White Dwarf',
  da: 'White Dwarf (Hydrogen)',
  dab: 'White Dwarf (Hydrogen/Helium)',
  dao: 'White Dwarf (Hydrogen/Oxygen)',
  dav: 'White Dwarf (Pulsating)',
  daz: 'White Dwarf (Metal-polluted)',
  db: 'White Dwarf (Helium)',
  dbv: 'White Dwarf (Helium Variable)',
  dbz: 'White Dwarf (Helium/Metal)',
  dc: 'White Dwarf (Continuous Spectrum)',
  dcv: 'White Dwarf (Cool Variable)',
  do: 'White Dwarf (Hot Helium)',
  dov: 'White Dwarf (Hot Variable)',
  dq: 'White Dwarf (Carbon)',
  dx: 'White Dwarf (Unclassified)',
  n: 'Neutron Star',
  h: 'Black Hole',
  supermassive_black_hole: 'Supermassive Black Hole',
};

/** Journal/EDSM star type variants → canonical. */
const STAR_TYPE_VARIANTS: Array<[string, CanonicalStarType]> = [
  ['Star', 'g'], // generic fallback
  ['O (Blue-White) Star', 'o'],
  ['B (Blue-White) Star', 'b'],
  ['A (Blue-White) Star', 'a'],
  ['F (White) Star', 'f'],
  ['G (White-Yellow) Star', 'g'],
  ['K (Yellow-Orange) Star', 'k'],
  ['M (Red dwarf) Star', 'm'],
  ['L (Brown dwarf) Star', 'l'],
  ['T (Brown dwarf) Star', 't'],
  ['Y (Brown dwarf) Star', 'y'],
  ['T Tauri Star', 'tts'],
  ['Herbig Ae/Be Star', 'aebe'],
  ['Wolf-Rayet Star', 'w'],
  ['Wolf-Rayet WN Star', 'wn'],
  ['Wolf-Rayet WNC Star', 'wnc'],
  ['Wolf-Rayet WC Star', 'wc'],
  ['Wolf-Rayet WO Star', 'wo'],
  ['Carbon Star', 'cs'],
  ['S-Type Star', 's'],
  ['White Dwarf', 'd'],
  ['Neutron Star', 'n'],
  ['Black Hole', 'h'],
  ['Supermassive Black Hole', 'supermassive_black_hole'],
];

const STAR_TYPE_MAP = new Map<string, CanonicalStarType>();
for (const [variant, canonical] of STAR_TYPE_VARIANTS) {
  STAR_TYPE_MAP.set(variant.toLowerCase().trim(), canonical);
}
// Single-letter + common patterns
for (const code of ['o', 'b', 'a', 'f', 'g', 'k', 'm', 'l', 't', 'y', 'n', 'h', 'd', 'w', 's', 'c'] as const) {
  if (!STAR_TYPE_MAP.has(code)) {
    STAR_TYPE_MAP.set(code, code as CanonicalStarType);
  }
}

/**
 * Normalize journal/EDSM star type to canonical key.
 * Extracts spectral letter from strings like "K (Yellow-Orange) Star" or "M (Red dwarf) Star".
 */
export function normalizeStarType(input: string | null | undefined): string {
  if (input == null || input === '') {
    return '';
  }
  const key = input.toLowerCase().trim();
  const exact = STAR_TYPE_MAP.get(key);
  if (exact !== undefined) {
    return exact;
  }
  // Match "X (..." or "X-Type" or "X Class"
  const letterMatch = key.match(/\b([obafgkmltys])\b/);
  if (letterMatch && letterMatch[1]) {
    return letterMatch[1];
  }
  if (/neutron|n\s*class/i.test(key)) {
    return 'n';
  }
  if (/white\s*dwarf|d\s*class|d[a-z]*/i.test(key)) {
    const dMatch = key.match(/\bd([a-z]*)/i);
    if (dMatch && dMatch[1]) {
      const sub = dMatch[1].toLowerCase();
      if (STAR_TYPE_MAP.has('d' + sub)) {
        return 'd' + sub as CanonicalStarType;
      }
      return 'd';
    }
    return 'd';
  }
  if (/wolf-?rayet|w\s*class/i.test(key)) {
    if (/wnc/i.test(key)) return 'wnc';
    if (/wn\b/i.test(key)) return 'wn';
    if (/wc/i.test(key)) return 'wc';
    if (/wo/i.test(key)) return 'wo';
    return 'w';
  }
  if (/t\s*tauri|tts/i.test(key)) return 'tts';
  if (/herbig|ae\/be/i.test(key)) return 'aebe';
  if (/carbon\s*star|cs/i.test(key)) return 'cs';
  if (/s-?type/i.test(key)) return 's';
  if (/black\s*hole|supermassive/i.test(key)) {
    return /supermassive/i.test(key) ? 'supermassive_black_hole' : 'h';
  }
  return key.replace(/\s+/g, '_');
}

/**
 * Return display string for star type from canonical key.
 */
export function starTypeToDisplay(canonicalOrRaw: string | null | undefined): string {
  if (canonicalOrRaw == null || canonicalOrRaw === '') {
    return '';
  }
  const s = canonicalOrRaw.trim();
  const canonical = normalizeStarType(s);
  if (canonical === '') {
    return s;
  }
  const display = STAR_TYPE_DISPLAY[canonical as CanonicalStarType];
  if (display !== undefined) {
    return display;
  }
  return s;
}

// ─── Body type (Star, Planet, Moon, Belt, Ring) ────────────────────────────────

/** Body type is already standardized in journal; normalize casing only. */
export function normalizeBodyType(input: string | null | undefined): 'Star' | 'Planet' | 'Moon' | 'Belt' | 'Ring' | string {
  if (input == null || input === '') {
    return 'Planet';
  }
  const u = input.trim();
  const lower = u.toLowerCase();
  if (lower === 'star') return 'Star';
  if (lower === 'planet') return 'Planet';
  if (lower === 'moon') return 'Moon';
  if (lower === 'belt') return 'Belt';
  if (lower === 'ring') return 'Ring';
  return u;
}

// ─── Exobiology species name ─────────────────────────────────────────────────

/**
 * Normalize species name (e.g. "Aleoida Arcus") to canonical snake_case "aleoida_arcus".
 * Used for lookup in BIOLOGICAL_VALUES and codex.
 */
export function normalizeSpeciesName(input: string | null | undefined): string {
  if (input == null || input === '') {
    return '';
  }
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

/**
 * Convert canonical species key to display form (Title Case per word).
 */
export function speciesToDisplay(canonicalOrRaw: string | null | undefined): string {
  if (canonicalOrRaw == null || canonicalOrRaw === '') {
    return '';
  }
  const s = canonicalOrRaw.trim();
  if (s.includes(' ')) {
    return s; // already display form
  }
  return s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
