import 'server-only';

import { randomUUID } from 'node:crypto';
import { accessSync, constants, mkdirSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { isSupabaseConfigured } from '@/lib/env';

import type { AnalysisResult } from './analyze';

/**
 * Where analyses live.
 *
 * - Supabase configured: `analyses` / `cv_uploads` tables (RLS: own rows only).
 * - Not configured: JSON files under `.data/`, so export/delete still work
 *   end to end and can be demonstrated before the database exists.
 *
 * Both paths expose the same functions, so nothing above this file changes.
 */

/**
 * Local data directory. `.data/` next to the app when that is writable (local dev, a VPS);
 * otherwise the OS temp dir. On serverless hosts such as Vercel the project folder is
 * read-only, so writing there would throw. The temp dir only lives as long as one warm
 * instance, so the browser keeps its own copy of every result and restores it on demand
 * (see /api/analysis/restore). Nothing here is a durable store.
 */
let resolvedDataDir: string | null = null;
export function dataDir(): string {
  if (resolvedDataDir) return resolvedDataDir;
  const preferred = path.join(process.cwd(), '.data');
  try {
    mkdirSync(preferred, { recursive: true });
    accessSync(preferred, constants.W_OK);
    resolvedDataDir = preferred;
  } catch {
    resolvedDataDir = path.join(os.tmpdir(), 'futureproof-data');
  }
  return resolvedDataDir;
}
const analysisDir = () => path.join(dataDir(), 'analyses');
const cvDir = () => path.join(dataDir(), 'cv_uploads');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Supabase rows belong to real auth users only; anonymous ids are not uuids. */
const isRealUserId = (id: string | null): id is string => id !== null && UUID.test(id);

export interface StoredAnalysis {
  id: string;
  userId: string | null;
  cvId: string | null;
  targetOccupationId: string | null;
  score: number | null;
  result: AnalysisResult;
  createdAt: string;
  isSample: boolean;
}

export interface StoredCv {
  id: string;
  userId: string | null;
  filename: string | null;
  scrubbedText: string;
  createdAt: string;
  /** When the user ticked the consent box. Null if they never did. */
  consentAt: string | null;
  redactions: Array<{ type: string; count: number }>;
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/** Never let an id become a path: only uuids are valid file names. */
function safeId(id: string): string {
  if (!UUID.test(id)) throw new Error('Invalid id');
  return id.toLowerCase();
}

/** Best effort: a failed local write must not fail the request (the browser keeps a copy). */
async function writeJson(dir: string, id: string, payload: unknown): Promise<void> {
  try {
    await ensureDir(dir);
    await writeFile(path.join(dir, `${safeId(id)}.json`), JSON.stringify(payload, null, 1), 'utf8');
  } catch (error) {
    console.warn('[store] local write failed (continuing):', (error as Error).message);
  }
}

async function readJson<T>(dir: string, id: string): Promise<T | null> {
  try {
    if (!UUID.test(id)) return null;
    return JSON.parse(await readFile(path.join(dir, `${id}.json`), 'utf8')) as T;
  } catch {
    return null;
  }
}

async function listJson<T>(dir: string): Promise<T[]> {
  try {
    const files = await readdir(dir);
    const rows = await Promise.all(
      files
        .filter((f) => f.endsWith('.json'))
        .map((f) => readJson<unknown>(dir, f.replace('.json', ''))),
    );
    return rows.filter((row): row is T => row !== null) as T[];
  } catch {
    return [];
  }
}

export async function saveCv(input: {
  userId: string | null;
  filename: string | null;
  scrubbedText: string;
  redactions: Array<{ type: string; count: number }>;
  consentAt: string | null;
}): Promise<StoredCv> {
  const id = randomUUID();
  const record: StoredCv = {
    id,
    userId: input.userId,
    filename: input.filename,
    scrubbedText: input.scrubbedText,
    createdAt: new Date().toISOString(),
    consentAt: input.consentAt,
    redactions: input.redactions,
  };

  if (isSupabaseConfigured() && isRealUserId(input.userId)) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      await supabase.from('cv_uploads').insert({
        id,
        user_id: input.userId,
        storage_path: input.filename,
        scrubbed_text: input.scrubbedText,
        consent_at: input.consentAt,
        parsed_json: { redactions: input.redactions } as unknown as never,
      });
    } catch (error) {
      console.warn('[store] cv_uploads insert failed, keeping local copy:', error);
    }
  }

  await writeJson(cvDir(), id, record);
  return record;
}

