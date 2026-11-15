"""Checks every course URL and reports which ones can be marked verified.

Rule 3 of the build prompt: never invent URLs, and never show an unverified
course to a user. This script is the human-in-the-loop step.

Usage:
  python data-pipeline/etl/verify_courses.py              # print a report
  python data-pipeline/etl/verify_courses.py --write      # set verified=true for 200s
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
COURSES = ROOT / "data" / "seed" / "courses.json"
CSV = ROOT / "data-pipeline" / "data" / "courses_seed.csv"

TIMEOUT = 12


def check(url: str) -> tuple[str, int | None, str | None]:
    if not url or url == "TODO_VERIFY":
        return url, None, "no-url"
    request = urllib.request.Request(url, method="GET", headers={"User-Agent": "FutureProof/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return url, response.status, None
    except Exception as error:  # noqa: BLE001 - report, do not crash
        return url, None, str(error)[:80]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true", help="flip verified=true for reachable URLs")
    args = parser.parse_args()

    courses = json.loads(COURSES.read_text(encoding="utf-8"))
    urls = [c["url"] for c in courses]

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(check, urls))

    ok, broken = [], []
    for course, (url, status, error) in zip(courses, results):
        if status == 200:
            ok.append(course["key"])
        else:
            broken.append((course["key"], course["title"], status, error))

    print(f"reachable (200): {len(ok)}/{len(courses)}")
    print(f"unreachable:     {len(broken)}")
    for key, title, status, error in broken:
        print(f"  - {key:<38} {title[:46]:<46} {status or error}")

    if args.write:
        reachable = set(ok)
        for course in courses:
            if course["key"] in reachable:
                course["verified"] = True
        COURSES.write_text(json.dumps(courses, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print(f"\nWrote verified=true for {len(reachable)} courses to {COURSES}")
        print("Also update data-pipeline/data/courses_seed.csv so the change survives a rebuild.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
