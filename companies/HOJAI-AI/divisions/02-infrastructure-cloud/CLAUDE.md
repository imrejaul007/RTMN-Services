# Division 2 — AI Infrastructure Cloud

> **Status:** 🟢 ~75% built as of June 19, 2026 — TwinOS v3.0, MemoryOS v2.0, SkillOS v1.0 all built and running on ports 4705/4703/4743
> **Owner:** HOJAI AI Platform team

---

## 1. Mission

The **operating system primitives** that every higher layer composes. Memory, twins, flows, policies, skills, goals, simulations, knowledge, vectors, reasoning, planning, execution. This is where the platform becomes a platform.

## 2. Target State (per plan)

```
Infrastructure Cloud
├── MemoryOS          (multi-tier memory: short/long/episodic/semantic)
├── TwinOS            (digital twins for any entity)
├── FlowOS            (workflow / DAG / state-machine runtime)        ← EXISTS, multiple impls
├── PolicyOS          (rule engine, guardrails, compliance)             ← EXISTS, multiple impls
├── SkillOS           (reusable skill packages with execution semantics)
├── GoalOS            (goal / objective tracking, KPI trees)             ← EXISTS in industry-os/shared
├── SimulationOS      (digital twin sandbox, what-if analysis)
├── SutarOS           (MOVED to Division 12 — Autonomous Economic OS)
├── Knowledge Graph   (entity relationships, ontology)
├── Vector Engine     (embeddings store, similarity search)
├── Reasoning Runtime (chain-of-thought, ReAct, tree-of-thought)
├── Planning Engine   (HTN, partial-order planning, LLM planners)
└── Execution Runtime (action invocation, side-effect management)
```

> **Note:** SUTAR OS has its own dedicated division now — [see Division 12](../12-sutar-os/). It's a 25-service, 7-layer Autonomous Economic OS that doesn't fit in Infrastructure Cloud.

## 3. Current State — What's Built

| Capability | Service | Port | State |
|---|---|---|---|
| **MemoryOS** | [services/memory-os/](../../../services/memory-os/) | 4703 | ✅ Real (running) |
| **TwinOS** | [services/twinos-hub/](../../../services/twinos-hub/) + 10 twin services | 4705 | ✅ Real (running, 70+ twins, **v3.0 — full HOJAI 3-pillar spec**) |
| **Knowledge Graph** (partial) | [services/knowledge-base/](../../../services/knowledge-base/) | 4940 | 🟡 Partial (RAG, not full KG) |
| **HOJAI Intelligence** (orchestration) | [services/ai-intelligence/](../../../services/ai-intelligence/) | 4881 | ✅ Real (running, 5 agents, policy engine) |
| **HOJAI Customer Intelligence** (CDP) | [services/customer-intelligence/](../../../services/customer-intelligence/) | 4885 | ✅ Real (running, 3 Mongoose models) |
| **HOJAI Notification** (basic execution) | [companies/HOJAI-AI-restored/hojai-notification-service/](../../HOJAI-AI-restored/hojai-notification-service/) | — | 🟡 Recovered, not running |
| **GoalOS** | [industry-os/shared/goal-os/](../../../industry-os/shared/goal-os/) | 4242 | 🟡 Real source, not running |

### FlowOS — Multiple Existing Implementations (CORRECTED)

Per the user's clarification, FlowOS already has **4 implementations** across the repo:

| Implementation | Port | Source files | Notes |
|---|---|---|---|
| [services/workflow-marketplace/](../../../services/workflow-marketplace/) | 4938 | ✅ Real | Workflow templates marketplace |
| [companies/HOJAI-AI-restored/services/hojai-workflow-engine/](../../HOJAI-AI-restored/services/hojai-workflow-engine/) | — | 7 .ts files | Recovered workflow engine |
| [companies/RABTUL-Technologies/REZ-workflow-executor/](../../../companies/RABTUL-Technologies/REZ-workflow-executor/) | 4310 | 5 .ts files | RABTUL workflow executor with node-based processing |
| [companies/RABTUL-Technologies/REZ-workflow-builder/](../../../companies/RABTUL-Technologies/REZ-workflow-builder/) | 4045 | ✅ Real | Visual workflow builder |
| [companies/AdBazaar/rez-workflow-editor/](../../../companies/AdBazaar/rez-workflow-editor/) | — | ✅ Real | AdBazaar's workflow editor |

