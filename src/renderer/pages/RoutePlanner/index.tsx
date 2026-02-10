/** Route Planner page: left panel for waypoints, right panel for POI storage. */
import { useRoutePlannerPage } from './useRoutePlannerPage';
import { WaypointPanel } from './WaypointPanel';
import { PoiPanel } from './PoiPanel';

export function RoutePlanner() {
  const data = useRoutePlannerPage();

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left — Waypoints */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 dark:border-slate-700 bg-surface">
        <WaypointPanel
          waypoints={data.waypoints}
          waypointInput={data.waypointInput}
          setWaypointInput={data.setWaypointInput}
          isFetching={data.isFetchingWaypoints}
          draggedIndex={data.draggedWaypointIndex}
          setDraggedIndex={data.setDraggedWaypointIndex}
          editingIndex={data.editingWaypointIndex}
          editingValue={data.editingWaypointValue}
          setEditingValue={data.setEditingWaypointValue}
          editInputRef={data.waypointEditInputRef}
          copiedIndex={data.copiedWaypointIndex}
          addWaypoints={data.addWaypoints}
          handleKeyDown={data.handleWaypointKeyDown}
          removeWaypoint={data.removeWaypoint}
          clearAll={data.clearAllWaypoints}
          reorder={data.reorderWaypoints}
          startEditing={data.startEditingWaypoint}
          commitEdit={data.commitWaypointEdit}
          cancelEdit={data.cancelWaypointEdit}
          onCopySystemName={data.handleCopySystemName}
          onOpenEdsmPage={data.handleOpenEdsmPage}
          onCreatePoiForSystem={data.prefillPoiForSystem}
        />
      </div>

      {/* Right — Points of Interest */}
      <div className="flex-1 flex flex-col min-w-0 bg-surface">
        <PoiPanel
          pois={data.pois}
          filteredPois={data.filteredPois}
          poiSearch={data.poiSearch}
          setPoiSearch={data.setPoiSearch}
          newPoiSystem={data.newPoiSystem}
          setNewPoiSystem={data.setNewPoiSystem}
          newPoiBody={data.newPoiBody}
          setNewPoiBody={data.setNewPoiBody}
          newPoiLabel={data.newPoiLabel}
          setNewPoiLabel={data.setNewPoiLabel}
          newPoiCategory={data.newPoiCategory}
          setNewPoiCategory={data.setNewPoiCategory}
          newPoiNotes={data.newPoiNotes}
          setNewPoiNotes={data.setNewPoiNotes}
          addOrUpdatePoi={data.addOrUpdatePoi}
          removePoi={data.removePoi}
          clearAll={data.clearAllPois}
          labelInputRef={data.poiLabelInputRef}
          editingPoiId={data.editingPoiId}
          onRowClick={data.startEditingPoi}
          onCancelEdit={data.cancelEditingPoi}
          copiedPoiId={data.copiedPoiId}
          onCopySystemName={data.handleCopyPoiSystemName}
          allCategories={data.allCategories}
          onAddCustomCategory={data.addCustomCategory}
          onRemoveCustomCategory={data.removeCustomCategory}
          customCategories={data.customCategories}
        />
      </div>
    </div>
  );
}
