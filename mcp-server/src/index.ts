#!/usr/bin/env node
/**
 * FutureProof MCP server.
 *
 * Exposes the same deterministic scoring core the web app uses, over the Model
 * Context Protocol, so an assistant can answer "which of my skills are at risk?"
 * with numbers that come from the dataset rather than from its own guess.
 *
 * Design rules, carried over from the main app:
 *   - No fabricated numbers. Every value returned is read from the dataset or
 *     computed by lib/scoring/score.ts.
 *   - No model calls. This server never calls an LLM, so it works offline and
 *     costs nothing to run.
 *   - Synthetic data is labelled synthetic in every response.
 *   - Tools are read-only. Nothing here writes to the database.
 *
 * Transport: stdio (the default for local MCP servers).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { createLocalProvider } from '@/lib/data/local';
import { explainScore } from './tools/explain.js';
import { lookupSkillDemand } from './tools/demand.js';
import { scoreProfile } from './tools/score.js';

const DATA_DIR = process.env.FUTUREPROOF_DATA_DIR ?? undefined;
const provider = createLocalProvider(DATA_DIR);

const METHODOLOGY = `FutureProof — how the score is computed

Everything below is deterministic TypeScript in lib/scoring/score.ts. No model
produces or alters any number.

Per skill:
  trend        = clamp((count30d - countPrev30d) / max(countPrev30d, 1), -1, 1)
  trend01      = (trend + 1) / 2
  demand       = 0.7 * percentile_rank(count30d) + 0.3 * trend01
  exposure     = sum(importance * ai_exposure) / sum(importance)   over linked tasks
  resilience   = 1 - exposure
  skill_score  = 100 * (0.5 * demand + 0.5 * resilience)

Overall:
  overall      = sum(proficiency * skill_score) / sum(proficiency)
  proficiency is 1 (studied), 2 (project/internship) or 3 (professional use)

Bands: >= 70 invest, >= 50 adapt, otherwise transition.

Quadrants (threshold 0.5 on both axes):
  invest      high demand, low exposure
  adapt       high demand, high exposure
  niche       low demand, low exposure
  transition  low demand, high exposure

Confidence depends on how many tasks are linked to a skill and how much of the
exposure evidence comes from a published dataset rather than an estimate.

Data: ${provider.meta.source}, ${provider.meta.skills} skills, ${provider.meta.occupations} occupations, ${provider.meta.tasks} tasks.
Demand counts are ${provider.meta.isSynthetic ? 'SYNTHETIC — do not quote them as real market data' : 'from real collected postings'}.
`;

const server = new McpServer({
  name: 'futureproof',
  version: '0.1.0',
});

const SkillInput = z.object({
  name: z.string().min(1).max(120).describe('Skill name in English, e.g. "Python" or "financial reporting".'),
  proficiency: z
    .union([z.literal(1), z.literal(2), z.literal(3)])
    .optional()
    .describe('1 = studied only, 2 = used in a project or internship, 3 = used professionally. Defaults to 2.'),
});

// ---------------------------------------------------------------- resources

server.registerResource(
  'methodology',
  'futureproof://methodology',
  {
    title: 'FutureProof scoring methodology',
    description:
      'The exact formulas, weights and data sources behind the Future-Proof Score. Read this before explaining a score.',
    mimeType: 'text/plain',
  },
  async () => ({
    contents: [
      {
        uri: 'futureproof://methodology',
        mimeType: 'text/plain',
        text: METHODOLOGY,
      },
    ],
  }),
);

server.registerResource(
  'dataset',
  'futureproof://dataset',
  {
    title: 'Dataset provenance',
    description: 'Where the underlying data comes from, and what is synthetic.',
    mimeType: 'application/json',
  },
  async () => {
    const [skills, occupations] = await Promise.all([
      provider.listSkills(),
      provider.listOccupations(),
    ]);
    return {
      contents: [
        {
          uri: 'futureproof://dataset',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              meta: provider.meta,
              sample_occupations: occupations.slice(0, 10).map((o) => ({
                id: o.id,
                key: o.key,
                title: o.title,
                title_bn: o.titleBn,
              })),
              sample_skills: skills.slice(0, 10).map((s) => ({
                key: s.key,
                name: s.name,
                category: s.category,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  },
);

// -------------------------------------------------------------------- tools

server.registerTool(
  'score_profile',
  {
    title: 'Score a skills profile',
    description:
      'Score a list of skills against AI-exposure and job-demand data and return the Future-Proof Score (0-100, higher is safer), a per-skill breakdown, the top skill gaps for a target role, and safer adjacent roles. Deterministic: the same input always returns the same score. No model is called.',
    inputSchema: {
      skills: z
        .array(SkillInput)
        .min(1)
        .max(60)
        .describe('The skills to score.'),
      target_occupation: z
        .string()
        .optional()
        .describe('Occupation key, id or title to measure gaps against. Omit to auto-select the best-overlap role.'),
      include_adjacent_roles: z
        .boolean()
        .optional()
        .describe('Also return up to three safer adjacent roles. Defaults to true.'),
    },
  },
  async ({ skills, target_occupation, include_adjacent_roles }) => {
    const { raw: _raw, ...result } = await scoreProfile(provider, {
      skills,
      target_occupation: target_occupation ?? null,
      include_adjacent_roles: include_adjacent_roles ?? true,
    });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'lookup_skill_demand',
  {
    title: 'Look up skill demand',
    description:
      'Look up job-demand and AI-exposure figures for one skill, or list the top skills by demand. Returns posting counts, 30-day trend, demand percentile, mean AI exposure across linked tasks, and any verified free courses. Values come straight from the dataset; missing values are null, never estimated.',
    inputSchema: {
      query: z
        .string()
        .optional()
        .describe('A skill name, e.g. "Python". Omit to list the highest-demand skills.'),
      limit: z.number().int().min(1).max(50).optional().describe('Maximum rows to return. Defaults to 10.'),
    },
  },
  async ({ query, limit }) => {
    const result = await lookupSkillDemand(provider, { query: query ?? null, limit });
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
    };
  },
);

server.registerTool(
  'explain_score',
  {
    title: 'Explain a score',
    description:
      'Produce a plain-language, fully checkable explanation of a score: how each skill contributed, which skills carry the most risk, what was excluded for lack of data, and the formula used. Every number is taken from the score being explained — nothing is estimated and no model is called.',
    inputSchema: {
      skills: z.array(SkillInput).min(1).max(60),
      target_occupation: z.string().optional(),
      locale: z.enum(['en', 'bn']).optional().describe('Language of the explanation. Defaults to en.'),
    },
  },
  async ({ skills, target_occupation, locale }) => {
    const { raw } = await scoreProfile(provider, {
      skills,
      target_occupation: target_occupation ?? null,
      include_adjacent_roles: false,
    });

    const skillNames = Object.fromEntries(
      (await provider.listSkills()).map((s) => [s.id, s.name]),
    ) as Record<string, string>;

    const result = explainScore(raw.score, {
      skills,
      target_occupation,
      locale: locale ?? 'en',
      skill_names: skillNames,
    });
    return {
      content: [
        {
          type: 'text' as const,
          text: [
            result.explanation,
            '',
            '--- machine-readable ---',
            JSON.stringify(result.numbers_used, null, 2),
          ].join('\n'),
        },
      ],
    };
  },
);

// ---------------------------------------------------------------- main


async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[futureproof-mcp] ready — ${provider.meta.source} dataset, ${provider.meta.skills} skills, ${provider.meta.occupations} occupations`,
  );
}

main().catch((error: unknown) => {
  console.error('[futureproof-mcp] failed to start:', error);
  process.exit(1);
});
