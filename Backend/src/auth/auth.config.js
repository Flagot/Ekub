import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:4000';

/**
 * Create better-auth instance with MongoDB adapter.
 * Call this after mongoose is connected; pass mongoose.connection.db.
 * Client is not passed so transactions are disabled (required for standalone MongoDB, not a replica set).
 */
export function createAuth(db) {
  const isProd = process.env.NODE_ENV === 'production';
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be set and at least 32 characters');
  }
  const frontendOrigins = (
    process.env.FRONTEND_ORIGIN || 'http://localhost:5173'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Helpful fallbacks during local dev when Vite picks a new port.
  if (!frontendOrigins.includes('http://localhost:5173')) {
    frontendOrigins.push('http://localhost:5173');
  }
  if (!frontendOrigins.includes('http://127.0.0.1:5173')) {
    frontendOrigins.push('http://127.0.0.1:5173');
  }
  if (!frontendOrigins.includes('http://localhost:5174')) {
    frontendOrigins.push('http://localhost:5174');
  }

  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: frontendOrigins,
    database: mongodbAdapter(db),
    emailAndPassword: {
      enabled: true,
    },
    advanced: {
      // Needed when frontend and backend are on different HTTPS origins (e.g. Vercel + Render).
      useSecureCookies: isProd,
      cookies: {
        session_token: {
          attributes: {
            sameSite: isProd ? 'none' : 'lax',
            secure: isProd,
          },
        },
      },
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
  });
}
