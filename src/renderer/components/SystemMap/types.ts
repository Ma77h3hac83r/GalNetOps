/**
 * Types for the SystemMap component and tree building.
 */
import type { CelestialBody } from '@shared/types';

export interface SystemMapProps {
  iconScale: number;
  textScale: number;
}

export interface TreeNode {
  body: CelestialBody;
  children: TreeNode[];
}

export interface BodySignals {
  human: number;
  guardian: number;
  thargoid: number;
}
