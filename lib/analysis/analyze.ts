import 'server-only';

import { getDataProvider, type DataProvider } from '@/lib/data';
import type { ExtractedProfile } from '@/lib/cv/extract';
import { extractProfile } from '@/lib/cv/extract';
import { normalizeSkillNames } from '@/lib/skills/normalize';
import { computeScore, type ScoreResult, type Proficiency } from '@/lib/scoring/score';

import {
  analyzeGap,
  metricsFromBreakdowns,
  pickTargetOccupation,
  recommendAdjacentRoles,
  type AdjacentRole,
  type GapAnalysis,
} from './gap';

/**
 * The analysis pipeline. One call takes scrubbed CV text to a full result.
 *
 * Order: extract -> normalise -> score -> gap -> adjacent roles.
 * Every number comes from tested code; the LLM only extracts and (later) explains.
 */

export const ANALYSIS_VERSION = 1;

export interface MappedSkill {
  skillId: string;
  skillKey: string;
  name: string;
  nameBn: string | null;
  category: string | null;
  proficiency: Proficiency;
  matchSimilarity: number;
  matchMethod: string;
  evidence: string | null;
}

export interface UnmappedSkill {
  name: string;
  reason: string;
  proficiency: Proficiency;
}

export interface AnalysisResult {
  version: number;
  locale: string;
  createdAt: string;
  extraction: {
    method: 'llm' | 'offline';
    provider: string | null;
    model: string | null;
  };
  profile: ExtractedProfile;
  mappedSkills: MappedSkill[];
  unmappedSkills: UnmappedSkill[];
  score: ScoreResult;
  target: {
    occupationId: string;
    title: string;
    titleBn: string | null;
    autoPicked: boolean;
  } | null;
  gaps: GapAnalysis | null;
  adjacentRoles: AdjacentRole[];
  dataNotes: {
    provider: 'curated-local' | 'supabase';
    syntheticPostings: boolean;
    exposureMethods: Array<'published_dataset' | 'llm_estimated' | 'mixed'>;
    isSample: boolean;
  };
}

export interface AnalyzeOptions {
  scrubbedText: string;
  locale: string;
  targetOccupationId?: string | null;
  isSample?: boolean;
  provider?: DataProvider;
  forceOffline?: boolean;
}

export async function runAnalysis(options: AnalyzeOptions): Promise<AnalysisResult> {
  const provider = options.provider ?? (await getDataProvider());
  const [skills, occupations] = await Promise.all([
    provider.listSkills(),
    provider.listOccupations(),
  ]);

  const extraction = await extractProfile(options.scrubbedText, {
    locale: options.locale,
    skills,
    forceOffline: options.forceOffline,
  });

  const profile = extraction.profile;

  // Normalise the extracted skill names onto the taxonomy.
  const names = profile.skills.map((s) => s.name);
  const matches = await normalizeSkillNames(names, skills);

  const skillsById = new Map(skills.map((s) => [s.id, s]));
  const mappedSkills: MappedSkill[] = [];
  const unmappedSkills: UnmappedSkill[] = [];
  const seen = new Set<string>();

  matches.forEach((match, index) => {
    const source = profile.skills[index];
    if (!source) return;

    if (!match.skillId) {
      unmappedSkills.push({
        name: source.name,
        reason: 'no-taxonomy-match',
        proficiency: source.proficiency,
      });
      return;
    }

    if (seen.has(match.skillId)) return;
    seen.add(match.skillId);

    const skill = skillsById.get(match.skillId);
    if (!skill) return;

    mappedSkills.push({
      skillId: skill.id,
      skillKey: skill.key,
      name: skill.name,
      nameBn: skill.nameBn,
      category: skill.category,
      proficiency: source.proficiency,
      matchSimilarity: match.similarity,
      matchMethod: match.method,
      evidence: source.evidence || null,
    });
  });

  // Score: demand from postings, exposure from linked tasks.
  const skillIds = mappedSkills.map((s) => s.skillId);
  const [demand, taskEvidence] = await Promise.all([
    provider.getAllDemand(),
    provider.getTasksForSkills(skillIds),
  ]);

  const score = computeScore({
    userSkills: mappedSkills.map((s) => ({
      skillId: s.skillId,
      proficiency: s.proficiency,
    })),
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

  // Target occupation: chosen by the user, otherwise the best overlap.
  let targetOccupationId = options.targetOccupationId ?? null;
  let autoPicked = false;

  if (!targetOccupationId) {
    const picked = await pickTargetOccupation(provider, skillIds);
    if (picked) {
      targetOccupationId = picked.occupation.id;
      autoPicked = true;
    }
  }

  const targetOccupation = targetOccupationId
    ? (occupations.find((o) => o.id === targetOccupationId) ?? null)
    : null;

  const metrics = metricsFromBreakdowns(score.skills);

  const gaps = targetOccupation
    ? await analyzeGap(provider, targetOccupation, skillIds, metrics, skillsById)
    : null;

  const adjacentRoles = await recommendAdjacentRoles(provider, skillIds, skillsById, {
    limit: 3,
    excludeOccupationId: null,
  });

  const exposureMethods = [...new Set(score.skills.map((s) => s.exposure.method))] as Array<
    'published_dataset' | 'llm_estimated' | 'mixed'
  >;

  return {
    version: ANALYSIS_VERSION,
    locale: options.locale,
    createdAt: new Date().toISOString(),
    extraction: {
      method: extraction.method,
      provider: extraction.provider,
      model: extraction.model,
    },
    profile,
    mappedSkills,
    unmappedSkills,
    score,
    target: targetOccupation
      ? {
          occupationId: targetOccupation.id,
          title: targetOccupation.title,
          titleBn: targetOccupation.titleBn,
          autoPicked,
        }
      : null,
    gaps,
    adjacentRoles,
    dataNotes: {
      provider: provider.meta.source,
      syntheticPostings: provider.meta.syntheticPostings > 0,
      exposureMethods,
      isSample: Boolean(options.isSample),
    },
  };
}

/** Convenience: re-run just the target-role dependent parts. */
export async function recomputeForTarget(
  result: AnalysisResult,
  targetOccupationId: string,
): Promise<AnalysisResult> {
  const provider = await getDataProvider();
  const [skills, occupations] = await Promise.all([
    provider.listSkills(),
    provider.listOccupations(),
  ]);
  const skillsById = new Map(skills.map((s) => [s.id, s]));
  const occupation = occupations.find((o) => o.id === targetOccupationId);
  if (!occupation) return result;

  const metrics = metricsFromBreakdowns(result.score.skills);
  const skillIds = result.mappedSkills.map((s) => s.skillId);
  const gaps = await analyzeGap(provider, occupation, skillIds, metrics, skillsById);

  return {
    ...result,
    target: {
      occupationId: occupation.id,
      title: occupation.title,
      titleBn: occupation.titleBn,
      autoPicked: false,
    },
    gaps,
  };
}
