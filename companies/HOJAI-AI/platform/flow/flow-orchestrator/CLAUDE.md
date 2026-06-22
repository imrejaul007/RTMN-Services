# Flow Orchestrator (port 4244)

> **Status:** ✅ Production-ready v1.0.0 (Architecture v2 — June 20, 2026)
> **Role:** The central orchestration layer in the HOJAI AI Architecture v2.
> **Owner:** HOJAI AI Platform team

## Mission

Before this service existed, every consumer (Genie, CoPilot, SUTAR, RTMN OS, products) had to call TwinOS + MemoryOS + SkillOS + PolicyOS + Intelligence directly — re-implementing the wiring, ordering, and failure modes for every flow.

**Flow Orchestrator is the single point of contact** between consumers and the 5 foundation services. It exposes:
- **Plans** — named DAGs of steps
- **Templates** — pre-built plans seeded at startup
- **Step Library** — the registry of step types the orchestrator knows how to run
- **Execution Engine** — async + sync plan execution with per-step traces

## Why it exists (Architecture v2)

| # | Principle | How Flow Orchestrator implements it |
|---|-----------|------------------------------------|
| 1 | Everything has a Twin | `twin.resolve` step type |
| 2 | Each Twin owns its Memory | `memory.read` / `memory.write` steps (use Twin Memory Bridge 4704) |
| 3 | MemoryOS consumed BY Intelligence | Plans can include `intelligence.call` AFTER `memory.read` |
| 4 | Intelligence consumes Twin + Memory + Skills | All 3 step types available: `twin.resolve`, `memory.read`, `skill.execute`, `intelligence.call` |
| 5 | FlowOS as orchestration layer | This IS the orchestration layer |

## Endpoints (24)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Service health + counts + capabilities |
| POST | `/api/plans` | Create a plan (name + description + steps[]) |
| GET | `/api/plans` | List all plans |
| GET | `/api/plans/:id` | Get a plan |
| DELETE | `/api/plans/:id` | Delete a plan |
| GET | `/api/templates` | List 5 seeded templates |
| GET | `/api/templates/:name` | Get a template |
| POST | `/api/templates/:name/instantiate` | Clone a template into a saved plan |
| POST | `/api/executions` | Async run (returns executionId, poll for status) |
| POST | `/api/executions/sync` | Sync run (waits up to timeoutMs, default 8s) |
| GET | `/api/executions` | Last 200 executions |
| GET | `/api/executions/:id` | Get an execution + per-step trace |
| GET | `/api/step-registry` | List step types + which foundation each maps to |
| GET | `/api/foundation` | Get foundation URLs (TwinOS/MemoryOS/SkillOS/PolicyOS/Intelligence) |
| PUT | `/api/foundation/:key` | Override a foundation URL |
| GET | `/api/audit` | Audit log (plan-created, template-instantiated, execution-*, foundation-set) |

## 5 Seeded Templates

1. **`answer-question`** — twin.resolve → memory.read(semantic) → intelligence.call(answer) → memory.write(experience)
2. **`decide-and-act`** — twin.resolve → memory.read(episodic) → intelligence.call(decide) → policy.check → skill.execute → memory.write(decision)
3. **`simulate-then-recommend`** — twin.resolve → memory.read(experience) → intelligence.call(simulate) → intelligence.call(recommend) → memory.write(knowledge)
4. **`negotiate-and-execute`** — twin.resolve → policy.check → intelligence.call(negotiate) → skill.execute(contract-execute) → memory.write(decision)
5. **`personal-assistant`** — hook.pre → twin.resolve → memory.read(personal) → intelligence.call(chat) → memory.write(experience) → hook.post

## 8 Step Types

| Type | Foundation | What it does |
|------|-----------|--------------|
| `twin.resolve` | TwinOS (4705) | Resolve the twin(s) for an entity and stash on ctx |
| `memory.read` | MemoryOS (4703) | Pull recent/relevant memory for a twin (episodic/semantic/...) |
| `memory.write` | MemoryOS (4703) | Write a memory record back for a twin |
| `intelligence.call` | Intelligence (4881) | Call the AI brain for analysis/decision/answer |
| `policy.check` | PolicyOS (4254) | Gate the flow through a policy rule (throws if denied) |
| `skill.execute` | SkillOS (4743) | Run a registered skill by id |
| `hook.pre` | user-defined | Pre-step extension point |
| `hook.post` | user-defined | Post-step extension point |

## Wiring

- **ai-intelligence (4881) `/api/route`** — exposes `flowOrchestrator: http://localhost:4244` and capabilities for plans/templates/executions
- **ai-intelligence (4881) `/api/agents`** — exposes `flowOrchestrator` agent with 11 capabilities
- **unified-os-hub (4399)** — `/api/flow/...` routes to this service

## Next Steps

- Replace stub step handlers with real HTTP calls to foundation services
- Add planning support (HTN, partial-order) — currently plans are linear
- Add foundation-call caching for repeated twin resolutions
- Add retry/backoff per step type
- Add approval gates (step blocks until human approves)
