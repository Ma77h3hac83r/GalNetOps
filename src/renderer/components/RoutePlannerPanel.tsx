/** Route planner panel: single field to add systems (Enter); list with #, System, POI (GEC suggestions), EDSM, Visited; drag-and-drop reorder; double-click system name to edit. Expandable/hideable like Details pane. */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore';

const ROUTE_PLANNER_STORAGE_KEY = 'galnetops-route-planner';
const ROUTE_PLANNER_POIS_KEY = 'galnetops-route-planner-pois';

export interface RoutePlannerRow {
  name: string;
  poiName: string;
  inEdsm: boolean | null;
  visited: boolean | null;
}

function loadStoredSystemNames(): string[] {
  try {
    const s = localStorage.getItem(ROUTE_PLANNER_STORAGE_KEY);
    if (typeof s !== 'string') return [];
    const parsed = JSON.parse(s) as unknown;
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) return parsed;
    const legacy = String(s).split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    return legacy;
  } catch {
    return [];
  }
}

function saveStoredSystemNames(names: string[]): void {
  try {
    localStorage.setItem(ROUTE_PLANNER_STORAGE_KEY, JSON.stringify(names));
  } catch {
    // ignore
  }
}

function loadStoredPoiNames(systemCount: number): string[] {
  try {
    const s = localStorage.getItem(ROUTE_PLANNER_POIS_KEY);
    if (typeof s !== 'string') return Array(systemCount).fill('');
    const parsed = JSON.parse(s) as unknown;
    if (!Array.isArray(parsed)) return Array(systemCount).fill('');
    const arr = parsed.filter((x): x is string => typeof x === 'string').slice(0, systemCount);
    while (arr.length < systemCount) arr.push('');
    return arr;
  } catch {
    return Array(systemCount).fill('');
  }
}

function saveStoredPoiNames(pois: string[]): void {
  try {
    localStorage.setItem(ROUTE_PLANNER_POIS_KEY, JSON.stringify(pois));
  } catch {
    // ignore
  }
}

function moveItem<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex === toIndex) return arr;
  const copy = [...arr];
  const [item] = copy.splice(fromIndex, 1);
  if (item === undefined) return copy;
  copy.splice(toIndex, 0, item);
  return copy;
}

