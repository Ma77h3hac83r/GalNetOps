/** Hierarchical system map: builds tree from bodies (parents from rawJson), renders stars, planets, moons, barycentric pairs, belts; BodyCard + ChildrenColumn + horizontal spacers; zoom and selection; click-and-drag pan. */
import { useMemo, useCallback, Fragment, useState, useRef, useEffect } from 'react';
import { useBodies, useAppStore } from '../stores/appStore';
import type { CelestialBody } from '@shared/types';

interface SystemMapProps {
  iconScale: number;
  textScale: number;
}

export const ICON_SCALE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const TEXT_SCALE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const DEFAULT_ICON_SCALE_INDEX = 2;
export const DEFAULT_TEXT_SCALE_INDEX = 2;

interface TreeNode {
  body: CelestialBody;
  children: TreeNode[];
}

/** Parse Parents array from body rawJson (journal) to get parent type and bodyId for tree building. */
function parseParents(body: CelestialBody): Array<{ type: string; bodyId: number }> {
  try {
    const data = JSON.parse(body.rawJson);
    if (!data.Parents || !Array.isArray(data.Parents)) return [];
    
    return data.Parents.map((parent: Record<string, number>) => {
      const keys = Object.keys(parent);
      const type = keys[0];
      const bodyId = type !== undefined ? parent[type] : 0;
      return { type: type ?? '', bodyId };
    });
  } catch {
    return [];
  }
}

function getBarycentricDesignation(bodyName: string, systemName: string): string | null {
  if (!bodyName.startsWith(systemName)) return null;
  
  const designation = bodyName.slice(systemName.length).trim();
  const match = designation.match(/^([A-Z]{2,})\s+\d/);
  return match && match[1] ? match[1] : null;
}

function getStarDesignation(bodyName: string, systemName: string): string | null {
  if (!bodyName.startsWith(systemName)) return null;
  
  const designation = bodyName.slice(systemName.length).trim();
  const match = designation.match(/^([A-Z])(?:\s|$)/);
  return match && match[1] ? match[1] : null;
}

function getImmediateNullParent(body: CelestialBody): number | null {
  const parents = parseParents(body);
  const first = parents[0];
  if (first && first.type === 'Null') {
    return first.bodyId;
  }
  return null;
}

function findActualParent(
  body: CelestialBody, 
  bodiesById: Map<number, CelestialBody>
): CelestialBody | null {
  const parents = parseParents(body);
  
  for (const parent of parents) {
    const parentBody = bodiesById.get(parent.bodyId);
    if (parentBody) {
      return parentBody;
    }
  }
  
  return null;
}

function getShortName(bodyName: string, systemName: string): string {
  if (bodyName.startsWith(systemName)) {
    let designation = bodyName.slice(systemName.length).trim();
    
    if (designation.includes('Belt')) {
      const beltMatch = designation.match(/^([A-Z]+\s*Belt)/i);
      if (beltMatch && beltMatch[1]) {
        return beltMatch[1];
      }
    }
    const lastPart = bodyName.split(' ').slice(-1)[0];
    return designation || (lastPart ?? bodyName);
  }
  const lastPart = bodyName.split(' ').slice(-1)[0];
  return lastPart ?? bodyName;
}

function getBodyLabel(body: CelestialBody, systemName: string): string {
  let designation = getShortName(body.name, systemName);
  
  if (body.bodyType === 'Star') {
    // Primary star (bodyId 0) has same name as system, so getShortName returns wrong fallback (e.g. "c14-17"); use "A"
    if (body.bodyId === 0) designation = 'A';
    else if (!designation) designation = '?';
    return `Star ${designation}`;
  }
  if (body.bodyType === 'Belt') {
    return designation;
  }
  if (body.bodyType === 'Moon') {
    return `Moon ${designation}`;
  }
  return `Planet ${designation}`;
}

function formatStarClass(subType: string | undefined): string {
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
    if (s.includes('chd')) return 'Carbon CHd-Class';
    if (s.includes('ch')) return 'Carbon CH-Class';
    if (s.includes('cj')) return 'Carbon CJ-Class';
    if (s.includes('cn')) return 'Carbon CN-Class';
    if (s.includes('cs') || s.includes('c-s')) return 'Carbon CS-Class';
    return 'Carbon C-Class';
  }
  
  if (s.startsWith('ms') || s.includes('m-s')) return 'MS-Class';
  if (s.startsWith('s ') || s.includes('s-type')) return 'S-Class';
  
  // Y, L, T are brown dwarf classes—label clearly so they aren’t mistaken for main-sequence stars
  if (s.startsWith('y ') || s.includes('y-type')) return 'Y-Type (Brown Dwarf)';
  if (s.startsWith('l ') || s.includes('l-type')) return 'L-Type (Brown Dwarf)';
  if (s.startsWith('t ') || s.includes('t-type')) return 'T-Type (Brown Dwarf)';
  
  const mainSeq = s.match(/^([obafgkmlty])\s/i);
  if (mainSeq && mainSeq[1]) {
    return `${mainSeq[1].toUpperCase()}-Class`;
  }
  
  const typeMatch = s.match(/([obafgkmlty])-type/i);
  if (typeMatch && typeMatch[1]) {
    return `${typeMatch[1].toUpperCase()}-Class`;
  }
  
  if (s.includes('red dwarf')) return 'M-Class';
  
  return subType;
}

