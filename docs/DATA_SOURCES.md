# Data sources

Status: **stub — completed in Phase 1.** Every source used by the app is listed
here with licence, access date, and known limitations. No source is loaded
before it appears in this file.

## Template

| Source | What we take | Licence / terms | Accessed | Limitations |
| --- | --- | --- | --- | --- |
| _example_ | _occupations, tasks_ | _CC BY 4.0_ | _YYYY-MM-DD_ | _US-centric_ |

## Planned sources

1. **O\*NET database** — occupations, task statements, skills, technology skills.
   Licence: CC BY 4.0. Provides `tasks.description`, `occupation_skills.importance`.
   Limitation: United States labour market; role titles mapped to Bangladeshi equivalents.
2. **Task-level AI exposure research** (e.g. the dataset released with
   "GPTs are GPTs", ILO generative-AI exposure work) — `tasks.ai_exposure`
   with `exposure_method = 'published_dataset'`. Licence checked per file.
3. **Open job-posting datasets** (permissive licences only) — `job_postings`,
   used to compute `skill_demand`. Every row keeps `source` and `source_url`.
4. **Manual Bangladesh postings template** — `data-pipeline/data/postings_bd_template.csv`,
   filled by teammates from public pages. Marked `is_synthetic = false` but
   attributed to a manual source.

## Machine translation

Bangla names (`skills.name_bn`, `occupations.title_bn`) are **machine-translated**
and reviewed by a human before launch. They are labelled as machine-translated
in the UI methodology notes until reviewed.
