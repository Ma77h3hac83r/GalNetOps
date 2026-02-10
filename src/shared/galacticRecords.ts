/** Types for EDAstro galactic records (scraped from edastro.com/records/). */

export interface RecordBodyRef {
  name: string;
  systemId?: number;
  bodyId?: number;
  edsmUrl?: string;
}

export interface RecordEntry {
  value: number;
  body: RecordBodyRef;
  sharedCount?: number;
}

export interface RankedEntry {
  rank: number;
  value: number;
  bodyName: string;
}

export interface AttributeRecord {
  name: string;
  key: string;
  unit?: string;
  highest: RecordEntry;
  lowest: RecordEntry;
  statistics: {
    average: number;
    count: number;
    standardDeviation: number;
  };
  top10: RankedEntry[];
  bottom10: RankedEntry[];
}

export interface GalacticRecord {
  bodyType: string;
  bodyTypeSlug: string;
  sourceUrl: string;
  lastUpdated: string;
  scrapedAt: string;
  attributes: AttributeRecord[];
}

export interface GalacticRecordsStore {
  scrapedAt: string;
  records: GalacticRecord[];
}
