import type { APIRoute } from 'astro';
import { getSessionFromRequest } from '../../../lib/session';
import { getUserById, linkEDAccount } from '../../../lib/users';
import { getCommanderProfile, getCAPIConfig, refreshAccessToken } from '../../../lib/capi';

export const POST: APIRoute = async (context) => {
  const session = getSessionFromRequest(context);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const user = await getUserById(session.userId, context);
  if (!user || !user.frontierId || !user.accessToken) {
    return new Response(JSON.stringify({ error: 'ED account not linked' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const config = getCAPIConfig(context);
    let accessToken = user.accessToken;

    // Check if token is expired and refresh if needed
    if (user.tokenExpiresAt && Date.now() >= user.tokenExpiresAt && user.refreshToken) {
      const tokenResponse = await refreshAccessToken(user.refreshToken, config);
      accessToken = tokenResponse.access_token;
      
      // Update user with new token
      const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
      await linkEDAccount(
        user.id,
        user.commanderName || '',
        user.frontierId,
        tokenResponse.access_token,
        tokenResponse.refresh_token || user.refreshToken,
        expiresAt,
        user.profile,
        context
      );
    }

    // Fetch fresh commander profile
    const profile = await getCommanderProfile(accessToken);

    // Update user profile with fresh data
    const updated = await linkEDAccount(
      user.id,
      profile.commander.name,
      user.frontierId,
      accessToken,
      user.refreshToken,
      user.tokenExpiresAt || Date.now() + 3600000,
      {
        credits: profile.commander.credits,
        debt: profile.commander.debt,
        lastSystem: profile.lastSystem?.name,
        lastStarport: profile.lastStarport?.name,
      },
      context
    );

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      profile: updated.profile,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error refreshing commander data:', error);
    return new Response(JSON.stringify({ error: 'Failed to refresh data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

