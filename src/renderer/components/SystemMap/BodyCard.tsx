/**
 * Single body card: icon, label, traits, signals, scan status, value.
 * Planet Highlight: gold square background when body matches criteria from Settings.
 */
import type { CelestialBody } from '@shared/types';
import { useAppStore } from '../../stores/appStore';
import { bodyMatchesPlanetHighlight } from '../../utils/planetHighlight';
import { hasRings, getStarImage, getBeltImage, getPlanetImage, getRingImage } from './imageUtils';
import { calculateMassBasedSize } from './sizeUtils';
import { parseBodySignals, formatNumber } from './bodySignals';
import { getShortName, formatStarClass, formatPlanetClass } from './labelUtils';

export interface BodyCardProps {
  body: CelestialBody;
  isSelected: boolean;
  onClick: () => void;
  iconScale?: number;
  textScale?: number;
  isMoon?: boolean;
  systemName?: string;
  maxStarMass?: number;
  maxPlanetMass?: number;
}

function InfoLine({
  items,
  separator = '·',
}: {
  items: Array<{ label: string; color: string; title: string; highlight?: boolean }>;
  separator?: string;
}) {
  return (
    <span className="whitespace-nowrap">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && (
            <span className="text-slate-400 dark:text-slate-500 mx-0.5">{separator}</span>
          )}
          {item.highlight ? (
            <span
              className="rounded px-1 py-0.5 font-medium text-white"
              style={{ backgroundColor: item.color }}
              title={item.title}
            >
              {item.label}
            </span>
          ) : (
            <span style={{ color: item.color }} title={item.title}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export function BodyCard({
  body,
  isSelected,
  onClick,
  iconScale = 1,
  textScale = 1,
  isMoon = false,
  systemName = '',
  maxStarMass = 1,
  maxPlanetMass = 1,
}: BodyCardProps) {
  const isStar = body.bodyType === 'Star';
  const isBelt = body.bodyType === 'Belt';
  const bodyHasRings = hasRings(body);
  const imagePath = isStar
    ? getStarImage(body.subType)
    : isBelt
      ? getBeltImage(body)
      : getPlanetImage(body.subType);
  const ringImagePath = bodyHasRings && !isStar && !isBelt ? getRingImage(body) : null;
  const massBasedSize = calculateMassBasedSize(body, maxStarMass, maxPlanetMass);
  const iconPx = Math.round(massBasedSize * iconScale);
  const baseTextSize = isMoon ? 8 : 9;
  const textPx = Math.round(baseTextSize * textScale);
  const labelPx = Math.round((isMoon ? 10 : 11) * textScale);
  const infoPx = Math.round((isMoon ? 7 : 8) * textScale);

  const bioSignalsHighlightThreshold = useAppStore((s) => s.bioSignalsHighlightThreshold);
  const planetHighlightCriteria = useAppStore((s) => s.planetHighlightCriteria);
  const isPlanetHighlighted = bodyMatchesPlanetHighlight(body, planetHighlightCriteria);

  const signals = parseBodySignals(body);

  // Colors match legend (tailwind.config.js): Purple FD/FM/FF, Pink S/M, Orange L, Sky A, Green T, Brown G, Teal B, Light Blue Hu, Dark Green Th, Dark Blue Ga
  const traits: Array<{ label: string; color: string; title: string }> = [];
  if (body.landable) traits.push({ label: 'L', color: '#f97316', title: 'Landable' });
  if (
    body.atmosphereType &&
    body.atmosphereType !== 'None' &&
    body.atmosphereType !== 'No atmosphere'
  ) {
    traits.push({
      label: 'A',
      color: '#38bdf8',
      title: `Atmosphere: ${body.atmosphereType}`,
    });
  }
  if (body.terraformable)
    traits.push({ label: 'T', color: '#22c55e', title: 'Terraformable' });


  const scanStatus: Array<{ label: string; color: string; title: string }> = [];
  if (body.discoveredByMe)
    scanStatus.push({ label: 'FD', color: '#a855f7', title: 'First Discovered' });
  if (body.mappedByMe)
    scanStatus.push({ label: 'FM', color: '#a855f7', title: 'First Mapped' });
  else if (body.scanType === 'Mapped')
    scanStatus.push({ label: 'M', color: '#ec4899', title: 'DSS Mapped' });
  else if (body.scanType === 'Detailed')
    scanStatus.push({ label: 'S', color: '#ec4899', title: 'FSS Scanned' });
  if (body.footfalledByMe)
    scanStatus.push({ label: 'FF', color: '#a855f7', title: 'First Footfall' });

  // Line 2 below image: L/A/T • G/B
  const traitsAndGeoBio: Array<{ label: string; color: string; title: string; highlight?: boolean }> = [
    ...traits,
    ...(body.geoSignals > 0 ? [{ label: `G:${body.geoSignals}`, color: '#92400e', title: `${body.geoSignals} Geological` }] : []),
    ...(body.bioSignals > 0 ? [{
      label: `B:${body.bioSignals}`,
      color: '#14b8a6',
      title: `${body.bioSignals} Biological`,
      highlight: body.bioSignals >= bioSignalsHighlightThreshold,
    }] : []),
  ];

  // Line 3 below image: Hu/Th/Ga
  const specialSignals: Array<{ label: string; color: string; title: string }> = [];
  if (signals.human > 0) specialSignals.push({ label: `Hu:${signals.human}`, color: '#7dd3fc', title: `${signals.human} Human` });
  if (signals.thargoid > 0) specialSignals.push({ label: `Th:${signals.thargoid}`, color: '#14532d', title: `${signals.thargoid} Thargoid` });
  if (signals.guardian > 0) specialSignals.push({ label: `Ga:${signals.guardian}`, color: '#1e40af', title: `${signals.guardian} Guardian` });

  // Header: body designation • body type
  const bodyDesignation = isStar
    ? (body.bodyId === 0 ? 'A' : getShortName(body.name, systemName))
    : isBelt
      ? (getShortName(body.name, systemName).replace(/\s*Belt$/i, '') || 'Belt')
      : getShortName(body.name, systemName);
  const bodyTypeLabel = isStar
    ? formatStarClass(body.subType)
    : isBelt
      ? 'Belt'
      : formatPlanetClass(body.subType, body.bodyType === 'Moon');

  return (
    <div
      className={`
        flex flex-col items-center cursor-pointer transition-all p-1.5 rounded-lg text-center
        ${isSelected ? 'bg-accent-100 dark:bg-accent-900/40 ring-2 ring-accent-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'}
        ${isPlanetHighlighted ? 'ring-2 ring-valuable/80 bg-valuable/20 dark:bg-valuable/15' : ''}
      `}
      onClick={onClick}
    >
      {/* Above image: line 1 body number • body type, line 2 distance */}
      <div className="text-center min-w-0" style={{ fontSize: `${labelPx}px` }} title={body.name}>
        <div className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
          {bodyDesignation} · {bodyTypeLabel}
        </div>
        {body.distanceLS > 0 && (
          <div
            className="text-slate-500 dark:text-slate-400 font-medium"
            style={{ fontSize: `${infoPx}px` }}
          >
            {formatNumber(body.distanceLS)} ls
          </div>
        )}
      </div>

      <div
        className="relative flex items-center justify-center flex-shrink-0 my-0.5"
        style={{ width: `${iconPx}px`, height: `${iconPx}px` }}
      >
        {isBelt ? (
          <img
            src={imagePath}
            alt="Belt"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'other/asteroidbelt.png';
            }}
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={imagePath || 'planets/planet_RB.png'}
              alt={body.subType}
              className="w-full h-full object-contain relative z-10"
              onError={(e) => {
                (e.target as HTMLImageElement).src = isStar
                  ? 'stars/star_G.png'
                  : 'planets/planet_RB.png';
              }}
            />
            {ringImagePath && (
              <img
                src={ringImagePath}
                alt="rings"
                className="absolute inset-0 w-full h-full object-contain z-20 pointer-events-none"
                style={{ transform: 'rotate(-15deg) scale(1.8)' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'other/rings_rocky.png';
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Below image: line 1 FD/FM/M/S, line 2 L/A/T • G/B, line 3 Hu/Th/Ga */}
      <div className="flex flex-col items-center gap-0.5" style={{ fontSize: `${infoPx}px` }}>
        {scanStatus.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 font-medium">
            <InfoLine items={scanStatus} />
          </div>
        )}
        {traitsAndGeoBio.length > 0 && (
          <div className="flex items-center justify-center text-slate-600 dark:text-slate-300">
            <InfoLine items={traitsAndGeoBio} />
          </div>
        )}
        {specialSignals.length > 0 && (
          <div className="flex items-center justify-center text-slate-500 dark:text-slate-400">
            <InfoLine items={specialSignals} />
          </div>
        )}
      </div>
    </div>
  );
}
