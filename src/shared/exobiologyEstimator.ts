/**
 * Exobiology genus/species estimator from EXOBIOLOGY_SCAN_VALUES.md.
 * After FSS, when we know a body has biological signals but before DSS (no Genuses),
 * we can estimate possible genera and species from body + system parameters.
 */

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

// ─── Star class matching (species: "O", "B IV, B V", "A-Class (luminosity V+)" — we only have letter) ───────────────────

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

// ─── Star-based variant colors (for genera that use parent star) ──────────────

const ALEOIDA_STAR_COLORS: Record<string, string> = {
  O: 'Grey', B: 'Yellow', A: 'Green', F: 'Teal', G: 'Lime', K: 'Turquoise', M: 'Emerald',
  L: 'Lime', T: 'Sage', TTS: 'Mauve', Y: 'Teal', W: 'Grey', D: 'Indigo', N: 'Ocher',
};
const CACTOIDA_STAR_COLORS: Record<string, string> = {
  O: 'Grey', A: 'Green', F: 'Yellow', G: 'Teal', K: 'Turquoise', M: 'Amethyst',
  L: 'Mauve', T: 'Orange', TTS: 'Red', Y: 'Ocher', W: 'Indigo', D: 'Turquoise', N: 'Sage',
};
const CLYPEUS_STAR_COLORS: Record<string, string> = {
  B: 'Maroon', A: 'Orange', F: 'Mauve', G: 'Amethyst', K: 'Grey', M: 'Turquoise',
  L: 'Teal', Y: 'Green', D: 'Lime', N: 'Yellow',
};
const CONCHA_STAR_COLORS: Record<string, string> = {
  B: 'Indigo', A: 'Teal', F: 'Grey', G: 'Turquoise', K: 'Red', L: 'Orange', Y: 'Yellow', N: 'Emerald',
};
const OSSEUS_STAR_COLORS: Record<string, string> = {
  O: 'Turquoise', B: 'Grey', A: 'Yellow', F: 'Green', G: 'Lime', K: 'Turquoise, Indigo', M: 'Emerald',
  L: 'Sage', T: 'Red', TTS: 'Maroon', Y: 'Mauve', W: 'Amethyst', D: 'Ocher', N: 'Indigo',
};
const FRUTEXA_STAR_COLORS: Record<string, string> = { ...OSSEUS_STAR_COLORS };
const FUNGOIDA_STAR_COLORS: Record<string, string> = { ...OSSEUS_STAR_COLORS };
const TUSSOCK_STAR_COLORS: Record<string, string> = { ...OSSEUS_STAR_COLORS };
const TUBUS_STAR_COLORS: Record<string, string> = {
  O: 'Grey', B: 'Lime', A: 'Green', F: 'Yellow', G: 'Teal', K: 'Emerald', M: 'Amethyst',
  L: 'Mauve', T: 'Orange', TTS: 'Red', Y: 'Ocher', W: 'Indigo', D: 'Turquoise', N: 'Sage',
};
const STRATUM_STAR_COLORS: Record<string, string> = {
  O: 'Grey', B: 'Emerald', A: 'Lime', F: 'Green', G: 'Yellow', K: 'Turquoise, Lime', M: 'Amethyst',
  L: 'Mauve', T: 'Orange', TTS: 'Red', Y: 'Ocher', W: 'Indigo', D: 'Sage', N: 'Turquoise',
};
const FONTICULUA_STAR_COLORS: Record<string, string> = {
  O: 'Grey', B: 'Lime', A: 'Green', F: 'Yellow', G: 'Teal', K: 'Emerald', M: 'Amethyst',
  L: 'Mauve', T: 'Orange', TTS: 'Red', Y: 'Ocher', W: 'Indigo', D: 'Turquoise', N: 'Sage',
  'Ae/Be': 'Maroon',
};
const FUMEROLA_STAR_COLORS: Record<string, string> = {
  O: 'Green', B: 'Lime', A: 'Yellow', F: 'Aquamarine', G: 'Teal', K: 'Turquoise', M: 'Emerald',
  L: 'Sage', T: 'Red', TTS: 'Maroon', Y: 'Mauve', W: 'Ocher', D: 'Indigo', N: 'Grey',
};

function getStarVariantColor(starLetter: string, map: Record<string, string>): string {
  return map[starLetter] || map[starLetter.toUpperCase()] || '';
}

// ─── Genus/Species rule definitions ──────────────────────────────────────────

