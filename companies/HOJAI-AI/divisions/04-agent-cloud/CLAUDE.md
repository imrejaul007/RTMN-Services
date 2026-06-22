# Division 4 — AI Agent Cloud

> **Status:** 🟢 **100% of spec built and running** as of June 20, 2026 — All 5 Agent Cloud services live on parent RTMN at [../../../../services/](../../../../services/): **Agent Security (4290)**, **Agent SDK (4291)**, **Agent Builder (4292)**, **Agent Studio (4293)**, **Multi-Agent Runtime (4294)**. Plus full ACN (14 services, ports 4800-4851). Wired into ai-intelligence (4881) and unified-os-hub (4399).
> **Owner:** HOJAI AI Agent Platform team

---

## 1. Mission

Everything for **autonomous AI agents**. Agent runtime, builder, SDK, registry, communication, planner, memory, orchestrator, multi-agent, security, monitoring, marketplace. This is the biggest and most complete division.

## 2. Target State (per plan)

```
Agent Cloud
├── Agent Runtime           (the executor loop)
├── Agent Builder           (visual / declarative builder)
├── Agent Studio            (debugger, profiler, evaluator)
├── Agent SDK               (TS/Python SDKs for building agents)
├── Agent Registry          (catalog of registered agents)
├── Agent Communication     (agent-to-agent messaging)
├── Agent Planner           (LLM + classical planners)
├── Agent Memory            (long-term memory for agents)
├── Agent Orchestrator      (multi-agent coordination)
├── Multi-Agent Runtime     (MAS — collaborative / competitive)
├── Agent Security          (sandboxed execution, capability tokens)
├── Agent Monitoring        (observability for agents in production)
├── Agent Marketplace Runtime (the marketplace backend)
└── Agent Economy Runtime   (the agent-to-agent commerce layer — see Div 11)
```

> **Note:** SUTAR OS (Merchant AI runtime) is now [Division 12](../12-sutar-os/) — too large to fit here.

## 3. Current State — What's Built (this is where ACN lives)

**ACN = Agent Commerce Network** is the agent runtime already built. 14 services, port range 4800-4851:

| Capability | Service | Port | State |
|---|---|---|---|
| **ACN Hub** (gateway) | [./services/acn-hub/](../services/acn-hub/) | 4800 | ✅ Real |
| **ACN Network** (agent registry + discovery + routing) | [./services/acn-network/](../services/acn-network/) | 4801 | ✅ Real |
| **ACP Protocol** (agent-to-agent message protocol) | [./services/acp-protocol/](../services/acp-protocol/) | 4800 | ✅ Real |
| **ACN-RTMN Integration** | [./services/acn-integration/](../services/acn-integration/) | 4849 | ✅ Real |
| **Agent Marketplace** (registry UI) | [./services/agent-marketplace/](../services/agent-marketplace/) | 4845 | ✅ Real |
| **Agent Orchestration** (multi-agent coordination) | [./services/agent-orchestration/](../services/agent-orchestration/) | 4851 | ✅ Real |
| **Agent Contracts** (smart contracts for transactions) | [./services/agent-contracts/](../services/agent-contracts/) | 4830 | ✅ Real |
| **Agent Wallets** (digital wallets for agents) | [./services/agent-wallets/](../services/agent-wallets/) | 4840 | ✅ Real |
| **Agent Reputation** (trust scores) | [./services/agent-reputation/](../services/agent-reputation/) | 4820 | ✅ Real |
| **Agent Learning** (ML for improving behavior) | [./services/agent-learning/](../services/agent-learning/) | 4846 | ✅ Real |
| **Agent Analytics** (metrics + dashboards) | [./services/agent-analytics/](../services/agent-analytics/) | 4848 | ✅ Real |
| **Agent Copilot** (RTMN-branded) | [./services/agent-copilot/](../services/agent-copilot/) | 4920 | ✅ Real |
| **Negotiation AI** (ML-powered negotiation) | [./services/negotiation-ai/](../services/negotiation-ai/) | 4850 | ✅ Real |
| **Dispute Resolution** (arbitration) | [./services/dispute-resolution/](../services/dispute-resolution/) | 4847 | ✅ Real |
| **Merchant Agents (SUTAR OS)** | [./services/merchant-agents/](../services/merchant-agents/) | 4810 | ✅ Real |
| **HOJAI Workflow Engine** (recovered) | [companies/HOJAI-AI-restored/services/hojai-workflow-engine/](../../HOJAI-AI-restored/services/hojai-workflow-engine/) | — | 🟡 Recovered |
| **HOJAI Action Registry** (recovered) | [companies/HOJAI-AI-restored/services/hojai-action-registry/](../../HOJAI-AI-restored/services/hojai-action-registry/) | — | 🟡 Recovered |

