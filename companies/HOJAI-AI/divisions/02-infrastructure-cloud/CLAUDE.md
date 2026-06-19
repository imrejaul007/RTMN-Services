# Division 2 — AI Infrastructure Cloud

> **Status:** 🟡 ~50% built (more than originally thought — FlowOS and PolicyOS have multiple existing implementations)
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
| **TwinOS** | [services/twinos-hub/](../../../services/twinos-hub/) + 10 twin services | 4705 | ✅ Real (running, 86+ twins) |
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

## 4. What's NOT Built (the real gap — corrected)

| Missing | Why It Matters | Effort |
|---|---|---|
| **SkillOS** | Genie services do "skills" ad-hoc. Need a skill registry + execution semantics. | 3-4 weeks |
| **SimulationOS** | Nothing exists. Critical for "what-if" / Digital Twin scenarios. | 8-12 weeks |
| **Vector Engine** | Zero vector DB code in the repo. Critical for RAG. | 2 weeks to adopt Pinecone/Weaviate/Qdrant |
| **Reasoning Runtime** | ReAct / CoT logic is ad-hoc in hojai-intelligence. Need a general framework. | 6-8 weeks |
| **Planning Engine** | No planner. Agents today use hard-coded workflows. | 4-6 weeks |
| **Start the existing FlowOS + PolicyOS services** | Built but not running | 1-2 days |
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