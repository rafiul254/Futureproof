/**
 * End-to-end MCP protocol test.
 *
 * Spawns the server as a child process, connects a real MCP client over stdio,
 * and drives it exactly the way Claude Desktop would: initialize, list tools,
 * list resources, read a resource, call every tool.
 *
 * If this passes, the server is genuinely MCP-compliant — not just a library
 * that happens to compile.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const serverEntry = path.join(here, '..', 'src', 'index.ts');
const tsx = path.join(repoRoot, 'mcp-server', 'node_modules', '.bin', 'tsx');

let failures = 0;

function check(label: string, ok: boolean, detail = ''): void {
  console.log(`${ok ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
}

type ToolPayload = { content: Array<{ type: string; text?: string }> };

function textOf(payload: unknown): string {
  const content = (payload as ToolPayload).content ?? [];
  return content.map((c) => c.text ?? '').join('\n');
}

function jsonOf(payload: unknown): unknown {
  const raw = textOf(payload);
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error(`no JSON in response:\n${raw}`);
  return JSON.parse(raw.slice(start, end + 1));
}

async function main(): Promise<void> {
  console.log('[protocol] spawning server over stdio...\n');

  const transport = new StdioClientTransport({
    command: tsx,
    args: [serverEntry],
    cwd: repoRoot,
    stderr: 'inherit',
  });

  const client = new Client({ name: 'futureproof-protocol-test', version: '0.1.0' });
  await client.connect(transport);

  console.log('1. initialize');
  const info = client.getServerVersion();
  check('server identifies itself', info?.name === 'futureproof', `${info?.name} v${info?.version}`);

  console.log('\n2. tools/list');
  const tools = await client.listTools();
  const names = tools.tools.map((t) => t.name).sort();
  console.log(`   tools: ${names.join(', ')}`);
  check('score_profile present', names.includes('score_profile'));
  check('lookup_skill_demand present', names.includes('lookup_skill_demand'));
  check('explain_score present', names.includes('explain_score'));

  console.log('\n3. resources/list');
  const resources = await client.listResources();
  const uris = resources.resources.map((r) => r.uri);
  console.log(`   resources: ${uris.join(', ')}`);
  check('methodology resource present', uris.includes('futureproof://methodology'));
  check('dataset resource present', uris.includes('futureproof://dataset'));

  console.log('\n4. resources/read');
  const methodology = await client.readResource({ uri: 'futureproof://methodology' });
  const methodologyText = methodology.contents
    .map((c) => ('text' in c ? String(c.text) : ''))
    .join('');
  check('methodology mentions the formula', methodologyText.includes('skill_score'));
  check('methodology labels synthetic data', /SYNTHETIC/i.test(methodologyText));

  console.log('\n5. tools/call score_profile');
  const scored = jsonOf(
    await client.callTool({
      name: 'score_profile',
      arguments: {
        skills: [
          { name: 'Python', proficiency: 3 },
          { name: 'data entry', proficiency: 2 },
          { name: 'completely made up skill', proficiency: 1 },
        ],
        include_adjacent_roles: true,
      },
    }),
  ) as Record<string, unknown>;

  check('returns a numeric score', typeof scored.score === 'number', String(scored.score));
  check('flags the unmatched skill', (scored.unmatched_skills as string[]).length === 1);
  check('warns about the unmatched skill', (scored.warnings as string[]).length > 0);
  check(
    'marks the computation deterministic',
    (scored.provenance as Record<string, unknown>).deterministic === true,
  );
  check(
    'states that no model was called',
    (scored.provenance as Record<string, unknown>).llm_called === false,
  );

  console.log('\n6. tools/call lookup_skill_demand');
  const demand = jsonOf(
    await client.callTool({
      name: 'lookup_skill_demand',
      arguments: { query: 'Python', limit: 2 },
    }),
  ) as Record<string, unknown>;
  const row = (demand.rows as Array<Record<string, unknown>>)[0];
  check('finds the requested skill', row?.name === 'Python', String(row?.name));
  check('reports posting counts', typeof row?.postings_30d === 'number');
  check(
    'warns that counts are synthetic',
    (demand.warnings as string[]).some((w) => /synthetic/i.test(w)),
  );

  console.log('\n7. tools/call explain_score');
  const explained = textOf(
    await client.callTool({
      name: 'explain_score',
      arguments: {
        skills: [{ name: 'Python', proficiency: 3 }, { name: 'data entry', proficiency: 2 }],
        locale: 'bn',
      },
    }),
  );
  const prose = explained.split('--- machine-readable ---')[0] ?? '';
  check('explanation is non-empty', prose.length > 200);
  check('prose uses skill names, not raw ids', !/[0-9a-f]{8}-[0-9a-f]{4}-/.test(prose));
  check('honours the bn locale', /সামগ্রিক স্কোর/.test(prose));

  console.log('\n8. determinism over the protocol');
  const a = jsonOf(
    await client.callTool({
      name: 'score_profile',
      arguments: { skills: [{ name: 'Python', proficiency: 3 }] },
    }),
  ) as Record<string, unknown>;
  const b = jsonOf(
    await client.callTool({
      name: 'score_profile',
      arguments: { skills: [{ name: 'Python', proficiency: 3 }] },
    }),
  ) as Record<string, unknown>;
  check('same input gives the same score', a.score === b.score, `${a.score} vs ${b.score}`);

  console.log('\n9. error handling');
  const bad = (await client.callTool({
    name: 'score_profile',
    arguments: { skills: [] },
  })) as { isError?: boolean };
  check('rejects empty input instead of crashing', bad.isError === true);

  await client.close();

  console.log(
    `\n${failures === 0 ? 'ALL PROTOCOL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error('[protocol] failed:', error);
  process.exit(1);
});

// Keeps `spawn` imported for the type reference above even if tree-shaken.
void spawn;
