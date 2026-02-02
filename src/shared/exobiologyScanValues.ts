/**
 * Exobiology scan values and sample distances from EXOBIOLOGY_SCAN_VALUES.md.
 * Used for biological value display, codex, and genus/species lookups (sample distance, value ranges, species base values).
 */
/**
 * Minimum distance between samples for each genus (from EXOBIOLOGY_SCAN_VALUES.md).
 * Distance in meters.
 */
export const GENUS_SAMPLE_DISTANCES: Record<string, number> = {
  Aleoida: 150,
  'Amphora Plant': 100,
  Anemone: 100,
  Bacterium: 500,
  'Bark Mound': 100,
  'Brain Tree': 100,
  Cactoida: 300,
  Clypeus: 150,
  Concha: 150,
  'Crystalline Shard': 100,
  Electricae: 1000,
  Fonticulua: 500,
  Frutexa: 150,
  Fumerola: 100,
  Fungoida: 300,
  Osseus: 800,
  Recepta: 150,
  'Sinuous Tuber': 100,
  Stratum: 500,
  Tubus: 800,
  Tussock: 200,
  Thargoid: 100,
};

/**
 * Exobiology scan value ranges by genus (from EXOBIOLOGY_SCAN_VALUES.md).
 * Min/max are base Vista Genomics values in CR. First Logged = 5× base.
 * Used for Biological and Thargoid signal sections before handheld scan.
 */
export const GENUS_VALUE_RANGES: Record<string, { min: number; max: number }> = {
  Aleoida: { min: 3_385_200, max: 12_934_900 },
  'Amphora Plant': { min: 3_626_400, max: 3_626_400 },
  Anemone: { min: 1_499_900, max: 3_399_800 },
  Bacterium: { min: 1_000_000, max: 9_116_600 },
  'Bark Mound': { min: 1_471_900, max: 1_471_900 },
  'Brain Tree': { min: 1_593_700, max: 3_565_100 },
  Cactoida: { min: 2_483_600, max: 16_202_800 },
  Clypeus: { min: 8_418_000, max: 16_202_800 },
  Concha: { min: 2_352_400, max: 16_777_215 },
  'Crystalline Shard': { min: 3_626_400, max: 3_626_400 },
  Electricae: { min: 6_284_600, max: 6_284_600 },
  Fonticulua: { min: 1_000_000, max: 19_010_800 },
  Frutexa: { min: 1_632_500, max: 10_326_000 },
  Fumerola: { min: 6_284_600, max: 16_202_800 },
  Fungoida: { min: 1_670_100, max: 3_703_200 },
  Osseus: { min: 1_483_000, max: 12_934_900 },
  Recepta: { min: 12_934_900, max: 16_202_800 },
  'Sinuous Tuber': { min: 1_514_500, max: 3_425_600 },
  Stratum: { min: 1_362_000, max: 19_010_800 },
  Tubus: { min: 2_415_500, max: 11_873_200 },
  Tussock: { min: 1_000_000, max: 19_010_800 },
  Thargoid: { min: 1_896_800, max: 2_313_500 },
};

/**
 * Base Vista Genomics value per species (from EXOBIOLOGY_SCAN_VALUES.md).
 * Used for species with known name (Genetic Sampler or EDSM) when bio.value is missing.
 */
