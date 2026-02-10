/**
 * BodyDetails: image paths, formatting, and material/atmosphere constants.
 */
import { planetClassToDisplay, starTypeToDisplay } from '@shared/normalization';
import type { Ring } from './bodyDetailsTypes';

/** Map star subType (canonical or journal) to image path. */
export function getStarImage(subType: string | undefined): string {
  if (!subType) return 'stars/star_G.png';
  const s = subType.toLowerCase().trim();
  if (/^[obafgkmlty]$/.test(s)) return `stars/star_${s.toUpperCase()}.png`;
  if (s === 'n') return 'stars/star_N.png';
  if (s === 'h') return 'stars/star_BH.png';
  if (s === 'd' || /^d[a-z]*$/.test(s)) {
    if (s.startsWith('da')) return 'stars/star_DA.png';
    if (s.includes('dab')) return 'stars/star_DAB.png';
    if (s.includes('dao')) return 'stars/star_DAO.png';
    if (s.includes('daz')) return 'stars/star_DAZ.png';
    if (s.includes('dav')) return 'stars/star_DAV.png';
    if (s.startsWith('db')) return s.includes('z') ? 'stars/star_DBZ.png' : s.includes('v') ? 'stars/star_DBV.png' : 'stars/star_DB.png';
    if (s.startsWith('dc')) return s.includes('v') ? 'stars/star_DCV.png' : 'stars/star_DC.png';
    if (s.startsWith('dq')) return 'stars/star_DQ.png';
    return 'stars/star_D.png';
  }
  const display = starTypeToDisplay(subType).toLowerCase();
  const s2 = display || s;

  if (s2.startsWith('o ') || s2.includes('o-type')) return 'stars/star_O.png';
  if (s2.startsWith('b ') || s2.includes('b-type')) return 'stars/star_B.png';
  if (s2.startsWith('a ') || s2.includes('a-type')) return 'stars/star_A.png';
  if (s2.startsWith('f ') || s2.includes('f-type')) return 'stars/star_F.png';
  if (s2.startsWith('g ') || s2.includes('g-type')) return 'stars/star_G.png';
  if (s2.startsWith('k ') || s2.includes('k-type')) return 'stars/star_K.png';
  if (s2.startsWith('m ') || s2.includes('m-type') || s2.includes('red dwarf')) return 'stars/star_M.png';

  if (s2.startsWith('l ') || s2.includes('l-type')) return 'stars/star_I.png';
  if (s2.startsWith('t ') || s2.includes('t-type')) return 'stars/star_T.png';
  if (s2.startsWith('y ') || s2.includes('y-type')) return 'stars/star_Y.png';

  if (s2.includes('t tauri') || s2.includes('tts')) return 'stars/star_TTS.png';
  if (s2.includes('herbig') || s2.includes('ae/be')) return 'stars/star_AEBE.png';

  if (s2.includes('wolf-rayet') || s2.startsWith('w ')) {
    if (s2.includes('wn') && s2.includes('wc')) return 'stars/star_WNC.png';
    if (s2.includes('wn')) return 'stars/star_WN.png';
    if (s2.includes('wc')) return 'stars/star_WC.png';
    if (s2.includes('wo')) return 'stars/star_WO.png';
    return 'stars/star_W.png';
  }

  if (s2.includes('carbon') || s2.startsWith('c ') || s2.startsWith('c-')) {
    if (s2.includes('chd')) return 'stars/star_CHd.png';
    if (s2.includes('ch')) return 'stars/star_CH.png';
    if (s2.includes('cj')) return 'stars/star_CJ.png';
    if (s2.includes('cn')) return 'stars/star_CN.png';
    if (s2.includes('ms')) return 'stars/star_MS.png';
    if (s2.includes('s')) return 'stars/star_S.png';
    return 'stars/star_C.png';
  }

  if (s2.includes('white dwarf') || s2.includes('wd')) {
    if (s2.includes('da')) return 'stars/star_DA.png';
    if (s2.includes('dab')) return 'stars/star_DAB.png';
    if (s2.includes('dao')) return 'stars/star_DAO.png';
    if (s2.includes('daz')) return 'stars/star_DAZ.png';
    if (s2.includes('dav')) return 'stars/star_DAV.png';
    if (s2.includes('db')) return 'stars/star_DB.png';
    if (s2.includes('dbz')) return 'stars/star_DBZ.png';
    if (s2.includes('dbv')) return 'stars/star_DBV.png';
    if (s2.includes('dc')) return 'stars/star_DC.png';
    if (s2.includes('dcv')) return 'stars/star_DCV.png';
    if (s2.includes('dq')) return 'stars/star_DQ.png';
    return 'stars/star_D.png';
  }

  if (s2.includes('neutron')) return 'stars/star_N.png';
  if (s2.includes('black hole') || s2.includes('blackhole')) return 'stars/star_BH.png';
  if (s2.includes('supermassive')) return 'stars/star_SMBH.png';

  return 'stars/star_G.png';
}

