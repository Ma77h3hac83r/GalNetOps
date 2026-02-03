/**
 * Exobiology scan values and sample distances.
 * Source: documentation/ED_data/Exobiological_Species via exobiologySpeciesData.
 */

import {
  buildGenusSampleDistances,
  buildGenusValueRanges,
  buildSpeciesValues,
} from './exobiologySpeciesData';

/**
 * Minimum distance between samples for each genus (from EXOBIOLOGY docs).
 * Distance in meters.
 */
export const GENUS_SAMPLE_DISTANCES: Record<string, number> = buildGenusSampleDistances();

/**
 * Exobiology scan value ranges by genus. Min/max are base Vista Genomics values in CR.
 * First Logged = 5× base.
 */
export const GENUS_VALUE_RANGES: Record<string, { min: number; max: number }> =
  buildGenusValueRanges();

/**
 * Base Vista Genomics value per species. Used when bio.value is missing.
 */
export const SPECIES_VALUES: Record<string, number> = buildSpeciesValues();

/**
 * Get base Vista Genomics value for a species. Case-insensitive lookup.
 */
export function getSpeciesValue(species: string): number | null {
  const key = Object.keys(SPECIES_VALUES).find(
    (k) => k.toLowerCase() === species.toLowerCase()
  );
  return key != null ? (SPECIES_VALUES[key] ?? null) : null;
}

/** Geological features do not award Vista Genomics credits (Codex & materials only). */
export const GEOLOGICAL_CREDITS = 0;

/** Human sites/structures do not provide Vista Genomics credits. */
export const HUMAN_CREDITS = 0;

/**
 * Get min/max base value range for a genus. Case-insensitive lookup.
 */
export function getGenusValueRange(genus: string): { min: number; max: number } | null {
  const key = Object.keys(GENUS_VALUE_RANGES).find(
    (k) => k.toLowerCase() === genus.toLowerCase()
  );
  return key ? (GENUS_VALUE_RANGES[key] ?? null) : null;
}

/**
 * Get minimum distance between samples for a genus (in meters). Case-insensitive lookup.
 */
export function getGenusSampleDistance(genus: string): number | null {
  const key = Object.keys(GENUS_SAMPLE_DISTANCES).find(
    (k) => k.toLowerCase() === genus.toLowerCase()
  );
  return key ? (GENUS_SAMPLE_DISTANCES[key] ?? null) : null;
}
