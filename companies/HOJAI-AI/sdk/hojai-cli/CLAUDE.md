# @hojai/cli — HOJAI Command-Line Tool

> **Package:** `@hojai/cli` v1.0.0
> **TypeScript:** ESM, Node.js >= 18
> **Bin:** `hojai` (via `npx hojai`)
> **Status:** ✅ **PRODUCTION-READY** — runs against the HOJAI Cloud / RTMN Hub.

---

## What it is

The HOJAI command-line tool. Manage config, search the marketplace, capture memories, compose LLM context, generate AI-native project specs — all from your terminal.

It's the fastest way for humans (and AI coding assistants) to interact with the HOJAI ecosystem without writing a full SDK integration.

---

## Install

```bash
# One-off use
npx hojai --help

# Global install
npm install -g @hojai/cli
hojai --help
```

---

## Commands

| Command | Purpose |
|---|---|
| `hojai help` / `hojai --help` | Show full usage |
| `hojai version` | Print version |
| `hojai config [show\|set\|clear]` | Manage CLI configuration (apiKey, baseUrl) |
| `hojai whoami` | Show current API key + gateway health |
| `hojai listings search` | Search the BAM marketplace |
| `hojai listings get <id>` | Show a marketplace listing |
| `hojai memory capture <text>` | Capture a memory |
| `hojai memory search <query>` | Search your memories |
| `hojai memory compose <owner> <q>` | Compose LLM context for an owner |
| `hojai ai-spec generate` | Generate `hojai.ai.md` + `.hojai/` files |
| `hojai ai-spec read` | Show current AI-native spec |
| `hojai ai-spec validate` | Validate existing AI-native spec |
| `hojai deploy [--mode=local\|preview\|remote]` | Ship the current project to a runnable URL |
| `hojai add agent <Name>` | Add a stub SUTAR agent to the current project's `agents/index.js` |
| `hojai add integration <hojai-name>` | Add an `@hojai/*` SDK to the current project's `package.json` |

---

## Quick Start

```bash
# 1. Configure with your API key (or use HOJAI_API_KEY env)
hojai config set --api-key hojai_live_xxxx

# 2. Verify connection
hojai whoami

# 3. Search the marketplace
hojai listings search --query "negotiation" --category agent

# 4. Capture a memory
hojai memory capture "Met Sarah at HOJAI meetup" --tags conference

# 5. Compose LLM context (for any AI app)
hojai memory compose u-1 "What is Sarah interested in?"

# 6. Generate an AI-native spec for your project
cd my-hojai-project
hojai ai-spec generate
```

---

## Flags (Global)

| Flag | Purpose |
|---|---|
| `--json` | Machine-readable JSON output (skip colors/tables) |
| `--api-key <key>` | Override API key for one invocation |
| `--base-url <url>` | Override HOJAI base URL for one invocation |

---

## Environment

| Variable | Purpose |
|---|---|
| `HOJAI_API_KEY` | API key (overrides config file) |
| `HOJAI_BASE_URL` | Base URL (overrides config file) |
| `NO_COLOR` | Disable colored output |

---

## Configuration File

Stored at `~/.hojai/config.json`:

```json
{
  "apiKey": "hojai_live_xxxx",
  "baseUrl": "https://api.hojai.ai"
}
```

Priority order: `--api-key` flag → `HOJAI_API_KEY` env → config file → error.

Manage via:
```bash
hojai config show            # Show current config
hojai config set --api-key X  # Set apiKey
hojai config set --base-url X # Set baseUrl
hojai config clear           # Delete the config file
```

---

## AI-Native Spec (hojai.ai.md)

The `ai-spec` commands power the **AI-native spec story** — the file that Claude Code / Cursor / GitHub Copilot / Codex read to understand a HOJAI project.

```bash
cd my-project
hojai ai-spec generate
# Creates:
#   ./hojai.ai.md
#   ./.hojai/context.json
#   ./.hojai/blueprint.yaml
```

- `hojai.ai.md` — Human-readable project description for AI assistants
- `.hojai/context.json` — Machine-readable project context
- `.hojai/blueprint.yaml` — The Blueprint Engine source of truth

Run `hojai ai-spec validate` in CI to ensure the spec stays in sync with the code.

---

## Architecture

```
@hojai/cli
├── bin/hojai.js                 # Bin entry (shebang + main())
├── src/
│   ├── index.ts                 # main(argv) — command dispatcher
│   ├── config.ts                # loadConfig() — file/env/flag resolution
│   ├── foundation-config.ts     # HojaiConfig + DEFAULT_CONFIG
│   ├── output.ts                # printJson, printTable, colors
│   ├── commands/
│   │   ├── help.ts              # printHelp()
│   │   ├── config.ts            # runConfig — show/set/clear
│   │   ├── whoami.ts            # runWhoami — auth + health
│   │   ├── listings.ts          # runListings — search/get
│   │   ├── memory.ts            # runMemory — capture/search/compose
│   │   └── ai-spec.ts           # runAiSpec — generate/read/validate
│   └── __tests__/
│       └── index.test.ts        # Tests
```

Built on `@hojai/foundation`'s `HojaiConfig` shape. Uses Node's built-in modules only (`fs`, `os`, `path`, `crypto`, `test`).

---

## Output Modes

**Human mode (default):**
- Colored output (disable with `NO_COLOR=1`)
- Pretty tables for list commands
- Success/error/info/warn icons

**JSON mode:**
```bash
hojai --json listings search --query "negotiation"
# Outputs JSON, one object per line, no colors
```

Useful for piping to `jq`, `grep`, or another tool.

---

## Programmatic Use

The CLI exports its `main()` function:

```ts
import { main, VERSION } from '@hojai/cli';

await main(['node', 'hojai', 'whoami']);
```

Use this for embedding the CLI in a script or testing.

---

## Build

```bash
npm install
npm run build
npm test
node bin/hojai.js --help
```

---

## Files

```
hojai-cli/
├── CLAUDE.md                    # This file
├── README.md                    # Quick start
├── package.json                 # Bin + scripts
├── bin/hojai.js                 # Bin entry
├── tsconfig.json
├── src/
│   ├── config.ts                # Config loader
│   ├── foundation-config.ts     # Config shape
│   ├── index.ts                 # Main entry
│   ├── output.ts                # Output helpers
│   ├── commands/                # Subcommands
│   └── __tests__/                # Tests
└── dist/                        # Compiled output
```

---

## See also

- [@hojai/foundation](../hojai-foundation/CLAUDE.md) — Base SDK that this CLI uses internally
- [@hojai/ai-spec docs](../hojai-foundation/CLAUDE.md#hojai-ai-md-spec) — What `hojai ai-spec generate` produces
- [HOJAI Platform Architecture](../../../.claude/plans/hojai-platform-architecture-v2.md) — How the AI-native spec fits the broader platform