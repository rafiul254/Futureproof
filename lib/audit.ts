import 'server-only';

import { createHash } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { isSupabaseConfigured } from '@/lib/env';

/**
 * Audit log for every LLM call.
 *
 * Stores: purpose, provider, model, token counts, a hash of the prompt.
 * NEVER stores raw CV text, names, emails or any other identifier.
 */

// Next to the app when writable, otherwise the OS temp dir (read-only hosts such as Vercel).
import { dataDir } from '@/lib/analysis/store';
const AUDIT_DIR = dataDir();
const AUDIT_FILE = path.join(AUDIT_DIR, 'llm_audit_log.jsonl');

export interface AuditEntry {
  userId: string | null;
  purpose: string;
  model: string;
  promptHash: string | null;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: string;
}

export function hashPrompt(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 32);
}

export async function logLlmCall(entry: {
  userId?: string | null;
  purpose: string;
  model: string;
  prompt?: string | null;
  tokensIn?: number | null;
  tokensOut?: number | null;
}): Promise<void> {
  const record: AuditEntry = {
    userId: entry.userId ?? null,
    purpose: entry.purpose,
    model: entry.model,
    promptHash: entry.prompt ? hashPrompt(entry.prompt) : null,
    tokensIn: entry.tokensIn ?? null,
    tokensOut: entry.tokensOut ?? null,
    createdAt: new Date().toISOString(),
  };

  // Fire and forget: auditing must never break a request.
  void (async () => {
    try {
      if (isSupabaseConfigured()) {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const supabase = createAdminClient();
        await supabase.from('llm_audit_log').insert({
          user_id: record.userId,
          purpose: record.purpose,
          model: record.model,
          prompt_hash: record.promptHash,
          tokens_in: record.tokensIn,
          tokens_out: record.tokensOut,
        });
        return;
      }
      await mkdir(AUDIT_DIR, { recursive: true });
      await appendFile(AUDIT_FILE, `${JSON.stringify(record)}\n`, 'utf8');
    } catch (error) {
      console.warn('[audit] failed to write audit entry:', error);
    }
  })();
}
