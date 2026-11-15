/**
 * Offline CV extraction: recall and false-positive guards.
 *
 * These tests run against the real seed taxonomy, so they fail if someone
 * edits data/seed/skills.json and silently breaks matching. That is the point:
 * the demo runs offline, so the dictionary IS the product.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { extractOffline, findSkillMentions } from '@/lib/cv/extract';
import type { Skill } from '@/lib/data/types';

type SeedSkill = Omit<Skill, 'nameBn' | 'sourceId'> & {
  name_bn: string | null;
  source_id: string | null;
};

function loadSkills(): Skill[] {
  const rows = JSON.parse(
    readFileSync(path.join(process.cwd(), 'data/seed/skills.json'), 'utf8'),
  ) as SeedSkill[];
  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    nameBn: row.name_bn,
    category: row.category,
    aliases: row.aliases ?? [],
    sourceId: row.source_id,
  }));
}

const skills = loadSkills();

function namesIn(text: string): string[] {
  return findSkillMentions(text, skills).map((m) => m.skill.name);
}

const CV = `Rahim Ahmed
Dhaka, Bangladesh | [EMAIL] | [PHONE]
SUMMARY Final year CSE student with internship experience in web development.
SKILLS Python, JavaScript, React, SQL, Git, Data analysis, Machine learning, Excel
EXPERIENCE Web Development Intern, Pathao (Jun 2025 - Sep 2025)
- Built REST API endpoints with Django and PostgreSQL.
- Wrote unit tests and fixed production bugs.
EDUCATION BSc in Computer Science and Engineering, [INSTITUTION], 2026
PROJECTS - Sales dashboard: cleaned data with pandas, visualised in Power BI.`;

describe('offline skill extraction', () => {
  it('finds the short CV forms students actually write', () => {
    const found = namesIn(CV);
    for (const expected of [
      'Python',
      'JavaScript',
      'React',
      'SQL',
      'Git / version control',
      'Microsoft Excel',
      'Machine learning',
      'Django',
      'PostgreSQL',
      'pandas',
      'Power BI',
      'REST API design',
      'Unit testing',
      'Data cleaning',
    ]) {
      expect(found, `expected to find ${expected}`).toContain(expected);
    }
  });

  it('does not fire on look-alike words', () => {
    const text =
      'I built a Sales dashboard for a shop. I graduated in Spring 2025 and can express ideas clearly in writing.';
    const found = namesIn(text);
    expect(found).not.toContain('Retail sales');
    expect(found).not.toContain('Spring / Spring Boot');
    expect(found).not.toContain('Express.js');
  });

  it('matches C# and C++ even though they are shorter than the usual minimum', () => {
    const found = namesIn('Languages: C#, C++, Java and Python.');
    expect(found).toContain('C#');
    expect(found).toContain('C++');
  });

  it('reports each skill once and keeps evidence from the CV', () => {
    const profile = extractOffline(CV, skills);
    const names = profile.skills.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
    expect(profile.skills.length).toBeGreaterThan(8);

    for (const skill of profile.skills) {
      expect(skill.evidence.length).toBeGreaterThan(0);
      expect(skill.proficiency).toBeGreaterThanOrEqual(1);
      expect(skill.proficiency).toBeLessThanOrEqual(3);
    }
  });

  it('reads the degree and field from the education line', () => {
    const profile = extractOffline(CV, skills);
    expect(profile.education[0]?.level).toBe('bachelors');
    expect(profile.education[0]?.field).toBe('Computer Science');
    expect(profile.language).toBe('en');
  });

  it('tags Bangla CVs as bn', () => {
    const profile = extractOffline(
      'নাম: রহিম আহমেদ। দক্ষতা: পাইথন, এক্সেল, ডেটা এন্ট্রি। শিক্ষা: বিএসসি কম্পিউটার সায়েন্স।',
      skills,
    );
    expect(profile.language).toBe('bn');
  });

  it('returns an empty, valid profile for empty text', () => {
    const profile = extractOffline('', skills);
    expect(profile.skills).toEqual([]);
    expect(profile.experience_years).toBe(0);
  });
});
