/**
 * User account storage using Cloudflare D1 SQL Database
 * This replaces KV storage for better query capabilities and relational data
 */

import type { D1Database } from '@cloudflare/workers-types';

export interface UserAccount {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  // ED CAPI linking (optional)
  frontierId?: string;
  commanderName?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  profile?: {
    credits?: number;
    debt?: number;
    lastSystem?: string;
    lastStarport?: string;
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
    journalLastUpdated?: string;
  };
  createdAt: string;
  lastUpdated: string;
}

// D1 binding type
declare global {
  interface Env {
    DB: D1Database;
  }
}

/**
 * Get D1 database from runtime
 */
function getDB(context?: any): D1Database | null {
  // In Astro Cloudflare adapter, access via locals.runtime.env
  if (context?.locals?.runtime?.env?.DB) {
    return context.locals.runtime.env.DB;
  }
  
  // Fallback: direct env access
  if (context?.env?.DB) {
    return context.env.DB;
  }
  
  // Try alternative paths for Cloudflare Pages
  if (context?.runtime?.env?.DB) {
    return context.runtime.env.DB;
  }
  
  // Development/local - D1 not available
  console.warn('D1 database not available. Context:', {
    hasLocals: !!context?.locals,
    hasRuntime: !!context?.locals?.runtime,
    hasEnv: !!context?.locals?.runtime?.env,
    hasDB: !!context?.locals?.runtime?.env?.DB,
  });
  return null;
}

/**
 * Convert database row to UserAccount
 */
