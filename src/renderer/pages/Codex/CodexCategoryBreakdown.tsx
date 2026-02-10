/** Category breakdown section: clickable category chips that filter entries. */
import type { CodexStats, CategoryConfig } from './types';

interface CodexCategoryBreakdownProps {
  stats: CodexStats;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  getCategoryConfig: (category: string) => CategoryConfig;
}

export function CodexCategoryBreakdown({
  stats,
  selectedCategory,
  onSelectCategory,
  getCategoryConfig,
}: CodexCategoryBreakdownProps) {
  if (Object.keys(stats.byCategory).length === 0) {
    return null;
  }

  return (
    <div className="card p-4 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
        Discoveries by Category
      </h2>
      <div className="flex flex-wrap gap-2">
        {Object.entries(stats.byCategory)
          .sort((a, b) => b[1] - a[1])
          .map(([category, count]) => {
            const config = getCategoryConfig(category);
            return (
              <button
                key={category}
                onClick={() => onSelectCategory(selectedCategory === category ? '' : category)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === category
                    ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-800'
                    : ''
                } ${config.bgColor} ${config.color}`}
              >
                <span className="mr-1.5">{config.icon}</span>
                {category} ({count})
              </button>
            );
          })}
      </div>
    </div>
  );
}
