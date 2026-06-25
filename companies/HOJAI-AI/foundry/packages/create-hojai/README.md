# @hojai/create-hojai

> **The `npx hojai` CLI.** Scaffolds HOJAI Foundry starters into working
> projects. Mirrors `create-react-app` / `create-next-app` conventions.

**Status:** v1.0.0 (2026-06-24) — 16 tests, 0 failures.

## Install / run

```bash
# From the foundry root
node packages/create-hojai/src/index.js create mystartup

# Or once published to npm:
npx hojai create mystartup
```

## Usage

```
hojai create [<name>] [flags]

Flags:
  --template=<key>    marketplace | b2b | company | hotel | restaurant |
                      logistics | crm | erp | pos
  --region=<key>      us-east | us-west | eu-west | ap-south |
                      ap-south-east | me
  --lang=<list>       Comma-separated: en, es, fr, de, hi, ar, pt, ja, zh
  --agents=<list>     Comma-separated preset OR individual agent keys
  --name=<name>       Project name (lowercase, kebab-case, 2-40 chars)
  --no-install        Skip `npm install`
  --no-git            Skip `git init`
  --yes               Skip prompts, use defaults
```

## What it does

1. Resolves interactive prompts (or uses flags) → `name, template, agents, region, languages`
2. Looks up the starter at `foundry/starters/<template>/template/`
3. Walks every file, replacing `{{TOKEN}}` placeholders with values
4. Renames `_gitignore` → `.gitignore` (and `_npmrc` → `.npmrc`)
5. Writes `.hojai/manifest.json` (projectId, hash, 8 HOJAI SDK deps)
6. Writes `.hojai/capability.json` (CapabilityOS layer 2 declaration)
7. Runs `git init` and `npm install` (unless `--no-install` or `--no-git`)

## Architecture

```
src/
├── index.js       # CLI entry: prompt → render → writeManifest → git/install
├── prompts.js     # Templates, agents, regions, languages catalog + helpers
├── render.js      # Token replacement engine (renderTemplate, buildVars)
└── manifest.js    # Writes .hojai/manifest.json + .hojai/capability.json
```

See [../../CLAUDE.md](../../CLAUDE.md) for the full architecture, including
the token table, file rename rule, and agent catalog.

## Tests

```bash
node --test tests/prompts.test.js
# 16 tests, all pass
```

Coverage:
- Templates/agents/regions/languages catalogs (8 tests)
- Lookup helpers (2 tests)
- Name validation (1 test)
- `buildVars` token map (2 tests)
- `renderTemplate` (4 tests: walk + replace, unknown tokens, skip dirs, _-rename)
- `writeManifest` (1 test)

## License

UNLICENSED — internal HOJAI AI tooling.