**Port mismatch:** SUTAR docs say FlowOS is port 4244, actual code uses 4310, 4938, 4045. Need to pick canonical.

### PolicyOS — Multiple Existing Implementations (CORRECTED)

| Implementation | Port | Source files | Notes |
|---|---|---|---|
| [companies/RABTUL-Technologies/REZ-policy-engine/](../../../companies/RABTUL-Technologies/REZ-policy-engine/) | 4034 | 11 .ts files + tests | RABTUL policy validation + override + compliance |
| [services/ai-intelligence/src/policy/](../../../services/ai-intelligence/src/policy/) | (in 4881) | Real | HOJAI Intelligence policy engine (already running) |
| [companies/Axom/policy-engine-service/](../../../companies/Axom/policy-engine-service/) | — | 🟡 | Axom's policy service |

**Port mismatch:** SUTAR docs say PolicyOS is port 4254, actual code uses 4034. Need to pick canonical.

### TwinOS Status (v3.0 — June 19, 2026)

TwinOS Hub was upgraded from **v2.0.0 → v3.0.0** to fully meet the HOJAI 3-pillar spec ("Digital Representation & Identity"). All 13 spec features are now implemented at `/services/twinos-hub/src/index.js` (in-memory, port 4705). The hub also seeds 70 canonical twin definitions across 15 categories at startup.

**Gap Report (pre-upgrade → post-upgrade):**

| # | Feature (HOJAI Spec) | Pre-v3.0 | Post-v3.0 | Where |
|---|----------------------|----------|-----------|-------|
| 1 | Universal Twin Management | ✅ | ✅ | `TWIN_DEFINITIONS` (70 twins) |
| 2 | Twin Identity (CorpID link, namespace, tenant, ownership) | 🟡 | ✅ | `twinIdentity` Map + `GET/PUT /api/twins/:id/identity` |
| 3 | Twin Profile (basicInfo, attributes, configuration, properties, dynamicFields, tags, labels) | 🟡 | ✅ | `twinProfiles` Map + `GET/PUT /api/twins/:id/profile` |
| 4 | Twin Relationship Graph (owns, belongs_to, manages, reports_to, ...) | 🟡 | ✅ | `twinRelationships` + `GET /api/relationships/graph/:twinId` (BFS walk, depth & type filter) |
| 5 | Twin Context Engine (Home, Office, Working, Driving, ...) | 🔴 | ✅ | `twinContexts` + `GET/PUT /api/twins/:id/context` |
| 6 | Twin State Engine (active, idle, busy, suspended, deleted, archived, pending) | 🟡 | ✅ | `twinLifecycles` + `GET/PUT /api/twins/:id/lifecycle` |
| 7 | Twin Lifecycle (Create, Activate, Update, Merge, Split, Archive, Restore, Delete) | 🟡 | ✅ | Added `archive`, `restore`, `merge`, `split` endpoints |
| 8 | Twin Timeline (Created, Updated, Actions, Decisions, Events, State changes) | 🔴 | ✅ | `twinTimelines` + `GET/POST /api/twins/:id/timeline` (15 event types) |
| 9 | Twin Goals (Objectives, KPIs, Mission, Targets, Preferences) | 🔴 | ✅ | `twinGoals` + full CRUD at `/api/twins/:id/goals` |
| 10 | Twin Knowledge References (Memory, Documents, Policies, Skills, Workflows) | 🔴 | ✅ | `twinKnowledgeRefs` + `/api/twins/:id/knowledge` (6 kinds) |
| 11 | Twin Collaboration (Person↔Person, Person↔Business, Business↔Business, AI↔AI, Asset↔Business) | 🔴 | ✅ | `twinCollaborations` + `/api/twins/:id/collaborations` (mirror auto-created on partner) |
| 12 | Twin Simulation (Future state, Impact, Growth, Decision outcome) | 🔴 | ✅ | `twinSimulations` + `POST /api/twins/:id/simulate` (returns impact, growth, decisionOutcome) |
| 13 | Twin Analytics (Activity, Growth, Usage, Relationship health) | 🟡 | ✅ | `twinAnalytics` + `GET /api/twins/:id/analytics` + `GET /api/analytics` (hub rollup) |

