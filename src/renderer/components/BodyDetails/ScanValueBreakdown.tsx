/**
 * Scan value formula breakdown section: shows FSS, FD, DSS, FM, DSS Efficiency with credit values.
 */
import type { CelestialBody } from '@shared/types';
import { getScanValueBreakdown, NO_SCAN_VALUE_BODY_TYPES } from '@shared/scanValueFormulas';
import { planetClassToDisplay } from '@shared/normalization';
import { formatStarClassFull } from './bodyDetailsUtils';

const SECTION_HEADING = 'text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2';

interface ScanValueBreakdownProps {
  body: CelestialBody;
  formatCredits: (value: number) => string;
}

export function ScanValueBreakdown({ body, formatCredits }: ScanValueBreakdownProps): JSX.Element | null {
  if (NO_SCAN_VALUE_BODY_TYPES.includes(body.bodyType as 'Belt' | 'Ring')) {
    return null;
  }

  const bodyTypeLabel =
    body.bodyType === 'Star'
      ? formatStarClassFull(body.subType)
      : planetClassToDisplay(body.subType ?? '') || body.bodyType;

  const breakdown = getScanValueBreakdown(
    body.subType ?? '',
    body.terraformable ?? false,
    body.bodyType,
    bodyTypeLabel
  );

  if (!breakdown) return null;

  const value = body.scanValue > 0
    ? body.scanValue
    : breakdown.total;

  return (
    <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-600">
      <h3 className={SECTION_HEADING}>Scan Value Formula</h3>
      <div className="text-sm space-y-2">
        <p className="text-slate-600 dark:text-slate-400 font-medium">{breakdown.formulaSummary}</p>
        <dl className="space-y-1.5 text-slate-700 dark:text-slate-300">
          {breakdown.lines.map((line) => (
            <div key={line.label}>
              <dt>
                <span className="font-medium">{line.label}:</span>{' '}
                {line.label === 'FSS' ? (
                  formatCredits(line.value)
                ) : (
                  <span className="text-slate-600 dark:text-slate-400">
                    {line.description} ({formatCredits(line.value)})
                  </span>
                )}
              </dt>
            </div>
          ))}
        </dl>
        <div className="flex justify-between pt-2 mt-2 border-t border-slate-200 dark:border-slate-600 font-medium">
          <span className="text-slate-700 dark:text-slate-300">
            {body.scanValue > 0 ? 'Value' : 'Est. Value (all bonuses)'}
          </span>
          <span className="text-slate-900 dark:text-white tabular-nums">{formatCredits(value)}</span>
        </div>
      </div>
    </div>
  );
}
