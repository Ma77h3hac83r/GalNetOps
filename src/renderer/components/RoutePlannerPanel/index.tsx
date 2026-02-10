/** Route planner panel: add systems, list with POI/EDSM/Visited, drag reorder, inline edit. */
import { useRoutePlanner } from './useRoutePlanner';
import { RoutePlannerClosed } from './RoutePlannerClosed';
import { RoutePlannerTable } from './RoutePlannerTable';

export type { RoutePlannerRow } from './types';

export function RoutePlannerPanel() {
  const data = useRoutePlanner();

  const {
    isOpen,
    setRoutePlannerOpen,
    routePlannerPanelWidth,
    systemNames,
    inputValue,
    setInputValue,
    rows,
    isFetching,
    draggedIndex,
    setDraggedIndex,
    editingIndex,
    editingValue,
    setEditingValue,
    copiedRowIndex,
    editInputRef,
    addSystems,
    handleKeyDown,
    reorderSystems,
    setPoiName,
    startEditing,
    commitEdit,
    cancelEdit,
    handleResizeStart,
    getPoiSuggestionsForSystem,
    handleCopySystemName,
  } = data;

  if (!isOpen) {
    return (
      <RoutePlannerClosed onOpen={() => setRoutePlannerOpen(true)} />
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
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Route planner
        </h2>
        <button
          type="button"
          onClick={() => setRoutePlannerOpen(false)}
          className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Hide route planner"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 p-3 gap-3">
        <label
          htmlFor="route-planner-input"
          className="text-xs font-medium text-slate-600 dark:text-slate-400"
        >
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
        <p
          id="route-planner-hint"
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          Press Enter to add. Paste multiple lines then Enter to add all.
          Double-click a system name to edit.
        </p>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            <span>Systems</span>
            {systemNames.length > 0 && (
              <span>
                {systemNames.length}{' '}
                {systemNames.length === 1 ? 'system' : 'systems'}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-auto rounded border border-slate-200 dark:border-slate-700">
            {systemNames.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center">
                Type a system name and press Enter to add it to the route.
              </div>
            ) : (
              <RoutePlannerTable
                rows={rows}
                editingIndex={editingIndex}
                editingValue={editingValue}
                setEditingValue={setEditingValue}
                copiedRowIndex={copiedRowIndex}
                draggedIndex={draggedIndex}
                editInputRef={editInputRef}
                getPoiSuggestionsForSystem={getPoiSuggestionsForSystem}
                onReorder={reorderSystems}
                onSetDraggedIndex={setDraggedIndex}
                onSetPoiName={setPoiName}
                onStartEditing={startEditing}
                onCommitEdit={commitEdit}
                onCancelEdit={cancelEdit}
                onCopySystemName={handleCopySystemName}
              />
            )}
          </div>
          {isFetching && systemNames.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Checking EDSM and visit history…
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
