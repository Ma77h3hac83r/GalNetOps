/**
 * Settings page: journal path, theme, exploration options, EDSM, data management.
 */
import { useSettingsState } from './useSettingsState';
import { SECTIONS } from './constants';
import { SettingsAboutSection } from './SettingsAboutSection';
import { SettingsJournalSection } from './SettingsJournalSection';
import { SettingsAppearanceSection } from './SettingsAppearanceSection';
import { SettingsExplorationSection } from './SettingsExplorationSection';
import { SettingsEdsmSection } from './SettingsEdsmSection';
import { SettingsDataSection } from './SettingsDataSection';

export function Settings() {
  const state = useSettingsState();
  const { selectedSection, setSelectedSection } = state;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        <nav className="flex flex-wrap gap-1 mb-6" aria-label="Settings sections">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSelectedSection(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedSection === id
                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              aria-current={selectedSection === id ? 'page' : undefined}
            >
              {label}
            </button>
          ))}
        </nav>

        {selectedSection === 'about' && <SettingsAboutSection state={state} />}
        {selectedSection === 'journal' && <SettingsJournalSection state={state} />}
        {selectedSection === 'appearance' && <SettingsAppearanceSection state={state} />}
        {selectedSection === 'exploration' && <SettingsExplorationSection state={state} />}
        {selectedSection === 'edsm' && <SettingsEdsmSection state={state} />}
        {selectedSection === 'data' && <SettingsDataSection state={state} />}
      </div>
    </div>
  );
}
