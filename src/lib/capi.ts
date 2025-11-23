/**
 * Elite Dangerous Companion API (CAPI) utilities
 * 
 * CAPI OAuth2 Flow:
 * 1. Redirect user to authorization URL
 * 2. User authorizes, gets redirected back with code
 * 3. Exchange code for access token
 * 4. Use access token to fetch commander data
 */

const ED_AUTH_BASE = 'https://auth.frontierstore.net';
const ED_CAPI_BASE = 'https://companion.orerve.net';

export interface CAPIConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface CommanderProfile {
  commander: {
    id: string;
    name: string;
    credits: number;
    debt: number;
  };
  lastSystem: {
    name: string;
    id: number;
  };
  lastStarport?: {
    name: string;
    id: number;
  };
}

/**
 * Get the OAuth2 authorization URL
 */
export function getAuthorizationUrl(config: CAPIConfig, state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'capi',
    ...(state && { state }),
  });

  return `${ED_AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  config: CAPIConfig
): Promise<TokenResponse> {
  const response = await fetch(`${ED_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Refresh an access token using refresh token
 */
export async function refreshAccessToken(
  refreshToken: string,
  config: CAPIConfig
): Promise<TokenResponse> {
  const response = await fetch(`${ED_AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

/**
 * Fetch commander profile from CAPI
 */
export async function getCommanderProfile(
  accessToken: string
): Promise<CommanderProfile> {
  const response = await fetch(`${ED_CAPI_BASE}/profile`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch profile: ${error}`);
  }

  return response.json();
}

/**
 * Get CAPI configuration from environment variables
 * Works with both Vite (import.meta.env) and Cloudflare (context.env)
 */
export function getCAPIConfig(context?: any): CAPIConfig {
  // Try Cloudflare environment first (production)
  let clientId = context?.locals?.runtime?.env?.ED_CAPI_CLIENT_ID || context?.env?.ED_CAPI_CLIENT_ID;
  let clientSecret = context?.locals?.runtime?.env?.ED_CAPI_CLIENT_SECRET || context?.env?.ED_CAPI_CLIENT_SECRET;
  let redirectUri = context?.locals?.runtime?.env?.ED_CAPI_REDIRECT_URI || context?.env?.ED_CAPI_REDIRECT_URI;
  let baseUrl = context?.locals?.runtime?.env?.BASE_URL || context?.env?.BASE_URL;

  // Fallback to Vite environment variables (development)
  if (!clientId) clientId = import.meta.env.ED_CAPI_CLIENT_ID;
  if (!clientSecret) clientSecret = import.meta.env.ED_CAPI_CLIENT_SECRET;
  if (!redirectUri) redirectUri = import.meta.env.ED_CAPI_REDIRECT_URI;
  if (!baseUrl) baseUrl = import.meta.env.BASE_URL || 'http://localhost:4321';

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      'Missing ED CAPI configuration. Please set ED_CAPI_CLIENT_ID, ED_CAPI_CLIENT_SECRET, and ED_CAPI_REDIRECT_URI environment variables.'
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    baseUrl,
  };
}

