/**
 * Deterministic CV extraction — no model, no network, no framework.
 *
 * Kept separate from extract.ts (which calls an LLM) so this logic can run in
 * a plain Node process: the offline demo path, the tests, and the MCP server.
 *
 * It is a dictionary + regex extractor, not magic. It finds taxonomy skills
 * mentioned in the text, infers a proficiency from the surrounding words and
 * the CV section, and quotes evidence verbatim so a user can check it.
 */

import { z } from 'zod';

import type { Skill } from '@/lib/data/types';
import { findSkillMentions } from '@/lib/skills/dictionary';

export const ProficiencySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const ExtractedProfileSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string().min(1).max(120),
      proficiency: ProficiencySchema,
      evidence: z.string().max(400),
    }),
  ),
  education: z.array(
    z.object({
      degree: z.string().max(120),
      field: z.string().max(120),
      level: z.string().max(60),
    }),
  ),
  projects: z.array(
    z.object({
      title: z.string().max(160),
      summary: z.string().max(600),
      skills_used: z.array(z.string().max(120)),
    }),
  ),
  experience_years: z.number().min(0).max(60),
  language: z.enum(['bn', 'en', 'mixed']),
});

export type ExtractedProfile = z.infer<typeof ExtractedProfileSchema>;
export type Proficiency = 1 | 2 | 3;

const PROFICIENCY_STRONG =
  /\b(advanced|expert|proficient|professional|production|led|lead|mentor|architected|owned|deep|extensive|\d+\+?\s*years?)\b/i;
const PROFICIENCY_WEAK =
  /\b(basic|beginner|familiar|learning|intro|coursework|studied|introductory|fundamentals)\b/i;

const DEGREE_PATTERNS: Array<{ pattern: RegExp; level: string }> = [
  { pattern: /\b(phd|ph\.d|doctorate|dba)\b/i, level: 'doctorate' },
  { pattern: /\b(m\.?sc|m\.?a\b|msc|mba|m\.?phil|masters?|master's)\b/i, level: 'masters' },
  {
    pattern: /\b(b\.?sc|b\.?a\b|bsc|bba|b\.?tech|bachelors?|bachelor's|llb|mbbs)\b/i,
    level: 'bachelors',
  },
  { pattern: /\b(hsc|higher secondary|intermediate)\b/i, level: 'higher-secondary' },
  { pattern: /\b(ssc|secondary school certificate)\b/i, level: 'secondary' },
  { pattern: /\b(diploma)\b/i, level: 'diploma' },
];

const FIELD_KEYWORDS: Array<{ pattern: RegExp; field: string }> = [
  { pattern: /computer science|cse|software engineering/i, field: 'Computer Science' },
  { pattern: /electrical|eee|electronics/i, field: 'Electrical Engineering' },
  { pattern: /civil/i, field: 'Civil Engineering' },
  { pattern: /mechanical/i, field: 'Mechanical Engineering' },
  { pattern: /business administration|bba|marketing|finance|accounting/i, field: 'Business' },
  { pattern: /economics/i, field: 'Economics' },
  { pattern: /english|linguistics/i, field: 'English' },
  { pattern: /pharmacy|medical|medicine/i, field: 'Health' },
];

function sentenceAround(text: string, index: number, radius = 120): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

export function detectLanguage(text: string): 'bn' | 'en' | 'mixed' {
  const bangla = (text.match(/[\u0980-\u09FF]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  if (bangla === 0) return 'en';
  if (latin === 0) return 'bn';
  return bangla / (bangla + latin) > 0.4 ? 'bn' : 'mixed';
}

function estimateProficiency(context: string, section: string): Proficiency {
  if (PROFICIENCY_STRONG.test(context)) return 3;
  if (PROFICIENCY_WEAK.test(context)) return 1;
  if (/intern|experience|worked|employed|job/i.test(section)) return 2;
  return 2;
}

function sectionOf(text: string, index: number): string {
  const before = text.slice(0, index).toUpperCase();
  const headings = ['EXPERIENCE', 'PROJECTS', 'EDUCATION', 'SKILLS', 'TRAINING', 'CERTIF'];
  let lastHeading = 'OTHER';
  let lastIndex = -1;
  for (const heading of headings) {
    const found = before.lastIndexOf(heading);
    if (found > lastIndex) {
      lastIndex = found;
      lastHeading = heading;
    }
  }
  return lastHeading;
}

function extractProjects(text: string): ExtractedProfile['projects'] {
  const match =
    /(?:projects?|selected work)\s*:?\s*\n([\s\S]{0,2500}?)(?:\n[A-Z][A-Z ]{3,}\n|$)/i.exec(text);
  if (!match?.[1]) return [];
  const block = match[1];
  const items = block
    .split(/\n(?=\s*(?:\d+[.)]|[-•*])\s*)/)
    .map((item) =>
      item
        .replace(/^\s*\d+[.)]\s*/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((item) => item.length > 20)
    .slice(0, 6);

  return items.map((item) => {
    const [title, ...rest] = item.split(/[.:-]\s+/);
    return {
      title: (title ?? item).slice(0, 120),
      summary: (rest.join(' ') || item).slice(0, 400),
      skills_used: [],
    };
  });
}

/**
 * Deterministic extraction. Used when no LLM key is configured, and by the MCP
 * server, which never calls a model at all.
 */
export function extractOffline(text: string, skills: Skill[]): ExtractedProfile {
  const mentions = findSkillMentions(text, skills);

  const extracted = mentions.slice(0, 40).map(({ skill, index }) => {
    const context = sentenceAround(text, index);
    return {
      name: skill.name,
      proficiency: estimateProficiency(context, sectionOf(text, index)),
      evidence: context.slice(0, 240),
    };
  });

  const education = DEGREE_PATTERNS.flatMap(({ pattern, level }) => {
    const match = pattern.exec(text);
    if (!match) return [];
    const line = text.split('\n').find((l) => pattern.test(l)) ?? '';
    const field = FIELD_KEYWORDS.find((f) => f.pattern.test(line))?.field ?? 'Not specified';
    return [{ degree: match[0].toUpperCase().replace(/\./g, ''), field, level }];
  }).slice(0, 4);

  const years: number[] = [];
  for (const match of text.matchAll(/\b(19|20)\d{2}\b/g)) {
    const value = Number(match[0]);
    if (value >= 1970 && value <= new Date().getFullYear() + 1) years.push(value);
  }
  const experienceYears =
    years.length >= 2 ? Math.max(0, Math.min(40, Math.max(...years) - Math.min(...years) - 3)) : 0;

  const projects = extractProjects(text);

  return {
    skills: extracted,
    education,
    projects,
    experience_years: Number.isFinite(experienceYears) ? Math.max(0, experienceYears) : 0,
    language: detectLanguage(text),
  };
}
