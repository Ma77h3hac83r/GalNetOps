/** Codex page: list of Codex entries from DB with filters (category, region, new only, search); stats summary and expandable subcategories. */
import { useState, useEffect, useMemo } from 'react';
import type { CodexEntry } from '@shared/types';
import { parseCodexEntryArray, parseCodexStats } from '../utils/boundarySchemas';

// Sort mode for codex entries
type SortMode = 'newest' | 'oldest' | 'value_desc' | 'name_asc';

// Category icons and colors for Biology/Geology/Anomaly/Thargoid/Guardian
const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  'Biology': {
    icon: '🧬',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  'Geology': {
    icon: '🪨',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  'Anomaly': {
    icon: '⚡',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  'Thargoid': {
    icon: '👽',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  'Guardian': {
    icon: '🏛️',
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  'default': {
    icon: '📖',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
  },
};

// Stats interface
interface CodexStats {
  totalEntries: number;
  newEntries: number;
  totalVouchers: number;
  byCategory: Record<string, number>;
  byRegion: Record<string, number>;
}

// Format credits
function formatCredits(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B CR`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M CR`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K CR`;
  }
  return `${value.toLocaleString()} CR`;
}

// Format number
function formatNumber(value: number): string {
  return value.toLocaleString();
}

function Codex() {
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [stats, setStats] = useState<CodexStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sort state
  const [sortMode, setSortMode] = useState<SortMode>('newest');

  // Expanded subcategories
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [entriesData, statsData] = await Promise.all([
          window.electron.getCodexEntries(),
          window.electron.getCodexStats(),
        ]);
        setEntries(parseCodexEntryArray(entriesData));
        const parsedStats = parseCodexStats(statsData);
        if (parsedStats) setStats(parsedStats);
      } catch (err) {
        console.error('Failed to load codex data:', err);
        setError('Failed to load codex data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Get unique categories and regions
  const categories = useMemo(() => {
    const cats = new Set(entries.map(e => e.category));
    return Array.from(cats).sort();
  }, [entries]);

  const regions = useMemo(() => {
    const regs = new Set(entries.map(e => e.region));
    return Array.from(regs).sort();
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (selectedCategory && entry.category !== selectedCategory) return false;
      if (selectedRegion && entry.region !== selectedRegion) return false;
      if (showNewOnly && !entry.isNewEntry) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!entry.name.toLowerCase().includes(query) &&
            !entry.subcategory.toLowerCase().includes(query) &&
            !entry.systemName.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [entries, selectedCategory, selectedRegion, showNewOnly, searchQuery]);

  // Sort filtered entries (does not mutate; applies after filtering)
  const filteredAndSortedEntries = useMemo(() => {
    const copy = [...filteredEntries];
    const parseTime = (ts: string): number => {
      const n = new Date(ts).getTime();
      return Number.isNaN(n) ? 0 : n;
    };

    switch (sortMode) {
      case 'newest':
        copy.sort((a, b) => parseTime(b.timestamp) - parseTime(a.timestamp));
        break;
      case 'oldest':
        copy.sort((a, b) => parseTime(a.timestamp) - parseTime(b.timestamp));
        break;
      case 'value_desc':
        copy.sort((a, b) => {
          const v = b.voucherAmount - a.voucherAmount;
          return v !== 0 ? v : parseTime(b.timestamp) - parseTime(a.timestamp);
        });
        break;
      case 'name_asc':
        copy.sort((a, b) => {
          const n = a.name.localeCompare(b.name);
          return n !== 0 ? n : parseTime(b.timestamp) - parseTime(a.timestamp);
        });
        break;
    }
    return copy;
  }, [filteredEntries, sortMode]);

  // Group entries by category and subcategory
  const groupedEntries = useMemo(() => {
    const grouped: Record<string, Record<string, CodexEntry[]>> = {};
    
    for (const entry of filteredAndSortedEntries) {
      let cat = grouped[entry.category];
      if (!cat) {
        cat = {};
        grouped[entry.category] = cat;
      }
      let sub = cat[entry.subcategory];
      if (!sub) {
        sub = [];
        cat[entry.subcategory] = sub;
      }
      sub.push(entry);
    }

    return grouped;
  }, [filteredAndSortedEntries]);

  const toggleSubcategory = (key: string) => {
    setExpandedSubcategories(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getCategoryConfig = (category: string) => {
    return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG['default'] ?? { icon: '📁', bgColor: 'bg-slate-100 dark:bg-slate-800', color: 'text-slate-700 dark:text-slate-300' };
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="card p-8 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">{error}</h3>
          <button 
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Work In Progress banner */}
        <div className="shrink-0 px-4 py-2 mb-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Work In Progress
          </p>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Codex
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Your personal discovery log of unique phenomena across the galaxy
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="card p-4">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {formatNumber(stats.totalEntries)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Unique Discoveries
              </div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(stats.newEntries)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                First Discoveries
              </div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCredits(stats.totalVouchers)}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Total Vouchers
              </div>
            </div>
            <div className="card p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {Object.keys(stats.byRegion).length}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Regions Visited
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        {stats && Object.keys(stats.byCategory).length > 0 && (
          <div className="card p-4 mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Discoveries by Category
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([category, count]) => {
                const config = getCategoryConfig(category);
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
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
        )}

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entries..."
                  className="input pl-10 w-full"
                />
              </div>
            </div>

            {/* Region Filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="input min-w-[180px]"
            >
              <option value="">All Regions</option>
              {regions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <label htmlFor="codex-sort" className="text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Sort
              </label>
              <select
                id="codex-sort"
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as SortMode)}
                className="input min-w-[140px]"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
                <option value="value_desc">Highest Value</option>
                <option value="name_asc">Name (A–Z)</option>
              </select>
            </div>

            {/* New Only Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showNewOnly}
                onChange={(e) => setShowNewOnly(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded border-slate-300 dark:border-slate-600 focus:ring-orange-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                First Discoveries Only
              </span>
            </label>

            {/* Clear Filters */}
            {(selectedCategory || selectedRegion || showNewOnly || searchQuery || sortMode !== 'newest') && (
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedRegion('');
                  setShowNewOnly(false);
                  setSearchQuery('');
                  setSortMode('newest');
                }}
                className="text-sm text-orange-600 dark:text-orange-400 hover:underline"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Entries List */}
        {filteredEntries.length === 0 ? (
          <div className="card p-12 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEntries).sort((a, b) => a[0].localeCompare(b[0])).map(([category, subcategories]) => {
              const config = getCategoryConfig(category);
              const totalInCategory = Object.values(subcategories).flat().length;

              return (
                <div key={category} className="card overflow-hidden">
                  {/* Category Header */}
                  <div className={`p-4 ${config.bgColor} border-b border-slate-200 dark:border-slate-700`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{config.icon}</span>
                        <h2 className={`text-lg font-semibold ${config.color}`}>
                          {category}
                        </h2>
                      </div>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {totalInCategory} {totalInCategory === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  </div>

                  {/* Subcategories */}
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {Object.entries(subcategories).sort((a, b) => a[0].localeCompare(b[0])).map(([subcategory, subEntries]) => {
                      const key = `${category}:${subcategory}`;
                      const isExpanded = expandedSubcategories.has(key);

                      return (
                        <div key={key}>
                          {/* Subcategory Header */}
                          <button
                            onClick={() => toggleSubcategory(key)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex items-center space-x-2">
                              <svg 
                                className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                {subcategory}
                              </span>
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {subEntries.length} {subEntries.length === 1 ? 'discovery' : 'discoveries'}
                            </span>
                          </button>

                          {/* Entry List */}
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
                                    {new Date(entry.timestamp).toLocaleDateString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
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
        )}

        {/* Region Stats */}
        {stats && Object.keys(stats.byRegion).length > 0 && (
          <div className="card p-4 mt-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Discoveries by Region
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {Object.entries(stats.byRegion).sort((a, b) => b[1] - a[1]).map(([region, count]) => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(selectedRegion === region ? '' : region)}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-all ${
                    selectedRegion === region
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-slate-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="font-medium truncate">{region}</div>
                  <div className="text-xs opacity-75">{count} {count === 1 ? 'entry' : 'entries'}</div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Codex;
