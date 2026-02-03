/**
 * Exobiology genus/species estimator.
 * Data source: documentation/ED_data/Exobiological_Species via exobiologySpeciesData.
 * After FSS, when we know a body has biological signals but before DSS (no Genuses),
 * we can estimate possible genera and species from body + system parameters.
 */

import {
  buildEstimatorGenusRules,
  type EstimatorGenusRule,
  type EstimatorSpeciesRule,
} from './exobiologySpeciesData';

// Normalize atmosphere/journal strings to canonical form for rule matching.
// ─── Normalization ───────────────────────────────────────────────────────────

function normalizeAtmosphere(s: string | null | undefined): string {
  if (!s || s === 'None' || /no\s+atmosphere/i.test(s)) return 'None';
  const n = s.trim().toLowerCase();
  const map: Record<string, string> = {
    'carbon dioxide': 'Carbon Dioxide', 'carbondioxide': 'CarbonDioxide',
    'ammonia': 'Ammonia', 'water': 'Water', 'oxygen': 'Oxygen', 'nitrogen': 'Nitrogen',
    'methane': 'Methane', 'argon': 'Argon', 'helium': 'Helium', 'neon': 'Neon',
    'sulfur dioxide': 'Sulfur Dioxide', 'sulphur dioxide': 'Sulfur Dioxide',
    'argon-rich': 'Argon-Rich',
  };
  return map[n] || s;
}

function normalizePlanetType(s: string | undefined): string {
  if (!s) return '';
  const n = s.toLowerCase();
  if (/rocky\s*(body|ice|ice body)?/i.test(n) && !/rocky\s*ice/i.test(n)) return 'Rocky Body';
  if (/rocky\s*ice|rocky\s*ice\s*body/i.test(n)) return 'Rocky Ice Body';
  if (/high\s*metal|hmc/i.test(n)) return 'High Metal Content Body';
  if (/metal\s*rich|metal-rich|metalrich/i.test(n)) return 'Metal Rich Body';
  if (/icy\s*body|icy\s+body/i.test(n)) return 'Icy Body';
  if (/earth-like|earthlike|elw/i.test(n)) return 'Earth-Like World';
  if (/ammonia\s*world/i.test(n)) return 'Ammonia World';
  if (/water\s*giant/i.test(n)) return 'Water Giant';
  if (/gas\s*giant.*water|water.*gas\s*giant/i.test(n)) return 'Gas Giant with Water-Based Life';
  if (/gas\s*giant.*ammonia|ammonia.*gas\s*giant/i.test(n)) return 'Gas Giant with Ammonia-Based Life';
  return s;
}

/** Extract star class letter from subType, e.g. "F", "K (Orange)", "M Red dwarf", "Neutron". */
export function parseStarClass(subType: string | null | undefined): string {
  if (!subType) return '';
  const s = subType.toUpperCase();
  const m = s.match(/\b([OBAFGKMLTY])\b/);
  if (m && m[1] !== undefined) return m[1];
  if (/NEUTRON|N\s*CLASS/i.test(s)) return 'N';
  if (/WHITE\s*DWARF|D\s*CLASS|D[A-Z]*/i.test(s)) return 'D';
  if (/WOLF-?RAYET|W\s*CLASS/i.test(s)) return 'W';
  if (/T\s*TAURI|TTS/i.test(s)) return 'TTS';
  if (/HERBIG|AE\/BE/i.test(s)) return 'Ae/Be';
  return '';
}

// Parse temperature specs (e.g. "175K - 180K", "> 165K") and match body surface temp.
// ─── Temperature range parsing ───────────────────────────────────────────────

type TempSpec = { anyTemperature?: boolean; min?: number; max?: number; greaterThan?: number; lessThan?: number };

function parseTempSpec(s: string): TempSpec | null {
  if (!s || /any/i.test(s)) return { anyTemperature: true };
  const g = s.match(/>\s*(\d+)\s*K/i);
  if (g && g[1] !== undefined) return { greaterThan: parseInt(g[1], 10) };
  const l = s.match(/<\s*(\d+)\s*K/i);
  if (l && l[1] !== undefined) return { lessThan: parseInt(l[1], 10) };
  const r = s.match(/(\d+)\s*K?\s*[-–]\s*(\d+)\s*K?/i);
  if (r && r[1] !== undefined && r[2] !== undefined) return { min: parseInt(r[1], 10), max: parseInt(r[2], 10) };
  return null;
}

