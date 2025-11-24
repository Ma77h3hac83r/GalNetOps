/**
 * Parse system data from Elite Dangerous journal events
 * Handles FSSAllBodiesFound, Scan, FSSBodySignals, and other system-related events
 */

import type { SystemData, Star, Planet, Moon, Biological } from './systems-d1';

export interface ParsedSystemData {
  [systemName: string]: SystemData;
}

/**
 * Parse system data from journal file content
 * Returns a map of system names to their data
 */
export function parseSystemDataFromJournal(
  content: string,
  commanderName?: string
): ParsedSystemData {
  const lines = content.split('\n').filter(line => line.trim());
  const systems: ParsedSystemData = {};

  for (const line of lines) {
    try {
      const event = JSON.parse(line);

      // FSSAllBodiesFound - Complete system scan
      if (event.event === 'FSSAllBodiesFound') {
        const systemName = event.SystemName;
        if (!systemName) continue;

        if (!systems[systemName]) {
          systems[systemName] = {
            name: systemName,
            systemAddress: event.SystemAddress || 0,
            stars: [],
            planets: [],
            discoveredBy: commanderName,
            discoveredTimestamp: event.timestamp,
            lastUpdated: event.timestamp || new Date().toISOString(),
            bodies: [],
            biologicals: [],
          };
        }

        // Store body count
        if (event.Count) {
          systems[systemName].bodies = Array.from({ length: event.Count }, (_, i) => ({
            name: '',
            bodyID: i + 1,
            bodyType: 'Unknown',
          }));
        }
      }

      // FSSDiscoveryScan - Initial discovery
      if (event.event === 'FSSDiscoveryScan') {
        const systemName = event.SystemName;
        if (!systemName) continue;

        if (!systems[systemName]) {
          systems[systemName] = {
            name: systemName,
            systemAddress: event.SystemAddress || 0,
            stars: [],
            planets: [],
            discoveredBy: commanderName,
            discoveredTimestamp: event.timestamp,
            lastUpdated: event.timestamp || new Date().toISOString(),
            bodies: [],
            biologicals: [],
          };
        }
      }

      // Scan - Detailed body scan
      if (event.event === 'Scan') {
        const systemName = event.StarSystem;
        if (!systemName) continue;

        if (!systems[systemName]) {
          systems[systemName] = {
            name: systemName,
            systemAddress: event.SystemAddress || 0,
            stars: [],
            planets: [],
            discoveredBy: commanderName,
            discoveredTimestamp: event.timestamp,
            lastUpdated: event.timestamp || new Date().toISOString(),
            bodies: [],
            biologicals: [],
          };
        }

        const system = systems[systemName];
        system.lastUpdated = event.timestamp || system.lastUpdated;

        // Star data
        if (event.StarType) {
          const star: Star = {
            name: event.BodyName || event.StarSystem,
            type: event.StarType,
            stellarMass: event.StellarMass,
            radius: event.Radius,
            absoluteMagnitude: event.AbsoluteMagnitude,
            ageMY: event.Age_MY,
            surfaceTemperature: event.SurfaceTemperature,
            luminosity: event.Luminosity,
            isMainStar: event.BodyID === 0 || event.BodyID === 1,
          };
          system.stars.push(star);
        }

        // Planet data
        if (event.PlanetClass) {
          const planet: Planet = {
            name: event.BodyName,
            planetClass: event.PlanetClass,
            atmosphere: event.Atmosphere,
            atmosphereType: event.AtmosphereType,
            volcanism: event.Volcanism,
            massEM: event.MassEM,
            radius: event.Radius,
            surfaceGravity: event.SurfaceGravity,
            surfaceTemperature: event.SurfaceTemperature,
            surfacePressure: event.SurfacePressure,
            landable: event.Landable === true,
            terraformState: event.TerraformState,
            composition: event.Composition ? {
              ice: event.Composition.Ice,
              rock: event.Composition.Rock,
              metal: event.Composition.Metal,
            } : undefined,
            materials: event.Materials?.map((m: any) => ({
              name: m.Name,
              percent: m.Percent,
            })),
            parents: event.Parents?.map((p: any) => ({
              name: p.Name || p.Star || p.Planet,
              type: p.Type || 'Star',
            })),
          };

          // Check if it's a moon (has planet parent)
          const hasPlanetParent = event.Parents?.some((p: any) => p.Planet);
          if (hasPlanetParent) {
            // It's a moon, add to parent planet or create moon entry
            const moon: Moon = {
              name: event.BodyName,
              planetClass: event.PlanetClass,
              atmosphere: event.Atmosphere,
              atmosphereType: event.AtmosphereType,
              volcanism: event.Volcanism,
              massEM: event.MassEM,
              radius: event.Radius,
              surfaceGravity: event.SurfaceGravity,
              surfaceTemperature: event.SurfaceTemperature,
              landable: event.Landable === true,
              parents: event.Parents?.map((p: any) => ({
                name: p.Name || p.Star || p.Planet,
                type: p.Type || 'Planet',
              })),
            };

            // Find parent planet and add moon
            const parentPlanetName = event.Parents?.find((p: any) => p.Planet)?.Planet;
            if (parentPlanetName) {
              let parentPlanet = system.planets.find(p => p.name === parentPlanetName);
              if (!parentPlanet) {
                parentPlanet = {
                  name: parentPlanetName,
                  planetClass: 'Unknown',
                  moons: [],
                };
                system.planets.push(parentPlanet);
              }
              if (!parentPlanet.moons) parentPlanet.moons = [];
              parentPlanet.moons.push(moon);
            }
          } else {
            // Regular planet
            system.planets.push(planet);
          }
        }
      }

      // FSSBodySignals - Biological/geological signals
      if (event.event === 'FSSBodySignals') {
        const systemName = event.SystemName;
        if (!systemName || !systems[systemName]) continue;

        const system = systems[systemName];
        if (!system.biologicals) system.biologicals = [];

        if (event.BiologicalSignals) {
          event.BiologicalSignals.forEach((signal: any) => {
            system.biologicals!.push({
              name: signal.Type_Localised || signal.Type,
              bodyName: signal.BodyName,
              bodyID: signal.BodyID,
            });
          });
        }
      }

      // SAASignalsFound - Surface signals (biologicals, geologicals)
      if (event.event === 'SAASignalsFound') {
        const systemName = event.SystemName;
        if (!systemName || !systems[systemName]) continue;

        const system = systems[systemName];
        if (!system.biologicals) system.biologicals = [];

        if (event.Signals) {
          event.Signals.forEach((signal: any) => {
            if (signal.Type === 'Biological' || signal.Type === 'Geological') {
              system.biologicals!.push({
                name: signal.Type_Localised || signal.Type,
                bodyName: signal.BodyName,
                bodyID: signal.BodyID,
                latitude: signal.Latitude,
                longitude: signal.Longitude,
              });
            }
          });
        }
      }

      // CodexEntry - Biological discoveries
      if (event.event === 'CodexEntry') {
        const systemName = event.SystemName;
        if (!systemName || !systems[systemName]) continue;

        const system = systems[systemName];
        if (!system.biologicals) system.biologicals = [];

        system.biologicals.push({
          name: event.Name_Localised || event.Name,
          bodyName: event.BodyName,
          bodyID: event.BodyID,
          latitude: event.Latitude,
          longitude: event.Longitude,
        });
      }
    } catch (e) {
      // Skip invalid JSON lines
      continue;
    }
  }

  return systems;
}