function rowToUser(row: any): UserAccount {
  const profile: UserAccount['profile'] = {};
  
  if (row.profile_credits !== null) profile.credits = row.profile_credits;
  if (row.profile_debt !== null) profile.debt = row.profile_debt;
  if (row.profile_last_system) profile.lastSystem = row.profile_last_system;
  if (row.profile_last_starport) profile.lastStarport = row.profile_last_starport;
  if (row.profile_current_body) profile.currentBody = row.profile_current_body;
  if (row.profile_ship_name) profile.shipName = row.profile_ship_name;
  if (row.profile_ship_type) profile.shipType = row.profile_ship_type;
  if (row.profile_ship_ident) profile.shipIdent = row.profile_ship_ident;
  if (row.profile_journal_last_updated) profile.journalLastUpdated = row.profile_journal_last_updated;
  
  if (row.profile_ranks) {
    try {
      profile.ranks = JSON.parse(row.profile_ranks);
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  if (row.profile_rank_progress) {
    try {
      profile.rankProgress = JSON.parse(row.profile_rank_progress);
    } catch (e) {
      // Invalid JSON, skip
    }
  }

  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    frontierId: row.frontier_id || undefined,
    commanderName: row.commander_name || undefined,
    accessToken: row.access_token || undefined,
    refreshToken: row.refresh_token || undefined,
    tokenExpiresAt: row.token_expires_at || undefined,
    profile: Object.keys(profile).length > 0 ? profile : undefined,
    createdAt: row.created_at,
    lastUpdated: row.last_updated,
  };
}

/**
 * Create a new GalNetOps user account
 */
export async function createUser(
  email: string,
  username: string,
  passwordHash: string,
  context?: any
): Promise<UserAccount> {
  const db = getDB(context);
  
  if (!db) {
    throw new Error('D1 database not available. Make sure you are running in Cloudflare Workers runtime.');
  }

  // Check if email or username already exists
  const existingEmail = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (existingEmail) {
    throw new Error('Email already registered');
  }
  
  const existingUsername = await db.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
  if (existingUsername) {
    throw new Error('Username already taken');
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO users (id, email, username, password_hash, created_at, last_updated)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(userId, email.toLowerCase(), username, passwordHash, now, now).run();

  return {
    id: userId,
    email: email.toLowerCase(),
    username,
    passwordHash,
    createdAt: now,
    lastUpdated: now,
  };
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string, context?: any): Promise<UserAccount | null> {
  const db = getDB(context);
  if (!db) {
    return null;
  }

  const row = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!row) {
    return null;
  }

  return rowToUser(row);
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string, context?: any): Promise<UserAccount | null> {
  const db = getDB(context);
  if (!db) {
    return null;
  }

  const row = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (!row) {
    return null;
  }

  return rowToUser(row);
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string, context?: any): Promise<UserAccount | null> {
  const db = getDB(context);
  if (!db) {
    return null;
  }

  const row = await db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();
  if (!row) {
    return null;
  }

  return rowToUser(row);
}

/**
 * Get user by Frontier ID
 */
export async function getUserByFrontierId(frontierId: string, context?: any): Promise<UserAccount | null> {
  const db = getDB(context);
  if (!db) {
    return null;
  }

  const row = await db.prepare('SELECT * FROM users WHERE frontier_id = ?').bind(frontierId).first();
  if (!row) {
    return null;
  }

  return rowToUser(row);
}

/**
 * Link ED CAPI account to existing user
 */
export async function linkEDAccount(
  userId: string,
  commanderName: string,
  frontierId: string,
  accessToken: string,
  refreshToken: string | undefined,
  tokenExpiresAt: number,
  profile?: UserAccount['profile'],
  context?: any
): Promise<UserAccount | null> {
  const db = getDB(context);
  if (!db) {
    return null;
  }

  const user = await getUserById(userId, context);
  if (!user) {
    return null;
  }

  const now = new Date().toISOString();
  
  // Prepare profile data for update
  const profileRanks = profile?.ranks ? JSON.stringify(profile.ranks) : null;
  const profileRankProgress = profile?.rankProgress ? JSON.stringify(profile.rankProgress) : null;

  await db.prepare(`
    UPDATE users SET
      commander_name = ?,
      frontier_id = ?,
      access_token = ?,
      refresh_token = ?,
      token_expires_at = ?,
      profile_credits = ?,
      profile_debt = ?,
      profile_last_system = ?,
      profile_last_starport = ?,
      profile_current_body = ?,
      profile_ship_name = ?,
      profile_ship_type = ?,
      profile_ship_ident = ?,
      profile_ranks = ?,
      profile_rank_progress = ?,
      profile_journal_last_updated = ?,
      last_updated = ?
    WHERE id = ?
  `).bind(
    commanderName,
    frontierId,
    accessToken,
    refreshToken || null,
    tokenExpiresAt,
    profile?.credits || null,
    profile?.debt || null,
    profile?.lastSystem || null,
    profile?.lastStarport || null,
    profile?.currentBody || null,
    profile?.shipName || null,
    profile?.shipType || null,
    profile?.shipIdent || null,
    profileRanks,
    profileRankProgress,
    profile?.journalLastUpdated || null,
    now,
    userId
  ).run();

  return getUserById(userId, context);
}

/**
 * Update user account
 */
export async function updateUser(
  userId: string,
  updates: Partial<UserAccount>,
  context?: any
): Promise<UserAccount | null> {
  const db = getDB(context);
  if (!db) {
    return null;
  }

  const user = await getUserById(userId, context);
  if (!user) {
    return null;
  }

  const now = new Date().toISOString();
  const setClauses: string[] = [];
  const values: any[] = [];

  // Build dynamic UPDATE query
  if (updates.email !== undefined) {
    setClauses.push('email = ?');
    values.push(updates.email.toLowerCase());
  }
  if (updates.username !== undefined) {
    setClauses.push('username = ?');
    values.push(updates.username);
  }
  if (updates.passwordHash !== undefined) {
    setClauses.push('password_hash = ?');
    values.push(updates.passwordHash);
  }
  if (updates.frontierId !== undefined) {
    setClauses.push('frontier_id = ?');
    values.push(updates.frontierId || null);
  }
  if (updates.commanderName !== undefined) {
    setClauses.push('commander_name = ?');
    values.push(updates.commanderName || null);
  }
  if (updates.accessToken !== undefined) {
    setClauses.push('access_token = ?');
    values.push(updates.accessToken || null);
  }
  if (updates.refreshToken !== undefined) {
    setClauses.push('refresh_token = ?');
    values.push(updates.refreshToken || null);
  }
  if (updates.tokenExpiresAt !== undefined) {
    setClauses.push('token_expires_at = ?');
    values.push(updates.tokenExpiresAt || null);
  }
  
  // Handle profile updates
  if (updates.profile) {
    if (updates.profile.credits !== undefined) {
      setClauses.push('profile_credits = ?');
      values.push(updates.profile.credits || null);
    }
    if (updates.profile.debt !== undefined) {
      setClauses.push('profile_debt = ?');
      values.push(updates.profile.debt || null);
    }
    if (updates.profile.lastSystem !== undefined) {
      setClauses.push('profile_last_system = ?');
      values.push(updates.profile.lastSystem || null);
    }
    if (updates.profile.lastStarport !== undefined) {
      setClauses.push('profile_last_starport = ?');
      values.push(updates.profile.lastStarport || null);
    }
    if (updates.profile.currentBody !== undefined) {
      setClauses.push('profile_current_body = ?');
      values.push(updates.profile.currentBody || null);
    }
    if (updates.profile.shipName !== undefined) {
      setClauses.push('profile_ship_name = ?');
      values.push(updates.profile.shipName || null);
    }
    if (updates.profile.shipType !== undefined) {
      setClauses.push('profile_ship_type = ?');
      values.push(updates.profile.shipType || null);
    }
    if (updates.profile.shipIdent !== undefined) {
      setClauses.push('profile_ship_ident = ?');
      values.push(updates.profile.shipIdent || null);
    }
    if (updates.profile.ranks !== undefined) {
      setClauses.push('profile_ranks = ?');
      values.push(updates.profile.ranks ? JSON.stringify(updates.profile.ranks) : null);
    }
    if (updates.profile.rankProgress !== undefined) {
      setClauses.push('profile_rank_progress = ?');
      values.push(updates.profile.rankProgress ? JSON.stringify(updates.profile.rankProgress) : null);
    }
    if (updates.profile.journalLastUpdated !== undefined) {
      setClauses.push('profile_journal_last_updated = ?');
      values.push(updates.profile.journalLastUpdated || null);
    }
  }

  setClauses.push('last_updated = ?');
  values.push(now);
  values.push(userId);

  if (setClauses.length > 1) { // More than just last_updated
    await db.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).bind(...values).run();
  }

  return getUserById(userId, context);
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers(context?: any): Promise<UserAccount[]> {
  const db = getDB(context);
  if (!db) {
    return [];
  }

  const { results } = await db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
  if (!results) {
    return [];
  }

  return results.map(row => rowToUser(row));
}

