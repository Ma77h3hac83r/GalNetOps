/** Modal showing a system's summary and body list (from DB by systemId); optional "Load into Explorer" to set current system and fetch bodies. */
import { useState, useEffect, useMemo, useCallback } from 'react';
import type { System, CelestialBody } from '@shared/types';
import { parseSystem, parseCelestialBodyArray } from '../utils/boundarySchemas';

interface SystemDetailModalProps {
  systemId: number;
  onClose: () => void;
  /** When provided, shows "Load into Explorer" button; called with system when clicked. */
  onLoadInExplorer?: (system: System) => void;
}

function SystemDetailModal({ systemId, onClose, onLoadInExplorer }: SystemDetailModalProps) {
  const [system, setSystem] = useState<System | null>(null);
  const [bodies, setBodies] = useState<CelestialBody[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [systemData, bodiesData] = await Promise.all([
          window.electron.getSystemById(systemId),
          window.electron.getSystemBodies(systemId),
        ]);

        const parsedSystem = systemData ? parseSystem(systemData) : null;
        if (!parsedSystem) {
          setError('System not found');
          return;
        }

        setSystem(parsedSystem);
        setBodies(parseCelestialBodyArray(bodiesData ?? []));
      } catch (e) {
        console.error('Failed to load system details:', e);
        setError('Failed to load system details');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [systemId]);

  /** Body letter/number designation for display/sort (e.g. "A", "3", "4 c") without system name prefix. */
  const getBodyDesignationForSort = useCallback((body: CelestialBody, systemName: string): string => {
    if (body.bodyType === 'Star' && body.bodyId === 0) return 'A';
    if (systemName && body.name.startsWith(systemName)) {
      const designation = body.name.slice(systemName.length).trim();
      if (designation.includes('Belt')) {
        const match = designation.match(/^([A-Z]+\s*Belt)/i);
        if (match && match[1]) return match[1];
      }
      const lastPart = body.name.split(' ').slice(-1)[0];
      return designation || (lastPart ?? body.name);
    }
    const lastPart = body.name.split(' ').slice(-1)[0];
    return lastPart ?? body.name;
  }, []);

  // Bodies sorted: stars first, then by name (designation); exclude belts and rings
  const sortedBodies = useMemo(() => {
    const systemName = system?.name ?? '';
    return bodies
      .filter((b) => b.bodyType !== 'Belt' && b.bodyType !== 'Ring')
      .sort((a, b) => {
        const aStar = a.bodyType === 'Star' ? 0 : 1;
        const bStar = b.bodyType === 'Star' ? 0 : 1;
        if (aStar !== bStar) return aStar - bStar;
        return getBodyDesignationForSort(a, systemName).localeCompare(getBodyDesignationForSort(b, systemName), undefined, { numeric: true });
      });
  }, [bodies, system?.name, getBodyDesignationForSort]);

  // Calculate statistics
  const stats = useMemo(() => {
    let firstDiscoveries = 0;
    let firstMapped = 0;
    let totalValue = 0;
    let highValueBodies = 0;

    bodies.forEach(body => {
      if (body.discoveredByMe) firstDiscoveries++;
      if (body.mappedByMe) firstMapped++;
      totalValue += body.scanValue;
      if (body.scanValue >= 1000000) highValueBodies++;
    });

    return { firstDiscoveries, firstMapped, totalValue, highValueBodies };
  }, [bodies]);

  const formatCredits = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M CR`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K CR`;
    }
    return `${value.toLocaleString()} CR`;
  };

  const formatDistance = (ls: number): string => {
    if (ls >= 1000) {
      return `${(ls / 1000).toFixed(1)}K ls`;
    }
    return `${ls.toFixed(1)} ls`;
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {isLoading ? 'Loading...' : system?.name || 'System Details'}
            </h2>
            {system && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Coordinates: [{system.starPosX.toFixed(2)}, {system.starPosY.toFixed(2)}, {system.starPosZ.toFixed(2)}]
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {system && onLoadInExplorer && (
              <button
                onClick={() => {
                  onLoadInExplorer(system);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9a9 9 0 009 9m0 0a9 9 0 019-9m-9 9a9 9 0 009 9m0-9a9 9 0 019-9" />
                </svg>
                Load into Explorer
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Loading system data...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-32 text-red-500">
              {error}
            </div>
          ) : system ? (
            <div className="space-y-6">
              {/* System Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Total Value</div>
                  <div className="text-lg font-bold text-accent-600 dark:text-accent-400">
                    {formatCredits(stats.totalValue)}
                  </div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">Bodies Scanned</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    {bodies.length}
                    {system.bodyCount && <span className="text-slate-400 dark:text-slate-500"> / {system.bodyCount}</span>}
                  </div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">First Discoveries</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.firstDiscoveries}
                  </div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">First Mapped</div>
                  <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {stats.firstMapped}
                  </div>
                </div>
              </div>

              {/* Visit Info */}
              <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div>
                  <span className="text-slate-500 dark:text-slate-500">First visited:</span>{' '}
                  <span className="font-medium">{formatDate(system.firstVisited)}</span>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-500">Last visited:</span>{' '}
                  <span className="font-medium">{formatDate(system.lastVisited)}</span>
                </div>
                {system.allBodiesFound && (
                  <div className="flex items-center text-emerald-600 dark:text-emerald-400">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    All bodies discovered
                  </div>
                )}
              </div>

              {/* Bodies table */}
              {sortedBodies.length > 0 ? (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-600">
                        <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400">Name</th>
                        <th className="text-left py-2 px-2 font-medium text-slate-500 dark:text-slate-400">Type</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-500 dark:text-slate-400">Distance</th>
                        <th className="text-center py-2 px-1 font-medium text-slate-500 dark:text-slate-400" title="Scan (S=FSS, M=Mapped)">Scan</th>
                        <th className="text-center py-2 px-1 font-medium text-slate-500 dark:text-slate-400" title="First Discovered">FD</th>
                        <th className="text-center py-2 px-1 font-medium text-slate-500 dark:text-slate-400" title="First Mapped">FM</th>
                        <th className="text-center py-2 px-1 font-medium text-slate-500 dark:text-slate-400" title="Landable">L</th>
                        <th className="text-center py-2 px-1 font-medium text-slate-500 dark:text-slate-400" title="Terraformable">T</th>
                        <th className="text-center py-2 px-1 font-medium text-slate-500 dark:text-slate-400" title="Atmosphere">A</th>
                        <th className="text-right py-2 px-1 font-medium text-slate-500 dark:text-slate-400" title="Biological">Bio</th>
                        <th className="text-right py-2 px-1 font-medium text-slate-500 dark:text-slate-400" title="Geological">Geo</th>
                        <th className="text-right py-2 px-2 font-medium text-slate-500 dark:text-slate-400">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedBodies.map((body) => (
                        <tr
                          key={body.id}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                        >
                          <td className="py-1.5 px-2 font-medium text-slate-800 dark:text-slate-100 truncate max-w-[80px]" title={body.name}>
                            {system ? getBodyDesignationForSort(body, system.name) : body.name}
                          </td>
                          <td className="py-1.5 px-2 text-slate-600 dark:text-slate-300 truncate max-w-[120px]" title={body.subType || body.bodyType}>
                            {body.subType || body.bodyType}
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-600 dark:text-slate-300 tabular-nums">
                            {formatDistance(body.distanceLS)}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            {body.scanType === 'Mapped' ? (
                              <span className="text-purple-600 dark:text-purple-400" title="Mapped">M</span>
                            ) : body.scanType === 'Detailed' ? (
                              <span className="text-indigo-600 dark:text-indigo-400" title="FSS Scanned">S</span>
                            ) : (
                              <span className="text-slate-300 dark:text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            {body.discoveredByMe ? <span className="text-emerald-600 dark:text-emerald-400">✓</span> : <span className="text-slate-300 dark:text-slate-500">—</span>}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            {body.mappedByMe ? <span className="text-purple-600 dark:text-purple-400">✓</span> : <span className="text-slate-300 dark:text-slate-500">—</span>}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            {body.landable ? <span className="text-amber-600 dark:text-amber-400">✓</span> : <span className="text-slate-300 dark:text-slate-500">—</span>}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            {body.terraformable ? <span className="text-cyan-600 dark:text-cyan-400">✓</span> : <span className="text-slate-300 dark:text-slate-500">—</span>}
                          </td>
                          <td className="py-1.5 px-1 text-center">
                            {body.atmosphereType && body.atmosphereType !== 'None' && body.atmosphereType !== 'No atmosphere'
                              ? <span className="text-sky-600 dark:text-sky-400">✓</span>
                              : <span className="text-slate-300 dark:text-slate-500">—</span>}
                          </td>
                          <td className="py-1.5 px-1 text-right tabular-nums">
                            {body.bioSignals > 0 ? <span className="text-green-600 dark:text-green-400">{body.bioSignals}</span> : <span className="text-slate-300 dark:text-slate-500">—</span>}
                          </td>
                          <td className="py-1.5 px-1 text-right tabular-nums">
                            {body.geoSignals > 0 ? <span className="text-amber-700 dark:text-amber-500">{body.geoSignals}</span> : <span className="text-slate-300 dark:text-slate-500">—</span>}
                          </td>
                          <td className={`py-1.5 px-2 text-right tabular-nums font-medium ${body.scanValue >= 1000000 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                            {formatCredits(body.scanValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                  No bodies scanned in this system
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SystemDetailModal;
