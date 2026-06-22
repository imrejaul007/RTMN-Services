# Services Catalog

> Every service in the genie-os ecosystem, with port, owner, and purpose.
> Last verified: 2026-06-21

## Services owned by genie-os (7 total)

These are started by `npm run start:all`.

> **Note (2026-06-21):** The 7 genie-os foundation services (corpid, twinos, memoryos, goalos, policyos, skillos, flowos) were moved to `_deprecated-foundation/` and are no longer started by `npm run start:all`. The canonical foundation implementations live in `companies/HOJAI-AI/platform/*` and are managed by `companies/HOJAI-AI/start-all.sh`. genie-os delegates to the canonical services via env vars.

### Foundation (deprecated — see `_deprecated-foundation/`)

#### corpid — port 7001
- **Path:** `foundation/corpid/`
- **Purpose:** Universal identity. Issues prefixed IDs: `USR-` (users), `AGT-` (agents), `MRC-` (merchants), `ORG-` (organizations), `SVC-` (services).
- **Auth:** Internal token only (`x-internal-token` header)
- **Used by:** All other services for entity identification
- **Code:** ~270 lines

#### twinos — port 7002
- **Path:** `foundation/twinos/`
- **Purpose:** Digital twin state management. Stores state, traits, relationships. Versions every update.
- **Auth:** Internal token
- **Used by:** runtime/genie for user state
- **Code:** ~120 lines

#### memoryos — port 7003
- **Path:** `foundation/memoryos/`
- **Purpose:** Persistent memory. Each memory has: type, content, importance (0-1), tags, optional TTL. Supports semantic search via regex.
- **Auth:** Internal token
- **Used by:** runtime/genie for user context
- **Code:** ~95 lines

#### goalos — port 7004
- **Path:** `foundation/goalos/`
- **Purpose:** Goals and KPIs. Each goal has: title, category, priority, status, progress (0-100), milestones, target value, unit, due date.
- **Auth:** Internal token
- **Used by:** runtime/genie for user goals
- **Code:** ~110 lines

#### policyos — port 7005
- **Path:** `foundation/policyos/`
- **Purpose:** Authorization engine. Rules with priority, conditions (including numeric ranges like `amount_greater_than: 10000`), and allow/deny effects.
- **Auth:** Internal token
- **Used by:** sutar for decision validation
- **Code:** ~100 lines

#### skillos — port 7006
- **Path:** `foundation/skillos/`
- **Purpose:** Skill registry. Built-in handlers for search, analysis, transaction, recommendation, negotiation. Tracks usage stats.
- **Auth:** Internal token
- **Used by:** flowos for workflow steps
- **Code:** ~110 lines

#### flowos — port 7007
- **Path:** `foundation/flowos/`
- **Purpose:** Multi-step workflow orchestration. Supports step dependencies, error handling (stop/continue/retry), async execution, idempotency (via `Idempotency-Key` header), heartbeat-based run recovery, tenant isolation (corpId), 30/min/IP rate limit. On startup, syncs 4 canonical templates from `flow-os-canonical@4156` if `FLOWOS_CANONICAL_URL` is set.
- **Auth:** Internal token + JWT
- **Used by:** Complex multi-step automations; consumers that need plan-based composition
- **Code:** ~210 lines
- **Companion service:** [`flow-os-canonical@4156`](../../../../../../services/flow-os-canonical/) is the template registry — `flowos@7007` reads from it on boot.

### AI Runtime (3 services, ports 7100-7300)

#### genie — port 7100
- **Path:** `runtime/genie/`
- **Purpose:** The main personal AI. Provides auth (signup/login/me), chat (`/api/ask`), briefing (`/api/briefing`), memory inbox (`/api/memory`). **Delegates** to the 23 specialized Genie services for specialized queries.
- **Auth:** JWT bearer for users, internal token for inter-service
- **Delegation logic:** Detects intent from user question ("buy" → genie-shopping-agent, "calendar" → genie-calendar-service, etc.)
- **Used by:** Web UI, thin clients
- **Code:** ~280 lines
- **Health check for 23 services:** `GET /api/genie-services/health`

#### sutar — port 7200
- **Path:** `runtime/sutar/`
- **Purpose:** Business Agent OS. Register businesses, create agents (merchant/procurement/sales/support/inventory/finance), make decisions, audit all decisions.
- **Auth:** Internal token
- **Used by:** Nexha (for supplier onboarding), Salar (for provider agent creation)
- **Code:** ~280 lines

#### agentos — port 7300
- **Path:** `runtime/agentos/`
- **Purpose:** Universal agent lifecycle. Create agents, deploy them, execute tasks, monitor metrics (success rate, latency, total runtime).
- **Auth:** Internal token
- **Used by:** Any service that needs to run an agent
- **Code:** ~165 lines

### Thin Clients (3 services, ports 8090, 8190, 8290)

These are HTTP proxies — they don't have business logic, they just forward.

#### do-client — port 8090
- **Path:** `products/do-client/`
- **Purpose:** Proxies all requests to `RTMN/companies/do-app/backend` (port 3001).
- **Forwarding:** `/api/*` (any path) → `http://localhost:3001/api/*`
- **Code:** ~75 lines (tiny, intentionally)

