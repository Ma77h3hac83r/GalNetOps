/** Hook for Codex page: load entries/stats, filter, sort, group, and UI state. */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CodexEntry } from '@shared/types';
import { parseCodexEntryArray, parseCodexStats } from '../../utils/boundarySchemas';
import type { SortMode, CodexStats } from './types';
import { CATEGORY_CONFIG, DEFAULT_CATEGORY_CONFIG } from './constants';

export function useCodexData() {
  const [entries, setEntries] = useState<CodexEntry[]>([]);
  const [stats, setStats] = useState<CodexStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [showNewOnly, setShowNewOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
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
        if (parsedStats) {
          setStats(parsedStats);
        }
      } catch (err: unknown) {
        console.error('Failed to load codex data:', err);
        setError('Failed to load codex data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(entries.map((e) => e.category));
    return Array.from(cats).sort();
  }, [entries]);

  const regions = useMemo(() => {
    const regs = new Set(entries.map((e) => e.region));
    return Array.from(regs).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (selectedCategory && entry.category !== selectedCategory) {
        return false;
      }
      if (selectedRegion && entry.region !== selectedRegion) {
        return false;
      }
      if (showNewOnly && !entry.isNewEntry) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !entry.name.toLowerCase().includes(query) &&
          !entry.subcategory.toLowerCase().includes(query) &&
          !entry.systemName.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [entries, selectedCategory, selectedRegion, showNewOnly, searchQuery]);

  const parseTime = useCallback((ts: string): number => {
    const n = new Date(ts).getTime();
    return Number.isNaN(n) ? 0 : n;
  }, []);

  const filteredAndSortedEntries = useMemo(() => {
    const copy = [...filteredEntries];
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
  }, [filteredEntries, sortMode, parseTime]);

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

  const toggleSubcategory = useCallback((key: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const getCategoryConfig = useCallback((category: string) => {
    return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.default ?? DEFAULT_CATEGORY_CONFIG;
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedCategory('');
    setSelectedRegion('');
    setShowNewOnly(false);
    setSearchQuery('');
    setSortMode('newest');
  }, []);

  const hasActiveFilters =
    Boolean(selectedCategory) ||
    Boolean(selectedRegion) ||
    showNewOnly ||
    Boolean(searchQuery) ||
    sortMode !== 'newest';

  return {
    entries,
    stats,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    selectedRegion,
    setSelectedRegion,
    showNewOnly,
    setShowNewOnly,
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    categories,
    regions,
    filteredEntries,
    filteredAndSortedEntries,
    groupedEntries,
    expandedSubcategories,
    toggleSubcategory,
    getCategoryConfig,
    clearFilters,
    hasActiveFilters,
  };
}