function formatPlanetClass(subType: string | undefined, isMoon: boolean): string {
  if (!subType?.trim()) return isMoon ? 'Moon' : 'Planet';
  const s = subType.toLowerCase().trim();
  // Gas giants (check specific variants before generic)
  if (s.includes('gas giant') && s.includes('water') && s.includes('life')) return 'GGWBL';
  if (s.includes('gas giant') && s.includes('ammonia') && s.includes('life')) return 'GGABL';
  if (s.includes('water giant') && s.includes('life')) return 'WGWL';
  if (s.includes('water giant')) return 'WG';
  if (s.includes('class i ') && s.includes('gas')) return 'C1GG';
  if (s.includes('class ii ') && s.includes('gas')) return 'C2GG';
  if (s.includes('class iii ') && s.includes('gas')) return 'C3GG';
  if (s.includes('class iv ') && s.includes('gas')) return 'C4GG';
  if (s.includes('class v ') && s.includes('gas')) return 'C5GG';
  if (s.includes('helium rich') && s.includes('gas')) return 'HRGG';
  if (s.includes('helium') && s.includes('gas')) return 'HGG';
  if (s.includes('gas giant')) return 'GG';
  // Terrestrial
  if (s.includes('earth-like') || s.includes('earthlike')) return 'ELW';
  if (s.includes('water world')) return 'WW';
  if (s.includes('ammonia world')) return 'AW';
  if (s.includes('high metal') && s.includes('content')) return 'HMC';
  if (s.includes('metal rich')) return 'MR';
  if (s.includes('rocky ice')) return 'RIB';
  if (s.includes('rocky')) return 'RB';
  if (s.includes('icy')) return 'IB';
  return subType.trim();
}

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
    if (s.includes('cs') || s.includes('c-s')) return 'stars/star_CS.png';
    return 'stars/star_C.png';
  }
  
  if (s.startsWith('s ') || s.includes('s-type')) {
    if (s.includes('ms') || s.includes('m-s')) return 'stars/star_MS.png';
    return 'stars/star_S.png';
  }
  
  if (s.includes('white dwarf') || s.startsWith('d')) {
    if (s.includes('dav')) return 'stars/star_DAV.png';
    if (s.includes('daz')) return 'stars/star_DAZ.png';
    if (s.includes('dao')) return 'stars/star_DAO.png';
    if (s.includes('dab')) return 'stars/star_DAB.png';
    if (s.includes('da')) return 'stars/star_DA.png';
    if (s.includes('dbv')) return 'stars/star_DBV.png';
    if (s.includes('dbz')) return 'stars/star_DBZ.png';
    if (s.includes('db')) return 'stars/star_DB.png';
    if (s.includes('dov')) return 'stars/star_DOV.png';
    if (s.includes('do')) return 'stars/star_DO.png';
    if (s.includes('dq')) return 'stars/star_DQ.png';
    if (s.includes('dcv')) return 'stars/star_DCV.png';
    if (s.includes('dc')) return 'stars/star_DC.png';
    if (s.includes('dx')) return 'stars/star_DX.png';
    return 'stars/star_D.png';
  }
  
  if (s.includes('neutron')) return 'stars/star_N.png';
  if (s.includes('supermassive black hole')) return 'stars/star_SBH.png';
  if (s.includes('black hole')) return 'stars/star_BH.png';
  
  return 'stars/star_G.png';
}

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

