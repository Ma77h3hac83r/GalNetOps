/** Types used by the Setup Wizard. */

export interface BackfillProgress {
  progress: number;
  total: number;
  currentFile: string;
  percentage: number;
}

export interface BackfillResult {
  filesProcessed: number;
  totalFiles: number;
  cancelled: boolean;
}

export type SetupWizardStep = 'path' | 'backfill' | 'complete';