function RoutePlannerPanel() {
  const isOpen = useAppStore((state) => state.routePlannerOpen);
  const setRoutePlannerOpen = useAppStore((state) => state.setRoutePlannerOpen);
  const routePlannerPanelWidth = useAppStore((state) => state.routePlannerPanelWidth);
  const setRoutePlannerPanelWidth = useAppStore((state) => state.setRoutePlannerPanelWidth);

  const initialSystemNames = loadStoredSystemNames();
  const [systemNames, setSystemNames] = useState<string[]>(initialSystemNames);
  const [poiNames, setPoiNames] = useState<string[]>(() =>
    loadStoredPoiNames(initialSystemNames.length)
  );
  const poiNamesRef = useRef<string[]>(poiNames);
  poiNamesRef.current = poiNames;

  const [inputValue, setInputValue] = useState('');
  const [rows, setRows] = useState<RoutePlannerRow[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [copiedRowIndex, setCopiedRowIndex] = useState<number | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [gecPoiBySystem, setGecPoiBySystem] = useState<Map<string, string[]> | null>(null);

  const handleCopySystemName = useCallback((index: number, name: string) => {
    navigator.clipboard.writeText(name).then(
      () => {
        setCopiedRowIndex(index);
        setTimeout(() => setCopiedRowIndex(null), 2000);
      },
      () => {}
    );
  }, []);

  useEffect(() => {
    if (!isOpen || !window.electron?.getGecPoiList) return;
    let cancelled = false;
    window.electron
      .getGecPoiList()
      .then((list) => {
        if (cancelled) return;
        const bySystem = new Map<string, string[]>();
        for (const { name, galMapSearch } of list) {
          const key = galMapSearch.trim().toLowerCase();
          if (!key) continue;
          const arr = bySystem.get(key) ?? [];
          if (!arr.includes(name)) arr.push(name);
          bySystem.set(key, arr);
        }
        setGecPoiBySystem(bySystem);
      })
      .catch(() => {
        if (!cancelled) setGecPoiBySystem(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const getPoiSuggestionsForSystem = useCallback(
    (systemName: string): string[] => {
      if (!gecPoiBySystem) return [];
      return gecPoiBySystem.get(systemName.trim().toLowerCase()) ?? [];
    },
    [gecPoiBySystem]
  );

  const addSystems = useCallback((text: string) => {
    const toAdd = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (toAdd.length === 0) return;
    setSystemNames((prev) => {
      const next = [...prev, ...toAdd];
      saveStoredSystemNames(next);
      return next;
    });
    setPoiNames((prev) => {
      const next = [...prev, ...toAdd.map(() => '')];
      saveStoredPoiNames(next);
      return next;
    });
    setInputValue('');
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSystems(inputValue);
      }
    },
    [addSystems, inputValue]
  );

  const reorderSystems = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setSystemNames((prev) => {
      const next = moveItem(prev, fromIndex, toIndex);
      saveStoredSystemNames(next);
      return next;
    });
    setPoiNames((prev) => {
      const next = moveItem(prev, fromIndex, toIndex);
      saveStoredPoiNames(next);
      return next;
    });
    setRows((prev) => moveItem(prev, fromIndex, toIndex));
  }, []);

  const setPoiName = useCallback((index: number, value: string) => {
    setPoiNames((prev) => {
      const next = [...prev];
      next[index] = value;
      saveStoredPoiNames(next);
      return next;
    });
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, poiName: value };
      return next;
    });
  }, []);

  const startEditing = useCallback((index: number, currentName: string) => {
    setEditingIndex(index);
    setEditingValue(currentName);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, []);

  const commitEdit = useCallback((index: number, currentName: string) => {
    const newName = editingValue.trim();
    if (newName === currentName || newName === '') {
      setEditingIndex(null);
      setEditingValue('');
      return;
    }
    setSystemNames((prev) => {
      const next = [...prev];
      next[index] = newName;
      saveStoredSystemNames(next);
      return next;
    });
    setRows((prev) => {
      const next = [...prev];
      next[index] = {
        name: newName,
        poiName: prev[index]?.poiName ?? '',
        inEdsm: null,
        visited: null,
      };
      return next;
    });
    setEditingIndex(null);
    setEditingValue('');
  }, [editingValue]);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditingValue('');
  }, []);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = routePlannerPanelWidth;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        setRoutePlannerPanelWidth(startWidth + delta);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [routePlannerPanelWidth, setRoutePlannerPanelWidth]
  );

  const fetchContentKey = systemNames.length > 0
    ? [...systemNames].sort().join('\n')
    : '';

  useEffect(() => {
    if (systemNames.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    const pois = poiNamesRef.current;
    setRows(
      systemNames.map((name, i) => ({
        name,
        poiName: pois[i] ?? '',
        inEdsm: null,
        visited: null,
      }))
    );
    setIsFetching(true);

    const run = async () => {
      const results: Omit<RoutePlannerRow, 'poiName'>[] = await Promise.all(
        systemNames.map(async (name): Promise<Omit<RoutePlannerRow, 'poiName'>> => {
          if (cancelled) return { name, inEdsm: null, visited: null };
          const [edsmResult, dbResult] = await Promise.all([
            window.electron.edsmGetSystem(name).catch(() => null),
            window.electron.getSystemByName(name).catch(() => null),
          ]);
          if (cancelled) return { name, inEdsm: null, visited: null };
          return {
            name,
            inEdsm: edsmResult != null && Object.keys(edsmResult).length > 0,
            visited: dbResult != null,
          };
        })
      );
      if (!cancelled) {
        const poisNow = poiNamesRef.current;
        setRows(
          results.map((r, i) => ({
            ...r,
            poiName: poisNow[i] ?? '',
          }))
        );
        setIsFetching(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [systemNames.length, fetchContentKey]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setRoutePlannerOpen(true)}
        className="w-10 flex items-center justify-center shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
        title="Show Route planner"
        aria-label="Show Route planner"
      >
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    );
  }

  return (
    <aside
      className="relative flex flex-col shrink-0 border-r border-slate-200 dark:border-slate-700 bg-surface-elevated overflow-y-auto"
      style={{ width: routePlannerPanelWidth }}
      aria-label="Route planner"
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-slate-300 dark:hover:bg-slate-600 z-10 shrink-0"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
        aria-hidden
      />
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Route planner</h2>
        <button
          type="button"
          onClick={() => setRoutePlannerOpen(false)}
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Hide route planner"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 p-3 gap-3">
        <label htmlFor="route-planner-input" className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Add system (type or paste, then Enter)
        </label>
        <div className="flex gap-2">
          <input
            id="route-planner-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="System name..."
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            spellCheck={false}
            aria-describedby="route-planner-hint"
          />
          <button
            type="button"
            onClick={() => addSystems(inputValue)}
            className="px-3 py-2 text-sm font-medium rounded bg-accent-500 text-white hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
            aria-label="Add system"
          >
            Add
          </button>
        </div>
        <p id="route-planner-hint" className="text-xs text-slate-500 dark:text-slate-400">
          Press Enter to add. Paste multiple lines then Enter to add all. Double-click a system name to edit.
        </p>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            <span>Systems</span>
            {systemNames.length > 0 && (
              <span>
                {systemNames.length} {systemNames.length === 1 ? 'system' : 'systems'}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto rounded border border-slate-200 dark:border-slate-700">
            {systemNames.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                Type a system name and press Enter to add it to the route.
              </div>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
                  <tr>
                    <th className="text-left px-2 py-1.5 font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-8">
                      #
                    </th>
                    <th className="text-left px-2 py-1.5 font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      System
                    </th>
                    <th className="text-left px-2 py-1.5 font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                      POI
                    </th>
                    <th className="text-left px-2 py-1.5 font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-20">
                      EDSM
                    </th>
                    <th className="text-left px-2 py-1.5 font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 w-16">
                      Visited
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr
                      key={`${row.name}-${i}`}
                      draggable={editingIndex !== i}
                      onDragStart={(e) => {
                        if (editingIndex !== null) return;
                        setDraggedIndex(i);
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', String(i));
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        const to = i;
                        if (Number.isNaN(from) || from === to) return;
                        reorderSystems(from, to);
                        setDraggedIndex(null);
                      }}
                      className={`border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 ${editingIndex === i ? '' : 'cursor-grab active:cursor-grabbing select-none'} ${draggedIndex === i ? 'opacity-50 bg-slate-100 dark:bg-slate-700/50' : ''}`}
                    >
                      <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 w-8 tabular-nums">
                        {i + 1}
                      </td>
                      <td className="px-2 py-1.5 max-w-[140px]">
                        <div className="flex items-center gap-1 min-w-0">
                          <div className="min-w-0 flex-1">
                            {editingIndex === i ? (
                              <input
                                ref={i === editingIndex ? editInputRef : undefined}
                                type="text"
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onBlur={() => commitEdit(i, row.name)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    commitEdit(i, row.name);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    cancelEdit();
                                  }
                                }}
                                className="w-full min-w-0 px-1.5 py-0.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                                spellCheck={false}
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Edit system name"
                              />
                            ) : (
                              <span
                                className="block text-slate-800 dark:text-slate-200 truncate cursor-text hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-1 -mx-1"
                                title={row.name}
                                onDoubleClick={(e) => {
                                  e.preventDefault();
                                  startEditing(i, row.name);
                                }}
                              >
                                {row.name}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopySystemName(i, row.name);
                            }}
                            className="p-0.5 rounded shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                            title={copiedRowIndex === i ? 'Copied!' : 'Copy system name'}
                            aria-label={copiedRowIndex === i ? 'Copied!' : 'Copy system name'}
                          >
                            {copiedRowIndex === i ? (
                              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 max-w-[100px]">
                        <input
                          type="text"
                          list={`poi-datalist-${i}`}
                          value={row.poiName ?? ''}
                          onChange={(e) => setPoiName(i, e.target.value)}
                          placeholder="POI name"
                          className="w-full min-w-0 px-1.5 py-0.5 text-sm rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                          spellCheck={false}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`POI for ${row.name}`}
                        />
                        {getPoiSuggestionsForSystem(row.name).length > 0 && (
                          <datalist id={`poi-datalist-${i}`}>
                            {getPoiSuggestionsForSystem(row.name).map((poiName) => (
                              <option key={poiName} value={poiName} />
                            ))}
                          </datalist>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {row.inEdsm === null ? (
                          <span className="text-slate-400 dark:text-slate-500" aria-busy="true">
                            …
                          </span>
                        ) : row.inEdsm ? (
                          <span className="text-green-600 dark:text-green-400">Yes</span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">No</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {row.visited === null ? (
                          <span className="text-slate-400 dark:text-slate-500" aria-busy="true">
                            …
                          </span>
                        ) : row.visited ? (
                          <span className="text-green-600 dark:text-green-400">Yes</span>
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {isFetching && systemNames.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Checking EDSM and visit history…</p>
          )}
        </div>
      </div>
    </aside>
  );
}

export default RoutePlannerPanel;