export const SPECIES_VALUES: Record<string, number> = {
  'Aleoida Arcus': 7_252_500,
  'Aleoida Coronamus': 6_284_600,
  'Aleoida Gravis': 12_934_900,
  'Aleoida Laminiae': 3_385_200,
  'Aleoida Spica': 3_385_200,
  'Amphora Plant': 3_626_400,
  'Anemone Blatteum Bioluminescent': 1_499_900,
  'Anemone Croceum': 3_399_800,
  'Anemone Luteolum': 1_499_900,
  'Anemone Prasinum Bioluminescent': 1_499_900,
  'Anemone Puniceum': 1_499_900,
  'Anemone Roseum': 1_499_900,
  'Anemone Roseum Bioluminescent': 1_499_900,
  'Anemone Rubeum Bioluminescent': 1_499_900,
  'Bacterium Nebulus': 9_116_600,
  'Bacterium Acies': 1_000_000,
  'Bacterium Omentum': 4_638_900,
  'Bacterium Scopulum': 8_633_800,
  'Bacterium Verrata': 3_897_000,
  'Bacterium Bullaris': 1_152_500,
  'Bacterium Vesicula': 1_000_000,
  'Bacterium Informem': 8_418_000,
  'Bacterium Volu': 7_774_700,
  'Bacterium Alcyoneum': 1_658_500,
  'Bacterium Aurasus': 1_000_000,
  'Bacterium Cerbrus': 1_689_800,
  'Bacterium Tela': 1_949_000,
  'Bark Mound': 1_471_900,
  'Brain Tree Aureum': 3_565_100,
  'Brain Tree Gypseeum': 3_565_100,
  'Brain Tree Lindigoticum': 3_565_100,
  'Brain Tree Lividum': 1_593_700,
  'Brain Tree Ostrinum': 3_565_100,
  'Brain Tree Puniceum': 3_565_100,
  'Brain Tree Roseum': 1_593_700,
  'Brain Tree Viride': 1_593_700,
  'Cactoida Cortexum': 3_667_600,
  'Cactoida Lapis': 2_483_600,
  'Cactoida Peperatis': 2_483_600,
  'Cactoida Pullulanta': 3_667_600,
  'Cactoida Vermis': 16_202_800,
  'Clypeus Lacrimam': 8_418_000,
  'Clypeus Margaritus': 11_873_200,
  'Clypeus Speculumi': 16_202_800,
  'Concha Aureolas': 7_774_700,
  'Concha Biconcavis': 16_777_215,
  'Concha Labiata': 2_352_400,
  'Concha Renibus': 4_572_400,
  'Crystalline Shard': 3_626_400,
  'Electricae Pluma': 6_284_600,
  'Electricae Radialem': 6_284_600,
  'Fonticulua Campestris': 1_000_000,
  'Fonticulua Digitos': 1_804_100,
  'Fonticulua Fluctus': 16_777_215,
  'Fonticulua Lapida': 3_111_000,
  'Fonticulua Segmentatus': 19_010_800,
  'Fonticulua Upupam': 5_727_600,
  'Frutexa Acus': 7_774_700,
  'Frutexa Collum': 1_639_800,
  'Frutexa Fera': 1_632_500,
  'Frutexa Flabellum': 1_808_900,
  'Frutexa Flammasis': 10_326_000,
  'Frutexa Metallicum': 1_632_500,
  'Frutexa Sponsae': 5_988_000,
  'Fumerola Aquatis': 6_284_600,
  'Fumerola Carbosis': 6_284_600,
  'Fumerola Extremus': 16_202_800,
  'Fumerola Nitris': 7_500_900,
  'Fungoida Bullarum': 3_703_200,
  'Fungoida Gelata': 3_330_300,
  'Fungoida Setisis': 1_670_100,
  'Fungoida Stabitis': 2_680_300,
  'Osseus Cornibus': 1_483_000,
  'Osseus Discus': 12_934_900,
  'Osseus Fractus': 4_027_800,
  'Osseus Pellebantus': 9_739_000,
  'Osseus Pumice': 3_156_300,
  'Osseus Spiralis': 2_404_700,
  'Recepta Conditivus': 14_313_700,
  'Recepta Deltahedronix': 16_202_800,
  'Recepta Umbrux': 12_934_900,
  'Sinuous Tuber Albidum': 3_425_600,
  'Sinuous Tuber Blatteum': 1_514_500,
  'Sinuous Tuber Caeruleum': 1_514_500,
  'Sinuous Tuber Lindigoticum': 1_514_500,
  'Sinuous Tuber Prasinum': 1_514_500,
  'Sinuous Tuber Roseus': 1_514_500,
  'Sinuous Tuber Violaceum': 1_514_500,
  'Sinuous Tuber Viride': 1_514_500,
  'Stratum Araneamus': 2_448_900,
  'Stratum Cucumisis': 16_202_800,
  'Stratum Excutitus': 2_448_900,
  'Stratum Frigus': 2_637_500,
  'Stratum Laminamus': 2_788_300,
  'Stratum Limaxus': 1_362_000,
  'Stratum Paleas': 1_362_000,
  'Stratum Tectonicas': 19_010_800,
  'Tubus Cavas': 11_873_200,
  'Tubus Compagibus': 7_774_700,
  'Tubus Conifer': 2_415_500,
  'Tubus Rosarium': 2_637_500,
  'Tubus Sororibus': 5_727_600,
  'Tussock Albata': 3_252_500,
  'Tussock Capillum': 7_025_800,
  'Tussock Caputus': 3_472_400,
  'Tussock Catena': 1_766_600,
  'Tussock Cultro': 1_766_600,
  'Tussock Divisa': 1_766_600,
  'Tussock Ignis': 1_849_000,
  'Tussock Pennata': 5_853_800,
  'Tussock Pennatis': 1_000_000,
  'Tussock Propagito': 1_000_000,
  'Tussock Serrati': 4_447_100,
  'Tussock Stigmasis': 19_010_800,
  'Tussock Triticum': 7_774_700,
  'Tussock Ventusa': 3_277_700,
  'Tussock Virgam': 14_313_700,
  'Thargoid Spires': 2_247_100,
  'Thargoid Mega Barnacles': 2_313_500,
  'Thargoid Coral Tree': 1_896_800,
  'Thargoid Coral Root': 1_924_600,
};

/**
 * Get base Vista Genomics value for a species. Case-insensitive lookup.
 */
export function getSpeciesValue(species: string): number | null {
  const key = Object.keys(SPECIES_VALUES).find(
    (k) => k.toLowerCase() === species.toLowerCase()
  );
  return key != null ? (SPECIES_VALUES[key] ?? null) : null;
}

/** Geological features do not award Vista Genomics credits (Codex & materials only). */
export const GEOLOGICAL_CREDITS = 0;

/** Human sites/structures do not provide Vista Genomics credits. */
export const HUMAN_CREDITS = 0;

/**
 * Get min/max base value range for a genus. Case-insensitive lookup.
 */
export function getGenusValueRange(genus: string): { min: number; max: number } | null {
  const key = Object.keys(GENUS_VALUE_RANGES).find(
    (k) => k.toLowerCase() === genus.toLowerCase()
  );
  return key ? (GENUS_VALUE_RANGES[key] ?? null) : null;
}

/**
 * Get minimum distance between samples for a genus (in meters). Case-insensitive lookup.
 */
export function getGenusSampleDistance(genus: string): number | null {
  const key = Object.keys(GENUS_SAMPLE_DISTANCES).find(
    (k) => k.toLowerCase() === genus.toLowerCase()
  );
  return key ? (GENUS_SAMPLE_DISTANCES[key] ?? null) : null;
}
