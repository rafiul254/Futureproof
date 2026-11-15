/**
 * Server-side environment access.
 *
 * Rules from the build prompt:
 *  - No secrets ever reach the client. Only `NEXT_PUBLIC_*` values are safe there.
 *  - Features degrade gracefully when a key is missing, so the app always runs
 *    (and demo mode always works) instead of crashing at import time.
 *  - Providers are swappable: Groq, Gemini, Anthropic and OpenAI are all supported.
 */
import { z } from 'zod';

/**
 * A blank line in .env.local (KEY=) arrives as an empty string. Treat it as "not set",
 * otherwise a template copied from .env.example with unused keys left blank would fail
 * validation as a whole and silently switch every provider off.
 */
const blankToUndefined = (value: unknown): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

const serverEnvSchema = z.preprocess(
  (raw) =>
    raw && typeof raw === 'object'
      ? Object.fromEntries(
          Object.entries(raw).map(([key, value]) => [key, blankToUndefined(value)]),
        )
      : raw,
  z.object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

    // --- LLM providers (pick one; auto-detected from whichever key is present) ---
    LLM_PROVIDER: z.enum(['auto', 'groq', 'gemini', 'anthropic', 'openai']).default('auto'),

    GROQ_API_KEY: z.string().min(1).optional(),
    GROQ_MODEL: z.string().min(1).default('llama-3.3-70b-versatile'),

    GOOGLE_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL: z.string().min(1).default('gemini-2.0-flash'),
    GEMINI_EMBEDDING_MODEL: z.string().min(1).default('text-embedding-004'),

    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    LLM_MODEL: z.string().min(1).default('claude-sonnet-4-5-20250929'),

    OPENAI_API_KEY: z.string().min(1).optional(),
    OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),

    // --- Embeddings ---
    EMBEDDING_PROVIDER: z.enum(['auto', 'gemini', 'openai', 'local']).default('auto'),
    EMBEDDING_MODEL: z.string().min(1).default('text-embedding-3-small'),
    EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1536),

    /** Set to 'true' to force the deterministic offline path: no external AI calls. */
    FUTUREPROOF_OFFLINE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),

    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  }),
);

const parsed = serverEnvSchema.safeParse(process.env);

if (!parsed.success && process.env.NODE_ENV !== 'production') {
  console.warn(
    '[env] Some environment variables failed validation:\n' +
      parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n'),
  );
}

export type ServerEnv = z.output<typeof serverEnvSchema>;

const FALLBACK: ServerEnv = {
  LLM_PROVIDER: 'auto',
  GROQ_MODEL: 'llama-3.3-70b-versatile',
  GEMINI_MODEL: 'gemini-2.0-flash',
  GEMINI_EMBEDDING_MODEL: 'text-embedding-004',
  LLM_MODEL: 'claude-sonnet-4-5-20250929',
  OPENAI_MODEL: 'gpt-4o-mini',
  EMBEDDING_PROVIDER: 'auto',
  EMBEDDING_MODEL: 'text-embedding-3-small',
  EMBEDDING_DIMENSIONS: 1536,
  FUTUREPROOF_OFFLINE: true,
  NODE_ENV: (process.env['NODE_ENV'] ?? 'development') as ServerEnv['NODE_ENV'],
};

export const env: ServerEnv = parsed.success ? parsed.data : FALLBACK;

export type LlmProvider = 'groq' | 'gemini' | 'anthropic' | 'openai';

/** Which LLM provider will be used, or null when none is configured. */
export function activeLlmProvider(): LlmProvider | null {
  if (env.FUTUREPROOF_OFFLINE) return null;
  if (env.LLM_PROVIDER !== 'auto') {
    const chosen = env.LLM_PROVIDER as LlmProvider;
    return apiKeyFor(chosen) ? chosen : null;
  }
  const order: LlmProvider[] = ['groq', 'gemini', 'anthropic', 'openai'];
  return order.find((provider) => Boolean(apiKeyFor(provider))) ?? null;
}

export function apiKeyFor(provider: LlmProvider): string | undefined {
  switch (provider) {
    case 'groq':
      return env.GROQ_API_KEY;
    case 'gemini':
      return env.GOOGLE_API_KEY;
    case 'anthropic':
      return env.ANTHROPIC_API_KEY;
    case 'openai':
      return env.OPENAI_API_KEY;
  }
}

export function modelFor(provider: LlmProvider): string {
  switch (provider) {
    case 'groq':
      return env.GROQ_MODEL;
    case 'gemini':
      return env.GEMINI_MODEL;
    case 'anthropic':
      return env.LLM_MODEL;
    case 'openai':
      return env.OPENAI_MODEL;
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isLlmConfigured(): boolean {
  return activeLlmProvider() !== null;
}

/** 'gemini' | 'openai' | 'local' — the local embedder always works offline. */
export function activeEmbeddingProvider(): 'gemini' | 'openai' | 'local' {
  if (env.FUTUREPROOF_OFFLINE) return 'local';
  if (env.EMBEDDING_PROVIDER !== 'auto') return env.EMBEDDING_PROVIDER;
  if (env.GOOGLE_API_KEY) return 'gemini';
  if (env.OPENAI_API_KEY) return 'openai';
  return 'local';
}
