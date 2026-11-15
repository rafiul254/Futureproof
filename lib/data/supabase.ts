import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import type {
  Course,
  DataProvider,
  DatasetMeta,
  Occupation,
  OccupationSkill,
  SampleProfile,
  Skill,
  SkillDemand,
  Task,
  TaskEvidence,
} from './types';

/**
 * Supabase-backed provider.
 *
 * Used automatically when NEXT_PUBLIC_SUPABASE_URL + anon key are set.
 * Reads the same data the Python pipeline writes. Reference tables are
 * read-only for authenticated users (RLS); when a service-role key is
 * present we use it for server-side reads so public pages (methodology)
 * can show dataset counts.
 */

const SAMPLES: SampleProfile[] = []; // sample CVs live in code, not in the DB

async function readClient() {
  try {
    return createAdminClient();
  } catch {
    return createClient();
  }
}

type Row = Record<string, unknown>;

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function createSupabaseProvider(): DataProvider {
  return {
    get meta(): DatasetMeta {
      return {
        skills: 0,
        occupations: 0,
        tasks: 0,
        courses: 0,
        verifiedCourses: 0,
        postings: 0,
        syntheticPostings: 0,
        source: 'supabase',
        isSynthetic: false,
        generatedAt: null,
      };
    },

    async listSkills(): Promise<Skill[]> {
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('skills')
        .select('id, name, name_bn, category, source_id');
      if (error) throw new Error(`skills: ${error.message}`);
      return (data as Row[]).map((r) => ({
        id: r['id'] as string,
        key: (r['source_id'] as string)?.replace('curated:', '') ?? (r['id'] as string),
        name: r['name'] as string,
        nameBn: (r['name_bn'] as string) ?? null,
        category: (r['category'] as string) ?? null,
        aliases: [],
        sourceId: (r['source_id'] as string) ?? null,
      }));
    },

    async listOccupations(): Promise<Occupation[]> {
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('occupations')
        .select('id, title, title_bn, onet_code, description');
      if (error) throw new Error(`occupations: ${error.message}`);
      return (data as Row[]).map((r) => ({
        id: r['id'] as string,
        key: (r['onet_code'] as string) ?? (r['id'] as string),
        title: r['title'] as string,
        titleBn: (r['title_bn'] as string) ?? null,
        onetCode: (r['onet_code'] as string) ?? null,
        description: (r['description'] as string) ?? null,
      }));
    },

    async getOccupation(id: string): Promise<Occupation | null> {
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('occupations')
        .select('id, title, title_bn, onet_code, description')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(`occupation: ${error.message}`);
      if (!data) return null;
      const r = data as Row;
      return {
        id: r['id'] as string,
        key: (r['onet_code'] as string) ?? (r['id'] as string),
        title: r['title'] as string,
        titleBn: (r['title_bn'] as string) ?? null,
        onetCode: (r['onet_code'] as string) ?? null,
        description: (r['description'] as string) ?? null,
      };
    },

    async getOccupationSkills(occupationId: string): Promise<OccupationSkill[]> {
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('occupation_skills')
        .select('occupation_id, skill_id, importance')
        .eq('occupation_id', occupationId);
      if (error) throw new Error(`occupation_skills: ${error.message}`);
      return (data as Row[]).map((r) => ({
        occupationId: r['occupation_id'] as string,
        skillId: r['skill_id'] as string,
        importance: num(r['importance']),
      }));
    },

    async getAllOccupationSkills(): Promise<OccupationSkill[]> {
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('occupation_skills')
        .select('occupation_id, skill_id, importance');
      if (error) throw new Error(`occupation_skills: ${error.message}`);
      return (data as Row[]).map((r) => ({
        occupationId: r['occupation_id'] as string,
        skillId: r['skill_id'] as string,
        importance: num(r['importance']),
      }));
    },

    async getTasksForSkills(skillIds: string[]): Promise<TaskEvidence[]> {
      if (skillIds.length === 0) return [];
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('task_skills')
        .select(
          'task_id, skill_id, tasks!inner(id, occupation_id, description, importance, ai_exposure, exposure_source, exposure_method, exposure_confidence)',
        )
        .in('skill_id', skillIds);
      if (error) throw new Error(`task_skills: ${error.message}`);

      const evidence: TaskEvidence[] = [];
      for (const row of (data ?? []) as Row[]) {
        const task = row['tasks'] as Row | Row[] | null;
        const t = Array.isArray(task) ? task[0] : task;
        if (!t) continue;
        evidence.push({
          task: {
            id: t['id'] as string,
            occupationId: t['occupation_id'] as string,
            description: t['description'] as string,
            importance: num(t['importance']),
            aiExposure: num(t['ai_exposure']),
            exposureSource: (t['exposure_source'] as string) ?? null,
            exposureMethod: (t['exposure_method'] as Task['exposureMethod']) ?? 'llm_estimated',
            exposureConfidence: num(t['exposure_confidence'], 0.5),
          },
          skillId: row['skill_id'] as string,
        });
      }
      return evidence;
    },

    async getTasksForOccupations(occupationIds: string[]): Promise<Task[]> {
      if (occupationIds.length === 0) return [];
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('tasks')
        .select(
          'id, occupation_id, description, importance, ai_exposure, exposure_source, exposure_method, exposure_confidence',
        )
        .in('occupation_id', occupationIds);
      if (error) throw new Error(`tasks: ${error.message}`);
      return (data as Row[]).map((t) => ({
        id: t['id'] as string,
        occupationId: t['occupation_id'] as string,
        description: t['description'] as string,
        importance: num(t['importance']),
        aiExposure: num(t['ai_exposure']),
        exposureSource: (t['exposure_source'] as string) ?? null,
        exposureMethod: (t['exposure_method'] as Task['exposureMethod']) ?? 'llm_estimated',
        exposureConfidence: num(t['exposure_confidence'], 0.5),
      }));
    },

    async getAllDemand(): Promise<SkillDemand[]> {
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('skill_demand')
        .select('skill_id, count_30d, count_prev_30d');
      if (error) throw new Error(`skill_demand: ${error.message}`);
      return (data as Row[]).map((r) => ({
        skillId: r['skill_id'] as string,
        count30d: num(r['count_30d']),
        countPrev30d: num(r['count_prev_30d']),
      }));
    },

    async getDemandForSkills(skillIds: string[]): Promise<SkillDemand[]> {
      if (skillIds.length === 0) return [];
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('skill_demand')
        .select('skill_id, count_30d, count_prev_30d')
        .in('skill_id', skillIds);
      if (error) throw new Error(`skill_demand: ${error.message}`);
      return (data as Row[]).map((r) => ({
        skillId: r['skill_id'] as string,
        count30d: num(r['count_30d']),
        countPrev30d: num(r['count_prev_30d']),
      }));
    },

    async getCoursesForSkills(skillIds: string[], options): Promise<Course[]> {
      const all = await this.listCourses();
      const verifiedOnly = options?.verifiedOnly ?? true;
      const wanted = new Set(skillIds);
      return all.filter(
        (course) =>
          (!verifiedOnly || course.verified) && course.skillIds.some((id) => wanted.has(id)),
      );
    },

    async listCourses(): Promise<Course[]> {
      const supabase = await readClient();
      const { data, error } = await supabase
        .from('courses')
        .select(
          'id, title, provider, url, language, cost_usd, duration_hours, level, skill_ids, verified',
        );
      if (error) throw new Error(`courses: ${error.message}`);
      return (data as Row[]).map((r) => ({
        id: r['id'] as string,
        key: r['id'] as string,
        title: r['title'] as string,
        provider: (r['provider'] as string) ?? null,
        url: (r['url'] as string) ?? null,
        language: (r['language'] as string) ?? 'en',
        costUsd: num(r['cost_usd']),
        durationHours: r['duration_hours'] === null ? null : num(r['duration_hours']),
        level: (r['level'] as string) ?? null,
        skillIds: (r['skill_ids'] as string[]) ?? [],
        verified: Boolean(r['verified']),
        notes: null,
      }));
    },

    async getSampleProfiles(): Promise<SampleProfile[]> {
      return SAMPLES;
    },
  };
}
