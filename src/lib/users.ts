/**
 * User account storage
 * Uses Cloudflare KV in production, file-based storage for local dev
 * 
 * Note: This file is kept for local development. In Cloudflare, use users-kv.ts
 */

import * as kvStorage from './users-kv';

// Re-export types and functions from KV storage
export type { UserAccount } from './users-kv';

// Re-export all functions - they will use KV in Cloudflare, file-based in local dev
export const initUsersStorage = async () => {
  // No-op for KV storage
};

export const createUser = (email: string, username: string, passwordHash: string, context?: any) =>
  kvStorage.createUser(email, username, passwordHash, context);

export const getUserById = (userId: string, context?: any) =>
  kvStorage.getUserById(userId, context);

export const getUserByEmail = (email: string, context?: any) =>
  kvStorage.getUserByEmail(email, context);

export const getUserByUsername = (username: string, context?: any) =>
  kvStorage.getUserByUsername(username, context);

export const getUserByFrontierId = (frontierId: string, context?: any) =>
  kvStorage.getUserByFrontierId(frontierId, context);

export const linkEDAccount = (
  userId: string,
  commanderName: string,
  frontierId: string,
  accessToken: string,
  refreshToken: string | undefined,
  tokenExpiresAt: number,
  profile?: any,
  context?: any
) => kvStorage.linkEDAccount(userId, commanderName, frontierId, accessToken, refreshToken, tokenExpiresAt, profile, context);

export const updateUser = (userId: string, updates: any, context?: any) =>
  kvStorage.updateUser(userId, updates, context);

export const getAllUsers = (context?: any) =>
  kvStorage.getAllUsers(context);

