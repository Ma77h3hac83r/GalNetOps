/**
 * Vertical column of child bodies (moons) with connector lines.
 */
import type { TreeNode } from './types';
import { BodyCard } from './BodyCard';
import { SubMoonRow } from './SubMoonRow';

export interface ChildrenColumnProps {
  children: TreeNode[];
  selectedBodyId: number | null;
  onSelect: (id: number) => void;
  systemName: string;
  iconScale: number;
  textScale: number;
  maxStarMass: number;
  maxPlanetMass: number;
}

export function ChildrenColumn({
  children,
  selectedBodyId,
  onSelect,
  systemName,
  iconScale,
  textScale,
  maxStarMass,
  maxPlanetMass,
}: ChildrenColumnProps) {
  if (children.length === 0) return null;

  return (
    <div className="flex flex-col items-center mt-1">
      <div className="w-px h-3 bg-slate-400 dark:bg-slate-500" />
      <div className="flex flex-col items-center gap-2">
        {children.map((child, idx) => (
          <div key={child.body.bodyId} className="flex flex-col items-center">
            {idx > 0 && <div className="w-px h-2 bg-slate-300 dark:bg-slate-600" />}
            <div className="flex items-start">
              <BodyCard
                body={child.body}
                isSelected={child.body.bodyId === selectedBodyId}
                onClick={() => onSelect(child.body.bodyId)}
                iconScale={iconScale}
                textScale={textScale}
                isMoon={true}
                systemName={systemName}
                maxStarMass={maxStarMass}
                maxPlanetMass={maxPlanetMass}
              />
              {child.children.length > 0 && (
                <SubMoonRow
                  children={child.children}
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
          </div>
        ))}
      </div>
    </div>
  );
}
