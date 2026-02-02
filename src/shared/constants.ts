/** Lowest FSS base values from BODY_SCAN_DATA_VALUES.md (low end of documented ranges); keyed by StarType/PlanetClass. */
export const BASE_SCAN_VALUES: Record<string, number> = {
  // Main sequence stars (FSS only; value varies with mass) (FSS only; value varies with mass)
  'Star': 2887,
  'O (Blue-White) Star': 4170,
  'B (Blue-White) Star': 3012,
  'A (Blue-White) Star': 2950,
  'F (White) Star': 2932,
  'G (White-Yellow) Star': 2923,
  'K (Yellow-Orange) Star': 2911,
  'M (Red dwarf) Star': 2887,
  'L (Brown dwarf) Star': 2881,
  'T (Brown dwarf) Star': 2881,
  'Y (Brown dwarf) Star': 2881,
  // Special stellar
  'Neutron Star': 22000,
  'Black Hole': 22000,
  'White Dwarf': 14000,
  'Wolf-Rayet Star': 2900,
  'Carbon Star': 2900,
  'S-Type Star': 2900,
  'Herbig Ae/Be Star': 2900,
  'T Tauri Star': 2900,
  // Terrestrial
  'Earth-Like World': 270000,
  'Ammonia World': 143000,
  'Water World': 99000,
  'Metal Rich Body': 31000,
  'High Metal Content World': 14000,
  'Rocky Body': 500,
  'Rocky Ice Body': 500,
  'Icy Body': 500,
  'Rocky Ice World': 500,
  // Gas giants
  'Gas Giant with Water-Based Life': 900,
  'Gas Giant with Ammonia-Based Life': 900,
  'Class I Gas Giant': 3800,
  'Class II Gas Giant': 28000,
  'Class III Gas Giant': 900,
  'Class IV Gas Giant': 900,
  'Class V Gas Giant': 900,
  'Helium Rich Gas Giant': 900,
  'Helium Gas Giant': 900,
  'Water Giant': 900,
  'Water Giant with Life': 900,
  // Journal/display aliases (lowercase etc.)
  'Earthlike body': 270000,
  'Earthlike Body': 270000,
  'High Metal Content Body': 14000,
  'Rocky body': 500,
  'Rocky ice body': 500,
  'Icy body': 500,
  'Ammonia world': 143000,
  'Helium rich gas giant': 900,
  'Helium gas giant': 900,
  'Water world': 99000,
  'Water giant': 900,
  'Water giant with life': 900,
  'Gas giant with water based life': 900,
  'Gas giant with ammonia based life': 900,
  'Sudarsky class I gas giant': 3800,
  'Sudarsky class II gas giant': 28000,
  'Sudarsky class III gas giant': 900,
  'Sudarsky class IV gas giant': 900,
  'Sudarsky class V gas giant': 900,
  'Sudarsky Class I Gas Giant': 3800,
  'Sudarsky Class II Gas Giant': 28000,
  'Sudarsky Class III Gas Giant': 900,
  'Sudarsky Class IV Gas Giant': 900,
  'Sudarsky Class V Gas Giant': 900,
};

/** Terraformable additive bonus (lowest from doc: terraformable FSS low − non-terra FSS low). */
export const TERRAFORMABLE_BONUS: Record<string, number> = {
  'High Metal Content World': 149000,   // 163000 - 14000
  'High Metal Content Body': 149000,
  'Metal rich body': 0,
  'Rocky Body': 128500,                // 129000 - 500
  'Rocky body': 128500,
  'Water world': 169000,               // 268000 - 99000
  'Water World': 169000,
};

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

/** Reference values (lowest from doc) for display/reference; keyed by body subType. */
export const BODY_SCAN_REFERENCE_VALUES: Record<string, ScanReferenceValues> = {
  'Ammonia World': { fss: 143000, fssFd: 214500, fssDss: 570000, fssFdDss: 855000, medianMass: 0.43914 },
  'Earth-Like World': { fss: 270000, fssFd: 405000, fssDss: 1100000, fssFdDss: 1650000, medianMass: 0.498039 },
  'Water World': { fss: 99000, fssFd: 148500, fssDss: 396000, fssFdDss: 594000, medianMass: 0.780638 },
  'High Metal Content World': { fss: 14000, fssFd: 21000, fssDss: 56000, fssFdDss: 84000, medianMass: 0.344919 },
  'Icy Body': { fss: 500, fssFd: 750, fssDss: 1500, fssFdDss: 2250, medianMass: 0.01854 },
  'Metal Rich Body': { fss: 31000, fssFd: 46500, fssDss: 124000, fssFdDss: 186000, medianMass: 0.323933 },
  'Rocky Body': { fss: 500, fssFd: 750, fssDss: 1500, fssFdDss: 2250, medianMass: 0.003359 },
  'Rocky Ice Body': { fss: 500, fssFd: 750, fssDss: 1500, fssFdDss: 2250, medianMass: 0.180686 },
  'Class I Gas Giant': { fss: 3800, fssFd: 5700, fssDss: 15200, fssFdDss: 22800, medianMass: 69.551636 },
  'Class II Gas Giant': { fss: 28000, fssFd: 42000, fssDss: 112000, fssFdDss: 168000, medianMass: 476.240875 },
  'Class III Gas Giant': { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 1148.921509 },
  'Class IV Gas Giant': { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 2615.635376 },
  'Class V Gas Giant': { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 925.575806 },
  'Gas Giant with Ammonia-Based Life': { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 170.455071 },
  'Gas Giant with Water-Based Life': { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 477.001832 },
  'Helium Rich Gas Giant': { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 550.141846 },
  'Water Giant': { fss: 900, fssFd: 1350, fssDss: 3600, fssFdDss: 5400, medianMass: 47.163769 },
};

