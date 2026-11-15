# Data pipeline

Loads, cleans and embeds the reference data that the scoring engine reads.

```
data-pipeline/
  etl/            # one script per source: fetch -> normalise -> upsert
  data/raw/       # untouched downloads (gitignored)
  data/processed/ # cleaned CSVs ready to load
  data/courses_seed.csv        # hand-curated, every URL verified by a human
  data/postings_bd_template.csv
```

Rules:
1. Every source is recorded in `docs/DATA_SOURCES.md` with licence and access date.
2. Only sources whose licence/terms permit reuse are used.
3. Synthetic rows (sample CVs, template postings) are always `is_synthetic = true`.
4. Unverified course URLs are stored as `TODO_VERIFY` and stay hidden from users.

Usage:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # add SUPABASE_SERVICE_ROLE_KEY
python etl/embed_all.py
```