/** Map planet subType (canonical or journal) to image path. */
export function getPlanetImage(subType: string | undefined): string {
  if (!subType) return 'planets/planet_RB.png';
  const raw = subType.toLowerCase().trim();
  const s = raw.includes('_') ? planetClassToDisplay(subType).toLowerCase() : raw;

  if (s.includes('earth-like') || s.includes('earthlike')) return 'planets/planet_ELW.png';
  if (s.includes('water world')) return 'planets/planet_WW.png';
  if (s.includes('water giant')) return 'planets/planet_WG.png';
  if (s.includes('ammonia world')) return 'planets/planet_AW.png';
  if (s.includes('high metal content')) return 'planets/planet_HMCW.png';
  if (s.includes('metal rich') || s.includes('metal-rich')) return 'planets/planet_MRB.png';
  if (s.includes('rocky ice')) return 'planets/planet_RIW.png';
  if (s.includes('rocky')) return 'planets/planet_RB.png';
  if (s.includes('icy')) return 'planets/planet_IB.png';
  if (s.includes('class i gas giant')) return 'planets/planet_C1GG.png';
  if (s.includes('class ii gas giant')) return 'planets/planet_C2GG.png';
  if (s.includes('class iii gas giant')) return 'planets/planet_C3GG.png';
  if (s.includes('class iv gas giant')) return 'planets/planet_C4GG.png';
  if (s.includes('class v gas giant')) return 'planets/planet_C5GG.png';
  if (s.includes('helium rich gas giant') || s.includes('helium-rich gas giant')) return 'planets/planet_HRGG.png';
  if (s.includes('helium gas giant')) return 'planets/planet_HGG.png';
  if (s.includes('gas giant with water')) return 'planets/planet_GGWBL.png';
  if (s.includes('gas giant with ammonia')) return 'planets/planet_GGABL.png';

  return 'planets/planet_RB.png';
}

