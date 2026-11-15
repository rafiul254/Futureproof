/**
 * Domain types shared by the local (JSON) provider and the Supabase provider.
 * Both providers implement `DataProvider`, so switching is only an env change.
 */

export type ExposureMethod = 'published_dataset' | 'llm_estimated';

export interface Skill {
  id: string;
  key: string;
  name: string;
  nameBn: string | null;
  category: string | null;
  aliases: string[];
  sourceId: string | null;
}

export interface Occupation {
  id: string;
  key: string;
  title: string;
  titleBn: string | null;
  onetCode: string | null;
  description: string | null;
}

export interface Task {
  id: string;
  occupationId: string;
  description: string;
  importance: number;
  aiExposure: number;
  exposureSource: string | null;
  exposureMethod: ExposureMethod;
  exposureConfidence: number;
}

export interface OccupationSkill {
  occupationId: string;
  skillId: string;
  importance: number;
}

export interface TaskSkill {
  taskId: string;
  skillId: string;
}

export interface SkillDemand {
  skillId: string;
  count30d: number;
  countPrev30d: number;
}

export interface Course {
  id: string;
  key: string;
  title: string;
  provider: string | null;
  url: string | null;
  language: string | null;
  costUsd: number;
  durationHours: number | null;
  level: string | null;
  skillIds: string[];
  verified: boolean;
  notes: string | null;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string | null;
  source: string;
  sourceUrl: string | null;
  postedAt: string | null;
  location: string | null;
  occupationId: string | null;
  isSynthetic: boolean;
}

export interface SampleProfile {
  key: string;
  title: string;
  titleBn: string | null;
  summary: string;
  summaryBn: string | null;
  isSynthetic: boolean;
  suggestedTargetOccupation: string;
  text: string;
}

/** A task with the skill it was linked through, used to explain a skill score. */
export interface TaskEvidence {
  task: Task;
  skillId: string;
}

export interface DatasetMeta {
  skills: number;
  occupations: number;
  tasks: number;
  courses: number;
  verifiedCourses: number;
  postings: number;
  syntheticPostings: number;
  source: 'curated-local' | 'supabase';
  isSynthetic: boolean;
  generatedAt: string | null;
}

export interface DataProvider {
  readonly meta: DatasetMeta;
  listSkills(): Promise<Skill[]>;
  listOccupations(): Promise<Occupation[]>;
  getOccupation(id: string): Promise<Occupation | null>;
  getOccupationSkills(occupationId: string): Promise<OccupationSkill[]>;
  getAllOccupationSkills(): Promise<OccupationSkill[]>;
  getTasksForSkills(skillIds: string[]): Promise<TaskEvidence[]>;
  getTasksForOccupations(occupationIds: string[]): Promise<Task[]>;
  getAllDemand(): Promise<SkillDemand[]>;
  getDemandForSkills(skillIds: string[]): Promise<SkillDemand[]>;
  getCoursesForSkills(skillIds: string[], options?: { verifiedOnly?: boolean }): Promise<Course[]>;
  listCourses(): Promise<Course[]>;
  getSampleProfiles(): Promise<SampleProfile[]>;
}
