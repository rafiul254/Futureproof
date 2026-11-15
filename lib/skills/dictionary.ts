/**
 * The dictionary half of skill matching: text -> taxonomy ids, with no model.
 *
 * This module is deliberately dependency-free and framework-free (no
 * 'server-only'), because the same logic is used by the web app, the offline
 * demo path and the MCP server. The embedding half lives in normalize.ts, which
 * is server-only because it calls a provider.
 *
 * Order of preference, cheapest and most precise first:
 *   1. exact name or alias match
 *   2. alias appearing as a whole word inside the input
 *
 * Anything unmatched is returned with skillId: null and MUST be shown to the
 * user in a "not scored" list — never dropped silently.
 */

import type { Skill } from '@/lib/data/types';

export type MatchMethod = 'exact' | 'alias' | 'semantic' | 'none';

export interface SkillMatch {
  input: string;
  skillId: string | null;
  skillKey: string | null;
  similarity: number;
  method: MatchMethod;
}

export function normaliseText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\u0980-\u09FF ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wholeWordIn(haystack: string, needle: string): boolean {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack);
}

/** Finds taxonomy skills mentioned in free text, longest alias first. */
export function findSkillMentions(
  text: string,
  skills: Skill[],
): Array<{ skill: Skill; index: number; matchedText: string }> {
  const haystack = text.toLowerCase();
  const mentions: Array<{ skill: Skill; index: number; matchedText: string }> = [];
  const claimed: Array<[number, number]> = [];

  const candidates: Array<{ skill: Skill; needle: string }> = [];
  for (const skill of skills) {
    const needles = [skill.name, ...skill.aliases]
      .map((n) => n.toLowerCase().trim())
      // Short needles over-match ("c", "r"), but language names like "C#" and
      // "C++" are only ever written that way, so allow those.
      .filter((n) => n.length >= 3 || /[#+]/.test(n));
    for (const needle of needles) candidates.push({ skill, needle });
  }

  // Longest needles win, so "machine learning" beats "learning".
  candidates.sort((a, b) => b.needle.length - a.needle.length);

  for (const { skill, needle } of candidates) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9+])${escaped}([^a-z0-9+]|$)`, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(haystack)) !== null) {
      const start = match.index + (match[1] ?? '').length;
      const end = start + needle.length;
      const overlaps = claimed.some(([s, e]) => start < e && end > s);
      if (!overlaps) {
        claimed.push([start, end] as [number, number]);
        mentions.push({ skill, index: start, matchedText: text.slice(start, end) });
        break; // one mention per skill is enough for extraction
      }
    }
  }

  return mentions;
}

/**
 * Deterministic matching of free-text skill names onto the taxonomy.
 * Returns the best match per input plus the indices that still need the
 * (more expensive) embedding pass.
 */
export function matchByName(
  inputs: string[],
  skills: Skill[],
): { results: SkillMatch[]; pending: number[] } {
  const results: SkillMatch[] = inputs.map((input) => ({
    input,
    skillId: null,
    skillKey: null,
    similarity: 0,
    method: 'none' as MatchMethod,
  }));
  const pending: number[] = [];

  inputs.forEach((input, index) => {
    const needle = normaliseText(input);
    if (needle.length === 0) return;

    let best: { skill: Skill; score: number; method: MatchMethod } | null = null;

    for (const skill of skills) {
      const name = normaliseText(skill.name);
      if (name.length === 0) continue;

      if (needle === name) {
        best = { skill, score: 1, method: 'exact' };
        break;
      }

      for (const alias of skill.aliases) {
        const aliasNorm = normaliseText(alias);
        if (aliasNorm.length === 0) continue;
        if (needle === aliasNorm) {
          best = { skill, score: 0.99, method: 'alias' };
          break;
        }
      }
      if (best?.method === 'alias') break;

      // Alias as a whole word inside a longer phrase, e.g. "advanced python scripting".
      if ((name.length >= 3 || /[#+]/.test(name)) && wholeWordIn(needle, name)) {
        const score = name.length / Math.max(needle.length, 1);
        if (!best || score > best.score)
          best = { skill, score: 0.9 + score * 0.05, method: 'alias' };
      }
    }

    if (best) {
      const chosen = best as { skill: Skill; score: number; method: MatchMethod };
      results[index] = {
        input,
        skillId: chosen.skill.id,
        skillKey: chosen.skill.key,
        similarity: Number(Math.min(chosen.score, 1).toFixed(4)),
        method: chosen.method,
      };
    } else {
      pending.push(index);
    }
  });

  return { results, pending };
}

/** Deduplicates matches by skill id, keeping the highest-scoring input name. */
export function dedupeMatches(matches: SkillMatch[]): SkillMatch[] {
  const bySkill = new Map<string, SkillMatch>();
  const unmapped: SkillMatch[] = [];

  for (const match of matches) {
    if (!match.skillId) {
      unmapped.push(match);
      continue;
    }
    const existing = bySkill.get(match.skillId);
    if (!existing || match.similarity > existing.similarity) {
      bySkill.set(match.skillId, match);
    }
  }

  return [...bySkill.values(), ...unmapped];
}
