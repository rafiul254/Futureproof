import { NextResponse } from 'next/server';

import { activeEmbeddingProvider, isLlmConfigured, isSupabaseConfigured } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Unauthenticated health check used by smoke tests and uptime checks. */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    version: process.env.npm_package_version ?? '0.1.0',
    time: new Date().toISOString(),
    features: {
      supabase: isSupabaseConfigured(),
      llm: isLlmConfigured(),
      embeddings: activeEmbeddingProvider(),
    },
  });
}
