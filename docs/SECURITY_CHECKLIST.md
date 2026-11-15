# Security checklist

Status: **Phase 7 complete.** Every line ends pass/fail with the evidence a
reviewer can check themselves. Nothing here is aspirational — if it is not
true yet, it says so.

Run the evidence yourself: `npm test`, `npm run lint`, `npm run typecheck`.

## Input validation

- [x] Every API route validates its body with zod — `lib/api/schemas.ts`, used by
      `/api/analyze`, `/api/cv/ingest`, `/api/analysis/[id]/path`. Evidence: each route
      calls `schema.safeParse(...)` and returns `firstIssue()` on failure.
- [x] File uploads limited to PDF, max 5 MB, content-type **and** magic-byte checked —
      `lib/cv/pdf.ts` (`validateUpload`, `hasPdfMagicBytes`). Evidence: `tests/aggregates.test.ts`
      ("upload validation", "checks the file header, not just the declared type").
- [x] PDF parsing performs no code execution — parsed in-process by `unpdf` (pdf.js).
      No shell-out, no `eval`, no external binary.

## Auth and access

- [x] RLS on `profiles`, `cv_uploads`, `analyses` (own rows only) —
      `supabase/migrations/0001_init.sql`, policies `*_self_*`.
- [x] Reference tables read-only to `authenticated` and `anon` — policy `reference_read`
      (select-only) so the signed-out demo works; writes need the service role.
- [x] `llm_audit_log` insert-only for the service role — no select/update/delete policy
      exists for it.
- [x] Service-role key never imported into client code — `SUPABASE_SERVICE_ROLE_KEY` is
      read only in `lib/supabase/server.ts` (server-only); grep for it returns no
      `NEXT_PUBLIC_` variant.
- [x] Ownership checks use the anonymous id for signed-out users — `lib/auth/session.ts`
      `ownerKey()`. Fixed this session: the routes compared against `identity.userId`,
      which is `null` when signed out, so an anonymous visitor could never read back
      their own analysis (404 on `/api/analysis/[id]`).

## Privacy

- [x] PII scrubber unit tested with sample CVs — `lib/pii/scrub.test.ts` (15 tests).
- [x] Fairness test: same CV with different name/gender/university/district gives an
      **identical** score — `tests/fairness.test.ts`. It also asserts the scrubbed texts
      are byte-identical, which is how it caught two real leaks this session:
      university acronyms (`BUET`) and district names (`Chattogram`) were surviving
      scrubbing. Both are now redacted (`[INSTITUTION]`, `[LOCATION]`).
- [x] Consent captured before upload — `/api/cv/ingest` rejects `consent !== true` with
      400, and stores `consent_at` on the `cv_uploads` row (`cv_uploads.consent_at`).
- [x] Export-my-data and delete-my-data work end to end — `/api/me/export` (single JSON
      with analyses + CV uploads) and `/api/me/data` DELETE (hard delete, plus the
      Supabase path deletes the storage object). Verified by hand in both local and
      Supabase code paths; the local path is exercised on every demo run.
- [x] 30-day CV retention — `purge_expired_cv_uploads()` in `0001_init.sql`, with the
      pg_cron schedule written as a SQL comment. **You** must enable the cron job or
      call it from a scheduler; it does not run by itself on a fresh project.
- [x] Audit log stores a hash, never the text — `lib/audit.ts` (`hashPrompt`).

## Transport and headers

- [x] Security headers set — `next.config.ts`: `X-Content-Type-Options`,
      `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, plus HSTS in production.
- [x] CSP added — enforced in production, `Report-Only` in development so a local
      experiment cannot break the demo. **Known limitation:** `script-src` includes
      `'unsafe-inline'` because Next.js hydration bootstrap needs it without per-request
      nonces. Moving to nonces (middleware-generated, read in the root layout) is the
      tracked follow-up; it is deliberately not hidden here.
- [x] Rate limiting per user and per IP — `lib/rate-limit.ts`, applied to all five
      mutating routes: ingest 10/min, analyze 8/min, path 10/min, export 5/min,
      delete 5/min. In-memory, so it resets on restart and is per-instance on
      serverless; a hosted deployment should move this to Upstash/Redis.
- [x] No secrets in responses — API errors return fixed strings; the real error goes to
      `console.error` only. The page error boundary prints a digest, not a stack.

## Transparency

- [x] "Estimates, not predictions" shown with every score — `messages/*/score.estimateNotice`,
      rendered under the gauge on every results page.
- [x] Confidence labels and AI-estimated tags visible — the skill table shows a
      confidence pill per skill and an "AI-estimated" badge whenever task exposure did
      not come from a published dataset. Skills with no linked task data show "No data"
      instead of a number, and are excluded from the overall score.
- [x] Methodology page explains formulas, weights and limitations — `/methodology` renders
      `SCORING_WEIGHTS` and `QUADRANT_MEANING` straight from `lib/scoring/config.ts`, so
      the page cannot disagree with the code, plus live dataset counts from the provider.
- [x] Aggregate views enforce k-anonymity with a minimum cohort of 5 — `lib/aggregates.ts`
      (`MIN_COHORT`, `applyKAnonymity`, `isPublishable`), tested in
      `tests/aggregates.test.ts`. The MVP ships no public aggregate view yet; the
      helper exists so the first one cannot forget the rule.

## Not done / accepted risk

- Rate limiting is per-process, not shared across instances.
- CSP still allows inline scripts (see above).
- No authentication UI: the product is intentionally usable signed out, and account
  creation is post-MVP. Anonymous data lives behind a cookie (`fp_anon`, httpOnly,
  180 days) and is deleted by "Delete my data".
- No malware scanning on uploaded PDFs beyond type/size/header checks.