#### nexha-client — port 8190
- **Path:** `products/nexha-client/`
- **Purpose:** Proxies all requests to `RTMN/companies/Nexha/commerce-identity` (port 8000).
- **Forwarding:** `/api/*` → `http://localhost:8000/api/*`
- **Code:** ~75 lines

#### salar-client — port 8290
- **Path:** `products/salar-client/`
- **Purpose:** Proxies all requests to `RTMN/companies/HOJAI-AI/salar` (port 8200).
- **Forwarding:** `/api/*` → `http://localhost:8200/api/*`
- **Code:** ~75 lines

### Frontend (1 service, port 3000)

#### web — port 3000
- **Path:** `frontend/web/`
- **Purpose:** Single-page web app. 5 tabs (Home, DO, Nexha, Salar, Genie). Proxies `/api/*` to the right backend.
- **Frontend stack:** Vanilla HTML/JS (no React/Vue)
- **Code:** `server.js` (~70 lines) + `public/index.html` (~500 lines)

## Services in sibling folders (23 specialized Genie services)

These live in the parent folder: `RTMN/companies/HOJAI-AI/products/genie/<name>/`
genie-os's runtime/genie can call any of them, but they're started independently.

| Service | Default Port | Specialty |
|---|---:|---|
| genie-gateway | 4701 | Orchestrator. Routes queries to the right specialist. |
| genie-shopping-agent | 4728 | Autonomous shopping — multi-merchant comparison, negotiation |
| genie-briefing-service | 4712 | Morning/evening/weekly briefings from all twins |
| genie-calendar-service | 4709 | Calendar, scheduling, conflict detection |
| genie-money-os | 4715 | Personal finance — budgets, transactions, savings goals |
| genie-wellness-os | 4717 | Health tracking — sleep, mood, steps, exercise |
| genie-companion-service | (default) | Personal chat companion |
| genie-consultant-agent | (default) | Domain-specific consulting |
| genie-creation-os | (default) | Content creation — writing, ideas |
| genie-device-integration | 4769 | Multi-device sync — phone, watch, earbuds, car |
| genie-execution-engine | (default) | Task execution engine |
| genie-learning-os | (default) | Adaptive learning |
| genie-life-gps | (default) | Life guidance / planning |
| genie-life-university | (default) | Education / courses |
| genie-listening-modes | 4768 | Voice mode switching |
| genie-memory-graph | (default) | Knowledge graph memory |
| genie-memory-inbox | (default) | Universal memory capture |
| genie-relationship-os | (default) | People / relationship management |
| genie-serendipity-service | (default) | Random memory resurfacing |
| genie-smart-forgetting-service | (default) | Auto-archive old/duplicate |
| genie-thinking-engine | (default) | Reasoning + chain-of-thought |
| genie-universal-search | (default) | Search across all Genie data |
| genie-wake-word-service | 4767 | "Hey Genie" voice detection |

**Not all have default ports defined.** Check each service's `src/index.js` for the actual default.

## External repos (NOT in genie-os, NOT in products/genie/)

These are started in their own folders and reached via the thin clients.

### do-app
- **Path:** `RTMN/companies/do-app/`
- **Default port:** 3001
- **Start:** `npm run dev:backend`
- **Purpose:** Consumer commerce — auth, orders, subscriptions, agent actions
- **Owned by:** do-app repo (its own)

### Nexha commerce-identity
- **Path:** `RTMN/companies/Nexha/commerce-identity/`
- **Default port:** 8000
- **Start:** `npm run dev`
- **Purpose:** B2B identity, companies, products, POs, ratings
- **Owned by:** Nexha repo (its own)

### Salar
- **Path:** `RTMN/companies/HOJAI-AI/salar/`
- **Default port:** 8200
- **Start:** `npm start`
- **Purpose:** AI marketplace — listings, reviews, purchases
- **Owned by:** HOJAI-AI (but in its own folder, NOT inside genie-os)

## Port assignment summary

| Range | Owner | What's there |
|---|---|---|
| 3000 | genie-os | Web super-app |
| 3001 | do-app (external) | DO backend |
| 4699-4799 | HOJAI-AI/products/genie/* (siblings) | 23 specialized Genie services |
| 7001-7007 | genie-os | Foundation (7 services) |
| 7100-7300 | genie-os | AI Runtime (3 services) |
| 8000 | Nexha (external) | Nexha commerce-identity |
| 8090, 8190, 8290 | genie-os | Thin clients (3 proxies) |
| 8200 | Salar (external) | Salar AI marketplace |

**Conventions:**
- `70xx` = genie-os foundation
- `71xx-73xx` = genie-os runtime
- `80xx` = genie-os thin clients (deliberately different from external 8xxx to avoid conflict)
- `30xx` = web UIs

## How to check what's running

```bash
# From genie-os root
npm run health

# Or from the OS
lsof -i :7100,8000,8200,3000 -P
```

## Total

- **14 services** owned by genie-os
- **23 services** in the parent folder (specialized Genie)
- **3 services** in external repos (DO, Nexha, Salar)
- **40 services total** in the HOJAI Genie ecosystem
