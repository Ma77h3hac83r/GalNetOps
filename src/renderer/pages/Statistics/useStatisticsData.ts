/** Hook: load stats from IPC, sanitize chart data, categorize bodies, formatters. */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Statistics as StatisticsData } from '@shared/types';
import {
  parseStatistics,
  parseBiologicalStats,
  parseScanValuesByDate,
  parseSessionDiscoveryCounts,
  parseBodyTypeDistribution,
} from '../../utils/boundarySchemas';
import {
  sanitizeScanValuesByDate,
  sanitizeSessionDiscoveries,
  sanitizeBodyTypeDistribution,
} from './utils';
import {
  formatNumber as formatNumberFn,
  formatCredits as formatCreditsFn,
  formatDateShort as formatDateShortFn,
  formatDateMedium as formatDateMediumFn,
  formatDateLabel as formatDateLabelFn,
  formatYAxisValue as formatYAxisValueFn,
} from './formatters';
import type { BiologicalStats, ScanValueByDate, SessionDiscovery, BodyTypeDistribution } from './types';
import { BODY_CATEGORIES, RARE_BODY_TYPES, MILESTONES, MIN_POINTS_AREA_CHART } from './constants';

export function useStatisticsData() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [bioStats, setBioStats] = useState<BiologicalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bioSearch, setBioSearch] = useState('');
  const [expandedGenera, setExpandedGenera] = useState<Set<string>>(new Set());

  const [showBodyTable, setShowBodyTable] = useState(false);
  const [showSessionsTable, setShowSessionsTable] = useState(false);
  const [showScanTable, setShowScanTable] = useState(false);

  const [scanValuesByDate, setScanValuesByDate] = useState<ScanValueByDate[]>([]);
  const [sessionDiscoveries, setSessionDiscoveries] = useState<SessionDiscovery[]>([]);
  const [bodyTypeDistribution, setBodyTypeDistribution] = useState<BodyTypeDistribution[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [generalData, biologicalData, scanValues, sessions, bodyDist] = await Promise.all([
          window.electron.getStatistics(),
          window.electron.getBiologicalStats(),
          window.electron.getScanValuesByDate(),
          window.electron.getSessionDiscoveryCounts(),
          window.electron.getBodyTypeDistribution(),
        ]);
        const parsedStats = parseStatistics(generalData);
        const parsedBioStats = parseBiologicalStats(biologicalData);
        const parsedScanValues = parseScanValuesByDate(scanValues);
        const parsedSessions = parseSessionDiscoveryCounts(sessions);
        const parsedBodyDist = parseBodyTypeDistribution(bodyDist);
        if (parsedStats) {
          setStats(parsedStats);
        }
        if (parsedBioStats) {
          setBioStats(parsedBioStats);
        }
        setScanValuesByDate(parsedScanValues);
        setSessionDiscoveries(parsedSessions);
        setBodyTypeDistribution(parsedBodyDist);
      } catch (err: unknown) {
        console.error('Failed to load statistics:', err);
        setError('Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  const sanitizedScanValues = useMemo(
    () => sanitizeScanValuesByDate(scanValuesByDate),
    [scanValuesByDate]
  );
  const sanitizedSessions = useMemo(
    () => sanitizeSessionDiscoveries(sessionDiscoveries),
    [sessionDiscoveries]
  );
  const sanitizedBodyDist = useMemo(
    () => sanitizeBodyTypeDistribution(bodyTypeDistribution),
    [bodyTypeDistribution]
  );

  const canRenderAreaChart = sanitizedScanValues.length >= MIN_POINTS_AREA_CHART;

  const categorizedBodies = useMemo(() => {
    if (!stats) {
      return null;
    }

    const result: Record<string, { type: string; count: number }[]> = {
      Stars: [],
      Terrestrials: [],
      'Gas Giants': [],
      'Icy Bodies': [],
      Other: [],
    };

    Object.entries(stats.bodiesByType).forEach(([type, count]) => {
      let categorized = false;
      for (const category of BODY_CATEGORIES) {
        if (category.matches(type)) {
          const arr = result[category.label];
          if (arr) {
            arr.push({ type, count });
          }
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        const other = result.Other;
        if (other) {
          other.push({ type, count });
        }
      }
    });

    Object.keys(result).forEach((key) => {
      const arr = result[key];
      if (arr) {
        arr.sort((a, b) => b.count - a.count);
      }
    });

    return result;
  }, [stats]);

  const rareCounts = useMemo(() => {
    if (!stats) {
      return {} as Record<string, number>;
    }

    const counts: Record<string, number> = {};

    RARE_BODY_TYPES.forEach((rare) => {
      counts[rare.key] = 0;
      Object.entries(stats.bodiesByType).forEach(([type, count]) => {
        const lower = type.toLowerCase();
        if (rare.matches.some((match) => lower.includes(match))) {
          const current = counts[rare.key];
          counts[rare.key] = (current ?? 0) + count;
        }
      });
    });

    return counts;
  }, [stats]);

  const filteredGenera = useMemo(() => {
    if (!bioStats) {
      return [];
    }

    const entries = Object.entries(bioStats.genusCounts);

    if (!bioSearch.trim()) {
      return entries.sort((a, b) => b[1].value - a[1].value);
    }

    const searchLower = bioSearch.toLowerCase();
    return entries
      .filter(([genus]) => genus.toLowerCase().includes(searchLower))
      .sort((a, b) => b[1].value - a[1].value);
  }, [bioStats, bioSearch]);

  const toggleGenus = useCallback((genus: string) => {
    setExpandedGenera((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(genus)) {
        newSet.delete(genus);
      } else {
        newSet.add(genus);
      }
      return newSet;
    });
  }, []);

  function getNextMilestone(count: number): number {
    for (const milestone of MILESTONES) {
      if (count < milestone) {
        return milestone;
      }
    }
    const last = MILESTONES[MILESTONES.length - 1];
    return last ?? 0;
  }

  function getPrevMilestone(count: number): number {
    let prev = 0;
    for (const milestone of MILESTONES) {
      if (count < milestone) {
        return prev;
      }
      prev = milestone;
    }
    return prev;
  }

  const formatNumber = useCallback((num: number): string => formatNumberFn(num), []);
  const formatCredits = useCallback((credits: number): string => formatCreditsFn(credits), []);
  const formatDateShort = useCallback(
    (value: string | number) => formatDateShortFn(value),
    []
  );
  const formatDateMedium = useCallback(
    (label: unknown) => formatDateMediumFn(label),
    []
  );
  const formatDateLabel = useCallback(
    (label: unknown) => formatDateLabelFn(label),
    []
  );
  const formatYAxisValue = useCallback(
    (value: number): string => formatYAxisValueFn(value),
    []
  );

  const pieTooltipFormatter = useCallback(
    (value: number | undefined, name: string | undefined): [string, string] => [
      formatNumber(value ?? 0),
      name ?? '',
    ],
    [formatNumber]
  );
  const sessionTooltipFormatter = useCallback(
    (value: number | undefined, name: string | undefined): [string, string] => [
      formatNumber(value ?? 0),
      name === 'systems'
        ? 'Systems'
        : name === 'firstDiscoveries'
          ? 'First Discoveries'
          : name ?? '',
    ],
    [formatNumber]
  );
  const areaTooltipFormatter = useCallback(
    (value: number | undefined): [string, string] => [formatCredits(value ?? 0), 'Value'],
    [formatCredits]
  );
  const pieLabelRenderer = useCallback(
    (props: { category?: string; percent?: number }) =>
      `${props.category ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`,
    []
  );

  return {
    stats,
    bioStats,
    isLoading,
    error,
    sanitizedScanValues,
    sanitizedSessions,
    sanitizedBodyDist,
    canRenderAreaChart,
    categorizedBodies,
    rareCounts,
    filteredGenera,
    bioSearch,
    setBioSearch,
    expandedGenera,
    toggleGenus,
    showBodyTable,
    setShowBodyTable,
    showSessionsTable,
    setShowSessionsTable,
    showScanTable,
    setShowScanTable,
    getNextMilestone,
    getPrevMilestone,
    formatNumber,
    formatCredits,
    formatDateShort,
    formatDateMedium,
    formatDateLabel,
    formatYAxisValue,
    pieTooltipFormatter,
    sessionTooltipFormatter,
    areaTooltipFormatter,
    pieLabelRenderer,
  };
}
