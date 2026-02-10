/**
 * Body labels and class formatting for display.
 */
import type { CelestialBody } from '@shared/types';
import { planetClassToDisplay, starTypeToDisplay } from '@shared/normalization';

export function getShortName(bodyName: string, systemName: string): string {
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

export function getBodyLabel(body: CelestialBody, systemName: string): string {
  let designation = getShortName(body.name, systemName);
  if (body.bodyType === 'Star') {
    if (body.bodyId === 0) designation = 'A';
    else if (!designation) designation = '?';
    return `Star ${designation}`;
  }
  if (body.bodyType === 'Belt') return designation;
  if (body.bodyType === 'Moon') return `Moon ${designation}`;
  return `Planet ${designation}`;
}

export function formatStarClass(subType: string | undefined): string {
  if (!subType) return 'Star';
  const s = subType.toLowerCase().trim();
  if (s.includes('_') || !s.includes(' ')) {
    const display = starTypeToDisplay(subType);
    if (display) return display;
  }
  if (s.includes('black hole')) {
    if (s.includes('supermassive')) return 'Supermassive Black Hole';
    return 'Black Hole';
  }
  if (s.includes('neutron')) return 'Neutron Star';
  if (s.includes('wolf-rayet') || s.startsWith('w ')) {
    if (s.includes('wnc') || (s.includes('wn') && s.includes('wc')))
      return 'Wolf-Rayet WNC-Class';
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
  if (s.startsWith('y ') || s.includes('y-type')) return 'Y-Type (Brown Dwarf)';
  if (s.startsWith('l ') || s.includes('l-type')) return 'L-Type (Brown Dwarf)';
  if (s.startsWith('t ') || s.includes('t-type')) return 'T-Type (Brown Dwarf)';
  const mainSeq = s.match(/^([obafgkmlty])\s/i);
  if (mainSeq && mainSeq[1]) return `${mainSeq[1].toUpperCase()}-Class`;
  const typeMatch = s.match(/([obafgkmlty])-type/i);
  if (typeMatch && typeMatch[1]) return `${typeMatch[1].toUpperCase()}-Class`;
  if (s.includes('red dwarf')) return 'M-Class';
  return starTypeToDisplay(subType) || subType;
}

export function formatPlanetClass(subType: string | undefined, isMoon: boolean): string {
  const normalized = planetClassToDisplay(subType?.trim() ?? '');
  if (!normalized) return isMoon ? 'Moon' : 'Planet';
  const s = normalized.toLowerCase();
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
  if (s.includes('earth-like') || s.includes('earthlike')) return 'ELW';
  if (s.includes('water world')) return 'WW';
  if (s.includes('ammonia world')) return 'AW';
  if (s.includes('high metal') && s.includes('content')) return 'HMC';
  if (s.includes('metal rich')) return 'MR';
  if (s.includes('rocky ice')) return 'RIB';
  if (s.includes('rocky')) return 'RB';
  if (s.includes('icy')) return 'IB';
  return normalized;
}
