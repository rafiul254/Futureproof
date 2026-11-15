/**
 * Smoke test for the MCP tools without a real MCP client.
 *
 * Runs each tool's underlying function the way the server would and prints the
 * output, so `npm run smoke` is enough to prove the server is wired correctly.
 */

import { createLocalProvider } from '@/lib/data/local';

import { lookupSkillDemand } from '../src/tools/demand.js';
import { explainScore } from '../src/tools/explain.js';
import { scoreProfile } from '../src/tools/score.js';

const provider = createLocalProvider();

function heading(text: string): void {
  console.log(`\n${'='.repeat(72)}\n${text}\n${'='.repeat(72)}`);
}

async function main(): Promise<void> {
  console.log(
    `[smoke] dataset: ${provider.meta.source} — ${provider.meta.skills} skills, ` +
      `${provider.meta.occupations} occupations, ${provider.meta.tasks} tasks, ` +
      `synthetic=${provider.meta.isSynthetic}`,
  );

  heading('1. score_profile');
  const scored = await scoreProfile(provider, {
    skills: [
      { name: 'Python', proficiency: 3 },
      { name: 'SQL', proficiency: 2 },
      { name: 'financial reporting', proficiency: 3 },
      { name: 'data entry', proficiency: 2 },
      { name: 'underwater basket weaving', proficiency: 1 },
    ],
    include_adjacent_roles: true,
  });
  const { raw, ...serialisable } = scored;
  console.log(JSON.stringify(serialisable, null, 2));

  heading('2. lookup_skill_demand (single skill)');
  console.log(
    JSON.stringify(await lookupSkillDemand(provider, { query: 'Python', limit: 3 }), null, 2),
  );

  heading('3. lookup_skill_demand (top list)');
  console.log(JSON.stringify(await lookupSkillDemand(provider, { limit: 3 }), null, 2));

  // Mirror what the server does: pass an id -> name map so the explanation is readable.
  const skillNames = Object.fromEntries(
    (await provider.listSkills()).map((s) => [s.id, s.name]),
  ) as Record<string, string>;

  heading('4. explain_score (en)');
  console.log(
    explainScore(raw.score, {
      skills: [{ name: 'Python', proficiency: 3 }, { name: 'data entry', proficiency: 2 }],
      skill_names: skillNames,
    }).explanation,
  );

  heading('5. explain_score (bn)');
  console.log(
    explainScore(raw.score, {
      skills: [{ name: 'Python', proficiency: 3 }],
      locale: 'bn',
      skill_names: skillNames,
    }).explanation,
  );

  heading('6. determinism check');
  const again = await scoreProfile(provider, {
    skills: [{ name: 'Python', proficiency: 3 }, { name: 'SQL', proficiency: 2 }],
  });
  const first = await scoreProfile(provider, {
    skills: [{ name: 'Python', proficiency: 3 }, { name: 'SQL', proficiency: 2 }],
  });
  console.log(
    again.score === first.score
      ? `PASS — both runs returned ${first.score}`
      : `FAIL — ${first.score} vs ${again.score}`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
