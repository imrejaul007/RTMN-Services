# AI Studio — Visual Workflow Builder Backend

> Phase 38 of the HOJAI AI 40-phase plan.
> Workflow DAG editor, execution engine, 10+ node types.

## Quick Start

```bash
cd platform/studio/ai-studio
npm install
npm start        # Port 4890
npm test         # vitest
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/workflows` | Create workflow |
| GET | `/api/workflows` | List workflows |
| GET | `/api/workflows/:id` | Get workflow |
| PUT | `/api/workflows/:id` | Update workflow |
| DELETE | `/api/workflows/:id` | Delete workflow |
| POST | `/api/workflows/:id/versions` | Save version snapshot |
| POST | `/api/workflows/:id/execute` | Execute workflow |
| GET | `/api/executions/:id` | Get execution status |
| POST | `/api/validate` | Validate workflow |
| GET | `/api/workflows/:id/history` | Execution history |
| GET | `/api/workflows/:id/export` | Export (format=json\|code\|yaml) |

## Node Types

| Type | Required Fields | Description |
|------|----------------|-------------|
| `trigger` | `event` | Entry point (manual/scheduled/webhook/condition_met) |
| `llm-call` | `model`, `prompt` | LLM invocation (mock in this build) |
| `tool` | `toolName` | Tool execution |
| `condition` | `expression` | Branching (JS expression) |
| `loop` | `maxIterations` | Iteration |
| `transform` | `inputVar`, `transformFn` | Data transformation |
| `memory` | `operation` | Memory OS operations |
| `twin` | `twinType`, `operation` | Digital twin operations |
| `api-call` | `method`, `url` | HTTP API call |
| `output` | `format` | Output (json/text/redirect) |

## Workflow Definition

```json
{
  "name": "Order Processing",
  "nodes": [
    { "id": "n1", "type": "trigger", "data": { "event": "manual" } },
    { "id": "n2", "type": "llm-call", "data": { "model": "claude-3-5-sonnet", "prompt": "Summarize this order" } },
    { "id": "n3", "type": "output", "data": { "format": "json" } }
  ],
  "edges": [
    { "source": "n1", "target": "n2" },
    { "source": "n2", "target": "n3" }
  ]
}
```

## Architecture

- **Validator**: DFS cycle detection, node type validation, required field checks
- **Executor**: Topological sort for execution order, mock node handlers
- **Storage**: File-based JSON (workflows.json, workflow_versions.json, executions.json)
- **Export**: JSON, JavaScript SDK code, YAML formats

## Env vars

- `PORT` — server port (default 4890)
