# CLAUDE.md - @hojai/ai-tool-submission

> **Path:** `tools/ai-tool-submission/`
> **Status:** ✅ **v1.0.0 — 4/4 tests passing, 0 failures**

## What this is

**Helper that packages the HOJAI AI-native spec as a Cursor skill + VSCode extension.** Implements the launch sequence step 7 ("Submit to AI tool marketplaces").

## Architecture

```
tools/ai-tool-submission/
├── package.json             (zero runtime deps)
├── README.md                (user-facing)
├── CLAUDE.md                (this file)
├── src/
│   └── publish.mjs          (~280 LOC, single-file generator)
└── __tests__/
    └── publish.test.mjs     (4 tests, ~500ms)
```

## Usage

```bash
# Default: writes to ./dist
node src/publish.mjs

# Custom output
node src/publish.mjs --out /tmp/hojai-ai

# Dry run
node src/publish.mjs --dry-run
```

## How it works

1. **Loads** `@hojai/ai-spec` from the SDK's dist (uses its `renderFor()` to generate a sample `hojai.ai.md`)
2. **Discovers** all `@hojai/*` SDK directories to count
3. **Builds** the Cursor SKILL.md by inlining the AI-native spec docs + 26-SDK reference
4. **Builds** the VSCode package.json (with workspaceContains activation) + SKILL.md + README + icon
5. **Writes** a machine-readable `manifest.json` inventory

## Why zero deps

Like the docs site, this is a tiny single-file tool. Just Node ESM + stdlib. No framework, no build step.

## Tests (4/4 passing)

- dry-run mode doesn't write anything
- actual mode writes all expected files
- manifest.json references real SDK count
- SKILL.md is > 1 KB

## Sub-tool hierarchy

- Reads: `@hojai/ai-spec` (the source spec)
- Reads: All `@hojai/*` SDK directories (for counting)
- Outputs: SKILL.md + VSCode package.json + manifest.json
- Used by: anyone who wants to install HOJAI in their Cursor / VSCode / Continue

## Related

- `@hojai/ai-spec` — source schema + `hojai.ai.md` generator
- `docs/site/` — public developer docs
- `.github/workflows/docs-site.yml` — the CI workflow that builds/deploys the docs site

The combination of (a) `@hojai/ai-spec` schema, (b) `hojai.ai.md` per-project, and (c) this submission helper completes the AI-native spec story end-to-end:

1. **Schema** defines what the project context looks like
2. **`hojai.ai.md`** is the per-project instance
3. **Submission helper** distributes the context to every AI coding tool
