/** Chart and UI constants for Statistics page. */
import type { BodyCategory } from './types';

export const PIE_COLORS = ['#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#64748b'];

/** Elite Dangerous theme: no blues – orange/amber/slate instead. */
export const ELITE_PIE_COLORS = ['#f59e0b', '#8b5cf6', '#f97316', '#fb923c', '#64748b'];

export const CHART_COLORS = {
  value: '#10b981',
  bodies: '#8b5cf6',
  discoveries: '#f59e0b',
  systems: '#3b82f6',
};

/** Elite Dangerous theme: systems bar and blue accents → orange. */
export const ELITE_CHART_COLORS = {
  value: '#10b981',
  bodies: '#8b5cf6',
  discoveries: '#f59e0b',
  systems: '#ea580c',
};

export function getPieColors(): string[] {
  return document.documentElement.classList.contains('elite') ? ELITE_PIE_COLORS : PIE_COLORS;
}

export function getChartColors(): typeof CHART_COLORS {
  return document.documentElement.classList.contains('elite') ? ELITE_CHART_COLORS : CHART_COLORS;
}

export const CHART_MARGINS = { top: 10, right: 10, left: 0, bottom: 20 };

export const CHART_CONTAINER_HEIGHT = 256;

export const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: 'var(--tooltip-bg, #1e293b)',
  border: 'none',
  borderRadius: '0.5rem',
  color: 'var(--tooltip-text, #f1f5f9)',
} as const;

export const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

export const RARE_BODY_TYPES = [
  {
    key: 'earthlike',
    label: 'Earth-like Worlds',
    matches: ['earthlike', 'earth-like'],
    color: 'from-blue-400 to-green-500',
    bgColor: 'bg-gradient-to-r from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30',
    textColor: 'text-green-600 dark:text-green-400',
    barColor: 'from-blue-500 to-green-500',
  },
  {
    key: 'ammonia',
    label: 'Ammonia Worlds',
    matches: ['ammonia'],
    color: 'bg-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-600 dark:text-amber-400',
    barColor: 'from-amber-500 to-amber-600',
  },
  {
    key: 'water',
    label: 'Water Worlds',
    matches: ['water world'],
    color: 'bg-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-600 dark:text-blue-400',
    barColor: 'from-blue-400 to-blue-600',
  },
  {
    key: 'metalrich',
    label: 'Metal-Rich Bodies',
    matches: ['metal rich', 'metal-rich'],
    color: 'bg-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-800/50',
    textColor: 'text-slate-600 dark:text-slate-300',
    barColor: 'from-slate-500 to-slate-600',
  },
  {
    key: 'hmc',
    label: 'High Metal Content',
    matches: ['high metal content'],
    color: 'bg-stone-500',
    bgColor: 'bg-stone-100 dark:bg-stone-900/30',
    textColor: 'text-stone-600 dark:text-stone-400',
    barColor: 'from-stone-400 to-stone-600',
  },
];

export const BODY_CATEGORIES: BodyCategory[] = [
  {
    label: 'Stars',
    matches: (type) => {
      const lower = type.toLowerCase();
      return (
        lower.includes('star') ||
        lower.includes('dwarf') ||
        lower.includes('neutron') ||
        lower.includes('black hole') ||
        lower.includes('wolf-rayet') ||
        lower.includes('carbon star') ||
        /^[obafgkm]\d*\s/i.test(type) ||
        lower.includes('t tauri') ||
        lower.includes('herbig') ||
        lower.includes('supergiant')
      );
    },
    color: 'bg-yellow-400 dark:bg-yellow-500',
  },
  {
    label: 'Terrestrials',
    matches: (type) => {
      const lower = type.toLowerCase();
      return (
        lower.includes('earth') ||
        lower.includes('ammonia') ||
        lower.includes('water world') ||
        lower.includes('metal') ||
        (lower.includes('rocky') && !lower.includes('ice'))
      );
    },
    color: 'bg-stone-500 dark:bg-stone-400',
  },
  {
    label: 'Gas Giants',
    matches: (type) => {
      const lower = type.toLowerCase();
      return lower.includes('gas giant') || lower.includes('helium');
    },
    color: 'bg-orange-400 dark:bg-orange-500',
  },
  {
    label: 'Icy Bodies',
    matches: (type) => {
      const lower = type.toLowerCase();
      return lower.includes('icy') || lower.includes('ice');
    },
    color: 'bg-cyan-200 dark:bg-cyan-300',
  },
];

export const MIN_POINTS_AREA_CHART = 2;
