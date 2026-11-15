import 'server-only';

import { activeEmbeddingProvider, env } from '@/lib/env';

/**
 * Embeddings behind one small wrapper, so the provider stays swappable.
 *
 * - gemini: text-embedding-004 (768 dims)
 * - openai: text-embedding-3-small (1536 dims)
 * - local:  deterministic hashed bag-of-features (256 dims), no network needed
 *
 * The local embedder is not a semantic model. It is a stable lexical vector:
 * good enough for skill-name matching (and it handles Bangla, which a
 * Latin-only tokenizer would miss) and it keeps the whole product usable offline.
 */

export type EmbeddingProvider = 'gemini' | 'openai' | 'local';

export const LOCAL_DIMENSIONS = 256;

export interface EmbeddingResult {
  vectors: number[][];
  provider: EmbeddingProvider;
  dimensions: number;
}

/** FNV-1a 32-bit, used by the local embedder. */
function fnv1a(text: string, seed = 0x811c9dc5): number {
  let hash = seed;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Features: lowercase word tokens, plus character 3-grams for non-Latin scripts
 * (Bangla) so that "পাইথন" and "Python" still share signal through context.
 */
export function features(text: string): string[] {
  const normalised = text.toLowerCase().replace(/[\s_/\\.,()[\]{}'"`|;:!?+-]+/g, ' ');
  const words = normalised.split(' ').filter((w) => w.length > 1);

  const out: string[] = [];
  for (const word of words) {
    out.push(`w:${word}`);
    // Prefixes catch morphological variants: "programming" ~ "program".
    if (word.length > 5) out.push(`p:${word.slice(0, 5)}`);
  }

  const compact = normalised.replace(/ /g, '');
  for (let i = 0; i + 3 <= compact.length; i += 1) {
    out.push(`c:${compact.slice(i, i + 3)}`);
  }
  return out;
}

/** Deterministic, dependency-free embedding. Always available. */
export function localEmbed(texts: string[], dimensions = LOCAL_DIMENSIONS): number[][] {
  return texts.map((text) => {
    const vector = new Array<number>(dimensions).fill(0);
    for (const feature of features(text)) {
      const hash = fnv1a(feature);
      const index = hash % dimensions;
      // Signed hashing reduces collision bias.
      vector[index] = (vector[index] ?? 0) + (fnv1a(feature, 0x9e3779b9) % 2 === 0 ? 1 : -1);
    }
    let norm = 0;
    for (const value of vector) norm += value * value;
    norm = Math.sqrt(norm);
    if (norm === 0) return vector;
    return vector.map((value) => value / norm);
  });
}

async function geminiEmbed(texts: string[]): Promise<number[][]> {
  const model = env.GEMINI_EMBEDDING_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${env.GOOGLE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
      })),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Gemini embeddings ${response.status}: ${(await response.text()).slice(0, 200)}`,
    );
  }

  const json = (await response.json()) as {
    embeddings?: Array<{ values?: number[] }>;
  };
  const vectors = json.embeddings?.map((e) => e.values ?? []) ?? [];
  if (vectors.length !== texts.length)
    throw new Error('Gemini returned the wrong number of embeddings');
  return vectors;
}

async function openAiEmbed(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: env.EMBEDDING_MODEL, input: texts }),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI embeddings ${response.status}: ${(await response.text()).slice(0, 200)}`,
    );
  }

  const json = (await response.json()) as {
    data?: Array<{ embedding?: number[]; index?: number }>;
  };
  const sorted = [...(json.data ?? [])].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return sorted.map((d) => d.embedding ?? []);
}

/**
 * Embeds a batch of texts. Falls back to the local embedder on any provider
 * failure so a missing or broken key never breaks an analysis.
 */
export async function embed(texts: string[]): Promise<EmbeddingResult> {
  if (texts.length === 0) {
    return { vectors: [], provider: 'local', dimensions: LOCAL_DIMENSIONS };
  }

  const provider = activeEmbeddingProvider();

  if (provider !== 'local') {
    try {
      const vectors = provider === 'gemini' ? await geminiEmbed(texts) : await openAiEmbed(texts);
      return { vectors, provider, dimensions: vectors[0]?.length ?? 0 };
    } catch (error) {
      console.warn(`[embed] ${provider} failed, using local embedder:`, error);
    }
  }

  const vectors = localEmbed(texts);
  return { vectors, provider: 'local', dimensions: LOCAL_DIMENSIONS };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
