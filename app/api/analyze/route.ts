import { NextResponse } from 'next/server';

import { runAnalysis, type AnalysisResult } from '@/lib/analysis/analyze';
import { getCv, saveAnalysis } from '@/lib/analysis/store';
import { logLlmCall } from '@/lib/audit';
import { ensureAnonymousId, getIdentity } from '@/lib/auth/session';
import { scrubPii } from '@/lib/pii/scrub';
import { analyzeSchema, firstIssue } from '@/lib/api/schemas';
import { clientKey, rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/analyze
 * Body: { cvId | text | sampleKey, targetOccupationId?, locale }
 * Returns { analysisId } once the result is computed and stored.
 */
export async function POST(request: Request) {
  const identity = await getIdentity();
  const limit = rateLimit(`${clientKey(request, identity.userId)}:analyze`, RATE_LIMITS.analyze);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many analyses. Please wait a moment and try again.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  const body = analyzeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: firstIssue(body.error) }, { status: 400 });
  }

  const { cvId, text, sampleKey, targetOccupationId, locale } = body.data;
  if (!cvId && !text && !sampleKey) {
    return NextResponse.json({ error: 'Provide cvId, text, or sampleKey.' }, { status: 400 });
  }

  const storageKey = identity.storageKey ?? (await ensureAnonymousId());

  try {
    let rawText = text ?? '';
    const isSample = Boolean(sampleKey);

    if (sampleKey) {
      const samples = JSON.parse(
        await readFile(path.join(process.cwd(), 'data', 'seed', 'sample_profiles.json'), 'utf8'),
      ) as Array<{ key: string; text: string }>;
      const sample = samples.find((s) => s.key === sampleKey);
      if (!sample) {
        return NextResponse.json({ error: 'Unknown sample profile.' }, { status: 400 });
      }
      rawText = sample.text;
    } else if (cvId) {
      // Stored CV text is already scrubbed; scrubbing again is a no-op safeguard.
      const stored = await getCv(cvId);
      if (!stored) {
        // On serverless hosts the next request may land on another instance. The client
        // sends `text` for exactly this case; a bare cvId can no longer be resolved.
        return NextResponse.json(
          { error: 'That upload is no longer available. Please upload it again.' },
          { status: 404 },
        );
      }
      rawText = stored.scrubbedText;
      if (rawText.length === 0) {
        return NextResponse.json({ error: 'That CV has no readable text.' }, { status: 400 });
      }
    }

    const scrubbed = scrubPii(rawText);

    const result: AnalysisResult = await runAnalysis({
      scrubbedText: scrubbed.text,
      locale,
      targetOccupationId: targetOccupationId ?? null,
      isSample,
    });

    await logLlmCall({
      userId: storageKey,
      purpose: 'analyze',
      model: `${result.extraction.method}:${result.extraction.model ?? 'offline'}`,
      prompt: null,
    });

    const stored = await saveAnalysis({
      userId: storageKey,
      cvId: cvId ?? null,
      result,
      isSample,
    });

    // The full result goes back too, so the browser can keep a copy (see /api/analysis/restore).
    return NextResponse.json({ analysisId: stored.id, score: stored.score, result });
  } catch (error) {
    console.error('[api/analyze]', error);
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
