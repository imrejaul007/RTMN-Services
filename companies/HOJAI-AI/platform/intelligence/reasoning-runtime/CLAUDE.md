# Reasoning Runtime (port 4253)

> **Status:** ✅ Production-ready v1.0.0 (Architecture v2 — June 20, 2026)
> **Role:** Reasoning framework with auditable traces.
> **Owner:** HOJAI AI Platform team

## Mission

ReAct and Chain-of-Thought logic was scattered across agents. **Reasoning Runtime makes the step-by-step reasoning a first-class auditable record** so consumers can show how a decision was derived.

## 3 Strategies

| Strategy | How it works | Use case |
|----------|--------------|----------|
| **chain-of-thought** | Linear thought chain with a conclusion at the end | Simple reasoning, step-by-step derivation |
| **react** | Think → Act → Observe loop, configurable max rounds | Multi-step problem solving with action effects |
| **tree-of-thought** | Generate N candidate branches, score each, pick winner | Decisions with multiple viable paths |

## Endpoints (8)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Service health + counts + strategies |
| GET | `/api/templates` | List 3 seeded templates (cot-default, react-default, tot-default) |
| GET | `/api/templates/:name` | Get a template |
| POST | `/api/traces` | Run a reasoning trace |
| GET | `/api/traces` | Last 200 traces |
| GET | `/api/traces/:id` | Get a trace + per-step record |
| GET | `/api/audit` | Audit log |

## Request Format

```json
POST /api/traces
{
  "strategy": "react",                       // chain-of-thought | react | tree-of-thought
  "question": "Should we offer Jane a discount?",
  "context": { "customer": "Jane", "lifetime_value": 1200 },
  "maxRounds": 6,                            // for react, default 6
  "branches": 3                              // for tree-of-thought, default 3
}
```

## Response Format (excerpt)

```json
{
  "id": "uuid",
  "strategy": "react",
  "question": "Should we offer Jane a discount?",
  "status": "completed",
  "steps": [
    { "id": "uuid", "kind": "input", "at": "...", "question": "..." },
    { "id": "uuid", "kind": "thought", "round": 0, "content": "..." },
    { "id": "uuid", "kind": "action", "round": 0, "name": "lookup" },
    { "id": "uuid", "kind": "observation", "round": 0, "content": "..." }
  ],
  "conclusion": "Final answer..."
}
```

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `reasoningRuntime: http://localhost:4253`
- **ai-intelligence (4881) `/api/agents`** — exposes `reasoningRuntime` agent
- **unified-os-hub (4399)** — `/api/reasoning/...` routes to this service

## Used By

- Flow Orchestrator plans that need auditable reasoning
- Agents via acn-orchestration (4851) for complex decisions
- AI Intelligence (4881) for explainable outputs

## Next Steps

- Add real LLM calls via inference-gateway (4770) — currently uses structured step scaffolds
- Add tool registry (calculator, web search, knowledge base) for ReAct
- Add score functions beyond the toy `scoreBranch` heuristic
- Add reflection (ReAct loops that re-examine their own conclusions)
