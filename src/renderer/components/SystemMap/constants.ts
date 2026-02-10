/**
 * Scale steps and icon size constants for SystemMap.
 */
export const ICON_SCALE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const TEXT_SCALE_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const DEFAULT_ICON_SCALE_INDEX = 2;
export const DEFAULT_TEXT_SCALE_INDEX = 2;

export const ICON_MIN_SIZE = 32;
export const ICON_MAX_STAR_SIZE = 256;
export const ICON_MAX_PLANET_SIZE = 128;
export const ICON_BELT_SIZE = 64;

export const BODY_SCAN_VALUES: Record<string, { base: number; terraformable?: number }> = {
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
  'Class II Gas Giant': { base: 29000 },
  'Class III Gas Giant': { base: 1000 },
  'Class IV Gas Giant': { base: 1000 },
  'Class V Gas Giant': { base: 1000 },
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
