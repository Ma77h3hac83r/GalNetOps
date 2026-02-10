/**
 * Horizontal row of sibling moons with connector line.
 */
import type { TreeNode } from './types';
import { BodyCard } from './BodyCard';

export interface SubMoonRowProps {
  children: TreeNode[];
  selectedBodyId: number | null;
  onSelect: (id: number) => void;
  systemName: string;
  iconScale: number;
  textScale: number;
  maxStarMass: number;
  maxPlanetMass: number;
}

export function SubMoonRow({
  children,
  selectedBodyId,
  onSelect,
  systemName,
  iconScale,
  textScale,
  maxStarMass,
  maxPlanetMass,
}: SubMoonRowProps) {
  if (children.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-px bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
      <div className="flex items-start gap-3">
        {children.map((subMoon) => (
          <div key={subMoon.body.bodyId} className="flex items-start gap-2">
            <BodyCard
              body={subMoon.body}
              isSelected={subMoon.body.bodyId === selectedBodyId}
              onClick={() => onSelect(subMoon.body.bodyId)}
              iconScale={iconScale}
              textScale={textScale}
              isMoon={true}
              systemName={systemName}
              maxStarMass={maxStarMass}
              maxPlanetMass={maxPlanetMass}
            />
            {subMoon.children.length > 0 && (
              <SubMoonRow
                children={subMoon.children}
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
        ))}
      </div>
    </div>
  );
}
