import { NextResponse } from 'next/server';

import { logLlmCall } from '@/lib/audit';
import { ensureAnonymousId, getIdentity } from '@/lib/auth/session';
import { extractPdfText, validateUpload } from '@/lib/cv/pdf';
import { scrubPii } from '@/lib/pii/scrub';
import { saveCv } from '@/lib/analysis/store';
import { clientKey, rateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { ingestTextSchema, firstIssue } from '@/lib/api/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/cv/ingest
 * Accepts either multipart/form-data with a PDF, or JSON { text }.
 * Returns { cvId, scrubbedLength, redactions, pages }.
 *
 * The raw file is never persisted: only the scrubbed text is stored.
 */
export async function POST(request: Request) {
  const identity = await getIdentity();
  const limit = rateLimit(`${clientKey(request, identity.userId)}:ingest`, RATE_LIMITS.ingest);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait a moment and try again.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) } },
    );
  }

  const storageKey = identity.storageKey ?? (await ensureAnonymousId());
  const contentType = request.headers.get('content-type') ?? '';

  try {
    let filename: string | null = null;
    let pages = 0;
    let consent = false;
    let scrub: ReturnType<typeof scrubPii> = { text: '', redactions: [] };

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      const file = form.get('file');
      consent = form.get('consent') === 'true';

      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file was uploaded.' }, { status: 400 });
      }

      const validationError = validateUpload({
        size: file.size,
        type: file.type,
        filename: file.name,
      });
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      if (!consent) {
        return NextResponse.json(
          { error: 'Please confirm consent before uploading your CV.' },
          { status: 400 },
        );
      }

      filename = file.name;
      const buffer = await file.arrayBuffer();
      const extracted = await extractPdfText(buffer);
      if (!extracted.ok) {
        return NextResponse.json(
          { error: extracted.error ?? 'Could not read the PDF.' },
          { status: 422 },
        );
      }
      pages = extracted.pageCount;
      scrub = scrubPii(extracted.text);
    } else {
      const body = ingestTextSchema.safeParse(await request.json().catch(() => null));
      if (!body.success) {
        return NextResponse.json({ error: firstIssue(body.error) }, { status: 400 });
      }
      consent = body.data.consent;
      filename = body.data.filename ?? null;
      scrub = scrubPii(body.data.text);
    }

    const consentAt = consent ? new Date().toISOString() : null;
    const cv = await saveCv({
      userId: storageKey,
      filename,
      scrubbedText: scrub.text,
      redactions: scrub.redactions,
      consentAt,
    });

    await logLlmCall({
      userId: storageKey,
      purpose: 'cv_ingest',
      model: 'none',
    });

    return NextResponse.json({
      cvId: cv.id,
      scrubbedLength: scrub.text.length,
      // Already scrubbed. Returned so the next step can send it back instead of relying on
      // server-side state, which a serverless host does not keep between requests.
      scrubbedText: scrub.text,
      redactions: scrub.redactions,
      pages,
      consentAt,
    });
  } catch (error) {
    console.error('[api/cv/ingest]', error);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
