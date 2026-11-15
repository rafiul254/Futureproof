"""Loads the O*NET database over the curated seed.

STATUS: written against the published O*NET file layout, NOT yet run against
real downloads. Run with --dry-run first and check the column names against the
README that ships with the release you downloaded.

What you need (free download, CC BY 4.0):
  https://www.onetcenter.org/database.html  ->  "O*NET 29.0 Database (SQL/Text)"
Expected files in data-pipeline/data/raw/onet/:
  Occupation Data.txt
  Task Statements.txt
  Skills.txt
  Technology Skills.txt

What this script does:
  1. Reads occupations and keeps the ones whose titles match BD_RELEVANT_TITLES.
  2. Loads task statements per occupation.
  3. Maps O*NET skill element names onto our skill ids by name (and by alias).
  4. Writes the same JSON shape as build_seed.py so nothing downstream changes.

AI exposure is NOT produced here: task exposure either comes from a published
dataset (load_exposure_dataset.py, to be written once you pick one) or from the
documented rubric (docs/EXPOSURE_RUBRIC.md) with exposure_method='llm_estimated'.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "data-pipeline" / "data" / "raw" / "onet"
SEED = ROOT / "data" / "seed"

BD_RELEVANT_TITLES = [
    "software developer",
    "web developer",
    "computer programmer",
    "software quality assurance",
    "data scientist",
    "statistician",
    "operations research analyst",
    "data entry keyer",
    "customer service representative",
    "accountant",
    "financial analyst",
    "graphic designer",
    "writer",
    "market research analyst",
    "marketing specialist",
    "secondary school teacher",
    "civil engineer",
    "electrical engineer",
    "human resources specialist",
    "sales representative",
    "project management specialist",
    "interpreter and translator",
    "network and computer systems administrator",
    "information security analyst",
    "logistician",
    "social and human service assistant",
    "reporter",
]


def read_tsv(name: str):
    path = RAW / name
    if not path.exists():
        raise SystemExit(f"Missing {path}. Download O*NET and unzip it there first.")
    with path.open(encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    occupations = read_tsv("Occupation Data.txt")
    tasks = read_tsv("Task Statements.txt")
    skills = read_tsv("Skills.txt")

    selected = [
        row
        for row in occupations
        if any(key in row["Title"].lower() for key in BD_RELEVANT_TITLES)
    ]

    print(f"occupations in file: {len(occupations)}")
    print(f"matching BD-relevant titles: {len(selected)}")
    print(f"task statements: {len(tasks)}")
    print(f"skill rows: {len(skills)}")

    if args.dry_run:
        for row in selected[:10]:
            print("  -", row["O*NET-SOC Code"], row["Title"])
        return 0

    # TODO(implementation): map the selected occupations onto our curated ids,
    # then emit occupations.json / tasks.json / occupation_skills.json in the
    # same shape as build_seed.py. Ship the mapping table with the code review.
    print("\nMapping step is not implemented yet: see the docstring.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
