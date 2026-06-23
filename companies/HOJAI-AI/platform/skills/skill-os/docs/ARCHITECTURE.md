# SkillOS — Architecture

**Version:** 1.1.0
**Date:** 2026-06-23
**Status:** Phase 1 of the "App Store for AI" build (see [ROADMAP.md](./ROADMAP.md))

---

## Mission

SkillOS is the **Universal AI Capability Marketplace** — the registry, runtime, and storefront for every AI capability in the HOJAI ecosystem. Genie, CoPilot, SUTAR, Industry AI, and third-party AIs all use SkillOS to find, install, and execute capabilities.

```
SkillOS = "App Store + npm + GitHub + HuggingFace for AI capabilities"
```

It is one of the 3 HOJAI AI foundational pillars:

| Pillar | Port | Question |
|---|---|---|
| TwinOS | 4705 | "What am I?" |
| MemoryOS | 4703 | "What do I know?" |
| **SkillOS** | **4743** | **"What can I do?"** |

---

## Layered architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                    API                                        │
│   /api/skills/*   /api/assets/*   /api/installed   /api/billing/*   /api/audit│
│              /openapi.json    /health    /ready    /                                │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────────────────────────────────────────────┐
│                                Domain layer                                    │
│                                                                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌─────────┐ │
│  │   Skill    │ │  Multi-    │ │   Install    │ │ Certification│ │ Billing │ │
│  │  Registry  │ │  Asset     │ │   Registry   │ │ (5 levels)  │ │ (tx)    │ │
│  │  + Runtime │ │  Registry  │ │   per-tenant │ │             │ │         │ │
│  └────────────┘ └────────────┘ └──────────────┘ └────────────┘ └─────────┘ │
│                                                                              │
│  ┌────────────┐ ┌────────────┐ ┌──────────────┐                             │
│  │ Governance │ │  Learning  │ │  Analytics   │                             │
│  │ deprecate, │ │ feedback   │ │ calls, lat,  │                             │
│  │ compliance │ │ rolling avg│ │ success rate │                             │
│  └────────────┘ └────────────┘ └──────────────┘                             │
└──────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────────────────────────────────────────────┐
│                             Integration layer                                  │
│                                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐              │
│  │  Storage   │  │  Event bus │  │  HTTP      │  │  Auth      │              │
│  │  Persistent│  │  publish & │  │  client    │  │  requireAuth│              │
│  │  Map or    │  │  subscribe │  │  for       │  │  + bypass  │              │
│  │  MongoDB   │  │  11 topics │  │  upstream  │  │  in dev    │              │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data model

### Asset

A single record representing one installable item in the marketplace. The 10 `assetType` values are:

| assetType | Example | Notes |
|---|---|---|
| `skill` | Reasoning, Calendar, WhatsApp Send | Has executable code; runs in VM sandbox |
| `agent-template` | Sales Bot Agent | Wraps a SALAR OS agent profile |
| `workflow-template` | Employee Onboarding | A FlowOS workflow spec |
| `prompt-pack` | Marketing Prompt Pack | A bundle of prompts |
| `knowledge-pack` | ICD-10 Codes, GST Rules | Domain knowledge export |
| `tool-connector` | Stripe Connector | External service adapter |
| `model-adapter` | GPT-4o Adapter | Wraps an external model |
| `automation-pack` | "Onboard new employee" | Bundled automations |
| `industry-pack` | Restaurant Pack | Vertical bundle |
| `enterprise-pack` | Healthcare Enterprise | Org-wide bundle |

### Asset record (full metadata, 30+ fields)

```js
{
  // Identity
  id, assetType, name, description, category, tags, version, status,
  code,                  // for skills
  template,              // skill template this was created from

  // Auth & control
  permissions, rateLimit, budget, requiresApproval,

  // Ownership & provenance
  creatorId, publisher, ownerType, ownerId,

  // I/O contracts
  inputSchema, outputSchema,

  // Capability
  requiredModels, requiredPermissions,

  // Reach
  supportedLanguages, supportedIndustries,

  // Commercial
  license, pricingModel, price, currency,

  // Trust & certification
  certification: { level, certifiedAt, certifiedBy, auditRef, notes },
  compliance:    { gdpr, soc2, hipaa, pci, iso27001, fedramp },

  // Visibility
  visibility, visibilityOrg, tenantId,

  // Lifecycle
  status, deprecatedAt, sunsetAt, replacement,

  // Metrics (rolled up)
  avgExecutionMs, accuracyScore,
  totalDownloads, totalExecutions, totalRevenue,

  // Discovery
  featured, trending,

  // Timestamps
  createdAt, updatedAt,
}
```

### Install record

```js
{
  id, assetId, assetType, tenantId, version,
  status: 'installed' | 'uninstalled',
  installedAt, uninstalledAt,
  pinnedVersion: bool,
}
```

### Transaction record

```js
{
  id, kind: 'install' | 'execution' | 'subscription' | 'refund' | 'payout',
  assetId, tenantId, publisherId,
  amount, currency, platformFee, publisherNet,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  refId, createdAt, completedAt,
}
```

### Audit record

```js
{
  id, actor, action, resourceType, resourceId, tenantId, payload, timestamp,
}
```

---

## Storage abstraction

`src/store.js` provides a unified API that works in two modes:

- **Default:** `PersistentMap` (file-backed, restart-safe, single-instance)
- **Opt-in via `MONGODB_URI`:** Real MongoDB (multi-instance, production-grade)

```js
import { createStore } from './store.js';
const skills = createStore('skills', { serviceName: 'skill-os' });
await skills.set(id, record);
const s = await skills.get(id);
```

Both modes expose: `get`, `set`, `has`, `delete`, `size`, `values`, `entries`, `toArray`, `filter`, `clear`, `count`.

The MongoDB mode is loaded lazily (mongoose is an `optionalDependencies`). If `MONGODB_URI` is set but mongoose is not installed, the service falls back to PersistentMap with a warning.

---

## Execution model

Skills with a `code` field are executed in a sandboxed Node.js `vm.Script` context:

```js
const sandbox = {
  input, ctx, console, result,
  Math, JSON, Date, Array, Object, String, Number, Boolean,
  Promise: { resolve: (v) => v },  // forces sync execution
};
new vm.Script(`(function(input, ctx){ ${code}; ... })`).runInNewContext(sandbox, { timeout: 2000 });
```

**Security properties:**
- 2-second timeout (`SKILL_TIMEOUT_MS` env override)
- No `require` / `import`
- No real async I/O (`Promise` is shimmed)
- Limited globals
- Per-skill rate limit + budget enforced at the route level
- Approval workflow for `requiresApproval` skills

---

## Event bus

SkillOS publishes 11 event topics via `@rtmn/shared/event-bus`. Consumers can subscribe (TwinOS bridge, agent-orchestration, AI intelligence, billing, audit):

| Topic | When |
|---|---|
| `skill.registered` | A new skill is created |
| `skill.invoked` | A skill executes successfully |
| `skill.failed` | A skill execution errors |
| `skill.version_published` | A new version is published |
| `skill.unregistered` | A skill is deleted |
| `skill.recommendation_requested` | A discover search is performed |
| `skill.tested` | A skill is tested (real or mock) |
| `asset.registered` | A new asset is created (any type) |
| `asset.updated` | An asset is updated |
| `asset.deleted` | An asset is deleted |
| `asset.installed` | An asset is installed for a tenant |
| `asset.uninstalled` | An asset is uninstalled |
| `asset.deprecated` | An asset is marked deprecated |
| `asset.certified` | An asset's certification level changes |
| `billing.transaction` | A billing event is recorded |
| `audit.event` | A governance event is recorded |

Each event includes a `tenantId` from the request, so per-tenant event isolation is preserved.

---

## Upstream integrations (formerly stubs, now real)

Four routes used to be silent stubs. They now make real HTTP calls to the configured upstream:

| Route | Upstream | Default URL | What it does |
|---|---|---|---|
| `POST /api/skills/:id/memory` | MemoryOS | `localhost:4703` | Reads/writes per-skill memory partitions |
| `POST /api/skills/:id/twin` | TwinOS | `localhost:4705` | Reads/writes per-skill twin shadows |
| `POST /api/skills/:id/flow` | FlowOS | `localhost:4244` | Triggers a workflow step |
| `POST /api/skills/:id/test` | VM sandbox | (local) | Actually runs the skill code |

If the upstream is unreachable, the route returns **`503 UPSTREAM_UNREACHABLE`** with a clear error message (not a silent stub). Override URLs with `MEMORYOS_URL`, `TWINOS_URL`, `FLOWOS_URL` env vars.

---

## Hub integration

SkillOS is reachable at `localhost:4500/api/skill-os/*` via the HOJAI AI api-gateway (auto-proxied). The api-gateway at `companies/HOJAI-AI/platform/infra/api-gateway/src/index.js` has two routes configured:

```js
'/api/skill-os': { url: process.env.SKILLOS_URL || 'http://localhost:4743', name: 'skill-os' },
'/api/skillos':  { url: process.env.SKILLOS_URL || 'http://localhost:4743', name: 'skill-os' },
```

---

## OpenAPI / SDK

`GET /openapi.json` returns a complete OpenAPI 3.0 spec of all 53 routes, with the full schema for Skill, Asset, Install, and Transaction. This is the basis for auto-generating the TS / Python / curl SDKs in Phase 2.

---

## Certification model

5 levels (data is real, enforcement is Phase 2):

```
community  →  verified  →  enterprise  →  government  →  hojai-certified
```

Anyone with auth can call `POST /api/assets/:id/certify` to set a level. Phase 2 will add a real reviewer queue and gating.

---

## Billing model

Transactions are real (data is real, money is Phase 2). Revenue share is hardcoded at **15% platform, 85% publisher** (matches skill-marketplace convention). `GET /api/billing/payouts/:publisherId` computes the outstanding payout for any publisher.

The 5 transaction kinds: `install`, `execution`, `subscription`, `refund`, `payout`.

---

## Governance

- **Deprecation:** `POST /api/assets/:id/deprecate` → sets `status='deprecated'`, `sunsetAt=+90d`, optional `replacement`
- **Compliance:** Per-asset flags for `gdpr`, `soc2`, `hipaa`, `pci`, `iso27001`, `fedramp`
- **Audit log:** All write actions go through `audit()` which writes to a persistent store and emits `audit.event`
- **Approval:** `requiresApproval` flag on skills; pending workflow stub in Phase 2

---

## Tests

140 tests, 0 failures, run with:

```bash
npm test
```

Coverage:
- `__tests__/unit/events.test.mjs` — 19 tests
- `__tests__/unit/store.test.mjs` — 14 tests
- `__tests__/unit/metadata.test.mjs` — 19 tests
- `__tests__/unit/certification.test.mjs` — 11 tests
- `__tests__/unit/billing.test.mjs` — 17 tests
- `__tests__/unit/governance.test.mjs` — 13 tests
- `__tests__/integration/api.test.mjs` — 47 tests

Integration tests boot the real app on a random port and hit the actual HTTP endpoints with fetch.

---

## Environment

| Var | Default | Purpose |
|---|---|---|
| `PORT` | 4743 | Listen port |
| `SKILLOS_REQUIRE_AUTH` | `true` | Set to `false` for dev (auth bypass) |
| `SKILLOS_NO_LISTEN` | unset | Set to `1` to skip listen (for tests) |
| `SKILL_TIMEOUT_MS` | 2000 | VM sandbox timeout per skill |
| `MONGODB_URI` | unset | If set, switch from PersistentMap to MongoDB |
| `HOJAI_DATA_DIR` | `./data` or `/tmp/hojai-skill-os` | PersistentMap data dir |
| `MEMORYOS_URL` | `http://localhost:4703` | MemoryOS for `/memory` route |
| `TWINOS_URL` | `http://localhost:4705` | TwinOS for `/twin` route |
| `FLOWOS_URL` | `http://localhost:4244` | FlowOS for `/flow` route |

---

*See [ROADMAP.md](./ROADMAP.md) for what Phase 1 didn't ship.*
