import { NextResponse } from 'next/server';

import { planLearningPath } from '@/lib/ai/plan';
import { getDataProvider } from '@/lib/data';
import { getAnalysis } from '@/lib/analysis/store';
import { logLlmCall } from '@/lib/audit';
import { getIdentity, ownerKey } from '@/lib/auth/session';
import { pathSchema, firstIssue } from '@/lib/api/schemas';
import { clientKey, rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/analysis/[id]/path — builds the 4-week plan from verified courses. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await getIdentity();

  const limit = rateLimit(`${clientKey(request, identity.userId)}:path`, RATE_LIMITS.path);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  const body = pathSchema.safeParse(await request.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: firstIssue(body.error) }, { status: 400 });
  }

  const analysis = await getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }
  if (analysis.userId && analysis.userId !== ownerKey(identity)) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }

  try {
    const provider = await getDataProvider();
    const [courses, skills] = await Promise.all([provider.listCourses(), provider.listSkills()]);

    const skillNames = new Map(
      skills.map((s) => [s.id, { name: s.name, nameBn: s.nameBn }] as const),
    );

    const plan = await planLearningPath({
      result: analysis.result,
      courses,
      locale: body.data.locale,
      skillNames,
    });

    await logLlmCall({
      userId: ownerKey(identity),
      purpose: 'learning_path',
      model: `${plan.source}:${plan.model ?? 'deterministic'}`,
      prompt: null,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('[api/analysis/path]', error);
    return NextResponse.json({ error: 'Could not build the learning path.' }, { status: 500 });
  }
}
