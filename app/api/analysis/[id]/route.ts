import { NextResponse } from 'next/server';

import { getAnalysis } from '@/lib/analysis/store';
import { getIdentity, ownerKey } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/analysis/[id] — the stored result, if it belongs to the caller. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const identity = await getIdentity();

  const analysis = await getAnalysis(id);
  if (!analysis) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }
  if (analysis.userId && analysis.userId !== ownerKey(identity)) {
    return NextResponse.json({ error: 'Analysis not found.' }, { status: 404 });
  }

  return NextResponse.json(analysis);
}
