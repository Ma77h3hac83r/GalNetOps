/**
 * Row of bodies sharing a barycenter (e.g. binary planets).
 */
import { Fragment } from 'react';
import type { TreeNode } from './types';
import { BodyCard } from './BodyCard';
import { ChildrenColumn } from './ChildrenColumn';
import { calculateMassBasedSize } from './sizeUtils';

export interface BarycentricRowProps {
  bodies: TreeNode[];
  selectedBodyId: number | null;
  onSelect: (id: number) => void;
  systemName: string;
  iconScale: number;
  textScale: number;
  maxStarMass: number;
  maxPlanetMass: number;
}

export function BarycentricRow({
  bodies,
  selectedBodyId,
  onSelect,
  systemName,
  iconScale,
  textScale,
  maxStarMass,
  maxPlanetMass,
}: BarycentricRowProps) {
  if (bodies.length === 0) return null;

  const largestIconSize = Math.max(
    ...bodies.map((b) =>
      Math.round(calculateMassBasedSize(b.body, maxStarMass, maxPlanetMass) * iconScale)
    )
  );

  return (
    <div className="flex items-start gap-2 pl-12 ml-8">
      <div
        className="flex flex-shrink-0 items-center"
        style={{ height: largestIconSize }}
      >
        <div className="w-6 h-px bg-slate-400 dark:bg-slate-500" />
      </div>

      <div className="flex items-start gap-x-6 flex-wrap">
        {bodies.map((planet, idx) => {
          const planetIconSize = Math.round(
            calculateMassBasedSize(planet.body, maxStarMass, maxPlanetMass) * iconScale
          );
          const topOffset = (largestIconSize - planetIconSize) / 2;
          return (
            <Fragment key={planet.body.bodyId}>
              {idx > 0 && (
                <div
                  className="flex flex-shrink-0 items-center"
                  style={{ height: largestIconSize }}
                >
                  <div className="w-4 h-px bg-slate-400 dark:bg-slate-500" />
                </div>
              )}
              <div
                className="flex flex-col items-center min-w-0"
                style={{ marginTop: topOffset }}
              >
                <BodyCard
                  body={planet.body}
                  isSelected={planet.body.bodyId === selectedBodyId}
                  onClick={() => onSelect(planet.body.bodyId)}
                  iconScale={iconScale}
                  textScale={textScale}
                  systemName={systemName}
                  maxStarMass={maxStarMass}
                  maxPlanetMass={maxPlanetMass}
                />
                {planet.children.length > 0 && (
                  <ChildrenColumn
                    children={planet.children}
                    selectedBodyId={selectedBodyId}
                    onSelect={onSelect}
                    systemName={systemName}
                    iconScale={iconScale}
                    textScale={textScale}
                    maxStarMass={maxStarMass}
                    maxPlanetMass={maxPlanetMass}
                  />
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
