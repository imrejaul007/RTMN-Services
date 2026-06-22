# Agent Studio (4189)

Debugger for agent executions. Captures step-by-step traces, supports breakpoints, replay, and inline comments.

## Endpoints

- `GET /health`
- `GET /api/sessions` (filter `?agent_id=&status=`) / `POST /api/sessions` / `GET /api/sessions/:id` / `POST /api/sessions/:id/end`
- `POST /api/sessions/:id/traces` — record a step (input/output/tokens/duration)
- `GET /api/sessions/:id/traces` — list traces + aggregate stats
- `POST /api/sessions/:id/breakpoints` — add breakpoint with condition
- `GET /api/sessions/:id/breakpoints`
- `POST /api/breakpoints/:id/toggle` — hit breakpoint (increments counter)
- `POST /api/sessions/:id/replay` — replay a session (creates new session)
- `GET /api/replays`
- `POST /api/traces/:id/comments` — comment on a step
- `GET /api/traces/:id/comments`

## Run

```bash
npm install
PORT=4189 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```