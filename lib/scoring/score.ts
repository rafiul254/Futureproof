/**
 * The Future-Proof Score.
 *
 * PURE, DETERMINISTIC, TESTED. The LLM never produces or alters a number here:
 * it may only extract skills and later explain the values this module returns.
 *
 * Formulas (spec section 7.3):
 *   trend_s      = clamp((count30d - countPrev30d) / max(countPrev30d, 1), -1, 1)
 *   trend01_s    = (trend_s + 1) / 2
 *   demand_s     = 0.7 * percentile_rank(count_30d) + 0.3 * trend01_s
 *   exposure_s   = Σ(importance_t * ai_exposure_t) / Σ(importance_t) over linked tasks
 *   resilience_s = 1 - exposure_s
 *   skillScore_s = 100 * (0.5 * demand_s + 0.5 * resilience_s)
 *   overall      = Σ(w_s * skillScore_s) / Σ(w_s),  w_s = proficiency (1..3)
 */

import { clamp, round } from '@/lib/math';

import { QUADRANTS, SCORING_WEIGHTS, type Quadrant } from './config';

export type Proficiency = 1 | 2 | 3;
export type Confidence = 'high' | 'medium' | 'low' | 'insufficient';
export type ExposureMethod = 'published_dataset' | 'llm_estimated';

export interface UserSkillInput {
  skillId: string;
  proficiency: Proficiency;
  evidence?: string | null;
}

export interface DemandInput {
  skillId: string;
  count30d: number;
  countPrev30d: number;
}

export interface TaskInput {
  id: string;
  skillId: string;
  description: string;
  importance: number | null;
  aiExposure: number;
  exposureMethod: ExposureMethod;
  exposureConfidence: number | null;
  occupationId?: string | null;
}

export interface ScoringInput {
  userSkills: UserSkillInput[];
  demand: DemandInput[];
  tasks: TaskInput[];
}

export interface SkillScoreBreakdown {
  skillId: string;
  proficiency: Proficiency;
  weight: number;
  demand: {
    value: number;
    percentile: number;
    trend: number;
    trendRescaled: number;
    count30d: number;
    countPrev30d: number;
    available: boolean;
  };
  exposure: {
    value: number;
    method: 'published_dataset' | 'llm_estimated' | 'mixed';
    taskCount: number;
    confidence: number;
  };
  resilience: number;
  score: number;
  quadrant: Quadrant;
  confidence: Confidence;
  includedInOverall: boolean;
  evidence: string | null;
  tasks: Array<{
    id: string;
    description: string;
    importance: number;
    aiExposure: number;
    exposureMethod: ExposureMethod;
  }>;
}

export interface ScoreResult {
  overall: number | null;
  overallConfidence: Confidence;
  quadrantCounts: Record<Quadrant, number>;
  coverage: { total: number; scored: number; insufficientData: number };
  skills: SkillScoreBreakdown[];
  weights: typeof SCORING_WEIGHTS;
  computedAt: string;
}

/** Percentile rank (0..1) of a value inside a distribution, average rank method. */
export function percentileRank(value: number, all: number[]): number {
  if (all.length === 0) return 0;
  const sorted = [...all].sort((a, b) => a - b);
  let below = 0;
  let equal = 0;
  for (const candidate of sorted) {
    if (candidate < value) below += 1;
    else if (candidate === value) equal += 1;
    else break;
  }
  return (below + equal / 2) / sorted.length;
}

/** Growth of demand between two windows, clamped to [-1, 1]. */
export function trendValue(count30d: number, countPrev30d: number): number {
  const denominator = Math.max(countPrev30d, 1);
  return clamp((count30d - countPrev30d) / denominator, -1, 1);
}

/** Importance-weighted mean AI exposure across a skill's tasks. */
export function weightedExposure(
  tasks: Array<{ importance: number | null; aiExposure: number }>,
): number {
  let weighted = 0;
  let total = 0;
  for (const task of tasks) {
    const weight = task.importance ?? 1;
    weighted += weight * task.aiExposure;
    total += weight;
  }
  if (total === 0) return 0;
  return clamp(weighted / total, 0, 1);
}

function classifyQuadrant(demand: number, resilience: number): Quadrant {
  const threshold = SCORING_WEIGHTS.quadrantThreshold;
  const highDemand = demand >= threshold;
  const highResilience = resilience >= threshold;
  if (highDemand && highResilience) return 'invest';
  if (highDemand && !highResilience) return 'adapt';
  if (!highDemand && highResilience) return 'niche';
  return 'transition';
}

function exposureMethodOf(tasks: TaskInput[]): 'published_dataset' | 'llm_estimated' | 'mixed' {
  const published = tasks.filter((t) => t.exposureMethod === 'published_dataset').length;
  if (published === 0) return 'llm_estimated';
  if (published === tasks.length) return 'published_dataset';
  return 'mixed';
}

function confidenceLabel(input: {
  taskCount: number;
  hasDemand: boolean;
  publishedShare: number;
  meanTaskConfidence: number;
}): Confidence {
  const { taskCount, hasDemand, publishedShare, meanTaskConfidence } = input;
  if (taskCount === 0) return 'insufficient';

  const meetsTaskBar = taskCount >= SCORING_WEIGHTS.minTasksForHighConfidence;
  const meetsSourceBar = publishedShare >= SCORING_WEIGHTS.minPublishedShareForHigh;

  if (meetsTaskBar && meetsSourceBar && hasDemand && meanTaskConfidence >= 0.7) return 'high';
  if (hasDemand && meanTaskConfidence >= 0.5) return 'medium';
  return 'low';
}

