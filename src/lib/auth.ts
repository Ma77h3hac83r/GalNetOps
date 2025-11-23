/**
 * Authentication utilities
 */

import type { APIContext } from 'astro';
import { getSessionFromRequest } from './session';
import { getUserById } from './users';

export interface AuthResult {
  isAuthenticated: boolean;
  user?: {
    id: string;
    commanderName: string;
  };
  session?: any;
}

/**
 * Check if user is authenticated
 */
export async function checkAuth(context: APIContext): Promise<AuthResult> {
  const session = getSessionFromRequest(context);
  
  if (!session) {
    return { isAuthenticated: false };
  }

  const user = await getUserById(session.userId, context);
  if (!user) {
    return { isAuthenticated: false };
  }

  return {
    isAuthenticated: true,
    user: {
      id: user.id,
      commanderName: user.commanderName,
    },
    session,
  };
}

