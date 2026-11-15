# Supabase

- `migrations/` — SQL migrations, numbered and append-only (Phase 1+).
- `config.toml` — local dev config. The deployed project lives in the **Singapore**
  region (closest low-latency region to Bangladesh, data residency documented in
  `docs/DATA_SOVEREIGNTY.md`).

## Commands

```bash
supabase link --project-ref <ref>
supabase db push                       # apply migrations to the hosted project
supabase db diff -f <name>             # generate a migration from local diff
supabase gen types typescript --project-id <ref> > ../lib/supabase/database.types.ts
```

## Storage

Private bucket `cvs` (PDF only, max 5 MB). Access is via short-lived signed URLs;
objects expire after 30 days (Phase 7 retention job).
