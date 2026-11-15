import { analyzeGap, metricsFromBreakdowns, pickTargetOccupation, recommendAdjacentRoles } from '@/lib/analysis/gap';
import type { DataProvider, Occupation, Skill } from '@/lib/data/types';
import { round } from '@/lib/math';
import { computeScore, type ScoreResult, type SkillScoreBreakdown } from '@/lib/scoring/score';
import { dedupeMatches, matchByName } from '@/lib/skills/dictionary';

export interface ScoreInput {
  skills: Array<{ name: string; proficiency?: 1 | 2 | 3 }>;
  target_occupation?: string | null;
  include_adjacent_roles?: boolean;
}

export interface ScoredSkillOut {
  input_name: string;
  skill_id: string;
  skill_key: string;
  skill_name: string;
  skill_name_bn: string | null;
  matched_by: 'exact' | 'alias';
  proficiency: number;
  weight: number;
  score: number;
  demand: number;
  demand_percentile: number;
  demand_trend: number;
  demand_postings_30d: number;
  resilience: number;
  exposure: number;
  quadrant: string;
  confidence: string;
  tasks_used: number;
}

export interface ScoreRun {
  score: ScoreResult;
  mapped: Array<{ skillId: string; inputName: string; matchedBy: 'exact' | 'alias'; proficiency: 1 | 2 | 3 }>;
  target: Occupation | null;
  gap: Awaited<ReturnType<typeof analyzeGap>> | null;
  adjacentRoles: Awaited<ReturnType<typeof recommendAdjacentRoles>>;
}

export interface ScoredResult {
  /** The untouched ScoreResult, so callers can explain it without recomputing. */
  raw: ScoreRun;
  score: number | null;
  confidence: string;
  band: string;
  target_occupation: { id: string; title: string; title_bn: string | null } | null;
  target_occupation_source: 'provided' | 'auto-selected' | 'none';
  target_coverage: number | null;
  scored_skills: ScoredSkillOut[];
  unmatched_skills: string[];
  quadrant_counts: Record<string, number>;
  top_gaps: Array<{
    skill_id: string;
    skill_key: string;
    name: string;
    name_bn: string | null;
    importance: number;
    demand: number;
    resilience: number;
    priority: number;
  }>;
  adjacent_roles: Array<{
    occupation_id: string;
    title: string;
    title_bn: string | null;
    overlap: number;
    resilience: number;
    score: number;
    missing_skills: Array<{ skill_id: string; name: string; importance: number }>;
  }>;
  provenance: {
    dataset_source: string;
    dataset_is_synthetic: boolean;
    skills_in_dataset: number;
    occupations_in_dataset: number;
    tasks_in_dataset: number;
    formula: string;
    computed_by: string;
    deterministic: true;
    llm_called: false;
  };
  warnings: string[];
}

/** The same band thresholds the score gauge uses (>=70 invest, >=50 adapt). */
export function bandOf(score: number | null): string {
  if (score === null) return 'none';
  if (score >= 70) return 'invest';
  if (score >= 50) return 'adapt';
  return 'transition';
}

/**
 * Scores a skills profile using the same deterministic code as the web app.
 *
 * No model is called here. The number is pure arithmetic over the local
 * dataset, so Claude, the website and the test suite all get the same answer.
 */
