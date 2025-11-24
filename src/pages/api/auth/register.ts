import type { APIRoute } from 'astro';
import { createUser, getUserByEmail, getUserByUsername } from '../../../lib/users';
import { hashPassword, validatePassword, validateEmail, validateUsername } from '../../../lib/password';

export const POST: APIRoute = async (context) => {
  const formData = await context.request.formData();
  const email = formData.get('email')?.toString() || '';
  const username = formData.get('username')?.toString() || '';
  const password = formData.get('password')?.toString() || '';
  const confirmPassword = formData.get('confirmPassword')?.toString() || '';

  // Validation
  if (!email || !username || !password || !confirmPassword) {
    return context.redirect('/register?error=' + encodeURIComponent('All fields are required'));
  }

  if (!validateEmail(email)) {
    return context.redirect('/register?error=' + encodeURIComponent('Invalid email format'));
  }

  const usernameValidation = validateUsername(username);
  if (!usernameValidation.valid) {
    return context.redirect('/register?error=' + encodeURIComponent(usernameValidation.error || 'Invalid username'));
  }

  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return context.redirect('/register?error=' + encodeURIComponent(passwordValidation.error || 'Invalid password'));
  }

  if (password !== confirmPassword) {
    return context.redirect('/register?error=' + encodeURIComponent('Passwords do not match'));
  }

  // Check if email or username already exists
  const existingEmail = await getUserByEmail(email, context);
  if (existingEmail) {
    return context.redirect('/register?error=' + encodeURIComponent('Email already registered'));
  }

  const existingUsername = await getUserByUsername(username, context);
  if (existingUsername) {
    return context.redirect('/register?error=' + encodeURIComponent('Username already taken'));
  }

  try {
    // Hash password and create user
    // Pass Astro context for Cloudflare KV access
    const passwordHash = await hashPassword(password);
    const user = await createUser(email, username, passwordHash, context);
    
    if (!user) {
      throw new Error('Failed to create user account');
    }

    return context.redirect('/register?success=true');
  } catch (error) {
    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    
    // If it's a D1 database not available error, provide more helpful message
    if (errorMessage.includes('D1 database not available')) {
      return new Response(
        JSON.stringify({ 
          error: 'Database not configured. Please ensure D1 database is bound in Cloudflare Pages settings.' 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return context.redirect('/register?error=' + encodeURIComponent(errorMessage));
  }
};

