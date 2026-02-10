/** Left panel: waypoint table with drag-reorder, resizable columns, copy, EDSM link, star type, POI. */
import { useState, useCallback, useRef } from 'react';
import type { Waypoint } from './types';

/** Fixed pixel widths for non-resizable columns (index → px). */
const FIXED_COL_WIDTHS: Record<number, number> = { 0: 36, 1: 32, 6: 56, 7: 32 };

/** Default proportional weights for flexible columns. Columns: #(fixed), Copy(fixed), System, Star, Visited, POI, EDSM(fixed), Remove(fixed) */
const DEFAULT_COL_WIDTHS = [36, 32, 200, 48, 56, 140, 56, 32];

interface WaypointPanelProps {
  waypoints: Waypoint[];
  waypointInput: string;
  setWaypointInput: (v: string) => void;
  isFetching: boolean;
  draggedIndex: number | null;
  setDraggedIndex: (i: number | null) => void;
  editingIndex: number | null;
  editingValue: string;
  setEditingValue: (v: string) => void;
  editInputRef: React.RefObject<HTMLInputElement | null> | undefined;
  copiedIndex: number | null;
  addWaypoints: (text: string) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  removeWaypoint: (index: number) => void;
  clearAll: () => void;
  reorder: (from: number, to: number) => void;
  startEditing: (index: number, currentName: string) => void;
  commitEdit: (index: number) => void;
  cancelEdit: () => void;
  onCopySystemName: (index: number, name: string) => void;
  onOpenEdsmPage: (systemName: string) => void;
  onCreatePoiForSystem: (systemName: string) => void;
}

