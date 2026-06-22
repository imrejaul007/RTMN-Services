# Plugin Framework (4780)

3rd-party plugin runtime with lifecycle management, sandboxed code execution, hook-based extension points, and reviews.

## Endpoints

- `GET /health` — health check
- `GET /api/plugins` — list plugins
- `POST /api/plugins` — register plugin (validates hook points against allowlist)
- `GET /api/plugins/:id` — plugin details
- `POST /api/plugins/:id/activate` — activate
- `POST /api/plugins/:id/deactivate` — deactivate
- `DELETE /api/plugins/:id` — uninstall (cascades hooks)
- `GET /api/plugins/:id/hooks` — list plugin's registered hooks
- `GET /api/plugins/:id/reviews` — list reviews + avg rating
- `POST /api/hooks/fire` — fire a hook, runs all active plugin handlers
- `GET /api/hooks/by-point/:point` — list hooks for an extension point
- `POST /api/plugins/:id/run-sandboxed` — run arbitrary plugin code in JS sandbox
- `POST /api/reviews` — submit a review

## Allowed Hook Points

`pre-request`, `post-request`, `pre-llm-call`, `post-llm-call`, `on-user-create`, `on-order-create`, `on-payment-success`, `transform-response`, `enrich-context`, `ui-widget`, `dashboard-panel`

## Sandbox

Lightweight JS sandbox via `new Function()`. No global access (console stubbed), 500ms default timeout. Code size capped at 50KB.

## Run

```bash
npm install
PORT=4780 npm start
```

## Test

```bash
./tests/smoke.sh
./tests/e2e.sh
```