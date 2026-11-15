import { NextResponse } from 'next/server';
import { z } from 'zod';

import { ANALYSIS_VERSION, type AnalysisResult } from '@/lib/analysis/analyze';
import { getAnalysis, saveAnalysis } from '@/lib/analysis/store';
import { ensureAnonymousId, getIdentity } from '@/lib/auth/session';
import { clientKey, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 400_000;

const bodySchema = z.object({
  id: z.string().uuid(),
  result: z
    .object({
      version: z.literal(ANALYSIS_VERSION),
      locale: z.string().max(8),
      mappedSkills: z.array(z.unknown()).max(200),
      unmappedSkills: z.array(z.unknown()).max(200),
      score: z.object({ overall: z.number().nullable() }).passthrough(),
      dataNotes: z.object({ isSample: z.boolean() }).passthrough(),
    })
    .passthrough(),
});

/**
 * POST /api/analysis/restore { id, result }
 *
 * The browser keeps a copy of every result it received. When a serverless host sends the
 * results page to an instance that has not seen the analysis (its temp storage is
 * per-instance), the page asks the browser for its copy and re-saves it here, once.
 *
 * It only ever creates a record that does not exist yet, never overwrites, and the
 * record belongs to the caller. Numbers are not recomputed: this is the user's own result.
 */
export async function POST(request: Request) {
  const identity = await getIdentity();
  const limit = rateLimit(`${clientKey(request, identity.userId)}:restore`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Result too large.' }, { status: 413 });
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const body = bodySchema.safeParse(json);
  if (!body.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { id, result } = body.data;
  if (await getAnalysis(id)) {
    return NextResponse.json({ restored: false, exists: true });
  }

  const storageKey = identity.storageKey ?? (await ensureAnonymousId());
  await saveAnalysis({
    id,
    userId: storageKey,
    cvId: null,
    result: result as unknown as AnalysisResult,
    isSample: result.dataNotes.isSample,
  });
  return NextResponse.json({ restored: true });
}
