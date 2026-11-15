import 'server-only';

import { z } from 'zod';

import { generateJson, LlmError } from './llm';
import type { AnalysisResult } from '@/lib/analysis/analyze';

/**
 * Turns a computed result into a short plain-language explanation.
 *
 * Hard rule: the model may not change, round differently, or invent any number.
 * Every figure it mentions must already exist in the input JSON, and we verify
 * that after generation (see `verifyNumbers`). If the check fails we drop the
 * generated text and use the deterministic fallback.
 */

export const ExplanationSchema = z.object({
  headline: z.string().min(10).max(200),
  summary: z.string().min(30).max(900),
  actions: z.array(z.string().min(5).max(200)).max(4),
});

export type Explanation = z.infer<typeof ExplanationSchema>;

export interface ExplanationResult {
  explanation: Explanation;
  source: 'llm' | 'deterministic';
  provider: string | null;
  model: string | null;
  /** True when every number in the text exists in the computed result. */
  numbersVerified: boolean;
}

const SYSTEM_PROMPT = `You explain a skills assessment to a young job seeker.

HARD RULES:
- Do not change, round differently, or invent any numbers. Only explain the provided values.
- Use ONLY the numbers that appear in the data you are given. If it is not in the data, do not say it.
- Do not predict the future. Say what the data shows today.
- Be encouraging but honest. Two or three short sentences per section.
- Write in the requested language. Keep sentences short and plain.`;

/**
 * Bangla names for the skills we mention, so the model never has to
 * transliterate — and never has to guess.
 */
function nameIn(result: AnalysisResult, skillId: string, locale: string): string {
  const mapped = result.mappedSkills.find((s) => s.skillId === skillId);
  if (!mapped) return skillId;
  return locale === 'bn' ? (mapped.nameBn ?? mapped.name) : mapped.name;
}

function compactForPrompt(result: AnalysisResult, locale: string): Record<string, unknown> {
  const score = result.score;
  return {
    overall: score.overall,
    overallConfidence: score.overallConfidence,
    coverage: score.coverage,
    quadrantCounts: score.quadrantCounts,
    topSkills: score.skills
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((s) => ({
        skillId: s.skillId,
        name: nameIn(result, s.skillId, locale),
        score: s.score,
        demand: s.demand.value,
        resilience: s.resilience,
        quadrant: s.quadrant,
        confidence: s.confidence,
        taskCount: s.exposure.taskCount,
        exposureMethod: s.exposure.method,
      })),
    weakestSkills: score.skills
      .slice()
      .sort((a, b) => a.score - b.score)
      .slice(0, 4)
      .map((s) => ({
        skillId: s.skillId,
        name: nameIn(result, s.skillId, locale),
        score: s.score,
        demand: s.demand.value,
        resilience: s.resilience,
        quadrant: s.quadrant,
      })),
    target: result.target
      ? { title: result.target.title, autoPicked: result.target.autoPicked }
      : null,
    gaps: (result.gaps?.gaps ?? []).slice(0, 5).map((g) => ({
      name: locale === 'bn' ? (g.nameBn ?? g.name) : g.name,
      importance: g.importance,
      priority: g.priority,
    })),
    adjacentRoles: result.adjacentRoles.slice(0, 3).map((r) => ({
      title: r.title,
      overlap: r.overlap,
      resilience: r.resilience,
    })),
    unmappedCount: result.unmappedSkills.length,
    dataNotes: result.dataNotes,
  };
}

/**
 * Collects every number that legitimately appears in the result, as strings
 * in the exact formats the UI renders.
 */
export function allowedNumbers(result: AnalysisResult): Set<string> {
  const allowed = new Set<string>();
  const add = (value: number | null | undefined, decimals?: number) => {
    if (value === null || value === undefined || !Number.isFinite(value)) return;
    const rounded = decimals === undefined ? value : Number(value.toFixed(decimals));
    allowed.add(String(rounded));
    allowed.add(String(Math.round(rounded)));
    allowed.add(rounded.toFixed(1));
    allowed.add(rounded.toFixed(2));
    if (decimals !== undefined) allowed.add(value.toFixed(decimals));
  };

  add(result.score.overall, 1);
  for (const skill of result.score.skills) {
    add(skill.score, 1);
    add(skill.demand.value, 2);
    add(skill.resilience, 2);
    add(skill.demand.count30d);
    add(skill.demand.countPrev30d);
    add(skill.exposure.taskCount);
  }
  for (const count of Object.values(result.score.quadrantCounts)) add(count);
  add(result.score.coverage.total);
  add(result.score.coverage.scored);
  add(result.score.coverage.insufficientData);
  add(result.unmappedSkills.length);
  add(result.mappedSkills.length);
  add(result.profile.experience_years);
  add(result.gaps?.coverage, 2);
  for (const gap of result.gaps?.gaps ?? []) {
    add(gap.importance, 2);
    add(gap.priority, 2);
  }
  for (const role of result.adjacentRoles) {
    add(role.overlap, 2);
    add(role.resilience, 2);
  }
  return allowed;
}

/**
 * Post-check: every number in the generated text must exist in the input data.
 * Also rejects bare percentages the model might invent.
 */
export function verifyNumbers(text: string, result: AnalysisResult): boolean {
  const allowed = allowedNumbers(result);
  const numbers = text.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  for (const raw of numbers) {
    const normalised = raw.replace(',', '.');
    const asNumber = Number(normalised);
    if (!Number.isFinite(asNumber)) return false;
    if (allowed.has(normalised) || allowed.has(String(asNumber))) continue;
    // Allow small integers that are counts of things we genuinely report.
    if (Number.isInteger(asNumber) && asNumber >= 0 && asNumber <= 5) continue;
    return false;
  }
  return true;
}

