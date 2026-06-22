# Agent Builder (4188)

Visual agent workflow builder backend. Solves Division 04 OPEN: "Agent Builder".

## Concepts

An agent is a directed graph of nodes. Valid node types:
- `input` — entry point (required)
- `output` — exit point (required)
- `llm` — LLM call (model, prompt, tools)
- `tool` — external tool invocation
- `condition` — branching on expression
- `memory` — read/write to memory
- `http` — HTTP request
- `delay` — wait
- `parallel` — fan-out
- `loop` — loop until condition

## Endpoints

- `GET /api/templates` — pre-built templates (simple-qa, rag, tool-use)
- `POST /api/templates/:id/instantiate` — create blueprint from template
- `GET /api/blueprints` / `POST /api/blueprints` / `GET /api/blueprints/:id` — CRUD
- `PUT /api/blueprints/:id` — update + snapshot version
- `POST /api/blueprints/:id/validate` — validate graph
- `POST /api/blueprints/:id/publish` — publish (requires valid graph)
- `GET /api/blueprints/:id/versions` — version history
- `POST /api/blueprints/:id/export` — export to `flow-orchestrator`, `langgraph`, or `json` format

## Run

```bash
npm install
PORT=4188 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```