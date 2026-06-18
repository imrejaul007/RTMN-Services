# Division 2 — AI Infrastructure Cloud

> **Status:** 🟡 ~40% built
> **Owner:** HOJAI AI Platform team

---

## 1. Mission

The **operating system primitives** that every higher layer composes. Memory, twins, flows, policies, skills, goals, simulations, knowledge, vectors, reasoning, planning, execution. This is where the platform becomes a platform.

## 2. Target State (per plan)

```
Infrastructure Cloud
├── MemoryOS          (multi-tier memory: short/long/episodic/semantic)
├── TwinOS            (digital twins for any entity)
├── FlowOS            (workflow / DAG / state-machine runtime)
├── PolicyOS          (rule engine, guardrails, compliance)
├── SkillOS           (reusable skill packages with execution semantics)
├── GoalOS            (goal / objective tracking, KPI trees)
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
| **HOJAI Intelligence** (orchestration) | [companies/HOJAI-AI-restored/hojai-intelligence/](../../HOJAI-AI-restored/hojai-intelligence/) | 4881 | 🟡 Recovered, not running |
| **HOJAI Notification** (basic execution) | [companies/HOJAI-AI-restored/hojai-notification-service/](../../HOJAI-AI-restored/hojai-notification-service/) | — | 🟡 Recovered, not running |

## 4. What's NOT Built (the real gap)

These 8 things in your plan **do not exist anywhere in the repo:**

| Missing | Why It Matters | Effort |
|---|---|---|
| **FlowOS** | Workflows are scattered (ACN, genie-execution-engine, sales-automation). Need a unified flow runtime. | 4-6 weeks |
| **PolicyOS** | Rules/guardrails are inline in each service. Need a dedicated policy engine for AI safety. | 6-8 weeks |
| **SkillOS** | Genie services do "skills" ad-hoc. Need a skill registry + execution semantics. | 3-4 weeks |
| **GoalOS** | Goal tracking is buried in CXO OS, genie-life-gps. Need a generic Goal primitive. | 2-3 weeks |
| **SimulationOS** | Nothing exists. Critical for "what-if" / Digital Twin scenarios. | 8-12 weeks |
| **Vector Engine** | Zero vector DB code in the repo. Critical for RAG. | 2 weeks to adopt Pinecone/Weaviate/Qdrant |
| **Reasoning Runtime** | ReAct / CoT logic is ad-hoc in hojai-intelligence. Need a general framework. | 6-8 weeks |
| **Planning Engine** | No planner. Agents today use hard-coded workflows. | 4-6 weeks |

## 5. Gap Score

**~40% of target state is built** (MemoryOS, TwinOS, partial KG). The rest is a substantial build effort. **This division is the highest priority after Division #7.**

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Estimated Effort |
|---|---|---|---|
| 1 | **Vector Engine** | 🔴 P0 | 2 weeks — adopt Pinecone/Qdrant, build embeddings service |
| 2 | **FlowOS** | 🔴 P0 | 4-6 weeks — pick Temporal / Restate / Inngest, integrate |
| 3 | **PolicyOS** | 🔴 P0 | 6-8 weeks — rule engine + AI guardrails |
| 4 | **SkillOS** | 🟡 P1 | 3-4 weeks — registry + execution semantics |
| 5 | **Reasoning Runtime** | 🟡 P1 | 6-8 weeks — ReAct/CoT framework |
| 6 | **Planning Engine** | 🟡 P1 | 4-6 weeks — HTN or LLM planner |
| 7 | **GoalOS** | 🟢 P2 | 2-3 weeks |
| 8 | **SimulationOS** | 🟢 P2 | 8-12 weeks |

## 7. Dependencies

- **Depends on:** Division 1 (Foundation — auth, eventing)
- **Blocks:** Divisions 3 (Intelligence uses Memory/Twin/Flow/Policy), 4 (Agents use all of these), 8 (Products compose these)

## 8. Open Questions

- **SutarOS placement:** SUTAR OS is now [Division 12](../12-sutar-os/) — too big to fit here. It has 25 services across 7 layers.
- **Vector DB choice:** Pinecone (managed, fast) vs Qdrant (self-hosted, flexible) vs pgvector (no new infra). Affects Vendor strategy.
- **Reasoning framework:** Should we build our own or adopt LangChain/LlamaIndex? Affects vendor lock-in and time-to-market.
- **FlowOS tech choice:** Temporal (heaviest, most mature) vs Restate (lighter) vs Inngest (TypeScript-native). Affects developer ergonomics.

---

*See also: [services/memory-os/CLAUDE.md](../../../services/memory-os/CLAUDE.md), [services/twinos-hub/CLAUDE.md](../../../services/twinos-hub/CLAUDE.md), [companies/HOJAI-AI-restored/hojai-intelligence/CLAUDE.md](../../HOJAI-AI-restored/hojai-intelligence/CLAUDE.md)*