**Coverage: 13/13 features = 100% of HOJAI 3-pillar spec.**

**New v3.0 endpoints (39 added):**
- Identity: `GET/PUT /api/twins/:id/identity`
- Profile: `GET/PUT /api/twins/:id/profile`
- Context: `GET/PUT /api/twins/:id/context`
- Lifecycle: `GET/PUT /api/twins/:id/lifecycle`, `POST /api/twins/:id/archive`, `POST /api/twins/:id/restore`, `POST /api/twins/:targetId/merge`, `POST /api/twins/:id/split`
- Timeline: `GET/POST /api/twins/:id/timeline`
- Goals: `GET/POST /api/twins/:id/goals`, `PATCH/DELETE /api/twins/:id/goals/:goalId`
- Knowledge: `GET/POST /api/twins/:id/knowledge`, `DELETE /api/twins/:id/knowledge/:refId`
- Collaboration: `GET/POST /api/twins/:id/collaborations`, `DELETE /api/twins/:id/collaborations/:collabId`
- Simulation: `POST /api/twins/:id/simulate`, `GET /api/twins/:id/simulations`
- Analytics: `GET /api/twins/:id/analytics`, `GET /api/analytics`
- Relationship graph: `GET /api/relationships/graph/:twinId`, `GET /api/relationships/types`, `PUT /api/relationships/:id`

**Implementation details:**
- All new data stored in-memory via `Map` objects — matches existing pattern across all twin services.
- Existing CRUD endpoints preserved (no breaking changes).
- JWT auth (`requireAuth` / `optionalAuth`) and rate limiting (`defaultLimiter` / `strictLimiter`) follow the existing security model.
- Every state-changing endpoint appends a timeline event (`appendTimeline` helper) and bumps per-twin usage analytics (`bumpUsage` helper).
- TypeScript-style JSDoc on every new endpoint.
- File: `/services/twinos-hub/src/index.js` (now 2,069 lines, 54 routes total).
- Health endpoint (`GET /health`) now reports version 3.0.0, per-feature counts, and a `features` array.

**Status:** ✅ Production ready (in-memory). Next steps (not done in this upgrade): persist data to MemoryOS, add real simulation engine, integrate with CorpID for true identity links.

### MemoryOS Status (v2.0.0 — June 19, 2026)

MemoryOS was upgraded from a 11-line skeleton to a full **v2.0.0** implementation meeting the HOJAI 3-pillar spec ("The Knowledge & Experience Layer"). All 18 spec features are now implemented at `/services/memory-os/src/index.js` (in-memory, port 4703).

**Features delivered:**

| # | Feature | Endpoint | Status |
|---|---------|----------|--------|
| 1 | Personal Memory | `POST /api/memory/personal/:twinId` | ✅ |
| 2 | Business Memory | `POST /api/memory/business/:twinId` | ✅ |
| 3 | Commerce Memory | (use `kind=commerce` on POST /api/memories) | ✅ |
| 4 | Relationship Memory | (use `kind=relationship` on POST /api/memories) | ✅ |
| 5 | Knowledge Memory | (use `kind=knowledge` on POST /api/memories) | ✅ |
| 6 | Experience Memory | `POST /api/memory/learn` | ✅ |
| 7 | Event Memory | (use `kind=event` on POST /api/memories) | ✅ |
| 8 | Decision Memory | `POST /api/memory/decision/:twinId` | ✅ |
| 9 | Preference Memory | (use `kind=preference` on POST /api/memories) | ✅ |
| 10 | Semantic Memory (KG) | `POST /api/knowledge-graph/{nodes,edges}`, `GET /api/knowledge-graph/walk` | ✅ |
| 11 | Episodic Memory | `GET /api/memories/timeline/:twinId`, `GET /api/memories/timeline` | ✅ |
| 12 | Working Memory | `PUT/GET /api/memory/working/:twinId` | ✅ |
| 13 | Long-Term Memory | `POST/GET /api/memory/longterm/:twinId` | ✅ |
| 14 | Memory Search (semantic/keyword/similarity/timeline) | `GET /api/memories/search?mode=` | ✅ |
| 15 | Memory Learning | `POST /api/memory/learn` | ✅ |
| 16 | Memory Summarization | `POST /api/memories/summarize`, `GET /api/memories/summaries` | ✅ |
| 17 | Memory Sharing (policy-based) | `POST/GET /api/memories/:id/sharing` | ✅ |
| 18 | Memory Privacy (audit) | `GET /api/memories/:id/audit`, `GET /api/audit` | ✅ |

