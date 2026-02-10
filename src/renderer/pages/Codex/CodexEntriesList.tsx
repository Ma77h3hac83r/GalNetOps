/** Grouped codex entries by category/subcategory with expand/collapse. */
import type { CodexEntry } from '@shared/types';
import type { CategoryConfig } from './types';
import { formatCredits, formatEntryDate } from './formatters';

interface CodexEntriesListProps {
  entries: CodexEntry[];
  filteredEntries: CodexEntry[];
  groupedEntries: Record<string, Record<string, CodexEntry[]>>;
  expandedSubcategories: Set<string>;
  onToggleSubcategory: (key: string) => void;
  getCategoryConfig: (category: string) => CategoryConfig;
}

export function CodexEntriesList({
  entries,
  filteredEntries,
  groupedEntries,
  expandedSubcategories,
  onToggleSubcategory,
  getCategoryConfig,
}: CodexEntriesListProps) {
  if (filteredEntries.length === 0) {
    return (
      <div className="card p-12 text-center">
        <svg
          className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
          No Codex Entries Found
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          {entries.length === 0
            ? 'Discover biological and geological phenomena to populate your Codex'
            : 'No entries match your current filters'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedEntries)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([category, subcategories]) => {
          const config = getCategoryConfig(category);
          const totalInCategory = Object.values(subcategories).flat().length;

          return (
            <div key={category} className="card overflow-hidden">
              <div
                className={`p-4 ${config.bgColor} border-b border-slate-200 dark:border-slate-700`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{config.icon}</span>
                    <h2 className={`text-lg font-semibold ${config.color}`}>{category}</h2>
                  </div>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {totalInCategory} {totalInCategory === 1 ? 'entry' : 'entries'}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {Object.entries(subcategories)
                  .sort((a, b) => a[0].localeCompare(b[0]))
                  .map(([subcategory, subEntries]) => {
                    const key = `${category}:${subcategory}`;
                    const isExpanded = expandedSubcategories.has(key);

                    return (
                      <div key={key}>
                        <button
                          onClick={() => onToggleSubcategory(key)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <svg
                              className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {subcategory}
                            </span>
                          </div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {subEntries.length}{' '}
                            {subEntries.length === 1 ? 'discovery' : 'discoveries'}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-2">
                            {subEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                        {entry.name}
                                      </span>
                                      {entry.isNewEntry && (
                                        <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded">
                                          First Discovery
                                        </span>
                                      )}
                                      {entry.newTraitsDiscovered && (
                                        <span className="flex-shrink-0 px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                                          New Traits
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                      <span>{entry.systemName}</span>
                                      <span className="mx-1.5">•</span>
                                      <span>{entry.region}</span>
                                    </div>
                                  </div>
                                  {entry.voucherAmount > 0 && (
                                    <div className="text-right flex-shrink-0">
                                      <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                                        {formatCredits(entry.voucherAmount)}
                                      </div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">
                                        voucher
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 text-xs text-slate-400 dark:text-slate-500">
                                  {formatEntryDate(entry.timestamp)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
    </div>
  );
}
