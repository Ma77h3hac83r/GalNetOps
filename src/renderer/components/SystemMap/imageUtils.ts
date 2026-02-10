/**
 * Icon image paths for stars, planets, belts, rings.
 */
import type { CelestialBody } from '@shared/types';
import { planetClassToDisplay, starTypeToDisplay } from '@shared/normalization';

export function getStarImage(subType: string | undefined): string {
  if (!subType) return 'stars/star_G.png';
  const s = subType.toLowerCase().trim();
  if (/^[obafgkmlty]$/.test(s)) return `stars/star_${s.toUpperCase()}.png`;
  if (s === 'n') return 'stars/star_N.png';
  if (s === 'h') return 'stars/star_BH.png';
  if (s === 'supermassive_black_hole') return 'stars/star_SMBH.png';
  if ((s === 'd' || /^d[a-z]*$/.test(s)) && !s.includes('dwarf')) {
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
  const display = starTypeToDisplay(subType).toLowerCase();
  const s2 = display || s;
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
    if (s2.includes('cs') || s2.includes('c-s')) return 'stars/star_CS.png';
    return 'stars/star_C.png';
  }
  if (s2.startsWith('s ') || s2.includes('s-type')) {
    if (s2.includes('ms') || s2.includes('m-s')) return 'stars/star_MS.png';
    return 'stars/star_S.png';
  }
  if (s2.includes('white dwarf')) {
    if (s2.includes('dav')) return 'stars/star_DAV.png';
    if (s2.includes('daz')) return 'stars/star_DAZ.png';
    if (s2.includes('dao')) return 'stars/star_DAO.png';
    if (s2.includes('dab')) return 'stars/star_DAB.png';
    if (s2.includes('da')) return 'stars/star_DA.png';
    if (s2.includes('dbv')) return 'stars/star_DBV.png';
    if (s2.includes('dbz')) return 'stars/star_DBZ.png';
    if (s2.includes('db')) return 'stars/star_DB.png';
    if (s2.includes('dov')) return 'stars/star_DOV.png';
    if (s2.includes('do')) return 'stars/star_DO.png';
    if (s2.includes('dq')) return 'stars/star_DQ.png';
    if (s2.includes('dcv')) return 'stars/star_DCV.png';
    if (s2.includes('dc')) return 'stars/star_DC.png';
    if (s2.includes('dx')) return 'stars/star_DX.png';
    return 'stars/star_D.png';
  }
  if (s2.includes('neutron')) return 'stars/star_N.png';
  if (s2.includes('supermassive black hole')) return 'stars/star_SBH.png';
  if (s2.includes('black hole')) return 'stars/star_BH.png';
  return 'stars/star_G.png';
}

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
  if (s.includes('helium rich gas giant') || s.includes('helium-rich gas giant'))
    return 'planets/planet_HRGG.png';
  if (s.includes('helium gas giant')) return 'planets/planet_HGG.png';
  if (s.includes('gas giant with water')) return 'planets/planet_GGWBL.png';
  if (s.includes('gas giant with ammonia')) return 'planets/planet_GGABL.png';
  return 'planets/planet_RB.png';
}

export function getBeltImage(body: CelestialBody): string {
  try {
    const data = JSON.parse(body.rawJson);
    const rings = data.Rings || data.rings;
    if (rings && rings.length > 0) {
      const ringClass = (
        rings[0].RingClass ||
        rings[0].ringClass ||
        rings[0].type ||
        ''
      ).toLowerCase();
      if (
        ringClass.includes('metalric') ||
        ringClass.includes('metal rich') ||
        ringClass.includes('metalrich')
      )
        return 'other/asteroidbelt_metallic.png';
      if (ringClass.includes('metallic') || ringClass.includes('metal'))
        return 'other/asteroidbelt_metallic.png';
      if (ringClass.includes('icy') || ringClass.includes('ice'))
        return 'other/asteroidbelt_icy.png';
      if (ringClass.includes('rocky') || ringClass.includes('rock'))
        return 'other/asteroidbelt_rocky.png';
    }
  } catch {
    // Fall through
  }
  return 'other/asteroidbelt.png';
}

export function getRingImage(body: CelestialBody): string {
  try {
    const data = JSON.parse(body.rawJson);
    const rings = data.Rings || data.rings;
    if (rings && rings.length > 0) {
      const ringClass = (
        rings[0].RingClass ||
        rings[0].ringClass ||
        rings[0].type ||
        ''
      ).toLowerCase();
      if (
        ringClass.includes('metalric') ||
        ringClass.includes('metal rich') ||
        ringClass.includes('metalrich')
      )
        return 'other/rings_metalrich.png';
      if (ringClass.includes('metallic') || ringClass.includes('metal'))
        return 'other/rings_metallic.png';
      if (ringClass.includes('icy') || ringClass.includes('ice'))
        return 'other/rings_icy.png';
      if (ringClass.includes('rocky') || ringClass.includes('rock'))
        return 'other/rings_rocky.png';
    }
  } catch {
    // Fall through
  }
  return 'other/rings_rocky.png';
}

export function hasRings(body: CelestialBody): boolean {
  try {
    const data = JSON.parse(body.rawJson);
    const rings = data.Rings || data.rings;
    return rings && rings.length > 0;
  } catch {
    return false;
  }
}
