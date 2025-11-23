import type { APIRoute } from 'astro';
import { getCAPIConfig, exchangeCodeForToken, getCommanderProfile } from '../../../lib/capi';
import { getSessionFromRequest, createSession, setSessionCookie } from '../../../lib/session';
import { linkEDAccount, getUserByFrontierId, getUserById } from '../../../lib/users';

export const GET: APIRoute = async (context) => {
  const { url, redirect } = context;
  const searchParams = new URL(url).searchParams;

  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  // Handle OAuth errors
  if (error) {
    return redirect('/auth/login?error=' + encodeURIComponent(error));
  }

  if (!code) {
    return redirect('/auth/login?error=' + encodeURIComponent('No authorization code received'));
  }

  try {
    const config = getCAPIConfig(context);

    // Exchange authorization code for access token
    const tokenResponse = await exchangeCodeForToken(code, config);

    // Fetch commander profile
    const profile = await getCommanderProfile(tokenResponse.access_token);

    // Calculate token expiration
    const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);

    // Check if there's an existing session (user is logged in)
    const existingSession = getSessionFromRequest(context);
    
    if (existingSession) {
      // User is logged in - link ED account to existing GalNetOps account
      const user = await getUserById(existingSession.userId, context);
      if (!user) {
        return redirect('/auth/link?error=' + encodeURIComponent('User session invalid'));
      }

      // Check if this ED account is already linked to another user
      const existingEDUser = await getUserByFrontierId(profile.commander.id, context);
      if (existingEDUser && existingEDUser.id !== user.id) {
        return redirect('/auth/link?error=' + encodeURIComponent('This Elite Dangerous account is already linked to another GalNetOps account'));
      }

      // Link the ED account
      const updated = await linkEDAccount(
        user.id,
        profile.commander.name,
        profile.commander.id,
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        expiresAt,
        {
          credits: profile.commander.credits,
          debt: profile.commander.debt,
          lastSystem: profile.lastSystem?.name,
          lastStarport: profile.lastStarport?.name,
        },
        context
      );

      if (!updated) {
        return redirect('/auth/link?error=' + encodeURIComponent('Failed to link account'));
      }

      // Update session with new token info
      const newSessionId = createSession({
        userId: updated.id,
        commanderName: updated.commanderName || updated.username,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresAt,
      });

      setSessionCookie(context, newSessionId);

      return redirect('/?linked=true');
    } else {
      // No session - user needs to login first
      return redirect('/login?error=' + encodeURIComponent('Please login to your GalNetOps account first, then link your ED account'));
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
    return redirect('/auth/link?error=' + encodeURIComponent(errorMessage));
  }
};

