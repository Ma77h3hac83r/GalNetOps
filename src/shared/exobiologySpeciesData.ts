/**
 * Exobiology species data derived from documentation/ED_data/Exobiological_Species.
 * Single source of truth for species values, sample distances, and estimator rules.
 */

export interface SpeciesData {
  species: string;
  genus: string;
  value: number;
  minDistance: number;
  atmosphere?: string;
  temp?: string;
  planetType?: string;
  volcanism?: string;
  gravity?: string;
  bodyDistance?: string;
  systemRequirement?: string;
  starClass?: string;
  materialColors?: Record<string, string> | undefined;
  starColors?: Record<string, string> | undefined;
}

/** Parse "Grade 3: Cadmium (Gold), Mercury (Orange)" into { Cadmium: 'Gold', Mercury: 'Orange' } */
function parseMaterialColors(s: string): Record<string, string> | undefined {
  if (!s || /^-$/.test(s.trim())) return undefined;
  const match = s.match(/Grade [34]:\s*(.+)/i);
  const rest = (match?.[1] ?? s) ?? '';
  const map: Record<string, string> = {};
  const pairs = rest.split(/,\s*(?=[A-Z])/);
  for (const p of pairs) {
    const m = p.match(/(\w+)\s*\(([^)]+)\)/);
    if (m && m[1] != null && m[2] != null) map[m[1]] = m[2];
  }
  return Object.keys(map).length > 0 ? map : undefined;
}

/** Parse "O: Turquoise, B: Grey, K: Teal/Lime" into { O: 'Turquoise', B: 'Grey', K: 'Teal, Lime' } */
function parseStarColors(s: string): Record<string, string> | undefined {
  if (!s || /^-$/.test(s.trim())) return undefined;
  const map: Record<string, string> = {};
  const pairs = s.split(/,\s*/);
  for (const p of pairs) {
    const colon = p.indexOf(':');
    if (colon > 0) {
      const key = p.slice(0, colon).trim();
      const val = p.slice(colon + 1).trim().replace('/', ', ');
      if (key && val) map[key] = val;
    }
  }
  return Object.keys(map).length > 0 ? map : undefined;
}

/**
 * Species data from documentation. Each genus file contributes entries.
 * Format: [genus, species[]] - species include full name, value, rules, etc.
 */
