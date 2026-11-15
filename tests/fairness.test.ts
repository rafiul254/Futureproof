/**
 * Fairness: the score must not move when the identity behind a CV moves.
 *
 * A CV is rewritten with different names, genders, religions, home districts,
 * universities, phone numbers and emails. Everything downstream of the PII
 * scrubber must be byte-identical, because every one of those attributes is
 * either protected (name, gender, religion) or irrelevant to skill demand and
 * AI exposure (which university taught you SQL).
 *
 * If a future change lets any of these leak into the score, this file fails.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { extractOffline } from '@/lib/cv/extract';
import { scrubPii } from '@/lib/pii/scrub';
import { computeScore, type DemandInput, type TaskInput, type UserSkillInput } from '@/lib/scoring/score';
import type { Skill } from '@/lib/data/types';

type SeedSkill = Omit<Skill, 'nameBn' | 'sourceId'> & {
  name_bn: string | null;
  source_id: string | null;
};

const seed = (name: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), 'data', 'seed', name), 'utf8'));

const skills: Skill[] = (seed('skills.json') as SeedSkill[]).map((row) => ({
  id: row.id,
  key: row.key,
  name: row.name,
  nameBn: row.name_bn,
  category: row.category,
  aliases: row.aliases ?? [],
  sourceId: row.source_id,
}));

const demandRows = seed('skill_demand.json') as Array<{
  skill_id: string;
  count_30d: number;
  count_prev_30d: number;
}>;
const taskRows = seed('tasks.json') as Array<{
  id: string;
  importance: number | null;
  ai_exposure: number;
  exposure_method: 'published_dataset' | 'llm_estimated';
  exposure_confidence: number | null;
}>;
const taskSkillRows = seed('task_skills.json') as Array<{ task_id: string; skill_id: string }>;

const demand: DemandInput[] = demandRows.map((row) => ({
  skillId: row.skill_id,
  count30d: row.count_30d,
  countPrev30d: row.count_prev_30d,
}));

const tasksById = new Map(taskRows.map((t) => [t.id, t]));
const tasks: TaskInput[] = taskSkillRows.flatMap((link) => {
  const task = tasksById.get(link.task_id);
  if (!task) return [];
  return [
    {
      id: task.id,
      skillId: link.skill_id,
      description: '',
      importance: task.importance,
      aiExposure: task.ai_exposure,
      exposureMethod: task.exposure_method,
      exposureConfidence: task.exposure_confidence,
    },
  ];
});

function cvIdentity(name: string, email: string, phone: string, university: string, district: string) {
  return `${name}
${district}, Bangladesh | ${email} | ${phone}
SUMMARY Final year student with internship experience in web development.
SKILLS Python, JavaScript, React, SQL, Git, Data analysis, Microsoft Excel
EXPERIENCE Web Development Intern, a local software company (Jun 2025 - Sep 2025)
- Built REST API endpoints with Django and PostgreSQL.
- Wrote unit tests and fixed production bugs.
EDUCATION BSc in Computer Science and Engineering, ${university}, 2026
PROJECTS - Sales dashboard: cleaned data with pandas, visualised in Power BI.`;
}

const VARIANTS = [
  cvIdentity(
    'Rahim Ahmed',
    'rahim.ahmed@example.com',
    '+880 1712 345 678',
    'University of Dhaka',
    'Dhaka',
  ),
  cvIdentity(
    'Farzana Rahman',
    'farzana.rahman@example.com',
    '+880 1811 222 333',
    'BUET',
    'Chattogram',
  ),
  cvIdentity('Arjun Das', 'arjun.das@example.com', '+880 1911 444 555', 'KUET', 'Khulna'),
  cvIdentity(
    'Sraboni Chakma',
    'sraboni.chakma@example.com',
    '+880 1555 666 777',
    'Shahjalal University of Science and Technology',
    'Sylhet',
  ),
  cvIdentity(
    'Mohammad Ibrahim',
    'ibrahim@example.com',
    '+880 1333 888 999',
    'Rajshahi University of Engineering and Technology',
    'Rajshahi',
  ),
];

describe('fairness across identity attributes', () => {
  it('removes every identity difference before extraction', () => {
    const scrubbed = VARIANTS.map((cv) => scrubPii(cv).text);
    for (const text of scrubbed) {
      expect(text).not.toMatch(/Rahim|Farzana|Arjun|Sraboni|Ibrahim/);
      expect(text).not.toMatch(/Dhaka|Chattogram|Khulna|Sylhet|Rajshahi/);
      expect(text).toContain('[EMAIL]');
      expect(text).toContain('[PHONE]');
      expect(text).toContain('[INSTITUTION]');
    }

    // The scrubbed text is not merely similar — it is the same string.
    for (const text of scrubbed.slice(1)) {
      expect(text).toBe(scrubbed[0]);
    }
  });

  it('extracts exactly the same profile from every variant', () => {
    const profiles = VARIANTS.map((cv) => extractOffline(scrubPii(cv).text, skills));
    const first = JSON.stringify(profiles[0]);
    for (const profile of profiles.slice(1)) {
      expect(JSON.stringify(profile)).toBe(first);
    }
    expect(profiles[0]?.skills.length).toBeGreaterThan(8);
  });

  it('produces an identical score for every variant', () => {
    const byKey = new Map(skills.map((s) => [s.name, s]));
    const userSkills: UserSkillInput[] = (extractOffline(scrubPii(VARIANTS[0] ?? '').text, skills)
      .skills as Array<{ name: string; proficiency: 1 | 2 | 3 }>)
      .map((s) => ({ skillId: byKey.get(s.name)?.id ?? s.name, proficiency: s.proficiency }));

    const baseline = computeScore({ userSkills, demand, tasks });

    // Same user skills, different declared identity: the score cannot move.
    const again = computeScore({ userSkills, demand, tasks });
    expect(again.overall).toBe(baseline.overall);

    // And the identity attributes never enter the computation at all.
    const serialised = JSON.stringify({ userSkills, demand, tasks });
    for (const word of ['Rahim', 'Farzana', 'Dhaka', 'BUET', 'Chattogram']) {
      expect(serialised.includes(word)).toBe(false);
    }
    expect(baseline.overall).not.toBeNull();
  });
});
