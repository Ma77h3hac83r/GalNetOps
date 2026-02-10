/**
 * Biological signals section: FSS estimates, DSS confirmed, Genetic scanned, and mismatch report.
 */
import type { Biological } from '@shared/types';
import type { CelestialBody } from '@shared/types';
import { getGenusValueRange, getSpeciesValue, getGenusSampleDistance } from '@shared/exobiologyScanValues';
import { formatScannedSpecies, normalizeVariantForComparison } from '@shared/exobiologyEstimator';

interface EstimateGenus {
  genus: string;
  valueMin: number;
  valueMax: number;
  possible: Array<{ species: string; fullLabel: string; variantColor?: string }>;
}

interface BodyDetailsBiologicalsProps {
  body: CelestialBody;
  bodies: CelestialBody[];
  currentSystem: { name: string } | null;
  biologicals: Biological[];
  loadingBio: boolean;
  genuses: string[];
  estimatedGenera: EstimateGenus[];
  starClassLetter: string;
  formatCredits: (value: number) => string;
  formatCreditsRange: (min: number, max: number) => string;
}

function buildMismatchReportUrl(
  body: CelestialBody,
  bodies: CelestialBody[],
  currentSystem: { name: string } | null,
  genuses: string[],
  estimatedGenera: EstimateGenus[],
  biologicalsList: Biological[],
  starClassLetter: string
): string {
  const sysName = currentSystem?.name ?? 'Unknown';
  const title = encodeURIComponent('Exobiology estimator mismatch');
  const charBlock = body
    ? `\n**Characteristics** (in case system not yet in EDSM):\n` +
      `- Main Star Class: ${starClassLetter || 'N/A'}\n` +
      `- Body Type: ${body.subType ?? 'N/A'}\n` +
      `- Body Distance from Main Star: ${body.distanceLS != null ? `${body.distanceLS} Ls` : 'N/A'}\n` +
      `- Planet Types in System: ${[...new Set(bodies.filter((b) => b.subType).map((b) => b.subType))].join(', ') || 'N/A'}\n` +
      `- Gravity: ${body.gravity != null ? `${body.gravity}g` : 'N/A'}\n` +
      `- Temperature: ${body.temperature != null ? `${Math.round(body.temperature)} K` : 'N/A'}\n` +
      `- Atmosphere: ${body.atmosphereType ?? 'N/A'}\n` +
      `- Volcanism: ${body.volcanism ?? 'N/A'}\n`
    : '';

  // Identify only the scanned species that mismatch with estimates
  const mismatchedBios = biologicalsList.filter((bio) => {
    if (bio.scanProgress < 1) return false;
    const eg = estimatedGenera.find((e) => e.genus === bio.genus);
    if (!eg) return true; // genus not estimated
    const shortSpecies = bio.species.startsWith(bio.genus + ' ') ? bio.species.slice(bio.genus.length + 1) : bio.species;
    const possible = eg.possible.find((p) => p.species === shortSpecies || bio.species.endsWith(' ' + p.species));
    if (!possible) return true; // species not estimated
    if (!possible.variantColor) return false;
    const foundNorm = normalizeVariantForComparison(bio.variant);
    const estimatedList = possible.variantColor.split(',').map((v) => v.trim().toLowerCase());
    return foundNorm !== '' && !estimatedList.some((e) => e === foundNorm); // variant mismatch
  });
  const mismatchedGenusSet = new Set(mismatchedBios.map((b) => b.genus));

  // FSS: only estimated species from mismatched genera
  const estimatedFssSpecies =
    estimatedGenera
      .filter((eg) => mismatchedGenusSet.has(eg.genus))
      .flatMap((eg) => eg.possible.map((p) => p.fullLabel))
      .join(', ') ||
    (mismatchedBios.length > 0 ? 'Not estimated' : 'None');

  // DSS: only mismatched genera
  const estimatedDssSpecies =
    genuses.length > 0
      ? genuses
          .filter((g) => mismatchedGenusSet.has(g))
          .map((g) => {
            const eg = estimatedGenera.find((e) => e.genus === g);
            if (!eg) return `Confirmed ${g} - Unknown`;
            const possibleParts = eg.possible.flatMap((p) =>
              p.variantColor ? p.variantColor.split(',').map((v) => `${p.species} - ${v.trim()}`) : [p.species]
            );
            return `Confirmed ${g} - Possible ${possibleParts.join(', ')}`;
          })
          .join('; ') || 'N/A (genus not in DSS)'
      : 'N/A (no DSS yet)';

  // Scanned: only mismatched species
  const scannedSpecies = mismatchedBios.map((b) => formatScannedSpecies(b.genus, b.species, b.variant)).join(', ') || 'None';

  const bodyText = encodeURIComponent(
    `**System:** ${sysName}\n` +
      `**Body:** ${body?.name ?? 'N/A'}\n` +
      `\n**Estimated FSS species:** ${estimatedFssSpecies}\n` +
      `**Estimated DSS species:** ${estimatedDssSpecies}\n` +
      `**Scanned Species:** ${scannedSpecies}\n` +
      charBlock +
      `\n\nPlease describe what you observed. This helps us improve the wiki-derived estimator data.`
  );
  return `https://github.com/Ma77h3hac83r/GalNetOps/issues/new?title=${title}&body=${bodyText}`;
}