interface SpeciesRule {
  species: string;
  baseValue: number;
  atmosphere?: string;
  temp?: string;
  planetType?: string;
  volcanism?: string;
  distMinLs?: number;
  starClass?: string;
  /** Material name -> variant color for Grade 3 Bacterium (e.g. Cadmium -> Gold) */
  materialColors?: Record<string, string>;
}

interface GenusRule {
  genus: string;
  planetTypes?: string;   // comma-separated
  maxGravity?: number;
  atmosphere?: string;    // e.g. "None", "Carbon Dioxide, Water"
  volcanism?: string;     // "Any" or specific
  starClasses?: string;   // comma-separated
  tempMin?: number;
  tempMax?: number;
  distMinLs?: number;
  systemHas?: string[];   // 'elw'|'ammonia'|'ggWater'|'ggAmmonia'|'waterGiant'
  species: SpeciesRule[];
  starColors?: Record<string, string>;
}

const GENUS_RULES: GenusRule[] = [
  {
    genus: 'Aleoida',
    planetTypes: 'Rocky Body, High Metal Content Body',
    maxGravity: 0.27,
    species: [
      { species: 'Aleoida Arcus', baseValue: 7_252_500, atmosphere: 'Carbon Dioxide', temp: '175K - 180K' },
      { species: 'Aleoida Coronamus', baseValue: 6_284_600, atmosphere: 'Carbon Dioxide', temp: '180K - 190K' },
      { species: 'Aleoida Gravis', baseValue: 12_934_900, atmosphere: 'Carbon Dioxide', temp: '190K - 195K' },
      { species: 'Aleoida Laminiae', baseValue: 3_385_200, atmosphere: 'Ammonia', temp: 'Any' },
      { species: 'Aleoida Spica', baseValue: 3_385_200, atmosphere: 'Ammonia', temp: 'Any' },
    ],
    starColors: ALEOIDA_STAR_COLORS,
  },
  {
    genus: 'Cactoida',
    planetTypes: 'Rocky Body, High Metal Content Body',
    maxGravity: 0.27,
    species: [
      { species: 'Cactoida Cortexum', baseValue: 3_667_600, atmosphere: 'Carbon Dioxide', temp: 'Any' },
      { species: 'Cactoida Lapis', baseValue: 2_483_600, atmosphere: 'Ammonia', temp: 'Any' },
      { species: 'Cactoida Peperatis', baseValue: 2_483_600, atmosphere: 'Ammonia', temp: 'Any' },
      { species: 'Cactoida Pullulanta', baseValue: 3_667_600, atmosphere: 'Carbon Dioxide', temp: '180K - 195K' },
      { species: 'Cactoida Vermis', baseValue: 16_202_800, atmosphere: 'Water', temp: 'Any' },
    ],
    starColors: CACTOIDA_STAR_COLORS,
  },
  {
    genus: 'Clypeus',
    planetTypes: 'Rocky Body, High Metal Content Body',
    atmosphere: 'Carbon Dioxide, Water',
    maxGravity: 0.27,
    tempMin: 191,
    species: [
      { species: 'Clypeus Lacrimam', baseValue: 8_418_000, distMinLs: 0 },
      { species: 'Clypeus Margaritus', baseValue: 11_873_200, distMinLs: 0 },
      { species: 'Clypeus Speculumi', baseValue: 16_202_800, distMinLs: 2500 },
    ],
    starColors: CLYPEUS_STAR_COLORS,
  },
  {
    genus: 'Concha',
    maxGravity: 0.27,
    species: [
      { species: 'Concha Aureolas', baseValue: 7_774_700, atmosphere: 'Ammonia', temp: 'Any' },
      { species: 'Concha Labiata', baseValue: 2_352_400, atmosphere: 'Carbon Dioxide', temp: '< 190K' },
      { species: 'Concha Biconcavis', baseValue: 16_777_215, atmosphere: 'Nitrogen' },
      { species: 'Concha Renibus', baseValue: 4_572_400, atmosphere: 'Carbon Dioxide, Water', temp: '180K - 195K' },
    ],
    starColors: CONCHA_STAR_COLORS,
  },
  {
    genus: 'Osseus',
    planetTypes: 'Rocky Body, High Metal Content Body, Rocky Ice Body',
    species: [
      { species: 'Osseus Cornibus', baseValue: 1_483_000, atmosphere: 'Carbon Dioxide', temp: '180K - 195K', planetType: 'Rocky, HMC' },
      { species: 'Osseus Fractus', baseValue: 4_027_800, atmosphere: 'Carbon Dioxide', temp: '180K - 190K', planetType: 'Rocky, HMC' },
      { species: 'Osseus Pellebantus', baseValue: 9_739_000, atmosphere: 'Carbon Dioxide', temp: '190K - 195K', planetType: 'Rocky, HMC' },
      { species: 'Osseus Discus', baseValue: 12_934_900, atmosphere: 'Water', temp: 'Any', planetType: 'Rocky, HMC' },
      { species: 'Osseus Spiralis', baseValue: 2_404_700, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky, HMC' },
      { species: 'Osseus Pumice', baseValue: 3_156_300, atmosphere: 'Methane, Argon, Nitrogen', temp: 'Any', planetType: 'Rocky Ice' },
    ],
    starColors: OSSEUS_STAR_COLORS,
  },
  {
    genus: 'Frutexa',
    planetTypes: 'Rocky Body, High Metal Content Body',
    maxGravity: 0.27,
    species: [
      { species: 'Frutexa Acus', baseValue: 7_774_700, atmosphere: 'Carbon Dioxide', planetType: 'Rocky Body' },
      { species: 'Frutexa Collum', baseValue: 1_639_800, atmosphere: 'Sulfur Dioxide', planetType: 'Rocky Body' },
      { species: 'Frutexa Fera', baseValue: 1_632_500, atmosphere: 'Carbon Dioxide', planetType: 'Rocky Body' },
      { species: 'Frutexa Flabellum', baseValue: 1_808_900, atmosphere: 'Ammonia', planetType: 'Rocky Body' },
      { species: 'Frutexa Flammasis', baseValue: 10_326_000, atmosphere: 'Ammonia', planetType: 'Rocky Body' },
      { species: 'Frutexa Metallicum', baseValue: 1_632_500, atmosphere: 'Ammonia, Carbon Dioxide', planetType: 'High Metal Content Body' },
      { species: 'Frutexa Sponsae', baseValue: 5_988_000, atmosphere: 'Water', planetType: 'Rocky Body' },
    ],
    starColors: FRUTEXA_STAR_COLORS,
  },
  {
    genus: 'Fungoida',
    planetTypes: 'Rocky Body, High Metal Content Body',
    maxGravity: 0.27,
    species: [
      { species: 'Fungoida Bullarum', baseValue: 3_703_200, atmosphere: 'Argon', temp: 'Any' },
      { species: 'Fungoida Gelata', baseValue: 3_330_300, atmosphere: 'Carbon Dioxide, Water', temp: '180K - 195K (CO2 only)' },
      { species: 'Fungoida Setisis', baseValue: 1_670_100, atmosphere: 'Ammonia, Methane', temp: 'Any' },
      { species: 'Fungoida Stabitis', baseValue: 2_680_300, atmosphere: 'Carbon Dioxide, Water', temp: '180K - 195K (CO2 only)' },
    ],
    starColors: FUNGOIDA_STAR_COLORS,
  },
  {
    genus: 'Tussock',
    planetTypes: 'Rocky Body, Rocky Ice Body',
    species: [
      { species: 'Tussock Albata', baseValue: 3_252_500, atmosphere: 'Carbon Dioxide', temp: '175K - 180K' },
      { species: 'Tussock Capillum', baseValue: 7_025_800, atmosphere: 'Methane, Argon', temp: 'Any' },
      { species: 'Tussock Caputus', baseValue: 3_472_400, atmosphere: 'Carbon Dioxide', temp: '180K - 190K' },
      { species: 'Tussock Catena', baseValue: 1_766_600, atmosphere: 'Ammonia', temp: 'Any' },
      { species: 'Tussock Cultro', baseValue: 1_766_600, atmosphere: 'Ammonia', temp: 'Any' },
      { species: 'Tussock Divisa', baseValue: 1_766_600, atmosphere: 'Ammonia', temp: 'Any' },
      { species: 'Tussock Ignis', baseValue: 1_849_000, atmosphere: 'Carbon Dioxide', temp: '160K - 170K' },
      { species: 'Tussock Pennata', baseValue: 5_853_800, atmosphere: 'Carbon Dioxide', temp: '145K - 155K' },
      { species: 'Tussock Pennatis', baseValue: 1_000_000, atmosphere: 'Carbon Dioxide', temp: '< 195K' },
      { species: 'Tussock Propagito', baseValue: 1_000_000, atmosphere: 'Carbon Dioxide', temp: '< 195K' },
      { species: 'Tussock Serrati', baseValue: 4_447_100, atmosphere: 'Carbon Dioxide', temp: '170K - 175K' },
      { species: 'Tussock Stigmasis', baseValue: 19_010_800, atmosphere: 'Sulfur Dioxide', temp: 'Any' },
      { species: 'Tussock Triticum', baseValue: 7_774_700, atmosphere: 'Carbon Dioxide', temp: '190K - 195K' },
      { species: 'Tussock Ventusa', baseValue: 3_277_700, atmosphere: 'Carbon Dioxide', temp: '155K - 160K' },
      { species: 'Tussock Virgam', baseValue: 14_313_700, atmosphere: 'Water', temp: 'Any' },
    ],
    starColors: TUSSOCK_STAR_COLORS,
  },
  {
    genus: 'Stratum',
    tempMin: 166,
    species: [
      { species: 'Stratum Araneamus', baseValue: 2_448_900, atmosphere: 'Sulfur Dioxide', temp: '> 165K', planetType: 'Rocky' },
      { species: 'Stratum Cucumisis', baseValue: 16_202_800, atmosphere: 'Sulfur Dioxide, Carbon Dioxide', temp: '> 190K', planetType: 'Rocky' },
      { species: 'Stratum Excutitus', baseValue: 2_448_900, atmosphere: 'Sulfur Dioxide, Carbon Dioxide', temp: '165K - 190K', planetType: 'Rocky' },
      { species: 'Stratum Frigus', baseValue: 2_637_500, atmosphere: 'Sulfur Dioxide, Carbon Dioxide', temp: '> 190K', planetType: 'Rocky' },
      { species: 'Stratum Laminamus', baseValue: 2_788_300, atmosphere: 'Ammonia', temp: '> 165K', planetType: 'Rocky' },
      { species: 'Stratum Limaxus', baseValue: 1_362_000, atmosphere: 'Sulfur Dioxide, Carbon Dioxide', temp: '165K - 190K', planetType: 'Rocky' },
      { species: 'Stratum Paleas', baseValue: 1_362_000, atmosphere: 'Carbon Dioxide, Sulfur Dioxide, Ammonia, Water', temp: '> 165K', planetType: 'Rocky' },
      { species: 'Stratum Tectonicas', baseValue: 19_010_800, atmosphere: 'Any', temp: '> 165K', planetType: 'High Metal Content' },
    ],
    starColors: STRATUM_STAR_COLORS,
  },
  {
    genus: 'Tubus',
    planetTypes: 'Rocky Body, High Metal Content Body',
    maxGravity: 0.15,
    species: [
      { species: 'Tubus Cavas', baseValue: 11_873_200, atmosphere: 'Carbon Dioxide', temp: '160K - 190K', planetType: 'Rocky' },
      { species: 'Tubus Compagibus', baseValue: 7_774_700, atmosphere: 'Carbon Dioxide', temp: '160K - 190K', planetType: 'Rocky' },
      { species: 'Tubus Conifer', baseValue: 2_415_500, atmosphere: 'Carbon Dioxide', temp: '160K - 190K', planetType: 'Rocky' },
      { species: 'Tubus Rosarium', baseValue: 2_637_500, atmosphere: 'Ammonia', temp: '> 160K', planetType: 'Rocky' },
      { species: 'Tubus Sororibus', baseValue: 5_727_600, atmosphere: 'Ammonia, Carbon Dioxide', temp: '160K - 190K', planetType: 'High Metal Content Body' },
    ],
    starColors: TUBUS_STAR_COLORS,
  },
  {
    genus: 'Fonticulua',
    planetTypes: 'Icy Body, Rocky Ice Body',
    maxGravity: 0.27,
    species: [
      { species: 'Fonticulua Campestris', baseValue: 1_000_000, atmosphere: 'Argon' },
      { species: 'Fonticulua Digitos', baseValue: 1_804_100, atmosphere: 'Methane' },
      { species: 'Fonticulua Fluctus', baseValue: 16_777_215, atmosphere: 'Oxygen' },
      { species: 'Fonticulua Lapida', baseValue: 3_111_000, atmosphere: 'Nitrogen' },
      { species: 'Fonticulua Segmentatus', baseValue: 19_010_800, atmosphere: 'Neon' },
      { species: 'Fonticulua Upupam', baseValue: 5_727_600, atmosphere: 'Argon-Rich' },
    ],
    starColors: FONTICULUA_STAR_COLORS,
  },
  {
    genus: 'Bacterium',
    // "thin atmosphere" — we treat any non-none as possible; species filter by exact atmo
    species: [
      { species: 'Bacterium Alcyoneum', baseValue: 1_658_500, atmosphere: 'Ammonia' },
      { species: 'Bacterium Aurasus', baseValue: 1_000_000, atmosphere: 'Carbon Dioxide' },
      { species: 'Bacterium Cerbrus', baseValue: 1_689_800, atmosphere: 'Water, Sulfur Dioxide' },
      { species: 'Bacterium Acies', baseValue: 1_000_000, atmosphere: 'Neon' },
      { species: 'Bacterium Bullaris', baseValue: 1_152_500, atmosphere: 'Methane' },
      { species: 'Bacterium Informem', baseValue: 8_418_000, atmosphere: 'Nitrogen' },
      { species: 'Bacterium Nebulus', baseValue: 9_116_600, atmosphere: 'Helium' },
      { species: 'Bacterium Vesicula', baseValue: 1_000_000, atmosphere: 'Argon' },
      { species: 'Bacterium Volu', baseValue: 7_774_700, atmosphere: 'Oxygen' },
      { species: 'Bacterium Omentum', baseValue: 4_638_900, atmosphere: 'Neon', volcanism: 'Nitrogen, Ammonia' },
      { species: 'Bacterium Scopulum', baseValue: 8_633_800, atmosphere: 'Neon', volcanism: 'Carbon, Methane' },
      {
        species: 'Bacterium Tela',
        baseValue: 1_949_000,
        atmosphere: 'Any',
        volcanism: 'None, Helium, Iron, Silicate',
        materialColors: { Cadmium: 'Gold', Mercury: 'Orange', Molybdenum: 'Yellow', Niobium: 'Magenta', Tungsten: 'Green', Tin: 'Cobalt' },
      },
      { species: 'Bacterium Verrata', baseValue: 3_897_000, atmosphere: 'Neon', volcanism: 'Water' },
    ],
    // Bacterium has star-based colors only for Alcyoneum, Aurasus, Cerbrus; temporarily omitted for simplicity
  },
  {
    genus: 'Fumerola',
    volcanism: 'Any', // requires volcanism
    species: [
      { species: 'Fumerola Aquatis', baseValue: 6_284_600, planetType: 'Icy, Rocky Ice', volcanism: 'Water' },
      { species: 'Fumerola Carbosis', baseValue: 6_284_600, planetType: 'Icy, Rocky Ice', volcanism: 'Methane, Carbon Dioxide' },
      { species: 'Fumerola Extremus', baseValue: 16_202_800, planetType: 'Rocky, High Metal Content', volcanism: 'Silicate, Iron, Rocky' },
      { species: 'Fumerola Nitris', baseValue: 7_500_900, planetType: 'Icy, Rocky Ice', volcanism: 'Nitrogen, Ammonia' },
    ],
    starColors: FUMEROLA_STAR_COLORS,
  },
  {
    genus: 'Recepta',
    atmosphere: 'Sulfur Dioxide',
    maxGravity: 0.27,
    species: [
      { species: 'Recepta Conditivus', baseValue: 14_313_700, planetType: 'Icy, Rocky Ice' },
      { species: 'Recepta Deltahedronix', baseValue: 16_202_800, planetType: 'Rocky, High Metal Content' },
      { species: 'Recepta Umbrux', baseValue: 12_934_900, planetType: 'All Types' },
    ],
    // Recepta uses rare material colors, not star
  },
  {
    genus: 'Sinuous Tuber',
    atmosphere: 'None',
    volcanism: 'Any',
    species: [
      { species: 'Sinuous Tuber Albidum', baseValue: 3_425_600, planetType: 'Rocky', volcanism: 'Any' },
      { species: 'Sinuous Tuber Blatteum', baseValue: 1_514_500, planetType: 'Metal Rich, HMC', volcanism: 'Any' },
      { species: 'Sinuous Tuber Caeruleum', baseValue: 1_514_500, planetType: 'Rocky', volcanism: 'Any' },
      { species: 'Sinuous Tuber Lindigoticum', baseValue: 1_514_500, planetType: 'Rocky', volcanism: 'Any' },
      { species: 'Sinuous Tuber Prasinum', baseValue: 1_514_500, planetType: 'Metal Rich, HMC', volcanism: 'Any' },
      { species: 'Sinuous Tuber Roseus', baseValue: 1_514_500, planetType: 'Any', volcanism: 'Silicate Magma' },
      { species: 'Sinuous Tuber Violaceum', baseValue: 1_514_500, planetType: 'Metal Rich, HMC', volcanism: 'Any' },
      { species: 'Sinuous Tuber Viride', baseValue: 1_514_500, planetType: 'Metal Rich, HMC', volcanism: 'Any' },
    ],
  },
];

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
