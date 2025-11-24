import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '../../../lib/session';
import { getUserById, updateUser } from '../../../lib/users';
import { parseJournalFile } from '../../../lib/journal-parser';
import { parseSystemDataFromJournal } from '../../../lib/journal-system-parser';
import { storeSystem } from '../../../lib/systems-kv';

export const POST: APIRoute = async (context) => {
  const session = getSessionFromRequest(context);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await getUserById(session.userId, context);
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const formData = await context.request.formData();
    const files = formData.getAll('journal-files') as File[];

    if (files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process all journal files and merge data
    let mergedData: ReturnType<typeof parseJournalFile> = {};
    let latestTimestamp = '';
    const allSystemData: { [key: string]: any } = {};

    for (const file of files) {
      // Validate file type
      if (!file.name.endsWith('.log') && !file.name.endsWith('.txt')) {
        continue; // Skip invalid files
      }

      // Read file content
      const content = await file.text();
      
      // Parse journal file for commander data
      const journalData = parseJournalFile(content);
      
      // Parse system data from journal
      const systemData = parseSystemDataFromJournal(content, user.commanderName || user.username);
      
      // Merge system data (keep most complete data for each system)
      for (const [systemName, system] of Object.entries(systemData)) {
        if (!allSystemData[systemName] || 
            (system.stars?.length || 0) + (system.planets?.length || 0) > 
            (allSystemData[systemName].stars?.length || 0) + (allSystemData[systemName].planets?.length || 0)) {
          allSystemData[systemName] = system;
        } else {
          // Merge data from both
          const existing = allSystemData[systemName];
          if (system.stars && system.stars.length > 0) {
            existing.stars = [...(existing.stars || []), ...system.stars];
          }
          if (system.planets && system.planets.length > 0) {
            existing.planets = [...(existing.planets || []), ...system.planets];
          }
          if (system.biologicals && system.biologicals.length > 0) {
            existing.biologicals = [...(existing.biologicals || []), ...system.biologicals];
          }
          if (system.lastUpdated > existing.lastUpdated) {
            existing.lastUpdated = system.lastUpdated;
          }
        }
      }

      // Merge data (prioritize non-empty values)
      if (journalData.commanderName && !mergedData.commanderName) {
        mergedData.commanderName = journalData.commanderName;
      }
      if (journalData.credits !== undefined && mergedData.credits === undefined) {
        mergedData.credits = journalData.credits;
      }
      if (journalData.debt !== undefined && mergedData.debt === undefined) {
        mergedData.debt = journalData.debt;
      }
      if (journalData.currentSystem && !mergedData.currentSystem) {
        mergedData.currentSystem = journalData.currentSystem;
      }
      if (journalData.currentStation && !mergedData.currentStation) {
        mergedData.currentStation = journalData.currentStation;
      }
      if (journalData.currentBody && !mergedData.currentBody) {
        mergedData.currentBody = journalData.currentBody;
      }
      if (journalData.shipName && !mergedData.shipName) {
        mergedData.shipName = journalData.shipName;
      }
      if (journalData.shipType && !mergedData.shipType) {
        mergedData.shipType = journalData.shipType;
      }
      if (journalData.shipIdent && !mergedData.shipIdent) {
        mergedData.shipIdent = journalData.shipIdent;
      }

      // Merge ranks (take highest values)
      if (journalData.ranks) {
        if (!mergedData.ranks) mergedData.ranks = {};
        Object.keys(journalData.ranks).forEach(key => {
          const rankKey = key as keyof typeof journalData.ranks;
          if (journalData.ranks![rankKey] !== undefined) {
            const current = mergedData.ranks![rankKey] || -1;
            const newValue = journalData.ranks![rankKey]!;
            if (newValue > current) {
              mergedData.ranks![rankKey] = newValue;
            }
          }
        });
      }

      // Merge rank progress (take highest values)
      if (journalData.rankProgress) {
        if (!mergedData.rankProgress) mergedData.rankProgress = {};
        Object.keys(journalData.rankProgress).forEach(key => {
          const progressKey = key as keyof typeof journalData.rankProgress;
          if (journalData.rankProgress![progressKey] !== undefined) {
            const current = mergedData.rankProgress![progressKey] || -1;
            const newValue = journalData.rankProgress![progressKey]!;
            if (newValue > current) {
              mergedData.rankProgress![progressKey] = newValue;
            }
          }
        });
      }

      // Track latest timestamp
      if (journalData.lastEventTimestamp && journalData.lastEventTimestamp > latestTimestamp) {
        latestTimestamp = journalData.lastEventTimestamp;
      }
    }

    // Update user profile with journal data
    const updatedProfile = {
      ...user.profile,
      credits: mergedData.credits ?? user.profile?.credits,
      debt: mergedData.debt ?? user.profile?.debt,
      lastSystem: mergedData.currentSystem ?? user.profile?.lastSystem,
      lastStarport: mergedData.currentStation ?? user.profile?.lastStarport,
      currentBody: mergedData.currentBody ?? user.profile?.currentBody,
      shipName: mergedData.shipName ?? user.profile?.shipName,
      shipType: mergedData.shipType ?? user.profile?.shipType,
      shipIdent: mergedData.shipIdent ?? user.profile?.shipIdent,
      ranks: mergedData.ranks ?? user.profile?.ranks,
      rankProgress: mergedData.rankProgress ?? user.profile?.rankProgress,
      journalLastUpdated: new Date().toISOString(),
    };

    // Update commander name if found in journal and not already set
    const updates: any = {
      profile: updatedProfile,
    };
    
    if (mergedData.commanderName && !user.commanderName) {
      updates.commanderName = mergedData.commanderName;
    }

    const updated = await updateUser(user.id, updates, context);

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Store system data
    let systemsStored = 0;
    for (const system of Object.values(allSystemData)) {
      const stored = await storeSystem(system, context);
      if (stored) systemsStored++;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${files.length} journal file(s)`,
      data: {
        commanderName: mergedData.commanderName,
        credits: mergedData.credits,
        system: mergedData.currentSystem,
        station: mergedData.currentStation,
        ship: mergedData.shipName,
        ranks: mergedData.ranks,
        systemsStored,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing journal files:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process journal files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

