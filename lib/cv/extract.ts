import 'server-only';

import { generateJson, LlmError } from '@/lib/ai/llm';
import { embed, cosineSimilarity } from '@/lib/ai/embed';
import type { Skill } from '@/lib/data/types';
import { ExtractedProfileSchema, extractOffline, type ExtractedProfile } from './offline';

/**
 * CV -> structured profile: the LLM path.
 *
 * The deterministic extractor lives in ./offline and the dictionary matcher in
 * lib/skills/dictionary, so both can run outside Next.js (tests, MCP server).
 *
 * Two paths, one output schema:
 *   - LLM path (Groq / Gemini / Anthropic / OpenAI) when a key is configured.
 *   - Deterministic offline path (dictionary + regex) otherwise.
 *
 * The offline path exists so the product and the demo never depend on a live
 * model call. The UI always labels which path produced the result.
 */

export {
  ProficiencySchema,
  ExtractedProfileSchema,
  type ExtractedProfile,
  type Proficiency,
  extractOffline,
} from './offline';
export { findSkillMentions } from '@/lib/skills/dictionary';

export type ExtractionMethod = 'llm' | 'offline';

export interface ExtractionResult {
  profile: ExtractedProfile;
  method: ExtractionMethod;
  provider: string | null;
  model: string | null;
}

const SYSTEM_PROMPT = `You extract a structured skills profile from CV text.

Rules:
1. Only report skills, education, projects and years that are actually present in the text.
2. For every skill, quote a short piece of evidence taken verbatim from the text.
3. Proficiency rubric: 1 = only mentioned or studied in coursework, 2 = used in a project or internship, 3 = used repeatedly or professionally with evidence.
4. Never invent a skill, a number, a date, or an institution.
5. The text has already had personal identifiers removed. Do not guess them back.
6. Return JSON only, matching the schema you were given.`;

function buildPrompt(text: string, locale: string): string {
  return `CV text (identifiers already removed):\n\"\"\"\n${text.slice(0, 12_000)}\n\"\"\"

Return JSON with this exact shape:
{
  \"skills\": [{\"name\": string, \"proficiency\": 1|2|3, \"evidence\": string}],
  \"education\": [{\"degree\": string, \"field\": string, \"level\": string}],
  \"projects\": [{\"title\": string, \"summary\": string, \"skills_used\": [string]}],
  \"experience_years\": number,
  \"language\": \"bn\" | \"en\" | \"mixed\"
}

Skill names must be short and in English (e.g. \"Python\", \"SQL\", \"financial reporting\"), even when the CV is in Bangla.
The user interface language is: ${locale}.`;
}

// ------------------------------------------------------------------- combined

export interface ExtractOptions {
  locale: string;
  skills: Skill[];
  forceOffline?: boolean;
}

/**
 * Extracts a profile. Falls back to the deterministic extractor on any LLM
 * failure, and reports which path was used.
 */
export async function extractProfile(
  scrubbedText: string,
  options: ExtractOptions,
): Promise<ExtractionResult> {
  if (!options.forceOffline) {
    try {
      const result = await generateJson({
        system: SYSTEM_PROMPT,
        prompt: buildPrompt(scrubbedText, options.locale),
        schema: ExtractedProfileSchema,
      });
      return {
        profile: result.data,
        method: 'llm',
        provider: result.provider,
        model: result.model,
      };
    } catch (error) {
      if (!(error instanceof LlmError)) {
        console.warn('[extract] unexpected LLM error, using offline extractor:', error);
      }
    }
  }

  return {
    profile: extractOffline(scrubbedText, options.skills),
    method: 'offline',
    provider: null,
    model: null,
  };
}

/** Semantic similarity between two short strings, used by the role recommender. */
export async function similarity(a: string, b: string): Promise<number> {
  const result = await embed([a, b]);
  const first = result.vectors[0];
  const second = result.vectors[1];
  if (!first || !second) return 0;
  return cosineSimilarity(first, second);
}