export async function getCv(id: string): Promise<StoredCv | null> {
  return readJson<StoredCv>(cvDir(), id);
}

export async function saveAnalysis(input: {
  userId: string | null;
  cvId: string | null;
  result: AnalysisResult;
  isSample: boolean;
  /** Only used when the browser restores a result it already holds (see /api/analysis/restore). */
  id?: string;
}): Promise<StoredAnalysis> {
  const id = input.id ?? randomUUID();
  const record: StoredAnalysis = {
    id,
    userId: input.userId,
    cvId: input.cvId,
    targetOccupationId: input.result.target?.occupationId ?? null,
    score: input.result.score.overall,
    result: input.result,
    createdAt: new Date().toISOString(),
    isSample: input.isSample,
  };

  if (isSupabaseConfigured() && isRealUserId(input.userId)) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      await supabase.from('analyses').insert({
        id,
        user_id: input.userId,
        cv_id: input.cvId,
        target_occupation_id: record.targetOccupationId,
        score: record.score,
        result_json: input.result as unknown as never,
      });
    } catch (error) {
      console.warn('[store] analyses insert failed, keeping local copy:', error);
    }
  }

  await writeJson(analysisDir(), id, record);
  return record;
}

export async function getAnalysis(id: string): Promise<StoredAnalysis | null> {
  if (isSupabaseConfigured()) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      const { data } = await supabase
        .from('analyses')
        .select('id, user_id, cv_id, target_occupation_id, score, result_json, created_at')
        .eq('id', id)
        .maybeSingle();
      if (data) {
        const row = data as Record<string, unknown>;
        return {
          id: row['id'] as string,
          userId: (row['user_id'] as string) ?? null,
          cvId: (row['cv_id'] as string) ?? null,
          targetOccupationId: (row['target_occupation_id'] as string) ?? null,
          score: (row['score'] as number) ?? null,
          result: row['result_json'] as unknown as AnalysisResult,
          createdAt: (row['created_at'] as string) ?? new Date().toISOString(),
          isSample: false,
        };
      }
    } catch (error) {
      console.warn('[store] analyses read failed:', error);
    }
  }

  return readJson<StoredAnalysis>(analysisDir(), id);
}

export async function listAnalyses(userId: string | null): Promise<StoredAnalysis[]> {
  const local = await listJson<StoredAnalysis>(analysisDir());
  return local
    .filter((row) => (userId ? row.userId === userId : row.userId === null))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Everything a user has ever given us, in one portable object. */
export async function exportUserData(userId: string | null): Promise<{
  exportedAt: string;
  analyses: StoredAnalysis[];
  cvUploads: Array<Omit<StoredCv, 'scrubbedText'> & { scrubbedTextLength: number }>;
}> {
  const analyses = await listAnalyses(userId);
  const uploads = (await listJson<StoredCv>(cvDir())).filter((row) =>
    userId ? row.userId === userId : row.userId === null,
  );

  return {
    exportedAt: new Date().toISOString(),
    analyses,
    cvUploads: uploads.map(({ scrubbedText, ...rest }) => ({
      ...rest,
      scrubbedTextLength: scrubbedText.length,
    })),
  };
}

/** Hard delete: every analysis and CV record for this user. */
export async function deleteUserData(userId: string | null): Promise<{
  analyses: number;
  cvUploads: number;
}> {
  let removedAnalyses = 0;
  let removedCvs = 0;

  const analyses = await listJson<StoredAnalysis>(analysisDir());
  for (const row of analyses) {
    if (userId ? row.userId === userId : row.userId === null) {
      await rm(path.join(analysisDir(), `${safeId(row.id)}.json`), { force: true });
      removedAnalyses += 1;
    }
  }

  const uploads = await listJson<StoredCv>(cvDir());
  for (const row of uploads) {
    if (userId ? row.userId === userId : row.userId === null) {
      await rm(path.join(cvDir(), `${safeId(row.id)}.json`), { force: true });
      removedCvs += 1;
    }
  }

  if (isSupabaseConfigured() && isRealUserId(userId)) {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = await createClient();
      await supabase
        .from('analyses')
        .delete()
        .eq('user_id', userId as never);
      await supabase
        .from('cv_uploads')
        .delete()
        .eq('user_id', userId as never);
    } catch (error) {
      console.warn('[store] remote delete failed (local rows removed):', error);
    }
  }

  return { analyses: removedAnalyses, cvUploads: removedCvs };
}
