# Architecture

> How genie-os fits into the HOJAI ecosystem, from a 30,000-foot view down to request flow.

## 30,000-foot view

```
┌──────────────────────────────────────────────────────────────────────┐
│                       HOJAI AI Ecosystem                              │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │   RTMN/companies/HOJAI-AI/products/genie/                       │ │
│  │   THE GENIE HOME — everything Genie lives here                  │ │
│  │                                                                  │ │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │ │
│  │   │  genie-os    │  │ 23 Genie     │  │  Other HOJAI  │          │ │
│  │   │  (this repo) │  │ services     │  │ services     │          │ │
│  │   │              │  │ (siblings)   │  │ (separate)   │          │ │
│  │   └──────┬───────┘  └──────┬───────┘  └──────────────┘          │ │
│  │          │                 │                                    │ │
│  └──────────┼─────────────────┼────────────────────────────────────┘ │
│             │ HTTP             │                                    │
│             │                 │                                    │
│  ┌──────────┼─────────────────┼────────────────────────────────────┐ │
│  │  External repos (each in its own folder, NOT inside genie-os) │ │
│  │                                                                  │ │
│  │  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │ │
│  │  │ companies/do-app │ │ companies/Nexha  │ │ HOJAI-AI/salar  │  │ │
│  │  │ Consumer commerce│ │ B2B commerce     │ │ AI marketplace  │  │ │
│  │  │ port 3001        │ │ port 8000        │ │ port 8200       │  │ │
│  │  └─────────────────┘ └─────────────────┘ └─────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

## The 4 layers of genie-os

### Layer 1: Foundation

Identity, memory, twins, goals, policies, skills, workflows. These are the **primitives** that everything else builds on.

> **Note (2026-06-21):** The 7 genie-os foundation services were moved to `_deprecated-foundation/`. Their canonical implementations live in `companies/HOJAI-AI/platform/*` and are managed by `companies/HOJAI-AI/start-all.sh`. Each `_deprecated-foundation/<svc>/NOTICE.md` explains the move.
>
> genie-os no longer starts or owns foundation services. It delegates to the canonical platform services via env vars (`CORPID_URL`, `MEMORYOS_URL`, etc.).

| Service | Canonical port | Owns | Description |
|---|---:|---|---|
| **corpid** | 4702 | `HOJAI-AI/platform/identity/corpid-service/` | Universal identity. Issues `USR-`, `AGT-`, `MRC-`, `ORG-`, `SVC-` prefixed IDs. |
| **twinos** | 4705 | `HOJAI-AI/platform/twins/twinos-hub/` | Digital twin state with versioning. 86+ canonical twins. |
| **memoryos** | 4703 | `HOJAI-AI/platform/memory/memory-os/` | Persistent memory. Vector embeddings, knowledge graph, TTL. |
| **goalos** | (in HOJAI-AI/platform) | HOJAI-AI | Goals, KPIs, milestones, progress tracking. |
| **policyos** | (in HOJAI-AI/platform) | HOJAI-AI | Authorization. Priority-ordered rules with range conditions. |
| **skillos** | (in HOJAI-AI/platform) | HOJAI-AI | Skill registry. |
| **flowos** | 4156 | `HOJAI-AI/platform/flow/flow-os-canonical/` | Multi-step workflow orchestration with dependency graph. |

### Layer 2: AI Runtime (ports 7100-7300)

The brain that uses the foundation to do work.

| Service | Port | Owns | Description |
|---|---:|---|---|
| **genie** | 7100 | genie-os | The main personal AI. Chat, briefing, memory inbox. Delegates to 23 specialists. |
| **sutar** | 7200 | genie-os | Business Agent OS. Companies, agents, decisions. |
| **agentos** | 7300 | genie-os | Universal agent lifecycle. Create, deploy, execute, monitor. |

### Layer 3: Thin Clients (ports 8090, 8190, 8290)

HTTP proxies that forward requests to external product repos. They exist so genie-os has a **stable local endpoint** for each product, regardless of where the actual product is deployed.

| Client | Port | Forwards to | What flows through |
|---|---:|---|---|
| **do-client** | 8090 | `companies/do-app/backend` (port 3001) | All consumer commerce: auth, orders, subscriptions, agent actions |
| **nexha-client** | 8190 | `companies/Nexha/commerce-identity` (port 8000) | All B2B: companies, products, POs, ratings, RFQs |
| **salar-client** | 8290 | `HOJAI-AI/salar` (port 8200) | All AI marketplace: listings, reviews, purchases |

### Layer 4: Frontend (port 3000)

A single web app that consumes all the above. 5 tabs: Home, DO, Nexha, Salar, Genie.

## How requests flow

### Example 1: User asks Genie "Help me buy a wireless mouse"

```
User clicks "Ask" in web UI
   ↓
Browser → POST /api/genie/ask
   ↓
web server (genie-os:3000) proxies to genie-os Genie
   ↓
runtime/genie (genie-os:7100)
   ├── Pull context from own foundation:
   │     ├── MemoryOS (7003) → user's recent memories
   │     └── GoalOS (7004) → user's active goals
   ├── Detect intent: "buy" → DELEGATE
   ↓
POST to genie-shopping-agent (sibling in parent folder, port 4728)
   ├── genie-shopping-agent returns a shopping session
   └── runtime/genie wraps the response
   ↓
Response flows back up
   ↓
User sees: "I found your shopping session! ..."
```

### Example 2: User browses the Salar marketplace

```
User clicks "Salar" tab
   ↓
Browser → GET /api/salar/listings
   ↓
web server (genie-os:3000) proxies to salar-client
   ↓
salar-client (genie-os:8290) → HTTP forward
   ↓
HOJAI-AI/salar (external repo, port 8200)
   ├── Query MongoDB for published listings
   └── Return as JSON
   ↓
Response flows back up
   ↓
User sees: 11 AI listings
```

### Example 3: User creates a Nexha company

```
User fills in B2B signup form
   ↓
Browser → POST /api/nexha/auth/signup
   ↓
web server → nexha-client (genie-os:8190)
   ↓
nexha-client → HTTP forward
   ↓
RTMN/companies/Nexha/commerce-identity (port 8000)
   ├── Validate input
   ├── Create company in MongoDB
   ├── Call sutar-bridge → Sutar (genie-os:7200)
   │     └── Sutar creates a "merchant" agent for the new company
   └── Return company + CorpID
   ↓
Response flows back
```

## Why this architecture

### 1. Separation of concerns
Each repo/service has ONE job:
- genie-os: orchestrate
- DO: consumer commerce
- Nexha: B2B
- Salar: marketplace
- 23 Genie services: specialized AI capabilities

### 2. Failure isolation
If DO app is down, the rest still works. Each thin client returns 502 gracefully and the UI shows an error.

### 3. Independent deployability
Any repo can deploy without the others. The thin clients are the only coupling point.

### 4. Foundation as a true platform
CorpID, MemoryOS, TwinOS, etc. are shared by ALL services. A new product can be added by:
1. Creating a thin client
2. Using the same CorpID for identity
3. Calling MemoryOS for context
4. Done.

### 5. Specialized intelligence
The 23 Genie services in the parent folder each excel at ONE thing. runtime/genie delegates to the right specialist based on intent. This is the "1000x" capability — the user doesn't have to know which service to use, Genie routes automatically.

## What genie-os does NOT do

- ❌ Store consumer products or orders (DO does this)
- ❌ Store B2B companies or POs (Nexha does this)
- ❌ Store AI marketplace listings (Salar does this)
- ❌ Implement specialized AI (the 23 Genie services do this)

## What genie-os DOES do

- ✅ Identity (CorpID) for all entities
- ✅ Memory (MemoryOS) for all users
- ✅ Twinning (TwinOS) for all entities
- ✅ Goals (GoalOS) for all users
- ✅ Authorization (PolicyOS) for all actions
- ✅ Skills (SkillOS) registry
- ✅ Workflows (FlowOS) orchestration
- ✅ Business agents (Sutar) for all companies
- ✅ Agent lifecycle (AgentOS) for all agents
- ✅ The Genie chat AI (delegates to specialists)
- ✅ Web UI that ties everything together

## Data flow patterns

### Read pattern (most common)
```
User → Web → Service (e.g. Salar) → MongoDB → back to User
```

### Write pattern
```
User → Web → genie-os service → MongoDB + maybe → downstream service
Example: Order placed → DO backend creates order → Sutar notifies merchant agent
```

### Delegation pattern (the new one)
```
User → runtime/genie → detects intent → calls 23 Genie specialists
Example: "buy" intent → genie-shopping-agent
```

## Request flow rules

1. **Web (3000) is the only public entry point.** All UIs go through it.
2. **Thin clients (8090, 8190, 8290) are genie-os's local stable endpoint** for each product.
3. **External repos (3001, 8000, 8200) are the source of truth** for their domain.
4. **runtime/genie (7100) is the AI brain** that uses everything else.
5. **Foundation services (7001-7007) are shared utilities** used by all layers.

## See also

- [SERVICES.md](SERVICES.md) — every service with its port, owner, and purpose
- [INTEGRATION.md](INTEGRATION.md) — detailed integration with external repos
- [QUICKSTART.md](QUICKSTART.md) — 5-minute setup
- [DEVELOPMENT.md](DEVELOPMENT.md) — for contributors
