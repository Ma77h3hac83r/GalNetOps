/**
 * Star-specific details section: properties, orbital params, rings.
 */
import type { CelestialBody } from '@shared/types';
import type { Ring, OrbitalParams } from './bodyDetailsTypes';
import {
  formatSemiMajorAxis,
  formatDegrees,
  formatPeriod,
  formatAxialTilt,
  formatSolarRadius,
  formatRingClass,
  formatRingMass,
  formatRingRadius,
  getBeltImageFromRings,
  getRingImageFromType,
} from './bodyDetailsUtils';

const SECTION_HEADING = 'text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2';
const SECTION_DIVIDER = '[&>*+*]:pt-4 [&>*+*]:mt-4';

interface BodyDetailsStarProps {
  body: CelestialBody;
  rings: Ring[];
  orbitalParams: OrbitalParams | null;
  formatNumber: (num: number | null | undefined) => string;
}

export function BodyDetailsStar({ body, rings, orbitalParams, formatNumber }: BodyDetailsStarProps): JSX.Element {
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
              <dt className="text-slate-600 dark:text-slate-400">Solar Mass</dt>
              <dd className="text-slate-900 dark:text-white">{(Number(body.mass) || 0).toFixed(4)} SM</dd>
            </div>
          )}
          {body.radius != null && (
            <div className="flex justify-between text-sm">
              <dt className="text-slate-600 dark:text-slate-400">Solar Radius</dt>
              <dd className="text-slate-900 dark:text-white">{formatSolarRadius(Number(body.radius) || 0)}</dd>
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
        </dl>
      </div>

      {orbitalParams && (
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
                <dd className="text-slate-900 dark:text-white">{formatPeriod(orbitalParams.OrbitalPeriod)}</dd>
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
        </div>
      )}

      {rings.length > 0 && (
        <div>
          <h3 className={SECTION_HEADING}>Rings</h3>
          <div className="space-y-3">
            {rings.map((ring, index) => {
              const ringLetter = ring.Name.match(/\s([A-Z])\s+(Ring|Belt)$/)?.[1] || `#${index + 1}`;
              const ringType = formatRingClass(ring.RingClass);
              const isBeltType = ring.Name.includes('Belt');
              const ringIconPath = isBeltType ? getBeltImageFromRings([ring]) : getRingImageFromType(ring.RingClass);
              return (
                <div key={ring.Name} className="card p-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={ringIconPath} alt={ringType} className="w-6 h-6 object-contain" />
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {ringLetter} {isBeltType ? 'Belt' : 'Ring'}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                      {ringType}
                    </span>
                  </div>
                  <dl className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">Mass</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingMass(ring.MassMT)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">Inner Radius</dt>
                      <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.InnerRad)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500 dark:text-slate-400">Outer Radius</dt>
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