export async function scoreProfile(
  provider: DataProvider,
  input: ScoreInput,
): Promise<ScoredResult> {
  const warnings: string[] = [];
  const [skills, occupations] = await Promise.all([
    provider.listSkills(),
    provider.listOccupations(),
  ]);
  const skillsById = new Map(skills.map((s) => [s.id, s]));

  // ---- free-text names -> taxonomy ids (dictionary only, no embeddings)
  const names = input.skills.map((s) => s.name);
  const { results: matches } = matchByName(names, skills);
  const unmatched = matches.filter((m) => !m.skillId).map((m) => m.input);

  for (const name of unmatched) {
    warnings.push(`"${name}" could not be matched to the taxonomy and was not scored.`);
  }

  const mapped = dedupeMatches(matches)
    .filter((m): m is typeof m & { skillId: string } => Boolean(m.skillId))
    .map((match) => {
      const declared = input.skills.find((s) => s.name === match.input);
      return {
        skillId: match.skillId,
        inputName: match.input,
        matchedBy: match.method === 'exact' ? ('exact' as const) : ('alias' as const),
        proficiency: (declared?.proficiency ?? 2) as 1 | 2 | 3,
      };
    });

  // ---- target occupation: use it, fall back to best overlap
  let target: Occupation | null = null;
  let targetSource: ScoredResult['target_occupation_source'] = 'none';

  if (input.target_occupation) {
    target = resolveOccupation(occupations, input.target_occupation);
    if (!target) {
      warnings.push(
        `Target occupation "${input.target_occupation}" was not found in the dataset; the role with the best skill overlap was used instead.`,
      );
    }
  }

  if (target) {
    targetSource = 'provided';
  } else {
    const picked = await pickTargetOccupation(
      provider,
      mapped.map((m) => m.skillId),
    );
    if (picked) {
      target = picked.occupation;
      targetSource = 'auto-selected';
    }
  }

  // ---- the score itself
  const skillIds = mapped.map((m) => m.skillId);
  const [demand, taskEvidence] = await Promise.all([
    provider.getAllDemand(),
    provider.getTasksForSkills(skillIds),
  ]);

  const score = computeScore({
    userSkills: mapped.map((m) => ({ skillId: m.skillId, proficiency: m.proficiency })),
    demand: demand.map((d) => ({
      skillId: d.skillId,
      count30d: d.count30d,
      countPrev30d: d.countPrev30d,
    })),
    tasks: taskEvidence.map((e) => ({
      id: e.task.id,
      skillId: e.skillId,
      description: e.task.description,
      importance: e.task.importance,
      aiExposure: e.task.aiExposure,
      exposureMethod: e.task.exposureMethod,
      exposureConfidence: e.task.exposureConfidence,
    })),
  });

  const metricsBySkill = metricsFromBreakdowns(score.skills);
  const gap = target
    ? await analyzeGap(provider, target, skillIds, metricsBySkill, skillsById)
    : null;

  const adjacentRoles = input.include_adjacent_roles
    ? await recommendAdjacentRoles(provider, skillIds, skillsById, {
        limit: 3,
        excludeOccupationId: target?.id ?? null,
      })
    : [];

  const raw: ScoreRun = { score, mapped, target, gap, adjacentRoles };

  return {
    raw,
    score: score.overall === null ? null : round(score.overall, 1),
    confidence: score.overallConfidence,
    band: bandOf(score.overall),
    target_occupation: target
      ? { id: target.id, title: target.title, title_bn: target.titleBn }
      : null,
    target_occupation_source: targetSource,
    target_coverage: gap?.coverage ?? null,
    scored_skills: score.skills.map((b) => toSkillOut(b, mapped, skillsById)),
    unmatched_skills: unmatched,
    quadrant_counts: Object.fromEntries(Object.entries(score.quadrantCounts)),
    top_gaps: (gap?.gaps ?? []).slice(0, 5).map((g) => ({
      skill_id: g.skillId,
      skill_key: g.skillKey,
      name: g.name,
      name_bn: g.nameBn,
      importance: g.importance,
      demand: g.demand,
      resilience: g.resilience,
      priority: g.priority,
    })),
    adjacent_roles: adjacentRoles.map((r) => ({
      occupation_id: r.occupationId,
      title: r.title,
      title_bn: r.titleBn,
      overlap: r.overlap,
      resilience: r.resilience,
      score: r.score,
      missing_skills: r.missingSkills.map((m) => ({
        skill_id: m.skillId,
        name: m.name,
        importance: m.importance,
      })),
    })),
    provenance: {
      dataset_source: provider.meta.source,
      dataset_is_synthetic: provider.meta.isSynthetic,
      skills_in_dataset: provider.meta.skills,
      occupations_in_dataset: provider.meta.occupations,
      tasks_in_dataset: provider.meta.tasks,
      formula:
        'demand = 0.7*percentile(count30d) + 0.3*trend01; resilience = 1 - Σ(importance*exposure)/Σ(importance); skillScore = 100*(0.5*demand + 0.5*resilience); overall = Σ(proficiency*skillScore)/Σ(proficiency)',
      computed_by: 'lib/scoring/score.ts — deterministic TypeScript, no model in the loop',
      deterministic: true,
      llm_called: false,
    },
    warnings: [...new Set(warnings)],
  };
}

function resolveOccupation(occupations: Occupation[], query: string): Occupation | null {
  const needle = query.toLowerCase().trim();
  return (
    occupations.find(
      (o) =>
        o.key.toLowerCase() === needle ||
        o.id.toLowerCase() === needle ||
        o.title.toLowerCase() === needle ||
        (o.titleBn ?? '').trim().toLowerCase() === needle,
    ) ?? null
  );
}

function toSkillOut(
  b: SkillScoreBreakdown,
  mapped: Array<{ skillId: string; inputName: string; matchedBy: 'exact' | 'alias' }>,
  skillsById: Map<string, Skill>,
): ScoredSkillOut {
  const entry = mapped.find((m) => m.skillId === b.skillId);
  const skill = skillsById.get(b.skillId);
  return {
    input_name: entry?.inputName ?? skill?.name ?? b.skillId,
    skill_id: b.skillId,
    skill_key: skill?.key ?? b.skillId,
    skill_name: skill?.name ?? b.skillId,
    skill_name_bn: skill?.nameBn ?? null,
    matched_by: entry?.matchedBy ?? 'alias',
    proficiency: b.proficiency,
    weight: b.weight,
    score: round(b.score, 1),
    demand: round(b.demand.value, 3),
    demand_percentile: round(b.demand.percentile, 3),
    demand_trend: round(b.demand.trend, 3),
    demand_postings_30d: b.demand.count30d,
    resilience: round(b.resilience, 3),
    exposure: round(b.exposure.value, 3),
    quadrant: b.quadrant,
    confidence: b.confidence,
    tasks_used: b.tasks.length,
  };
}
