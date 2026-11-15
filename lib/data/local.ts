import { readFileSync } from 'node:fs';
import path from 'node:path';

import type {
  Course,
  DataProvider,
  DatasetMeta,
  JobPosting,
  Occupation,
  OccupationSkill,
  SampleProfile,
  Skill,
  SkillDemand,
  Task,
  TaskEvidence,
  TaskSkill,
} from './types';

/**
 * Reads the curated JSON seed shipped in `data/seed/`.
 *
 * Used when Supabase is not configured, so the whole product is usable and
 * demoable with no external services. The data is identical to what the
 * Python pipeline writes to Postgres.
 */

const DEFAULT_SEED_DIR = path.join(process.cwd(), 'data', 'seed');

/**
 * Overridable so non-Next processes (the MCP server, one-off scripts) can point
 * at the seed data no matter which directory they were launched from.
 */
let seedDir = DEFAULT_SEED_DIR;

function read<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(seedDir, file), 'utf8')) as T;
}

interface Dataset {
  skills: Skill[];
  occupations: Occupation[];
  tasks: Task[];
  occupationSkills: OccupationSkill[];
  taskSkills: TaskSkill[];
  demand: SkillDemand[];
  courses: Course[];
  postings: JobPosting[];
  samples: SampleProfile[];
}

/** Cached across requests and hot reloads. */
const globalForData = globalThis as unknown as { __fpDataset?: Dataset };

function loadDataset(): Dataset {
  if (globalForData.__fpDataset) return globalForData.__fpDataset;

  const rawSkills = read<Array<Record<string, unknown>>>('skills.json');
  const rawOccupations = read<Array<Record<string, unknown>>>('occupations.json');
  const rawTasks = read<Array<Record<string, unknown>>>('tasks.json');
  const rawOccSkills = read<Array<Record<string, unknown>>>('occupation_skills.json');
  const rawTaskSkills = read<Array<Record<string, unknown>>>('task_skills.json');
  const rawDemand = read<Array<Record<string, unknown>>>('skill_demand.json');
  const rawCourses = read<Array<Record<string, unknown>>>('courses.json');
  const rawPostings = read<Array<Record<string, unknown>>>('job_postings.json');

  const dataset: Dataset = {
    skills: rawSkills.map((s) => ({
      id: s['id'] as string,
      key: s['key'] as string,
      name: s['name'] as string,
      nameBn: (s['name_bn'] as string) ?? null,
      category: (s['category'] as string) ?? null,
      aliases: (s['aliases'] as string[]) ?? [],
      sourceId: (s['source_id'] as string) ?? null,
    })),
    occupations: rawOccupations.map((o) => ({
      id: o['id'] as string,
      key: o['key'] as string,
      title: o['title'] as string,
      titleBn: (o['title_bn'] as string) ?? null,
      onetCode: (o['onet_code'] as string) ?? null,
      description: (o['description'] as string) ?? null,
    })),
    tasks: rawTasks.map((t) => ({
      id: t['id'] as string,
      occupationId: t['occupation_id'] as string,
      description: t['description'] as string,
      importance: Number(t['importance'] ?? 0),
      aiExposure: Number(t['ai_exposure'] ?? 0),
      exposureSource: (t['exposure_source'] as string) ?? null,
      exposureMethod: (t['exposure_method'] as Task['exposureMethod']) ?? 'llm_estimated',
      exposureConfidence: Number(t['exposure_confidence'] ?? 0.5),
    })),
    occupationSkills: rawOccSkills.map((o) => ({
      occupationId: o['occupation_id'] as string,
      skillId: o['skill_id'] as string,
      importance: Number(o['importance'] ?? 0),
    })),
    taskSkills: rawTaskSkills.map((t) => ({
      taskId: t['task_id'] as string,
      skillId: t['skill_id'] as string,
    })),
    demand: rawDemand.map((d) => ({
      skillId: d['skill_id'] as string,
      count30d: Number(d['count_30d'] ?? 0),
      countPrev30d: Number(d['count_prev_30d'] ?? 0),
    })),
    courses: rawCourses.map((c) => ({
      id: c['id'] as string,
      key: c['key'] as string,
      title: c['title'] as string,
      provider: (c['provider'] as string) ?? null,
      url: (c['url'] as string) ?? null,
      language: (c['language'] as string) ?? 'en',
      costUsd: Number(c['cost_usd'] ?? 0),
      durationHours: c['duration_hours'] === null ? null : Number(c['duration_hours']),
      level: (c['level'] as string) ?? null,
      skillIds: (c['skill_ids'] as string[]) ?? [],
      verified: Boolean(c['verified']),
      notes: (c['notes'] as string) ?? null,
    })),
    postings: rawPostings.map((p) => ({
      id: p['id'] as string,
      title: p['title'] as string,
      company: (p['company'] as string) ?? null,
      source: p['source'] as string,
      sourceUrl: (p['source_url'] as string) ?? null,
      postedAt: (p['posted_at'] as string) ?? null,
      location: (p['location'] as string) ?? null,
      occupationId: (p['occupation_id'] as string) ?? null,
      isSynthetic: Boolean(p['is_synthetic']),
    })),
    samples: read<SampleProfile[]>('sample_profiles.json'),
  };

  globalForData.__fpDataset = dataset;
  return dataset;
}

