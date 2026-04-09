import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth client for React.
 * With Vite proxy, /api is sent to the backend so baseURL can stay same-origin.
 */
export const authClient = createAuthClient({
  baseURL: (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, ''), // same origin when using proxy
});

export const { signIn, signUp, signOut, useSession } = authClient;
