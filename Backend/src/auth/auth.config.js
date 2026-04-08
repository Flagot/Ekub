import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';

const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:4000';

/**
 * Create better-auth instance with MongoDB adapter.
 * Call this after mongoose is connected; pass mongoose.connection.db.
 * Client is not passed so transactions are disabled (required for standalone MongoDB, not a replica set).
 */
export function createAuth(db) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('BETTER_AUTH_SECRET must be set and at least 32 characters');
  }
  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  return betterAuth({
    secret,
    baseURL,
    trustedOrigins: [frontendOrigin],
    database: mongodbAdapter(db),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
  });
}
