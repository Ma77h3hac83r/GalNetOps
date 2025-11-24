/**
 * User account storage using Cloudflare KV
 * This replaces the file-based storage for Cloudflare Workers runtime
 */

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

// KV binding type (will be available in Cloudflare runtime)
declare global {
  interface Env {
    USERS: KVNamespace;
  }
}

/**
 * Get KV namespace from runtime
 * In Astro with Cloudflare adapter, KV is available via context.locals.runtime.env
 */
function getKV(context?: any): KVNamespace | null {
  // In Astro Cloudflare adapter, access via locals.runtime.env
  if (context?.locals?.runtime?.env?.USERS) {
    return context.locals.runtime.env.USERS;
  }
  
  // Fallback: direct env access
  if (context?.env?.USERS) {
    return context.env.USERS;
  }
  
  // Development/local - KV not available
  return null;
}

/**
 * Get all users from KV
 */
async function getAllUsersFromKV(kv: KVNamespace): Promise<UserAccount[]> {
  const list = await kv.list();
  const users: UserAccount[] = [];
  
  for (const key of list.keys) {
    const userData = await kv.get(key.name, 'json');
    if (userData) {
      users.push(userData as UserAccount);
    }
  }
  
  return users;
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
  const kv = getKV(context);
  
  if (!kv) {
    throw new Error('KV storage not available. Make sure you are running in Cloudflare Workers runtime.');
  }

  // Check if email or username already exists
  const allUsers = await getAllUsersFromKV(kv);
  for (const user of allUsers) {
    if (user.email.toLowerCase() === email.toLowerCase()) {
      throw new Error('Email already registered');
    }
    if (user.username.toLowerCase() === username.toLowerCase()) {
      throw new Error('Username already taken');
    }
  }

  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  const user: UserAccount = {
    id: userId,
    email: email.toLowerCase(),
    username,
    passwordHash,
    createdAt: now,
    lastUpdated: now,
  };

  // Store in KV with user ID as key
  await kv.put(`user:${userId}`, JSON.stringify(user));
  // Also create index entries for quick lookup
  await kv.put(`email:${email.toLowerCase()}`, userId);
  await kv.put(`username:${username.toLowerCase()}`, userId);

  return user;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string, context?: any): Promise<UserAccount | null> {
  const kv = getKV(context);
  if (!kv) {
    return null;
  }

  const userData = await kv.get(`user:${userId}`, 'json');
  return userData as UserAccount | null;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string, context?: any): Promise<UserAccount | null> {
  const kv = getKV(context);
  if (!kv) {
    return null;
  }

  const userId = await kv.get(`email:${email.toLowerCase()}`);
  if (!userId) {
    return null;
  }

  return getUserById(userId, context);
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string, context?: any): Promise<UserAccount | null> {
  const kv = getKV(context);
  if (!kv) {
    return null;
  }

  const userId = await kv.get(`username:${username.toLowerCase()}`);
  if (!userId) {
    return null;
  }

  return getUserById(userId, context);
}

/**
 * Get user by Frontier ID
 */
export async function getUserByFrontierId(frontierId: string, context?: any): Promise<UserAccount | null> {
  const kv = getKV(context);
  if (!kv) {
    return null;
  }

  const allUsers = await getAllUsersFromKV(kv);
  for (const user of allUsers) {
    if (user.frontierId === frontierId) {
      return user;
    }
  }
  return null;
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
  const kv = getKV(context);
  if (!kv) {
    return null;
  }

  const user = await getUserById(userId, context);
  if (!user) {
    return null;
  }

  const updated: UserAccount = {
    ...user,
    commanderName,
    frontierId,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    profile,
    lastUpdated: new Date().toISOString(),
  };

  await kv.put(`user:${userId}`, JSON.stringify(updated));

  return updated;
}

/**
 * Update user account
 */
export async function updateUser(
  userId: string,
  updates: Partial<UserAccount>,
  context?: any
): Promise<UserAccount | null> {
  const kv = getKV(context);
  if (!kv) {
    return null;
  }

  const user = await getUserById(userId, context);
  if (!user) {
    return null;
  }

  const updated: UserAccount = {
    ...user,
    ...updates,
    lastUpdated: new Date().toISOString(),
  };

  await kv.put(`user:${userId}`, JSON.stringify(updated));

  return updated;
}

/**
 * Get all users (for admin purposes)
 */
export async function getAllUsers(context?: any): Promise<UserAccount[]> {
  const kv = getKV(context);
  if (!kv) {
    return [];
  }

  return getAllUsersFromKV(kv);
}

