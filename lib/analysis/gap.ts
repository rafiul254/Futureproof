import type { DataProvider, Occupation, Skill, Task } from '@/lib/data/types';
import type { SkillScoreBreakdown } from '@/lib/scoring/score';
import { round } from '@/lib/math';

// No 'server-only' guard here on purpose: this is provider-agnostic set maths,
// and the MCP server reuses it from a plain Node process with its own provider.

/**
 * Gap analysis and safer-adjacent-role recommendations (spec 7.4).
 * Pure set maths plus the already-computed demand/resilience values.
 */

export interface GapItem {
  skillId: string;
  skillKey: string;
  name: string;
  nameBn: string | null;
  importance: number;
  demand: number;
  resilience: number;
  priority: number;
}

export interface GapAnalysis {
  target: Occupation;
  gaps: GapItem[];
  matched: Array<{ skillId: string; name: string; importance: number }>;
  coverage: number;
  requiredCount: number;
}

export interface AdjacentRole {
  occupationId: string;
  title: string;
  titleBn: string | null;
  overlap: number;
  resilience: number;
  score: number;
  missingSkills: Array<{
    skillId: string;
    name: string;
    nameBn: string | null;
    importance: number;
  }>;
}

/** Importance-weighted mean of (1 - AI exposure) over an occupation's tasks. */
export function occupationResilience(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  let weighted = 0;
  let total = 0;
  for (const task of tasks) {
    const weight = task.importance ?? 1;
    weighted += weight * (1 - task.aiExposure);
    total += weight;
  }
  return total === 0 ? 0 : weighted / total;
}

export interface SkillMetrics {
  demand: number;
  resilience: number;
}

/**
 * Picks the target occupation automatically when the user did not choose one:
 * the best importance-weighted overlap with the user's mapped skills.
 */
export async function pickTargetOccupation(
  provider: DataProvider,
  userSkillIds: string[],
): Promise<{ occupation: Occupation; overlap: number } | null> {
  const [occupations, links] = await Promise.all([
    provider.listOccupations(),
    provider.getAllOccupationSkills(),
  ]);
  if (occupations.length === 0) return null;

  const user = new Set(userSkillIds);
  const byOccupation = new Map<string, { total: number; matched: number }>();

  for (const link of links) {
    const entry = byOccupation.get(link.occupationId) ?? { total: 0, matched: 0 };
    entry.total += link.importance;
    if (user.has(link.skillId)) entry.matched += link.importance;
    byOccupation.set(link.occupationId, entry);
  }

  let best: { occupation: Occupation; overlap: number } | null = null;
  for (const occupation of occupations) {
    const entry = byOccupation.get(occupation.id);
    if (!entry || entry.total === 0) continue;
    const overlap = entry.matched / entry.total;
    if (!best || overlap > best.overlap) best = { occupation, overlap };
  }

  return best;
}

/**
 * Skills the target role needs (importance >= 0.5) that the user does not have.
 * Priority = importance * (0.5 * demand + 0.5 * resilience).
 */
export async function analyzeGap(
  provider: DataProvider,
  target: Occupation,
  userSkillIds: string[],
  metricsBySkill: Map<string, SkillMetrics>,
  skillsById: Map<string, Skill>,
): Promise<GapAnalysis> {
  const links = await provider.getOccupationSkills(target.id);
  const user = new Set(userSkillIds);

  const gaps: GapItem[] = [];
  const matched: GapAnalysis['matched'] = [];
  let requiredCount = 0;
  let matchedWeight = 0;
  let requiredWeight = 0;

  for (const link of links) {
    const skill = skillsById.get(link.skillId);
    if (!skill) continue;

    if (user.has(link.skillId)) {
      matched.push({ skillId: link.skillId, name: skill.name, importance: link.importance });
      matchedWeight += link.importance;
      requiredWeight += link.importance;
      continue;
    }

    if (link.importance < 0.5) continue; // only meaningful requirements become gaps

    requiredCount += 1;
    requiredWeight += link.importance;

    const metrics = metricsBySkill.get(link.skillId) ?? { demand: 0, resilience: 0.5 };
    const priority = link.importance * (0.5 * metrics.demand + 0.5 * metrics.resilience);

    gaps.push({
      skillId: link.skillId,
      skillKey: skill.key,
      name: skill.name,
      nameBn: skill.nameBn,
      importance: round(link.importance, 3),
      demand: round(metrics.demand, 3),
      resilience: round(metrics.resilience, 3),
      priority: round(priority, 4),
    });
  }

  gaps.sort((a, b) => b.priority - a.priority);

  return {
    target,
    gaps,
    matched: matched.sort((a, b) => b.importance - a.importance),
    coverage: requiredWeight === 0 ? 0 : round(matchedWeight / requiredWeight, 3),
    requiredCount,
  };
}

