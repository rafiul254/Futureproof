import 'server-only';

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';

import { isSupabaseConfigured } from '@/lib/env';

/**
 * Identity for the current request.
 *
 * - Supabase configured and signed in -> the real user id.
 * - Otherwise                         -> an anonymous id in a cookie, so
 *   export/delete/my-analyses still work in the no-database build.
 */

export const ANON_COOKIE = 'fp_anon';

export interface Identity {
  userId: string | null;
  anonymousId: string | null;
  isAuthenticated: boolean;
  /** The value to store rows against: real user id, or the anonymous id. */
  storageKey: string | null;
}

export async function getIdentity(): Promise<Identity> {
  const cookieStore = await cookies();
  const anonymousId = cookieStore.get(ANON_COOKIE)?.value ?? null;

  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        return { userId: user.id, anonymousId, isAuthenticated: true, storageKey: user.id };
      }
    } catch {
      // Not signed in, or auth is unreachable: fall through to anonymous.
    }
  }

  return { userId: null, anonymousId, isAuthenticated: false, storageKey: anonymousId };
}

/**
 * The value stored rows belong to. Use this for every ownership check: for a
 * signed-out visitor `userId` is null and the anonymous cookie id is the owner.
 */
export function ownerKey(identity: Identity): string | null {
  return identity.storageKey ?? identity.userId;
}

/** Creates the anonymous cookie if missing. Callable from route handlers only. */
export async function ensureAnonymousId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(ANON_COOKIE)?.value;
  if (existing) return existing;

  const id = `anon_${randomUUID()}`;
  cookieStore.set(ANON_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.NODE_ENV === 'production',
  });
  return id;
}
