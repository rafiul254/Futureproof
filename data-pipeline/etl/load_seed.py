"""Loads data/seed/*.json into Supabase.

Prerequisites:
  1. python data-pipeline/etl/build_seed.py
  2. python data-pipeline/etl/generate_postings.py
  3. python data-pipeline/etl/build_courses.py
  4. supabase/migrations applied (supabase db push)
  5. .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

Idempotent: rows are upserted by primary key, so re-running is safe.

Usage:
  python data-pipeline/etl/load_seed.py            # load everything
  python data-pipeline/etl/load_seed.py --dry-run  # print counts only
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "data" / "seed"

BATCH = 500


def load_json(name: str):
    return json.loads((SEED / name).read_text(encoding="utf-8"))


def chunked(rows, size=BATCH):
    for i in range(0, len(rows), size):
        yield rows[i : i + size]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    tables = {
        "skills": [
            {
                "id": r["id"],
                "name": r["name"],
                "name_bn": r["name_bn"],
                "category": r["category"],
                "source_id": r["source_id"],
            }
            for r in load_json("skills.json")
        ],
        "occupations": [
            {
                "id": r["id"],
                "title": r["title"],
                "title_bn": r["title_bn"],
                "onet_code": r["onet_code"],
                "description": r["description"],
            }
            for r in load_json("occupations.json")
        ],
        "tasks": [
            {
                "id": r["id"],
                "occupation_id": r["occupation_id"],
                "description": r["description"],
                "importance": r["importance"],
                "ai_exposure": r["ai_exposure"],
                "exposure_source": r["exposure_source"],
                "exposure_method": r["exposure_method"],
                "exposure_confidence": r["exposure_confidence"],
            }
            for r in load_json("tasks.json")
        ],
        "occupation_skills": [
            {
                "occupation_id": r["occupation_id"],
                "skill_id": r["skill_id"],
                "importance": r["importance"],
            }
            for r in load_json("occupation_skills.json")
        ],
        "task_skills": [
            {"task_id": r["task_id"], "skill_id": r["skill_id"]}
            for r in load_json("task_skills.json")
        ],
        "job_postings": [
            {
                "id": r["id"],
                "title": r["title"],
                "company": r["company"],
                "source": r["source"],
                "source_url": r["source_url"],
                "posted_at": r["posted_at"],
                "location": r["location"],
                "occupation_id": r["occupation_id"],
                "raw_text": r["raw_text"],
                "is_synthetic": r["is_synthetic"],
            }
            for r in load_json("job_postings.json")
        ],
        "posting_skills": [
            {"posting_id": r["posting_id"], "skill_id": r["skill_id"]}
            for r in load_json("posting_skills.json")
        ],
        "skill_demand": [
            {
                "skill_id": r["skill_id"],
                "count_30d": r["count_30d"],
                "count_prev_30d": r["count_prev_30d"],
            }
            for r in load_json("skill_demand.json")
        ],
        "courses": [
            {
                "id": r["id"],
                "title": r["title"],
                "provider": r["provider"],
                "url": r["url"],
                "language": r["language"],
                "cost_usd": r["cost_usd"],
                "duration_hours": r["duration_hours"],
                "level": r["level"],
                "skill_ids": r["skill_ids"],
                "verified": r["verified"],
            }
            for r in load_json("courses.json")
        ],
    }

    print("rows to load:")
    for name, rows in tables.items():
        print(f"  {name:<20}{len(rows):>6}")
    if args.dry_run:
        return 0

    try:
        from dotenv import load_dotenv

        load_dotenv(ROOT / "data-pipeline" / ".env")
        from supabase import create_client
    except ImportError:
        print("Install deps first:  pip install -r requirements.txt", file=sys.stderr)
        return 1

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        return 1

    client = create_client(url, key)

    # Ordered so foreign keys always resolve.
    order = [
        "skills",
        "occupations",
        "tasks",
        "occupation_skills",
        "task_skills",
        "job_postings",
        "posting_skills",
        "skill_demand",
        "courses",
    ]

    for name in order:
        rows = tables[name]
        for batch in chunked(rows):
            client.table(name).upsert(batch).execute()
        print(f"  loaded {name:<20}{len(rows):>6}")

    print("\nDone. Next: python data-pipeline/etl/embed_all.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
