/**
 * Map database rows to domain types (System, CelestialBody, Biological, CodexEntry, RouteEntry).
 */
import type {
  System,
  CelestialBody,
  Biological,
  CodexEntry,
  RouteEntry,
  BodyType,
  ScanStatus,
} from '../../../shared/types';

export function rowToSystem(row: Record<string, unknown>): System {
  return {
    id: row.id as number,
    systemAddress: row.system_address as number,
    name: row.name as string,
    starPosX: row.star_pos_x as number,
    starPosY: row.star_pos_y as number,
    starPosZ: row.star_pos_z as number,
    firstVisited: row.first_visited as string,
    lastVisited: row.last_visited as string,
    bodyCount: row.body_count as number | null,
    discoveredCount: row.discovered_count as number,
    mappedCount: row.mapped_count as number,
    totalValue: row.total_value as number,
    estimatedFssValue: (row.estimated_fss_value as number) ?? 0,
    estimatedDssValue: (row.estimated_dss_value as number) ?? 0,
    allBodiesFound: Boolean(row.all_bodies_found),
  };
}

export function rowToBody(row: Record<string, unknown>): CelestialBody {
  return {
    id: row.id as number,
    systemId: row.system_id as number,
    bodyId: row.body_id as number,
    name: row.name as string,
    bodyType: row.body_type as BodyType,
    subType: row.sub_type as string,
    distanceLS: row.distance_ls as number,
    mass: row.mass as number | null,
    radius: row.radius as number | null,
    gravity: row.gravity as number | null,
    temperature: row.temperature as number | null,
    atmosphereType: row.atmosphere_type as string | null,
    volcanism: row.volcanism as string | null,
    landable: Boolean(row.landable),
    terraformable: Boolean(row.terraformable),
    wasDiscovered: Boolean(row.was_discovered),
    wasMapped: Boolean(row.was_mapped),
    wasFootfalled: Boolean(row.was_footfalled),
    discoveredByMe: Boolean(row.discovered_by_me),
    mappedByMe: Boolean(row.mapped_by_me),
    footfalledByMe: Boolean(row.footfalled_by_me),
    scanType: row.scan_type as ScanStatus,
    scanValue: row.scan_value as number,
    bioSignals: row.bio_signals as number,
    geoSignals: row.geo_signals as number,
    humanSignals: (row.human_signals as number) ?? 0,
    thargoidSignals: (row.thargoid_signals as number) ?? 0,
    parentId: row.parent_id as number | null,
    semiMajorAxis: row.semi_major_axis as number | null,
    rawJson: row.raw_json as string,
  };
}

export function rowToBiological(row: Record<string, unknown>): Biological {
  return {
    id: row.id as number,
    bodyId: row.body_id as number,
    genus: row.genus as string,
    species: row.species as string,
    variant: row.variant as string | null,
    value: row.value as number,
    scanned: Boolean(row.scanned),
    scanProgress: row.scan_progress as number,
  };
}

export function rowToCodexEntry(row: Record<string, unknown>): CodexEntry {
  return {
    id: row.id as number,
    entryId: row.entry_id as number,
    name: row.name as string,
    category: row.category as string,
    subcategory: row.subcategory as string,
    region: row.region as string,
    systemName: row.system_name as string,
    systemAddress: row.system_address as number,
    bodyId: row.body_id as number | null,
    isNewEntry: Boolean(row.is_new_entry),
    newTraitsDiscovered: Boolean(row.new_traits_discovered),
    voucherAmount: row.voucher_amount as number,
    timestamp: row.timestamp as string,
  };
}

export function rowToRouteEntry(row: Record<string, unknown>): RouteEntry {
  return {
    id: row.id as number,
    systemId: row.system_id as number,
    systemName: row.system_name as string,
    timestamp: row.timestamp as string,
    jumpDistance: row.jump_distance as number,
    fuelUsed: row.fuel_used as number,
    sessionId: row.session_id as string,
    starPosX: row.star_pos_x as number,
    starPosY: row.star_pos_y as number,
    starPosZ: row.star_pos_z as number,
    primaryStarType: (row.primary_star_type as string) ?? null,
    bodyCount: row.body_count != null ? (row.body_count as number) : null,
    firstDiscovered: (row.first_discovered as number) ?? 0,
    totalValue: (row.total_value as number) ?? 0,
    estimatedFssValue: (row.estimated_fss_value as number) ?? 0,
    estimatedDssValue: (row.estimated_dss_value as number) ?? 0,
    highValueBodies: {
      elw: (row.elw_count as number) ?? 0,
      ww: (row.ww_count as number) ?? 0,
      tww: (row.tww_count as number) ?? 0,
      ammonia: (row.ammonia_count as number) ?? 0,
      hmc: (row.hmc_count as number) ?? 0,
      thmc: (row.thmc_count as number) ?? 0,
      metalRich: (row.metal_rich_count as number) ?? 0,
      trocky: (row.trocky_count as number) ?? 0,
    },
  };
}
