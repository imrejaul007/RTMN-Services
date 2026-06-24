# @hojai/ai-tool-submission

> HOJAI AI tool marketplace submission helper. Takes the `@hojai/ai-spec` schema + the `hojai.ai.md` example and packages it as a **Cursor skill** + **VSCode extension**. Implements step 7 ("Submit to AI tool marketplaces") of the HOJAI developer platform launch sequence.

## What it does

Two outputs, one command:

| Output | Format | Install path |
|---|---|---|
| `cursor/SKILL.md` | Cursor agent skill | `~/.cursor/skills/hojai/SKILL.md` |
| `vscode/{package.json, SKILL.md, README.md, icon.svg}` | VSCode extension folder | `vsce package` → install the `.vsix` |
| `manifest.json` | Machine-readable inventory | — |

When the SKILL is installed, AI coding tools (Cursor, Continue.dev, VSCode Copilot, Claude Code Skills) get the full HOJAI project context automatically when they detect a `hojai.ai.md` in the workspace.

## Quick start

```bash
# Default: writes to ./dist relative to this tool's directory
node src/publish.mjs

# Custom output dir
node src/publish.mjs --out /tmp/hojai-ai

# Dry run (just shows what would be written)
node src/publish.mjs --dry-run
```

Output:
```
[ai-publish] wrote 1 cursor files
[ai-publish] wrote 4 vscode files
[ai-publish] wrote manifest.json
[ai-publish] output dir: /tmp/hojai-ai

Next steps:
  1. Cursor: copy dist/cursor/SKILL.md to ~/.cursor/skills/hojai/SKILL.md
  2. VSCode: cd dist/vscode && vsce package  (then install the .vsix)
  3. Submit to marketplaces: open the appropriate PR
```

## What the SKILL contains

The Cursor SKILL is **8 KB** of self-contained context that tells an AI agent:

- **When to use** — detects HOJAI projects via `hojai.ai.md` or `.hojai/manifest.json` files
- **Project structure** — `apps/backend/`, `apps/frontend/`, agents, services, etc.
- **The 3 context files** — what `hojai.ai.md` + `.hojai/manifest.json` + `.hojai/capability.json` mean
- **All 26 SDKs** — quick reference for `@hojai/foundation`, `@hojai/sutar`, etc.
- **Conventions** — SUTAR agents, requireAuth middleware, Zod validation, etc.
- **Adding things** — `hojai add agent`, `hojai add integration`, `hojai add industry`
- **Example hojai.ai.md output** — what the project context file looks like

## VSCode extension

The generated `vscode/` folder has:

- `package.json` — VSCode extension manifest with `activationEvents: ['workspaceContains:hojai.ai.md']`
- `SKILL.md` — same content as the Cursor skill
- `README.md` — install instructions
- `icon.svg` — 128x128 dark theme icon

Two commands are contributed:
- **HOJAI: Show project context** — opens `.hojai/manifest.json`
- **HOJAI: Regenerate AI-native spec** — runs `hojai ai-spec generate`

To package: `cd dist/vscode && vsce package` (requires `npm i -g @vscode/vsce`).

## Why this matters

The developer platform's launch sequence item 7 is "Submit to AI tool marketplaces (Cursor, VSCode, Claude Skills)". This script automates the packaging step — the most tedious part of marketplace submission is generating the right format for each marketplace.

The `@hojai/ai-spec` schemas + the `hojai.ai.md` format are the canonical "context file" for any HOJAI project. This tool makes that context available in **every major AI coding tool** automatically.

## Tests

```bash
cd tools/ai-tool-submission
node --test __tests__/publish.test.mjs
```

## See also

- [`@hojai/ai-spec`](../../sdk/hojai-ai-spec/) — the source schema
- [`docs/site/`](../../docs/site/) — the public docs site
- HOJAI Developer Platform: https://docs.hojai.ai (or your self-hosted instance)
