import type { DataProvider } from '@/lib/data/types';
import { round } from '@/lib/math';
import { SCORING_WEIGHTS } from '@/lib/scoring/config';
import type { ScoreResult } from '@/lib/scoring/score';
import { dedupeMatches, matchByName } from '@/lib/skills/dictionary';

export interface ExplainOptions {
  skills: Array<{ name: string; proficiency?: 1 | 2 | 3 }>;
  target_occupation?: string | null;
  locale?: 'en' | 'bn';
  /** id -> display name, so the explanation reads "Python", not a UUID. */
  skill_names?: Record<string, string>;
}

function fmt(value: number, bn: boolean, decimals = 1): string {
  return new Intl.NumberFormat(bn ? 'bn-BD' : 'en-US', {
    maximumFractionDigits: decimals,
  }).format(value);
}

function nameOf(options: ExplainOptions, id: string): string {
  return options.skill_names?.[id] ?? id;
}

/**
 * Turns an already-computed score into a transparent, checkable explanation.
 *
 * This is arithmetic and string formatting only. Every number in the output is
 * taken from the ScoreResult that was passed in — nothing is estimated, and
 * there is no model call, so the explanation cannot drift from the score.
 */
export function explainScore(score: ScoreResult, options: ExplainOptions) {
  const bn = options.locale === 'bn';
  const lines: string[] = [];

  const ranked = [...score.skills].sort((a, b) => b.weight - a.weight);
  const totalWeight = ranked.reduce((sum, s) => sum + s.weight, 0);

  lines.push(
    bn
      ? `সামগ্রিক স্কোর: ${score.overall === null ? 'পাওয়া যায়নি' : fmt(score.overall, true)} / ১০০ (আস্থা: ${score.overallConfidence})`
      : `Overall score: ${score.overall === null ? 'not available' : fmt(score.overall, false)} / 100 (confidence: ${score.overallConfidence})`,
  );

  if (totalWeight > 0) {
    lines.push('');
    lines.push(bn ? 'কীভাবে হিসাব হয়েছে:' : 'How it was computed:');
    for (const skill of ranked) {
      const share = (skill.weight / totalWeight) * 100;
      lines.push(
        bn
          ? `  • ${nameOf(options, skill.skillId)}: স্কোর ${fmt(skill.score, true)}, ওজন ${fmt(skill.weight, true, 0)} (${fmt(share, true)}% প্রভাব)`
          : `  • ${nameOf(options, skill.skillId)}: score ${fmt(skill.score, false)}, weight ${fmt(skill.weight, false, 0)} (${fmt(share, false)}% of the total)`,
      );
      lines.push(
        bn
          ? `      চাহিদা ${fmt(skill.demand.value, true, 2)} (পার্সেন্টাইল ${fmt(skill.demand.percentile, true, 2)}, ট্রেন্ড ${fmt(skill.demand.trend, true, 2)}), স্থিতিস্থাপকতা ${fmt(skill.resilience, true, 2)}, কোয়াড্রান্ট ${skill.quadrant}`
          : `      demand ${fmt(skill.demand.value, false, 2)} (percentile ${fmt(skill.demand.percentile, false, 2)}, trend ${fmt(skill.demand.trend, false, 2)}), resilience ${fmt(skill.resilience, false, 2)}, quadrant ${skill.quadrant}`,
      );
    }
  }

  const weakest = [...score.skills].sort((a, b) => a.score - b.score).slice(0, 3);
  if (weakest.length > 0) {
    lines.push('');
    lines.push(bn ? 'সবচেয়ে ঝুঁকিপূর্ণ দক্ষতা:' : 'Most at-risk skills:');
    for (const skill of weakest) {
      const tasks = skill.tasks.slice(0, 2).map((t) => t.description);
      lines.push(
        bn
          ? `  • ${nameOf(options, skill.skillId)}: ${fmt(skill.score, true)} — ${fmt(skill.exposure.value * 100, true, 0)}% কাজ AI-এর সংস্পর্শে${tasks.length ? `। উদাহরণ: "${tasks.join('"; "')}"` : ''}`
          : `  • ${nameOf(options, skill.skillId)}: ${fmt(skill.score, false)} — ${fmt(skill.exposure.value * 100, false, 0)}% of linked tasks are AI-exposed${tasks.length ? `. Example tasks: "${tasks.join('"; "')}"` : ''}`,
      );
    }
  }

  const insufficient = score.skills.filter((s) => !s.includedInOverall);
  if (insufficient.length > 0) {
    lines.push('');
    lines.push(
      bn
        ? `স্কোরে ধরা হয়নি (পর্যাপ্ত তথ্য নেই): ${insufficient.map((s) => nameOf(options, s.skillId)).join(', ')}`
        : `Not included in the score (insufficient data): ${insufficient.map((s) => nameOf(options, s.skillId)).join(', ')}`,
    );
  }

  lines.push('');
  lines.push(
    bn
      ? `সূত্র: skillScore = ১০০ × (${SCORING_WEIGHTS.skillScore.demand} × চাহিদা + ${SCORING_WEIGHTS.skillScore.resilience} × স্থিতিস্থাপকতা); সামগ্রিক = Σ(দক্ষতা × স্কোর) / Σ(দক্ষতা)`
      : `Formula: skillScore = 100 × (${SCORING_WEIGHTS.skillScore.demand} × demand + ${SCORING_WEIGHTS.skillScore.resilience} × resilience); overall = Σ(proficiency × score) / Σ(proficiency)`,
  );

  return {
    locale: options.locale ?? 'en',
    explanation: lines.join('\n'),
    numbers_used: {
      overall: score.overall === null ? null : round(score.overall, 1),
      per_skill: score.skills.map((s) => ({
        skill_id: s.skillId,
        name: nameOf(options, s.skillId),
        score: round(s.score, 1),
        weight: s.weight,
        demand: round(s.demand.value, 3),
        resilience: round(s.resilience, 3),
        quadrant: s.quadrant,
        confidence: s.confidence,
      })),
    },
    provenance: {
      generated_by: 'explainScore() — deterministic formatting of an existing score',
      llm_called: false,
      can_differ_from_score: false,
    },
  };
}

/** Shared helper: resolve names -> ids, used by both score and explain. */
export function resolveNames(
  names: string[],
  skills: Awaited<ReturnType<DataProvider['listSkills']>>,
) {
  const { results } = matchByName(names, skills);
  return dedupeMatches(results).filter((m) => m.skillId);
}
