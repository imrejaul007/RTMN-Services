# HOJAI Workflow Builder API

> **Port:** 4440
> **Version:** 1.0.0
> **Status:** ✅ Built (2026-06-25)

DAG workflow management API for HOJAI Studio.

---

## Quick Start

```bash
cd services/workflow-builder-api
npm install
npm start        # Port 4440
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/workflows` | List workflows |
| `GET` | `/api/v1/workflows/:id` | Get workflow |
| `POST` | `/api/v1/workflows` | Create workflow |
| `PATCH` | `/api/v1/workflows/:id` | Update workflow |
| `DELETE` | `/api/v1/workflows/:id` | Delete workflow |
| `POST` | `/api/v1/workflows/:id/nodes` | Add node |
| `PATCH` | `/api/v1/workflows/:id/nodes/:nodeId` | Update node |
| `DELETE` | `/api/v1/workflows/:id/nodes/:nodeId` | Delete node |
| `POST` | `/api/v1/workflows/:id/edges` | Add edge |
| `DELETE` | `/api/v1/workflows/:id/edges/:from/:to` | Delete edge |
| `POST` | `/api/v1/workflows/:id/validate` | Validate workflow |
| `POST` | `/api/v1/workflows/:id/execute` | Execute workflow |
| `GET` | `/api/v1/executions` | List executions |
| `GET` | `/api/v1/stats` | Statistics |

## Node Types

- `trigger` — Event trigger
- `llm` — LLM call
- `agent` — Agent execution
- `twin` — Digital twin
- `rag` — RAG retrieval
- `code` — Custom code
- `conditional` — Branch logic
- `wait` — Delay/wait
- `output` — Action output
- `transform` — Data transform

## Related

- **AI Studio UI** (:3000) — Web UI
- **Studio Workflow** (:4903) — Backend executor
