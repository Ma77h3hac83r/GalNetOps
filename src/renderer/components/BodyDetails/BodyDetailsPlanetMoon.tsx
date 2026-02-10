/**
 * Planet/Moon details section: properties, orbital, atmosphere, composition, signals, materials, rings, biologicals.
 */
import type { Biological, CelestialBody } from '@shared/types';
import type { Ring, Material, Composition, AtmosphereComponent, OrbitalParams } from './bodyDetailsTypes';
import { GEOLOGICAL_CREDITS, HUMAN_CREDITS } from '@shared/exobiologyScanValues';
import { getGenusValueRange } from '@shared/exobiologyScanValues';
import {
  ATMOSPHERE_COLORS,
  ELEMENT_SYMBOLS,
  getElementStyle,
  formatSemiMajorAxis,
  formatDegrees,
  formatPeriod,
  formatAxialTilt,
  formatRingClass,
  formatRingMass,
  formatRingRadius,
  getRingImageFromType,
} from './bodyDetailsUtils';
import { BodyDetailsBiologicals } from './BodyDetailsBiologicals';

const SECTION_HEADING = 'text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2';
const SECTION_DIVIDER = '[&>*+*]:pt-4 [&>*+*]:mt-4';

interface BodyDetailsPlanetMoonProps {
  body: CelestialBody;
  rings: Ring[];
  orbitalParams: OrbitalParams | null;
  composition: Composition | null;
  atmosphereComposition: AtmosphereComponent[];
  materials: Material[];
  materialGroups: Array<{ label: string; materials: Material[] }>;
  biologicals: Biological[];
  loadingBio: boolean;
  genuses: string[];
  estimatedGenera: Array<{
    genus: string;
    valueMin: number;
    valueMax: number;
    possible: Array<{ species: string; fullLabel: string; variantColor?: string }>;
  }>;
  starClassLetter: string;
  currentSystem: { name: string } | null;
  bodies: CelestialBody[];
  formatNumber: (num: number | null | undefined) => string;
  formatCredits: (value: number) => string;
  formatCreditsRange: (min: number, max: number) => string;
}

