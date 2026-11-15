import 'server-only';

import { activeLlmProvider, apiKeyFor, env, modelFor, type LlmProvider } from '@/lib/env';

/**
 * One small JSON-generation client for every supported provider.
 *
 * Why not a single vendor SDK: the app must run with Groq OR Gemini OR Anthropic
 * OR OpenAI, chosen purely by which key is present. A thin fetch layer keeps the
 * dependency footprint small and the provider swappable.
 *
 * Guarantees:
 *  - Always asks the provider for JSON.
 *  - Parses and validates with the caller's zod schema.
 *  - Retries once on invalid JSON, then throws (callers fall back to deterministic logic).
 */

export interface LlmUsage {
  tokensIn: number | null;
  tokensOut: number | null;
}

export interface LlmResult<T> {
  data: T;
  provider: LlmProvider;
  model: string;
  usage: LlmUsage;
}

export class LlmError extends Error {
  constructor(
    message: string,
    readonly provider: LlmProvider | null,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

interface ChatResponse {
  provider: LlmProvider;
  model: string;
  text: string;
  usage: LlmUsage;
}

async function callGroq(system: string, prompt: string): Promise<ChatResponse> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKeyFor('groq')}`,
    },
    body: JSON.stringify({
      model: modelFor('groq'),
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new LlmError(`Groq ${response.status}: ${(await response.text()).slice(0, 300)}`, 'groq');
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content ?? '';
  return {
    provider: 'groq',
    model: modelFor('groq'),
    text,
    usage: {
      tokensIn: json.usage?.prompt_tokens ?? null,
      tokensOut: json.usage?.completion_tokens ?? null,
    },
  };
}

async function callGemini(system: string, prompt: string): Promise<ChatResponse> {
  const model = modelFor('gemini');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeyFor('gemini')}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0,
        // Forces valid JSON output from Gemini.
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    throw new LlmError(
      `Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`,
      'gemini',
    );
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return {
    provider: 'gemini',
    model,
    text,
    usage: {
      tokensIn: json.usageMetadata?.promptTokenCount ?? null,
      tokensOut: json.usageMetadata?.candidatesTokenCount ?? null,
    },
  };
}

async function callAnthropic(system: string, prompt: string): Promise<ChatResponse> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKeyFor('anthropic') ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelFor('anthropic'),
      max_tokens: 4096,
      temperature: 0,
      system,
      messages: [{ role: 'user', content: `${prompt}\n\nRespond with JSON only.` }],
    }),
  });

  if (!response.ok) {
    throw new LlmError(
      `Anthropic ${response.status}: ${(await response.text()).slice(0, 300)}`,
      'anthropic',
    );
  }

  const json = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = json.content
    ?.filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');
  return {
    provider: 'anthropic',
    model: modelFor('anthropic'),
    text: text ?? '',
    usage: {
      tokensIn: json.usage?.input_tokens ?? null,
      tokensOut: json.usage?.output_tokens ?? null,
    },
  };
}

async function callOpenAi(system: string, prompt: string): Promise<ChatResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKeyFor('openai')}`,
    },
    body: JSON.stringify({
      model: modelFor('openai'),
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    throw new LlmError(
      `OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`,
      'openai',
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  return {
    provider: 'openai',
    model: modelFor('openai'),
    text: json.choices?.[0]?.message?.content ?? '',
    usage: {
      tokensIn: json.usage?.prompt_tokens ?? null,
      tokensOut: json.usage?.completion_tokens ?? null,
    },
  };
}

function dispatch(provider: LlmProvider, system: string, prompt: string): Promise<ChatResponse> {
  switch (provider) {
    case 'groq':
      return callGroq(system, prompt);
    case 'gemini':
      return callGemini(system, prompt);
    case 'anthropic':
      return callAnthropic(system, prompt);
    case 'openai':
      return callOpenAi(system, prompt);
  }
}

/** Pulls the first JSON object out of a model reply that may include prose. */
export function extractJsonObject(text: string): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) throw new LlmError('No JSON object in response', null);
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

/**
 * Generates JSON that must satisfy `schema`.
 * Throws `LlmError` when no provider is configured or the output stays invalid.
 */
export async function generateJson<T>(params: {
  system: string;
  prompt: string;
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T; error?: unknown } };
  timeoutMs?: number;
}): Promise<LlmResult<T>> {
  const provider = activeLlmProvider();
  if (!provider) {
    throw new LlmError('No LLM provider configured (set GROQ_API_KEY or GOOGLE_API_KEY)', null);
  }

  const timeout = params.timeoutMs ?? 45_000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    let lastError: unknown;
    // One retry: models occasionally return prose or a truncated object.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const raw = await dispatch(provider, params.system, params.prompt);
      try {
        const parsed = params.schema.safeParse(extractJsonObject(raw.text));
        if (parsed.success && parsed.data !== undefined) {
          return { data: parsed.data, provider: raw.provider, model: raw.model, usage: raw.usage };
        }
        lastError = parsed.error;
      } catch (error) {
        lastError = error;
      }
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }
    throw new LlmError(
      `Invalid structured output after 2 attempts: ${String(lastError).slice(0, 400)}`,
      provider,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Human-readable description of the current LLM setup, for the UI and logs. */
export function describeLlm(): { provider: LlmProvider | null; model: string | null } {
  const provider = activeLlmProvider();
  return { provider, model: provider ? modelFor(provider) : null };
}

export function isOffline(): boolean {
  return env.FUTUREPROOF_OFFLINE;
}
