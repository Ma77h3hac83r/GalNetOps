/** Details panel for selected body: star/planet image, scan info, signals, biologicals list with genus/species estimator and sample distance; resizable width. */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelectedBody, useAppStore, useCurrentSystem, useEdsmSpoilerFree, useBodies } from '../stores/appStore';
import type { Biological } from '@shared/types';
import { parseBiologicalArray } from '../utils/boundarySchemas';
import { getGenusValueRange, getSpeciesValue, getGenusSampleDistance, GEOLOGICAL_CREDITS, HUMAN_CREDITS } from '@shared/exobiologyScanValues';
import { estimatePossibleGenera, computeSystemHas, parseStarClass } from '@shared/exobiologyEstimator';

/** Map star subType to image path (e.g. G, K, M, Neutron, White Dwarf). */
function getStarImage(subType: string | undefined): string {
  if (!subType) return 'stars/star_G.png';
  const s = subType.toLowerCase();
  
  if (s.startsWith('o ') || s.includes('o-type')) return 'stars/star_O.png';
  if (s.startsWith('b ') || s.includes('b-type')) return 'stars/star_B.png';
  if (s.startsWith('a ') || s.includes('a-type')) return 'stars/star_A.png';
  if (s.startsWith('f ') || s.includes('f-type')) return 'stars/star_F.png';
  if (s.startsWith('g ') || s.includes('g-type')) return 'stars/star_G.png';
  if (s.startsWith('k ') || s.includes('k-type')) return 'stars/star_K.png';
  if (s.startsWith('m ') || s.includes('m-type') || s.includes('red dwarf')) return 'stars/star_M.png';
  
  if (s.startsWith('l ') || s.includes('l-type')) return 'stars/star_I.png';
  if (s.startsWith('t ') || s.includes('t-type')) return 'stars/star_T.png';
  if (s.startsWith('y ') || s.includes('y-type')) return 'stars/star_Y.png';
  
  if (s.includes('t tauri') || s.includes('tts')) return 'stars/star_TTS.png';
  if (s.includes('herbig') || s.includes('ae/be')) return 'stars/star_AEBE.png';
  
  if (s.includes('wolf-rayet') || s.startsWith('w ')) {
    if (s.includes('wn') && s.includes('wc')) return 'stars/star_WNC.png';
    if (s.includes('wn')) return 'stars/star_WN.png';
    if (s.includes('wc')) return 'stars/star_WC.png';
    if (s.includes('wo')) return 'stars/star_WO.png';
    return 'stars/star_W.png';
  }
  
  if (s.includes('carbon') || s.startsWith('c ') || s.startsWith('c-')) {
    if (s.includes('chd')) return 'stars/star_CHd.png';
    if (s.includes('ch')) return 'stars/star_CH.png';
    if (s.includes('cj')) return 'stars/star_CJ.png';
    if (s.includes('cn')) return 'stars/star_CN.png';
    if (s.includes('ms')) return 'stars/star_MS.png';
    if (s.includes('s')) return 'stars/star_S.png';
    return 'stars/star_C.png';
  }
  
  if (s.includes('white dwarf') || s.includes('wd')) {
    if (s.includes('da')) return 'stars/star_DA.png';
    if (s.includes('dab')) return 'stars/star_DAB.png';
    if (s.includes('dao')) return 'stars/star_DAO.png';
    if (s.includes('daz')) return 'stars/star_DAZ.png';
    if (s.includes('dav')) return 'stars/star_DAV.png';
    if (s.includes('db')) return 'stars/star_DB.png';
    if (s.includes('dbz')) return 'stars/star_DBZ.png';
    if (s.includes('dbv')) return 'stars/star_DBV.png';
    if (s.includes('dc')) return 'stars/star_DC.png';
    if (s.includes('dcv')) return 'stars/star_DCV.png';
    if (s.includes('dq')) return 'stars/star_DQ.png';
    return 'stars/star_D.png';
  }
  
  if (s.includes('neutron')) return 'stars/star_N.png';
  if (s.includes('black hole') || s.includes('blackhole')) return 'stars/star_BH.png';
  if (s.includes('supermassive')) return 'stars/star_SMBH.png';
  
  return 'stars/star_G.png';
}

/** Map planet subType to image path (ELW, WW, HMC, gas giants, etc.). */
function getPlanetImage(subType: string | undefined): string {
  if (!subType) return 'planets/planet_RB.png';
  const s = subType.toLowerCase();
  
  if (s.includes('earth-like') || s.includes('earthlike')) return 'planets/planet_ELW.png';
  if (s.includes('water world')) return 'planets/planet_WW.png';
  if (s.includes('water giant')) return 'planets/planet_WG.png';
  if (s.includes('ammonia world')) return 'planets/planet_AW.png';
  if (s.includes('high metal content')) return 'planets/planet_HMCW.png';
  if (s.includes('metal rich') || s.includes('metal-rich')) return 'planets/planet_MRB.png';
  if (s.includes('rocky ice')) return 'planets/planet_RIW.png';
  if (s.includes('rocky')) return 'planets/planet_RB.png';
  if (s.includes('icy')) return 'planets/planet_IB.png';
  if (s.includes('class i gas giant') || s.includes('sudarsky class i')) return 'planets/planet_C1GG.png';
  if (s.includes('class ii gas giant') || s.includes('sudarsky class ii')) return 'planets/planet_C2GG.png';
  if (s.includes('class iii gas giant') || s.includes('sudarsky class iii')) return 'planets/planet_C3GG.png';
  if (s.includes('class iv gas giant') || s.includes('sudarsky class iv')) return 'planets/planet_C4GG.png';
  if (s.includes('class v gas giant') || s.includes('sudarsky class v')) return 'planets/planet_C5GG.png';
  if (s.includes('helium rich gas giant') || s.includes('helium-rich gas giant')) return 'planets/planet_HRGG.png';
  if (s.includes('helium gas giant')) return 'planets/planet_HGG.png';
  if (s.includes('gas giant with water')) return 'planets/planet_GGWBL.png';
  if (s.includes('gas giant with ammonia')) return 'planets/planet_GGABL.png';
  
  return 'planets/planet_RB.png';
}

function getBeltImageFromRings(rings: Ring[]): string {
  if (rings.length > 0) {
    const r = rings[0] as { RingClass?: string; ringClass?: string; type?: string };
    const ringClass = (r.RingClass ?? r.ringClass ?? r.type ?? '').toLowerCase();
    
    if (ringClass.includes('metalric') || ringClass.includes('metal rich') || ringClass.includes('metalrich')) {
      return 'other/asteroidbelt_metallic.png';
    }
    if (ringClass.includes('metallic') || ringClass.includes('metal')) {
      return 'other/asteroidbelt_metallic.png';
    }
    if (ringClass.includes('icy') || ringClass.includes('ice')) {
      return 'other/asteroidbelt_icy.png';
    }
    if (ringClass.includes('rocky') || ringClass.includes('rock')) {
      return 'other/asteroidbelt_rocky.png';
    }
  }
  return 'other/asteroidbelt.png';
}

function getRingImageFromType(ringClass: string | undefined): string {
  if (!ringClass) return 'other/rings_rocky.png';
  const rc = ringClass.toLowerCase();
  
  if (rc.includes('metalric') || rc.includes('metal rich') || rc.includes('metalrich')) {
    return 'other/rings_metalrich.png';
  }
  if (rc.includes('metallic') || rc.includes('metal')) {
    return 'other/rings_metallic.png';
  }
  if (rc.includes('icy') || rc.includes('ice')) {
    return 'other/rings_icy.png';
  }
  if (rc.includes('rocky') || rc.includes('rock')) {
    return 'other/rings_rocky.png';
  }
  return 'other/rings_rocky.png';
}

