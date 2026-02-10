/**
 * Hook that provides all derived data and handlers for BodyDetails panel.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSelectedBody, useAppStore, useCurrentSystem, useEdsmSpoilerFree, useBodies } from '../../stores/appStore';
import type { Biological } from '@shared/types';
import type { CelestialBody } from '@shared/types';
import { parseBiologicalArray } from '../../utils/boundarySchemas';
import { estimatePossibleGenera, computeSystemHas, parseStarClass } from '@shared/exobiologyEstimator';
import type { Ring, Material, Composition, AtmosphereComponent, OrbitalParams } from './bodyDetailsTypes';
import { getRaritySortKey, getRarityTier, RARITY_LABELS } from './bodyDetailsUtils';

function parseRingsFromRawJson(rawJson: string | null | undefined): Ring[] {
  if (!rawJson || rawJson === 'null' || rawJson === '') return [];
  try {
    const scanData = JSON.parse(rawJson);
    if (!scanData) return [];
    const rawRings = scanData.Rings || scanData.rings || [];
    return rawRings.map((ring: Record<string, unknown>) => {
      const innerRad = ring.InnerRad || ring.innerRad;
      const outerRad = ring.OuterRad || ring.outerRad;
      const innerRadKm = ring.innerRadius as number | undefined;
      const outerRadKm = ring.outerRadius as number | undefined;
      const rawMats = ring.Materials || ring.materials;
      const materials = Array.isArray(rawMats)
        ? rawMats.map((m: Record<string, unknown>) => ({
            Name: (m.Name || m.name || m.Type || m.type || '') as string,
            Count: ((m.Count ?? m.count) ?? 0) as number,
          }))
        : undefined;
      return {
        Name: (ring.Name || ring.name || '') as string,
        RingClass: (ring.RingClass || ring.ringClass || ring.type || '') as string,
        MassMT: (ring.MassMT || ring.massMT || ring.mass || 0) as number,
        InnerRad: (innerRad || (innerRadKm ? innerRadKm * 1000 : 0)) as number,
        OuterRad: (outerRad || (outerRadKm ? outerRadKm * 1000 : 0)) as number,
        Materials: materials?.length ? materials : undefined,
      };
    });
  } catch (e: unknown) {
    return [];
  }
}

function parseOrbitalFromRawJson(rawJson: string | null | undefined, semiMajorAxisFallback: number | undefined): OrbitalParams | null {
  if (rawJson && rawJson !== 'null' && rawJson !== '') {
    try {
      const scanData = JSON.parse(rawJson);
      if (!scanData) throw new Error('Empty scan data');
      const hasJournalData = scanData.SemiMajorAxis || scanData.OrbitalPeriod || scanData.RotationPeriod;
      const hasEdsmData = scanData.semiMajorAxis || scanData.orbitalPeriod || scanData.rotationalPeriod;
      if (hasJournalData || hasEdsmData) {
        const AU_TO_METERS = 149597870700;
        const DAYS_TO_SECONDS = 86400;
        const HOURS_TO_SECONDS = 3600;
        const DEG_TO_RAD = Math.PI / 180;
        return {
          SemiMajorAxis: scanData.SemiMajorAxis || (scanData.semiMajorAxis ? scanData.semiMajorAxis * AU_TO_METERS : undefined),
          Eccentricity: scanData.Eccentricity ?? scanData.orbitalEccentricity,
          OrbitalInclination: scanData.OrbitalInclination ?? scanData.orbitalInclination,
          OrbitalPeriod: scanData.OrbitalPeriod || (scanData.orbitalPeriod ? scanData.orbitalPeriod * DAYS_TO_SECONDS : undefined),
          RotationPeriod: scanData.RotationPeriod || (scanData.rotationalPeriod ? scanData.rotationalPeriod * HOURS_TO_SECONDS : undefined),
          AxialTilt: scanData.AxialTilt ?? (scanData.axialTilt !== undefined ? scanData.axialTilt * DEG_TO_RAD : undefined),
          TidalLock: scanData.TidalLock ?? scanData.rotationalPeriodTidallyLocked,
        };
      }
    } catch (e: unknown) {
      // fall through
    }
  }
  if (semiMajorAxisFallback != null) {
    return { SemiMajorAxis: semiMajorAxisFallback };
  }
  return null;
}

export function useBodyDetailsData() {
  const body = useSelectedBody();
  const bodies = useBodies();
  const currentSystem = useCurrentSystem();
  const edsmSpoilerFree = useEdsmSpoilerFree();
  const [biologicals, setBiologicals] = useState<Biological[]>([]);
  const [loadingBio, setLoadingBio] = useState(false);

  const rings = useMemo(() => parseRingsFromRawJson(body?.rawJson ?? null), [body?.rawJson]);

  const orbitalParams = useMemo(
    () => parseOrbitalFromRawJson(body?.rawJson ?? null, body?.semiMajorAxis ?? undefined),
    [body?.rawJson, body?.semiMajorAxis]
  );

  const genuses = useMemo(() => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return [];
    try {
      const d = JSON.parse(body.rawJson) as Record<string, unknown>;
      const g = d.Genuses ?? d.genuses;
      return Array.isArray(g) ? (g as unknown[]).filter((x): x is string => typeof x === 'string') : [];
    } catch (e: unknown) {
      return [];
    }
  }, [body?.rawJson]);

  const materials = useMemo((): Material[] => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return [];
    try {
      const scanData = JSON.parse(body.rawJson);
      if (!scanData) return [];
      const rawMaterials = scanData.Materials || scanData.materials || [];
      return rawMaterials
        .map((mat: Record<string, unknown>) => ({
          Name: (mat.Name || mat.name || '') as string,
          Percent: (mat.Percent || mat.percent || 0) as number,
        }))
        .sort((a: Material, b: Material) => {
          const ka = getRaritySortKey(a.Name);
          const kb = getRaritySortKey(b.Name);
          return ka !== kb ? ka - kb : b.Percent - a.Percent;
        });
    } catch (e: unknown) {
      return [];
    }
  }, [body?.rawJson]);

  const materialGroups = useMemo(() => {
    if (materials.length === 0) return [];
    const g: { label: string; materials: Material[] }[] = [];
    let curTier: number | null = null;
    let curMats: Material[] = [];
    for (const m of materials) {
      const t = getRarityTier(m.Name);
      const tier = t >= 0 ? t : 4;
      if (curTier !== null && curTier !== tier) {
        g.push({ label: RARITY_LABELS[curTier] ?? 'Other', materials: curMats });
        curMats = [];
      }
      curTier = tier;
      curMats.push(m);
    }
    if (curMats.length > 0 && curTier !== null) {
      g.push({ label: RARITY_LABELS[curTier] ?? 'Other', materials: curMats });
    }
    return g;
  }, [materials]);

  const { estimatedGenera, starClassLetter } = useMemo(() => {
    const empty = { estimatedGenera: [] as ReturnType<typeof estimatePossibleGenera>, starClassLetter: '' };
    if (!body) return empty;
    // Always run estimator when we have body + bodies so FSS estimates and mismatch reports are correct
    // even when bioSignals wasn't set (e.g. landed without FSS, or signals not yet in DB).
    let star: { subType?: string } | null = null;
    let current: CelestialBody | null = body;
    while (current?.parentId != null) {
      const parent = bodies.find((b) => b.bodyId === current!.parentId);
      if (!parent) break;
      if (parent.bodyType === 'Star') {
        star = parent;
        break;
      }
      current = parent;
    }
    if (!star) star = bodies.find((b) => b.bodyType === 'Star') || null;
    const starClassLetterVal = parseStarClass(star?.subType);
    const systemHas = computeSystemHas(bodies);
    const bodyMaterials = (() => {
      if (!body?.rawJson) return [];
      try {
        const scanData = JSON.parse(body.rawJson) as Record<string, unknown>;
        const raw = scanData.Materials ?? scanData.materials;
        if (!Array.isArray(raw)) return [];
        return raw
          .filter((m: unknown): m is Record<string, unknown> => m != null && typeof m === 'object')
          .map((m) => ({ Name: String(m.Name ?? m.name ?? '') }))
          .filter((m) => m.Name.length > 0);
      } catch (e: unknown) {
        return [];
      }
    })();
    let estimatedGeneraVal: ReturnType<typeof estimatePossibleGenera> = [];
    try {
      estimatedGeneraVal = estimatePossibleGenera({
        atmosphere: body.atmosphereType,
        tempK: body.temperature,
        gravityG: body.gravity,
        planetType: body.subType,
        volcanism: body.volcanism,
        distanceLS: body.distanceLS,
        starClassLetter: starClassLetterVal,
        systemHas,
        ...(bodyMaterials.length > 0 && { materials: bodyMaterials }),
      });
    } catch (e) {
      console.error('[BodyDetails] estimatePossibleGenera failed:', e);
    }
    return { estimatedGenera: estimatedGeneraVal, starClassLetter: starClassLetterVal };
  }, [body, bodies]);

  const composition = useMemo<Composition | null>(() => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return null;
    try {
      const scanData = JSON.parse(body.rawJson);
      if (!scanData) return null;
      const comp = scanData.Composition || scanData.composition;
      if (comp) {
        return {
          Ice: (comp.Ice ?? comp.ice ?? 0) as number,
          Rock: (comp.Rock ?? comp.rock ?? 0) as number,
          Metal: (comp.Metal ?? comp.metal ?? 0) as number,
        };
      }
      if (scanData.solidComposition) {
        return {
          Ice: (scanData.solidComposition.Ice ?? scanData.solidComposition.ice ?? 0) as number,
          Rock: (scanData.solidComposition.Rock ?? scanData.solidComposition.rock ?? 0) as number,
          Metal: (scanData.solidComposition.Metal ?? scanData.solidComposition.metal ?? 0) as number,
        };
      }
      return null;
    } catch (e: unknown) {
      return null;
    }
  }, [body?.rawJson]);

  const atmosphereComposition = useMemo<AtmosphereComponent[]>(() => {
    if (!body?.rawJson || body.rawJson === 'null' || body.rawJson === '') return [];
    try {
      const scanData = JSON.parse(body.rawJson);
      if (!scanData) return [];
      const rawAtmo = scanData.AtmosphereComposition || scanData.atmosphereComposition;
      if (!rawAtmo) return [];
      if (Array.isArray(rawAtmo)) {
        return rawAtmo
          .map((comp: Record<string, unknown>) => ({
            Name: (comp.Name || comp.name || '') as string,
            Percent: (comp.Percent || comp.percent || 0) as number,
          }))
          .sort((a: AtmosphereComponent, b: AtmosphereComponent) => b.Percent - a.Percent);
      }
      if (typeof rawAtmo === 'object') {
        return Object.entries(rawAtmo)
          .map(([name, percent]) => ({ Name: name, Percent: (percent as number) || 0 }))
          .sort((a, b) => b.Percent - a.Percent);
      }
      return [];
    } catch (e: unknown) {
      return [];
    }
  }, [body?.rawJson]);

  const fetchBiologicals = useCallback((bodyDbId: number) => {
    setLoadingBio(true);
    window.electron
      .getBodyBiologicals(bodyDbId)
      .then((raw) => setBiologicals(parseBiologicalArray(raw)))
      .catch((err: unknown) => {
        console.error('Failed to fetch biologicals:', err);
        setBiologicals([]);
      })
      .finally(() => setLoadingBio(false));
  }, []);

  useEffect(() => {
    if (!body) {
      setBiologicals([]);
      return;
    }
    if (body.id <= 0) {
      setBiologicals([]);
      return;
    }
    fetchBiologicals(body.id);
  }, [body?.id, fetchBiologicals]);

  useEffect(() => {
    const unsubscribe = window.electron.onBioScanned((bio: unknown) => {
      if (
        body?.id &&
        bio != null &&
        typeof bio === 'object' &&
        'bodyId' in bio &&
        typeof (bio as { bodyId: unknown }).bodyId === 'number' &&
        (bio as { bodyId: number }).bodyId === body.id
      ) {
        fetchBiologicals(body.id);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [body?.id, fetchBiologicals]);

  const isOpen = useAppStore((state) => state.detailsPanelOpen);
  const togglePanel = useAppStore((state) => state.toggleDetailsPanel);
  const detailsPanelWidth = useAppStore((state) => state.detailsPanelWidth);
  const setDetailsPanelWidth = useAppStore((state) => state.setDetailsPanelWidth);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = detailsPanelWidth;
      const onMove = (moveEvent: MouseEvent) => {
        const delta = startX - moveEvent.clientX;
        setDetailsPanelWidth(startWidth + delta);
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [detailsPanelWidth, setDetailsPanelWidth]
  );

  const formatNumber = useCallback((num: number | null | undefined): string => {
    if (num === null || num === undefined) return 'N/A';
    return num.toLocaleString();
  }, []);

  const formatCredits = useCallback((value: number): string => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M CR`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K CR`;
    return `${value} CR`;
  }, []);

  const formatCreditsRange = useCallback(
    (min: number, max: number): string => {
      if (min === max) return formatCredits(min);
      return `${formatCredits(min)} – ${formatCredits(max)}`;
    },
    [formatCredits]
  );

  return {
    body,
    bodies,
    currentSystem,
    edsmSpoilerFree,
    biologicals,
    loadingBio,
    rings,
    orbitalParams,
    genuses,
    materials,
    materialGroups,
    estimatedGenera,
    starClassLetter,
    composition,
    atmosphereComposition,
    fetchBiologicals,
    isOpen,
    togglePanel,
    detailsPanelWidth,
    setDetailsPanelWidth,
    handleResizeStart,
    formatNumber,
    formatCredits,
    formatCreditsRange,
  };
}