const RAW_SPECIES: Array<{ genus: string; species: SpeciesData[] }> = [
  // ALEOIDA
  {
    genus: 'Aleoida',
    species: [
      { species: 'Aleoida Arcus', genus: 'Aleoida', value: 7_252_500, minDistance: 150, atmosphere: 'Carbon Dioxide', temp: '175K - 180K', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Yellow, A: Green, F: Teal, G: Lime, K: Turquoise, M: Emerald, L: Lime, T: Sage, TTS: Mauve, Y: Teal, W: Grey, D: Indigo, N: Ocher') },
      { species: 'Aleoida Coronamus', genus: 'Aleoida', value: 6_284_600, minDistance: 150, atmosphere: 'Carbon Dioxide', temp: '180K - 190K', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Yellow, A: Green, F: Teal, G: Lime, K: Turquoise, M: Emerald, L: Lime, T: Sage, TTS: Mauve, Y: Teal, W: Grey, D: Indigo, N: Ocher') },
      { species: 'Aleoida Gravis', genus: 'Aleoida', value: 12_934_900, minDistance: 150, atmosphere: 'Carbon Dioxide', temp: '190K - 195K', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Yellow, A: Green, F: Teal, G: Lime, K: Turquoise, M: Emerald, L: Lime, T: Sage, TTS: Mauve, Y: Teal, W: Grey, D: Indigo, N: Ocher') },
      { species: 'Aleoida Laminiae', genus: 'Aleoida', value: 3_385_200, minDistance: 150, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Yellow, A: Green, F: Teal, G: Lime, K: Turquoise, M: Emerald, L: Lime, T: Sage, TTS: Mauve, Y: Teal, W: Grey, D: Indigo, N: Ocher') },
      { species: 'Aleoida Spica', genus: 'Aleoida', value: 3_385_200, minDistance: 150, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Yellow, A: Green, F: Teal, G: Lime, K: Turquoise, M: Emerald, L: Lime, T: Sage, TTS: Mauve, Y: Teal, W: Grey, D: Indigo, N: Ocher') },
    ],
  },
  // AMPHORA
  {
    genus: 'Amphora Plant',
    species: [
      { species: 'Amphora Plant', genus: 'Amphora Plant', value: 3_626_400, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body', starClass: 'A', systemRequirement: 'elw,ammonia,ggWater,ggAmmonia,waterGiant' },
    ],
  },
  // ANEMONE
  {
    genus: 'Anemone',
    species: [
      { species: 'Anemone Blatteum Bioluminescent', genus: 'Anemone', value: 1_499_900, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', starClass: 'B' },
      { species: 'Anemone Croceum', genus: 'Anemone', value: 3_399_800, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Body', starClass: 'B, A' },
      { species: 'Anemone Luteolum', genus: 'Anemone', value: 1_499_900, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Body', starClass: 'B' },
      { species: 'Anemone Prasinum Bioluminescent', genus: 'Anemone', value: 1_499_900, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body, Rocky Body', starClass: 'O' },
      { species: 'Anemone Puniceum', genus: 'Anemone', value: 1_499_900, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Ice Body, Icy Body', starClass: 'O' },
      { species: 'Anemone Roseum', genus: 'Anemone', value: 1_499_900, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Body', starClass: 'B' },
      { species: 'Anemone Roseum Bioluminescent', genus: 'Anemone', value: 1_499_900, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', starClass: 'B' },
      { species: 'Anemone Rubeum Bioluminescent', genus: 'Anemone', value: 1_499_900, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', starClass: 'B, A' },
    ],
  },
  // BACTERIUM
  {
    genus: 'Bacterium',
    species: [
      { species: 'Bacterium Acies', genus: 'Bacterium', value: 1_000_000, minDistance: 500, atmosphere: 'Neon', materialColors: parseMaterialColors('Grade 4: Antimony (Cyan), Polonium (Magenta), Ruthenium (Cobalt), Technetium (Lime), Tellurium (White), Yttrium (Aquamarine)') },
      { species: 'Bacterium Alcyoneum', genus: 'Bacterium', value: 1_658_500, minDistance: 500, atmosphere: 'Ammonia', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Emerald, K: Green, M: Teal, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Bacterium Aurasus', genus: 'Bacterium', value: 1_000_000, minDistance: 500, atmosphere: 'Carbon Dioxide', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Emerald, K: Green, M: Teal, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Bacterium Bullaris', genus: 'Bacterium', value: 1_152_500, minDistance: 500, atmosphere: 'Methane', materialColors: parseMaterialColors('Grade 4: Antimony (Cobalt), Polonium (Yellow), Ruthenium (Aquamarine), Technetium (Gold), Tellurium (Lime), Yttrium (Red)') },
      { species: 'Bacterium Cerbrus', genus: 'Bacterium', value: 1_689_800, minDistance: 500, atmosphere: 'Water, Sulfur Dioxide', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Emerald, K: Green, M: Teal, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Bacterium Informem', genus: 'Bacterium', value: 8_418_000, minDistance: 500, atmosphere: 'Nitrogen', materialColors: parseMaterialColors('Grade 4: Antimony (Red), Polonium (Lime), Ruthenium (Gold), Technetium (Aquamarine), Tellurium (Yellow), Yttrium (Cobalt)') },
      { species: 'Bacterium Nebulus', genus: 'Bacterium', value: 9_116_600, minDistance: 500, atmosphere: 'Helium', materialColors: parseMaterialColors('Grade 4: Antimony (Magenta), Polonium (Gold), Ruthenium (Orange), Tellurium (Cyan), Yttrium (Cobalt)') },
      { species: 'Bacterium Omentum', genus: 'Bacterium', value: 4_638_900, minDistance: 500, atmosphere: 'Neon', volcanism: 'Nitrogen, Ammonia', materialColors: parseMaterialColors('Grade 3: Cadmium (Lime), Mercury (White), Molybdenum (Aquamarine), Niobium (Peach), Tungsten (Blue), Tin (Red)') },
      { species: 'Bacterium Scopulum', genus: 'Bacterium', value: 8_633_800, minDistance: 500, atmosphere: 'Neon', volcanism: 'Carbon, Methane', materialColors: parseMaterialColors('Grade 3: Cadmium (White), Mercury (Peach), Molybdenum (Lime), Niobium (Red), Tungsten (Aquamarine), Tin (Mulberry)') },
      { species: 'Bacterium Tela', genus: 'Bacterium', value: 1_949_000, minDistance: 500, atmosphere: 'Any', volcanism: 'None, Helium, Iron, Silicate', materialColors: parseMaterialColors('Grade 3: Cadmium (Gold), Mercury (Orange), Molybdenum (Yellow), Niobium (Magenta), Tungsten (Green), Tin (Cobalt)') },
      { species: 'Bacterium Verrata', genus: 'Bacterium', value: 3_897_000, minDistance: 500, atmosphere: 'Neon', volcanism: 'Water', materialColors: parseMaterialColors('Grade 3: Cadmium (Peach), Mercury (Red), Molybdenum (White), Niobium (Mulberry), Tungsten (Lime), Tin (Blue)') },
      { species: 'Bacterium Vesicula', genus: 'Bacterium', value: 1_000_000, minDistance: 500, atmosphere: 'Argon', materialColors: parseMaterialColors('Grade 4: Antimony (Cyan), Polonium (Orange), Ruthenium (Mulberry), Technetium (Gold), Tellurium (Red), Yttrium (Lime)') },
      { species: 'Bacterium Volu', genus: 'Bacterium', value: 7_774_700, minDistance: 500, atmosphere: 'Oxygen', materialColors: parseMaterialColors('Grade 4: Antimony (Red), Polonium (Aquamarine), Ruthenium (Cobalt), Tellurium (Cyan), Yttrium (Gold)') },
    ],
  },
  // BARK MOUND
  {
    genus: 'Bark Mound',
    species: [
      { species: 'Bark Mound', genus: 'Bark Mound', value: 1_471_900, minDistance: 100, atmosphere: 'None', volcanism: 'Any' },
    ],
  },
  // BRAIN TREE
  {
    genus: 'Brain Tree',
    species: [
      { species: 'Brain Tree Aureum', genus: 'Brain Tree', value: 3_565_100, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', volcanism: 'Any', systemRequirement: 'elw,ggWater' },
      { species: 'Brain Tree Gypseeum', genus: 'Brain Tree', value: 3_565_100, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Body', temp: '200K - 300K', volcanism: 'Any', systemRequirement: 'elw,ggWater' },
      { species: 'Brain Tree Lindigoticum', genus: 'Brain Tree', value: 3_565_100, minDistance: 100, atmosphere: 'None', planetType: 'High Metal Content Body, Rocky Body', temp: '300K - 500K', volcanism: 'Any', systemRequirement: 'elw,ggWater' },
      { species: 'Brain Tree Lividum', genus: 'Brain Tree', value: 1_593_700, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Body', temp: '300K - 500K', volcanism: 'Any', systemRequirement: 'elw,ggWater' },
      { species: 'Brain Tree Ostrinum', genus: 'Brain Tree', value: 3_565_100, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', volcanism: 'Any', systemRequirement: 'elw,ggWater' },
      { species: 'Brain Tree Puniceum', genus: 'Brain Tree', value: 3_565_100, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', volcanism: 'Any', systemRequirement: 'elw,ggWater' },
      { species: 'Brain Tree Roseum', genus: 'Brain Tree', value: 1_593_700, minDistance: 100, atmosphere: 'None', planetType: 'Any', temp: '200K - 500K', volcanism: 'Any' },
      { species: 'Brain Tree Viride', genus: 'Brain Tree', value: 1_593_700, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Ice Body', temp: '100K - 270K', volcanism: 'Any', systemRequirement: 'elw,ggWater' },
    ],
  },
  // CACTOIDA
  {
    genus: 'Cactoida',
    species: [
      { species: 'Cactoida Cortexum', genus: 'Cactoida', value: 3_667_600, minDistance: 300, atmosphere: 'Carbon Dioxide', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, A: Green, F: Yellow, G: Teal, K: Turquoise, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Cactoida Lapis', genus: 'Cactoida', value: 2_483_600, minDistance: 300, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, A: Green, F: Yellow, G: Teal, K: Turquoise, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Cactoida Peperatis', genus: 'Cactoida', value: 2_483_600, minDistance: 300, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, A: Green, F: Yellow, G: Teal, K: Turquoise, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Cactoida Pullulanta', genus: 'Cactoida', value: 3_667_600, minDistance: 300, atmosphere: 'Carbon Dioxide', temp: '180K - 195K', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, A: Green, F: Yellow, G: Teal, K: Turquoise, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Cactoida Vermis', genus: 'Cactoida', value: 16_202_800, minDistance: 300, atmosphere: 'Water', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Grey, A: Green, F: Yellow, G: Teal, K: Turquoise, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
    ],
  },
  // CLYPEUS
  {
    genus: 'Clypeus',
    species: [
      { species: 'Clypeus Lacrimam', genus: 'Clypeus', value: 8_418_000, minDistance: 150, atmosphere: 'Carbon Dioxide, Water', temp: '> 190K', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('B: Maroon, A: Orange, F: Mauve, G: Amethyst, K: Grey, M: Turquoise, L: Teal, Y: Green, D: Lime, N: Yellow') },
      { species: 'Clypeus Margaritus', genus: 'Clypeus', value: 11_873_200, minDistance: 150, atmosphere: 'Carbon Dioxide, Water', temp: '> 190K', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', starColors: parseStarColors('B: Maroon, A: Orange, F: Mauve, G: Amethyst, K: Grey, M: Turquoise, L: Teal, Y: Green, D: Lime, N: Yellow') },
      { species: 'Clypeus Speculumi', genus: 'Clypeus', value: 16_202_800, minDistance: 150, atmosphere: 'Carbon Dioxide, Water', temp: '> 190K', planetType: 'Rocky Body, High Metal Content Body', bodyDistance: '> 2,500 Ls', gravity: '0.27', starColors: parseStarColors('B: Maroon, A: Orange, F: Mauve, G: Amethyst, K: Grey, M: Turquoise, L: Teal, Y: Green, D: Lime, N: Yellow') },
    ],
  },
  // CONCHA
  {
    genus: 'Concha',
    species: [
      { species: 'Concha Aureolas', genus: 'Concha', value: 7_774_700, minDistance: 150, atmosphere: 'Ammonia', temp: 'Any', gravity: '0.27', starColors: parseStarColors('B: Indigo, A: Teal, F: Grey, G: Turquoise, K: Red, L: Orange, Y: Yellow, N: Emerald') },
      { species: 'Concha Biconcavis', genus: 'Concha', value: 16_777_215, minDistance: 150, atmosphere: 'Nitrogen', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Antimony (Peach), Polonium (Red), Ruthenium (Orange), Tellurium (Yellow)') },
      { species: 'Concha Labiata', genus: 'Concha', value: 2_352_400, minDistance: 150, atmosphere: 'Carbon Dioxide', temp: '< 190K', gravity: '0.27', starColors: parseStarColors('B: Indigo, A: Teal, F: Grey, G: Turquoise, K: Red, L: Orange, Y: Yellow, N: Emerald') },
      { species: 'Concha Renibus', genus: 'Concha', value: 4_572_400, minDistance: 150, atmosphere: 'Carbon Dioxide, Water', temp: '180K - 195K', gravity: '0.27', materialColors: parseMaterialColors('Grade 3: Cadmium (Red), Mercury (Mulberry), Molybdenum (Peach), Niobium (Blue), Tungsten (White), Tin (Aquamarine)') },
    ],
  },
  // CRYSTALLINE SHARD
  {
    genus: 'Crystalline Shard',
    species: [
      { species: 'Crystalline Shard', genus: 'Crystalline Shard', value: 3_626_400, minDistance: 100, atmosphere: 'None', temp: '0K - 273K', bodyDistance: '> 12000', starClass: 'A, F, G, K, M, S', systemRequirement: 'elw,ammonia,ggWater,ggAmmonia,waterGiant' },
    ],
  },
  // ELECTRICAE
  {
    genus: 'Electricae',
    species: [
      { species: 'Electricae Pluma', genus: 'Electricae', value: 6_284_600, minDistance: 1000, atmosphere: 'Helium, Neon, Argon', planetType: 'Icy Body', gravity: '0.27', starClass: 'A, N, D', materialColors: parseMaterialColors('Grade 4: Antimony (Cobalt), Polonium (Cyan), Ruthenium (Blue), Technetium (Magenta), Tellurium (Red), Yttrium (Mulberry)') },
      { species: 'Electricae Radialem', genus: 'Electricae', value: 6_284_600, minDistance: 1000, atmosphere: 'Helium, Neon, Argon, Nitrogen', planetType: 'Icy Body', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Antimony (Cyan), Polonium (Cobalt), Ruthenium (Blue), Technetium (Aquamarine), Tellurium (Magenta), Yttrium (Green)') },
    ],
  },
  // FUNGOIDA
  {
    genus: 'Fungoida',
    species: [
      { species: 'Fungoida Bullarum', genus: 'Fungoida', value: 3_703_200, minDistance: 300, atmosphere: 'Argon', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Antimony (Red), Polonium (Mulberry), Ruthenium (Magenta), Technetium (Peach), Tellurium (Gold), Yttrium (Orange)') },
      { species: 'Fungoida Gelata', genus: 'Fungoida', value: 2_680_300, minDistance: 300, atmosphere: 'Carbon Dioxide, Water', temp: '180K - 195K (CO2 only)', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Cadmium (Cyan), Mercury (Lime), Molybdenum (Mulberry), Niobium (Green), Tungsten (Orange), Tin (Red)') },
      { species: 'Fungoida Setisis', genus: 'Fungoida', value: 1_670_100, minDistance: 300, atmosphere: 'Ammonia, Methane', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Antimony (Peach), Polonium (White), Ruthenium (Gold), Technetium (Lime), Tellurium (Yellow), Yttrium (Orange)') },
      { species: 'Fungoida Stabitis', genus: 'Fungoida', value: 2_680_300, minDistance: 300, atmosphere: 'Carbon Dioxide, Water', temp: '180K - 195K (CO2 only)', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Cadmium (Blue), Mercury (Green), Molybdenum (Magenta), Niobium (White), Tungsten (Peach), Tin (Orange)') },
    ],
  },
  // OSSEUS
  {
    genus: 'Osseus',
    species: [
      { species: 'Osseus Cornibus', genus: 'Osseus', value: 1_483_000, minDistance: 800, atmosphere: 'Carbon Dioxide', temp: '180K - 195K', planetType: 'Rocky Body, High Metal Content Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Osseus Discus', genus: 'Osseus', value: 12_934_900, minDistance: 800, atmosphere: 'Water', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Osseus Fractus', genus: 'Osseus', value: 4_027_800, minDistance: 800, atmosphere: 'Carbon Dioxide', temp: '180K - 190K', planetType: 'Rocky Body, High Metal Content Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Osseus Pellebantus', genus: 'Osseus', value: 9_739_000, minDistance: 800, atmosphere: 'Carbon Dioxide', temp: '190K - 195K', planetType: 'Rocky Body, High Metal Content Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Osseus Pumice', genus: 'Osseus', value: 3_156_300, minDistance: 800, atmosphere: 'Methane, Argon, Nitrogen', temp: 'Any', planetType: 'Rocky Ice Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Osseus Spiralis', genus: 'Osseus', value: 2_404_700, minDistance: 800, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky Body, High Metal Content Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
    ],
  },
  // RECEPTA
  {
    genus: 'Recepta',
    species: [
      { species: 'Recepta Conditivus', genus: 'Recepta', value: 14_313_700, minDistance: 150, atmosphere: 'Sulfur Dioxide', planetType: 'Icy Body, Rocky Ice Body', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Antimony (Mulberry), Polonium (Cyan), Ruthenium (Aquamarine), Technetium (Green), Tellurium (Lime), Yttrium (Cobalt)') },
      { species: 'Recepta Deltahedronix', genus: 'Recepta', value: 16_202_800, minDistance: 150, atmosphere: 'Sulfur Dioxide', planetType: 'Rocky Body, High Metal Content Body', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Antimony (Mulberry), Polonium (Cyan), Ruthenium (Aquamarine), Technetium (Green), Tellurium (Lime), Yttrium (Cobalt)') },
      { species: 'Recepta Umbrux', genus: 'Recepta', value: 12_934_900, minDistance: 150, atmosphere: 'Sulfur Dioxide', planetType: 'All Types', gravity: '0.27', materialColors: parseMaterialColors('Grade 4: Antimony (Mulberry), Polonium (Cyan), Ruthenium (Aquamarine), Technetium (Green), Tellurium (Lime), Yttrium (Cobalt)') },
    ],
  },
  // SINUOUS TUBER
  {
    genus: 'Sinuous Tuber',
    species: [
      { species: 'Sinuous Tuber Albidum', genus: 'Sinuous Tuber', value: 3_425_600, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Body', volcanism: 'Any' },
      { species: 'Sinuous Tuber Blatteum', genus: 'Sinuous Tuber', value: 1_514_500, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', volcanism: 'Any' },
      { species: 'Sinuous Tuber Caeruleum', genus: 'Sinuous Tuber', value: 1_514_500, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Body', volcanism: 'Any' },
      { species: 'Sinuous Tuber Lindigoticum', genus: 'Sinuous Tuber', value: 1_514_500, minDistance: 100, atmosphere: 'None', planetType: 'Rocky Body', volcanism: 'Any' },
      { species: 'Sinuous Tuber Prasinum', genus: 'Sinuous Tuber', value: 1_514_500, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', volcanism: 'Any' },
      { species: 'Sinuous Tuber Roseus', genus: 'Sinuous Tuber', value: 1_514_500, minDistance: 100, atmosphere: 'None', planetType: 'Any', volcanism: 'Silicate Magma' },
      { species: 'Sinuous Tuber Violaceum', genus: 'Sinuous Tuber', value: 1_514_500, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', volcanism: 'Any' },
      { species: 'Sinuous Tuber Viride', genus: 'Sinuous Tuber', value: 1_514_500, minDistance: 100, atmosphere: 'None', planetType: 'Metal Rich Body, High Metal Content Body', volcanism: 'Any' },
    ],
  },
  // STRATUM
  {
    genus: 'Stratum',
    species: [
      { species: 'Stratum Araneamus', genus: 'Stratum', value: 2_448_900, minDistance: 500, atmosphere: 'Sulfur Dioxide', temp: '> 165K', planetType: 'Rocky Body', starColors: parseStarColors('O: Grey, B: Emerald, A: Lime, F: Green, G: Yellow, K: Teal/Lime, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Sage, N: Turquoise') },
      { species: 'Stratum Cucumisis', genus: 'Stratum', value: 16_202_800, minDistance: 500, atmosphere: 'Sulfur Dioxide, Carbon Dioxide', temp: '> 190K', planetType: 'Rocky Body', starColors: parseStarColors('O: Grey, B: Emerald, A: Lime, F: Green, G: Yellow, K: Teal/Lime, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Sage, N: Turquoise') },
      { species: 'Stratum Excutitus', genus: 'Stratum', value: 2_448_900, minDistance: 500, atmosphere: 'Sulfur Dioxide, Carbon Dioxide', temp: '165K - 190K', planetType: 'Rocky Body', starColors: parseStarColors('O: Grey, B: Emerald, A: Lime, F: Green, G: Yellow, K: Teal/Lime, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Sage, N: Turquoise') },
      { species: 'Stratum Frigus', genus: 'Stratum', value: 2_637_500, minDistance: 500, atmosphere: 'Sulfur Dioxide, Carbon Dioxide', temp: '> 190K', planetType: 'Rocky Body', starColors: parseStarColors('O: Grey, B: Emerald, A: Lime, F: Green, G: Yellow, K: Teal/Lime, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Sage, N: Turquoise') },
      { species: 'Stratum Laminamus', genus: 'Stratum', value: 2_788_300, minDistance: 500, atmosphere: 'Ammonia', temp: '> 165K', planetType: 'Rocky Body', starColors: parseStarColors('O: Grey, B: Emerald, A: Lime, F: Green, G: Yellow, K: Teal/Lime, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Sage, N: Turquoise') },
      { species: 'Stratum Limaxus', genus: 'Stratum', value: 1_362_000, minDistance: 500, atmosphere: 'Sulfur Dioxide, Carbon Dioxide', temp: '165K - 190K', planetType: 'Rocky Body', starColors: parseStarColors('O: Grey, B: Emerald, A: Lime, F: Green, G: Yellow, K: Teal/Lime, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Sage, N: Turquoise') },
      { species: 'Stratum Paleas', genus: 'Stratum', value: 1_362_000, minDistance: 500, atmosphere: 'Carbon Dioxide, Sulfur Dioxide, Ammonia, Water', temp: '> 165K', planetType: 'Rocky Body', starColors: parseStarColors('O: Grey, B: Emerald, A: Lime, F: Green, G: Yellow, K: Teal/Lime, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Sage, N: Turquoise') },
      { species: 'Stratum Tectonicas', genus: 'Stratum', value: 19_010_800, minDistance: 500, atmosphere: 'Any', temp: '> 165K', planetType: 'High Metal Content Body', starColors: parseStarColors('O: Grey, B: Emerald, A: Lime, F: Green, G: Yellow, K: Teal/Lime, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Sage, N: Turquoise') },
    ],
  },
  // THARGOID
  {
    genus: 'Thargoid',
    species: [
      { species: 'Thargoid Spires', genus: 'Thargoid', value: 2_247_100, minDistance: 100 },
      { species: 'Thargoid Mega Barnacles', genus: 'Thargoid', value: 2_313_500, minDistance: 100 },
      { species: 'Thargoid Coral Tree', genus: 'Thargoid', value: 1_896_800, minDistance: 100 },
      { species: 'Thargoid Coral Root', genus: 'Thargoid', value: 1_924_600, minDistance: 100 },
    ],
  },
  // TUBUS
  {
    genus: 'Tubus',
    species: [
      { species: 'Tubus Cavas', genus: 'Tubus', value: 11_873_200, minDistance: 800, atmosphere: 'Carbon Dioxide', temp: '160K - 190K', planetType: 'Rocky Body', gravity: '0.15', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Tubus Compagibus', genus: 'Tubus', value: 7_774_700, minDistance: 800, atmosphere: 'Carbon Dioxide', temp: '160K - 190K', planetType: 'Rocky Body', gravity: '0.15', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Tubus Conifer', genus: 'Tubus', value: 2_415_500, minDistance: 800, atmosphere: 'Carbon Dioxide', temp: '160K - 190K', planetType: 'Rocky Body', gravity: '0.15', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Tubus Rosarium', genus: 'Tubus', value: 2_637_500, minDistance: 800, atmosphere: 'Ammonia', temp: '> 160K', planetType: 'Rocky Body', gravity: '0.15', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Tubus Sororibus', genus: 'Tubus', value: 5_727_600, minDistance: 800, atmosphere: 'Ammonia, Carbon Dioxide', temp: '160K - 190K', planetType: 'High Metal Content Body', gravity: '0.15', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
    ],
  },
  // FONTICULUA (no ED_data doc - kept from estimator)
  {
    genus: 'Fonticulua',
    species: [
      { species: 'Fonticulua Campestris', genus: 'Fonticulua', value: 1_000_000, minDistance: 500, atmosphere: 'Argon', planetType: 'Icy Body, Rocky Ice Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Fonticulua Digitos', genus: 'Fonticulua', value: 1_804_100, minDistance: 500, atmosphere: 'Methane', planetType: 'Icy Body, Rocky Ice Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Fonticulua Fluctus', genus: 'Fonticulua', value: 16_777_215, minDistance: 500, atmosphere: 'Oxygen', planetType: 'Icy Body, Rocky Ice Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Fonticulua Lapida', genus: 'Fonticulua', value: 3_111_000, minDistance: 500, atmosphere: 'Nitrogen', planetType: 'Icy Body, Rocky Ice Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Fonticulua Segmentatus', genus: 'Fonticulua', value: 19_010_800, minDistance: 500, atmosphere: 'Neon', planetType: 'Icy Body, Rocky Ice Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
      { species: 'Fonticulua Upupam', genus: 'Fonticulua', value: 5_727_600, minDistance: 500, atmosphere: 'Argon-Rich', planetType: 'Icy Body, Rocky Ice Body', gravity: '0.27', starColors: parseStarColors('O: Grey, B: Lime, A: Green, F: Yellow, G: Teal, K: Emerald, M: Amethyst, L: Mauve, T: Orange, TTS: Red, Y: Ocher, W: Indigo, D: Turquoise, N: Sage') },
    ],
  },
  // FUMEROLA (no ED_data doc - kept from estimator)
  {
    genus: 'Fumerola',
    species: [
      { species: 'Fumerola Aquatis', genus: 'Fumerola', value: 6_284_600, minDistance: 100, planetType: 'Icy Body, Rocky Ice Body', volcanism: 'Water', starColors: parseStarColors('O: Green, B: Lime, A: Yellow, F: Aquamarine, G: Teal, K: Turquoise, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Ocher, D: Indigo, N: Grey') },
      { species: 'Fumerola Carbosis', genus: 'Fumerola', value: 6_284_600, minDistance: 100, planetType: 'Icy Body, Rocky Ice Body', volcanism: 'Methane, Carbon Dioxide', starColors: parseStarColors('O: Green, B: Lime, A: Yellow, F: Aquamarine, G: Teal, K: Turquoise, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Ocher, D: Indigo, N: Grey') },
      { species: 'Fumerola Extremus', genus: 'Fumerola', value: 16_202_800, minDistance: 100, planetType: 'Rocky Body, High Metal Content Body', volcanism: 'Silicate, Iron, Rocky', starColors: parseStarColors('O: Green, B: Lime, A: Yellow, F: Aquamarine, G: Teal, K: Turquoise, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Ocher, D: Indigo, N: Grey') },
      { species: 'Fumerola Nitris', genus: 'Fumerola', value: 7_500_900, minDistance: 100, planetType: 'Icy Body, Rocky Ice Body', volcanism: 'Nitrogen, Ammonia', starColors: parseStarColors('O: Green, B: Lime, A: Yellow, F: Aquamarine, G: Teal, K: Turquoise, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Ocher, D: Indigo, N: Grey') },
    ],
  },
  // FRUTEXA (no ED_data doc - kept from estimator)
  {
    genus: 'Frutexa',
    species: [
      { species: 'Frutexa Acus', genus: 'Frutexa', value: 7_774_700, minDistance: 150, atmosphere: 'Carbon Dioxide', planetType: 'Rocky Body', gravity: '0.27', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Turquoise/Indigo, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Frutexa Collum', genus: 'Frutexa', value: 1_639_800, minDistance: 150, atmosphere: 'Sulfur Dioxide', planetType: 'Rocky Body', gravity: '0.27', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Turquoise/Indigo, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Frutexa Fera', genus: 'Frutexa', value: 1_632_500, minDistance: 150, atmosphere: 'Carbon Dioxide', planetType: 'Rocky Body', gravity: '0.27', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Turquoise/Indigo, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Frutexa Flabellum', genus: 'Frutexa', value: 1_808_900, minDistance: 150, atmosphere: 'Ammonia', planetType: 'Rocky Body', gravity: '0.27', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Turquoise/Indigo, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Frutexa Flammasis', genus: 'Frutexa', value: 10_326_000, minDistance: 150, atmosphere: 'Ammonia', planetType: 'Rocky Body', gravity: '0.27', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Turquoise/Indigo, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Frutexa Metallicum', genus: 'Frutexa', value: 1_632_500, minDistance: 150, atmosphere: 'Ammonia, Carbon Dioxide', planetType: 'High Metal Content Body', gravity: '0.27', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Turquoise/Indigo, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Frutexa Sponsae', genus: 'Frutexa', value: 5_988_000, minDistance: 150, atmosphere: 'Water', planetType: 'Rocky Body', gravity: '0.27', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Green, G: Lime, K: Turquoise/Indigo, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
    ],
  },
  // TUSSOCK
  {
    genus: 'Tussock',
    species: [
      { species: 'Tussock Albata', genus: 'Tussock', value: 3_252_500, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '175K - 180K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Capillum', genus: 'Tussock', value: 7_025_800, minDistance: 200, atmosphere: 'Methane, Argon', temp: 'Any', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Caputus', genus: 'Tussock', value: 3_472_400, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '180K - 190K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Catena', genus: 'Tussock', value: 1_766_600, minDistance: 200, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Cultro', genus: 'Tussock', value: 1_766_600, minDistance: 200, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Divisa', genus: 'Tussock', value: 1_766_600, minDistance: 200, atmosphere: 'Ammonia', temp: 'Any', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Ignis', genus: 'Tussock', value: 1_849_000, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '160K - 170K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Pennata', genus: 'Tussock', value: 5_853_800, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '145K - 155K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Pennatis', genus: 'Tussock', value: 1_000_000, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '< 195K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Propagito', genus: 'Tussock', value: 1_000_000, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '< 195K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Serrati', genus: 'Tussock', value: 4_447_100, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '170K - 175K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Stigmasis', genus: 'Tussock', value: 19_010_800, minDistance: 200, atmosphere: 'Sulfur Dioxide', temp: 'Any', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Triticum', genus: 'Tussock', value: 7_774_700, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '190K - 195K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Ventusa', genus: 'Tussock', value: 3_277_700, minDistance: 200, atmosphere: 'Carbon Dioxide', temp: '155K - 160K', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
      { species: 'Tussock Virgam', genus: 'Tussock', value: 14_313_700, minDistance: 200, atmosphere: 'Water', temp: 'Any', planetType: 'Rocky Body', starColors: parseStarColors('O: Turquoise, B: Grey, A: Yellow, F: Lime, G: Green, K: Teal, M: Emerald, L: Sage, T: Red, TTS: Maroon, Y: Mauve, W: Amethyst, D: Ocher, N: Indigo') },
    ],
  },
];

/** All species entries flattened for lookups. */
export const ALL_SPECIES: SpeciesData[] = RAW_SPECIES.flatMap((g) => g.species);

/** Build SPECIES_VALUES map from species data. */
export function buildSpeciesValues(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const s of ALL_SPECIES) {
    map[s.species] = s.value;
  }
  return map;
}

/** Build GENUS_SAMPLE_DISTANCES map. */
export function buildGenusSampleDistances(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const g of RAW_SPECIES) {
    const dist = g.species[0]?.minDistance ?? 0;
    if (dist > 0) map[g.genus] = dist;
  }
  return map;
}

/** Build GENUS_VALUE_RANGES map. */
export function buildGenusValueRanges(): Record<string, { min: number; max: number }> {
  const map: Record<string, { min: number; max: number }> = {};
  for (const g of RAW_SPECIES) {
    const values = g.species.map((s) => s.value).filter((v) => v > 0);
    if (values.length > 0) {
      map[g.genus] = { min: Math.min(...values), max: Math.max(...values) };
    }
  }
  return map;
}

export { RAW_SPECIES };

/** Estimator rule format - matches exobiologyEstimator's GenusRule/SpeciesRule. */
export interface EstimatorSpeciesRule {
  species: string;
  baseValue: number;
  atmosphere?: string | undefined;
  temp?: string | undefined;
  planetType?: string | undefined;
  volcanism?: string | undefined;
  distMinLs?: number | undefined;
  starClass?: string | undefined;
  materialColors?: Record<string, string> | undefined;
  starColors?: Record<string, string> | undefined;
}

export interface EstimatorGenusRule {
  genus: string;
  planetTypes?: string | undefined;
  maxGravity?: number | undefined;
  atmosphere?: string | undefined;
  volcanism?: string | undefined;
  starClasses?: string | undefined;
  tempMin?: number | undefined;
  tempMax?: number | undefined;
  distMinLs?: number | undefined;
  systemHas?: string[] | undefined;
  species: EstimatorSpeciesRule[];
  starColors?: Record<string, string> | undefined;
}

function parseDistMinLs(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const m = s.match(/>\s*([\d,]+)\s*Ls?/i);
  return m && m[1] != null ? parseInt(m[1].replace(/,/g, ''), 10) : undefined;
}

/** Build genus rules for the exobiology estimator from species data. */
export function buildEstimatorGenusRules(): EstimatorGenusRule[] {
  const rules: EstimatorGenusRule[] = [];

  for (const g of RAW_SPECIES) {
    // Skip genera not suitable for body-based estimation (Thargoid, Amphora, etc. have special reqs)
    const skipGenera = ['Thargoid', 'Amphora Plant', 'Anemone', 'Bark Mound', 'Brain Tree', 'Crystalline Shard', 'Electricae'];
    if (skipGenera.includes(g.genus)) continue;

    const species: EstimatorSpeciesRule[] = [];
    let genusPlanetTypes: Set<string> | null = null;
    let genusMaxGravity: number | undefined;
    let genusAtmosphere: string | undefined;
    let genusVolcanism: string | undefined;
    let genusStarColors: Record<string, string> | undefined;
    let genusTempMin: number | undefined;
    let genusTempMax: number | undefined;
    let genusSystemHas: string[] | undefined;

    for (const s of g.species) {
      if (s.planetType && !/^any|all types$/i.test(s.planetType.trim())) {
        genusPlanetTypes = genusPlanetTypes ?? new Set();
        s.planetType.split(',').forEach((p) => {
          const t = p.trim();
          if (t && !/^any$/i.test(t)) genusPlanetTypes!.add(t);
        });
      }
      if (s.gravity) {
        const val = parseFloat(s.gravity.replace(/[≤\s>g]/gi, ''));
        if (!isNaN(val) && (genusMaxGravity == null || val < genusMaxGravity)) genusMaxGravity = val;
      }
      if (s.atmosphere && !genusAtmosphere) genusAtmosphere = s.atmosphere;
      if (s.volcanism && !genusVolcanism) genusVolcanism = s.volcanism;
      if (s.starColors && !s.materialColors && !genusStarColors) genusStarColors = s.starColors;
      if (s.systemRequirement) {
        genusSystemHas = s.systemRequirement.split(',').map((x) => x.trim());
      }
      // Extract genus tempMin from "> XK" temps
      if (s.temp) {
        const gt = s.temp.match(/>\s*(\d+)\s*K/i);
        if (gt && gt[1] != null) {
          const v = parseInt(gt[1], 10);
          if (genusTempMin == null || v > genusTempMin) genusTempMin = v;
        }
      }

      const distMinLs = parseDistMinLs(s.bodyDistance);
      species.push({
        species: s.species,
        baseValue: s.value,
        atmosphere: s.atmosphere,
        temp: s.temp,
        planetType: s.planetType,
        volcanism: s.volcanism,
        distMinLs,
        starClass: s.starClass,
        materialColors: s.materialColors,
        starColors: s.materialColors ? undefined : s.starColors,
      });
    }

    // Derive genus-level
    const planetTypes = genusPlanetTypes && genusPlanetTypes.size > 0 ? [...genusPlanetTypes].join(', ') : undefined;
    const rule: EstimatorGenusRule = {
      genus: g.genus,
      planetTypes,
      maxGravity: genusMaxGravity,
      atmosphere: genusAtmosphere,
      volcanism: genusVolcanism,
      species,
      starColors: genusStarColors,
      systemHas: genusSystemHas,
      tempMin: genusTempMin,
      tempMax: genusTempMax,
    };
    // Genus-level overrides from docs
    if (g.genus === 'Fumerola') rule.volcanism = 'Any';
    if (g.genus === 'Sinuous Tuber') {
      rule.atmosphere = 'None';
      rule.volcanism = 'Any';
    }
    if (g.genus === 'Recepta') rule.atmosphere = 'Sulfur Dioxide';

    rules.push(rule);
  }

  return rules;
}
