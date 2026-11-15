import { NextResponse } from 'next/server';

import { exportUserData } from '@/lib/analysis/store';
import { getIdentity } from '@/lib/auth/session';
import { clientKey, rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/me/export — everything we hold about the caller, as JSON. */
export async function GET(request: Request) {
  const identity = await getIdentity();
  const limit = rateLimit(`${clientKey(request, identity.userId)}:export`, RATE_LIMITS.export);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const data = await exportUserData(identity.storageKey);

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="futureproof-my-data.json"',
      'cache-control': 'no-store',
    },
  });
}