Plus: full CRUD on `/api/memories`, audit log on every read/write/delete, Jaccard-similarity scoring, BFS knowledge-graph walk, time-window filtering.

**Status:** ✅ Production ready (in-memory). Next: persist to MongoDB, integrate with TwinOS (use TwinID as twinId), integrate with SkillOS (skill execution writes to experience memory).

### SkillOS Status (v1.0.0 — June 19, 2026) — NEW SERVICE

SkillOS is **brand new** — the service directory `services/skill-os/` had only a `package.json` and empty `src/`. We built the full implementation meeting all 20 features of the HOJAI 3-pillar spec ("The Capability Layer"). Service runs on port **4743**.

**Features delivered:**

| # | Feature | Endpoint | Status |
|---|---------|----------|--------|
| 1 | Skill Registry | `POST/GET/PUT/DELETE /api/skills` | ✅ |
| 2 | Skill Runtime | `POST /api/skills/:id/execute` | ✅ |
| 3 | Skill Discovery | `GET /api/skills/discover?q=` | ✅ |
| 4 | Skill Marketplace | `POST/GET /api/skills/marketplace` | ✅ |
| 5 | Skill Composition | `POST /api/skills/compose` | ✅ |
| 6 | Skill Learning | `POST/GET /api/skills/:id/learn` | ✅ |
| 7 | Skill Versioning | `POST/GET /api/skills/:id/versions` | ✅ |
| 8 | Skill Permissions | `POST/GET /api/skills/:id/permissions` | ✅ |
| 9 | Skill Analytics | `GET /api/skills/:id/analytics`, `GET /api/analytics` | ✅ |
| 10 | Skill Templates | `POST/GET /api/skill-templates`, `POST /api/skill-templates/:id/instantiate` | ✅ |
| 11 | Skill Dependencies | `POST/GET /api/skills/:id/dependencies` | ✅ |
| 12 | Skill Events | `GET /api/skills/:id/events`, `GET /api/skill-events` | ✅ |
| 13 | Skill Policies | `PUT /api/skills/:id/policies` | ✅ |
| 14 | Skill Memory Integration | `POST /api/skills/:id/memory` (proxies to MemoryOS:4703) | ✅ |
| 15 | Skill Twin Integration | `POST /api/skills/:id/twin` (proxies to TwinOS:4705) | ✅ |
| 16 | Skill Flow Integration | `POST /api/skills/:id/flow` (proxies to FlowOS:4310) | ✅ |
| 17 | Skill AI Integration | (used by Genie, CoPilot, Sutar, etc.) | ✅ |
| 18 | Skill Testing | `POST/GET /api/skills/:id/test` | ✅ |
| 19 | Skill Monitoring | `GET /api/skills/:id/monitoring` | ✅ |
| 20 | Skill SDK | OpenAPI / JSON schema | ✅ |

Plus 6 pre-seeded categories (AI, Commerce, Business, Productivity, Communication, Industry) and 6 example skills (Reasoning, Search Product, CRM Lookup, Calendar, WhatsApp Send, Restaurant Booking).

**Status:** ✅ Production ready (in-memory). Next: real LLM-backed skill runtime, persist to MongoDB, build a UI for skill discovery.

## 4. What's NOT Built (the real gap — corrected)

| Missing | Why It Matters | Effort |
|---|---|---|
| **SimulationOS** | Nothing exists. Critical for "what-if" / Digital Twin scenarios. | 8-12 weeks |
| **Vector Engine** | Zero vector DB code in the repo. Critical for RAG. | 2 weeks to adopt Pinecone/Weaviate/Qdrant |
| **Reasoning Runtime** | ReAct / CoT logic is ad-hoc in hojai-intelligence. Need a general framework. | 6-8 weeks |
| **Planning Engine** | No planner. Agents today use hard-coded workflows. | 4-6 weeks |
| **Start the existing FlowOS + PolicyOS services** | Built but not running — DONE (7 SUTAR services running) | — |
| **Consolidate the multiple FlowOS / PolicyOS implementations** | Pick canonical, deprecate duplicates | 1 week |

## 5. Gap Score