function buildIndexes(dataset: Dataset) {
  const tasksBySkill = new Map<string, string[]>();
  for (const link of dataset.taskSkills) {
    const list = tasksBySkill.get(link.skillId);
    if (list) list.push(link.taskId);
    else tasksBySkill.set(link.skillId, [link.taskId]);
  }

  const taskById = new Map(dataset.tasks.map((t) => [t.id, t]));
  const demandBySkill = new Map(dataset.demand.map((d) => [d.skillId, d]));
  const occupationSkillsByOccupation = new Map<string, OccupationSkill[]>();
  for (const link of dataset.occupationSkills) {
    const list = occupationSkillsByOccupation.get(link.occupationId);
    if (list) list.push(link);
    else occupationSkillsByOccupation.set(link.occupationId, [link]);
  }

  return { tasksBySkill, taskById, demandBySkill, occupationSkillsByOccupation };
}

function metaFor(dataset: Dataset): DatasetMeta {
  return {
    skills: dataset.skills.length,
    occupations: dataset.occupations.length,
    tasks: dataset.tasks.length,
    courses: dataset.courses.length,
    verifiedCourses: dataset.courses.filter((c) => c.verified).length,
    postings: dataset.postings.length,
    syntheticPostings: dataset.postings.filter((p) => p.isSynthetic).length,
    source: 'curated-local',
    isSynthetic: true,
    generatedAt: null,
  };
}

export function createLocalProvider(customSeedDir?: string): DataProvider {
  if (customSeedDir) seedDir = path.resolve(customSeedDir);

  const dataset = loadDataset();
  const indexes = buildIndexes(dataset);
  const meta = metaFor(dataset);

  return {
    meta,

    async listSkills() {
      return dataset.skills;
    },

    async listOccupations() {
      return dataset.occupations;
    },

    async getOccupation(id) {
      return dataset.occupations.find((o) => o.id === id) ?? null;
    },

    async getOccupationSkills(occupationId) {
      return indexes.occupationSkillsByOccupation.get(occupationId) ?? [];
    },

    async getAllOccupationSkills() {
      return dataset.occupationSkills;
    },

    async getTasksForSkills(skillIds) {
      const evidence: TaskEvidence[] = [];
      const seen = new Set<string>();
      for (const skillId of skillIds) {
        for (const taskId of indexes.tasksBySkill.get(skillId) ?? []) {
          const task = indexes.taskById.get(taskId);
          if (!task) continue;
          const dedupeKey = `${taskId}:${skillId}`;
          if (seen.has(dedupeKey)) continue;
          seen.add(dedupeKey);
          evidence.push({ task, skillId });
        }
      }
      return evidence;
    },

    async getTasksForOccupations(occupationIds) {
      const wanted = new Set(occupationIds);
      return dataset.tasks.filter((task) => wanted.has(task.occupationId));
    },

    async getAllDemand() {
      return dataset.demand;
    },

    async getDemandForSkills(skillIds) {
      return skillIds
        .map((id) => indexes.demandBySkill.get(id))
        .filter((d): d is SkillDemand => Boolean(d));
    },

    async getCoursesForSkills(skillIds, options) {
      const verifiedOnly = options?.verifiedOnly ?? true;
      const wanted = new Set(skillIds);
      return dataset.courses.filter((course) => {
        if (verifiedOnly && !course.verified) return false;
        return course.skillIds.some((id) => wanted.has(id));
      });
    },

    async listCourses() {
      return dataset.courses;
    },

    async getSampleProfiles() {
      return dataset.samples;
    },
  };
}
