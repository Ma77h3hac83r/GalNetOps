/**
 * Tree building: parse Parents from rawJson, find parent body, designations.
 */
import type { CelestialBody } from '@shared/types';

export function parseParents(body: CelestialBody): Array<{ type: string; bodyId: number }> {
  try {
    const data = JSON.parse(body.rawJson);
    if (!data.Parents || !Array.isArray(data.Parents)) {
      return [];
    }
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

export function getBarycentricDesignation(
  bodyName: string,
  systemName: string
): string | null {
  if (!bodyName.startsWith(systemName)) {
    return null;
  }
  const designation = bodyName.slice(systemName.length).trim();
  const match = designation.match(/^([A-Z]{2,})\s+\d/);
  return match && match[1] ? match[1] : null;
}

export function getStarDesignation(
  bodyName: string,
  systemName: string
): string | null {
  if (!bodyName.startsWith(systemName)) {
    return null;
  }
  const designation = bodyName.slice(systemName.length).trim();
  const match = designation.match(/^([A-Z])(?:\s|$)/);
  return match && match[1] ? match[1] : null;
}

export function getImmediateNullParent(body: CelestialBody): number | null {
  const parents = parseParents(body);
  const first = parents[0];
  if (first && first.type === 'Null') {
    return first.bodyId;
  }
  return null;
}

export function findActualParent(
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
