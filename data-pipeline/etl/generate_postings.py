"""Generates SYNTHETIC job postings and derives skill_demand.

WHY SYNTHETIC: no permissively licensed Bangladesh job-posting feed is wired up yet.
These rows exist so the demand side of the score has a real, computed signal during
development and demos. They are stored with `is_synthetic = true`, shown behind a
"Sample data" badge in the UI, and replaced the moment a licensed feed is loaded.

Replaces them with real data:  python data-pipeline/etl/load_postings.py <file.csv>
"""

from __future__ import annotations

import json
import random
import sys
import uuid
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = ROOT / "data" / "seed"
NS = uuid.UUID("6f0a3f6c-6f70-5f0a-9c1e-000000000001")

TOTAL_POSTINGS = 380
SEED = 20261012
WINDOW_DAYS = 60
RECENT_DAYS = 30

# Relative hiring volume per occupation in the Bangladeshi graduate market.
# Curated approximations used only to weight the synthetic sample.
OCC_WEIGHT = {
    "software-developer": 10,
    "web-developer": 7,
    "mobile-app-developer": 4,
    "qa-engineer": 5,
    "data-analyst": 7,
    "data-scientist": 4,
    "ml-engineer": 3,
    "data-entry-clerk": 6,
    "customer-support-rep": 8,
    "call-center-agent": 7,
    "accountant": 8,
    "bank-officer": 6,
    "financial-analyst": 3,
    "graphic-designer": 6,
    "ui-ux-designer": 5,
    "content-writer": 6,
    "digital-marketing-specialist": 9,
    "apparel-merchandiser": 8,
    "garments-production-supervisor": 5,
    "school-teacher": 7,
    "civil-engineer": 6,
    "electrical-engineer": 5,
    "hr-officer": 6,
    "sales-executive": 10,
    "project-coordinator": 5,
    "translator": 3,
    "network-administrator": 4,
    "cybersecurity-analyst": 3,
    "supply-chain-coordinator": 5,
    "ngo-field-officer": 5,
    "journalist": 3,
    "research-assistant": 3,
}

TITLE_VARIANTS = {
    "software-developer": ["Software Engineer", "Software Developer", "Junior Software Engineer", "Backend Engineer"],
    "web-developer": ["Web Developer", "Frontend Developer", "Full Stack Developer (Web)", "WordPress Developer"],
    "mobile-app-developer": ["Mobile App Developer", "Android Developer", "Flutter Developer", "iOS Developer"],
    "qa-engineer": ["QA Engineer", "Software QA Tester", "SQA Engineer", "Automation Test Engineer"],
    "data-analyst": ["Data Analyst", "Business Analyst (Data)", "MIS Officer", "Reporting Analyst"],
    "data-scientist": ["Data Scientist", "Junior Data Scientist", "Data Scientist (Python)"],
    "ml-engineer": ["Machine Learning Engineer", "ML Engineer", "AI Engineer"],
    "data-entry-clerk": ["Data Entry Operator", "Data Entry Clerk", "Data Processing Assistant"],
    "customer-support-rep": ["Customer Support Executive", "Customer Care Officer", "Support Agent"],
    "call-center-agent": ["Call Center Agent", "BPO Executive", "Telesales Agent", "Inbound Support Agent"],
    "accountant": ["Accountant", "Accounts Officer", "Accounts Executive", "Junior Accountant"],
    "bank-officer": ["Bank Officer", "Branch Officer", "Officer - Retail Banking", "Relationship Officer"],
    "financial-analyst": ["Financial Analyst", "Investment Analyst", "Financial Planning Analyst"],
    "graphic-designer": ["Graphic Designer", "Visual Designer", "Creative Designer"],
    "ui-ux-designer": ["UI/UX Designer", "Product Designer", "UX Designer"],
    "content-writer": ["Content Writer", "Copywriter", "Content Executive", "Technical Content Writer"],
    "digital-marketing-specialist": ["Digital Marketing Executive", "Digital Marketing Specialist", "Social Media Marketing Executive", "SEO Executive"],
    "apparel-merchandiser": ["Merchandiser (RMG)", "Assistant Merchandiser", "Knitwear Merchandiser"],
    "garments-production-supervisor": ["Production Supervisor", "Floor In-Charge (Garments)", "Production Officer (RMG)"],
    "school-teacher": ["Teacher (Secondary)", "Assistant Teacher", "Subject Teacher"],
    "civil-engineer": ["Civil Engineer", "Site Engineer", "Junior Civil Engineer", "Structural Engineer"],
    "electrical-engineer": ["Electrical Engineer", "Maintenance Engineer (Electrical)", "Electrical Design Engineer"],
    "hr-officer": ["HR Officer", "HR Executive", "Recruitment Officer", "People Operations Executive"],
    "sales-executive": ["Sales Executive", "Territory Sales Officer", "Business Development Executive", "Sales Officer"],
    "project-coordinator": ["Project Coordinator", "Project Assistant", "Programme Coordinator"],
    "translator": ["Translator (English-Bangla)", "Bangla Translator", "Localisation Specialist"],
    "network-administrator": ["Network Administrator", "System Administrator", "IT Support Engineer"],
    "cybersecurity-analyst": ["Cybersecurity Analyst", "SOC Analyst", "Information Security Analyst"],
    "supply-chain-coordinator": ["Supply Chain Coordinator", "Logistics Coordinator", "Inventory Officer"],
    "ngo-field-officer": ["Field Officer", "Programme Officer (Field)", "Community Mobilisation Officer"],
    "journalist": ["Reporter", "Staff Correspondent", "Sub-Editor"],
    "research-assistant": ["Research Assistant", "Research Associate", "Data Enumerator"],
}