function getBeltImage(body: CelestialBody): string {
  try {
    const data = JSON.parse(body.rawJson);
    const rings = data.Rings || data.rings;
    if (rings && rings.length > 0) {
      const ringClass = (rings[0].RingClass || rings[0].ringClass || rings[0].type || '').toLowerCase();
      
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
  } catch {
    // Fall through to default
  }
  return 'other/asteroidbelt.png';
}

function getRingImage(body: CelestialBody): string {
  try {
    const data = JSON.parse(body.rawJson);
    const rings = data.Rings || data.rings;
    if (rings && rings.length > 0) {
      const ringClass = (rings[0].RingClass || rings[0].ringClass || rings[0].type || '').toLowerCase();
      
      if (ringClass.includes('metalric') || ringClass.includes('metal rich') || ringClass.includes('metalrich')) {
        return 'other/rings_metalrich.png';
      }
      if (ringClass.includes('metallic') || ringClass.includes('metal')) {
        return 'other/rings_metallic.png';
      }
      if (ringClass.includes('icy') || ringClass.includes('ice')) {
        return 'other/rings_icy.png';
      }
      if (ringClass.includes('rocky') || ringClass.includes('rock')) {
        return 'other/rings_rocky.png';
      }
    }
  } catch {
    // Fall through to default
  }
  return 'other/rings_rocky.png';
}

function hasRings(body: CelestialBody): boolean {
  try {
    const data = JSON.parse(body.rawJson);
    const rings = data.Rings || data.rings;
    return rings && rings.length > 0;
  } catch {
    return false;
  }
}

const ICON_MIN_SIZE = 32;
const ICON_MAX_STAR_SIZE = 256;
const ICON_MAX_PLANET_SIZE = 128;
const ICON_BELT_SIZE = 64;

function calculateMassBasedSize(
  body: CelestialBody, 
  maxStarMass: number, 
  maxPlanetMass: number
): number {
  const mass = body.mass || 0.001;
  const isStar = body.bodyType === 'Star';
  const isBelt = body.bodyType === 'Belt';
  
  if (isBelt) {
    return ICON_BELT_SIZE;
  }
  
  const scalePower = 0.25;
  
  let size: number;
  
  if (isStar) {
    const maxMass = Math.max(maxStarMass, 0.01);
    const scaleFactor = Math.pow(mass / maxMass, scalePower);
    size = ICON_MIN_SIZE + (ICON_MAX_STAR_SIZE - ICON_MIN_SIZE) * scaleFactor;
  } else {
    const maxMass = Math.max(maxPlanetMass, 0.0001);
    const scaleFactor = Math.pow(mass / maxMass, scalePower);
    size = ICON_MIN_SIZE + (ICON_MAX_PLANET_SIZE - ICON_MIN_SIZE) * scaleFactor;
  }
  
  return Math.max(ICON_MIN_SIZE, size);
}

const BODY_SCAN_VALUES: Record<string, { base: number; terraformable?: number }> = {
  'Ammonia World': { base: 146500 },
  'Earth-like World': { base: 275000 },
  'Earthlike Body': { base: 275000 },
  'Water world': { base: 99500, terraformable: 274000 },
  'High Metal Content Body': { base: 15000, terraformable: 169000 },
  'High Metal Content World': { base: 15000, terraformable: 169000 },
  'Icy Body': { base: 550 },
  'Metal Rich Body': { base: 32000 },
  'Rocky Body': { base: 600, terraformable: 132000 },
  'Rocky Ice body': { base: 550 },
  'Rocky Ice World': { base: 550 },
  'Class I Gas Giant': { base: 3900 },
  'Sudarsky Class I Gas Giant': { base: 3900 },
  'Class II Gas Giant': { base: 29000 },
  'Sudarsky Class II Gas Giant': { base: 29000 },
  'Class III Gas Giant': { base: 1000 },
  'Sudarsky Class III Gas Giant': { base: 1000 },
  'Class IV Gas Giant': { base: 1000 },
  'Sudarsky Class IV Gas Giant': { base: 1000 },
  'Class V Gas Giant': { base: 1000 },
  'Sudarsky Class V Gas Giant': { base: 1000 },
  'Gas Giant with Ammonia Based Life': { base: 1000 },
  'Gas Giant with Ammonia-Based Life': { base: 1000 },
  'Gas Giant with Water Based Life': { base: 1000 },
  'Gas Giant with Water-Based Life': { base: 1000 },
  'Helium Rich Gas Giant': { base: 1000 },
  'Helium-Rich Gas Giant': { base: 1000 },
  'Helium Gas Giant': { base: 1000 },
  'Water Giant': { base: 1000 },
  'Water Giant with Life': { base: 1000 },
};

function estimateScanValue(body: CelestialBody): number {
  if (body.scanValue > 0) return body.scanValue;
  
  const subTypeLower = (body.subType || '').toLowerCase();
  
  for (const [key, values] of Object.entries(BODY_SCAN_VALUES)) {
    if (subTypeLower.includes(key.toLowerCase())) {
      let baseValue = values.base;
      if (body.terraformable && values.terraformable) {
        baseValue = values.terraformable;
      }
      // First Discovered: +50% (1.5x); DSS: ~3.33x; First Mapped: +50% on DSS (~5x combined)
      let multiplier = 1;
      if (!body.wasDiscovered) multiplier *= 1.5;
      if (body.scanType === 'Mapped') multiplier *= body.wasMapped ? 3.33 : 5.0;
      return Math.round(baseValue * multiplier);
    }
  }
  
  return body.scanValue || 0;
}

interface BodySignals {
  human: number;
  guardian: number;
  thargoid: number;
}

function parseBodySignals(body: CelestialBody): BodySignals {
  const signals: BodySignals = { human: 0, guardian: 0, thargoid: 0 };
  
  try {
    const data = JSON.parse(body.rawJson);
    const signalList = data.Signals || data.signals || [];
    
    for (const signal of signalList) {
      const type = (signal.Type || signal.type || '').toLowerCase();
      const count = signal.Count || signal.count || 1;
      
      if (type.includes('human')) signals.human += count;
      else if (type.includes('guardian')) signals.guardian += count;
      else if (type.includes('thargoid')) signals.thargoid += count;
    }
  } catch {
    // No signals or parse error
  }
  
  return signals;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(0);
}

function BodyCard({ 
  body, 
  isSelected, 
  onClick,
  iconScale = 1,
  textScale = 1,
  isMoon = false,
  systemName = '',
  maxStarMass = 1,
  maxPlanetMass = 1
}: { 
  body: CelestialBody; 
  isSelected: boolean;
  onClick: () => void;
  iconScale?: number;
  textScale?: number;
  isMoon?: boolean;
  systemName?: string;
  maxStarMass?: number;
  maxPlanetMass?: number;
}) {
  const isStar = body.bodyType === 'Star';
  const isBelt = body.bodyType === 'Belt';
  const bodyHasRings = hasRings(body);
  
  const imagePath = isStar 
    ? getStarImage(body.subType)
    : isBelt 
      ? getBeltImage(body) 
      : getPlanetImage(body.subType);
  
  const ringImagePath = bodyHasRings && !isStar && !isBelt ? getRingImage(body) : null;
  
  const massBasedSize = calculateMassBasedSize(body, maxStarMass, maxPlanetMass);
  const iconPx = Math.round(massBasedSize * iconScale);
  
  const baseTextSize = isMoon ? 8 : 9;
  const textPx = Math.round(baseTextSize * textScale);
  const labelPx = Math.round((isMoon ? 10 : 11) * textScale);
  const infoPx = Math.round((isMoon ? 7 : 8) * textScale);

  // Value calculation
  const bodyScanHighValue = useAppStore((s) => s.bodyScanHighValue);
  const bodyScanMediumValue = useAppStore((s) => s.bodyScanMediumValue);
  const estimatedValue = estimateScanValue(body);
  const isHighVal = estimatedValue >= bodyScanHighValue;
  const isMedVal = estimatedValue >= bodyScanMediumValue && estimatedValue < bodyScanHighValue;

  const signals = parseBodySignals(body);

  // Build info arrays
  // Traits: L, A, T
  const traits: { label: string; color: string; title: string }[] = [];
  if (body.landable) traits.push({ label: 'L', color: '#D97706', title: 'Landable' });
  if (body.atmosphereType && body.atmosphereType !== 'None' && body.atmosphereType !== 'No atmosphere') {
    traits.push({ label: 'A', color: '#38BDF8', title: `Atmosphere: ${body.atmosphereType}` });
  }
  if (body.terraformable) traits.push({ label: 'T', color: '#22C55E', title: 'Terraformable' });

  // Signals: B:n G:n Hu:n Ga:n Th:n
  const signalItems: { label: string; color: string; title: string }[] = [];
  if (body.bioSignals > 0) signalItems.push({ label: `B:${body.bioSignals}`, color: '#4ADE80', title: `${body.bioSignals} Biological` });
  if (body.geoSignals > 0) signalItems.push({ label: `G:${body.geoSignals}`, color: '#92400E', title: `${body.geoSignals} Geological` });
  if (signals.human > 0) signalItems.push({ label: `Hu:${signals.human}`, color: '#3B82F6', title: `${signals.human} Human` });
  if (signals.guardian > 0) signalItems.push({ label: `Ga:${signals.guardian}`, color: '#1E40AF', title: `${signals.guardian} Guardian` });
  if (signals.thargoid > 0) signalItems.push({ label: `Th:${signals.thargoid}`, color: '#166534', title: `${signals.thargoid} Thargoid` });

  // Scan status: FD, FM, M, S
  const scanStatus: { label: string; color: string; title: string }[] = [];
  if (body.discoveredByMe) scanStatus.push({ label: 'FD', color: '#A855F7', title: 'First Discovered' });
  if (body.mappedByMe) scanStatus.push({ label: 'FM', color: '#EC4899', title: 'First Mapped' });
  else if (body.scanType === 'Mapped') scanStatus.push({ label: 'M', color: '#DB2777', title: 'Mapped' });
  else if (body.scanType === 'Detailed') scanStatus.push({ label: 'S', color: '#7C3AED', title: 'FSS Scanned' });

  // Value indicator
  const valueLabel = isHighVal ? '$$$' : isMedVal ? '$$' : '';
  const valueColor = isHighVal ? '#F59E0B' : isMedVal ? '#F97316' : '';

  // Render a dot-separated line of colored items
  const InfoLine = ({ items, separator = '·' }: { items: { label: string; color: string; title: string }[]; separator?: string }) => (
    <span className="whitespace-nowrap">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span className="text-slate-400 dark:text-slate-500 mx-0.5">{separator}</span>}
          <span style={{ color: item.color }} title={item.title}>{item.label}</span>
        </span>
      ))}
    </span>
  );

  const hasLine1 = !isStar && (traits.length > 0 || signalItems.length > 0);
  const hasLine2 = scanStatus.length > 0 || valueLabel || body.distanceLS > 0;

  return (
    <div
      className={`
        flex flex-col items-center cursor-pointer transition-all p-1.5 rounded-lg text-center
        ${isSelected ? 'bg-accent-100 dark:bg-accent-900/40 ring-2 ring-accent-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'}
      `}
      onClick={onClick}
    >
      {/* Body label above icon */}
      <div className="font-semibold text-center" style={{ fontSize: `${labelPx}px` }} title={body.name}>
        {isStar ? (
          `${getBodyLabel(body, systemName)} · ${formatStarClass(body.subType)}`
        ) : isBelt ? (
          getBodyLabel(body, systemName)
        ) : (
          <>
            <div>{getShortName(body.name, systemName)}</div>
            <div className="text-slate-500 dark:text-slate-400 font-medium" style={{ fontSize: `${infoPx}px` }}>
              {formatPlanetClass(body.subType, body.bodyType === 'Moon')}
            </div>
          </>
        )}
      </div>

      {/* Icon */}
      <div className="relative flex items-center justify-center flex-shrink-0 my-0.5" style={{ width: `${iconPx}px`, height: `${iconPx}px` }}>
        {isBelt ? (
          <img
            src={imagePath}
            alt="Belt"
            className="w-full h-full object-contain"
            onError={(e) => { (e.target as HTMLImageElement).src = 'other/asteroidbelt.png'; }}
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={imagePath || 'planets/planet_RB.png'}
              alt={body.subType}
              className="w-full h-full object-contain relative z-10"
              onError={(e) => { (e.target as HTMLImageElement).src = isStar ? 'stars/star_G.png' : 'planets/planet_RB.png'; }}
            />
            {ringImagePath && (
              <img
                src={ringImagePath}
                alt="rings"
                className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none"
                style={{ transform: 'rotate(-15deg) scale(1.8)' }}
                onError={(e) => { (e.target as HTMLImageElement).src = 'other/rings_rocky.png'; }}
              />
            )}
          </div>
        )}
      </div>

      {/* Line 1: Traits (L·A·T) | Signals (B:2 G:1) */}
      {hasLine1 && (
        <div 
          className="flex items-center justify-center gap-2 font-medium" 
          style={{ fontSize: `${infoPx}px` }}
        >
          {traits.length > 0 && <InfoLine items={traits} />}
          {traits.length > 0 && signalItems.length > 0 && (
            <span className="text-slate-300 dark:text-slate-600">|</span>
          )}
          {signalItems.length > 0 && <InfoLine items={signalItems} separator=" " />}
        </div>
      )}

      {/* Line 2: Scan status (FD·FM) | Value ($$$) | Distance */}
      {hasLine2 && (
        <div 
          className="flex items-center justify-center gap-1.5 text-slate-500 dark:text-slate-400" 
          style={{ fontSize: `${infoPx}px` }}
        >
          {scanStatus.length > 0 && <InfoLine items={scanStatus} />}
          {valueLabel && (
            <span style={{ color: valueColor }} title={`Est. ${formatNumber(estimatedValue)} CR`}>
              {valueLabel}
            </span>
          )}
          {body.distanceLS > 0 && (
            <span className="text-slate-400 dark:text-slate-500">
              {formatNumber(body.distanceLS)} ls
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ChildrenColumn({ 
  children, 
  selectedBodyId, 
  onSelect,
  systemName,
  iconScale,
  textScale,
  maxStarMass,
  maxPlanetMass
}: { 
  children: TreeNode[]; 
  selectedBodyId: number | null;
  onSelect: (id: number) => void;
  systemName: string;
  iconScale: number;
  textScale: number;
  maxStarMass: number;
  maxPlanetMass: number;
}) {
  if (children.length === 0) return null;
  
  return (
    <div className="flex flex-col items-center mt-1">
      <div className="w-px h-3 bg-slate-400 dark:bg-slate-500" />
      
      <div className="flex flex-col items-center gap-2">
        {children.map((child, idx) => (
          <div key={child.body.bodyId} className="flex flex-col items-center">
            {idx > 0 && <div className="w-px h-2 bg-slate-300 dark:bg-slate-600" />}
            
            <div className="relative">
              <BodyCard
                body={child.body}
                isSelected={child.body.bodyId === selectedBodyId}
                onClick={() => onSelect(child.body.bodyId)}
                iconScale={iconScale}
                textScale={textScale}
                isMoon={true}
                systemName={systemName}
                maxStarMass={maxStarMass}
                maxPlanetMass={maxPlanetMass}
              />
              
              {child.children.length > 0 && (
                <div className="absolute left-full top-0 ml-3">
                  <SubMoonRow
                    children={child.children}
                    selectedBodyId={selectedBodyId}
                    onSelect={onSelect}
                    systemName={systemName}
                    iconScale={iconScale}
                    textScale={textScale}
                    maxStarMass={maxStarMass}
                    maxPlanetMass={maxPlanetMass}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubMoonRow({
  children,
  selectedBodyId,
  onSelect,
  systemName,
  iconScale,
  textScale,
  maxStarMass,
  maxPlanetMass
}: {
  children: TreeNode[];
  selectedBodyId: number | null;
  onSelect: (id: number) => void;
  systemName: string;
  iconScale: number;
  textScale: number;
  maxStarMass: number;
  maxPlanetMass: number;
}) {
  if (children.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-px bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
      
      <div className="flex items-start gap-3">
        {children.map((subMoon) => (
          <div key={subMoon.body.bodyId} className="flex items-start gap-2">
            <BodyCard
              body={subMoon.body}
              isSelected={subMoon.body.bodyId === selectedBodyId}
              onClick={() => onSelect(subMoon.body.bodyId)}
              iconScale={iconScale}
              textScale={textScale}
              isMoon={true}
              systemName={systemName}
              maxStarMass={maxStarMass}
              maxPlanetMass={maxPlanetMass}
            />
            {subMoon.children.length > 0 && (
              <SubMoonRow
                children={subMoon.children}
                selectedBodyId={selectedBodyId}
                onSelect={onSelect}
                systemName={systemName}
                iconScale={iconScale}
                textScale={textScale}
                maxStarMass={maxStarMass}
                maxPlanetMass={maxPlanetMass}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRow({
  star,
  planets,
  selectedBodyId,
  onSelect,
  systemName,
  iconScale,
  textScale,
  maxStarMass,
  maxPlanetMass
}: {
  star: TreeNode;
  planets: TreeNode[];
  selectedBodyId: number | null;
  onSelect: (id: number) => void;
  systemName: string;
  iconScale: number;
  textScale: number;
  maxStarMass: number;
  maxPlanetMass: number;
}) {
  const starIconSize = Math.round(calculateMassBasedSize(star.body, maxStarMass, maxPlanetMass) * iconScale);
  
  return (
    <div className="flex items-start gap-2">
      <div className="flex flex-col items-center flex-shrink-0">
        <BodyCard
          body={star.body}
          isSelected={star.body.bodyId === selectedBodyId}
          onClick={() => onSelect(star.body.bodyId)}
          iconScale={iconScale}
          textScale={textScale}
          systemName={systemName}
          maxStarMass={maxStarMass}
          maxPlanetMass={maxPlanetMass}
        />
      </div>

      {planets.length > 0 && (
        <div
          className="flex flex-shrink-0 items-center"
          style={{ height: starIconSize }}
        >
          <div className="w-6 h-px bg-slate-400 dark:bg-slate-500" />
        </div>
      )}

      <div className="flex items-start gap-x-6 flex-wrap">
        {planets.map((planet, idx) => {
          const planetIconSize = Math.round(calculateMassBasedSize(planet.body, maxStarMass, maxPlanetMass) * iconScale);
          const topOffset = (starIconSize - planetIconSize) / 2;
          
          return (
            <Fragment key={planet.body.bodyId}>
              {idx > 0 && (
                <div
                  className="flex flex-shrink-0 items-center"
                  style={{ height: starIconSize }}
                >
                  <div className="w-4 h-px bg-slate-400 dark:bg-slate-500" />
                </div>
              )}
              <div
                className="flex flex-col items-center min-w-0"
                style={{ marginTop: topOffset }}
              >
                <BodyCard
                  body={planet.body}
                  isSelected={planet.body.bodyId === selectedBodyId}
                  onClick={() => onSelect(planet.body.bodyId)}
                  iconScale={iconScale}
                  textScale={textScale}
                  systemName={systemName}
                  maxStarMass={maxStarMass}
                  maxPlanetMass={maxPlanetMass}
                />
                {planet.children.length > 0 && (
                  <ChildrenColumn
                    children={planet.children}
                    selectedBodyId={selectedBodyId}
                    onSelect={onSelect}
                    systemName={systemName}
                    iconScale={iconScale}
                    textScale={textScale}
                    maxStarMass={maxStarMass}
                    maxPlanetMass={maxPlanetMass}
                  />
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function BarycentricRow({
  bodies,
  selectedBodyId,
  onSelect,
  systemName,
  iconScale,
  textScale,
  maxStarMass,
  maxPlanetMass
}: {
  bodies: TreeNode[];
  selectedBodyId: number | null;
  onSelect: (id: number) => void;
  systemName: string;
  iconScale: number;
  textScale: number;
  maxStarMass: number;
  maxPlanetMass: number;
}) {
  if (bodies.length === 0) return null;

  const largestIconSize = Math.max(
    ...bodies.map(b => Math.round(calculateMassBasedSize(b.body, maxStarMass, maxPlanetMass) * iconScale))
  );

  return (
    <div className="flex items-start gap-2 pl-12 ml-8">
      <div
        className="flex flex-shrink-0 items-center"
        style={{ height: largestIconSize }}
      >
        <div className="w-6 h-px bg-slate-400 dark:bg-slate-500" />
      </div>

      <div className="flex items-start gap-x-6 flex-wrap">
        {bodies.map((planet, idx) => {
          const planetIconSize = Math.round(calculateMassBasedSize(planet.body, maxStarMass, maxPlanetMass) * iconScale);
          const topOffset = (largestIconSize - planetIconSize) / 2;
          
          return (
            <Fragment key={planet.body.bodyId}>
              {idx > 0 && (
                <div
                  className="flex flex-shrink-0 items-center"
                  style={{ height: largestIconSize }}
                >
                  <div className="w-4 h-px bg-slate-400 dark:bg-slate-500" />
                </div>
              )}
              <div
                className="flex flex-col items-center min-w-0"
                style={{ marginTop: topOffset }}
              >
                <BodyCard
                  body={planet.body}
                  isSelected={planet.body.bodyId === selectedBodyId}
                  onClick={() => onSelect(planet.body.bodyId)}
                  iconScale={iconScale}
                  textScale={textScale}
                  systemName={systemName}
                  maxStarMass={maxStarMass}
                  maxPlanetMass={maxPlanetMass}
                />
                {planet.children.length > 0 && (
                  <ChildrenColumn
                    children={planet.children}
                    selectedBodyId={selectedBodyId}
                    onSelect={onSelect}
                    systemName={systemName}
                    iconScale={iconScale}
                    textScale={textScale}
                    maxStarMass={maxStarMass}
                    maxPlanetMass={maxPlanetMass}
                  />
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

function SystemMap({ iconScale, textScale }: SystemMapProps) {
  const bodies = useBodies();
  const selectedBodyId = useAppStore((state) => state.selectedBodyId);
  const setSelectedBody = useAppStore((state) => state.setSelectedBody);

  const currentSystem = useAppStore((state) => state.currentSystem);
  const systemName = currentSystem?.name || '';

  const starSystems = useMemo(() => {
    if (bodies.length === 0) return { starSystems: [], orphanPlanets: [], barycentricBodies: new Map<string, TreeNode[]>() };

    const beltClusters = bodies.filter(b => b.bodyType === 'Belt');
    const nonBeltBodies = bodies.filter(b => b.bodyType !== 'Belt');
    
    const beltsByRingId = new Map<number, { clusters: CelestialBody[]; starId: number | null; nullId: number | null }>();
    for (const belt of beltClusters) {
      const parents = parseParents(belt);
      let ringId: number | null = null;
      let starId: number | null = null;
      let nullId: number | null = null;
      
      for (const parent of parents) {
        if (parent.type === 'Ring') ringId = parent.bodyId;
        if (parent.type === 'Star') starId = parent.bodyId;
        if (parent.type === 'Null' && nullId === null) nullId = parent.bodyId;
      }
      
      if (ringId !== null) {
        if (!beltsByRingId.has(ringId)) {
          beltsByRingId.set(ringId, { clusters: [], starId, nullId });
        }
        beltsByRingId.get(ringId)!.clusters.push(belt);
      }
    }
    
    const bodiesById = new Map<number, CelestialBody>();
    for (const body of nonBeltBodies) {
      bodiesById.set(body.bodyId, body);
    }

    const nodesById = new Map<number, TreeNode>();
    for (const body of nonBeltBodies) {
      nodesById.set(body.bodyId, { body, children: [] });
    }

    const stars: TreeNode[] = [];
    const starsByDesignation = new Map<string, TreeNode>();
    const secondaryStarsToAttach: { node: TreeNode; body: CelestialBody }[] = [];
    
    // First pass: identify primary star (bodyId 0) and collect secondary stars
    for (const body of nonBeltBodies) {
      if (body.bodyType === 'Star') {
        const node = nodesById.get(body.bodyId)!;
        
        if (body.bodyId === 0) {
          // Primary star is always a root star
          stars.push(node);
          const designation = getStarDesignation(body.name, systemName);
          if (designation) {
            starsByDesignation.set(designation, node);
          }
        } else {
          // Secondary stars: try to attach to parent, else show as root
          secondaryStarsToAttach.push({ node, body });
        }
      }
    }

    // Attach secondary stars to their parent if available; otherwise add as root stars
    for (const { node, body } of secondaryStarsToAttach) {
      const parent = findActualParent(body, bodiesById);
      if (parent) {
        const parentNode = nodesById.get(parent.bodyId);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          // Parent not in tree yet — show as root star
          stars.push(node);
        }
      } else {
        // No parent found — show as root star
        stars.push(node);
      }
    }

    const barycentricBodies = new Map<string, TreeNode[]>();
    const rootBodies: TreeNode[] = [];
    
    // Process non-star bodies (planets, moons)
    for (const body of nonBeltBodies) {
      if (body.bodyType === 'Star') continue; // Stars handled above
      
      const node = nodesById.get(body.bodyId)!;
      const parent = findActualParent(body, bodiesById);
      
      const baryDesignation = getBarycentricDesignation(body.name, systemName);
      
      if (baryDesignation) {
        const immediateNullParent = getImmediateNullParent(body);
        
        if (immediateNullParent !== null && !parent) {
          if (!barycentricBodies.has(baryDesignation)) {
            barycentricBodies.set(baryDesignation, []);
          }
          barycentricBodies.get(baryDesignation)!.push(node);
        } else if (parent) {
          const parentNode = nodesById.get(parent.bodyId);
          if (parentNode) {
            parentNode.children.push(node);
          } else {
            rootBodies.push(node);
          }
        } else {
          rootBodies.push(node);
        }
      } else if (parent) {
        const parentNode = nodesById.get(parent.bodyId);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          rootBodies.push(node);
        }
      } else {
        rootBodies.push(node);
      }
    }

    for (const [ringId, beltData] of beltsByRingId) {
      const { clusters, starId, nullId } = beltData;
      if (clusters.length === 0) continue;
      
      clusters.sort((a, b) => a.bodyId - b.bodyId);
      const representative = clusters[0];
      if (!representative) continue;
      
      const baryDesignation = getBarycentricDesignation(representative.name, systemName);
      
      const beltNode: TreeNode = {
        body: representative,
        children: [],
      };
      
      if (baryDesignation && nullId !== null && starId === null) {
        if (!barycentricBodies.has(baryDesignation)) {
          barycentricBodies.set(baryDesignation, []);
        }
        barycentricBodies.get(baryDesignation)!.push(beltNode);
      } else if (starId !== null) {
        const starNode = nodesById.get(starId);
        if (starNode) {
          starNode.children.push(beltNode);
        }
      }
    }

    const sortByBodyId = (a: TreeNode, b: TreeNode) => a.body.bodyId - b.body.bodyId;
    
    const sortChildren = (node: TreeNode) => {
      node.children.sort(sortByBodyId);
      for (const child of node.children) {
        sortChildren(child);
      }
    };

    const result: { star: TreeNode; planets: TreeNode[] }[] = [];
    
    stars.sort(sortByBodyId);
    
    for (const starNode of stars) {
      sortChildren(starNode);
      
      result.push({ 
        star: starNode, 
        planets: starNode.children 
      });
    }

    for (const [designation, bodies] of barycentricBodies) {
      bodies.sort(sortByBodyId);
      for (const body of bodies) {
        sortChildren(body);
      }
    }

    const orphanPlanets: TreeNode[] = rootBodies.filter(n => n.body.bodyType !== 'Star');
    orphanPlanets.sort(sortByBodyId);
    for (const orphan of orphanPlanets) {
      sortChildren(orphan);
    }

    let maxStarMass = 0;
    let maxPlanetMass = 0;
    
    for (const body of nonBeltBodies) {
      const mass = body.mass || 0;
      if (body.bodyType === 'Star') {
        maxStarMass = Math.max(maxStarMass, mass);
      } else {
        maxPlanetMass = Math.max(maxPlanetMass, mass);
      }
    }
    
    maxStarMass = maxStarMass || 1;
    maxPlanetMass = maxPlanetMass || 1;

    return { starSystems: result, orphanPlanets, barycentricBodies, maxStarMass, maxPlanetMass };
  }, [bodies, systemName]);

  const handleSelect = useCallback((bodyId: number) => {
    setSelectedBody(bodyId);
  }, [setSelectedBody]);

  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasPannedRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const viewportSizeRef = useRef({ width: 0, height: 0 });
  const contentSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!viewport || !content) return;

    const clampPan = (p: { x: number; y: number }) => {
      const vw = viewportSizeRef.current.width;
      const vh = viewportSizeRef.current.height;
      const cw = contentSizeRef.current.width;
      const ch = contentSizeRef.current.height;
      if (vw === 0 || vh === 0) return p;
      const minX = cw > vw ? -(cw - vw) : 0;
      const maxX = 0;
      const minY = ch > vh ? -(ch - vh) : 0;
      const maxY = 0;
      return {
        x: Math.max(minX, Math.min(maxX, p.x)),
        y: Math.max(minY, Math.min(maxY, p.y)),
      };
    };

    const updateSizes = () => {
      if (viewport) {
        const rect = viewport.getBoundingClientRect();
        viewportSizeRef.current = { width: rect.width, height: rect.height };
      }
      if (content) {
        contentSizeRef.current = {
          width: content.scrollWidth,
          height: content.scrollHeight,
        };
      }
      setPan((p) => clampPan(p));
    };

    updateSizes();
    const ro = new ResizeObserver(updateSizes);
    ro.observe(viewport);
    ro.observe(content);
    return () => ro.disconnect();
  }, [bodies.length, iconScale, textScale]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasPannedRef.current = false;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasPannedRef.current = true;
    }
    setPan((p) => {
      const vw = viewportSizeRef.current.width;
      const vh = viewportSizeRef.current.height;
      const cw = contentSizeRef.current.width;
      const ch = contentSizeRef.current.height;
      const minX = cw > vw ? -(cw - vw) : 0;
      const maxX = 0;
      const minY = ch > vh ? -(ch - vh) : 0;
      const maxY = 0;
      return {
        x: Math.max(minX, Math.min(maxX, p.x + dx)),
        y: Math.max(minY, Math.min(maxY, p.y + dy)),
      };
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasPannedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    hasPannedRef.current = false;
  }, []);

  if (bodies.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8">
        <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-lg font-medium">No bodies scanned</p>
        <p className="text-sm mt-1 text-center max-w-md">
          Body data will appear here when you scan bodies in-game, or you can import your exploration history.
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-blue-700 dark:text-blue-400">
              <p className="font-medium">Have existing exploration data?</p>
              <p className="mt-1">
                Go to <span className="font-semibold">Settings → Data Management → Import Journal History</span> to import your past exploration from journal files.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        ref={viewportRef}
        className="flex-1 overflow-hidden p-4 relative cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClickCapture}
      >
        <div
          ref={contentRef}
          className="flex flex-col gap-4 min-w-max"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
        >
          {starSystems.starSystems.map(({ star, planets }, index) => {
            const starDesignation = getStarDesignation(star.body.name, systemName);
            const nextStar = starSystems.starSystems[index + 1];
            const nextStarDesignation = nextStar ? getStarDesignation(nextStar.star.body.name, systemName) : null;
            
            const barycentricToShow: { designation: string; bodies: TreeNode[] }[] = [];
            
            if (starDesignation && nextStarDesignation) {
              const possibleDesignation = starDesignation + nextStarDesignation;
              const bodies = starSystems.barycentricBodies.get(possibleDesignation);
              if (bodies && bodies.length > 0) {
                barycentricToShow.push({ designation: possibleDesignation, bodies });
              }
            }
            
            if (starDesignation === 'A') {
              for (const [designation, bodies] of starSystems.barycentricBodies) {
                if (designation.length > 2 && designation.startsWith('A') && bodies.length > 0) {
                  if (!barycentricToShow.find(b => b.designation === designation)) {
                    barycentricToShow.push({ designation, bodies });
                  }
                }
              }
            }
            
            return (
              <div key={star.body.bodyId}>
                <StarRow
                  star={star}
                  planets={planets}
                  selectedBodyId={selectedBodyId}
                  onSelect={handleSelect}
                  systemName={systemName}
                  iconScale={iconScale}
                  textScale={textScale}
                  maxStarMass={starSystems.maxStarMass ?? 1}
                  maxPlanetMass={starSystems.maxPlanetMass ?? 1}
                />
                
                {barycentricToShow.map(({ designation, bodies }) => (
                  <div key={designation} className="my-2">
                    <BarycentricRow
                      bodies={bodies}
                      selectedBodyId={selectedBodyId}
                      onSelect={handleSelect}
                      systemName={systemName}
                      iconScale={iconScale}
                      textScale={textScale}
                      maxStarMass={starSystems.maxStarMass ?? 1}
                      maxPlanetMass={starSystems.maxPlanetMass ?? 1}
                    />
                  </div>
                ))}
              </div>
            );
          })}

          {starSystems.orphanPlanets.length > 0 && (() => {
            const maxStar = starSystems.maxStarMass ?? 1;
            const maxPlanet = starSystems.maxPlanetMass ?? 1;
            const orphanLargestIcon = Math.max(0, ...starSystems.orphanPlanets.map((p) =>
              Math.round(calculateMassBasedSize(p.body, maxStar, maxPlanet) * iconScale)
            ));
            return (
            <div className="flex items-start gap-x-6 flex-wrap mt-2 pt-2 border-t border-slate-300 dark:border-slate-600">
              <span className="text-xs text-slate-400 dark:text-slate-500 self-center mr-2">Other:</span>
              {starSystems.orphanPlanets.map((planet, idx) => (
                <Fragment key={planet.body.bodyId}>
                  {idx > 0 && (
                    <div
                      className="flex flex-shrink-0 items-center"
                      style={{ height: orphanLargestIcon }}
                    >
                      <div className="w-4 h-px bg-slate-400 dark:bg-slate-500" />
                    </div>
                  )}
                  <div
                    className="flex flex-col items-center min-w-0"
                    style={{ marginTop: (orphanLargestIcon - Math.round(calculateMassBasedSize(planet.body, maxStar, maxPlanet) * iconScale)) / 2 }}
                  >
                    <BodyCard
                      body={planet.body}
                      isSelected={planet.body.bodyId === selectedBodyId}
                      onClick={() => handleSelect(planet.body.bodyId)}
                      iconScale={iconScale}
                      textScale={textScale}
                      systemName={systemName}
                      maxStarMass={maxStar}
                      maxPlanetMass={maxPlanet}
                    />
                    {planet.children.length > 0 && (
                      <ChildrenColumn
                        children={planet.children}
                        selectedBodyId={selectedBodyId}
                        onSelect={handleSelect}
                        systemName={systemName}
                        iconScale={iconScale}
                        textScale={textScale}
                        maxStarMass={maxStar}
                        maxPlanetMass={maxPlanet}
                      />
                    )}
                  </div>
                </Fragment>
              ))}
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default SystemMap;
