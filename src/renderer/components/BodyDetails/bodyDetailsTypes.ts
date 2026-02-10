/**
 * Types used by BodyDetails and related components.
 */

export interface Ring {
  Name: string;
  RingClass: string;
  MassMT: number;
  InnerRad: number;
  OuterRad: number;
  Materials?: Array<{ Name: string; Count: number }>;
}

export interface Material {
  Name: string;
  Percent: number;
}

export interface Composition {
  Ice: number;
  Rock: number;
  Metal: number;
}

export interface AtmosphereComponent {
  Name: string;
  Percent: number;
}

export interface OrbitalParams {
  SemiMajorAxis?: number;
  Eccentricity?: number;
  OrbitalInclination?: number;
  OrbitalPeriod?: number;
  RotationPeriod?: number;
  AxialTilt?: number;
  TidalLock?: boolean;
}
