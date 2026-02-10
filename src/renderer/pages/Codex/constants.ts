/** Category icons and colors for Codex. */
import type { CategoryConfig } from './types';

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  Biology: {
    icon: '🧬',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  Geology: {
    icon: '🪨',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  Anomaly: {
    icon: '⚡',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  Thargoid: {
    icon: '👽',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  Guardian: {
    icon: '🏛️',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  default: {
    icon: '📖',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
  },
};

export const DEFAULT_CATEGORY_CONFIG: CategoryConfig = {
  icon: '📁',
  bgColor: 'bg-slate-100 dark:bg-slate-800',
  color: 'text-slate-700 dark:text-slate-300',
};
