/** Types used by the Statistics page. */

export interface BodyCategory {
  label: string;
  matches: (type: string) => boolean;
  color: string;
}

export interface BiologicalStats {
  totalSpecies: number;
  completedScans: number;
  totalValue: number;
  genusCounts: Record<string, { total: number; scanned: number; value: number }>;
}

export interface ScanValueByDate {
  date: string;
  value: number;
  bodies: number;
}

export interface SessionDiscovery {
  sessionId: string;
  startTime: string;
  systems: number;
  bodies: number;
  firstDiscoveries: number;
  value: number;
}

export interface BodyTypeDistribution {
  category: string;
  count: number;
  value: number;
}