/** Friendly skill name for prose: never show a raw skill id to a user. */
function skillName(result: AnalysisResult, skillId: string): string {
  const mapped = result.mappedSkills.find((s) => s.skillId === skillId);
  return mapped?.name ?? skillId;
}

/** Same, but in Bangla when we have a Bangla name and the reader asked for it. */
function localizedSkillName(result: AnalysisResult, skillId: string, bn: boolean): string {
  if (!bn) return skillName(result, skillId);
  const mapped = result.mappedSkills.find((s) => s.skillId === skillId);
  return mapped?.nameBn ?? mapped?.name ?? skillId;
}

/**
 * Confidence is stored as a token ('high' | 'medium' | …). Prose has to show it
 * in the reader's language, not as the raw token — "নিশ্চয়তা: medium" is a bug
 * a Bangla reader notices immediately.
 */
const CONFIDENCE_LABEL: Record<string, { en: string; bn: string }> = {
  high: { en: 'high', bn: 'উচ্চ' },
  medium: { en: 'medium', bn: 'মাঝারি' },
  low: { en: 'low', bn: 'কম' },
  insufficient: { en: 'insufficient', bn: 'অপর্যাপ্ত' },
};

const LANGUAGE_NAME: Record<string, string> = {
  en: 'English',
  bn: 'Bangla (বাংলা)',
};

/** Deterministic explanation used when no LLM is configured or the check fails. */
export function deterministicExplanation(result: AnalysisResult, locale: string): Explanation {
  const score = result.score;
  const overall = score.overall;
  const sorted = [...score.skills].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const bn = locale === 'bn';

  const confidenceWord =
    CONFIDENCE_LABEL[score.overallConfidence]?.[bn ? 'bn' : 'en'] ?? score.overallConfidence;

  const headline =
    overall === null
      ? bn
        ? 'স্কোর হিসাব করা যায়নি — পর্যাপ্ত তথ্য পাওয়া যায়নি।'
        : 'No score could be computed — not enough linked task data.'
      : bn
        ? `আপনার Future-Proof স্কোর ${overall.toFixed(1)} / ১০০ (নিশ্চয়তা: ${confidenceWord})।`
        : `Your Future-Proof Score is ${overall.toFixed(1)} out of 100 (confidence: ${confidenceWord}).`;

  const parts: string[] = [];
  if (best && worst && best.skillId !== worst.skillId) {
    parts.push(
      bn
        ? `সবচেয়ে শক্তিশালী দক্ষতা ${localizedSkillName(result, best.skillId, true)} (স্কোর ${best.score.toFixed(1)}), আর সবচেয়ে ঝুঁকিপূর্ণ ${localizedSkillName(result, worst.skillId, true)} (স্কোর ${worst.score.toFixed(1)})।`
        : `Your strongest mapped skill, ${localizedSkillName(result, best.skillId, false)}, scores ${best.score.toFixed(1)}, while your most exposed one, ${localizedSkillName(result, worst.skillId, false)}, scores ${worst.score.toFixed(1)}.`,
    );
  }
  parts.push(
    bn
      ? `মোট ${score.coverage.scored}টি দক্ষতা স্কোর করা হয়েছে, ${score.coverage.insufficientData}টির জন্য পর্যাপ্ত তথ্য নেই।`
      : `${score.coverage.scored} skills were scored; ${score.coverage.insufficientData} had insufficient task data.`,
  );

  const actions: string[] = [];
  for (const gap of (result.gaps?.gaps ?? []).slice(0, 3)) {
    const gapName = bn ? (gap.nameBn ?? gap.name) : gap.name;
    actions.push(
      bn
        ? `${gapName} শিখুন — লক্ষ্য পদের জন্য গুরুত্ব ${gap.importance.toFixed(2)}।`
        : `Learn ${gapName} — importance ${gap.importance.toFixed(2)} for your target role.`,
    );
  }
  if (actions.length === 0) {
    actions.push(
      bn
        ? 'আপনার সবচেয়ে বেশি ঝুঁকিতে থাকা দক্ষতাগুলোর জন্য AI-সহায়ক টুল শিখুন।'
        : 'Strengthen your most exposed skills by learning to use AI tools alongside them.',
    );
  }

  return { headline, summary: parts.join(' '), actions };
}

export async function explainResult(
  result: AnalysisResult,
  locale: string,
): Promise<ExplanationResult> {
  const fallback = deterministicExplanation(result, locale);

  try {
    const generated = await generateJson({
      system: SYSTEM_PROMPT,
      prompt: `Language: ${LANGUAGE_NAME[locale] ?? 'English'}

Computed result (JSON):
${JSON.stringify(compactForPrompt(result, locale), null, 1)}

Return JSON with:
{"headline": string, "summary": string, "actions": [string, string, string]}

Rules: at most three actions. Only use numbers present in the JSON above.
Refer to each skill by the "name" given in the JSON, in the requested language.`,
      schema: ExplanationSchema,
    });

    const allText = [
      generated.data.headline,
      generated.data.summary,
      ...generated.data.actions,
    ].join(' ');

    if (!verifyNumbers(allText, result)) {
      console.warn('[explain] number check failed, using deterministic explanation');
      return {
        explanation: fallback,
        source: 'deterministic',
        provider: generated.provider,
        model: generated.model,
        numbersVerified: false,
      };
    }

    return {
      explanation: generated.data,
      source: 'llm',
      provider: generated.provider,
      model: generated.model,
      numbersVerified: true,
    };
  } catch (error) {
    if (!(error instanceof LlmError)) {
      console.warn('[explain] unexpected error:', error);
    }
    return {
      explanation: fallback,
      source: 'deterministic',
      provider: null,
      model: null,
      numbersVerified: true,
    };
  }
}
