/** Right panel: POI table — add/edit form, search, columnar list with copy, system/body, POI name, star, sector, type, notes. */
import { useState, useCallback, useRef } from 'react';
import type { PointOfInterest, PoiCategory } from './types';
import { isPoiCategory } from './types';

/** Category color map for built-in badges. */
const CATEGORY_COLORS: Record<PoiCategory, string> = {
  Biological: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  Geological: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  Guardian: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  Thargoid: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  Scenic: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  Station: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
  Mining: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  Other: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
};

/** Default style for custom (user-created) categories. */
const CUSTOM_CATEGORY_COLOR = 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';

/** Get badge color classes for a category (built-in or custom). */
function getCategoryColor(category: string): string {
  if (isPoiCategory(category)) return CATEGORY_COLORS[category];
  return CUSTOM_CATEGORY_COLOR;
}

/** Fixed pixel widths for non-resizable columns (index → px). */
const FIXED_COL_WIDTHS: Record<number, number> = { 0: 32, 7: 32 };

/** Default proportional column weights: Copy(fixed), System/Body, POI Name, Star, Sector, Type, Notes, Remove(fixed) */
const DEFAULT_COL_WIDTHS = [32, 180, 130, 48, 130, 80, 120, 32];

interface PoiPanelProps {
  pois: PointOfInterest[];
  filteredPois: PointOfInterest[];
  poiSearch: string;
  setPoiSearch: (v: string) => void;
  newPoiSystem: string;
  setNewPoiSystem: (v: string) => void;
  newPoiBody: string;
  setNewPoiBody: (v: string) => void;
  newPoiLabel: string;
  setNewPoiLabel: (v: string) => void;
  newPoiCategory: string;
  setNewPoiCategory: (v: string) => void;
  newPoiNotes: string;
  setNewPoiNotes: (v: string) => void;
  addOrUpdatePoi: () => void;
  removePoi: (id: string) => void;
  clearAll: () => void;
  labelInputRef: React.RefObject<HTMLInputElement | null> | undefined;
  editingPoiId: string | null;
  onRowClick: (poi: PointOfInterest) => void;
  onCancelEdit: () => void;
  copiedPoiId: string | null;
  onCopySystemName: (poiId: string, name: string) => void;
  /** Full list of categories: predefined + custom. */
  allCategories: string[];
  /** Callback to add a new custom category. */
  onAddCustomCategory: (name: string) => void;
  /** Callback to remove a custom category. */
  onRemoveCustomCategory: (name: string) => void;
  /** List of custom (user-created) category names, for showing remove buttons. */
  customCategories: string[];
}