export function getBeltImageFromRings(rings: Ring[]): string {
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

export function getRingImageFromType(ringClass: string | undefined): string {
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

export function formatStarClassFull(subType: string | undefined): string {
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

  return starTypeToDisplay(subType) || subType;
}

export const ATMOSPHERE_COLORS: Record<string, string> = {
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

export const ELEMENT_SYMBOLS: Record<string, string> = {
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

export const ELEMENT_GROUP_COLORS: Record<string, string> = {
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

/** Material rarity categories for sorting (ED: Very Common → Rare). */
export const MATERIAL_RARITY_TIERS: string[][] = [
  ['Phosphorus', 'Nickel', 'Sulphur', 'Carbon', 'Iron', 'Rhenium', 'Lead'],
  ['Arsenic', 'Manganese', 'Germanium', 'Vanadium', 'Chromium', 'Zinc', 'Zirconium'],
  ['Niobium', 'Mercury', 'Cadmium', 'Molybdenum', 'Tin', 'Tungsten', 'Boron'],
  ['Selenium', 'Polonium', 'Tellurium', 'Ruthenium', 'Yttrium', 'Technetium', 'Antimony'],
];
export const RARITY_LABELS = ['Very Common', 'Common', 'Standard', 'Rare', 'Other'];

export function getRarityTier(name: string): number {
  const n = name.toLowerCase();
  for (let t = 0; t < MATERIAL_RARITY_TIERS.length; t++) {
    const tier = MATERIAL_RARITY_TIERS[t];
    if (tier?.some((x) => x.toLowerCase() === n)) return t;
  }
  return -1;
}

export function getRaritySortKey(name: string): number {
  const n = name.toLowerCase();
  for (let t = 0; t < MATERIAL_RARITY_TIERS.length; t++) {
    const tier = MATERIAL_RARITY_TIERS[t];
    const i = tier?.findIndex((x) => x.toLowerCase() === n) ?? -1;
    if (i >= 0) return t * 1000 + i;
  }
  return 9999;
}

export function getElementStyle(symbol: string): { backgroundColor: string; color: string } {
  const key = symbol.length === 1 ? symbol.toUpperCase() : symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();
  const bg = ELEMENT_GROUP_COLORS[key] || DEFAULT_ELEMENT_COLOR;
  const isLight = ['#A5D6A7', '#66BB6A', '#42A5F5', '#F48FB1', '#26C6DA', '#FFB74D', '#A1887F'].includes(bg);
  return { backgroundColor: bg, color: isLight ? '#1e293b' : '#fff' };
}

export function formatRingClass(ringClass: string | undefined): string {
  if (!ringClass) return '';
  const formatted = ringClass.replace(/^eRingClass_/, '');
  return formatted.replace(/([A-Z])/g, ' $1').trim();
}

export function formatRingMass(massMT: number): string {
  const n = Number(massMT);
  if (!Number.isFinite(n) || n < 0) return '0.00 Mt';
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} Tt`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Gt`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} Pt`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)} Gt`;
  return `${n.toFixed(2)} Mt`;
}

export function formatRingRadius(radiusM: number): string {
  const r = Number(radiusM);
  if (!Number.isFinite(r) || r < 0) return '0 km';
  const radiusKm = r / 1000;
  const radiusLs = r / 299792458;

  if (radiusLs >= 0.01) return `${radiusLs.toFixed(3)} ls`;
  if (radiusKm >= 1e6) return `${(radiusKm / 1e6).toFixed(2)}M km`;
  if (radiusKm >= 1e3) return `${(radiusKm / 1e3).toFixed(1)}K km`;
  return `${radiusKm.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

export function formatSemiMajorAxis(meters: number): string {
  const km = meters / 1000;
  const au = meters / 149597870700;
  const ls = meters / 299792458;

  if (au >= 0.01) return `${au.toFixed(3)} AU`;
  if (ls >= 1) return `${ls.toFixed(2)} ls`;
  if (km >= 1e6) return `${(km / 1e6).toFixed(2)}M km`;
  if (km >= 1e3) return `${(km / 1e3).toFixed(1)}K km`;
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 0 })} km`;
}

export function formatPeriod(seconds: number): string {
  const absSeconds = Math.abs(seconds);
  const days = absSeconds / 86400;
  const years = days / 365.25;

  if (years >= 1) return `${years.toFixed(2)} years`;
  if (days >= 1) return `${days.toFixed(2)} days`;
  const hours = absSeconds / 3600;
  if (hours >= 1) return `${hours.toFixed(2)} hours`;
  const minutes = absSeconds / 60;
  return `${minutes.toFixed(1)} min`;
}

export function formatDegrees(degrees: number): string {
  return `${degrees.toFixed(2)}°`;
}

export function formatAxialTilt(radians: number): string {
  const degrees = radians * (180 / Math.PI);
  return `${degrees.toFixed(2)}°`;
}

export function formatSolarRadius(km: number): string {
  const solarRadiusKm = 695700;
  const solarRadii = km / solarRadiusKm;
  return `${solarRadii.toFixed(4)} SR`;
}
