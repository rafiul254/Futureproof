"""Assembles the curated seed into JSON files the app and the DB loader both read.

Run:  python data-pipeline/etl/build_seed.py

Outputs (project root, data/seed/):
  skills.json, occupations.json, tasks.json,
  occupation_skills.json, task_skills.json

Everything is deterministic: ids are UUIDv5 from a fixed namespace, so re-running
produces byte-identical files and the same ids in Postgres.

HONESTY NOTES (mirrored in docs/DATA_SOURCES.md):
  - All rows are `source = 'curated'`, NOT O*NET. `onet_code` is a best-effort
    pointer to a comparable O*NET occupation, not a loaded O*NET record.
  - `ai_exposure` values are rubric estimates per docs/EXPOSURE_RUBRIC.md and are
    stored with exposure_method='llm_estimated'.
  - task_skills links are keyword-derived heuristics, not authoritative mappings.
"""

from __future__ import annotations

import json
import re
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from seed import extra_skills, occupations_a, occupations_b, occupations_c, occupations_d  # noqa: E402
from seed import alias_boost, extra_skills, occupations_a, occupations_b, occupations_c, occupations_d  # noqa: E402
from seed import skills as skills_mod  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "seed"

# Fixed namespace so ids are stable across machines and re-runs.
NS = uuid.UUID("6f0a3f6c-6f70-5f0a-9c1e-000000000001")


def uid(kind: str, key: str) -> str:
    return str(uuid.uuid5(NS, f"{kind}:{key}"))


def apply_alias_boost(rows: list[dict]) -> None:
    """Adds the CV surface forms from seed/alias_boost.py.

    Fails loudly on an unknown key so this table can never silently drift away
    from the taxonomy.
    """
    by_key = {r["key"]: r for r in rows}
    unknown = [k for k in alias_boost.EXTRA_ALIASES if k not in by_key]
    if unknown:
        raise SystemExit(f"alias_boost.py references unknown skills: {', '.join(unknown)}")

    added = 0
    for key, aliases in alias_boost.EXTRA_ALIASES.items():
        row = by_key[key]
        for alias in aliases:
            lowered = alias.lower()
            if lowered in {a.lower() for a in row["aliases"]}:
                continue
            row["aliases"].append(alias)
            added += 1
    print(f"alias boost       {added:>5} aliases added")


def build_skill_rows():
    rows = []
    seen = set()
    for skill_id, name_en, name_bn, category, aliases in skills_mod.all_skills():
        seen.add(skill_id)
        rows.append(
            {
                "id": uid("skill", skill_id),
                "key": skill_id,
                "name": name_en,
                "name_bn": name_bn,
                "category": category,
                "aliases": aliases,
                "source_id": f"curated:{skill_id}",
            }
        )
    for skill_id, name_en, name_bn, category, aliases in extra_skills.EXTRA_SKILLS:
        if skill_id in seen:
            raise ValueError(f"extra skill already defined: {skill_id}")
        seen.add(skill_id)
        rows.append(
            {
                "id": uid("skill", skill_id),
                "key": skill_id,
                "name": name_en,
                "name_bn": name_bn,
                "category": category,
                "aliases": aliases,
                "source_id": f"curated:{skill_id}",
            }
        )
    return rows


TOKEN_RE = re.compile(r"[a-z0-9+#.]+")


def tokens_of(text: str) -> set[str]:
    return {t for t in TOKEN_RE.findall(text.lower()) if len(t) >= 3}


def skill_match_phrases(row: dict) -> list[str]:
    phrases = [row["name"].lower(), row["key"].replace("-", " ")]
    phrases += [a.lower() for a in row["aliases"]]
    return [p for p in phrases if len(p) >= 3]


def confidence_for(exposure: float) -> float:
    """Extremes of the rubric are easier to judge than the middle."""
    return round(0.5 + 0.2 * (abs(exposure - 0.5) * 2), 2)