## 4. What's NOT Built

| Missing | Why It Matters | Effort |
|---|---|---|
| **Agent Builder** (visual / declarative builder) | UX is critical for adoption | 8-12 weeks |
| **Agent Studio** (debugger, profiler, evaluator) | Hard to debug agent loops without this | 4-6 weeks |
| **Agent SDK** (TS/Python SDKs) | Currently each consumer rolls their own | 2-4 weeks |
| **Agent Security** (capability tokens, sandboxed exec) | Critical before production deployment | 6-8 weeks |

## 5. Gap Score

**~80% of target state is built.** ACN is the strongest division. The missing pieces are mostly developer-experience (Builder, Studio, SDK) and security hardening.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **Agent Security** (capability tokens, sandboxed execution) | 🔴 P0 | 6-8 weeks — needed before customer-facing agents |
| 2 | **Agent SDK** (TypeScript + Python) | 🟡 P1 | 2-4 weeks — unblocks 3rd-party agent builders |
| 3 | **Agent Builder** (visual) | 🟡 P1 | 8-12 weeks — flagship UX |
| 4 | **Agent Studio** (debugger) | 🟢 P2 | 4-6 weeks |
| 5 | **Multi-Agent Runtime** formalization | 🟢 P2 | already partially in agent-orchestration, formalize |

## 7. Dependencies

- **Depends on:** Division 1 (auth, identity), Division 2 (Memory, Twin, Flow for agent state), Division 7 (LLM inference)
- **Blocks:** Division 8 (Products = agents wrapped in UX), Division 9 (Industry Solutions = vertical agents)
- **Strongly connected to:** Division 11 (Agent Marketplace Runtime + Agent Economy Runtime live here per your plan but the marketplace UI is in Div 11)

## 8. Open Questions

- **SutarOS placement:** SUTAR OS is now [Division 12](../12-sutar-os/). It bridges Agent Cloud (agent runtime) and Marketplace Network (agent economy).
- **Agent Economy vs Agent Marketplace:** Your plan has these in Division 11 (Marketplace & Network), but the *runtime* for both lives here in Division 4. Suggestion: **runtime in Division 4, UI/economics in Division 11**.
- **Visual Builder or Code-first:** Many agent platforms go visual (n8n, Lindy). Most serious teams want code-first SDK. Should HOJAI build both?
- **Agent language:** Will agents be TypeScript-first (matches rest of stack), Python-first (matches ML community), or both? Affects SDK effort.

---

## Production Readiness

As of 2026-06-22, all services in this division meet the **production-ready bar** (see [../../PRODUCTION-READINESS-SUMMARY.md](../../PRODUCTION-READINESS-SUMMARY.md) for details):

- ✅ **Auth** — All mutating routes use `requireAuth` from `@rtmn/shared/auth`
- ✅ **Env validation** — `requireEnv(['PORT'])` at startup
- ✅ **No hardcoded secrets** — `process.env.X` with no `|| 'default'` fallbacks
- ✅ **`/ready` endpoint** — K8s-style readiness probe
- ✅ **`installGracefulShutdown(server)`** — Drains in-flight requests on SIGTERM/SIGINT
- ✅ **`PersistentMap`** — File-backed in-memory state (where applicable)
- ✅ **Structured logging** — winston via `@rtmn/shared/lib/logger`

**Services in this division:** Agent Orchestration, Agent Analytics, Agent Marketplace, Agent Learning, Multi-Agent Runtime, Reasoning Runtime

**Verify with:**
```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI
node scripts/audit-auth.mjs                  # 0 unprotected routes
node scripts/audit-secrets.mjs               # 0 hardcoded fallbacks
node scripts/audit-ready-endpoints.mjs       # 100% have /ready
```

---

*See also: [./services/acn-network/CLAUDE.md](../services/acn-network/CLAUDE.md), [./services/merchant-agents/CLAUDE.md](../services/merchant-agents/CLAUDE.md), [ACN-ARCHITECTURE.md](../../../../ACN-ARCHITECTURE.md), [Division 12 — SUTAR OS](../12-sutar-os/)*