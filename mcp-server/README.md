# FutureProof MCP server

Exposes the Future-Proof Score to any MCP-compatible assistant (Claude Desktop,
Claude Code, Cursor, Windsurf) over the Model Context Protocol.

The point: when someone asks an assistant "which of my skills are at risk from
AI?", the assistant should answer with numbers from a dataset — not with a
plausible-sounding guess. This server gives it those numbers.

## Why it is built this way

| Rule | How it is enforced |
| --- | --- |
| No invented numbers | every value is read from `data/seed/*.json` or computed by `lib/scoring/score.ts` |
| No model in the loop | the server never calls an LLM — it works offline and costs nothing |
| Synthetic data stays labelled | `is_synthetic: true` and a warning are in **every** response |
| Deterministic | the same input always returns the same score; asserted in the test suite |
| Read-only | there is no write tool; nothing here touches the database |

## Install

```bash
cd mcp-server
npm install
```

## Run the checks

```bash
npm run typecheck    # tsc --noEmit
npm run smoke        # calls each tool directly, prints the output
npm test             # spawns the server over stdio and drives it with a real MCP client
```

`npm test` is the one that matters. It connects a genuine MCP client, runs
`initialize` → `tools/list` → `resources/list` → `resources/read` →
`tools/call`, and asserts 19 things including determinism, synthetic-data
warnings and graceful handling of bad input.

## Connect it to Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "futureproof": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/futureproof/mcp-server/src/index.ts"],
      "cwd": "/absolute/path/to/futureproof"
    }
  }
}
```

Then restart Claude Desktop. The three tools appear under the 🔌 menu.

> **On Windows** use `"command": "node"` with
> `"args": ["--import", "tsx", "C:\\path\\to\\futureproof\\mcp-server\\src\\index.ts"]`.

## Tools

### `score_profile`

Score a list of skills and return the Future-Proof Score (0–100, higher is
safer), a per-skill breakdown, the top gaps for a target role, and safer
adjacent roles.

```json
{
  "skills": [
    { "name": "Python", "proficiency": 3 },
    { "name": "financial reporting", "proficiency": 2 }
  ],
  "target_occupation": "data-analyst",
  "include_adjacent_roles": true
}
```

`proficiency`: 1 = studied only, 2 = used in a project or internship,
3 = used professionally. Defaults to 2.

If you omit `target_occupation`, the role with the best skill overlap is chosen
and the response says so (`target_occupation_source: "auto-selected"`).
Skills that cannot be matched to the taxonomy are returned in
`unmatched_skills` with a warning — they are never silently scored as zero.

### `lookup_skill_demand`

Job-demand and AI-exposure figures for one skill, or a ranked list.

```json
{ "query": "Python", "limit": 5 }
```

Returns posting counts, 30-day trend, demand percentile, mean AI exposure
across linked tasks, and up to three verified free courses. A missing value is
`null` — never estimated.

### `explain_score`

A plain-language, checkable explanation of a score: how much each skill
contributed, which skills carry the most risk, what was excluded for lack of
data, and the formula. Available in English and Bangla (`locale: "bn"`).

Every number in the explanation is taken from the score being explained, so the
prose cannot drift away from the arithmetic.

## Resources

- `futureproof://methodology` — the formulas, weights, bands and data caveats.
- `futureproof://dataset` — provenance and a sample of the dataset.

## How it reuses the web app

The server imports the same modules the website does:

```
lib/data/local.ts        the dataset provider (now launchable from any cwd)
lib/scoring/score.ts     the score itself
lib/analysis/gap.ts      gap analysis and adjacent roles
lib/skills/dictionary.ts free-text skill -> taxonomy id
lib/cv/offline.ts        deterministic CV extraction
```

To make that possible without Next.js, the pure core was split away from the
UI-only parts: `lib/math.ts` holds the numeric helpers that used to live beside
Tailwind's `cn()`, and `server-only` guards were left on the modules that
genuinely need a server (LLM calls, env access) while the pure ones became
importable from plain Node. **The scoring code is not duplicated** — the MCP
server and the website cannot disagree, because there is only one copy.
