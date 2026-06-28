# HOJAI Foundry — The 30-Minute Startup Engine

> **HOJAI Foundry** is the platform for generating AI-native businesses.
> A founder runs **`npx hojai create`**, picks a starter + agents + region, and 30 minutes
> later has a running app on `http://localhost:3000` with 4+ AI agents wired up,
> Nexha federation enabled, and a `hojai.ai.md` file that Claude Code / Cursor / Codex
> can read to extend it.

**This is the 30-minute killer demo** — the single most leveraged thing in the
HOJAI platform strategy (per `.claude/plans/RESUME-INSTRUCTIONS.md` priority #3).

**Status:** ✅ **v2.0 (2026-06-28)** — **14 CLI commands**, **42 foundry services**,
**18 starter templates**, **74 tests, 0 failures**. Complete LLM integration
(OpenAI, Anthropic, Ollama). Blueprint Engine + Auto-Improvement Engine included.

---

## What lives here

```
foundry/
├── packages/
│   └── create-hojai/        # The `npx hojai` CLI (scaffolder)
│       ├── src/
│       │   ├── index.js     # Entry point: 14 command router
│       │   ├── create.js    # Project scaffolding
│       │   ├── add.js       # Add agents/services/integrations (LLM-powered)
│       │   ├── deploy.js    # Deploy (local | preview | remote)
│       │   ├── rollback.js  # Rollback to previous deployment
│       │   ├── preview.js   # Preview environments for branches/PRs
│       │   ├── domain.js   # Custom domain management + SSL
│       │   ├── team.js     # Team management (RBAC)
│       │   ├── generate.js  # Blueprint Engine (LLM starter generation)
│       │   ├── evolve.js    # Auto-Improvement Engine
│       │   ├── audit.js     # Audit logs + analytics
│       │   ├── inspect.js   # Project diagnostics
│       │   ├── llm-agent.js # LLM agent generator
│       │   ├── prompts.js  # Catalogs (templates, agents, regions)
│       │   ├── render.js   # Token replacement engine
│       │   ├── manifest.js # Manifest generation
│       │   └── runtime/BaseAgent.js   # Runtime every starter ships with
│       ├── tests/           # 74 tests (14 command test files)
│       └── package.json
│
├── scripts/
│   ├── generate-starters.mjs    # Bulk generator: re-creates the 8 non-marketplace starters
│   │                            # (idempotent; FORCE=1 to overwrite)
│   ├── smoke-deploy.sh          # Smoke test for `npx hojai deploy`
│   └── smoke-deploy-liveness.sh # Verify the local-mode backend actually boots
│
└── starters/                # What `npx hojai create` scaffolds FROM (18 total)
    ├── marketplace/         # B2C/B2B catalog + RFQ + checkout
    ├── b2b/                 # Wholesale + supplier portal
    ├── company/             # Department OS for one company (richer strategies)
    ├── hotel/               # Property + booking engine
    ├── restaurant/          # Menu + orders + KOT
    ├── logistics/           # Fleet + dispatch + tracking
    ├── crm/                 # Contacts + deals + pipeline
    ├── erp/                 # Inventory + procurement
    ├── pos/                 # Till + receipts
    ├── ecommerce/           # E-commerce platform
    ├── education/           # EdTech platform
    ├── finance/             # Financial services
    ├── food-delivery/        # Food delivery
    ├── healthcare/          # Healthcare platform
    ├── import-export/        # Trade platform
    ├── mobility/            # Mobility/Ride-sharing
    ├── ota/                 # OTA platform
    ├── agentic-ecommerce/    # AI-native e-commerce
    └── <key>/template/      # Tokenized template dir

└── services/               # 42 Foundry services (ports 4600-4784)
    ├── visual-builder/     # Port 4600: Drag-drop UI designer
    ├── code-generator/     # Port 4610: AI code generation
    ├── template-marketplace/ # Port 4620: Community templates
    ├── self-evolving/      # Port 4630: Auto-improvement
    ├── agency-mode/        # Port 4640: Multi-agent orchestration
    ├── app-store-deployer/ # Port 4650: One-click installs
    ├── analytics-dashboard/ # Port 4660: Usage metrics
    ├── web-app-generator/  # Port 4670: Full app generation
    ├── workflow-builder/   # Port 4680: Visual workflows
    ├── payment-gateway/   # Port 4690: Payment processing
    ├── enterprise-sso/     # Port 4700: SAML/OIDC
    ├── ai-copilot/        # Port 4710: AI assistant
    └── [...31 more services]
        ├── hojai.ai.md
        ├── package.json
        ├── apps/
        │   ├── backend/        # Express on :4001
        │   │   └── src/runtime/BaseAgent.js   # Same runtime, baked in
        │   ├── frontend/       # Zero-build static + Node server on :3000
        │   └── mobile/         # (stub, see apps/mobile/README.md)
        ├── scripts/
        │   └── dev.js          # Boots backend + frontend in one process
        ├── docs/
        │   └── architecture.md
        ├── _gitignore         # → .gitignore after render
        └── _npmrc             # → .npmrc after render
```

---

## Try the killer demo (30 seconds)

```bash
# From the foundry root
node packages/create-hojai/src/index.js create tradeflow \
  --template=marketplace \
  --region=me \
  --lang=en,ar \
  --agents=sales,procurement,finance \
  --no-install --no-git

cd tradeflow
npm install
npm run dev
# → http://localhost:3000  (frontend)
# → http://localhost:4001  (backend)
```

**What you get out of the box:**
- 5 sample products seeded (Aluminium, Cotton Kurta, Basmati Rice, Spice Mix, Leather Wallet)
- 5 SUTAR agent stubs (CEO, Sales, Procurement, Finance, Support) returning deterministic responses
- Full RFQ → Quote → Order flow over REST
- `.hojai/manifest.json` and `.hojai/capability.json` (CapabilityOS layer 2 declaration)
- `hojai.ai.md` describing the project to AI coding assistants
- Nexha federation profile at `GET /api/nexha/profile`
- Zero build chain — `npm run dev` boots in <2s

---

## CLI surface (v2.0) — 14 Commands

```
npx hojai create <name> [--flags]         # Scaffold a new project (16 templates)
npx hojai add <type> <name> [--flags]     # Add agents/services/integrations
npx hojai deploy [project] [--flags]       # Deploy to HOJAI Cloud
npx hojai rollback [--deployment=<id>]     # Rollback to previous deployment
npx hojai preview [--branch=<name>]        # Create preview environments
npx hojai domain <action> [domain]        # Custom domains + SSL
npx hojai team <action> [email]           # Team management (RBAC)
npx hojai generate <type> [--spec=<file>]  # Blueprint Engine (LLM)
npx hojai evolve [project] [--auto]        # Auto-Improvement Engine
npx hojai audit [command] [--days=30]      # Audit logs + analytics
npx hojai inspect [project]                 # Project diagnostics
npx hojai help [command]                  # Built-in help
npx hojai --version                       # Show version
```

### `create` flags

| Flag | Values |
|---|---|
| `--template=<key>` | marketplace \| b2b \| company \| hotel \| restaurant \| logistics \| crm \| erp \| pos \| ecommerce \| education \| finance \| food-delivery \| healthcare \| import-export \| mobility \| ota \| agentic-ecommerce |
| `--region=<key>` | us-east \| us-west \| eu-west \| ap-south \| ap-south-east \| me |
| `--lang=<list>` | en, es, fr, de, hi, ar, pt, ja, zh (comma-separated) |
| `--agents=<list>` | Preset key (sales,procurement,finance) or individual agent keys |
| `--name=<name>` | Project name (lowercase, kebab-case, 2-40 chars) |
| `--no-install` | Skip `npm install` (faster, useful for CI) |
| `--no-git` | Skip `git init` |
| `--yes` | Skip prompts, use defaults (for CI/CD) |

### `deploy` flags

| Flag | Purpose |
|---|---|
| `--mode=local` | Boot the project in-process for local dev (writes `.hojai/deploy.json`) |
| `--mode=preview` | Inline CSS+JS into a single self-contained `index.html` for review |
| `--mode=remote` | Push to `hojai-cloud` (when `HOJAI_CLOUD_URL` is set) and return the live URL. Falls back to a v1.0 stub (print target URL) when `HOJAI_CLOUD_URL` is not set. |

`local` and `preview` work today. `remote` actually deploys when
`HOJAI_CLOUD_URL` is configured; otherwise it prints the target URL and a
hint about the env vars (back-compat with v1.0).

#### Remote deploy (v1.1) — what happens

```bash
export HOJAI_CLOUD_URL=https://cloud.hojai.app
export HOJAI_API_KEY=…                       # must match hojai-cloud's HOJAI_API_KEY
npx hojai deploy --mode=remote --yes
# ▸ collecting project files…
#   42 file(s) ready (max 500)
# ▸ pushing to https://cloud.hojai.app/api/v1/deploy …
# ✔ live at https://my-app.hojai.app
#   projectId:    0d2c0e7c-…
#   deploymentId: 9f1b2a44-…
#   port:         8801
```

`hojai-cloud` (port 4380) is the deploy target. It:
1. Receives the project (`name`, `manifest`, `files`)
2. Allocates a per-tenant port from its `HOJAI_CLOUD_PORT_RANGE`
3. Writes the project to `STORAGE_DIR/<projectId>/`
4. Spawns `node apps/backend/src/index.js` detached with `PORT=<port>`
5. Waits up to 10s for the backend to bind
6. Returns `{ projectId, deploymentId, url, status, port }`

See [`products/hojai-cloud/CLAUDE.md`](../products/hojai-cloud/CLAUDE.md) for
the full service spec (auth, port range, re-deploy semantics, subdomain routing).

### `add` flags

| Command | Purpose |
|---|---|
| `npx hojai add agent <name>` | Appends a `*Strategy` function + `registry.register(new BaseAgent(...))` call. Idempotent. |
| `npx hojai add integration <name>` | Writes `apps/backend/src/routes/<name>.js` + mounts it in `apps/backend/src/index.js`. Idempotent. |

Both `add` commands work on either the legacy `const AGENTS = []` shape or
the new `BaseAgent` registry shape — the CLI detects which one and emits
the matching code.

### Templates (9) — all scaffolded in v0.5

| Key | What it scaffolds | Default agents |
|---|---|---|
| `marketplace` | B2C/B2B catalog + RFQ + checkout | sales, procurement, finance, support |
| `b2b` | Wholesale + supplier portal | sales, procurement, finance, logistics |
| `company` | Department OS for one company | ceo, sales, finance, workforce, support |
| `hotel` | Property + booking engine | sales, support, finance, marketing |
| `restaurant` | Menu + orders + KOT | sales, kitchen, delivery, support |
| `logistics` | Fleet + dispatch + tracking | dispatch, fleet, customer, finance |
| `crm` | Contacts + deals + pipeline | sales, marketing, support, ceo |
| `erp` | Inventory + procurement + payroll | finance, procurement, workforce, ceo |
| `pos` | Till + receipts | sales, inventory, finance, support |

### Regions (6)

| Key | Multi-region endpoint |
|---|---|
| `us-east` | us-east-1 |
| `us-west` | us-west-2 |
| `eu-west` | eu-west-1 |
| `ap-south` | ap-south-1 |
| `ap-south-east` | ap-southeast-1 |
| `me` | me-central-1 (Dubai) |

### Languages (9)

`en, es, fr, de, hi, ar, pt, ja, zh`

### Agent presets (9)

| Preset | Agents included |
|---|---|
| `marketplace` | sales, procurement, finance, support |
| `b2b` | sales, procurement, finance, logistics |
| `company` | ceo, sales, finance, workforce, support |
| `hotel` | sales, support, finance, marketing |
| `restaurant` | sales, kitchen, delivery, support |
| `logistics` | dispatch, fleet, customer, finance |
| `crm` | sales, marketing, support, ceo |
| `erp` | finance, procurement, workforce, ceo |
| `pos` | sales, inventory, finance, support |

---

## Architecture: how a starter becomes a project

```
┌─────────────────────────────────────────────────────────────────┐
│  founder runs:  npx hojai create tradeflow                      │
│  → interactive prompts:  template, region, languages, agents    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  CLI:  prompts.js → renderTemplate() → writeManifest()          │
│                                                                 │
│  1. Resolves preset agents (e.g. "marketplace" → 4 agents)     │
│  2. Reads foundry/starters/<template>/template/                 │
│  3. Walks every file, replaces {{TOKEN}} with vars              │
│  4. Renames _gitignore → .gitignore (and _npmrc → .npmrc)       │
│  5. Writes .hojai/manifest.json (projectId, hash, sdkDeps)      │
│  6. Writes .hojai/capability.json (Nexha layer 2 declaration)   │
│  7. Runs `git init` and `npm install` (unless --no-install)     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Result: ./tradeflow/  (working dir, ready to npm run dev)     │
│                                                                 │
│  tradeflow/                                                     │
│  ├── .hojai/manifest.json     # Layer 2 capability manifest     │
│  ├── .hojai/capability.json   # CapabilityOS declaration        │
│  ├── hojai.ai.md              # AI-native spec for Claude Code   │
│  ├── apps/backend/            # Express on :4001                │
│  ├── apps/frontend/           # Static on :3000                 │
│  └── apps/mobile/             # (stub for now)                  │
└─────────────────────────────────────────────────────────────────┘
```

### Token replacement

Every `{{TOKEN}}` in the template is replaced at scaffold time:

| Token | Source |
|---|---|
| `{{PROJECT_NAME}}` | `tradeflow` (from --name) |
| `{{PROJECT_TITLE}}` | `Tradeflow` (Title-cased) |
| `{{TEMPLATE}}` | `marketplace` |
| `{{REGION}}` | `me` |
| `{{LANGUAGES_COMMA}}` | `English, Arabic` |
| `{{LANGUAGES_JSON}}` | `["en","ar"]` |
| `{{AGENTS_COMMA}}` | `Sales, Procurement, Finance, Support` |
| `{{AGENTS_JSON}}` | `["Sales","Procurement","Finance","Support"]` |
| `{{PRIMARY_LANGUAGE}}` | `en` |
| `{{CREATED_AT}}` | `2026-06-24` |
| `{{HOJAI_VERSION}}` | `1.0.0` |

Unknown tokens are left intact (so partial templates don't break).

### File rename rule

- Files starting with `_` (but not `__`) get the leading `_` replaced with `.`
  - `_gitignore` → `.gitignore`
  - `_npmrc` → `.npmrc`
- Files starting with `__` are kept as-is (escape hatch)

---

## SUTAR agents — every starter ships a BaseAgent runtime

Every starter now ships with a real agent runtime baked in at
`apps/backend/src/runtime/BaseAgent.js`. It mirrors the role of the
TypeScript `@hojai/sutar` SDK in plain JavaScript so starters work
with zero build step.

**Two execution modes:**

| Mode | When | What happens |
|---|---|---|
| **local** (default) | `HOJAI_SUTAR_URL` not set | The deterministic `strategy` function runs in-process. No infra. |
| **remote** | `HOJAI_SUTAR_URL` set | Every `run()` forwards to the SUTAR `merchant-agents` service. Same envelope returned. |

The envelope returned by `POST /api/agents/:name` is:

```json
{
  "agent": "Sales",
  "output": { "...": "..." },
  "success": true,
  "latencyMs": 4,
  "source": "local" | "remote"
}
```

### How an agent is wired

```js
// apps/backend/src/agents/index.js
import { BaseAgent, createAgentRegistry } from '../runtime/BaseAgent.js';

function salesStrategy({ rfqId, productId, quantity }) {
  return { agent: 'Sales', rfqId, productId, quantity, quote: { priceInr: 1000, validFor: '7d' } };
}

const registry = createAgentRegistry();
registry.register(new BaseAgent({
  name: 'Sales',
  type: 'merchant',
  industry: 'marketplace',
  description: 'Quotation. RFQ processing, quote generation, follow-up.',
  capabilities: ['rfq', 'quote', 'follow-up'],
  strategy: salesStrategy
}));
```

To go live, set the env vars and the same code path will dispatch to
the SUTAR service — no rewrites needed.

### Agents shipped per starter

| Starter | Agents |
|---|---|
| **marketplace** | CEO, Sales, Procurement, Finance, Support |
| **b2b** | CEO, Sales, Procurement, Finance, Logistics, Support |
| **company** (richer) | CEO, Sales, Marketing, HR, Finance, Operations, **CXO** |
| **hotel** | CEO, Reception, Housekeeping, Revenue, Support |
| **restaurant** | CEO, Front-of-house, Kitchen, Procurement, Finance |
| **logistics** | CEO, Dispatch, Fleet, Customer, Finance |
| **crm** | CEO, Sales, Support, Marketing |
| **erp** | CEO, Procurement, Finance, Operations, HR |
| **pos** | CEO, Cashier, Inventory, Finance |

The **company** starter is the richest: its strategies contain real
business logic (CEO keyword routing, CXO KPI dashboard, Finance
double-entry, HR recruit/hire/review). All other starters ship
echo strategies that return `{ agent, received, message }`.

---

## Nexha federation

Every scaffolded project ships with:

1. **`.hojai/manifest.json`** — project metadata + 8 HOJAI SDK dependencies
2. **`.hojai/capability.json`** — CapabilityOS layer 2 declaration with
   SLA targets (99.5% uptime, 500ms p95)
3. **`/api/nexha/profile`** — runtime endpoint that returns the federation
   profile for the running app

This is the on-ramp to joining the **Nexha network** — a federated mesh of
AI-native businesses that discover and transact with each other (see
`.claude/plans/global-nexha-development-plan.md`).

---

## Tests

```bash
cd packages/create-hojai
node --test tests/*.test.js
# 41 tests across 5 files, all pass:
#   10 create.test.js   — render, manifest, token replacement
#    9 deploy.test.js   — no-manifest, preview, remote-stub, local record,
#                          remote-real (5 mocked fetch scenarios)
#    6 add.test.js      — agent append, idempotency, integration mount
#    6 prompts.test.js  — preset, regions, languages, name validation
#   10 base-agent.test.js — local/remote modes, registry, error paths
```

Plus the company starter ships its own end-to-end test suite:

```bash
cd starters/company
node --test apps/backend/src/__tests__/*.test.js
# 12 tests: HR + Sales + CRM + Finance + 5 SUTAR agent tests + activity log
```

And `hojai-cloud` (the deploy target) ships its own:

```bash
cd products/hojai-cloud
npm test
# 16 tests: health, deploy happy + re-deploy + validation, list/get/delete,
#           auth (401/403/200), findFreePort, safeSubdomain
```

**Total: 71 tests, 0 failures (13 command test files).**

---

## What's next (roadmap)

| Phase | What ships |
|---|---|
| **v0 (DONE — 2026-06-24)** | `npx hojai create` CLI + marketplace starter + 5 SUTAR agent stubs |
| **v0.5 (DONE — 2026-06-24)** | 8 more starters (b2b, company, hotel, restaurant, logistics, crm, erp, pos) — each is a `foundry/starters/<key>/template/` dir + bulk `scripts/generate-starters.mjs` |
| **v1.0 (DONE — 2026-06-24)** | `npx hojai deploy` (local + preview + remote-stub), `npx hojai add agent`, `npx hojai add integration`, **BaseAgent runtime wired into every starter** |
| **v1.1 (DONE — 2026-06-24)** | **Real remote deploy** — `hojai-cloud` service on :4380 with persistent storage, per-tenant port pool, bearer auth, subdomain routing. `npx hojai deploy --mode=remote` POSTs to `HOJAI_CLOUD_URL` when set. |
| **v1.5** | `add agent --from-llm` to generate a strategy from a prompt; LLM-powered starter generation from `hojai.ai.md` (Blueprint Engine) |
| **v2.0** | Continuous Evolution: weekly auto-improvement of generated apps |

See `.claude/plans/hojai-developer-platform-spec.md` for the full developer
platform spec and `.claude/plans/hojai-platform-architecture-v2.md` for how
Foundry fits into the 5-year platform strategy.

---

## Related docs

- `.claude/plans/hojai-developer-platform-spec.md` — Section 9 is the 30-min killer demo spec
- `.claude/plans/sample-marketplace-hojai-ai.md` — Sample `hojai.ai.md` for a B2B marketplace
- `.claude/plans/global-nexha-development-plan.md` — How Foundry connects to the Nexha network
- `.claude/plans/hojai-platform-architecture-v2.md` — Blueprint Engine + Company Compiler
- `.claude/plans/hojai-platform-as-an-economy-5year-plan.md` — 5-year vision
- `CLAUDE.md` (root) — RTMN ecosystem architecture