function formatStarClassFull(subType: string | undefined): string {
  if (!subType) return 'Star';
  const s = subType.toLowerCase();
  
  if (s.includes('black hole')) {
    if (s.includes('supermassive')) return 'Supermassive Black Hole';
    return 'Black Hole';
  }
  if (s.includes('neutron')) return 'Neutron Star';
  
  if (s.includes('wolf-rayet') || s.startsWith('w ')) {
    if (s.includes('wnc') || (s.includes('wn') && s.includes('wc'))) return 'Wolf-Rayet WNC-Class';
    if (s.includes('wn')) return 'Wolf-Rayet WN-Class';
    if (s.includes('wc')) return 'Wolf-Rayet WC-Class';
    if (s.includes('wo')) return 'Wolf-Rayet WO-Class';
    return 'Wolf-Rayet W-Class';
  }
  
  if (s.includes('white dwarf') || (s.startsWith('d') && !s.includes('dwarf'))) {
    const wdMatch = s.match(/\b(dav|daz|dao|dab|da|dbv|dbz|db|dov|do|dq|dcv|dc|dx|d)\b/i);
    if (wdMatch && wdMatch[1]) {
      return `White Dwarf ${wdMatch[1].toUpperCase()}-Class`;
    }
    return 'White Dwarf D-Class';
  }
  
  if (s.includes('t tauri') || s.includes('tts')) return 'T Tauri TTS-Class';
  if (s.includes('herbig') || s.includes('ae/be')) return 'Herbig Ae/Be-Class';
  
  if (s.includes('carbon') || s.startsWith('c ') || s.startsWith('c-')) {
    if (s.includes('chd')) return 'Carbon Star CHd-Class';
    if (s.includes('ch')) return 'Carbon Star CH-Class';
    if (s.includes('cj')) return 'Carbon Star CJ-Class';
    if (s.includes('cn')) return 'Carbon Star CN-Class';
    if (s.includes('cs') || s.includes('c-s')) return 'Carbon Star CS-Class';
    return 'Carbon Star C-Class';
  }
  
  if (s.startsWith('ms') || s.includes('m-s')) return 'Main Sequence MS-Class';
  if (s.startsWith('s ') || s.includes('s-type')) return 'S-Type Star S-Class';
  
  const mainSeq = s.match(/^([obafgkm])\s/i);
  if (mainSeq && mainSeq[1]) {
    return `Main Sequence ${mainSeq[1].toUpperCase()}-Class`;
  }
  
  const typeMatch = s.match(/([obafgkm])-type/i);
  if (typeMatch && typeMatch[1]) {
    return `Main Sequence ${typeMatch[1].toUpperCase()}-Class`;
  }
  
  if (s.includes('red dwarf')) return 'Main Sequence M-Class';
  
  if (s.startsWith('l ') || s.includes('l-type')) return 'Brown Dwarf L-Class';
  if (s.startsWith('t ') || s.includes('t-type')) return 'Brown Dwarf T-Class';
  if (s.startsWith('y ') || s.includes('y-type')) return 'Brown Dwarf Y-Class';
  
  return subType;
}

const ATMOSPHERE_COLORS: Record<string, string> = {
  Nitrogen: '#6366f1',
  Oxygen: '#22c55e',
  'Carbon dioxide': '#a1a1aa',
  Argon: '#a855f7',
  Ammonia: '#eab308',
  Helium: '#f472b6',
  Hydrogen: '#38bdf8',
  Neon: '#f97316',
  Methane: '#14b8a6',
  Water: '#3b82f6',
  'Sulphur dioxide': '#fbbf24',
};

const ELEMENT_SYMBOLS: Record<string, string> = {
  hydrogen: 'H', carbon: 'C', nitrogen: 'N', oxygen: 'O', phosphorus: 'P', sulphur: 'S', selenium: 'Se',
  lithium: 'Li', sodium: 'Na', potassium: 'K', rubidium: 'Rb', cesium: 'Cs', caesium: 'Cs', francium: 'Fr',
  beryllium: 'Be', magnesium: 'Mg', calcium: 'Ca', strontium: 'Sr', barium: 'Ba', radium: 'Ra',
  scandium: 'Sc', titanium: 'Ti', vanadium: 'V', chromium: 'Cr', manganese: 'Mn', iron: 'Fe', cobalt: 'Co',
  nickel: 'Ni', copper: 'Cu', zinc: 'Zn', yttrium: 'Y', zirconium: 'Zr', niobium: 'Nb', molybdenum: 'Mo',
  technetium: 'Tc', ruthenium: 'Ru', rhodium: 'Rh', palladium: 'Pd', silver: 'Ag', cadmium: 'Cd',
  hafnium: 'Hf', tantalum: 'Ta', tungsten: 'W', rhenium: 'Re', osmium: 'Os', iridium: 'Ir', platinum: 'Pt',
  gold: 'Au', mercury: 'Hg', rutherfordium: 'Rf', dubnium: 'Db', seaborgium: 'Sg', bohrium: 'Bh',
  hassium: 'Hs', meitnerium: 'Mt', darmstadtium: 'Ds', roentgenium: 'Rg', copernicium: 'Cn',
  lanthanum: 'La', cerium: 'Ce', praseodymium: 'Pr', neodymium: 'Nd', promethium: 'Pm', samarium: 'Sm',
  gadolinium: 'Gd', terbium: 'Tb', dysprosium: 'Dy', holmium: 'Ho', erbium: 'Er', thulium: 'Tm',
  ytterbium: 'Yb', lutetium: 'Lu',
  actinium: 'Ac', thorium: 'Th', protactinium: 'Pa', uranium: 'U', neptunium: 'Np', plutonium: 'Pu',
  americium: 'Am', curium: 'Cm', berkelium: 'Bk', californium: 'Cf', einsteinium: 'Es', fermium: 'Fm',
  mendelevium: 'Md', nobelium: 'No', lawrencium: 'Lr',
  boron: 'B', silicon: 'Si', germanium: 'Ge', arsenic: 'As', antimony: 'Sb', tellurium: 'Te', polonium: 'Po',
  aluminium: 'Al', aluminum: 'Al', gallium: 'Ga', indium: 'In', tin: 'Sn', thallium: 'Tl', lead: 'Pb',
  bismuth: 'Bi', nihonium: 'Nh', flerovium: 'Fl', moscovium: 'Mc', livermorium: 'Lv',
  fluorine: 'F', chlorine: 'Cl', bromine: 'Br', iodine: 'I', astatine: 'At', tennessine: 'Ts',
  helium: 'He', neon: 'Ne', argon: 'Ar', krypton: 'Kr', xenon: 'Xe', radon: 'Rn', oganesson: 'Og',
};

