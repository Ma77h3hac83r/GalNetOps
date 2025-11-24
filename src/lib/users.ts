/**
 * User account storage
 * Uses Cloudflare D1 SQL Database in production
 * 
 * Note: This file is a wrapper that uses D1 storage
 */

import * as d1Storage from './users-d1';

// Re-export types and functions from D1 storage
export type { UserAccount } from './users-d1';

// Re-export all functions - they will use D1 in Cloudflare
export const initUsersStorage = async () => {
  // No-op for D1 storage
};

export const createUser = (email: string, username: string, passwordHash: string, context?: any) =>
  d1Storage.createUser(email, username, passwordHash, context);

export const getUserById = (userId: string, context?: any) =>
  d1Storage.getUserById(userId, context);

export const getUserByEmail = (email: string, context?: any) =>
  d1Storage.getUserByEmail(email, context);

export const getUserByUsername = (username: string, context?: any) =>
  d1Storage.getUserByUsername(username, context);

export const getUserByFrontierId = (frontierId: string, context?: any) =>
  d1Storage.getUserByFrontierId(frontierId, context);

export const linkEDAccount = (
  userId: string,
  commanderName: string,
  frontierId: string,
  accessToken: string,
  refreshToken: string | undefined,
  tokenExpiresAt: number,
  profile?: any,
  context?: any
) => d1Storage.linkEDAccount(userId, commanderName, frontierId, accessToken, refreshToken, tokenExpiresAt, profile, context);

export const updateUser = (userId: string, updates: any, context?: any) =>
  d1Storage.updateUser(userId, updates, context);

export const getAllUsers = (context?: any) =>
  d1Storage.getAllUsers(context);

