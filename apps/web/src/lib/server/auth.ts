import 'server-only';
import { redirect } from 'next/navigation';
import type { AuthUser } from '@outflow/contracts';
import { apiFetch } from './api';

/**
 * Returns the current user, or null if not signed in.
 * Use in RSC layouts/pages to gate content.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>('/api/v1/auth/me');
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) return null;
    // API unreachable (cold start, dev offline, etc.) — treat as anonymous
    // rather than crashing the marketing page. Real errors still surface in logs.
    console.error('auth.getCurrentUser failed', err);
    return null;
  }
}

/** Convenience: redirect to /login if no session. */
export async function requireAuthOrRedirect(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