const ELEMENT_GROUP_COLORS: Record<string, string> = {
  H: '#A5D6A7', C: '#A5D6A7', N: '#A5D6A7', O: '#A5D6A7', P: '#A5D6A7', S: '#A5D6A7', Se: '#A5D6A7',
  Li: '#66BB6A', Na: '#66BB6A', K: '#66BB6A', Rb: '#66BB6A', Cs: '#66BB6A', Fr: '#66BB6A',
  Be: '#42A5F5', Mg: '#42A5F5', Ca: '#42A5F5', Sr: '#42A5F5', Ba: '#42A5F5', Ra: '#42A5F5',
  Sc: '#AB47BC', Ti: '#AB47BC', V: '#AB47BC', Cr: '#AB47BC', Mn: '#AB47BC', Fe: '#AB47BC', Co: '#AB47BC',
  Ni: '#AB47BC', Cu: '#AB47BC', Zn: '#AB47BC', Y: '#AB47BC', Zr: '#AB47BC', Nb: '#AB47BC', Mo: '#AB47BC',
  Tc: '#AB47BC', Ru: '#AB47BC', Rh: '#AB47BC', Pd: '#AB47BC', Ag: '#AB47BC', Cd: '#AB47BC',
  Hf: '#AB47BC', Ta: '#AB47BC', W: '#AB47BC', Re: '#AB47BC', Os: '#AB47BC', Ir: '#AB47BC', Pt: '#AB47BC',
  Au: '#AB47BC', Hg: '#AB47BC', Rf: '#AB47BC', Db: '#AB47BC', Sg: '#AB47BC', Bh: '#AB47BC',
  Hs: '#AB47BC', Mt: '#AB47BC', Ds: '#AB47BC', Rg: '#AB47BC', Cn: '#AB47BC',
  La: '#EC407A', Ce: '#EC407A', Pr: '#EC407A', Nd: '#EC407A', Pm: '#EC407A', Sm: '#EC407A',
  Gd: '#EC407A', Tb: '#EC407A', Dy: '#EC407A', Ho: '#EC407A', Er: '#EC407A', Tm: '#EC407A',
  Yb: '#EC407A', Lu: '#EC407A',
  Ac: '#F48FB1', Th: '#F48FB1', Pa: '#F48FB1', U: '#F48FB1', Np: '#F48FB1', Pu: '#F48FB1',
  Am: '#F48FB1', Cm: '#F48FB1', Bk: '#F48FB1', Cf: '#F48FB1', Es: '#F48FB1', Fm: '#F48FB1',
  Md: '#F48FB1', No: '#F48FB1', Lr: '#F48FB1',
  B: '#26C6DA', Si: '#26C6DA', Ge: '#26C6DA', As: '#26C6DA', Sb: '#26C6DA', Te: '#26C6DA', Po: '#26C6DA',
  Al: '#FFB74D', Ga: '#FFB74D', In: '#FFB74D', Sn: '#FFB74D', Tl: '#FFB74D', Pb: '#FFB74D', Bi: '#FFB74D',
  Nh: '#FFB74D', Fl: '#FFB74D', Mc: '#FFB74D', Lv: '#FFB74D',
  F: '#A1887F', Cl: '#A1887F', Br: '#A1887F', I: '#A1887F', At: '#A1887F', Ts: '#A1887F',
  He: '#EF5350', Ne: '#EF5350', Ar: '#EF5350', Kr: '#EF5350', Xe: '#EF5350', Rn: '#EF5350', Og: '#EF5350',
};

const DEFAULT_ELEMENT_COLOR = '#94a3b8';

// Material rarity categories for sorting (ED: Very Common → Rare). Keep element colors via getElementStyle.
const MATERIAL_RARITY_TIERS: string[][] = [
  ['Phosphorus', 'Nickel', 'Sulphur', 'Carbon', 'Iron', 'Rhenium', 'Lead'],
  ['Arsenic', 'Manganese', 'Germanium', 'Vanadium', 'Chromium', 'Zinc', 'Zirconium'],
  ['Niobium', 'Mercury', 'Cadmium', 'Molybdenum', 'Tin', 'Tungsten', 'Boron'],
  ['Selenium', 'Polonium', 'Tellurium', 'Ruthenium', 'Yttrium', 'Technetium', 'Antimony'],
];
const RARITY_LABELS = ['Very Common', 'Common', 'Standard', 'Rare', 'Other'];

function getRarityTier(name: string): number {
  const n = name.toLowerCase();
  for (let t = 0; t < MATERIAL_RARITY_TIERS.length; t++) {
    const tier = MATERIAL_RARITY_TIERS[t];
    if (tier?.some((x) => x.toLowerCase() === n)) return t;
  }
  return -1;
}

function getRaritySortKey(name: string): number {
  const n = name.toLowerCase();
  for (let t = 0; t < MATERIAL_RARITY_TIERS.length; t++) {
    const tier = MATERIAL_RARITY_TIERS[t];
    const i = tier?.findIndex((x) => x.toLowerCase() === n) ?? -1;
    if (i >= 0) return t * 1000 + i;
  }
  return 9999;
}

function getElementStyle(symbol: string): { backgroundColor: string; color: string } {
  const key = symbol.length === 1 ? symbol.toUpperCase() : symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();
  const bg = ELEMENT_GROUP_COLORS[key] || DEFAULT_ELEMENT_COLOR;
  const isLight = ['#A5D6A7', '#66BB6A', '#42A5F5', '#F48FB1', '#26C6DA', '#FFB74D', '#A1887F'].includes(bg);
  return { backgroundColor: bg, color: isLight ? '#1e293b' : '#fff' };
}

interface Ring {
  Name: string;
  RingClass: string;
  MassMT: number;
  InnerRad: number;
  OuterRad: number;
  Materials?: Array<{ Name: string; Count: number }>;
}

interface Material {
  Name: string;
  Percent: number;
}

interface Composition {
  Ice: number;
  Rock: number;
  Metal: number;
}

interface AtmosphereComponent {
  Name: string;
  Percent: number;
}

function formatRingClass(ringClass: string | undefined): string {
  if (!ringClass) return '';
  const formatted = ringClass.replace(/^eRingClass_/, '');
  return formatted.replace(/([A-Z])/g, ' $1').trim();
}

function formatRingMass(massMT: number): string {
  const n = Number(massMT);
  if (!Number.isFinite(n) || n < 0) return '0.00 Mt';
  if (n >= 1e12) {
    return `${(n / 1e12).toFixed(2)} Tt`;
  }
  if (n >= 1e9) {
    return `${(n / 1e9).toFixed(2)} Gt`;
  }
  if (n >= 1e6) {
    return `${(n / 1e6).toFixed(2)} Pt`;
  }
  if (n >= 1e3) {
    return `${(n / 1e3).toFixed(2)} Gt`;
  }
  return `${n.toFixed(2)} Mt`;
}

