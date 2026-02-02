/** Statistics page: overview (systems, bodies, first discoveries, value), body-type distribution, scan value over time, session discovery counts; charts via recharts. */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Statistics as StatisticsData } from '@shared/types';
import {
  parseStatistics,
  parseBiologicalStats,
  parseScanValuesByDate,
  parseSessionDiscoveryCounts,
  parseBodyTypeDistribution,
} from '../utils/boundarySchemas';
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  AreaChart, Area,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// Chart color schemes and rare-body milestones
const PIE_COLORS = ['#f59e0b', '#8b5cf6', '#f97316', '#06b6d4', '#64748b'];
const CHART_COLORS = {
  value: '#10b981',
  bodies: '#8b5cf6',
  discoveries: '#f59e0b',
  systems: '#3b82f6',
};

/** Shared margin for BarChart and AreaChart. */
const CHART_MARGINS = { top: 10, right: 10, left: 0, bottom: 20 };

/** Fixed height for chart containers (ResponsiveContainer fills this). */
const CHART_CONTAINER_HEIGHT = 256;

/** Shared tooltip content style for charts. */
const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: 'var(--tooltip-bg, #1e293b)',
  border: 'none',
  borderRadius: '0.5rem',
  color: 'var(--tooltip-text, #f1f5f9)',
} as const;

// Milestone definitions for rare body types
const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500, 1000];

// Rare body types to highlight with milestones
const RARE_BODY_TYPES = [
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
];

// Body type categories
interface BodyCategory {
  label: string;
  matches: (type: string) => boolean;
  color: string;
}

