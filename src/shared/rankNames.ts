/** Elite Dangerous rank name mappings: numeric rank level → display name.
 *  Validated against documentation/RANKS_AND_REPUTATION_GUIDE.md */

export const COMBAT_RANKS = [
  'Harmless', 'Mostly Harmless', 'Novice', 'Competent', 'Expert',
  'Master', 'Dangerous', 'Deadly', 'Elite', 'Elite I', 'Elite II',
  'Elite III', 'Elite IV', 'Elite V',
] as const;

export const TRADE_RANKS = [
  'Penniless', 'Mostly Penniless', 'Peddler', 'Dealer', 'Merchant',
  'Broker', 'Entrepreneur', 'Tycoon', 'Elite', 'Elite I', 'Elite II',
  'Elite III', 'Elite IV', 'Elite V',
] as const;

export const EXPLORE_RANKS = [
  'Aimless', 'Mostly Aimless', 'Scout', 'Surveyor', 'Trailblazer',
  'Pathfinder', 'Ranger', 'Pioneer', 'Elite', 'Elite I', 'Elite II',
  'Elite III', 'Elite IV', 'Elite V',
] as const;

/** Journal field: "Soldier"; display label: "Mercenary". */
export const SOLDIER_RANKS = [
  'Defenceless', 'Mostly Defenceless', 'Rookie', 'Soldier', 'Gunslinger',
  'Warrior', 'Gladiator', 'Deadeye', 'Elite', 'Elite I', 'Elite II',
  'Elite III', 'Elite IV', 'Elite V',
] as const;

export const EXOBIOLOGIST_RANKS = [
  'Directionless', 'Mostly Directionless', 'Compiler', 'Collector', 'Cataloguer',
  'Taxonomist', 'Ecologist', 'Geneticist', 'Elite', 'Elite I', 'Elite II',
  'Elite III', 'Elite IV', 'Elite V',
] as const;

export const EMPIRE_RANKS = [
  'None', 'Outsider', 'Serf', 'Master', 'Squire', 'Knight', 'Lord',
  'Baron', 'Viscount', 'Count', 'Earl', 'Marquis', 'Duke', 'Prince', 'King',
] as const;

export const FEDERATION_RANKS = [
  'None', 'Recruit', 'Cadet', 'Midshipman', 'Petty Officer',
  'Chief Petty Officer', 'Warrant Officer', 'Ensign', 'Lieutenant',
  'Lieutenant Commander', 'Post Commander', 'Post Captain', 'Rear Admiral',
  'Vice Admiral', 'Admiral',
] as const;

export const CQC_RANKS = [
  'Helpless', 'Mostly Helpless', 'Amateur', 'Semi Professional',
  'Professional', 'Champion', 'Hero', 'Legend', 'Elite', 'Elite I',
  'Elite II', 'Elite III', 'Elite IV', 'Elite V',
] as const;

/** Powerplay rating names (0-indexed: Rank 0 = Rating 1). */
export const POWERPLAY_RATINGS = [
  'Rating 1', 'Rating 2', 'Rating 3', 'Rating 4', 'Rating 5',
] as const;

export function getRankName(
  category: 'combat' | 'trade' | 'explore' | 'soldier' | 'exobiologist' | 'empire' | 'federation' | 'cqc',
  level: number
): string {
  const rankMap: Record<string, readonly string[]> = {
    combat: COMBAT_RANKS,
    trade: TRADE_RANKS,
    explore: EXPLORE_RANKS,
    soldier: SOLDIER_RANKS,
    exobiologist: EXOBIOLOGIST_RANKS,
    empire: EMPIRE_RANKS,
    federation: FEDERATION_RANKS,
    cqc: CQC_RANKS,
  };
  const ranks = rankMap[category];
  if (!ranks) return `Level ${level}`;
  return ranks[level] ?? `Level ${level}`;
}

/** Get powerplay rating display name from rank number (0-based). */
export function getPowerplayRating(rank: number): string {
  return POWERPLAY_RATINGS[rank] ?? `Rating ${rank + 1}`;
}

/** Map a reputation percentage (-100 to 100) to its named level. */
export type ReputationLevel = 'Hostile' | 'Unfriendly' | 'Neutral' | 'Cordial' | 'Friendly' | 'Allied';

export function getReputationLevel(value: number): ReputationLevel {
  if (value <= -75) return 'Hostile';
  if (value <= -25) return 'Unfriendly';
  if (value <= 25) return 'Neutral';
  if (value <= 50) return 'Cordial';
  if (value <= 75) return 'Friendly';
  return 'Allied';
}

/** Format a credit value with commas and CR suffix. */
export function formatCredits(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B CR`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M CR`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K CR`;
  }
  return `${value.toLocaleString()} CR`;
}