export function BodyDetailsPlanetMoon({
  body,
  rings,
  orbitalParams,
  composition,
  atmosphereComposition,
  materials,
  materialGroups,
  biologicals,
  loadingBio,
  genuses,
  estimatedGenera,
  starClassLetter,
  currentSystem,
  bodies,
  formatNumber,
  formatCredits,
  formatCreditsRange,
}: BodyDetailsPlanetMoonProps): JSX.Element {
  return (
    <div className={`space-y-0 ${SECTION_DIVIDER}`}>
      <div>
        <h3 className={SECTION_HEADING}>Properties</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-sm">
            <dt className="text-slate-600 dark:text-slate-400">Distance</dt>
            <dd className="text-slate-900 dark:text-white">{(Number(body?.distanceLS) || 0).toFixed(2)} ls</dd>
          </div>
          {body.mass != null && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Mass</dt>
              <dd className="text-slate-900 dark:text-white">{(Number(body.mass) || 0).toFixed(4)} EM</dd>
            </div>
          )}
          {body.radius != null && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Radius</dt>
              <dd className="text-slate-900 dark:text-white">{formatNumber(Math.round(Number(body.radius) || 0))} km</dd>
            </div>
          )}
          {body.gravity != null && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Gravity</dt>
              <dd className="text-slate-900 dark:text-white">{(Number(body.gravity) || 0).toFixed(2)} g</dd>
            </div>
          )}
          {body.temperature != null && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Temperature</dt>
              <dd className="text-slate-900 dark:text-white">
                {formatNumber(Math.round(Number(body.temperature) || 0))} K
                <span className="text-slate-500 dark:text-slate-400 ml-1">
                  ({Math.round((Number(body.temperature) || 0) - 273.15)}°C / {Math.round(((Number(body.temperature) || 0) - 273.15) * 9 / 5 + 32)}°F)
                </span>
              </dd>
            </div>
          )}
          {body.atmosphereType != null && body.atmosphereType !== '' ? (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Atmosphere</dt>
              <dd className="text-slate-900 dark:text-white text-right max-w-[60%]">{body.atmosphereType}</dd>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Atmosphere</dt>
              <dd className="text-slate-500 dark:text-slate-400">None</dd>
            </div>
          )}
          {body.volcanism != null && body.volcanism !== '' && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Volcanism</dt>
              <dd className="text-slate-900 dark:text-white text-right max-w-[60%]">{body.volcanism}</dd>
            </div>
          )}
          {body.terraformable && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Terraformable</dt>
              <dd className="text-slate-900 dark:text-white">Yes</dd>
            </div>
          )}
        </dl>
      </div>

      {orbitalParams != null && (
        <div>
          <h3 className={SECTION_HEADING}>Orbital Parameters</h3>
          <dl className="space-y-1">
            {orbitalParams.SemiMajorAxis != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Semi-Major Axis</dt>
                <dd className="text-slate-900 dark:text-white">{formatSemiMajorAxis(orbitalParams.SemiMajorAxis)}</dd>
              </div>
            )}
            {orbitalParams.Eccentricity != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Eccentricity</dt>
                <dd className="text-slate-900 dark:text-white">{(Number(orbitalParams.Eccentricity) || 0).toFixed(4)}</dd>
              </div>
            )}
            {orbitalParams.OrbitalInclination != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Inclination</dt>
                <dd className="text-slate-900 dark:text-white">{formatDegrees(Number(orbitalParams.OrbitalInclination) || 0)}</dd>
              </div>
            )}
            {orbitalParams.OrbitalPeriod != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Orbital Period</dt>
                <dd className="text-slate-900 dark:text-white">{formatPeriod(Number(orbitalParams.OrbitalPeriod) || 0)}</dd>
              </div>
            )}
            {orbitalParams.RotationPeriod != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Rotation Period</dt>
                <dd className="text-slate-900 dark:text-white flex items-center gap-1">
                  {formatPeriod(Number(orbitalParams.RotationPeriod) || 0)}
                  {Number(orbitalParams.RotationPeriod) < 0 && (
                    <span className="text-xs text-slate-400" title="Retrograde rotation">↺</span>
                  )}
                </dd>
              </div>
            )}
            {orbitalParams.AxialTilt != null && (
              <div className="flex justify-between text-sm">
                <dt className="text-slate-600 dark:text-slate-400">Axial Tilt</dt>
                <dd className="text-slate-900 dark:text-white">{formatAxialTilt(Number(orbitalParams.AxialTilt) || 0)}</dd>
              </div>
            )}
          </dl>
          {orbitalParams.TidalLock && (
            <div className="mt-2 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Tidally Locked</span>
            </div>
          )}
        </div>
      )}

      {atmosphereComposition.length > 0 && (
        <div>
          <h3 className={SECTION_HEADING}>Atmosphere Composition</h3>
          <div className="space-y-2 text-sm">
            <div className="flex h-2 rounded overflow-hidden">
              {atmosphereComposition.map((comp) => (
                <div
                  key={comp.Name}
                  style={{ width: `${comp.Percent}%`, backgroundColor: ATMOSPHERE_COLORS[comp.Name] || '#71717a' }}
                  title={`${comp.Name}: ${comp.Percent.toFixed(1)}%`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {atmosphereComposition.map((comp) => (
                <span key={comp.Name} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: ATMOSPHERE_COLORS[comp.Name] || '#71717a' }}
                  />
                  {comp.Name} {comp.Percent.toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {composition != null && (composition.Metal > 0 || composition.Rock > 0 || composition.Ice > 0) && (() => {
        const isDecimal = composition.Metal <= 1 && composition.Rock <= 1 && composition.Ice <= 1;
        const metalPct = isDecimal ? composition.Metal * 100 : composition.Metal;
        const rockPct = isDecimal ? composition.Rock * 100 : composition.Rock;
        const icePct = isDecimal ? composition.Ice * 100 : composition.Ice;
        return (
          <div>
            <h3 className={SECTION_HEADING}>Body Composition</h3>
            <div className="space-y-2 text-sm">
              <div className="flex h-2 rounded overflow-hidden">
                {metalPct > 0 && (
                  <div className="bg-amber-500" style={{ width: `${metalPct}%` }} title={`Metal: ${metalPct.toFixed(1)}%`} />
                )}
                {rockPct > 0 && (
                  <div className="bg-stone-500" style={{ width: `${rockPct}%` }} title={`Rock: ${rockPct.toFixed(1)}%`} />
                )}
                {icePct > 0 && (
                  <div className="bg-cyan-400" style={{ width: `${icePct}%` }} title={`Ice: ${icePct.toFixed(1)}%`} />
                )}
              </div>
              <div className="flex gap-3 text-xs">
                {metalPct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-amber-500 rounded-sm" />
                    Metal {metalPct.toFixed(1)}%
                  </span>
                )}
                {rockPct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-stone-500 rounded-sm" />
                    Rock {rockPct.toFixed(1)}%
                  </span>
                )}
                {icePct > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-cyan-400 rounded-sm" />
                    Ice {icePct.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {body.geoSignals > 0 && (
        <div>
          <h3 className={SECTION_HEADING}>Geological Signals</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <li>Geological ({body.geoSignals}): {formatCredits(GEOLOGICAL_CREDITS)} (Codex & materials only)</li>
          </ul>
        </div>
      )}

      <BodyDetailsBiologicals
        body={body}
        bodies={bodies}
        currentSystem={currentSystem}
        biologicals={biologicals}
        loadingBio={loadingBio}
        genuses={genuses}
        estimatedGenera={estimatedGenera}
        starClassLetter={starClassLetter}
        formatCredits={formatCredits}
        formatCreditsRange={formatCreditsRange}
      />

      {(body.humanSignals ?? 0) > 0 && (
        <div>
          <h3 className={SECTION_HEADING}>Human Signals</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
            <li>Human ({body.humanSignals}): {formatCredits(HUMAN_CREDITS)} (no Vista Genomics credits)</li>
          </ul>
        </div>
      )}

      {(body.thargoidSignals ?? 0) > 0 && (() => {
        const r = getGenusValueRange('Thargoid');
        return (
          <div>
            <h3 className={SECTION_HEADING}>Thargoid Signals</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
              <li>Thargoid ({body.thargoidSignals}): {r ? formatCreditsRange(r.min, r.max) : '?'}</li>
            </ul>
          </div>
        );
      })()}

      {materials.length > 0 && (
        <div>
          <h3 className={SECTION_HEADING}>Materials</h3>
          <div className="space-y-2">
            {materialGroups.map((grp) => (
              <div key={grp.label}>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mb-1">{grp.label}</div>
                <div className="flex flex-wrap gap-1.5">
                  {grp.materials.map((mat) => {
                    const symbol = ELEMENT_SYMBOLS[mat.Name.toLowerCase()] || mat.Name.substring(0, 2);
                    const style = getElementStyle(symbol);
                    return (
                      <span
                        key={mat.Name}
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: style.backgroundColor, color: style.color }}
                        title={mat.Name}
                      >
                        {symbol} {mat.Percent.toFixed(1)}%
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rings.length > 0 && (
        <div>
          <h3 className={SECTION_HEADING}>Rings</h3>
          <div className="space-y-2">
            {rings.map((ring, index) => {
              const ringLetter = ring.Name.match(/\s([A-Z])\s+Ring$/)?.[1] || `#${index + 1}`;
              const ringType = formatRingClass(ring.RingClass);
              const ringIconPath = getRingImageFromType(ring.RingClass);
              return (
                <div key={ring.Name} className="card p-2">
                  <div className="flex items-center gap-2 mb-1">
                    <img src={ringIconPath} alt={ringType} className="w-5 h-5 object-contain" />
                    <span className="text-xs font-medium text-slate-900 dark:text-white">Ring {ringLetter}</span>
                    <span className="text-[10px] px-1 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
                      {ringType}
                    </span>
                  </div>
                  <dl className="grid grid-cols-3 gap-1 text-[10px]">
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Mass</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingMass(ring.MassMT)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Inner</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.InnerRad)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500 dark:text-slate-400">Outer</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.OuterRad)}</dd>
                    </div>
                  </dl>
                  {ring.Materials != null && ring.Materials.length > 0 && (
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1.5">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Materials:</span>{' '}
                      {ring.Materials.map((m) => `${m.Name} (${m.Count})`).join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
