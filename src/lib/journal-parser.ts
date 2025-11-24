/**
 * Elite Dangerous Journal File Parser
 * 
 * Journal files are JSONL format (JSON Lines) where each line is a JSON object
 * representing an in-game event.
 */

export interface JournalData {
  commanderName?: string;
  credits?: number;
  debt?: number;
  currentSystem?: string;
  currentStation?: string;
  currentBody?: string;
  shipName?: string;
  shipType?: string;
  shipIdent?: string;
  ranks?: {
    combat?: number;
    trade?: number;
    explorer?: number;
    cqc?: number;
    empire?: number;
    federation?: number;
  };
  rankProgress?: {
    combat?: number;
    trade?: number;
    explorer?: number;
    cqc?: number;
    empire?: number;
    federation?: number;
  };
  lastEventTimestamp?: string;
}

/**
 * Parse a journal file (JSONL format) and extract relevant commander data
 */
export function parseJournalFile(content: string): JournalData {
  const lines = content.split('\n').filter(line => line.trim());
  const data: JournalData = {};

  // Process lines in reverse to get the most recent data
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const event = JSON.parse(lines[i]);
      
      // Extract commander name and credits from LoadGame event
      if (event.event === 'LoadGame') {
        if (event.Commander && !data.commanderName) {
          data.commanderName = event.Commander;
        }
        if (event.Credits !== undefined && data.credits === undefined) {
          data.credits = event.Credits;
        }
        if (event.Loan !== undefined && data.debt === undefined) {
          data.debt = event.Loan;
        }
        if (event.Ship && !data.shipType) {
          data.shipType = event.Ship;
        }
        if (event.ShipName && !data.shipName) {
          data.shipName = event.ShipName;
        }
        if (event.ShipIdent && !data.shipIdent) {
          data.shipIdent = event.ShipIdent;
        }
      }

      // Extract location from Location or FSDJump events
      if (event.event === 'Location' || event.event === 'FSDJump') {
        if (event.StarSystem && !data.currentSystem) {
          data.currentSystem = event.StarSystem;
        }
        if (event.StationName && !data.currentStation) {
          data.currentStation = event.StationName;
        }
        if (event.Body && !data.currentBody) {
          data.currentBody = event.Body;
        }
      }

      // Extract station from Docked event
      if (event.event === 'Docked') {
        if (event.StationName && !data.currentStation) {
          data.currentStation = event.StationName;
        }
        if (event.StarSystem && !data.currentSystem) {
          data.currentSystem = event.StarSystem;
        }
      }

      // Extract ranks from Rank event
      if (event.event === 'Rank') {
        if (!data.ranks) data.ranks = {};
        if (!data.rankProgress) data.rankProgress = {};
        
        if (event.Combat !== undefined) {
          data.ranks.combat = event.Combat;
          data.rankProgress.combat = event.CombatProgress || 0;
        }
        if (event.Trade !== undefined) {
          data.ranks.trade = event.Trade;
          data.rankProgress.trade = event.TradeProgress || 0;
        }
        if (event.Explore !== undefined) {
          data.ranks.explorer = event.Explore;
          data.rankProgress.explorer = event.ExploreProgress || 0;
        }
        if (event.CQC !== undefined) {
          data.ranks.cqc = event.CQC;
          data.rankProgress.cqc = event.CQCProgress || 0;
        }
        if (event.Empire !== undefined) {
          data.ranks.empire = event.Empire;
          data.rankProgress.empire = event.EmpireProgress || 0;
        }
        if (event.Federation !== undefined) {
          data.ranks.federation = event.Federation;
          data.rankProgress.federation = event.FederationProgress || 0;
        }
      }

      // Extract credits from any event that has Credits field
      if (event.Credits !== undefined && data.credits === undefined) {
        data.credits = event.Credits;
      }

      // Extract debt from any event that has Debt field
      if (event.Debt !== undefined && data.debt === undefined) {
        data.debt = event.Debt;
      }

      // Track the most recent event timestamp
      if (event.timestamp && !data.lastEventTimestamp) {
        data.lastEventTimestamp = event.timestamp;
      }
    } catch (e) {
      // Skip invalid JSON lines
      continue;
    }
  }

  return data;
}

/**
 * Rank names mapping (0-14 scale)
 */
export const RANK_NAMES = {
  combat: ['Harmless', 'Mostly Harmless', 'Novice', 'Competent', 'Expert', 'Master', 'Dangerous', 'Deadly', 'Elite', 'Elite I', 'Elite II', 'Elite III', 'Elite IV', 'Elite V'],
  trade: ['Penniless', 'Mostly Penniless', 'Peddler', 'Dealer', 'Merchant', 'Broker', 'Entrepreneur', 'Tycoon', 'Elite', 'Elite I', 'Elite II', 'Elite III', 'Elite IV', 'Elite V'],
  explorer: ['Aimless', 'Mostly Aimless', 'Scout', 'Surveyor', 'Explorer', 'Pathfinder', 'Ranger', 'Pioneer', 'Elite', 'Elite I', 'Elite II', 'Elite III', 'Elite IV', 'Elite V'],
  cqc: ['Helpless', 'Mostly Helpless', 'Amateur', 'Semi Professional', 'Professional', 'Champion', 'Hero', 'Legend', 'Elite', 'Elite I', 'Elite II', 'Elite III', 'Elite IV', 'Elite V'],
  empire: ['None', 'Outsider', 'Serf', 'Master', 'Squire', 'Knight', 'Lord', 'Baron', 'Viscount', 'Count', 'Earl', 'Marquis', 'Duke', 'King'],
  federation: ['None', 'Recruit', 'Cadet', 'Midshipman', 'Petty Officer', 'Chief Petty Officer', 'Warrant Officer', 'Ensign', 'Lieutenant', 'Lt. Commander', 'Post Commander', 'Post Captain', 'Rear Admiral', 'Vice Admiral', 'Admiral'],
};

export function getRankName(category: keyof typeof RANK_NAMES, rank: number): string {
  const names = RANK_NAMES[category];
  if (rank >= 0 && rank < names.length) {
    return names[rank];
  }
  return 'Unknown';
}