function tempMatches(tempK: number | null, spec: TempSpec | null): boolean {
  if (tempK == null || !Number.isFinite(tempK)) return false;
  if (!spec) return true;
  if (spec.anyTemperature) return true;
  if (spec.greaterThan != null && tempK > spec.greaterThan) return true;
  if (spec.lessThan != null && tempK < spec.lessThan) return true;
  if (spec.min != null && spec.max != null && tempK >= spec.min && tempK <= spec.max) return true;
  return false;
}

// ─── Atmosphere matching (species allows one or more) ─────────────────────────

function atmosphereMatches(bodyAtmo: string, spec: string): boolean {
  const b = normalizeAtmosphere(bodyAtmo).toLowerCase();
  if (/any/i.test(spec)) return true;
  if (/none/i.test(spec)) return b === 'none';
  const list = spec.split(',').map((x) => x.trim().toLowerCase());
  return list.some((a) => b === a || b.includes(a));
}

// ─── Planet type matching ────────────────────────────────────────────────────

function planetTypeMatches(bodyType: string, spec: string): boolean {
  const b = normalizePlanetType(bodyType).toLowerCase();
  const list = spec.split(',').map((x) => {
    let p = x.trim().toLowerCase().replace(/-/g, ' ');
    if (p === 'hmc') p = 'high metal content';
    return p;
  });
  return list.some((p) => b.includes(p) || p.includes(b));
}

// ─── Volcanism matching ──────────────────────────────────────────────────────

function volcanismMatches(bodyVolc: string | null | undefined, spec: string): boolean {
  const hasAny = /any/i.test(spec);
  if (hasAny) return true;
  const list = spec.split(',').map((x) => x.trim().toLowerCase());
  const bodyHasNone = bodyVolc == null || bodyVolc === '' || /none/i.test(bodyVolc ?? '');
  if (bodyHasNone) return list.some((v) => /^none$/i.test(v));
  const b = bodyVolc!.toLowerCase();
  return list.some((v) => !/^none$/i.test(v) && b.includes(v));
}

// ─── Star class matching (species: "O", "B IV, B V", "A-Class (luminosity V+)" - we only have letter) ───────────────────

function starClassMatches(letter: string, spec: string): boolean {
  if (!letter) return false;
  const up = letter.toUpperCase();
  if (spec.includes(up)) return true;
  if (/O\s*class/i.test(spec) && up === 'O') return true;
  if (/B\s*class/i.test(spec) && up === 'B') return true;
  if (/A\s*class/i.test(spec) && up === 'A') return true;
  if (/F\s*class/i.test(spec) && up === 'F') return true;
  if (/G\s*class/i.test(spec) && up === 'G') return true;
  if (/K\s*class/i.test(spec) && up === 'K') return true;
  if (/M\s*class/i.test(spec) && up === 'M') return true;
  return false;
}

function getStarVariantColor(starLetter: string, map: Record<string, string>): string {
  return map[starLetter] || map[starLetter.toUpperCase()] || '';
}

// ─── Genus rules from species data ────────────────────────────────────────────

const GENUS_RULES: EstimatorGenusRule[] = buildEstimatorGenusRules();

// Compute system-level flags (ELW, ammonia world, etc.) from body list; used by genus rules that require system composition.
// ─── System flags from bodies ────────────────────────────────────────────────

export interface SystemHas {
  elw: boolean;
  ammoniaWorld: boolean;
  ggWater: boolean;
  ggAmmonia: boolean;
  waterGiant: boolean;
}

export function computeSystemHas(bodies: { subType?: string }[]): SystemHas {
  const types = new Set(bodies.map((b) => normalizePlanetType(b.subType).toLowerCase()));
  return {
    elw: types.has('earth-like world'),
    ammoniaWorld: types.has('ammonia world'),
    ggWater: types.has('gas giant with water-based life'),
    ggAmmonia: types.has('gas giant with ammonia-based life'),
    waterGiant: types.has('water giant'),
  };
}

function systemMatches(need: string[] | undefined, has: SystemHas): boolean {
  if (!need || need.length === 0) return true;
  const h = (v: boolean) => v;
  if (need.includes('elw') && !has.elw) return false;
  if (need.includes('ammonia') && !has.ammoniaWorld) return false;
  if (need.includes('ggWater') && !has.ggWater) return false;
  if (need.includes('ggAmmonia') && !has.ggAmmonia) return false;
  if (need.includes('waterGiant') && !has.waterGiant) return false;
  return true;
}