export const TERRAFORMABLE_SCAN_REFERENCE_VALUES: Record<string, ScanReferenceValues> = {
  'Water World': { fss: 268000, fssFd: 402000, fssDss: 1070000, fssFdDss: 1605000, medianMass: 0.453011 },
  'High Metal Content World': { fss: 163000, fssFd: 244500, fssDss: 650000, fssFdDss: 975000, medianMass: 0.466929 },
  'Rocky Body': { fss: 129000, fssFd: 193500, fssDss: 516000, fssFdDss: 774000, medianMass: 0.142312 },
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

  const baseValue = BASE_SCAN_VALUES[subType] || 500;
  
  const terraformBonus = (terraformable && TERRAFORMABLE_BONUS[subType]) 
    ? TERRAFORMABLE_BONUS[subType] 
    : 0;
  
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
  const baseValue = BASE_SCAN_VALUES[subType] || 500;
  const terraformBonus = (terraformable && TERRAFORMABLE_BONUS[subType]) ? TERRAFORMABLE_BONUS[subType] : 0;
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
  const baseValue = BASE_SCAN_VALUES[subType] || 500;
  const terraformBonus = (terraformable && TERRAFORMABLE_BONUS[subType]) ? TERRAFORMABLE_BONUS[subType] : 0;
  const subtotal = baseValue + terraformBonus;
  if (bodyType === 'Star') {
    return Math.round(subtotal * FIRST_DISCOVERY_MULTIPLIER);
  }
  const mappingMultiplier = DSS_MAPPING_MULTIPLIER * FIRST_MAPPED_MULTIPLIER;
  return Math.round(subtotal * FIRST_DISCOVERY_MULTIPLIER * mappingMultiplier);
}

/** SubType strings that are always high-value (ELW, ammonia, water world); used for route history highlights. */
export const HIGH_VALUE_BODY_TYPES = [
  'Earthlike body',
  'Earth-like world',
  'Ammonia world',
  'Water world',
];

/** SubTypes that are high-value only when terraformable (HMC, rocky, water); used for route history highlights. */
export const HIGH_VALUE_IF_TERRAFORMABLE = [
  'High Metal Content World',
  'Rocky Body',
  'Water world',
];

/** Exobiology species name → CR value (sample+analyse); used for biological scan value and codex. */
export const BIOLOGICAL_VALUES: Record<string, number> = {
  'Aleoida Arcus': 7252500,
  'Aleoida Coronamus': 6284600,
  'Aleoida Gravis': 12934900,
  'Aleoida Laminiae': 3385200,
  'Aleoida Spica': 3385200,
  'Bacterium Acies': 1000000,
  'Bacterium Alcyoneum': 1658500,
  'Bacterium Aurasus': 1000000,
  'Bacterium Bullaris': 1152500,
  'Bacterium Cerbrus': 1689800,
  'Bacterium Informem': 8418000,
  'Bacterium Nebulus': 5289900,
  'Bacterium Omentum': 4638900,
  'Bacterium Scopulum': 4934500,
  'Bacterium Tela': 1949000,
  'Bacterium Verrata': 3897000,
  'Bacterium Vesicula': 1000000,
  'Bacterium Volu': 7774700,
  'Cactoida Cortexum': 3667600,
  'Cactoida Lapis': 2483600,
  'Cactoida Peperatis': 2483600,
  'Cactoida Pullulanta': 3667600,
  'Cactoida Vermis': 16202800,
  'Clypeus Lacrimam': 8418000,
  'Clypeus Margaritus': 11873200,
  'Clypeus Speculumi': 16202800,
  'Concha Aureolas': 7774700,
  'Concha Biconcavis': 19010800,
  'Concha Labiata': 2352400,
  'Concha Renibus': 4572400,
  'Electricae Pluma': 6284600,
  'Electricae Radialem': 6284600,
  'Fonticulua Campestris': 1000000,
  'Fonticulua Digitos': 5988900,
  'Fonticulua Fluctus': 20000000,
  'Fonticulua Lapida': 3111000,
  'Fonticulua Segmentatus': 19010800,
  'Fonticulua Upupam': 5727600,
  'Frutexa Acus': 7774700,
  'Frutexa Collum': 1639800,
  'Frutexa Fera': 1632500,
  'Frutexa Flabellum': 1808900,
  'Frutexa Flammasis': 10326000,
  'Frutexa Metallicum': 1632500,
  'Frutexa Sponsae': 5988900,
  'Fumerola Aquatis': 6284600,
  'Fumerola Carbosis': 6284600,
  'Fumerola Extremus': 16202800,
  'Fumerola Nitris': 7500900,
  'Fungoida Bullarum': 3703200,
  'Fungoida Gelata': 3330300,
  'Fungoida Setisis': 1670100,
  'Fungoida Stabitis': 2680300,
  'Osseus Cornibus': 1483000,
  'Osseus Discus': 12934900,
  'Osseus Fractus': 4027800,
  'Osseus Pellebantus': 9739000,
  'Osseus Pumice': 3156300,
  'Osseus Spiralis': 2404700,
  'Recepta Conditivus': 14313700,
  'Recepta Deltahedronix': 16202800,
  'Recepta Umbrux': 12934900,
  'Stratum Araneamus': 2448900,
  'Stratum Cucumisis': 16202800,
  'Stratum Excutitus': 2448900,
  'Stratum Frigus': 2637500,
  'Stratum Laminamus': 2788300,
  'Stratum Limaxus': 1362000,
  'Stratum Paleas': 1362000,
  'Stratum Tectonicas': 19010800,
  'Tubus Cavas': 11873200,
  'Tubus Compagibus': 7774700,
  'Tubus Conifer': 2415500,
  'Tubus Rosarium': 2637500,
  'Tubus Sororibus': 5727600,
  'Tussock Albata': 3252500,
  'Tussock Capillum': 7025800,
  'Tussock Caputus': 3472400,
  'Tussock Catena': 1766600,
  'Tussock Cultro': 1766600,
  'Tussock Divisa': 1766600,
  'Tussock Ignis': 1849000,
  'Tussock Pennata': 5853800,
  'Tussock Pennatis': 1000000,
  'Tussock Propagito': 1000000,
  'Tussock Serrati': 4447100,
  'Tussock Stigmasis': 19010800,
  'Tussock Triticum': 7774700,
  'Tussock Ventusa': 3227700,
  'Tussock Virgam': 14313700,
};