function overallConfidenceLabel(value: number): Confidence {
  if (value >= 0.8) return 'high';
  if (value >= 0.5) return 'medium';
  if (value > 0) return 'low';
  return 'insufficient';
}

/**
 * Computes the full breakdown. Same input always produces the same output.
 */
export function computeScore(input: ScoringInput, options: { now?: Date } = {}): ScoreResult {
  const { userSkills, demand, tasks } = input;

  const demandBySkill = new Map(demand.map((d) => [d.skillId, d]));
  const tasksBySkill = new Map<string, TaskInput[]>();
  for (const task of tasks) {
    const list = tasksBySkill.get(task.skillId);
    if (list) list.push(task);
    else tasksBySkill.set(task.skillId, [task]);
  }

  // Percentile is computed against every skill that has demand data,
  // so a user's score does not depend on which skills they happen to have.
  const allCounts = demand.map((d) => d.count30d);

  const breakdowns: SkillScoreBreakdown[] = userSkills.map((userSkill) => {
    const demandRow = demandBySkill.get(userSkill.skillId);
    const skillTasks = tasksBySkill.get(userSkill.skillId) ?? [];

    const percentile = demandRow ? percentileRank(demandRow.count30d, allCounts) : 0;
    const trend = demandRow ? trendValue(demandRow.count30d, demandRow.countPrev30d) : 0;
    const trendRescaled = (trend + 1) / 2;

    const demandValue = demandRow
      ? clamp(
          SCORING_WEIGHTS.demand.percentile * percentile +
            SCORING_WEIGHTS.demand.trend * trendRescaled,
          0,
          1,
        )
      : 0;

    const exposure = weightedExposure(skillTasks);
    const resilience = round(1 - exposure, 4);
    const score = round(
      100 *
        (SCORING_WEIGHTS.skillScore.demand * demandValue +
          SCORING_WEIGHTS.skillScore.resilience * resilience),
      2,
    );

    const publishedShare =
      skillTasks.length === 0
        ? 0
        : skillTasks.filter((t) => t.exposureMethod === 'published_dataset').length /
          skillTasks.length;

    const meanTaskConfidence =
      skillTasks.length === 0
        ? 0
        : skillTasks.reduce((sum, t) => sum + (t.exposureConfidence ?? 0.5), 0) / skillTasks.length;

    const confidence = confidenceLabel({
      taskCount: skillTasks.length,
      hasDemand: Boolean(demandRow),
      publishedShare,
      meanTaskConfidence,
    });

    return {
      skillId: userSkill.skillId,
      proficiency: userSkill.proficiency,
      weight: SCORING_WEIGHTS.proficiencyWeight[userSkill.proficiency],
      demand: {
        value: round(demandValue, 4),
        percentile: round(percentile, 4),
        trend: round(trend, 4),
        trendRescaled: round(trendRescaled, 4),
        count30d: demandRow?.count30d ?? 0,
        countPrev30d: demandRow?.countPrev30d ?? 0,
        available: Boolean(demandRow),
      },
      exposure: {
        value: round(exposure, 4),
        method: exposureMethodOf(skillTasks),
        taskCount: skillTasks.length,
        confidence: round(meanTaskConfidence, 3),
      },
      resilience,
      score,
      quadrant: classifyQuadrant(demandValue, resilience),
      confidence,
      includedInOverall: confidence !== 'insufficient',
      evidence: userSkill.evidence ?? null,
      tasks: skillTasks.map((t) => ({
        id: t.id,
        description: t.description,
        importance: round(t.importance ?? 1, 2),
        aiExposure: round(t.aiExposure, 2),
        exposureMethod: t.exposureMethod,
      })),
    };
  });

  const scored = breakdowns.filter((b) => b.includedInOverall);
  let overall: number | null = null;
  if (scored.length > 0) {
    const weighted = scored.reduce((sum, b) => sum + b.weight * b.score, 0);
    const totalWeight = scored.reduce((sum, b) => sum + b.weight, 0);
    overall = round(totalWeight === 0 ? 0 : weighted / totalWeight, 1);
  }

  const confidenceTotal = scored.reduce(
    (sum, b) => sum + b.weight * (SCORING_WEIGHTS.confidenceValue[b.confidence] ?? 0),
    0,
  );
  const confidenceWeight = scored.reduce((sum, b) => sum + b.weight, 0);
  const overallConfidence = overallConfidenceLabel(
    confidenceWeight === 0 ? 0 : confidenceTotal / confidenceWeight,
  );

  const quadrantCounts = QUADRANTS.reduce(
    (acc, quadrant) => {
      acc[quadrant] = breakdowns.filter((b) => b.quadrant === quadrant).length;
      return acc;
    },
    {} as Record<Quadrant, number>,
  );

  return {
    overall,
    overallConfidence,
    quadrantCounts,
    coverage: {
      total: breakdowns.length,
      scored: scored.length,
      insufficientData: breakdowns.length - scored.length,
    },
    skills: breakdowns,
    weights: SCORING_WEIGHTS,
    computedAt: (options.now ?? new Date()).toISOString(),
  };
}
