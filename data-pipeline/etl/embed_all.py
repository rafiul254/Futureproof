"""Generates embeddings for skills, occupations and job postings.

Providers:
  gemini  -> text-embedding-004 (768 dims). Set GOOGLE_API_KEY.
  openai  -> text-embedding-3-small (1536 dims). Set OPENAI_API_KEY.
  auto    -> whichever key exists (default)

If you use Gemini, apply supabase/migrations/0002_gemini_embedding_dimensions.sql
so the column type matches.

Usage:
  python data-pipeline/etl/embed_all.py --provider auto
  python data-pipeline/etl/embed_all.py --provider gemini --only skills
"""

from __future__ import annotations

import argparse
import json
import os
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED = ROOT / "data" / "seed"

BATCH = 64


def embed_gemini(texts: list[str], model: str) -> list[list[float]]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:batchEmbedContents?key={os.environ['GOOGLE_API_KEY']}"
    payload = {
        "requests": [
            {"model": f"models/{model}", "content": {"parts": [{"text": t}]}} for t in texts
        ]
    }
    request = urllib.request.Request(
        url, data=json.dumps(payload).encode(), headers={"content-type": "application/json"}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.loads(response.read())
    return [e.get("values", []) for e in data.get("embeddings", [])]


def embed_openai(texts: list[str], model: str) -> list[list[float]]:
    request = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=json.dumps({"model": model, "input": texts}).encode(),
        headers={
            "content-type": "application/json",
            "authorization": f"Bearer {os.environ['OPENAI_API_KEY']}",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.loads(response.read())
    return [d["embedding"] for d in sorted(data["data"], key=lambda d: d["index"])]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", default="auto", choices=["auto", "gemini", "openai"])
    parser.add_argument("--only", default="all", choices=["all", "skills", "occupations", "postings"])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    from dotenv import load_dotenv

    load_dotenv(ROOT / "data-pipeline" / ".env")

    provider = args.provider
    if provider == "auto":
        provider = "gemini" if os.environ.get("GOOGLE_API_KEY") else "openai"
    if provider == "gemini" and not os.environ.get("GOOGLE_API_KEY"):
        print("Set GOOGLE_API_KEY (or use --provider openai)", file=__import__("sys").stderr)
        return 1
    if provider == "openai" and not os.environ.get("OPENAI_API_KEY"):
        print("Set OPENAI_API_KEY (or use --provider gemini)", file=__import__("sys").stderr)
        return 1

    model = (
        os.environ.get("GEMINI_EMBEDDING_MODEL", "text-embedding-004")
        if provider == "gemini"
        else os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
    )
    print(f"provider={provider} model={model}")

    plan = {
        "skills": ("skills.json", lambda r: [r["name"], *r["aliases"]]),
        "occupations": ("occupations.json", lambda r: [r["title"], r["description"] or ""]),
        "postings": ("job_postings.json", lambda r: [r["title"], r["raw_text"] or ""]),
    }

    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    client = None
    if not args.dry_run:
        if not (url and key):
            print("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY", file=__import__("sys").stderr)
            return 1
        from supabase import create_client

        client = create_client(url, key)

    for name, (filename, text_of) in plan.items():
        if args.only not in ("all", name):
            continue
        rows = json.loads((SEED / filename).read_text(encoding="utf-8"))
        print(f"{name}: {len(rows)} rows")

        for start in range(0, len(rows), BATCH):
            batch = rows[start : start + BATCH]
            texts = [" | ".join(text_of(r))[:4000] for r in batch]
            vectors = (
                embed_gemini(texts, model) if provider == "gemini" else embed_openai(texts, model)
            )
            if client:
                payload = [{"id": r["id"], "embedding": v} for r, v in zip(batch, vectors)]
                client.table(name).upsert(payload).execute()
            print(f"  embedded {min(start + BATCH, len(rows))}/{len(rows)}")
            time.sleep(0.2)

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
