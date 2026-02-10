/**
 * Asteroid belt details section.
 */
import type { CelestialBody } from '@shared/types';
import type { Ring } from './bodyDetailsTypes';
import { formatRingClass, formatRingMass, formatRingRadius, getBeltImageFromRings } from './bodyDetailsUtils';

const SECTION_HEADING = 'text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2';
const SECTION_DIVIDER = '[&>*+*]:pt-4 [&>*+*]:mt-4';

interface BodyDetailsBeltProps {
  body: CelestialBody;
  rings: Ring[];
}

export function BodyDetailsBelt({ body, rings }: BodyDetailsBeltProps): JSX.Element {
  if (rings.length > 0) {
    return (
      <div className={`space-y-0 ${SECTION_DIVIDER}`}>
        <div>
          <h3 className={SECTION_HEADING}>Properties</h3>
          {rings.map((ring, index) => {
            const ringType = formatRingClass(ring.RingClass);
            const beltIconPath = getBeltImageFromRings([ring]);
            return (
              <div key={ring.Name ?? index} className="card p-3">
                <div className="flex items-center gap-2 mb-3">
                  <img src={beltIconPath} alt={ringType} className="w-6 h-6 object-contain" />
                  <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                    {ringType}
                  </span>
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Mass</dt>
                    <dd className="text-slate-900 dark:text-white">{formatRingMass(ring.MassMT)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Inner Radius</dt>
                    <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.InnerRad)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-600 dark:text-slate-400">Outer Radius</dt>
                    <dd className="text-slate-900 dark:text-white">{formatRingRadius(ring.OuterRad)}</dd>
                  </div>
                </dl>
                {ring.Materials != null && ring.Materials.length > 0 && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Materials:</span>{' '}
                    {ring.Materials.map((m) => `${m.Name} (${m.Count})`).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-0 ${SECTION_DIVIDER}`}>
      <div>
        <h3 className={SECTION_HEADING}>Properties</h3>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Distance</dt>
            <dd className="text-slate-900 dark:text-white">{(Number(body?.distanceLS) || 0).toFixed(2)} ls</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
