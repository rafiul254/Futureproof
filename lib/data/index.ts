import 'server-only';

import { isSupabaseConfigured } from '@/lib/env';

import { createLocalProvider } from './local';
import type { DataProvider } from './types';

export type { DataProvider };
export * from './types';

let cached: DataProvider | undefined;

/**
 * Picks the data source.
 *
 * - Supabase env vars present  -> Supabase (Postgres + pgvector)
 * - otherwise                  -> curated JSON in `data/seed/`
 *
 * Both implement `DataProvider`, so no calling code changes.
 */
export async function getDataProvider(): Promise<DataProvider> {
  if (cached) return cached;

  if (isSupabaseConfigured()) {
    try {
      const { createSupabaseProvider } = await import('./supabase');
      cached = createSupabaseProvider();
      return cached;
    } catch (error) {
      console.warn('[data] Supabase provider failed, falling back to local seed:', error);
    }
  }

  cached = createLocalProvider();
  return cached;
}
