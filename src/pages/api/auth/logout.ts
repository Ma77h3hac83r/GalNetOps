import type { APIRoute } from 'astro';
import { getSessionFromRequest, deleteSession, clearSessionCookie } from '../../../lib/session';

export const POST: APIRoute = async (context) => {
  const session = getSessionFromRequest(context);
  
  if (session) {
    // Get session ID from cookie
    const sessionId = context.cookies.get('galnetops_session')?.value;
    if (sessionId) {
      deleteSession(sessionId);
    }
  }

  clearSessionCookie(context);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

