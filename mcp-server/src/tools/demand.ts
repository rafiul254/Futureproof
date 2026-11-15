import type { DataProvider } from '@/lib/data/types';
import { round } from '@/lib/math';
import { percentileRank, trendValue } from '@/lib/scoring/score';
import { matchByName } from '@/lib/skills/dictionary';

export interface DemandResult {
  query: string | null;
  dataset_source: string;
  dataset_is_synthetic: boolean;
  skills_in_dataset: number;
  rows: Array<{
    skill_key: string;
    name: string;
    name_bn: string | null;
    category: string | null;
    postings_30d: number;
    postings_prev_30d: number;
    trend: number;
    demand_percentile: number;
    demand_value: number;
    linked_tasks: number;
    mean_ai_exposure: number | null;
    resilience: number | null;
    verified_courses: Array<{ title: string; provider: string | null; url: string | null; cost_usd: number | null }>;
  }>;
  warnings: string[];
}

/**
 * Demand lookup straight from the dataset — the same numbers the score uses.
 * No model, no estimation: if a number is not in the dataset it is reported as
 * null rather than guessed.
 */
export async function lookupSkillDemand(
  provider: DataProvider,
  options: { query?: string | null; limit?: number } = {},
): Promise<DemandResult> {
  const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
  const warnings: string[] = [];

  const [skills, demand] = await Promise.all([
    provider.listSkills(),
    provider.getAllDemand(),
  ]);
  const skillsById = new Map(skills.map((s) => [s.id, s]));

  let rows = demand;

  if (options.query) {
    const { results } = matchByName([options.query], skills);
    const match = results[0];
    if (match?.skillId) {
      rows = demand.filter((d) => d.skillId === match.skillId);
    } else {
      // No taxonomy hit: fall back to a plain substring search on the name, and
      // say loudly that this is a text search, not a scored match.
      const needle = options.query.toLowerCase().trim();
      const hits = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(needle) ||
          s.aliases.some((a) => a.toLowerCase().includes(needle)),
      );
      const ids = new Set(hits.map((s) => s.id));
      rows = demand.filter((d) => ids.has(d.skillId));
      warnings.push(
        `"${options.query}" is not in the taxonomy. Results below are a text search over skill names, not a scored match.`,
      );
    }
  }

  rows = rows.slice(0, limit);

  const allCounts = demand.map((d) => d.count30d);
  const skillIds = rows.map((r) => r.skillId);
  const [tasks, courses] = await Promise.all([
    provider.getTasksForSkills(skillIds),
    provider.getCoursesForSkills(skillIds, { verifiedOnly: true }),
  ]);

  const tasksBySkill = new Map<string, number[]>();
  for (const evidence of tasks) {
    const list = tasksBySkill.get(evidence.skillId);
    if (list) list.push(evidence.task.aiExposure);
    else tasksBySkill.set(evidence.skillId, [evidence.task.aiExposure]);
  }

  const coursesBySkill = new Map<string, DemandResult['rows'][number]['verified_courses']>();
  for (const course of courses) {
    for (const skillId of course.skillIds) {
      const list = coursesBySkill.get(skillId) ?? [];
      if (list.length < 3) {
        list.push({
          title: course.title,
          provider: course.provider,
          url: course.url,
          cost_usd: course.costUsd === 0 || course.costUsd > 0 ? course.costUsd : null,
        });
        coursesBySkill.set(skillId, list);
      }
    }
  }

  if (provider.meta.source === 'curated-local') {
    warnings.push(
      'Demand counts come from the curated seed dataset, not live job boards. They are labelled synthetic and must not be quoted as real market data.',
    );
  }

  return {
    query: options.query ?? null,
    dataset_source: provider.meta.source,
    dataset_is_synthetic: provider.meta.isSynthetic,
    skills_in_dataset: provider.meta.skills,
    rows: rows.map((row) => {
      const skill = skillsById.get(row.skillId);
      const exposures = tasksBySkill.get(row.skillId) ?? [];
      const percentile = percentileRank(row.count30d, allCounts);
      const trend = trendValue(row.count30d, row.countPrev30d);
      return {
        skill_key: skill?.key ?? row.skillId,
        name: skill?.name ?? row.skillId,
        name_bn: skill?.nameBn ?? null,
        category: skill?.category ?? null,
        postings_30d: row.count30d,
        postings_prev_30d: row.countPrev30d,
        trend: round(trend, 3),
        demand_percentile: round(percentile, 3),
        demand_value: round(0.7 * percentile + 0.3 * ((trend + 1) / 2), 3),
        linked_tasks: exposures.length,
        mean_ai_exposure:
          exposures.length === 0
            ? null
            : round(
                exposures.reduce((sum, v) => sum + v, 0) / exposures.length,
                3,
              ),
        resilience:
          exposures.length === 0
            ? null
            : round(1 - exposures.reduce((sum, v) => sum + v, 0) / exposures.length, 3),
        verified_courses: coursesBySkill.get(row.skillId) ?? [],
      };
    }),
    warnings: [...new Set(warnings)],
  };
}