export function WaypointPanel({
  waypoints,
  waypointInput,
  setWaypointInput,
  isFetching,
  draggedIndex,
  setDraggedIndex,
  editingIndex,
  editingValue,
  setEditingValue,
  editInputRef,
  copiedIndex,
  addWaypoints,
  handleKeyDown,
  removeWaypoint,
  clearAll,
  reorder,
  startEditing,
  commitEdit,
  cancelEdit,
  onCopySystemName,
  onOpenEdsmPage,
  onCreatePoiForSystem,
}: WaypointPanelProps) {
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_COL_WIDTHS);
  const resizingRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

  /** Start a column resize drag. */
  const handleResizeStart = useCallback(
    (colIndex: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = colWidths[colIndex] ?? 80;
      resizingRef.current = { colIndex, startX, startWidth };

      const onMove = (moveEvent: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = moveEvent.clientX - resizingRef.current.startX;
        const newWidth = Math.max(24, resizingRef.current.startWidth + delta);
        setColWidths((prev) => {
          const next = [...prev];
          next[resizingRef.current!.colIndex] = newWidth;
          return next;
        });
      };
      const onUp = () => {
        resizingRef.current = null;
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
    [colWidths]
  );

  /** Render a resize handle positioned on the right edge of a header cell. */
  const resizeHandle = (colIndex: number) => (
    <span
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent-400/40 z-20"
      onMouseDown={(e) => handleResizeStart(colIndex, e)}
      aria-hidden
    />
  );

  // Column headers in desired order: #, Copy, System, Star, Visited, POI, EDSM, (Remove)
  const headers: Array<{ label: string; className: string; resizable: boolean }> = [
    { label: '#', className: 'text-center', resizable: false },
    { label: '', className: 'text-center', resizable: false }, // Copy
    { label: 'System', className: 'text-left', resizable: true },
    { label: 'Star', className: 'text-center', resizable: true },
    { label: 'Visited', className: 'text-center', resizable: true },
    { label: 'POI', className: 'text-left', resizable: true },
    { label: 'EDSM', className: 'text-center', resizable: true },
    { label: '', className: '', resizable: false }, // Remove
  ];

  return (
    <section className="flex flex-col flex-1 min-w-0 min-h-0" aria-label="Waypoints">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Waypoints
        </h2>
        {waypoints.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {waypoints.length} {waypoints.length === 1 ? 'system' : 'systems'}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              title="Clear all waypoints"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <label
          htmlFor="rp-waypoint-input"
          className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5"
        >
          Add system (type or paste, then Enter)
        </label>
        <div className="flex gap-2">
          <input
            id="rp-waypoint-input"
            type="text"
            value={waypointInput}
            onChange={(e) => setWaypointInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="System name..."
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => addWaypoints(waypointInput)}
            className="px-3 py-2 text-sm font-medium rounded bg-accent-500 text-white hover:bg-accent-600 focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Press Enter to add. Paste multiple lines then Enter to add all. Double-click a name to edit.
        </p>
      </div>

      {/* Waypoint table */}
      <div className="flex-1 overflow-auto">
        {waypoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No waypoints yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Type a system name above and press Enter to start planning your route.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              {(() => {
                const fixedTotal = Object.values(FIXED_COL_WIDTHS).reduce((a, b) => a + b, 0);
                const flexTotal = colWidths.reduce((sum, w, i) => sum + (FIXED_COL_WIDTHS[i] != null ? 0 : w), 0);
                return colWidths.map((w, idx) => {
                  if (FIXED_COL_WIDTHS[idx] != null) {
                    return <col key={idx} style={{ width: FIXED_COL_WIDTHS[idx] }} />;
                  }
                  const pct = flexTotal > 0 ? (w / flexTotal) * 100 : 0;
                  return <col key={idx} style={{ width: `calc((100% - ${fixedTotal}px) * ${pct / 100})` }} />;
                });
              })()}
            </colgroup>
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 z-10">
              <tr>
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    className={`relative px-2 py-1.5 font-medium text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap ${h.className}`}
                  >
                    {h.label || <span className="sr-only">Action</span>}
                    {h.resizable && resizeHandle(idx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {waypoints.map((wp, i) => (
                <tr
                  key={`${wp.name}-${i}`}
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
                    if (Number.isNaN(from) || from === i) return;
                    reorder(from, i);
                    setDraggedIndex(null);
                  }}
                  className={`border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 ${
                    editingIndex === i ? '' : 'cursor-grab active:cursor-grabbing select-none'
                  } ${draggedIndex === i ? 'opacity-50 bg-slate-100 dark:bg-slate-700/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
                >
                  {/* 1. # */}
                  <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 tabular-nums text-center">
                    {i + 1}
                  </td>

                  {/* 2. Copy button */}
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopySystemName(i, wp.name);
                      }}
                      className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                      title={copiedIndex === i ? 'Copied!' : 'Copy system name'}
                      aria-label={copiedIndex === i ? 'Copied!' : 'Copy system name'}
                    >
                      {copiedIndex === i ? (
                        <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </td>

                  {/* 3. System name */}
                  <td className="px-2 py-1.5 overflow-hidden">
                    {editingIndex === i ? (
                      <input
                        ref={
                          editInputRef
                            ? (editInputRef as React.RefObject<HTMLInputElement>)
                            : undefined
                        }
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitEdit(i);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEdit();
                          }
                        }}
                        onBlur={() => commitEdit(i)}
                        className="w-full min-w-0 px-1.5 py-0.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-accent-500 focus:border-accent-500"
                        spellCheck={false}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Edit system name"
                      />
                    ) : (
                      <span
                        className="block text-slate-800 dark:text-slate-200 truncate cursor-text hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded px-1 -mx-1"
                        title={wp.name}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          startEditing(i, wp.name);
                        }}
                      >
                        {wp.name}
                      </span>
                    )}
                  </td>

                  {/* 4. Star type */}
                  <td className="px-2 py-1.5 text-center text-slate-600 dark:text-slate-300 tabular-nums overflow-hidden" title={wp.starType ?? undefined}>
                    {wp.starType ?? (wp.inEdsm === null ? '...' : '-')}
                  </td>

                  {/* 5. Visited */}
                  <td className="px-2 py-1.5 text-center overflow-hidden">
                    {wp.visited === null ? (
                      <span className="text-slate-400 dark:text-slate-500" aria-busy="true">...</span>
                    ) : wp.visited ? (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">Yes</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-xs">No</span>
                    )}
                  </td>

                  {/* 6. POI name */}
                  <td className="px-2 py-1.5 overflow-hidden">
                    {wp.poiName ? (
                      <span className="block truncate text-xs text-accent-600 dark:text-accent-400" title={wp.poiName}>
                        {wp.poiName}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCreatePoiForSystem(wp.name);
                        }}
                        className="inline-flex items-center gap-0.5 text-xs text-slate-400 hover:text-accent-500 dark:text-slate-500 dark:hover:text-accent-400"
                        title={`Add POI for ${wp.name}`}
                        aria-label={`Add POI for ${wp.name}`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                      </button>
                    )}
                  </td>

                  {/* 7. EDSM button / status */}
                  <td className="px-2 py-1.5 text-center overflow-hidden">
                    {wp.inEdsm === null ? (
                      <span className="text-slate-400 dark:text-slate-500" aria-busy="true">...</span>
                    ) : wp.inEdsm ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEdsmPage(wp.name);
                        }}
                        className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-xs font-medium"
                        title={`View ${wp.name} on EDSM`}
                      >
                        EDSM
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </button>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-xs">No</span>
                    )}
                  </td>

                  {/* 8. Remove */}
                  <td className="px-1 py-1.5 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeWaypoint(i);
                      }}
                      className="p-0.5 rounded text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
                      aria-label={`Remove ${wp.name}`}
                      title="Remove waypoint"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer status */}
      {isFetching && waypoints.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Checking EDSM and visit history…
          </p>
        </div>
      )}
    </section>
  );
}
