/** Types used by the Codex page. */

export type SortMode = 'newest' | 'oldest' | 'value_desc' | 'name_asc';

export interface CodexStats {
  totalEntries: number;
  newEntries: number;
  totalVouchers: number;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
}

export interface CategoryConfig {
  icon: string;
  color: string;
  bgColor: string;
}
