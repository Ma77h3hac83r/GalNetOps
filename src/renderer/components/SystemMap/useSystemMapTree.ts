/**
 * Build star systems tree from bodies and system name.
 */
import { useMemo } from 'react';
import type { CelestialBody } from '@shared/types';
import type { TreeNode } from './types';
import {
  parseParents,
  getBarycentricDesignation,
  getStarDesignation,
  getImmediateNullParent,
  findActualParent,
} from './treeUtils';

export interface SystemMapTreeResult {
  starSystems: Array<{ star: TreeNode; planets: TreeNode[] }>;
  orphanPlanets: TreeNode[];
  barycentricBodies: Map<string, TreeNode[]>;
  maxStarMass: number;
  maxPlanetMass: number;
}

export function useSystemMapTree(
  bodies: CelestialBody[],
  systemName: string
): SystemMapTreeResult {
  return useMemo(() => {
    if (bodies.length === 0) {
      return {
        starSystems: [],
        orphanPlanets: [],
        barycentricBodies: new Map(),
        maxStarMass: 1,
        maxPlanetMass: 1,
      };
    }

    const beltClusters = bodies.filter((b) => b.bodyType === 'Belt');
    const nonBeltBodies = bodies.filter((b) => b.bodyType !== 'Belt' && b.bodyType !== 'Ring');

    const beltsByRingId = new Map<
      number,
      { clusters: CelestialBody[]; starId: number | null; nullId: number | null }
    >();
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
    const secondaryStarsToAttach: Array<{ node: TreeNode; body: CelestialBody }> = [];

    for (const body of nonBeltBodies) {
      if (body.bodyType === 'Star') {
        const node = nodesById.get(body.bodyId)!;
        if (body.bodyId === 0) {
          stars.push(node);
          const designation = getStarDesignation(body.name, systemName);
          if (designation) starsByDesignation.set(designation, node);
        } else {
          secondaryStarsToAttach.push({ node, body });
        }
      }
    }

    for (const { node, body } of secondaryStarsToAttach) {
      const parent = findActualParent(body, bodiesById);
      if (parent) {
        const parentNode = nodesById.get(parent.bodyId);
        if (parentNode) parentNode.children.push(node);
        else stars.push(node);
      } else {
        stars.push(node);
      }
    }

    const barycentricBodies = new Map<string, TreeNode[]>();
    const rootBodies: TreeNode[] = [];

    for (const body of nonBeltBodies) {
      if (body.bodyType === 'Star') continue;
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
          if (parentNode) parentNode.children.push(node);
          else rootBodies.push(node);
        } else {
          rootBodies.push(node);
        }
      } else if (parent) {
        const parentNode = nodesById.get(parent.bodyId);
        if (parentNode) parentNode.children.push(node);
        else rootBodies.push(node);
      } else {
        rootBodies.push(node);
      }
    }

    for (const [, beltData] of beltsByRingId) {
      const { clusters, starId, nullId } = beltData;
      if (clusters.length === 0) continue;
      clusters.sort((a, b) => a.bodyId - b.bodyId);
      const representative = clusters[0];
      if (!representative) continue;
      const baryDesignation = getBarycentricDesignation(representative.name, systemName);
      const beltNode: TreeNode = { body: representative, children: [] };
      if (baryDesignation && nullId !== null && starId === null) {
        if (!barycentricBodies.has(baryDesignation)) {
          barycentricBodies.set(baryDesignation, []);
        }
        barycentricBodies.get(baryDesignation)!.push(beltNode);
      } else if (starId !== null) {
        const starNode = nodesById.get(starId);
        if (starNode) starNode.children.push(beltNode);
      }
    }

    const sortByBodyId = (a: TreeNode, b: TreeNode) => a.body.bodyId - b.body.bodyId;
    const sortChildren = (node: TreeNode) => {
      node.children.sort(sortByBodyId);
      for (const child of node.children) sortChildren(child);
    };

    const result: Array<{ star: TreeNode; planets: TreeNode[] }> = [];
    stars.sort(sortByBodyId);
    for (const starNode of stars) {
      sortChildren(starNode);
      result.push({ star: starNode, planets: starNode.children });
    }

    for (const [, bodyList] of barycentricBodies) {
      bodyList.sort(sortByBodyId);
      for (const body of bodyList) sortChildren(body);
    }

    const orphanPlanets = rootBodies.filter((n) => n.body.bodyType !== 'Star');
    orphanPlanets.sort(sortByBodyId);
    for (const orphan of orphanPlanets) sortChildren(orphan);

    let maxStarMass = 0;
    let maxPlanetMass = 0;
    for (const body of nonBeltBodies) {
      const mass = body.mass || 0;
      if (body.bodyType === 'Star') maxStarMass = Math.max(maxStarMass, mass);
      else maxPlanetMass = Math.max(maxPlanetMass, mass);
    }
    maxStarMass = maxStarMass || 1;
    maxPlanetMass = maxPlanetMass || 1;

    return {
      starSystems: result,
      orphanPlanets,
      barycentricBodies,
      maxStarMass,
      maxPlanetMass,
    };
  }, [bodies, systemName]);
}
