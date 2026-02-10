/** Route planner table: rows with drag-drop, inline edit, POI, EDSM, Visited. */
import type { RoutePlannerRow } from './types';

interface RoutePlannerTableProps {
  rows: RoutePlannerRow[];
  editingIndex: number | null;
  editingValue: string;
  setEditingValue: (v: string) => void;
  copiedRowIndex: number | null;
  draggedIndex: number | null;
  editInputRef: React.RefObject<HTMLInputElement | null> | undefined;
  getPoiSuggestionsForSystem: (systemName: string) => string[];
  onReorder: (fromIndex: number, toIndex: number) => void;
  onSetDraggedIndex: (index: number | null) => void;
  onSetPoiName: (index: number, value: string) => void;
  onStartEditing: (index: number, currentName: string) => void;
  onCommitEdit: (index: number, currentName: string) => void;
  onCancelEdit: () => void;
  onCopySystemName: (index: number, name: string) => void;
}

export function RoutePlannerTable({
  rows,
  editingIndex,
  editingValue,
  setEditingValue,
  copiedRowIndex,
  draggedIndex,
  editInputRef,
  getPoiSuggestionsForSystem,
  onReorder,
  onSetDraggedIndex,
  onSetPoiName,
  onStartEditing,
  onCommitEdit,
  onCancelEdit,
  onCopySystemName,
}: RoutePlannerTableProps) {
  return (
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
              onSetDraggedIndex(i);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', String(i));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDragEnd={() => onSetDraggedIndex(null)}
            onDrop={(e) => {
              e.preventDefault();
              const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
              const to = i;
              if (Number.isNaN(from) || from === to) return;
              onReorder(from, to);
              onSetDraggedIndex(null);
            }}
            className={`border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 ${
              editingIndex === i ? '' : 'cursor-grab active:cursor-grabbing select-none'
            } ${draggedIndex === i ? 'opacity-50 bg-slate-100 dark:bg-slate-700/50' : ''}`}
          >
            <td className="px-2 py-1.5 text-slate-500 dark:text-slate-400 w-8 tabular-nums">
              {i + 1}
            </td>
            <td className="px-2 py-1.5 max-w-[140px]">
              <div className="flex items-center gap-1 min-w-0">
                <div className="min-w-0 flex-1">
                  {editingIndex === i ? (
                    <input
                      ref={
                        i === editingIndex && editInputRef
                          ? (editInputRef as React.RefObject<HTMLInputElement>)
                          : undefined
                      }
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => onCommitEdit(i, row.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          onCommitEdit(i, row.name);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          onCancelEdit();
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
                        onStartEditing(i, row.name);
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
                    onCopySystemName(i, row.name);
                  }}
                  className="p-0.5 rounded shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title={copiedRowIndex === i ? 'Copied!' : 'Copy system name'}
                  aria-label={
                    copiedRowIndex === i ? 'Copied!' : 'Copy system name'
                  }
                >
                  {copiedRowIndex === i ? (
                    <svg
                      className="w-4 h-4 text-green-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
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
                onChange={(e) => onSetPoiName(i, e.target.value)}
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
                <span
                  className="text-slate-400 dark:text-slate-500"
                  aria-busy="true"
                >
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
                <span
                  className="text-slate-400 dark:text-slate-500"
                  aria-busy="true"
                >
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
  );
}
