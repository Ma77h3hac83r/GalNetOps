/**
 * Hierarchical system map: tree of stars/planets/moons, zoom, selection, pan.
 */
import { useCallback, useRef, Fragment } from 'react';
import { useBodies, useAppStore } from '../../stores/appStore';
import { getStarDesignation } from './treeUtils';
import { calculateMassBasedSize } from './sizeUtils';
import { useSystemMapTree } from './useSystemMapTree';
import { StarRow } from './StarRow';
import { BarycentricRow } from './BarycentricRow';
import { BodyCard } from './BodyCard';
import { ChildrenColumn } from './ChildrenColumn';
import type { TreeNode } from './types';
import type { SystemMapProps } from './types';
import {
  ICON_SCALE_STEPS,
  TEXT_SCALE_STEPS,
  DEFAULT_ICON_SCALE_INDEX,
  DEFAULT_TEXT_SCALE_INDEX,
} from './constants';

export { ICON_SCALE_STEPS, TEXT_SCALE_STEPS, DEFAULT_ICON_SCALE_INDEX, DEFAULT_TEXT_SCALE_INDEX };

export function SystemMap({ iconScale, textScale }: SystemMapProps) {
  const bodies = useBodies();
  const selectedBodyId = useAppStore((state) => state.selectedBodyId);
  const setSelectedBody = useAppStore((state) => state.setSelectedBody);
  const currentSystem = useAppStore((state) => state.currentSystem);
  const systemName = currentSystem?.name || '';

  const starSystems = useSystemMapTree(bodies, systemName);

  const handleSelect = useCallback(
    (bodyId: number) => {
      setSelectedBody(bodyId);
    },
    [setSelectedBody]
  );

  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const hasPannedRef = useRef(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    hasPannedRef.current = false;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasPannedRef.current = true;
    }
    viewport.scrollTop -= dy;
    viewport.scrollLeft -= dx;
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleMouseLeave = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (hasPannedRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
    hasPannedRef.current = false;
  }, []);

  if (bodies.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8">
        <svg
          className="w-16 h-16 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-lg font-medium">No bodies scanned</p>
        <p className="text-sm mt-1 text-center max-w-md">
          Body data will appear here when you scan bodies in-game, or you can import your
          exploration history.
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg max-w-md">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-xs text-blue-700 dark:text-blue-400">
              <p className="font-medium">Have existing exploration data?</p>
              <p className="mt-1">
                Go to{' '}
                <span className="font-semibold">
                  Settings → Data Management → Import Journal History
                </span>{' '}
                to import your past exploration from journal files.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const maxStar = starSystems.maxStarMass ?? 1;
  const maxPlanet = starSystems.maxPlanetMass ?? 1;

  return (
    <div className="h-full flex flex-col">
      <div
        ref={viewportRef}
        className="flex-1 overflow-auto scrollbar-hide p-4 relative cursor-grab active:cursor-grabbing select-none min-h-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClickCapture}
      >
        <div className="flex flex-col gap-4 min-w-max pb-16 shrink-0">
          {starSystems.starSystems.map(({ star, planets }) => {
            const starDesignation = getStarDesignation(star.body.name, systemName);
            const barycentricToShow: Array<{ designation: string; bodies: TreeNode[] }> = [];
            if (starDesignation) {
              for (const [designation, baryBodies] of starSystems.barycentricBodies) {
                if (
                  baryBodies.length > 0 &&
                  designation.startsWith(starDesignation) &&
                  !barycentricToShow.find((b) => b.designation === designation)
                ) {
                  barycentricToShow.push({ designation, bodies: baryBodies });
                }
              }
            }
            return (
              <div key={star.body.bodyId}>
                <StarRow
                  star={star}
                  planets={planets}
                  selectedBodyId={selectedBodyId}
                  onSelect={handleSelect}
                  systemName={systemName}
                  iconScale={iconScale}
                  textScale={textScale}
                  maxStarMass={maxStar}
                  maxPlanetMass={maxPlanet}
                />
                {barycentricToShow.map(({ designation, bodies: baryBodies }) => (
                  <div key={designation} className="my-2">
                    <BarycentricRow
                      bodies={baryBodies}
                      selectedBodyId={selectedBodyId}
                      onSelect={handleSelect}
                      systemName={systemName}
                      iconScale={iconScale}
                      textScale={textScale}
                      maxStarMass={maxStar}
                      maxPlanetMass={maxPlanet}
                    />
                  </div>
                ))}
              </div>
            );
          })}

          {starSystems.orphanPlanets.length > 0 && (() => {
            const orphanLargestIcon = Math.max(
              0,
              ...starSystems.orphanPlanets.map((p) =>
                Math.round(calculateMassBasedSize(p.body, maxStar, maxPlanet) * iconScale)
              )
            );
            return (
              <div className="flex items-start gap-x-6 flex-wrap mt-2 pt-2 border-t border-slate-300 dark:border-slate-600">
                <span className="text-xs text-slate-400 dark:text-slate-500 self-center mr-2">
                  Other:
                </span>
                {starSystems.orphanPlanets.map((planet, idx) => (
                  <Fragment key={planet.body.bodyId}>
                    {idx > 0 && (
                      <div
                        className="flex flex-shrink-0 items-center"
                        style={{ height: orphanLargestIcon }}
                      >
                        <div className="w-4 h-px bg-slate-400 dark:bg-slate-500" />
                      </div>
                    )}
                    <div
                      className="flex flex-col items-center min-w-0"
                      style={{
                        marginTop:
                          (orphanLargestIcon -
                            Math.round(
                              calculateMassBasedSize(planet.body, maxStar, maxPlanet) * iconScale
                            )) /
                          2,
                      }}
                    >
                      <BodyCard
                        body={planet.body}
                        isSelected={planet.body.bodyId === selectedBodyId}
                        onClick={() => handleSelect(planet.body.bodyId)}
                        iconScale={iconScale}
                        textScale={textScale}
                        systemName={systemName}
                        maxStarMass={maxStar}
                        maxPlanetMass={maxPlanet}
                      />
                      {planet.children.length > 0 && (
                        <ChildrenColumn
                          children={planet.children}
                          selectedBodyId={selectedBodyId}
                          onSelect={handleSelect}
                          systemName={systemName}
                          iconScale={iconScale}
                          textScale={textScale}
                          maxStarMass={maxStar}
                          maxPlanetMass={maxPlanet}
                        />
                      )}
                    </div>
                  </Fragment>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
