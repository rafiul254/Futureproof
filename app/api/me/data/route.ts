import { NextResponse } from 'next/server';

import { deleteUserData } from '@/lib/analysis/store';
import { getIdentity } from '@/lib/auth/session';
import { clientKey, rateLimit, RATE_LIMITS } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** DELETE /api/me/data — hard delete of every analysis and CV for the caller. */
export async function DELETE(request: Request) {
  const identity = await getIdentity();
  const limit = rateLimit(`${clientKey(request, identity.userId)}:delete`, RATE_LIMITS.delete);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const removed = await deleteUserData(identity.storageKey);
  return NextResponse.json({ deleted: true, ...removed });
}
