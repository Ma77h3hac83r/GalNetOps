/**
 * Simple session management
 * In production, consider using a proper session store (Redis, database, etc.)
 */

import type { APIContext } from 'astro';

const SESSION_COOKIE_NAME = 'galnetops_session';
const SESSION_SECRET = import.meta.env.SESSION_SECRET || 'dev-secret-change-in-production';

export interface UserSession {
  userId: string;
  commanderName: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  createdAt: number;
}

// In-memory session store (replace with database in production)
const sessions = new Map<string, UserSession>();

/**
 * Generate a random session ID
 */
function generateSessionId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Create a new session
 */
export function createSession(userData: Omit<UserSession, 'createdAt'>): string {
  const sessionId = generateSessionId();
  const session: UserSession = {
    ...userData,
    createdAt: Date.now(),
  };
  sessions.set(sessionId, session);
  return sessionId;
}

/**
 * Get session by ID
 */
export function getSession(sessionId: string): UserSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Delete a session
 */
export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Get session from request cookies
 */
export function getSessionFromRequest(context: APIContext): UserSession | null {
  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionId) {
    return null;
  }

  const session = getSession(sessionId);
  if (!session) {
    return null;
  }

  // Check if session is expired
  if (session.expiresAt < Date.now()) {
    deleteSession(sessionId);
    return null;
  }

  return session;
}

/**
 * Set session cookie in response
 */
export function setSessionCookie(context: APIContext, sessionId: string): void {
  context.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(context: APIContext): void {
  context.cookies.delete(SESSION_COOKIE_NAME, {
    path: '/',
  });
}