// Main entry: given body + system params, return possible genera and species with value ranges (used pre-DSS when only bio count is known).
// ─── Main estimator ──────────────────────────────────────────────────────────

export interface EstimatorParams {
  atmosphere: string | null | undefined;
  tempK: number | null | undefined;
  gravityG: number | null | undefined;
  planetType: string | undefined;  // body subType
  volcanism: string | null | undefined;
  distanceLS: number | null | undefined;
  starClassLetter: string;
  systemHas: SystemHas;
  /** Surface materials from Scan event (for Bacterium Tela material-based colors) */
  materials?: Array<{ Name: string }>;
}

export interface PossibleSpecies {
  species: string;
  baseValue: number;
  variantColor: string;
  /** Full biological type: Genus Species Variant (e.g. "Stratum Paleas Lime") */
  fullLabel: string;
}

export interface EstimatedGenus {
  genus: string;
  possible: PossibleSpecies[];
  valueMin: number;
  valueMax: number;
}

export function estimatePossibleGenera(p: EstimatorParams): EstimatedGenus[] {
  const atmo = normalizeAtmosphere(p.atmosphere);
  const pType = normalizePlanetType(p.planetType);
  const tempK = p.tempK != null && Number.isFinite(p.tempK) ? p.tempK : null;
  const grav = p.gravityG != null && Number.isFinite(p.gravityG) ? p.gravityG : null;
  const distLs = p.distanceLS != null && Number.isFinite(p.distanceLS) ? p.distanceLS : 0;
  const star = p.starClassLetter || '';

  const out: EstimatedGenus[] = [];

  for (const g of GENUS_RULES) {
    // Genus-level conditions
    if (g.planetTypes && !planetTypeMatches(pType, g.planetTypes)) continue;
    if (g.maxGravity != null && (grav == null || grav > g.maxGravity)) continue;
    if (g.atmosphere != null && !atmosphereMatches(atmo, g.atmosphere)) continue;
    if (g.volcanism != null && !volcanismMatches(p.volcanism, g.volcanism)) continue;
    if (g.starClasses != null) {
      const ok = g.starClasses.split(',').some((c) => c.trim().toUpperCase().startsWith(star));
      if (!ok && star) continue; // if we have star and it's not in list, skip
      if (!ok && !star) continue; // if we require star class and don't have it, skip
    }
    if (g.tempMin != null && (tempK == null || tempK < g.tempMin)) continue;
    if (g.tempMax != null && (tempK == null || tempK > g.tempMax)) continue;
    if (g.distMinLs != null && distLs < g.distMinLs) continue;
    if (!systemMatches(g.systemHas, p.systemHas)) continue;

    const possible: PossibleSpecies[] = [];
    for (const s of g.species) {
      if (s.atmosphere != null && !atmosphereMatches(atmo, s.atmosphere)) continue;
      if (s.temp != null) {
        const spec = parseTempSpec(s.temp);
        if (!tempMatches(tempK, spec)) continue;
      }
      if (s.planetType != null && !planetTypeMatches(pType, s.planetType)) continue;
      if (s.volcanism != null && !volcanismMatches(p.volcanism, s.volcanism)) continue;
      if (s.distMinLs != null && distLs < s.distMinLs) continue;
      if (s.starClass != null && star && !starClassMatches(star, s.starClass)) continue;

      let variantColor = '';
      if (s.materialColors && p.materials && p.materials.length > 0) {
        const colors = p.materials
          .map((m) => s.materialColors![m.Name])
          .filter((c): c is string => !!c);
        if (colors.length > 0) variantColor = [...new Set(colors)].join(', ');
      } else if (s.starColors) {
        variantColor = getStarVariantColor(star, s.starColors);
      } else if (g.starColors) {
        variantColor = getStarVariantColor(star, g.starColors);
      }
      const short = s.species.startsWith(g.genus + ' ') ? s.species.slice(g.genus.length + 1) : s.species;
      const fullLabel = variantColor
        ? variantColor.split(',').map((v) => `${g.genus} ${short} ${v.trim()}`).join(', ')
        : `${g.genus} ${short}`;
      possible.push({ species: short, baseValue: s.baseValue, variantColor, fullLabel });
    }

    if (possible.length === 0) continue;

    const values = possible.map((x) => x.baseValue);
    out.push({
      genus: g.genus,
      possible,
      valueMin: Math.min(...values),
      valueMax: Math.max(...values),
    });
  }

  return out;
}