def main() -> int:
    skill_rows = build_skill_rows()
    apply_alias_boost(skill_rows)
    by_key = {r["key"]: r for r in skill_rows}

    occupation_defs = (
        occupations_a.OCCUPATIONS
        + occupations_b.OCCUPATIONS
        + occupations_c.OCCUPATIONS
        + occupations_d.OCCUPATIONS
    )

    # Validate that every referenced skill exists.
    missing = []
    for occ in occupation_defs:
        for skill_key, _importance in occ["skills"]:
            if skill_key not in by_key:
                missing.append(f"{occ['id']} -> {skill_key}")
    if missing:
        raise SystemExit("Unknown skill references:\n  " + "\n  ".join(missing))

    occupation_rows, task_rows, occ_skill_rows, task_skill_rows = [], [], [], []

    for occ in occupation_defs:
        occ_id = uid("occupation", occ["id"])
        occupation_rows.append(
            {
                "id": occ_id,
                "key": occ["id"],
                "title": occ["title"],
                "title_bn": occ["title_bn"],
                "onet_code": occ["onet"],
                "description": occ["description"],
                "source": "curated",
            }
        )

        occ_skills = []  # (skill_row, importance)
        for skill_key, importance in occ["skills"]:
            row = by_key[skill_key]
            occ_skills.append((row, importance))
            occ_skill_rows.append(
                {
                    "occupation_id": occ_id,
                    "skill_id": row["id"],
                    "skill_key": skill_key,
                    "importance": importance,
                }
            )

        # Highest-importance skills first: used as the fallback when a task
        # matches no skill phrase (documented heuristic).
        ranked = sorted(occ_skills, key=lambda pair: -pair[1])

        for index, (description, importance, exposure) in enumerate(occ["tasks"]):
            task_id = uid("task", f"{occ['id']}:{index}:{description[:40]}")
            task_rows.append(
                {
                    "id": task_id,
                    "occupation_id": occ_id,
                    "occupation_key": occ["id"],
                    "description": description,
                    "importance": importance,
                    "ai_exposure": exposure,
                    "exposure_source": "docs/EXPOSURE_RUBRIC.md",
                    "exposure_method": "llm_estimated",
                    "exposure_confidence": confidence_for(exposure),
                }
            )

            text = description.lower()
            task_tokens = tokens_of(description)
            scored = []
            for row, skill_importance in occ_skills:
                score = 0
                for phrase in skill_match_phrases(row):
                    if phrase in text:
                        score += 4
                score += len(task_tokens & tokens_of(row["name"]))
                for alias in row["aliases"]:
                    score += len(task_tokens & tokens_of(alias)) * 2
                if score > 0:
                    scored.append((score, skill_importance, row))

            scored.sort(key=lambda t: (-t[0], -t[1]))
            linked = [row for _s, _i, row in scored[:2]]
            if not linked:
                linked = [ranked[0][0]]

            for row in linked:
                task_skill_rows.append(
                    {
                        "task_id": task_id,
                        "skill_id": row["id"],
                        "skill_key": row["key"],
                    }
                )

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    payloads = {
        "skills.json": skill_rows,
        "occupations.json": occupation_rows,
        "tasks.json": task_rows,
        "occupation_skills.json": occ_skill_rows,
        "task_skills.json": task_skill_rows,
    }
    for name, rows in payloads.items():
        (OUT_DIR / name).write_text(
            json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )

    print(f"skills            {len(skill_rows):>5}")
    print(f"occupations       {len(occupation_rows):>5}")
    print(f"tasks             {len(task_rows):>5}")
    print(f"occupation_skills {len(occ_skill_rows):>5}")
    print(f"task_skills       {len(task_skill_rows):>5}")

    linked_tasks = len({r["task_id"] for r in task_skill_rows})
    print(f"tasks with >=1 skill link: {linked_tasks}/{len(task_rows)}")
    print(f"written to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