const BODY_CATEGORIES: BodyCategory[] = [
  {
    label: 'Stars',
    matches: (type) => {
      const lower = type.toLowerCase();
      return lower.includes('star') || lower.includes('dwarf') || lower.includes('neutron') ||
             lower.includes('black hole') || lower.includes('wolf-rayet') || lower.includes('carbon star') ||
             lower.includes('white dwarf') || /^[obafgkm]\d*\s/i.test(type) || lower.includes('t tauri') ||
             lower.includes('herbig') || lower.includes('supergiant');
    },
    color: 'bg-yellow-400 dark:bg-yellow-500',
  },
  {
    label: 'Terrestrials',
    matches: (type) => {
      const lower = type.toLowerCase();
      return lower.includes('earth') || lower.includes('ammonia') || lower.includes('water world') ||
             lower.includes('metal') || lower.includes('rocky') && !lower.includes('ice');
    },
    color: 'bg-stone-500 dark:bg-stone-400',
  },
  {
    label: 'Gas Giants',
    matches: (type) => {
      const lower = type.toLowerCase();
      return lower.includes('gas giant') || lower.includes('sudarsky') || lower.includes('helium');
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

// Biological stats interface
interface BiologicalStats {
  totalSpecies: number;
  completedScans: number;
  totalValue: number;
  genusCounts: Record<string, { total: number; scanned: number; value: number }>;
}

// Chart data interfaces
interface ScanValueByDate {
  date: string;
  value: number;
  bodies: number;
}

interface SessionDiscovery {
  sessionId: string;
  startTime: string;
  systems: number;
  bodies: number;
  firstDiscoveries: number;
  value: number;
}

interface BodyTypeDistribution {
  category: string;
  count: number;
  value: number;
}

/** Coerce to finite number or NaN (caller can filter). */
function toFinite(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(v) ? v : NaN;
}

/** Sanitize scan-value-by-date for charts: drop invalid points, ensure finite value/bodies. */
function sanitizeScanValuesByDate(
  data: Array<{ date: string; value: number; bodies: number }>
): Array<{ date: string; value: number; bodies: number }> {
  return data.filter((d) => {
    const value = toFinite(d.value);
    const bodies = toFinite(d.bodies);
    return typeof d.date === 'string' && d.date.length > 0 && !Number.isNaN(value) && !Number.isNaN(bodies);
  }).map((d) => ({
    date: String(d.date),
    value: toFinite(d.value),
    bodies: toFinite(d.bodies),
  }));
}

/** Sanitize session discovery rows: drop invalid, ensure finite numbers. */
function sanitizeSessionDiscoveries(
  data: Array<{ sessionId: string; startTime: string; systems: number; bodies: number; firstDiscoveries: number; value: number }>
): SessionDiscovery[] {
  return data.filter((d) => {
    return typeof d.sessionId === 'string' && typeof d.startTime === 'string' &&
      !Number.isNaN(toFinite(d.systems)) && !Number.isNaN(toFinite(d.bodies)) &&
      !Number.isNaN(toFinite(d.firstDiscoveries)) && !Number.isNaN(toFinite(d.value));
  }).map((d) => ({
    sessionId: String(d.sessionId),
    startTime: String(d.startTime),
    systems: toFinite(d.systems),
    bodies: toFinite(d.bodies),
    firstDiscoveries: toFinite(d.firstDiscoveries),
    value: toFinite(d.value),
  }));
}

/** Sanitize body type distribution: drop invalid, ensure finite count/value. */
function sanitizeBodyTypeDistribution(
  data: Array<{ category: string; count: number; value: number }>
): BodyTypeDistribution[] {
  return data.filter((d) => {
    return typeof d.category === 'string' && !Number.isNaN(toFinite(d.count)) && !Number.isNaN(toFinite(d.value));
  }).map((d) => ({
    category: String(d.category),
    count: toFinite(d.count),
    value: toFinite(d.value),
  }));
}

/** Minimum data points for line/area charts (Recharts needs at least 2 for a line). */
const MIN_POINTS_AREA_CHART = 2;

function Statistics() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [bioStats, setBioStats] = useState<BiologicalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Biological search state
  const [bioSearch, setBioSearch] = useState('');
  const [expandedGenera, setExpandedGenera] = useState<Set<string>>(new Set());

  // View data as table (accessibility)
  const [showBodyTable, setShowBodyTable] = useState(false);
  const [showSessionsTable, setShowSessionsTable] = useState(false);
  const [showScanTable, setShowScanTable] = useState(false);

  // Chart data state
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
        if (parsedStats) setStats(parsedStats);
        if (parsedBioStats) setBioStats(parsedBioStats);
        setScanValuesByDate(parsedScanValues);
        setSessionDiscoveries(parsedSessions);
        setBodyTypeDistribution(parsedBodyDist);
      } catch (err) {
        console.error('Failed to load statistics:', err);
        setError('Failed to load statistics');
      } finally {
        setIsLoading(false);
      }
    };

    loadStats();
  }, []);

  // Sanitized chart data (finite numbers, valid fields; used for rendering)
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

  // Categorize bodies
  const categorizedBodies = useMemo(() => {
    if (!stats) return null;

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
          if (arr) arr.push({ type, count });
          categorized = true;
          break;
        }
      }
      if (!categorized) {
        const other = result.Other;
        if (other) other.push({ type, count });
      }
    });

    // Sort each category by count descending
    Object.keys(result).forEach(key => {
      const arr = result[key];
      if (arr) arr.sort((a, b) => b.count - a.count);
    });

    return result;
  }, [stats]);

  // Calculate rare body counts
  const rareCounts = useMemo(() => {
    if (!stats) return {};

    const counts: Record<string, number> = {};
    
    RARE_BODY_TYPES.forEach(rare => {
      counts[rare.key] = 0;
      Object.entries(stats.bodiesByType).forEach(([type, count]) => {
        const lower = type.toLowerCase();
        if (rare.matches.some(match => lower.includes(match))) {
          const current = counts[rare.key];
          counts[rare.key] = (current ?? 0) + count;
        }
      });
    });

    return counts;
  }, [stats]);

  // Filter genera by search term
  const filteredGenera = useMemo(() => {
    if (!bioStats) return [];
    
    const entries = Object.entries(bioStats.genusCounts);
    
    if (!bioSearch.trim()) {
      return entries.sort((a, b) => b[1].value - a[1].value);
    }
    
    const searchLower = bioSearch.toLowerCase();
    return entries
      .filter(([genus]) => genus.toLowerCase().includes(searchLower))
      .sort((a, b) => b[1].value - a[1].value);
  }, [bioStats, bioSearch]);

  // Toggle genus expansion
  const toggleGenus = (genus: string) => {
    setExpandedGenera(prev => {
      const newSet = new Set(prev);
      if (newSet.has(genus)) {
        newSet.delete(genus);
      } else {
        newSet.add(genus);
      }
      return newSet;
    });
  };

  // Get next milestone for a count
  const getNextMilestone = (count: number): number => {
    for (const milestone of MILESTONES) {
      if (count < milestone) return milestone;
    }
    const last = MILESTONES[MILESTONES.length - 1];
    return last ?? 0;
  };

  // Get previous milestone for a count
  const getPrevMilestone = (count: number): number => {
    let prev = 0;
    for (const milestone of MILESTONES) {
      if (count < milestone) return prev;
      prev = milestone;
    }
    return prev;
  };

  const formatNumber = useCallback((num: number): string => num.toLocaleString(), []);

  const formatCredits = useCallback((credits: number): string => {
    if (credits >= 1_000_000_000) return `${(credits / 1_000_000_000).toFixed(2)}B CR`;
    if (credits >= 1_000_000) return `${(credits / 1_000_000).toFixed(2)}M CR`;
    if (credits >= 1_000) return `${(credits / 1_000).toFixed(2)}K CR`;
    return `${credits.toLocaleString()} CR`;
  }, []);

  const formatDateShort = useCallback(
    (value: string | number) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    []
  );
  const formatDateMedium = useCallback(
    (label: unknown) =>
      label != null ? new Date(String(label)).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '',
    []
  );
  const formatDateLabel = useCallback(
    (label: unknown) => (label != null ? new Date(String(label)).toLocaleString() : ''),
    []
  );

  const formatYAxisValue = useCallback((value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return String(value);
  }, []);

  const pieTooltipFormatter = useCallback(
    (value: number | undefined, name: string | undefined) => [formatNumber(value ?? 0), name ?? ''],
    [formatNumber]
  );
  const sessionTooltipFormatter = useCallback(
    (value: number | undefined, name: string | undefined) => [
      formatNumber(value ?? 0),
      name === 'systems' ? 'Systems' : name === 'firstDiscoveries' ? 'First Discoveries' : name ?? '',
    ],
    [formatNumber]
  );
  const areaTooltipFormatter = useCallback(
    (value: number | undefined) => [formatCredits(value ?? 0), 'Value'],
    [formatCredits]
  );

  const pieLabelRenderer = useCallback(
    (props: { category?: string; percent?: number }) =>
      `${props.category ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`,
    []
  );

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p>{error || 'Unable to load statistics'}</p>
        </div>
      </div>
    );
  }

  // Calculate discovery percentage
  const discoveryRate = stats.totalBodies > 0 
    ? ((stats.firstDiscoveries / stats.totalBodies) * 100).toFixed(1)
    : '0';
  
  const mappingRate = stats.totalBodies > 0
    ? ((stats.firstMapped / stats.totalBodies) * 100).toFixed(1)
    : '0';

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      {/* Work In Progress banner */}
      <div className="shrink-0 px-4 py-2 mb-4 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
        <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
          Work In Progress
        </p>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          Exploration Statistics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Your exploration progress at a glance
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Total Systems */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Systems Visited
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {formatNumber(stats.totalSystems)}
              </div>
            </div>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Bodies */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Bodies Scanned
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {formatNumber(stats.totalBodies)}
              </div>
            </div>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Total Value */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Total Scan Value
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCredits(stats.totalValue)}
              </div>
            </div>
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* First Discoveries */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                First Discoveries
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatNumber(stats.firstDiscoveries)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {discoveryRate}% of scanned bodies
              </div>
            </div>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
        </div>

        {/* First Mapped */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                First Mapped
              </div>
              <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {formatNumber(stats.firstMapped)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {mappingRate}% of scanned bodies
              </div>
            </div>
            <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
              <svg className="w-6 h-6 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Biologicals Scanned */}
        <div className="card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                Species Scanned
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(stats.biologicalsScanned)}
              </div>
            </div>
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Rare Finds Section */}
      <div className="card mb-6">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Rare Finds
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Track your progress toward exploration milestones
          </p>
        </div>
        
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {RARE_BODY_TYPES.map((rare) => {
            const count = rareCounts[rare.key] || 0;
            const nextMilestone = getNextMilestone(count);
            const prevMilestone = getPrevMilestone(count);
            const progress = nextMilestone > prevMilestone 
              ? ((count - prevMilestone) / (nextMilestone - prevMilestone)) * 100
              : 100;
            
            return (
              <div key={rare.key} className={`p-4 rounded-lg ${rare.bgColor}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-4 h-4 rounded-full ${rare.color}`} />
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {rare.label}
                    </span>
                  </div>
                  <span className={`text-2xl font-bold ${rare.textColor}`}>
                    {formatNumber(count)}
                  </span>
                </div>
                
                {/* Milestone progress */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mb-1">
                    <span>Progress to {nextMilestone}</span>
                    <span>{count}/{nextMilestone}</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${rare.barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                  
                  {/* Milestone badges */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {MILESTONES.filter(m => m <= Math.max(count, 100)).map((milestone) => (
                      <span
                        key={milestone}
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          count >= milestone
                            ? `${rare.textColor} bg-white/50 dark:bg-black/20 font-medium`
                            : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800'
                        }`}
                      >
                        {milestone}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Body Type Distribution Pie Chart */}
        <figure role="figure" className="card" aria-labelledby="chart-body-type-title" aria-describedby="chart-body-type-desc">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
              <h2 id="chart-body-type-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Body Type Distribution
              </h2>
            </div>
            <p id="chart-body-type-desc" className="sr-only">
              Pie chart: body type distribution, {sanitizedBodyDist.length} categor{sanitizedBodyDist.length === 1 ? 'y' : 'ies'}.
            </p>
          </div>
          <div className="p-4">
            {sanitizedBodyDist.length === 0 ? (
              <div style={{ height: CHART_CONTAINER_HEIGHT }} className="flex items-center justify-center text-slate-500 dark:text-slate-400">
                <p>No body data available</p>
              </div>
            ) : (
              <div style={{ height: CHART_CONTAINER_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sanitizedBodyDist as unknown as Array<Record<string, string | number>>}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="count"
                      nameKey="category"
                      label={pieLabelRenderer}
                      labelLine={false}
                    >
                      {sanitizedBodyDist.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length] ?? '#64748b'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={pieTooltipFormatter} contentStyle={TOOLTIP_CONTENT_STYLE} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {sanitizedBodyDist.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowBodyTable((v) => !v)}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  {showBodyTable ? 'Hide data table' : 'View data as table'}
                </button>
                {showBodyTable && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th scope="col" className="text-left p-2 font-medium">Category</th>
                          <th scope="col" className="text-right p-2 font-medium">Count</th>
                          <th scope="col" className="text-right p-2 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sanitizedBodyDist.map((row, i) => (
                          <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                            <td className="p-2">{row.category}</td>
                            <td className="p-2 text-right">{formatNumber(row.count)}</td>
                            <td className="p-2 text-right">{formatCredits(row.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </figure>

        {/* Session Discovery Bar Chart */}
        <figure role="figure" className="card" aria-labelledby="chart-sessions-title" aria-describedby="chart-sessions-desc">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h2 id="chart-sessions-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Recent Sessions
              </h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Systems visited per session
            </p>
            <p id="chart-sessions-desc" className="sr-only">
              Bar chart: last {Math.min(10, sanitizedSessions.length)} session{sanitizedSessions.length === 1 ? '' : 's'}, systems and first discoveries per session.
            </p>
          </div>
          <div className="p-4">
            {sanitizedSessions.length === 0 ? (
              <div style={{ height: CHART_CONTAINER_HEIGHT }} className="flex items-center justify-center text-slate-500 dark:text-slate-400">
                <p>No session data available</p>
              </div>
            ) : (
              <div style={{ height: CHART_CONTAINER_HEIGHT }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={sanitizedSessions.slice(0, 10).reverse()}
                    margin={CHART_MARGINS}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke, #334155)" opacity={0.3} />
                    <XAxis
                      dataKey="startTime"
                      tickFormatter={formatDateShort}
                      stroke="var(--axis-stroke, #64748b)"
                      fontSize={11}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis
                      domain={[0, 'auto']}
                      stroke="var(--axis-stroke, #64748b)"
                      fontSize={11}
                    />
                    <Tooltip
                      formatter={sessionTooltipFormatter}
                      labelFormatter={formatDateLabel}
                      contentStyle={TOOLTIP_CONTENT_STYLE}
                    />
                    <Legend />
                    <Bar dataKey="systems" name="Systems" fill={CHART_COLORS.systems} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="firstDiscoveries" name="First Discoveries" fill={CHART_COLORS.discoveries} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {sanitizedSessions.length > 0 && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowSessionsTable((v) => !v)}
                  className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
                >
                  {showSessionsTable ? 'Hide data table' : 'View data as table'}
                </button>
                {showSessionsTable && (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                          <th scope="col" className="text-left p-2 font-medium">Session start</th>
                          <th scope="col" className="text-right p-2 font-medium">Systems</th>
                          <th scope="col" className="text-right p-2 font-medium">First discoveries</th>
                          <th scope="col" className="text-right p-2 font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sanitizedSessions.slice(0, 10).reverse().map((row, i) => (
                          <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                            <td className="p-2">{formatDateLabel(row.startTime)}</td>
                            <td className="p-2 text-right">{formatNumber(row.systems)}</td>
                            <td className="p-2 text-right">{formatNumber(row.firstDiscoveries)}</td>
                            <td className="p-2 text-right">{formatCredits(row.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </figure>
      </div>

      {/* Scan Value Over Time Chart */}
      <figure role="figure" className="card mb-6" aria-labelledby="chart-scan-value-title" aria-describedby="chart-scan-value-desc">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <h2 id="chart-scan-value-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Scan Value Over Time
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Daily exploration earnings
          </p>
          <p id="chart-scan-value-desc" className="sr-only">
            Area chart: scan value over time, {sanitizedScanValues.length} data point{sanitizedScanValues.length === 1 ? '' : 's'} (last 30 days).
          </p>
        </div>
        <div className="p-4">
          {!canRenderAreaChart ? (
            <div style={{ height: CHART_CONTAINER_HEIGHT }} className="flex items-center justify-center text-slate-500 dark:text-slate-400">
              <p>{sanitizedScanValues.length === 0 ? 'No scan data available' : 'Not enough data to display chart (need at least 2 points)'}</p>
            </div>
          ) : (
            <div style={{ height: CHART_CONTAINER_HEIGHT }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sanitizedScanValues.slice(-30)}
                  margin={CHART_MARGINS}
                >
                  <defs>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.value} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.value} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--grid-stroke, #334155)" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    stroke="var(--axis-stroke, #64748b)"
                    fontSize={11}
                  />
                  <YAxis
                    domain={[0, 'dataMax']}
                    tickFormatter={formatYAxisValue}
                    stroke="var(--axis-stroke, #64748b)"
                    fontSize={11}
                  />
                  <Tooltip
                    formatter={areaTooltipFormatter}
                    labelFormatter={formatDateMedium}
                    contentStyle={TOOLTIP_CONTENT_STYLE}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={CHART_COLORS.value}
                    strokeWidth={2}
                    fill="url(#valueGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {canRenderAreaChart && (
            <div className="p-4 pt-0">
              <button
                type="button"
                onClick={() => setShowScanTable((v) => !v)}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 underline"
              >
                {showScanTable ? 'Hide data table' : 'View data as table'}
              </button>
              {showScanTable && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-sm border border-slate-200 dark:border-slate-700">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <th scope="col" className="text-left p-2 font-medium">Date</th>
                        <th scope="col" className="text-right p-2 font-medium">Value</th>
                        <th scope="col" className="text-right p-2 font-medium">Bodies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sanitizedScanValues.slice(-30).map((row, i) => (
                        <tr key={i} className="border-t border-slate-200 dark:border-slate-700">
                          <td className="p-2">{formatDateMedium(row.date)}</td>
                          <td className="p-2 text-right">{formatCredits(row.value)}</td>
                          <td className="p-2 text-right">{formatNumber(row.bodies)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </figure>

      {/* Biological Catalogue Section */}
      {bioStats && (
        <div className="card mb-6">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Exobiology Catalogue
                </h2>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCredits(bioStats.totalValue)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Total exobiology earnings
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {formatNumber(bioStats.completedScans)} of {formatNumber(bioStats.totalSpecies)} species fully scanned
            </p>
          </div>
          
          {/* Summary Cards */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {formatNumber(bioStats.totalSpecies)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Species Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatNumber(bioStats.completedScans)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Fully Analysed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {Object.keys(bioStats.genusCounts).length}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Genera Discovered</div>
            </div>
          </div>
          
          {/* Search */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={bioSearch}
                onChange={(e) => setBioSearch(e.target.value)}
                placeholder="Search genus..."
                className="input pl-10"
              />
              {bioSearch && (
                <button
                  onClick={() => setBioSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Genus List */}
          <div className="max-h-80 overflow-auto">
            {filteredGenera.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                {bioSearch ? (
                  <>
                    <p>No genera matching "{bioSearch}"</p>
                    <p className="text-sm">Try a different search term</p>
                  </>
                ) : (
                  <>
                    <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    <p>No biological species scanned yet</p>
                    <p className="text-sm">Scan organic life forms to see them here</p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredGenera.map(([genus, data]) => {
                  const scanRate = data.total > 0 ? (data.scanned / data.total) * 100 : 0;
                  const isExpanded = expandedGenera.has(genus);
                  
                  return (
                    <div key={genus} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <button
                        onClick={() => toggleGenus(genus)}
                        className="w-full p-3 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                              {genus.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-800 dark:text-slate-100 truncate">
                              {genus}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {data.scanned}/{data.total} species • {scanRate.toFixed(0)}% complete
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-right">
                            <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              {formatCredits(data.value)}
                            </div>
                          </div>
                          <svg 
                            className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {/* Expanded details - progress bar */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pl-14">
                          <div className="flex items-center space-x-2 mb-1">
                            <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all"
                                style={{ width: `${scanRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 w-10 text-right">
                              {scanRate.toFixed(0)}%
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-center">
                              <div className="font-medium text-slate-700 dark:text-slate-300">{data.total}</div>
                              <div className="text-slate-500 dark:text-slate-400">Found</div>
                            </div>
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded p-2 text-center">
                              <div className="font-medium text-emerald-700 dark:text-emerald-300">{data.scanned}</div>
                              <div className="text-emerald-600 dark:text-emerald-400">Analysed</div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800 rounded p-2 text-center">
                              <div className="font-medium text-slate-700 dark:text-slate-300">{data.total - data.scanned}</div>
                              <div className="text-slate-500 dark:text-slate-400">Pending</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bodies by Type Section - Categorized */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Bodies by Type
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Breakdown of all scanned celestial bodies by category
          </p>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {Object.keys(stats.bodiesByType).length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
              <div className="text-center">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p>No bodies scanned yet</p>
                <p className="text-sm">Explore systems to see body statistics</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {categorizedBodies && Object.entries(categorizedBodies).map(([category, bodies]) => {
                if (bodies.length === 0) return null;
                
                const categoryDef = BODY_CATEGORIES.find(c => c.label === category);
                const categoryTotal = bodies.reduce((sum, b) => sum + b.count, 0);
                
                return (
                  <div key={category}>
                    <div className="flex items-center space-x-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${categoryDef?.color || 'bg-slate-400'}`} />
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                        {category}
                      </h3>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        ({formatNumber(categoryTotal)} total)
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {bodies.map(({ type, count }) => {
                        const isRare = RARE_BODY_TYPES.some(r => 
                          r.matches.some(m => type.toLowerCase().includes(m))
                        );
                        
                        return (
                          <div 
                            key={type}
                            className={`flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                              isRare 
                                ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50' 
                                : 'bg-slate-50 dark:bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <BodyTypeIcon type={type} />
                              <span className={`text-sm truncate ${
                                isRare 
                                  ? 'text-amber-800 dark:text-amber-200 font-medium' 
                                  : 'text-slate-700 dark:text-slate-300'
                              }`} title={type}>
                                {type}
                              </span>
                              {isRare && (
                                <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm font-medium ml-2 flex-shrink-0 ${
                              isRare 
                                ? 'text-amber-700 dark:text-amber-300' 
                                : 'text-slate-600 dark:text-slate-400'
                            }`}>
                              {formatNumber(count)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component to render icons for different body types
function BodyTypeIcon({ type }: { type: string }) {
  const lowerType = type.toLowerCase();
  
  // Stars
  if (lowerType.includes('star') || lowerType.includes('dwarf') || lowerType.includes('neutron') || 
      lowerType.includes('black hole') || lowerType.includes('wolf-rayet') || lowerType.includes('carbon') ||
      lowerType.includes('white dwarf') || lowerType.match(/class [obafgkm]/i)) {
    return (
      <div className="w-5 h-5 rounded-full bg-yellow-400 dark:bg-yellow-500 flex-shrink-0" />
    );
  }
  
  // Earth-likes
  if (lowerType.includes('earth') || lowerType.includes('earthlike')) {
    return (
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-green-500 flex-shrink-0" />
    );
  }
  
  // Water worlds
  if (lowerType.includes('water')) {
    return (
      <div className="w-5 h-5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0" />
    );
  }
  
  // Ammonia worlds
  if (lowerType.includes('ammonia')) {
    return (
      <div className="w-5 h-5 rounded-full bg-amber-600 dark:bg-amber-500 flex-shrink-0" />
    );
  }
  
  // Gas giants
  if (lowerType.includes('gas giant') || lowerType.includes('sudarsky')) {
    return (
      <div className="w-5 h-5 rounded-full bg-orange-400 dark:bg-orange-500 flex-shrink-0" />
    );
  }
  
  // High metal content / Metal rich
  if (lowerType.includes('metal')) {
    return (
      <div className="w-5 h-5 rounded-full bg-slate-400 dark:bg-slate-500 flex-shrink-0" />
    );
  }
  
  // Rocky / Rocky ice
  if (lowerType.includes('rocky')) {
    return (
      <div className="w-5 h-5 rounded-full bg-stone-500 dark:bg-stone-400 flex-shrink-0" />
    );
  }
  
  // Icy bodies
  if (lowerType.includes('icy') || lowerType.includes('ice')) {
    return (
      <div className="w-5 h-5 rounded-full bg-cyan-200 dark:bg-cyan-300 flex-shrink-0" />
    );
  }
  
  // Default
  return (
    <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
  );
}

export default Statistics;
