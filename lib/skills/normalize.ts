import 'server-only';

import { cosineSimilarity, embed } from '@/lib/ai/embed';
import type { Skill } from '@/lib/data/types';
import { dedupeMatches, matchByName, type MatchMethod, type SkillMatch } from './dictionary';

/**
 * Maps free-text skill names onto the taxonomy.
 *
 * Strategy, cheapest and most precise first:
 *   1. exact name or alias match        (lib/skills/dictionary, no model)
 *   2. alias as a whole word in a phrase (lib/skills/dictionary, no model)
 *   3. embedding similarity             (this file, needs a provider)
 *
 * Unmatched skills are returned with `skillId: null` and MUST be shown to the
 * user in a "Not scored" list — never dropped silently.
 */

export type { MatchMethod, SkillMatch } from './dictionary';
export { dedupeMatches };

/** Real embedding models need a high bar; the hashed local vector is calibrated lower. */
const THRESHOLD = { semantic: 0.8, local: 0.55 } as const;

export async function normalizeSkillNames(
  inputs: string[],
  skills: Skill[],
): Promise<SkillMatch[]> {
  if (inputs.length === 0 || skills.length === 0) {
    return inputs.map((input) => ({
      input,
      skillId: null,
      skillKey: null,
      similarity: 0,
      method: 'none' as MatchMethod,
    }));
  }

  const { results, pending } = matchByName(inputs, skills);

  if (pending.length === 0) return results;

  // Pass 3: embeddings for whatever is left.
  try {
    const skillTexts = skills.map((s) => [s.name, ...s.aliases].join(' | '));
    const [inputVectors, skillVectors] = await Promise.all([
      embed(inputs.filter((_, i) => pending.includes(i))),
      embed(skillTexts),
    ]);

    if (inputVectors.vectors.length === 0 || skillVectors.vectors.length === 0) return results;

    const threshold = inputVectors.provider === 'local' ? THRESHOLD.local : THRESHOLD.semantic;

    pending.forEach((inputIndex, position) => {
      const vector = inputVectors.vectors[position];
      if (!vector) return;

      let bestIndex = -1;
      let bestScore = -1;
      skillVectors.vectors.forEach((skillVector, skillIndex) => {
        const score = cosineSimilarity(vector, skillVector);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = skillIndex;
        }
      });

      if (bestIndex >= 0 && bestScore >= threshold) {
        const skill = skills[bestIndex];
        if (!skill) return;
        results[inputIndex] = {
          input: inputs[inputIndex] ?? '',
          skillId: skill.id,
          skillKey: skill.key,
          similarity: Number(bestScore.toFixed(4)),
          method: 'semantic',
        };
      }
    });
  } catch (error) {
    console.warn('[normalize] embedding pass failed, keeping deterministic matches only:', error);
  }

  return results;
}
