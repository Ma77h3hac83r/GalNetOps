/**
 * Settings section list for navigation.
 */
import type { SettingsSection } from './types';

export const SECTIONS: { id: SettingsSection; label: string }[] = [
  { id: 'about', label: 'About' },
  { id: 'journal', label: 'Journal' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'exploration', label: 'Exploration' },
  { id: 'edsm', label: 'EDSM' },
  { id: 'data', label: 'Data Management' },
];
