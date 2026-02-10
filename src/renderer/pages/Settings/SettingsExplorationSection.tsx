/**
 * Exploration section: first discovery toggle, value highlight thresholds, planet highlight criteria.
 */
import type { SettingsState } from './useSettingsState';
import {
  PLANET_HIGHLIGHT_ROW_CONFIGS,
  getEffectiveRow,
  getCellConfig,
  toggleTrack,
  toggleCharacteristic,
  type PlanetHighlightCharacteristic,
  type CellConfig,
} from '../../utils/planetHighlight';

const CHAR_COLUMNS: { key: Exclude<PlanetHighlightCharacteristic, 'track'>; label: string }[] = [
  { key: 'atmosphere', label: 'Atmosphere' },
  { key: 'landable', label: 'Landable' },
  { key: 'terraformable', label: 'Terraformable' },
  { key: 'geological', label: 'Geological' },
  { key: 'biological', label: 'Biological' },
];

function renderCell(
  cellConfig: CellConfig,
  effectiveValue: boolean | null,
  storedValue: boolean | null | undefined,
  onToggle: (checked: boolean) => void
): React.ReactNode {
  if (cellConfig === 'na') {
    return <span className="text-slate-400 dark:text-slate-500">–</span>;
  }
  if (cellConfig === 'required') {
    return <span className="text-slate-600 dark:text-slate-300 font-medium">Yes</span>;
  }
  return (
    <label className="flex items-center justify-center cursor-pointer">
      <input
        type="checkbox"
        checked={effectiveValue ?? false}
        onChange={(e) => onToggle(e.target.checked)}
        className="rounded border-slate-300 dark:border-slate-600 text-accent-600 focus:ring-accent-500"
      />
    </label>
  );
}

export interface SettingsExplorationSectionProps {
  state: SettingsState;
}

export function SettingsExplorationSection({ state }: SettingsExplorationSectionProps) {
  const {
    showFirstDiscoveryValues,
    setShowFirstDiscoveryValues,
    bioSignalsHighlightThreshold,
    setBioSignalsHighlightThreshold,
    planetHighlightCriteria,
    setPlanetHighlightCriteria,
  } = state;

  return (
    <section className="card p-6" key="exploration">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        Exploration
      </h2>

      <div className="space-y-4">
        <label className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
          <div className="relative flex items-center">
            <input
              type="checkbox"
              checked={showFirstDiscoveryValues}
              onChange={(e) => setShowFirstDiscoveryValues(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent-300 dark:peer-focus:ring-accent-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-accent-600"></div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Show first discovery values
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              When enabled, displays the higher scan values for bodies you discover first (2.6x
              multiplier) or map first (8.45x multiplier). Disable to show base values only.
            </p>
          </div>
        </label>

        <div>
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Planet Highlight
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Bodies matching a tracked type with its required/checked characteristics will have a gold
            background in the Explorer view.
          </p>
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-600">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80">
                  <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600">
                    Body Type
                  </th>
                  <th className="text-center py-2 px-2 font-medium text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600" title="Track this type for highlighting">
                    Track
                  </th>
                  {CHAR_COLUMNS.map(({ key, label }) => (
                    <th
                      key={key}
                      className="text-center py-2 px-2 font-medium text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-600"
                      title={label}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PLANET_HIGHLIGHT_ROW_CONFIGS.map((config) => {
                  const stored = planetHighlightCriteria[config.key];
                  const effective = getEffectiveRow(config, stored);
                  return (
                    <tr
                      key={config.key}
                      className="border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    >
                      <td className="py-1.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {config.label}
                      </td>
                      <td className="py-1.5 px-2 text-center">
                        {renderCell(
                          config.track === 'default' ? 'default' : 'optional',
                          effective.track,
                          stored?.track,
                          (checked) =>
                            setPlanetHighlightCriteria(
                              toggleTrack(planetHighlightCriteria, config.key, config, checked)
                            )
                        )}
                      </td>
                      {CHAR_COLUMNS.map(({ key }) => {
                        const cellConfig = getCellConfig(config, key);
                        const effectiveVal = effective[key];
                        const storedVal = stored?.[key];
                        return (
                          <td key={key} className="py-1.5 px-2 text-center">
                            {renderCell(
                              cellConfig,
                              effectiveVal,
                              storedVal,
                              (checked) =>
                                setPlanetHighlightCriteria(
                                  toggleCharacteristic(
                                    planetHighlightCriteria,
                                    config.key,
                                    key,
                                    checked
                                  )
                                )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label
            htmlFor="settings-bio-signals-highlight"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Highlight bio count threshold
          </label>
          <input
            id="settings-bio-signals-highlight"
            type="number"
            min={0}
            max={99}
            step={1}
            value={bioSignalsHighlightThreshold}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 0) {
                setBioSignalsHighlightThreshold(v);
              }
            }}
            className="input w-full max-w-[8rem] text-sm"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            When a body has this many or more biological signals, the bio count is highlighted with
            a rounded rectangle (bio color background, white text). Default 2.
          </p>
        </div>

        <details className="group">
          <summary className="cursor-pointer p-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center justify-between">
            About scan value multipliers
            <svg
              className="w-4 h-4 text-slate-400 transition-transform group-open:rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </summary>
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <ul className="text-xs text-blue-700 dark:text-blue-400 list-disc list-inside space-y-0.5">
              <li>First Discovered: +50% FSS (1.5x)</li>
              <li>First Mapped: +50% on DSS value</li>
              <li>Efficiency bonus: +10% (min probes for mapping)</li>
              <li>Odyssey bonus: +30% on mapping</li>
            </ul>
          </div>
        </details>
      </div>
    </section>
  );
}
