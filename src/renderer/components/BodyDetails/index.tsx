/**
 * Details panel for selected body: star/planet image, scan info, signals, biologicals; resizable width.
 * Planet Highlight: gold background when body matches criteria from Settings.
 */
import { calculateScanValue, NO_SCAN_VALUE_BODY_TYPES } from '@shared/scanValueFormulas';
import { planetClassToDisplay } from '@shared/normalization';
import { useAppStore } from '../../stores/appStore';
import { bodyMatchesPlanetHighlight } from '../../utils/planetHighlight';
import { useBodyDetailsData } from './useBodyDetailsData';
import { BodyDetailsStar } from './BodyDetailsStar';
import { BodyDetailsPlanetMoon } from './BodyDetailsPlanetMoon';
import { BodyDetailsBelt } from './BodyDetailsBelt';
import { ScanValueBreakdown } from './ScanValueBreakdown';
import {
  getStarImage,
  getPlanetImage,
  getBeltImageFromRings,
  formatStarClassFull,
} from './bodyDetailsUtils';

export function BodyDetails(): JSX.Element {
  const data = useBodyDetailsData();
  const {
    body,
    bodies,
    currentSystem,
    edsmSpoilerFree,
    rings,
    orbitalParams,
    materials,
    materialGroups,
    biologicals,
    loadingBio,
    genuses,
    estimatedGenera,
    starClassLetter,
    composition,
    atmosphereComposition,
    isOpen,
    togglePanel,
    detailsPanelWidth,
    handleResizeStart,
    formatNumber,
    formatCredits,
    formatCreditsRange,
  } = data;

  const planetHighlightCriteria = useAppStore((s) => s.planetHighlightCriteria);
  const isPlanetHighlighted = body ? bodyMatchesPlanetHighlight(body, planetHighlightCriteria) : false;

  if (!isOpen) {
    return (
      <button
        onClick={togglePanel}
        className="w-10 flex items-center justify-center bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
        title="Show Details"
      >
        <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    );
  }

  if (!body) {
    return (
      <aside
        className="relative flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto"
        style={{ width: detailsPanelWidth }}
      >
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-slate-300 dark:hover:bg-slate-600 z-10 shrink-0"
          onMouseDown={handleResizeStart}
          title="Drag to resize"
        />
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Details</h2>
            <button onClick={togglePanel} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-center py-8">Select a body to view details</p>
        </div>
      </aside>
    );
  }

  const isStar = body.bodyType === 'Star';
  const isPlanetOrMoon = body.bodyType === 'Planet' || body.bodyType === 'Moon';
  const isBelt = body.bodyType === 'Belt';
  const isScanned = body.scanType !== 'None';
  const showDetails = isScanned || !edsmSpoilerFree;

  return (
    <aside
      className="relative flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 overflow-y-auto"
      style={{ width: detailsPanelWidth }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-slate-300 dark:hover:bg-slate-600 z-10 shrink-0"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white truncate">{body.name}</h2>
          <button
            onClick={togglePanel}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex-shrink-0"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div
          className={`flex items-center gap-4 mb-6 p-3 rounded-lg ${
            isPlanetHighlighted ? 'ring-2 ring-valuable/80 bg-valuable/20 dark:bg-valuable/15' : ''
          }`}
        >
          <div className="w-16 h-16 flex-shrink-0">
            {body.bodyType === 'Star' ? (
              <img
                src={showDetails ? getStarImage(body.subType) : 'stars/star_G.png'}
                alt={body.subType ?? 'Star'}
                className="w-full h-full object-contain"
              />
            ) : body.bodyType === 'Belt' ? (
              <img
                src={showDetails ? getBeltImageFromRings(rings) : 'other/asteroidbelt.png'}
                alt="Asteroid Belt"
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={showDetails ? getPlanetImage(body.subType) : 'planets/planet_RB.png'}
                alt={body.subType ?? 'Planet'}
                className="w-full h-full object-contain"
              />
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900 dark:text-white">
              {showDetails ? (isStar ? formatStarClassFull(body.subType) : (planetClassToDisplay(body.subType) || body.bodyType)) : body.bodyType}
            </p>
            {showDetails && (() => {
              let value = 0;
              if (body.scanValue > 0) {
                value = body.scanValue;
              } else if (!NO_SCAN_VALUE_BODY_TYPES.includes(body.bodyType as 'Belt' | 'Ring')) {
                const result = calculateScanValue({
                  subType: body.subType ?? '',
                  terraformable: body.terraformable ?? false,
                  wasDiscovered: body.wasDiscovered ?? true,
                  wasMapped: body.wasMapped ?? true,
                  isMapped: body.scanType === 'Mapped',
                });
                value = result.finalValue;
              }
              return value > 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  {body.scanValue > 0 ? 'Value' : 'Est. Value'}: {formatCredits(value)}
                </p>
              ) : null;
            })()}
            {showDetails && (body.discoveredByMe || body.mappedByMe || body.footfalledByMe) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {body.discoveredByMe && (
                  <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                    First Discovered
                  </span>
                )}
                {body.mappedByMe && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                    First Mapped
                  </span>
                )}
                {body.footfalledByMe && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                    First Footfall
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {!showDetails ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Scan this body to reveal details</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Spoiler-free mode is enabled</p>
          </div>
        ) : (
          <>
            {isStar && (
              <BodyDetailsStar body={body} rings={rings} orbitalParams={orbitalParams} formatNumber={formatNumber} />
            )}
            {isPlanetOrMoon && (
              <BodyDetailsPlanetMoon
                body={body}
                rings={rings}
                orbitalParams={orbitalParams}
                composition={composition}
                atmosphereComposition={atmosphereComposition}
                materials={materials}
                materialGroups={materialGroups}
                biologicals={biologicals}
                loadingBio={loadingBio}
                genuses={genuses}
                estimatedGenera={estimatedGenera}
                starClassLetter={starClassLetter}
                currentSystem={currentSystem}
                bodies={bodies}
                formatNumber={formatNumber}
                formatCredits={formatCredits}
                formatCreditsRange={formatCreditsRange}
              />
            )}
            {isBelt && <BodyDetailsBelt body={body} rings={rings} />}
            <ScanValueBreakdown body={body} formatCredits={formatCredits} />
          </>
        )}

      </div>
    </aside>
  );
}
