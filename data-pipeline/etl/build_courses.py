"""Converts data-pipeline/data/courses_seed.csv into data/seed/courses.json.

Rules enforced here:
  - Unknown skill keys are dropped with a warning (never silently invent a link).
  - `verified = false` rows keep url as-is only if present, otherwise `TODO_VERIFY`.
  - Only `verified = true` courses are ever shown to users (enforced in the app too).

Verify URLs before shipping:  python data-pipeline/etl/verify_courses.py
"""

from __future__ import annotations

import csv
import json
import re
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = ROOT / "data" / "seed"
CSV_PATH = ROOT / "data-pipeline" / "data" / "courses_seed.csv"
NS = uuid.UUID("6f0a3f6c-6f70-5f0a-9c1e-000000000001")


def slugify(value: str) -> str:
    value = value.strip().lower().replace("/", "-")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value


def main() -> int:
    skills = json.loads((SEED_DIR / "skills.json").read_text(encoding="utf-8"))
    by_key = {s["key"]: s for s in skills}

    rows = []
    unknown = set()
    with CSV_PATH.open(encoding="utf-8") as handle:
        for raw in csv.DictReader(handle):
            key = slugify(raw["key"] or "")
            if not key:
                continue

            skill_ids = []
            for skill_key in (raw.get("skill_keys") or "").split("|"):
                skill_key = skill_key.strip()
                if not skill_key:
                    continue
                if skill_key in by_key:
                    skill_id = by_key[skill_key]["id"]
                    if skill_id not in skill_ids:
                        skill_ids.append(skill_id)
                else:
                    unknown.add(skill_key)

            verified = (raw.get("verified") or "").strip().lower() == "true"
            url = (raw.get("url") or "").strip()

            rows.append(
                {
                    "id": str(uuid.uuid5(NS, f"course:{key}")),
                    "key": key,
                    "title": raw["title"].strip(),
                    "provider": raw["provider"].strip(),
                    "url": url or "TODO_VERIFY",
                    "language": (raw.get("language") or "en").strip(),
                    "cost_usd": float(raw["cost_usd"]) if (raw.get("cost_usd") or "").strip() else 0.0,
                    "duration_hours": float(raw["duration_hours"])
                    if (raw.get("duration_hours") or "").strip()
                    else None,
                    "level": (raw.get("level") or "beginner").strip(),
                    "skill_ids": skill_ids,
                    "verified": verified,
                    "notes": (raw.get("notes") or "").strip(),
                }
            )

    (SEED_DIR / "courses.json").write_text(
        json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    verified_count = sum(1 for r in rows if r["verified"])
    print(f"courses          {len(rows)}")
    print(f"verified=true    {verified_count}  (shown to users)")
    print(f"verified=false   {len(rows) - verified_count}  (hidden until a human verifies)")
    if unknown:
        print("unknown skill keys dropped: " + ", ".join(sorted(unknown)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
