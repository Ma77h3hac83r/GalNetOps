/**
 * Exobiology value formulas: species name → Vista Genomics CR value (sample+analyse).
 * Species data from documentation/ED_data/Exobiological_Species; keyed by canonical species name.
 */
import { normalizeSpeciesName } from './normalization';

/** Exobiology species CR values (sample+analyse); keyed by canonical species name (snake_case). */
const BIOLOGICAL_ENTRIES: Array<[string, number]> = [
  ['Aleoida Arcus', 7252500], ['Aleoida Coronamus', 6284600], ['Aleoida Gravis', 12934900], ['Aleoida Laminiae', 3385200], ['Aleoida Spica', 3385200],
  ['Bacterium Acies', 1000000], ['Bacterium Alcyoneum', 1658500], ['Bacterium Aurasus', 1000000], ['Bacterium Bullaris', 1152500], ['Bacterium Cerbrus', 1689800],
  ['Bacterium Informem', 8418000], ['Bacterium Nebulus', 5289900], ['Bacterium Omentum', 4638900], ['Bacterium Scopulum', 4934500], ['Bacterium Tela', 1949000],
  ['Bacterium Verrata', 3897000], ['Bacterium Vesicula', 1000000], ['Bacterium Volu', 7774700],
  ['Cactoida Cortexum', 3667600], ['Cactoida Lapis', 2483600], ['Cactoida Peperatis', 2483600], ['Cactoida Pullulanta', 3667600], ['Cactoida Vermis', 16202800],
  ['Clypeus Lacrimam', 8418000], ['Clypeus Margaritus', 11873200], ['Clypeus Speculumi', 16202800],
  ['Concha Aureolas', 7774700], ['Concha Biconcavis', 19010800], ['Concha Labiata', 2352400], ['Concha Renibus', 4572400],
  ['Electricae Pluma', 6284600], ['Electricae Radialem', 6284600],
  ['Fonticulua Campestris', 1000000], ['Fonticulua Digitos', 5988900], ['Fonticulua Fluctus', 20000000], ['Fonticulua Lapida', 3111000], ['Fonticulua Segmentatus', 19010800], ['Fonticulua Upupam', 5727600],
  ['Frutexa Acus', 7774700], ['Frutexa Collum', 1639800], ['Frutexa Fera', 1632500], ['Frutexa Flabellum', 1808900], ['Frutexa Flammasis', 10326000], ['Frutexa Metallicum', 1632500], ['Frutexa Sponsae', 5988900],
  ['Fumerola Aquatis', 6284600], ['Fumerola Carbosis', 6284600], ['Fumerola Extremus', 16202800], ['Fumerola Nitris', 7500900],
  ['Fungoida Bullarum', 3703200], ['Fungoida Gelata', 3330300], ['Fungoida Setisis', 1670100], ['Fungoida Stabitis', 2680300],
  ['Osseus Cornibus', 1483000], ['Osseus Discus', 12934900], ['Osseus Fractus', 4027800], ['Osseus Pellebantus', 9739000], ['Osseus Pumice', 3156300], ['Osseus Spiralis', 2404700],
  ['Recepta Conditivus', 14313700], ['Recepta Deltahedronix', 16202800], ['Recepta Umbrux', 12934900],
  ['Stratum Araneamus', 2448900], ['Stratum Cucumisis', 16202800], ['Stratum Excutitus', 2448900], ['Stratum Frigus', 2637500], ['Stratum Laminamus', 2788300], ['Stratum Limaxus', 1362000], ['Stratum Paleas', 1362000], ['Stratum Tectonicas', 19010800],
  ['Tubus Cavas', 11873200], ['Tubus Compagibus', 7774700], ['Tubus Conifer', 2415500], ['Tubus Rosarium', 2637500], ['Tubus Sororibus', 5727600],
  ['Tussock Albata', 3252500], ['Tussock Capillum', 7025800], ['Tussock Caputus', 3472400], ['Tussock Catena', 1766600], ['Tussock Cultro', 1766600], ['Tussock Divisa', 1766600], ['Tussock Ignis', 1849000], ['Tussock Pennata', 5853800], ['Tussock Pennatis', 1000000], ['Tussock Propagito', 1000000], ['Tussock Serrati', 4447100], ['Tussock Stigmasis', 19010800], ['Tussock Triticum', 7774700], ['Tussock Ventusa', 3227700], ['Tussock Virgam', 14313700],
];

export const BIOLOGICAL_VALUES: Record<string, number> = Object.fromEntries(
  BIOLOGICAL_ENTRIES.map(([name, value]) => [normalizeSpeciesName(name), value])
);

/** Lookup biological value by species name (case-insensitive via canonical key). */
export function getBiologicalValue(speciesName: string): number {
  const canonical = normalizeSpeciesName(speciesName);
  return BIOLOGICAL_VALUES[canonical] ?? 0;
}