/**
 * Roles the user could move into: rank by (overlap * 0.6) + (resilience * 0.4).
 * Overlap is the share of the target role's required-skill importance the user
 * already has — i.e. how easy the transition is.
 */
export async function recommendAdjacentRoles(
  provider: DataProvider,
  userSkillIds: string[],
  skillsById: Map<string, Skill>,
  options: { limit?: number; excludeOccupationId?: string | null } = {},
): Promise<AdjacentRole[]> {
  const limit = options.limit ?? 3;
  const [occupations, links] = await Promise.all([
    provider.listOccupations(),
    provider.getAllOccupationSkills(),
  ]);

  const user = new Set(userSkillIds);
  const byOccupation = new Map<string, Array<{ skillId: string; importance: number }>>();
  for (const link of links) {
    const list = byOccupation.get(link.occupationId);
    if (list) list.push({ skillId: link.skillId, importance: link.importance });
    else
      byOccupation.set(link.occupationId, [{ skillId: link.skillId, importance: link.importance }]);
  }

  // Tasks are needed for resilience; fetch per occupation in one call.
  const tasks = await provider.getTasksForOccupations(occupations.map((o) => o.id));
  const tasksByOccupation = new Map<string, Task[]>();
  for (const task of tasks) {
    const list = tasksByOccupation.get(task.occupationId);
    if (list) list.push(task);
    else tasksByOccupation.set(task.occupationId, [task]);
  }

  const roles: AdjacentRole[] = [];

  for (const occupation of occupations) {
    if (occupation.id === options.excludeOccupationId) continue;
    const requirements = byOccupation.get(occupation.id) ?? [];
    if (requirements.length === 0) continue;

    let totalWeight = 0;
    let matchedWeight = 0;
    const missing: AdjacentRole['missingSkills'] = [];

    for (const requirement of requirements) {
      totalWeight += requirement.importance;
      if (user.has(requirement.skillId)) {
        matchedWeight += requirement.importance;
      } else if (requirement.importance >= 0.5) {
        const skill = skillsById.get(requirement.skillId);
        if (skill) {
          missing.push({
            skillId: requirement.skillId,
            name: skill.name,
            nameBn: skill.nameBn,
            importance: round(requirement.importance, 3),
          });
        }
      }
    }

    if (totalWeight === 0) continue;

    const overlap = matchedWeight / totalWeight;
    const resilience = occupationResilience(tasksByOccupation.get(occupation.id) ?? []);
    const score = overlap * 0.6 + resilience * 0.4;

    roles.push({
      occupationId: occupation.id,
      title: occupation.title,
      titleBn: occupation.titleBn,
      overlap: round(overlap, 3),
      resilience: round(resilience, 3),
      score: round(score, 4),
      missingSkills: missing.sort((a, b) => b.importance - a.importance).slice(0, 5),
    });
  }

  return roles.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Builds the demand/resilience lookup used by the gap priority formula. */
export function metricsFromBreakdowns(
  breakdowns: SkillScoreBreakdown[],
): Map<string, SkillMetrics> {
  const map = new Map<string, SkillMetrics>();
  for (const breakdown of breakdowns) {
    map.set(breakdown.skillId, {
      demand: breakdown.demand.value,
      resilience: breakdown.resilience,
    });
  }
  return map;
}
