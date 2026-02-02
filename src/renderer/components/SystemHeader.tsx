/** Explorer header: system name (copy), coords, EDSM status, discovered/mapped counts, Est. FSS/DSS/Current value, galactic region; includes SystemSearch and optional rightContent (e.g. zoom). */
import { useState, useMemo } from 'react';
import type { System } from '@shared/types';
import { useBodies, useEdsmState } from '../stores/appStore';
import SystemSearch from './SystemSearch';
import { findGalacticRegion } from '@shared/galacticRegions';
import { estimateFssValueForBody, estimateDssValueForBody, NO_SCAN_VALUE_BODY_TYPES } from '@shared/constants';

interface SystemHeaderProps {
  system: System | null;
  rightContent?: React.ReactNode;
}

function SystemHeader({ system, rightContent }: SystemHeaderProps) {
  const bodies = useBodies();
  const edsm = useEdsmState();
  const [copied, setCopied] = useState(false);
  
  const countableBodies = bodies.filter(b => b.bodyType === 'Star' || b.bodyType === 'Planet' || b.bodyType === 'Moon');
  const scannedCount = countableBodies.filter(b => b.scanType !== 'None').length;

  const mappableBodies = bodies.filter(b => b.bodyType === 'Planet' || b.bodyType === 'Moon');
  const mappedCount = mappableBodies.filter(b => b.scanType === 'Mapped').length;
  const mappableCount = mappableBodies.length;

  const valueSums = useMemo(() => {
    let current = 0;
    let estFss = 0;
    let estDss = 0;
    for (const body of bodies) {
      if (NO_SCAN_VALUE_BODY_TYPES.includes(body.bodyType as 'Belt' | 'Ring')) continue;
      current += body.scanValue || 0;
      estFss += estimateFssValueForBody({
        subType: body.subType || '',
        terraformable: body.terraformable,
        bodyType: body.bodyType,
      });
      estDss += estimateDssValueForBody({
        subType: body.subType || '',
        terraformable: body.terraformable,
        bodyType: body.bodyType,
      });
    }
    return { current, estFss, estDss };
  }, [bodies]);

  const effectiveBodyCount = system?.bodyCount ?? edsm.bodyCount;
  
  const galacticRegion = useMemo(() => {
    if (!system) return null;
    return findGalacticRegion(system.starPosX, system.starPosY, system.starPosZ);
  }, [system]);
  
  const handleCopySystemName = async () => {
    if (system?.name) {
      await navigator.clipboard.writeText(system.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatCredits = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M CR`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K CR`;
    }
    return `${value} CR`;
  };

  const formatCoords = (x: number, y: number, z: number): string => {
    return `${x.toFixed(2)} / ${y.toFixed(2)} / ${z.toFixed(2)}`;
  };

  if (!system) {
    return (
      <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center h-16">
          <p className="text-slate-400 dark:text-slate-500">
            Waiting for system data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Search, system info, stats */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Search bar on its own line */}
          <div className="mb-2">
            <SystemSearch />
          </div>

          {/* Row 2: System name with copy, galactic sector, coordinates */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySystemName}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title={copied ? 'Copied!' : 'Copy system name'}
            >
              {copied ? (
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {system.name}
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {galacticRegion?.name && (
              <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                {galacticRegion.name}
              </span>
            )}
            {galacticRegion?.name && (
              <span className="text-slate-300 dark:text-slate-600">•</span>
            )}
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatCoords(system.starPosX, system.starPosY, system.starPosZ)}
            </p>
            {/* EDSM Status Indicator */}
            {edsm.isLoading && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400">
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                EDSM
              </span>
            )}
            {!edsm.isLoading && edsm.isUnknown && (
              <span className="text-xs px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded">
                Unknown to EDSM
              </span>
            )}
            {!edsm.isLoading && !edsm.isUnknown && edsm.bodyCount !== null && !system.bodyCount && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                {edsm.bodyCount} bodies (EDSM)
              </span>
            )}
          </div>

          {/* Row 3: Discovered / Mapped / Est. FSS / Est. DSS / Current Value */}
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-3">
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">Discovered</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {scannedCount}
                {effectiveBodyCount && (
                  <span className="text-slate-400 dark:text-slate-500">/{effectiveBodyCount}</span>
                )}
              </div>
              {!system.bodyCount && edsm.bodyCount !== null && (
                <div className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">via EDSM</div>
              )}
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">Mapped</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {mappedCount}
                {mappableCount > 0 && (
                  <span className="text-slate-400 dark:text-slate-500">/{mappableCount}</span>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">Est. FSS Value</div>
              <div className="text-lg font-semibold text-slate-600 dark:text-slate-300">
                {formatCredits(valueSums.estFss)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">Est. DSS Value</div>
              <div className="text-lg font-semibold text-slate-700 dark:text-slate-200">
                {formatCredits(valueSums.estDss)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-slate-500 dark:text-slate-400">Current Value</div>
              <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                {formatCredits(valueSums.current)}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Zoom options and legend (from ExplorerView) */}
        {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      </div>
    </div>
  );
}

export default SystemHeader;