export function PoiPanel({
  pois,
  filteredPois,
  poiSearch,
  setPoiSearch,
  newPoiSystem,
  setNewPoiSystem,
  newPoiBody,
  setNewPoiBody,
  newPoiLabel,
  setNewPoiLabel,
  newPoiCategory,
  setNewPoiCategory,
  newPoiNotes,
  setNewPoiNotes,
  addOrUpdatePoi,
  removePoi,
  clearAll,
  labelInputRef,
  editingPoiId,
  onRowClick,
  onCancelEdit,
  copiedPoiId,
  onCopySystemName,
  allCategories,
  onAddCustomCategory,
  onRemoveCustomCategory,
  customCategories,
}: PoiPanelProps) {
  const canSave = newPoiSystem.trim() !== '' && newPoiLabel.trim() !== '';
  const isEditing = editingPoiId !== null;
  const [isCreatingCustomCat, setIsCreatingCustomCat] = useState(false);
  const [customCatInput, setCustomCatInput] = useState('');
  const customCatInputRef = useRef<HTMLInputElement>(null);

  // ── Resizable columns ──────────────────────────────────
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_COL_WIDTHS);
  const resizingRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);

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

  const resizeHandle = (colIndex: number) => (
    <span
      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-accent-400/40 z-20"
      onMouseDown={(e) => handleResizeStart(colIndex, e)}
      aria-hidden
    />
  );

  // Column order: Copy, System/Body, POI Name, Star, Sector, Type, Notes, Remove
  const headers: Array<{ label: string; className: string; resizable: boolean }> = [
    { label: '', className: 'text-center', resizable: false }, // Copy
    { label: 'System / Body', className: 'text-left', resizable: true },
    { label: 'POI Name', className: 'text-left', resizable: true },
    { label: 'Star', className: 'text-center', resizable: true },
    { label: 'Sector', className: 'text-left', resizable: true },
    { label: 'Type', className: 'text-center', resizable: true },
    { label: 'Notes', className: 'text-left', resizable: true },
    { label: '', className: '', resizable: false }, // Remove
  ];

  return (
    <section className="flex flex-col flex-1 min-w-0 min-h-0" aria-label="Points of Interest">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Points of Interest
        </h2>
        {pois.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {pois.length} {pois.length === 1 ? 'POI' : 'POIs'}
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300"
              title="Clear all POIs"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit POI form */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {isEditing ? 'Edit Point of Interest' : 'Add a Point of Interest'}
          </p>
          {isEditing && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            value={newPoiSystem}
            onChange={(e) => setNewPoiSystem(e.target.value)}
            placeholder="System name *"
            className="px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            spellCheck={false}
          />
          <input
            type="text"
            value={newPoiBody}
            onChange={(e) => setNewPoiBody(e.target.value)}
            placeholder="Body name (optional)"
            className="px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            spellCheck={false}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            ref={
              labelInputRef
                ? (labelInputRef as React.RefObject<HTMLInputElement>)
                : undefined
            }
            type="text"
            value={newPoiLabel}
            onChange={(e) => setNewPoiLabel(e.target.value)}
            placeholder="POI label *"
            className="px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSave) addOrUpdatePoi();
            }}
          />
          {isCreatingCustomCat ? (
            <div className="flex gap-1">
              <input
                ref={customCatInputRef}
                type="text"
                value={customCatInput}
                onChange={(e) => setCustomCatInput(e.target.value)}
                placeholder="Category name"
                className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                spellCheck={false}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = customCatInput.trim();
                    if (trimmed) {
                      onAddCustomCategory(trimmed);
                      setNewPoiCategory(trimmed);
                    }
                    setCustomCatInput('');
                    setIsCreatingCustomCat(false);
                  } else if (e.key === 'Escape') {
                    setCustomCatInput('');
                    setIsCreatingCustomCat(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = customCatInput.trim();
                  if (trimmed) {
                    onAddCustomCategory(trimmed);
                    setNewPoiCategory(trimmed);
                  }
                  setCustomCatInput('');
                  setIsCreatingCustomCat(false);
                }}
                className="px-2 py-1.5 text-xs font-medium rounded bg-accent-500 text-white hover:bg-accent-600"
                title="Confirm"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomCatInput('');
                  setIsCreatingCustomCat(false);
                }}
                className="px-2 py-1.5 text-xs rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                title="Cancel"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-1">
              <select
                value={newPoiCategory}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '__custom__') {
                    setIsCreatingCustomCat(true);
                    setCustomCatInput('');
                    setTimeout(() => customCatInputRef.current?.focus(), 0);
                  } else {
                    setNewPoiCategory(v);
                  }
                }}
                className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              >
                {allCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}{customCategories.includes(cat) ? ' *' : ''}
                  </option>
                ))}
                <option value="__custom__">+ Custom...</option>
              </select>
              {customCategories.includes(newPoiCategory) && (
                <button
                  type="button"
                  onClick={() => {
                    onRemoveCustomCategory(newPoiCategory);
                    setNewPoiCategory('Other');
                  }}
                  className="px-1.5 py-1.5 text-xs rounded text-red-400 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400"
                  title={`Remove "${newPoiCategory}" category`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        <textarea
          value={newPoiNotes}
          onChange={(e) => setNewPoiNotes(e.target.value)}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full px-2.5 py-1.5 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500 resize-none"
        />

        <button
          type="button"
          onClick={addOrUpdatePoi}
          disabled={!canSave}
          className={`w-full px-3 py-2 text-sm font-medium rounded text-white focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed ${
            isEditing
              ? 'bg-amber-500 hover:bg-amber-600 focus:ring-amber-500'
              : 'bg-accent-500 hover:bg-accent-600 focus:ring-accent-500'
          }`}
        >
          {isEditing ? 'Update POI' : 'Add POI'}
        </button>
      </div>

      {/* Search */}
      {pois.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <input
              type="text"
              value={poiSearch}
              onChange={(e) => setPoiSearch(e.target.value)}
              placeholder="Search POIs..."
              className="w-full px-3 py-1.5 pl-8 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
            />
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      )}

      {/* POI table */}
      <div className="flex-1 overflow-auto">
        {pois.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No points of interest saved
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Add systems and bodies you want to remember for your route.
            </p>
          </div>
        ) : filteredPois.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No POIs match your search.
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
              {filteredPois.map((poi) => {
                const isActiveEdit = editingPoiId === poi.id;
                return (
                  <tr
                    key={poi.id}
                    onClick={() => onRowClick(poi)}
                    className={`border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 group cursor-pointer ${
                      isActiveEdit
                        ? 'bg-amber-50 dark:bg-amber-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                    title="Click to edit this POI"
                  >
                    {/* 1. Copy button */}
                    <td className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onCopySystemName(poi.id, poi.systemName);
                        }}
                        className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        title={copiedPoiId === poi.id ? 'Copied!' : 'Copy system name'}
                        aria-label={copiedPoiId === poi.id ? 'Copied!' : 'Copy system name'}
                      >
                        {copiedPoiId === poi.id ? (
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

                    {/* 2. System & Body */}
                    <td className="px-2 py-1.5 overflow-hidden">
                      <div className="truncate text-slate-800 dark:text-slate-200" title={poi.bodyName ? `${poi.systemName} / ${poi.bodyName}` : poi.systemName}>
                        {poi.systemName}
                        {poi.bodyName && (
                          <span className="text-slate-400 dark:text-slate-500">
                            {' / '}
                            {poi.bodyName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. POI Name */}
                    <td className="px-2 py-1.5 overflow-hidden">
                      <span className="block truncate text-slate-800 dark:text-slate-200 font-medium" title={poi.label}>
                        {poi.label}
                      </span>
                    </td>

                    {/* 4. Star type */}
                    <td className="px-2 py-1.5 text-center text-slate-600 dark:text-slate-300 tabular-nums overflow-hidden" title={poi.starType ?? undefined}>
                      {poi.starType ?? '...'}
                    </td>

                    {/* 5. Galactic Sector */}
                    <td className="px-2 py-1.5 overflow-hidden">
                      <span className="block truncate text-xs text-slate-500 dark:text-slate-400" title={poi.galacticSector ?? undefined}>
                        {poi.galacticSector ?? '...'}
                      </span>
                    </td>

                    {/* 6. POI Type (category badge) */}
                    <td className="px-2 py-1.5 text-center overflow-hidden">
                      <span
                        className={`inline-block text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${getCategoryColor(poi.category)}`}
                      >
                        {poi.category}
                      </span>
                    </td>

                    {/* 7. Notes */}
                    <td className="px-2 py-1.5 overflow-hidden">
                      {poi.notes ? (
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400" title={poi.notes}>
                          {poi.notes}
                        </span>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>

                    {/* 8. Remove */}
                    <td className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePoi(poi.id);
                        }}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition-opacity"
                        aria-label={`Remove ${poi.label}`}
                        title="Remove POI"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