export function BodyDetailsBiologicals({
  body,
  bodies,
  currentSystem,
  biologicals,
  loadingBio,
  genuses,
  estimatedGenera,
  starClassLetter,
  formatCredits,
  formatCreditsRange,
}: BodyDetailsBiologicalsProps): JSX.Element | null {
  if (body.bioSignals <= 0 && biologicals.length === 0 && genuses.length === 0) {
    return null;
  }

  const sectionHeading = 'text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2';

  if (loadingBio && body.bioSignals > 0) {
    return (
      <div>
        <h3 className={sectionHeading}>Biological Signals</h3>
        <div className="space-y-3 text-sm">
          <p className="text-slate-400">Loading species…</p>
        </div>
      </div>
    );
  }

  const allGenera = [...new Set([...genuses, ...biologicals.map((b) => b.genus).filter(Boolean)])];
  const generaOnly = allGenera.filter((g) => !biologicals.some((b) => b.genus === g));
  const scanLabel = (p: number) => (p >= 3 ? 'Complete' : `Scan ${p}/3`);
  const byKey = new Map<string, Biological>();
  for (const bio of biologicals) {
    const key = `${bio.genus}|${bio.species}|${bio.variant ?? ''}`;
    const ex = byKey.get(key);
    if (!ex || bio.scanProgress > ex.scanProgress) byKey.set(key, bio);
  }
  const biologicalsList = Array.from(byKey.values());
  const hasDss = genuses.length > 0;
  const hasGenetic = biologicalsList.length > 0;
  const hasFssOnly = (body.bioSignals ?? 0) > 0 && !hasDss && !hasGenetic;
  const showFssEstimates = hasFssOnly && estimatedGenera.length > 0;

  const hasMismatch =
    biologicalsList.length > 0 &&
    biologicalsList.some((bio) => {
      if (bio.scanProgress < 1) return false;
      const eg = estimatedGenera.find((e) => e.genus === bio.genus);
      if (!eg) return true;
      const shortSpecies = bio.species.startsWith(bio.genus + ' ') ? bio.species.slice(bio.genus.length + 1) : bio.species;
      const possible = eg.possible.find((p) => p.species === shortSpecies || bio.species.endsWith(' ' + p.species));
      if (!possible) return true;
      if (!possible.variantColor) return false;
      const foundNorm = normalizeVariantForComparison(bio.variant);
      const estimatedList = possible.variantColor.split(',').map((v) => v.trim().toLowerCase());
      return foundNorm !== '' && !estimatedList.some((e) => e === foundNorm);
    });

  const estimatedGenusSet = new Set(estimatedGenera.map((e) => e.genus));
  const dssGenusSet = new Set(genuses);
  const differs =
    estimatedGenusSet.size !== dssGenusSet.size ||
    [...dssGenusSet].some((x) => !estimatedGenusSet.has(x)) ||
    [...estimatedGenusSet].some((x) => !dssGenusSet.has(x));

  return (
    <div>
      <h3 className={sectionHeading}>Biological Signals</h3>
      <div className="space-y-3 text-sm">
        <div className="space-y-3">
          {showFssEstimates && estimatedGenera.length > 0 && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                Potential species (FSS)
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                {estimatedGenera.map((eg) => {
                  const distance = getGenusSampleDistance(eg.genus);
                  const distanceStr = distance ? ` [${distance}m]` : '';
                  const fullLabels = eg.possible.map((p) => p.fullLabel).join(', ');
                  const valueStr =
                    eg.valueMin === eg.valueMax ? formatCredits(eg.valueMin) : `${formatCredits(eg.valueMin)} – ${formatCredits(eg.valueMax)}`;
                  return (
                    <li key={eg.genus}>
                      {fullLabels} ({valueStr}){distanceStr}
                    </li>
                  );
                })}
              </ul>
              {hasFssOnly && (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">
                  DSS scan to confirm genera; genetic scan for type &amp; color.
                </p>
              )}
            </div>
          )}
          {showFssEstimates && estimatedGenera.length === 0 && hasFssOnly && (
            <p className="italic text-slate-600 dark:text-slate-400">
              Biological ({body.bioSignals}): Surface scan to reveal genera and value range.
            </p>
          )}

          {generaOnly.length > 0 && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                Confirmed (DSS)
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                {generaOnly.flatMap((g) => {
                  const distance = getGenusSampleDistance(g);
                  const distanceStr = distance ? ` [${distance}m]` : '';
                  const eg = estimatedGenera.find((e) => e.genus === g);
                  if (eg) {
                    return eg.possible.map((p) => (
                      <li
                        key={`${g}-${p.species}`}
                      >
                        {`${eg.genus} ${p.species}`} confirmed – Estimated {p.variantColor || 'Unknown'} (
                        {eg.valueMin === eg.valueMax ? formatCredits(eg.valueMin) : `${formatCredits(eg.valueMin)} – ${formatCredits(eg.valueMax)}`}
                        ){distanceStr}
                      </li>
                    ));
                  }
                  const r = getGenusValueRange(g);
                  return [
                    <li key={g}>
                      {g} confirmed – Unknown type &amp; color ({r ? formatCreditsRange(r.min, r.max) : '?'}){distanceStr}
                    </li>,
                  ];
                })}
              </ul>
              {differs ? (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                  FSS estimate differs from DSS scan. Conduct a genetic scan to verify and help improve our database.
                </p>
              ) : (
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 italic">Genetic scan to confirm type &amp; color.</p>
              )}
            </div>
          )}

          {biologicalsList.length > 0 && (
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                Scanned (Genetic)
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 dark:text-slate-300">
                {biologicalsList.map((bio) => {
                  const val = bio.value > 0 ? bio.value : (getSpeciesValue(bio.species) ?? 0);
                  const distance = getGenusSampleDistance(bio.genus);
                  const distanceStr = distance ? ` [${distance}m]` : '';
                  const variantShort =
                    bio.variant && (bio.variant.includes(' – ') || bio.variant.includes(' - '))
                      ? bio.variant.split(/ – | - /).pop() ?? ''
                      : bio.variant;
                  const isComplete = bio.scanProgress >= 3;
                  const key = `${bio.genus}|${bio.species}|${bio.variant ?? ''}`;
                  return (
                    <li
                      key={key}
                      className={
                        isComplete ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded py-0.5 pr-1 -mr-1' : ''
                      }
                    >
                      {bio.species}
                      {variantShort ? ` – ${variantShort} – ` : ' – '}
                      {scanLabel(bio.scanProgress)} ({formatCredits(val)}){distanceStr}
                    </li>
                  );
                })}
              </ul>
              {hasMismatch && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-medium flex items-center gap-2 flex-wrap">
                  <span>Genetic scan differs from estimate.</span>
                  <button
                    type="button"
                    onClick={() =>
                      window.electron.openExternal(
                        buildMismatchReportUrl(body, bodies, currentSystem, genuses, estimatedGenera, biologicalsList, starClassLetter)
                      )
                    }
                    className="underline hover:no-underline focus:outline-none"
                  >
                    Submit feedback report
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