function formatRingRadius(radiusM: number): string {
  const r = Number(radiusM);
  if (!Number.isFinite(r) || r < 0) return '0 km';
  const radiusKm = r / 1000;
  const radiusLs = r / 299792458;
  
  if (radiusLs >= 0.01) {
    return `${radiusLs.toFixed(3)} ls`;
  }
  if (radiusKm >= 1e6) {
    return `${(radiusKm / 1e6).toFixed(2)}M km`;
  }
  if (radiusKm >= 1e3) {
    return `${(radiusKm / 1e3).toFixed(1)}K km`;
  }
  return `${radiusKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

interface OrbitalParams {
  SemiMajorAxis?: number;
  Eccentricity?: number;
  OrbitalInclination?: number;
  OrbitalPeriod?: number;
  RotationPeriod?: number;
  AxialTilt?: number;
  TidalLock?: boolean;
}

function formatSemiMajorAxis(meters: number): string {
  const km = meters / 1000;
  const au = meters / 149597870700;
  const ls = meters / 299792458;
  
  if (au >= 0.01) {
    return `${au.toFixed(3)} AU`;
  }
  if (ls >= 1) {
    return `${ls.toFixed(2)} ls`;
  }
  if (km >= 1e6) {
    return `${(km / 1e6).toFixed(2)}M km`;
  }
  if (km >= 1e3) {
    return `${(km / 1e3).toFixed(1)}K km`;
  }
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

function formatPeriod(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const days = absSeconds / 86400;
  const years = days / 365.25;
  
  if (years >= 1) {
    return `${years.toFixed(2)} years`;
  }
  if (days >= 1) {
    return `${days.toFixed(2)} days`;
  }
  const hours = absSeconds / 3600;
  if (hours >= 1) {
    return `${hours.toFixed(2)} hours`;
  }
  const minutes = absSeconds / 60;
  return `${minutes.toFixed(1)} min`;
}

function formatDegrees(degrees: number): string {
  return `${degrees.toFixed(2)}°`;
}

function formatAxialTilt(radians: number): string {
  const degrees = radians * (180 / Math.PI);
  return `${degrees.toFixed(2)}°`;
}

function formatSolarRadius(km: number): string {
  const solarRadiusKm = 695700;
  const solarRadii = km / solarRadiusKm;
  return `${solarRadii.toFixed(4)} SR`;
}

function BodyDetails() {
  const body = useSelectedBody();
  const bodies = useBodies();
  const currentSystem = useCurrentSystem();
  const edsmSpoilerFree = useEdsmSpoilerFree();
  const bioHighValue = useAppStore((s) => s.bioHighValue);
  const bioMediumValue = useAppStore((s) => s.bioMediumValue);
  const [biologicals, setBiologicals] = useState<Biological[]>([]);
  const [loadingBio, setLoadingBio] = useState(false);

  const bioHighlightColor = (v: number) => (v >= bioHighValue ? '#F59E0B' : v >= bioMediumValue ? '#F97316' : undefined);

  const openEdsmSystemPage = () => {
    if (currentSystem?.name) {
      const encodedName = encodeURIComponent(currentSystem.name);
      window.electron.openExternal(`https://www.edsm.net/en/system/bodies/name/${encodedName}`);
    }
  };

  const rings = useMemo<Ring[]>(() => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return [];
    try {
      const scanData = JSON.parse(body.rawJson);
      if (!scanData) return [];
      
      const rawRings = scanData.Rings || scanData.rings || [];
      
      return rawRings.map((ring: Record<string, unknown>) => {
        // EDSM provides innerRadius/outerRadius in km, Journal provides InnerRad/OuterRad in meters
        const innerRad = ring.InnerRad || ring.innerRad;
        const outerRad = ring.OuterRad || ring.outerRad;
        const innerRadKm = ring.innerRadius as number | undefined;
        const outerRadKm = ring.outerRadius as number | undefined;
        const rawMats = ring.Materials || ring.materials;
        const materials = Array.isArray(rawMats)
          ? rawMats.map((m: Record<string, unknown>) => ({
              Name: (m.Name || m.name || m.Type || m.type || '') as string,
              Count: ((m.Count ?? m.count) ?? 0) as number,
            }))
          : undefined;
        return {
          Name: (ring.Name || ring.name || '') as string,
          RingClass: (ring.RingClass || ring.ringClass || ring.type || '') as string,
          MassMT: (ring.MassMT || ring.massMT || ring.mass || 0) as number,
          InnerRad: (innerRad || (innerRadKm ? innerRadKm * 1000 : 0)) as number,
          OuterRad: (outerRad || (outerRadKm ? outerRadKm * 1000 : 0)) as number,
          Materials: materials?.length ? materials : undefined,
        };
      });
    } catch {
      return [];
    }
  }, [body?.rawJson]);

  const orbitalParams = useMemo<OrbitalParams | null>(() => {
    // Try to parse from rawJson first
    if (body?.rawJson && body.rawJson !== 'null' && body.rawJson !== '') {
      try {
        const scanData = JSON.parse(body.rawJson);
        if (!scanData) throw new Error('Empty scan data');
        
        // Journal format uses: SemiMajorAxis (meters), OrbitalPeriod (seconds), RotationPeriod (seconds), AxialTilt (radians)
        // EDSM format uses: semiMajorAxis (AU), orbitalPeriod (days), rotationalPeriod (hours), axialTilt (degrees)
        
        const hasJournalData = scanData.SemiMajorAxis || scanData.OrbitalPeriod || scanData.RotationPeriod;
        const hasEdsmData = scanData.semiMajorAxis || scanData.orbitalPeriod || scanData.rotationalPeriod;
        
        if (hasJournalData || hasEdsmData) {
          // Convert EDSM units to Journal units
          const AU_TO_METERS = 149597870700;
          const DAYS_TO_SECONDS = 86400;
          const HOURS_TO_SECONDS = 3600;
          const DEG_TO_RAD = Math.PI / 180;
          
          return {
            SemiMajorAxis: scanData.SemiMajorAxis || (scanData.semiMajorAxis ? scanData.semiMajorAxis * AU_TO_METERS : undefined),
            Eccentricity: scanData.Eccentricity ?? scanData.orbitalEccentricity,
            OrbitalInclination: scanData.OrbitalInclination ?? scanData.orbitalInclination,
            OrbitalPeriod: scanData.OrbitalPeriod || (scanData.orbitalPeriod ? scanData.orbitalPeriod * DAYS_TO_SECONDS : undefined),
            RotationPeriod: scanData.RotationPeriod || (scanData.rotationalPeriod ? scanData.rotationalPeriod * HOURS_TO_SECONDS : undefined),
            AxialTilt: scanData.AxialTilt ?? (scanData.axialTilt !== undefined ? scanData.axialTilt * DEG_TO_RAD : undefined),
            TidalLock: scanData.TidalLock ?? scanData.rotationalPeriodTidallyLocked,
          };
        }
      } catch {
        // rawJson parsing failed, fall through to use body fields
      }
    }
    
    // Fallback: use body's direct semiMajorAxis field if available
    if (body?.semiMajorAxis) {
    return {
        SemiMajorAxis: body.semiMajorAxis,
        Eccentricity: undefined,
        OrbitalInclination: undefined,
        OrbitalPeriod: undefined,
        RotationPeriod: undefined,
        AxialTilt: undefined,
        TidalLock: undefined,
      };
    }
    
    return null;
  }, [body?.rawJson, body?.semiMajorAxis]);

  const genuses = useMemo<string[]>(() => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return [];
    try {
      const d = JSON.parse(body.rawJson) as Record<string, unknown>;
      const g = d.Genuses ?? d.genuses;
      return Array.isArray(g) ? (g as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }, [body?.rawJson]);

  const materials = useMemo<Material[]>(() => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return [];
    try {
      const scanData = JSON.parse(body.rawJson);
      if (!scanData) return [];
      
      const rawMaterials = scanData.Materials || scanData.materials || [];
      return rawMaterials
        .map((mat: Record<string, unknown>) => ({
          Name: (mat.Name || mat.name || '') as string,
          Percent: (mat.Percent || mat.percent || 0) as number,
        }))
        .sort((a: Material, b: Material) => {
          const ka = getRaritySortKey(a.Name);
          const kb = getRaritySortKey(b.Name);
          return ka !== kb ? ka - kb : b.Percent - a.Percent;
        });
    } catch {
      return [];
    }
  }, [body?.rawJson]);

  const materialGroups = useMemo(() => {
    if (materials.length === 0) return [];
    const g: { label: string; materials: Material[] }[] = [];
    let curTier: number | null = null;
    let curMats: Material[] = [];
    for (const m of materials) {
      const t = getRarityTier(m.Name);
      const tier = t >= 0 ? t : 4;
      if (curTier !== null && curTier !== tier) {
        g.push({ label: RARITY_LABELS[curTier] ?? 'Other', materials: curMats });
        curMats = [];
      }
      curTier = tier;
      curMats.push(m);
    }
    if (curMats.length > 0 && curTier !== null) g.push({ label: RARITY_LABELS[curTier] ?? 'Other', materials: curMats });
    return g;
  }, [materials]);

  const { estimatedGenera, starClassLetter } = useMemo(() => {
    const empty = { estimatedGenera: [] as ReturnType<typeof estimatePossibleGenera>, starClassLetter: '' };
    if (!body) return empty;
    // Run when we have bio signals (FSS/journal) or genuses (DSS or EDSM); stop when Genetic Sampler has run (biologicals).
    if ((body.bioSignals ?? 0) <= 0 && genuses.length === 0) return empty;
    let star: { subType?: string } | null = null;
    let current: (typeof body) | null = body;
    while (current?.parentId != null) {
      const parent = bodies.find((b) => b.bodyId === current!.parentId);
      if (!parent) break;
      if (parent.bodyType === 'Star') {
        star = parent;
        break;
      }
      current = parent;
    }
    if (!star) star = bodies.find((b) => b.bodyType === 'Star') || null;
    const starClassLetter = parseStarClass(star?.subType);
    const systemHas = computeSystemHas(bodies);
    const materials = (() => {
      if (!body?.rawJson) return [];
      try {
        const scanData = JSON.parse(body.rawJson) as Record<string, unknown>;
        const raw = scanData.Materials ?? scanData.materials;
        if (!Array.isArray(raw)) return [];
        return raw
          .filter((m: unknown): m is Record<string, unknown> => m != null && typeof m === 'object')
          .map((m) => ({ Name: String(m.Name ?? m.name ?? '') }))
          .filter((m) => m.Name.length > 0);
      } catch {
        return [];
      }
    })();
    const estimatedGenera = estimatePossibleGenera({
      atmosphere: body.atmosphereType,
      tempK: body.temperature,
      gravityG: body.gravity,
      planetType: body.subType,
      volcanism: body.volcanism,
      distanceLS: body.distanceLS,
      starClassLetter,
      systemHas,
      ...(materials.length > 0 && { materials }),
    });
    return { estimatedGenera, starClassLetter };
  }, [body, bodies, genuses]);

  const composition = useMemo<Composition | null>(() => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return null;
    try {
      const scanData = JSON.parse(body.rawJson);
      if (!scanData) return null;
      
      const comp = scanData.Composition || scanData.composition;
      if (comp) {
        return {
          Ice: (comp.Ice ?? comp.ice ?? 0) as number,
          Rock: (comp.Rock ?? comp.rock ?? 0) as number,
          Metal: (comp.Metal ?? comp.metal ?? 0) as number,
        };
      }
      // EDSM doesn't provide body composition in the same format
      // Check for solidComposition from EDSM
      if (scanData.solidComposition) {
        return {
          Ice: (scanData.solidComposition.Ice ?? scanData.solidComposition.ice ?? 0) as number,
          Rock: (scanData.solidComposition.Rock ?? scanData.solidComposition.rock ?? 0) as number,
          Metal: (scanData.solidComposition.Metal ?? scanData.solidComposition.metal ?? 0) as number,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [body?.rawJson]);

  const atmosphereComposition = useMemo<AtmosphereComponent[]>(() => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return [];
    try {
      const scanData = JSON.parse(body.rawJson);
      if (!scanData) return [];
      
      // Journal uses AtmosphereComposition array, EDSM uses atmosphereComposition object with key-value pairs
      const rawAtmo = scanData.AtmosphereComposition || scanData.atmosphereComposition;
      
      if (!rawAtmo) return [];
      
      // Handle array format (Journal)
      if (Array.isArray(rawAtmo)) {
        return rawAtmo.map((comp: Record<string, unknown>) => ({
          Name: (comp.Name || comp.name || '') as string,
          Percent: (comp.Percent || comp.percent || 0) as number,
        })).sort((a: AtmosphereComponent, b: AtmosphereComponent) => b.Percent - a.Percent);
      }
      
      // Handle object format (EDSM - key: percentage)
      if (typeof rawAtmo === 'object') {
        return Object.entries(rawAtmo)
          .map(([name, percent]) => ({
            Name: name,
            Percent: (percent as number) || 0,
          }))
          .sort((a, b) => b.Percent - a.Percent);
      }
      
      return [];
    } catch {
      return [];
    }
  }, [body?.rawJson]);

  const fetchBiologicals = useCallback((bodyDbId: number) => {
    setLoadingBio(true);
    window.electron.getBodyBiologicals(bodyDbId)
      .then((raw) => {
        setBiologicals(parseBiologicalArray(raw));
      })
      .catch((err) => {
        console.error('Failed to fetch biologicals:', err);
        setBiologicals([]);
      })
      .finally(() => {
        setLoadingBio(false);
      });
  }, []);

  useEffect(() => {
    if (!body) {
      setBiologicals([]);
      return;
    }
    // body.id is the DB primary key; EDSM-only bodies have id=0 and no biologicals in our DB
    if (body.id <= 0) {
      setBiologicals([]);
      return;
    }
    fetchBiologicals(body.id);
  }, [body?.id, fetchBiologicals]);

  // Refetch biologicals when genetic sampler scan completes for the currently selected body
  useEffect(() => {
    const unsubscribe = window.electron.onBioScanned((bio: unknown) => {
      if (body?.id && bio != null && typeof bio === 'object' && 'bodyId' in bio && typeof (bio as { bodyId: unknown }).bodyId === 'number' && (bio as { bodyId: number }).bodyId === body.id) {
        fetchBiologicals(body.id);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [body?.id, fetchBiologicals]);

  const isOpen = useAppStore((state) => state.detailsPanelOpen);
  const togglePanel = useAppStore((state) => state.toggleDetailsPanel);
  const detailsPanelWidth = useAppStore((state) => state.detailsPanelWidth);
  const setDetailsPanelWidth = useAppStore((state) => state.setDetailsPanelWidth);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = detailsPanelWidth;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        setDetailsPanelWidth(startWidth + delta);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [detailsPanelWidth, setDetailsPanelWidth]
  );

  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString();
  };

  const formatCredits = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M CR`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K CR`;
    }
    return `${value} CR`;
  };

  const formatCreditsRange = (min: number, max: number): string => {
    if (min === max) return formatCredits(min);
    return `${formatCredits(min)} – ${formatCredits(max)}`;
  };

  if (!isOpen) {
    return (
      <button
        onClick={togglePanel}
        className="w-10 flex items-center justify-center bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
        title="Show Details"
      >
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    );
  }

  if (!body) {
    return (
      <aside className="relative flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto" style={{ width: detailsPanelWidth }}>
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-slate-300 dark:hover:bg-slate-600 z-10 shrink-0"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Details</h2>
            <button
              onClick={togglePanel}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-center py-8">
            Select a body to view details
          </p>
        </div>
      </aside>
    );
  }

  const isStar = body.bodyType === 'Star';
  const isPlanetOrMoon = body.bodyType === 'Planet' || body.bodyType === 'Moon';
  const isBelt = body.bodyType === 'Belt';
  
  const isScanned = body.scanType !== 'None';
  const showDetails = isScanned || !edsmSpoilerFree;

  const sectionHeading = 'text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2';
  const sectionDivider = '[&>*+*]:pt-4 [&>*+*]:mt-4';

  const renderStarDetails = () => (
    <div className={`space-y-0 ${sectionDivider}`}>
      <div>
        <h3 className={sectionHeading}>Properties</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-sm">
            <dt className="text-slate-600 dark:text-slate-400">Distance</dt>
            <dd className="text-slate-900 dark:text-white">{(Number(body?.distanceLS) || 0).toFixed(2)} ls</dd>
          </div>
          {body.mass != null && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Solar Mass</dt>
              <dd className="text-slate-900 dark:text-white">{(Number(body.mass) || 0).toFixed(4)} SM</dd>
            </div>
          )}
          {body.radius != null && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Solar Radius</dt>
              <dd className="text-slate-900 dark:text-white">{formatSolarRadius(Number(body.radius) || 0)}</dd>
            </div>
          )}
          {body.temperature != null && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Temperature</dt>
              <dd className="text-slate-900 dark:text-white">{formatNumber(Math.round(Number(body.temperature) || 0))} K</dd>
            </div>
          )}
        </dl>
      </div>

      {orbitalParams && (
          <div>
          <h3 className={sectionHeading}>Orbital Parameters</h3>
          <dl className="space-y-1">
            {orbitalParams.SemiMajorAxis && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Semi-Major Axis</dt>
                <dd className="text-slate-900 dark:text-white">{formatSemiMajorAxis(orbitalParams.SemiMajorAxis)}</dd>
          </div>
            )}
            {orbitalParams.Eccentricity != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Eccentricity</dt>
                <dd className="text-slate-900 dark:text-white">{(Number(orbitalParams.Eccentricity) || 0).toFixed(4)}</dd>
        </div>
            )}
            {orbitalParams.OrbitalInclination != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Inclination</dt>
                <dd className="text-slate-900 dark:text-white">{formatDegrees(Number(orbitalParams.OrbitalInclination) || 0)}</dd>
              </div>
            )}
            {orbitalParams.OrbitalPeriod && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Orbital Period</dt>
                <dd className="text-slate-900 dark:text-white">{formatPeriod(orbitalParams.OrbitalPeriod)}</dd>
              </div>
            )}
            {orbitalParams.RotationPeriod != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Rotation Period</dt>
                <dd className="text-slate-900 dark:text-white flex items-center gap-1">
                  {formatPeriod(Number(orbitalParams.RotationPeriod) || 0)}
                  {Number(orbitalParams.RotationPeriod) < 0 && (
                    <span className="text-xs text-slate-400" title="Retrograde rotation">↺</span>
                  )}
                </dd>
              </div>
            )}
            {orbitalParams.AxialTilt != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Axial Tilt</dt>
                <dd className="text-slate-900 dark:text-white">{formatAxialTilt(Number(orbitalParams.AxialTilt) || 0)}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {rings.length > 0 && (
        <div>
          <h3 className={sectionHeading}>Rings</h3>
          <div className="space-y-3">
            {rings.map((ring, index) => {
              const ringLetter = ring.Name.match(/\s([A-Z])\s+(Ring|Belt)$/)?.[1] || `#${index + 1}`;
              const ringType = formatRingClass(ring.RingClass);
              const isBeltType = ring.Name.includes('Belt');
              const ringIconPath = isBeltType 
                ? getBeltImageFromRings([ring])
                : getRingImageFromType(ring.RingClass);
              
              return (
                <div key={ring.Name} className="card p-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <img 
                      src={ringIconPath}
                      alt={ringType}
                      className="w-6 h-6 object-contain"
                    />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {ringLetter} {isBeltType ? 'Belt' : 'Ring'}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                      {ringType}
                    </span>
                  </div>
                  <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">Mass</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingMass(ring.MassMT)}</dd>
            </div>
              <div className="flex justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">Inner Radius</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.InnerRad)}</dd>
              </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">Outer Radius</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.OuterRad)}</dd>
                    </div>
                  </dl>
                  {ring.Materials && ring.Materials.length > 0 && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Materials:</span>{' '}
                      {ring.Materials.map((m) => `${m.Name} (${m.Count})`).join(', ')}
                    </p>
            )}
          </div>
              );
            })}
        </div>
        </div>
      )}
    </div>
  );

  const renderPlanetMoonDetails = () => (
    <div className={`space-y-0 ${sectionDivider}`}>
          <div>
        <h3 className={sectionHeading}>Properties</h3>
        <dl className="space-y-1 text-sm">
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Distance</dt>
            <dd className="text-slate-900 dark:text-white">{(Number(body?.distanceLS) || 0).toFixed(2)} ls</dd>
              </div>
          {body.mass != null && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-600 dark:text-slate-400">Mass</dt>
              <dd className="text-slate-900 dark:text-white">{(Number(body.mass) || 0).toFixed(4)} EM</dd>
                </div>
              )}
          {body.radius != null && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-600 dark:text-slate-400">Radius</dt>
              <dd className="text-slate-900 dark:text-white">{formatNumber(Math.round(Number(body.radius) || 0))} km</dd>
                </div>
              )}
          {body.gravity != null && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-600 dark:text-slate-400">Gravity</dt>
              <dd className="text-slate-900 dark:text-white">{(Number(body.gravity) || 0).toFixed(2)} g</dd>
                </div>
              )}
          {body.temperature != null && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-600 dark:text-slate-400">Temperature</dt>
              <dd className="text-slate-900 dark:text-white">{formatNumber(Math.round(Number(body.temperature) || 0))} K</dd>
            </div>
          )}
          {body.atmosphereType != null && body.atmosphereType !== '' ? (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Atmosphere</dt>
              <dd className="text-slate-900 dark:text-white text-right max-w-[60%]">{body.atmosphereType}</dd>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Atmosphere</dt>
              <dd className="text-slate-500 dark:text-slate-400">None</dd>
            </div>
          )}
          {body.volcanism && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Volcanism</dt>
              <dd className="text-slate-900 dark:text-white text-right max-w-[60%]">{body.volcanism}</dd>
            </div>
          )}
          {body.terraformable && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Terraformable</dt>
              <dd className="text-slate-900 dark:text-white">Yes</dd>
                </div>
              )}
            </dl>
          </div>

      {orbitalParams && (
            <div>
          <h3 className={sectionHeading}>Orbital Parameters</h3>
              <dl className="space-y-1">
            {orbitalParams.SemiMajorAxis && (
                  <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Semi-Major Axis</dt>
                <dd className="text-slate-900 dark:text-white">{formatSemiMajorAxis(orbitalParams.SemiMajorAxis)}</dd>
                  </div>
                )}
            {orbitalParams.Eccentricity != null && (
                  <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Eccentricity</dt>
                <dd className="text-slate-900 dark:text-white">{(Number(orbitalParams.Eccentricity) || 0).toFixed(4)}</dd>
              </div>
            )}
            {orbitalParams.OrbitalInclination != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Inclination</dt>
                <dd className="text-slate-900 dark:text-white">{formatDegrees(Number(orbitalParams.OrbitalInclination) || 0)}</dd>
              </div>
            )}
            {orbitalParams.OrbitalPeriod != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Orbital Period</dt>
                <dd className="text-slate-900 dark:text-white">{formatPeriod(Number(orbitalParams.OrbitalPeriod) || 0)}</dd>
              </div>
            )}
            {orbitalParams.RotationPeriod != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Rotation Period</dt>
                <dd className="text-slate-900 dark:text-white flex items-center gap-1">
                  {formatPeriod(Number(orbitalParams.RotationPeriod) || 0)}
                  {Number(orbitalParams.RotationPeriod) < 0 && (
                    <span className="text-xs text-slate-400" title="Retrograde rotation">↺</span>
                  )}
                </dd>
              </div>
            )}
            {orbitalParams.AxialTilt != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Axial Tilt</dt>
                <dd className="text-slate-900 dark:text-white">{formatAxialTilt(Number(orbitalParams.AxialTilt) || 0)}</dd>
                  </div>
                )}
              </dl>
          {orbitalParams.TidalLock && (
            <div className="mt-2 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Tidally Locked</span>
            </div>
          )}
            </div>
          )}

      {atmosphereComposition.length > 0 && (
          <div>
          <h3 className={sectionHeading}>Atmosphere Composition</h3>
          <div className="space-y-2 text-sm">
            <div className="flex h-2 rounded overflow-hidden">
              {atmosphereComposition.map((comp) => (
                <div
                  key={comp.Name}
                  style={{
                    width: `${comp.Percent}%`,
                    backgroundColor: ATMOSPHERE_COLORS[comp.Name] || '#71717a',
                  }}
                  title={`${comp.Name}: ${comp.Percent.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {atmosphereComposition.map((comp) => (
                <span key={comp.Name} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: ATMOSPHERE_COLORS[comp.Name] || '#71717a' }}
                  />
                  {comp.Name} {comp.Percent.toFixed(1)}%
              </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {composition && (composition.Metal > 0 || composition.Rock > 0 || composition.Ice > 0) && (() => {
        const isDecimal = composition.Metal <= 1 && composition.Rock <= 1 && composition.Ice <= 1;
        const metalPct = isDecimal ? composition.Metal * 100 : composition.Metal;
        const rockPct = isDecimal ? composition.Rock * 100 : composition.Rock;
        const icePct = isDecimal ? composition.Ice * 100 : composition.Ice;
        return (
          <div>
            <h3 className={sectionHeading}>Body Composition</h3>
            <div className="space-y-2 text-sm">
              <div className="flex h-2 rounded overflow-hidden">
                {metalPct > 0 && (
                  <div className="bg-amber-500" style={{ width: `${metalPct}%` }} title={`Metal: ${metalPct.toFixed(1)}%`} />
                )}
                {rockPct > 0 && (
                  <div className="bg-stone-500" style={{ width: `${rockPct}%` }} title={`Rock: ${rockPct.toFixed(1)}%`} />
                )}
                {icePct > 0 && (
                  <div className="bg-cyan-400" style={{ width: `${icePct}%` }} title={`Ice: ${icePct.toFixed(1)}%`} />
                )}
              </div>
              <div className="flex gap-3 text-xs">
                {metalPct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-500 rounded-sm" />
                    Metal {metalPct.toFixed(1)}%
                </span>
              )}
                {rockPct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-stone-500 rounded-sm" />
                    Rock {rockPct.toFixed(1)}%
                </span>
              )}
                {icePct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-sm" />
                    Ice {icePct.toFixed(1)}%
                </span>
              )}
              </div>
            </div>
          </div>
        );
      })()}

      {body.geoSignals > 0 && (
        <div>
          <h3 className={sectionHeading}>Geological Signals</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <li>
              Geological ({body.geoSignals}): {formatCredits(GEOLOGICAL_CREDITS)} (Codex & materials only)
            </li>
          </ul>
        </div>
      )}

      {(body.bioSignals > 0 || biologicals.length > 0 || genuses.length > 0) && (
        <div>
          <h3 className={sectionHeading}>Biological Signals</h3>
          <div className="space-y-2 text-sm">
            {loadingBio && body.bioSignals > 0 ? (
              <p className="text-slate-400">Loading species…</p>
            ) : (() => {
              const allGenera = [...new Set([...genuses, ...biologicals.map((b) => b.genus).filter(Boolean)])];
              const generaOnly = allGenera.filter((g) => !biologicals.some((b) => b.genus === g));
              const scanLabel = (p: number) => (p >= 3 ? 'Complete' : `Scan ${p}/3`);
              const hasGenusBullets = generaOnly.length > 0;
              // One line per species+variant: keep highest scanProgress
              const byKey = new Map<string, typeof biologicals[0]>();
              for (const bio of biologicals) {
                const key = `${bio.genus}|${bio.species}|${bio.variant ?? ''}`;
                const ex = byKey.get(key);
                if (!ex || bio.scanProgress > ex.scanProgress) byKey.set(key, bio);
              }
              const biologicalsList = Array.from(byKey.values());
              const hasSpeciesBullets = biologicalsList.length > 0;
              const hasFallback = !hasGenusBullets && !hasSpeciesBullets && (body.bioSignals > 0 || genuses.length > 0);
              if (!hasGenusBullets && !hasSpeciesBullets && !hasFallback) return null;
              return (
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  {generaOnly.map((g) => {
                    const distance = getGenusSampleDistance(g);
                    const distanceStr = distance ? ` [${distance}m]` : '';
                    const eg = estimatedGenera.find((e) => e.genus === g);
                    if (eg) {
                      const fullLabels = eg.possible.map((p) => p.fullLabel).join(', ');
                      const valueStr = eg.valueMin === eg.valueMax
                        ? formatCredits(eg.valueMin)
                        : `${formatCredits(eg.valueMin)} – ${formatCredits(eg.valueMax)}`;
                      const hl = bioHighlightColor(eg.valueMax);
                      return (
                        <li key={g} className={!hl ? 'text-slate-700 dark:text-slate-300' : ''} style={hl ? { color: hl } : undefined}>
                          Possible {fullLabels} ({valueStr}){distanceStr}
                        </li>
                      );
                    }
                    const r = getGenusValueRange(g);
                    const vMax = r?.max ?? 0;
                    const hl = bioHighlightColor(vMax);
                    return (
                      <li key={g} className={!hl ? 'text-slate-700 dark:text-slate-300' : ''} style={hl ? { color: hl } : undefined}>
                        {g} – Unknown Species ({r ? formatCreditsRange(r.min, r.max) : '?'}){distanceStr}
                      </li>
                    );
                  })}
                  {biologicalsList.map((bio) => {
                    const val = bio.value > 0 ? bio.value : (getSpeciesValue(bio.species) ?? 0);
                    const distance = getGenusSampleDistance(bio.genus);
                    const distanceStr = distance ? ` [${distance}m]` : '';
                    const variantShort = bio.variant && (bio.variant.includes(' – ') || bio.variant.includes(' - '))
                      ? bio.variant.split(/ – | - /).pop()!
                      : bio.variant;
                    const isComplete = bio.scanProgress >= 3;
                    const key = `${bio.genus}|${bio.species}|${bio.variant ?? ''}`;
                    const hl = !isComplete ? bioHighlightColor(val) : undefined;
                    return (
                      <li
                        key={key}
                        className={isComplete ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded py-0.5 pr-1 -mr-1' : !hl ? 'text-slate-700 dark:text-slate-300' : ''}
                        style={hl ? { color: hl } : undefined}
                      >
                        {bio.species}
                        {variantShort ? ` – ${variantShort} – ` : ' – '}
                        {scanLabel(bio.scanProgress)} ({formatCredits(val)}){distanceStr}
                      </li>
                    );
                  })}
                  {hasFallback && (
                    <>
                      {estimatedGenera.length > 0 ? (
                        <>
                          <li className="list-none -ml-4 text-slate-500 dark:text-slate-400 text-xs">
                            {['Atmosphere: ' + (body.atmosphereType || 'None'), body.temperature != null ? `Temperature: ${Math.round(body.temperature)} K` : null, starClassLetter ? `Star Class: ${starClassLetter}` : null].filter(Boolean).join(', ')}
                          </li>
                          {estimatedGenera.map((eg) => {
                            const distance = getGenusSampleDistance(eg.genus);
                            const distanceStr = distance ? ` [${distance}m]` : '';
                            const fullLabels = eg.possible.map((p) => p.fullLabel).join(', ');
                            const valueStr = eg.valueMin === eg.valueMax
                              ? formatCredits(eg.valueMin)
                              : `${formatCredits(eg.valueMin)} – ${formatCredits(eg.valueMax)}`;
                            const hl = bioHighlightColor(eg.valueMax);
                            return (
                              <li key={eg.genus} className={!hl ? 'text-slate-700 dark:text-slate-300' : ''} style={hl ? { color: hl } : undefined}>
                                Possible {fullLabels} ({valueStr}){distanceStr}
                              </li>
                            );
                          })}
                        </>
                      ) : (
                        <li className="italic text-slate-600 dark:text-slate-400">
                          Biological ({body.bioSignals}): Surface scan to reveal genera and value range.
                        </li>
                      )}
                    </>
                  )}
                </ul>
              );
            })()}
          </div>
        </div>
      )}

      {(body.humanSignals ?? 0) > 0 && (
        <div>
          <h3 className={sectionHeading}>Human Signals</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <li>
              Human ({body.humanSignals}): {formatCredits(HUMAN_CREDITS)} (no Vista Genomics credits)
            </li>
          </ul>
        </div>
      )}

      {(body.thargoidSignals ?? 0) > 0 && (() => {
        const r = getGenusValueRange('Thargoid');
        return (
          <div>
            <h3 className={sectionHeading}>Thargoid Signals</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <li>Thargoid ({body.thargoidSignals}): {r ? formatCreditsRange(r.min, r.max) : '?'}</li>
            </ul>
          </div>
        );
      })()}

      {materials.length > 0 && (
        <div>
          <h3 className={sectionHeading}>Materials</h3>
          <div className="space-y-2">
            {materialGroups.map((grp) => (
              <div key={grp.label}>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{grp.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {grp.materials.map((mat) => {
                    const symbol = ELEMENT_SYMBOLS[mat.Name.toLowerCase()] || mat.Name.substring(0, 2);
                    const style = getElementStyle(symbol);
                    return (
                      <span
                        key={mat.Name}
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: style.backgroundColor, color: style.color }}
                        title={mat.Name}
                      >
                        {symbol} {mat.Percent.toFixed(1)}%
                </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rings.length > 0 && (
        <div>
          <h3 className={sectionHeading}>Rings</h3>
          <div className="space-y-2">
            {rings.map((ring, index) => {
              const ringLetter = ring.Name.match(/\s([A-Z])\s+Ring$/)?.[1] || `#${index + 1}`;
              const ringType = formatRingClass(ring.RingClass);
              const ringIconPath = getRingImageFromType(ring.RingClass);
              
              return (
                <div key={ring.Name} className="card p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <img 
                      src={ringIconPath}
                      alt={ringType}
                      className="w-5 h-5 object-contain"
                    />
                    <span className="text-xs font-medium text-slate-900 dark:text-white">
                      Ring {ringLetter}
                    </span>
                    <span className="text-[10px] px-1 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
                      {ringType}
                    </span>
            </div>
                  <dl className="grid grid-cols-3 gap-1 text-[10px]">
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Mass</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingMass(ring.MassMT)}</dd>
          </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Inner</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.InnerRad)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Outer</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.OuterRad)}</dd>
                    </div>
                  </dl>
                  {ring.Materials && ring.Materials.length > 0 && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Materials:</span>{' '}
                      {ring.Materials.map((m) => `${m.Name} (${m.Count})`).join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderBeltDetails = () => (
    <div className={`space-y-0 ${sectionDivider}`}>
      {rings.length > 0 ? (
            <div>
          <h3 className={sectionHeading}>Properties</h3>
          {rings.map((ring, index) => {
            const ringType = formatRingClass(ring.RingClass);
            const beltIconPath = getBeltImageFromRings([ring]);
            return (
              <div key={ring.Name || index} className="card p-3">
                <div className="flex items-center gap-2 mb-3">
                  <img 
                    src={beltIconPath}
                    alt={ringType}
                    className="w-6 h-6 object-contain"
                  />
                  <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                    {ringType}
                  </span>
                  </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Mass</dt>
                    <dd className="text-slate-900 dark:text-white">{formatRingMass(ring.MassMT)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Inner Radius</dt>
                    <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.InnerRad)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Outer Radius</dt>
                    <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.OuterRad)}</dd>
                  </div>
                </dl>
                {ring.Materials && ring.Materials.length > 0 && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Materials:</span>{' '}
                    {ring.Materials.map((m) => `${m.Name} (${m.Count})`).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <h3 className={sectionHeading}>Properties</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600 dark:text-slate-400">Distance</dt>
              <dd className="text-slate-900 dark:text-white">{(Number(body?.distanceLS) || 0).toFixed(2)} ls</dd>
            </div>
          </dl>
                  </div>
                )}
              </div>
  );

  return (
    <aside className="relative flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto" style={{ width: detailsPanelWidth }}>
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-slate-300 dark:hover:bg-slate-600 z-10 shrink-0"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">
            {body.name}
          </h2>
          <button
            onClick={togglePanel}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
            </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 flex-shrink-0">
            {body.bodyType === 'Star' ? (
              <img 
                src={showDetails ? getStarImage(body.subType) : 'stars/star_G.png'}
                alt={body.subType || 'Star'}
                className="w-full h-full object-contain"
              />
            ) : body.bodyType === 'Belt' ? (
              <img 
                src={showDetails ? getBeltImageFromRings(rings) : 'other/asteroidbelt.png'}
                alt="Asteroid Belt"
                className="w-full h-full object-contain"
              />
            ) : (
              <img 
                src={showDetails ? getPlanetImage(body.subType) : 'planets/planet_RB.png'}
                alt={body.subType || 'Planet'}
                className="w-full h-full object-contain"
              />
          )}
        </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {showDetails 
                ? (isStar ? formatStarClassFull(body.subType) : (body.subType || body.bodyType))
                : body.bodyType}
            </p>
            {showDetails && (body.discoveredByMe || body.mappedByMe) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {body.discoveredByMe && (
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                    First Discovered
                  </span>
                )}
                {body.mappedByMe && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                    First Mapped
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {!showDetails ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Scan this body to reveal details
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
              Spoiler-free mode is enabled
            </p>
          </div>
        ) : (
          <>
            {isStar && renderStarDetails()}
            {isPlanetOrMoon && renderPlanetMoonDetails()}
            {isBelt && renderBeltDetails()}
          </>
        )}

        {currentSystem && !edsmSpoilerFree && (
          <div className="mt-4">
            <button
              onClick={openEdsmSystemPage}
              className="w-full flex items-center justify-center gap-2 p-2.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View on EDSM
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

export default BodyDetails;
