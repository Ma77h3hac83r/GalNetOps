import type { APIRoute } from 'astro';
import { getUserByEmail } from '../../../lib/users';
import { verifyPassword } from '../../../lib/password';
import { createSession, setSessionCookie } from '../../../lib/session';

export const POST: APIRoute = async (context) => {

  const formData = await context.request.formData();
  const email = formData.get('email')?.toString() || '';
  const password = formData.get('password')?.toString() || '';
  const redirectTo = formData.get('redirect')?.toString() || '/';

  if (!email || !password) {
    return context.redirect('/login?error=' + encodeURIComponent('Email and password are required'));
  }

  try {
    const user = await getUserByEmail(email, context);
    if (!user) {
      return context.redirect('/login?error=' + encodeURIComponent('Invalid email or password'));
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return context.redirect('/login?error=' + encodeURIComponent('Invalid email or password'));
    }

    // Create session
    const expiresAt = Date.now() + (60 * 60 * 24 * 7 * 1000); // 7 days
    const sessionId = createSession({
      userId: user.id,
      commanderName: user.commanderName || user.username,
      accessToken: user.accessToken || '',
      refreshToken: user.refreshToken,
      expiresAt,
    });

    // Set session cookie
    setSessionCookie(context, sessionId);

    // Redirect to dashboard or requested page
    return context.redirect(redirectTo);
  } catch (error) {
    console.error('Login error:', error);
    return context.redirect('/login?error=' + encodeURIComponent('Login failed. Please try again.'));
  }
};