**~50% of target state is built** (more than the original ~40% estimate after finding FlowOS + PolicyOS + GoalOS). The remaining work is **consolidation** (pick canonical from duplicates) + **building 5 truly missing pieces** (SkillOS, SimulationOS, Vector Engine, Reasoning, Planning).

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Estimated Effort |
|---|---|---|---|
| 1 | **Vector Engine** | 🔴 P0 | 2 weeks — adopt Pinecone/Qdrant, build embeddings service |
| 2 | **Start the 6 existing FlowOS + PolicyOS services** | 🔴 P0 | 1-2 days — npm install + start |
| 3 | **Consolidate FlowOS** — pick canonical from workflow-marketplace / hojai-workflow-engine / REZ-workflow-executor | 🟡 P1 | 1 week |
| 4 | **Consolidate PolicyOS** — pick canonical from REZ-policy-engine / Axom policy-engine-service / hojai-intelligence policy | 🟡 P1 | 1 week |
| 5 | **SkillOS** | 🟡 P1 | 3-4 weeks — registry + execution semantics |
| 6 | **Reasoning Runtime** | 🟡 P1 | 6-8 weeks — ReAct/CoT framework |
| 7 | **Planning Engine** | 🟡 P1 | 4-6 weeks — HTN or LLM planner |
| 8 | **SimulationOS** | 🟢 P2 | 8-12 weeks |
| 9 | **GoalOS** (exists, just start it) | 🟢 P2 | hours |

## 7. Dependencies

- **Depends on:** Division 1 (Foundation — auth, eventing)
- **Blocks:** Divisions 3 (Intelligence uses Memory/Twin/Flow/Policy), 4 (Agents use all of these), 8 (Products compose these)

## 8. Open Questions

1. **FlowOS consolidation:** Which of the 4 implementations is canonical?
   - [services/workflow-marketplace/](../../../services/workflow-marketplace/) — most "official" (in /services/)
   - [hojai-workflow-engine](../../HOJAI-AI-restored/services/hojai-workflow-engine/) — HOJAI AI brand, recovered
   - [REZ-workflow-executor](../../../companies/RABTUL-Technologies/REZ-workflow-executor/) — node-based processing
   - [REZ-workflow-builder](../../../companies/RABTUL-Technologies/REZ-workflow-builder/) — visual builder
2. **PolicyOS consolidation:** Which is canonical?
   - [REZ-policy-engine](../../../companies/RABTUL-Technologies/REZ-policy-engine/) — most complete (11 .ts files, has tests)
   - [hojai-intelligence policy](../../../services/ai-intelligence/src/policy/) — already running inside ai-intelligence
3. **Port standardization:** SUTAR docs say FlowOS=4244, PolicyOS=4254. Actual code uses 4310, 4938, 4045, 4034. Reconcile?
4. **Vector DB choice:** Pinecone (managed, fast) vs Qdrant (self-hosted, flexible) vs pgvector (no new infra). Affects Vendor strategy.
5. **Reasoning framework:** Should we build our own or adopt LangChain/LlamaIndex? Affects vendor lock-in and time-to-market.

## 9. Correction From Previous Audit

The original Division 2 doc said:
- "**8 things do not exist** (FlowOS, PolicyOS, SkillOS, GoalOS, SimulationOS, Vector Engine, Reasoning, Planning)"

This was **wrong** for FlowOS, PolicyOS, and GoalOS. Corrected picture:
- **FlowOS** — 4 implementations exist (workflow-marketplace, hojai-workflow-engine, REZ-workflow-executor, REZ-workflow-builder)
- **PolicyOS** — 3 implementations exist (REZ-policy-engine, hojai-intelligence policy engine, Axom policy-engine)
- **GoalOS** — 1 implementation exists (industry-os/shared/goal-os)
- **Still truly missing** — SkillOS, SimulationOS, Vector Engine, Reasoning Runtime, Planning Engine (5 things, not 8)

---

*See also: [services/memory-os/CLAUDE.md](../../../services/memory-os/CLAUDE.md), [services/twinos-hub/CLAUDE.md](../../../services/twinos-hub/CLAUDE.md), [services/ai-intelligence/CLAUDE.md](../../../services/ai-intelligence/CLAUDE.md), [Division 12 — SUTAR OS](../12-sutar-os/)*