COMPANIES = [
    "Aarong Digital", "Techno Valley Ltd", "Bengal Soft Systems", "Dhaka Analytics Hub",
    "Prime Garments Ltd", "Chattogram Logistics Ltd", "Greenfield Pharma", "City Bank Digital",
    "Northline Media", "Shikhor Solutions", "Delta Apparels", "Rupayan Engineering",
    "Meghna Tech Park", "Padma Health Services", "Sundarbans NGO Foundation",
    "Bijoy IT Services", "Karnaphuli Traders", "Tejgaon Industrial Works",
]

LOCATIONS = [
    "Dhaka", "Dhaka (Gulshan)", "Dhaka (Uttara)", "Chattogram", "Sylhet",
    "Rajshahi", "Khulna", "Gazipur", "Narayanganj", "Remote (Bangladesh)",
]


def uid(kind: str, key: str) -> str:
    return str(uuid.uuid5(NS, f"{kind}:{key}"))


def pick_skills(occ_skills: list[dict], rng: random.Random) -> list[str]:
    """Weighted sample of an occupation's skills, biased to high importance."""
    pool = [(row["skill_id"], row["importance"]) for row in occ_skills]
    pool.sort(key=lambda pair: -pair[1])
    wanted = rng.randint(4, min(8, len(pool)))
    weights = [w**2 for _s, w in pool]
    chosen = set()
    attempts = 0
    while len(chosen) < wanted and attempts < 40:
        picked = rng.choices(pool, weights=weights, k=1)[0]
        chosen.add(picked[0])
        attempts += 1
    return sorted(chosen)


def main() -> int:
    rng = random.Random(SEED)

    occupations = json.loads((SEED_DIR / "occupations.json").read_text(encoding="utf-8"))
    occ_skills = json.loads((SEED_DIR / "occupation_skills.json").read_text(encoding="utf-8"))
    skills = json.loads((SEED_DIR / "skills.json").read_text(encoding="utf-8"))

    skills_by_id = {s["id"]: s for s in skills}
    occ_by_key = {o["key"]: o for o in occupations}
    skills_by_occ: dict[str, list[dict]] = {}
    for row in occ_skills:
        key = next(o["key"] for o in occupations if o["id"] == row["occupation_id"])
        skills_by_occ.setdefault(key, []).append(row)

    today = date(2026, 10, 12)
    total_weight = sum(OCC_WEIGHT.get(o["key"], 1) for o in occupations)

    postings, posting_skills = [], []
    serial = 0
    for occ in occupations:
        weight = OCC_WEIGHT.get(occ["key"], 1)
        count = max(3, round(TOTAL_POSTINGS * weight / total_weight))
        for _ in range(count):
            serial += 1
            posting_id = uid("posting", f"synthetic-{serial}")
            days_ago = rng.randint(0, WINDOW_DAYS - 1)
            posted = today - timedelta(days=days_ago)
            title = rng.choice(TITLE_VARIANTS.get(occ["key"], [occ["title"]]))

            postings.append(
                {
                    "id": posting_id,
                    "title": title,
                    "company": rng.choice(COMPANIES),
                    "source": "synthetic",
                    "source_url": None,
                    "posted_at": posted.isoformat(),
                    "location": rng.choice(LOCATIONS),
                    "occupation_id": occ["id"],
                    "occupation_key": occ["key"],
                    "is_synthetic": True,
                    "raw_text": f"{title} at a Bangladesh employer. Requires: "
                    + ", ".join(
                        skills_by_id[s]["name"] for s in pick_skills(skills_by_occ[occ["key"]], rng)
                    )
                    + ".",
                }
            )
            for skill_id in pick_skills(skills_by_occ[occ["key"]], rng):
                posting_skills.append({"posting_id": posting_id, "skill_id": skill_id})

    # skill_demand: counts in the last 30 days vs the 30 days before that.
    cutoff_recent = today - timedelta(days=RECENT_DAYS)
    cutoff_prev = today - timedelta(days=WINDOW_DAYS)

    skill_to_postings: dict[str, set[str]] = {}
    for row in posting_skills:
        skill_to_postings.setdefault(row["skill_id"], set()).add(row["posting_id"])
    posted_by_id = {p["id"]: date.fromisoformat(p["posted_at"]) for p in postings}

    demand = []
    for skill in skills:
        ids = skill_to_postings.get(skill["id"], set())
        recent = sum(1 for pid in ids if posted_by_id[pid] >= cutoff_recent)
        previous = sum(1 for pid in ids if cutoff_prev <= posted_by_id[pid] < cutoff_recent)
        if recent == 0 and previous == 0:
            continue
        demand.append(
            {
                "skill_id": skill["id"],
                "skill_key": skill["key"],
                "count_30d": recent,
                "count_prev_30d": previous,
                "updated_at": today.isoformat(),
            }
        )

    for name, rows in {
        "job_postings.json": postings,
        "posting_skills.json": posting_skills,
        "skill_demand.json": demand,
    }.items():
        (SEED_DIR / name).write_text(
            json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )

    print(f"job_postings    {len(postings):>5}  (all is_synthetic = true)")
    print(f"posting_skills  {len(posting_skills):>5}")
    print(f"skill_demand    {len(demand):>5} skills with demand in the 60-day window")
    print(f"reference date  {today.isoformat()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