/** All known Elite Dangerous star type codes (main sequence, dwarfs, neutron, etc.); used for type mapping. */
export const STAR_TYPES = [
  'O', 'B', 'A', 'F', 'G', 'K', 'M', 'L', 'T', 'Y',
  'TTS', 'AeBe', 'W', 'WN', 'WNC', 'WC', 'WO',
  'CS', 'C', 'CN', 'CJ', 'CH', 'CHd',
  'MS', 'S',
  'D', 'DA', 'DAB', 'DAO', 'DAZ', 'DAV', 'DB', 'DBZ', 'DBV', 'DO', 'DOV', 'DQ', 'DC', 'DCV', 'DX',
  'N', 'H', 'SupermassiveBlackHole',
];

/** All known Elite Dangerous planet class strings; used for type mapping and validation. */
export const PLANET_CLASSES = [
  'Metal rich body',
  'High Metal Content World',
  'Rocky Body',
  'Rocky ice body',
  'Icy Body',
  'Earthlike body',
  'Earth-like world',
  'Water world',
  'Ammonia world',
  'Water giant',
  'Water giant with life',
  'Gas Giant with Water-Based Life',
  'Gas Giant with Ammonia-Based Life',
  'Class I Gas Giant',
  'Class II Gas Giant',
  'Class III Gas Giant',
  'Class IV Gas Giant',
  'Class V Gas Giant',
  'Helium rich gas giant',
  'Helium gas giant',
];

/** Journal event names we listen for; used by journal-watcher and main index. */
export const JOURNAL_EVENTS = {
  FILEHEADER: 'Fileheader',
  LOAD_GAME: 'LoadGame',
  CONTINUED: 'Continued',
  SHUTDOWN: 'Shutdown',
  FSD_JUMP: 'FSDJump',
  CARRIER_JUMP: 'CarrierJump',
  LOCATION: 'Location',
  FSS_DISCOVERY_SCAN: 'FSSDiscoveryScan',
  FSS_ALL_BODIES_FOUND: 'FSSAllBodiesFound',
  NAV_ROUTE: 'NavRoute',
  NAV_ROUTE_CLEAR: 'NavRouteClear',
  TOUCHDOWN: 'Touchdown',
  LIFTOFF: 'Liftoff',
  SCAN: 'Scan',
  SAA_SCAN_COMPLETE: 'SAAScanComplete',
  FSS_BODY_SIGNALS: 'FSSBodySignals',
  SAA_SIGNALS_FOUND: 'SAASignalsFound',
  SCAN_ORGANIC: 'ScanOrganic',
  CODEX_ENTRY: 'CodexEntry',
} as const;

/** Default Elite Dangerous journal folder (Windows); used when journal path is not set. */
export const DEFAULT_JOURNAL_PATH = '%USERPROFILE%\\Saved Games\\Frontier Developments\\Elite Dangerous';

/** EDSM API base URL and rate limit (1 req/s) for system/bodies lookups. */
export const EDSM_API_BASE = 'https://www.edsm.net';
export const EDSM_RATE_LIMIT_MS = 1000; // 1 request per second

/** SQLite database filename; stored in app user data. */
export const DB_NAME = 'galnetops.db';
