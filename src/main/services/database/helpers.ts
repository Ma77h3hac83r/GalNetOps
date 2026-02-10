/**
 * Database helpers: LIKE escaping, body type from scan event, parent body ID extraction.
 */
import type { ScanEvent } from '../../../shared/types';
import type { BodyType } from '../../../shared/types';

/**
 * Escape LIKE special characters (%, _) and backslash so user input is treated as literal.
 * Use with LIKE ... ESCAPE '\' so that \% \_ and \\ match literal % _ and \.
 */
export function escapeLikeLiteral(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Determine body type from a scan event (Star, Planet, Moon, Belt, Ring).
 */
export function determineBodyType(scanEvent: ScanEvent): BodyType {
  if (scanEvent.StarType) {
    return 'Star';
  }

  if (scanEvent.BodyName?.includes(' Ring')) {
    return 'Ring';
  }

  if (scanEvent.BodyName?.includes('Belt') || scanEvent.BodyName?.includes('Cluster')) {
    if (scanEvent.Parents) {
      for (const parent of scanEvent.Parents) {
        if ('Ring' in parent) {
          return 'Belt';
        }
      }
    }
  }

  if (scanEvent.PlanetClass) {
    if (scanEvent.Parents != null && scanEvent.Parents.length > 0) {
      const first = scanEvent.Parents[0] as Record<string, number>;
      if ('Planet' in first) {
        return 'Moon';
      }
      if ('Star' in first && first.Star != null && first.Star !== 0) {
        return 'Moon';
      }
    }
    return 'Planet';
  }

  if (!scanEvent.StarType && !scanEvent.PlanetClass) {
    return 'Belt';
  }

  return 'Planet';
}

/**
 * Extract the immediate parent bodyId from a scan event's Parents array.
 * Returns null for star at origin or barycentre (Null) parents.
 */
export function extractParentBodyId(scanEvent: ScanEvent): number | null {
  if (!scanEvent.Parents || scanEvent.Parents.length === 0) {
    return null;
  }

  const immediateParent = scanEvent.Parents[0];
  if (immediateParent === undefined) {
    return null;
  }

  const keys = Object.keys(immediateParent);
  if (keys.length === 0) {
    return null;
  }

  const parentType = keys[0];
  if (parentType === undefined) {
    return null;
  }
  if (parentType === 'Null') {
    return null;
  }

  const parentBodyId = immediateParent[parentType];
  return typeof parentBodyId === 'number' ? parentBodyId : null;
}
