# Agent Orchestration Service

**Port:** 4851
**Layer:** Agents (Phase 3)
**Version:** 1.0.0

Coordinates multiple AI agents to complete complex multi-step tasks.
Provides 6 orchestration patterns: sequential, parallel, pipeline,
fan-out, fan-in, and conditional.

## Why This Service

`agent-teaming` is about **persistent teams** that own a long-running
mission. `agent-orchestration` is about **one-shot workflows** that
chain multiple agent calls together.

Use `agent-orchestration` when:
- You have a stateless workflow ("translate this, then summarize")
- You want to fan-out work across N agents in parallel and aggregate
- You need conditional branching on a previous step's result

Use `agent-teaming` when:
- The work spans hours/days
- Members persist across multiple invocations
- You need leader election + failure recovery

## Orchestration Patterns

| Pattern | Behavior |
|---------|----------|
| `sequential` | Tasks run one after another |
| `parallel` | All tasks run simultaneously |
| `pipeline` | Output of each task feeds the next |
| `fan-out` | One task triggers many |
| `fan-in` | Many tasks aggregate to one |
| `conditional` | Branch based on intermediate results |

## API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/orchestrations` | Create a new orchestration (auth required) |
| `GET` | `/api/orchestrations/:id` | Get orchestration status |
| `GET` | `/api/orchestrations` | List all orchestrations |
| `POST` | `/api/orchestrations/:id/start` | Start a pending orchestration |
| `POST` | `/api/orchestrations/:id/cancel` | Cancel a running orchestration |
| `GET` | `/api/task-graphs/:id` | Get the task graph definition |

## Quick Start

```bash
curl -X POST http://localhost:4851/api/orchestrations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Translate then summarize",
    "pattern": "pipeline",
    "tasks": [
      { "id": "translate", "agentRole": "translator", "input": { "text": "..." } },
      { "id": "summarize", "agentRole": "summarizer", "input": "{{ translate.output }}", "dependsOn": ["translate"] }
    ]
  }'
```

## See Also

- [agent-teaming](../agent-teaming/CLAUDE.md) — sister service for persistent teams
- [acn-network](../acn-network/CLAUDE.md) — agent registry used for delegation