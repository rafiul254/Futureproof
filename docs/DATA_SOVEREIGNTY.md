# Data sovereignty, retention and ownership

Status: **stub — completed in Phase 7.**

## Region

Supabase project: **Singapore (ap-southeast-1)** — the closest supported region
to Bangladesh with low latency and no transfer of personal data to the EU/US at rest.

## What leaves the system

| Data | Leaves? | Where | Notes |
| --- | --- | --- | --- |
| CV text | No (only scrubbed text) | Anthropic (LLM) | Names, emails, phones, addresses, DOB, gender, NID and institution names removed first |
| Embedding input | Yes (short strings) | Embedding provider | Skill and occupation names only, never CV text |
| Analytics | No | — | No third-party analytics in the MVP |

## Retention

- CV files in Storage: deleted automatically after **30 days**.
- `cv_uploads.scrubbed_text`: deleted with the file.
- `analyses`: kept until the user deletes them (results stay valid after the CV expires).
- `llm_audit_log`: purpose, model, token counts, prompt hash. **Never raw CV text.**

## Ownership

The user owns their data. Export (JSON) and delete-everything are self-service.
Deletion cascades across `profiles`, `cv_uploads`, `analyses`, and storage objects.
