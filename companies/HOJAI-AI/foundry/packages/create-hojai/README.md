# @hojai/create-hojai

> **The `npx hojai` CLI.** Scaffolds HOJAI Foundry starters into working
> projects. Mirrors `create-react-app` / `create-next-app` conventions.

**Status:** v2.0.0 (2026-06-28) — Complete HOJAI Studio CLI with 14 commands, 71 tests, 0 failures.

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

hojai add <resource> [name] [flags]

hojai deploy [project] [flags]

hojai rollback [deployment] [flags]

hojai preview [project] [flags]

hojai domain <action> [domain] [flags]

hojai team <action> [email] [flags]

hojai generate <type> [name] [flags]

hojai evolve [project] [flags]

hojai audit [command] [flags]

hojai inspect [project]

hojai help [command]
```

### Core Commands

#### create — Scaffold a new project
```bash
npx hojai create mystartup --template=marketplace --agents=default
```
Flags:
- `--template=<key>` — marketplace | b2b | company | hotel | restaurant | logistics | crm | erp | pos
- `--region=<key>` — us-east | us-west | eu-west | ap-south | ap-south-east | me
- `--lang=<list>` — Comma-separated: en, es, fr, de, hi, ar, pt, ja, zh
- `--agents=<list>` — Comma-separated preset OR individual agent keys
- `--name=<name>` — Project name (lowercase, kebab-case, 2-40 chars)
- `--no-install` — Skip `npm install`
- `--no-git` — Skip `git init`
- `--yes` — Skip prompts, use defaults

#### add — Add agents, services, or integrations
```bash
npx hojai add agent checkout --from-llm "create an AI agent for payment processing"
npx hojai add service auth --template=jwt
npx hojai add integration stripe
```
Flags:
- `--from-llm` — Generate agent using LLM (OpenAI, Anthropic, or Ollama)
- `--template=<name>` — Use a specific template
- `--provider=<name>` — LLM provider: openai | anthropic | ollama

#### deploy — Deploy to HOJAI Cloud
```bash
npx hojai deploy mystartup
npx hojai deploy mystartup --branch=feature-checkout
npx hojai deploy --env=staging
```
Flags:
- `--branch=<name>` — Deploy specific branch
- `--env=<name>` — Target environment (production | staging)
- `--no-restart` — Skip service restart

#### rollback — Rollback to previous deployment
```bash
npx hojai rollback
npx hojai rollback --deployment=dep_abc123
npx hojai rollback --list
```

#### preview — Create preview environments
```bash
npx hojai preview --branch=feature-checkout
npx hojai preview --branch=pr-42 --ttl=24h
npx hojai preview --list
npx hojai preview --open=prv_xyz789
npx hojai preview --delete=prv_xyz789
```

#### domain — Manage custom domains
```bash
npx hojai domain add myapp.com
npx hojai domain verify myapp.com
npx hojai domain list
npx hojai domain remove myapp.com
```

#### team — Manage team members
```bash
npx hojai team add member@example.com --role=developer
npx hojai team remove member@example.com
npx hojai team list
npx hojai team update member@example.com --role=admin
```

#### generate — Blueprint Engine (LLM-powered starter generation)
```bash
npx hojai generate starter --spec=mycompany.ai.md
npx hojai generate starter "food delivery app like swiggy"
```
Flags:
- `--spec=<file>` — Path to .ai.md specification file
- `--provider=<name>` — LLM provider for generation

#### evolve — Auto-Improvement Engine
```bash
npx hojai evolve
npx hojai evolve --project=mystartup --auto
npx hojai evolve --project=mystartup --check
```

#### audit — Audit logs and analytics
```bash
npx hojai audit report --days=30
npx hojai audit export --format=json --days=7
npx hojai audit keys --project=mystartup
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
├── index.js       # CLI entry: command routing, help system
├── create.js      # Project scaffolding: prompt → render → writeManifest → git/install
├── add.js         # Add agents, services, integrations (with LLM support)
├── deploy.js      # Deploy to HOJAI Cloud
├── rollback.js    # Rollback to previous deployment
├── preview.js     # Preview environments for branches/PRs
├── domain.js      # Custom domain management with SSL
├── team.js        # Team management (add, remove, roles)
├── generate.js    # Blueprint Engine: LLM-powered starter generation
├── evolve.js      # Auto-Improvement Engine: continuous evolution
├── audit.js       # Audit logs, usage analytics, reports
├── inspect.js     # Project inspection and diagnostics
├── prompts.js     # Templates, agents, regions, languages catalog + helpers
├── render.js      # Token replacement engine (renderTemplate, buildVars)
└── manifest.js    # Writes .hojai/manifest.json + .hojai/capability.json
```

### LLM Integration

The CLI supports LLM-powered agent generation via:
- **OpenAI** — `OPENAI_API_KEY` environment variable
- **Anthropic** — `ANTHROPIC_API_KEY` environment variable
- **Ollama** — Local LLM via `OLLAMA_ENDPOINT` (default: `http://localhost:11434`)

```bash
# Using OpenAI
export OPENAI_API_KEY=sk-...
npx hojai add agent checkout --from-llm "payment processing agent"

# Using Anthropic Claude
export ANTHROPIC_API_KEY=sk-ant-...
npx hojai add agent checkout --from-llm "payment processing agent" --provider=anthropic

# Using local Ollama
export OLLAMA_ENDPOINT=http://localhost:11434
npx hojai add agent checkout --from-llm "payment processing agent" --provider=ollama
```

See [../../CLAUDE.md](../../CLAUDE.md) for the full architecture, including
the token table, file rename rule, and agent catalog.

## Tests

```bash
node --test tests/*.test.js
# 71 tests, 0 failures
```

Coverage:
- prompts.test.js (16): Templates, agents, regions, languages catalogs
- deploy.test.js (9): Local/preview/remote deploy modes
- add.test.js (6): Agents, services, integrations
- base-agent.test.js (10): Local/remote agent execution
- audit.test.js (5): Audit logging
- domain.test.js (4): Custom domain management
- evolve.test.js (4): Auto-improvement
- generate.test.js (4): Blueprint engine
- inspect.test.js (4): Project diagnostics
- llm-agent.test.js (5): LLM agent generation
- preview.test.js (4): Preview environments
- rollback.test.js (3): Deployment rollback
- team.test.js (5): Team management

## License

UNLICENSED — internal HOJAI AI tooling.
