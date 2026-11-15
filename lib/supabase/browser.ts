'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from '@/lib/supabase/database.types';

let client: SupabaseClient<Database> | undefined;

/**
 * Browser Supabase client (respects RLS — never use the service role key here).
 * Throws a clear error when Supabase env vars are missing so failures are obvious in dev.
 */
export function createClient(): SupabaseClient<Database> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    );
  }

  client ??= createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL as string,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );

  return client;
}
