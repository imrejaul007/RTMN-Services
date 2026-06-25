# HOJAI Cloud

> **Port:** 4380
> **Purpose:** Receives `npx hojai deploy` calls from any HOJAI Foundry project, provisions a per-tenant runtime on a free port, and returns the public URL. Backs the `*.hojai.app` wildcard via a reverse-proxy route.

This is the v1.1 deploy target for HOJAI Foundry. v1.0's deploy was a stub that just printed the target URL — v1.1 actually provisions a runtime.

---

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/deploy` | Bearer | Push a project; get back URL + IDs |
| `GET` | `/api/v1/deployments` | Bearer | List all deployments |
| `GET` | `/api/v1/deployments/:id` | Bearer | Fetch one deployment |
| `DELETE` | `/api/v1/deployments/:id` | Bearer | Tear down a deployment |
| `GET` | `/api/v1/health` | none | Service health + counts |
| `GET` | `/api/v1/ready` | none | Readiness |
| `GET` | `/` | none | Service info + endpoint list |
| `ALL` | `/api/v1/route/:subdomain/*` | none | Reverse-proxy route (for nginx/Caddy → hojai-cloud) |

---

## Architecture

```
npx hojai deploy --mode=remote
    │
    │  POST { name, type, manifest, runtime, files }
    │       Authorization: Bearer $HOJAI_API_KEY
    ↓
hojai-cloud (:4380)
    │
    ├─ 1. validate body (name, manifest)
    ├─ 2. find existing deployment w/ same name (re-deploy reuse)
    ├─ 3. allocate per-tenant port from HOJAI_CLOUD_PORT_RANGE
    ├─ 4. persist project files to STORAGE_DIR/<projectId>/
    ├─ 5. spawn `node apps/backend/src/index.js` with PORT=<port>
    │       detached, stdio piped, child.unref()
    ├─ 6. wait up to 10s for the backend to bind
    └─ 7. return 201 { projectId, deploymentId, url, status, port }
                  │
                  ↓
       https://<name>.hojai.app  (via reverse proxy → /api/v1/route/<name>/*)
```

---

## Request / Response Shapes

### `POST /api/v1/deploy`

Request body:
```json
{
  "name": "my-app",
  "type": "marketplace",
  "manifest": { "name": "my-app", "type": "marketplace", "template": "marketplace" },
  "runtime": "node-express",
  "files": {
    "apps/backend/src/index.js": "...",
    "apps/backend/package.json": "...",
    "apps/frontend/public/index.html": "..."
  }
}
```

Success response (`201 Created`):
```json
{
  "projectId": "0d2c0e7c-...",
  "deploymentId": "9f1b2a44-...",
  "url": "https://my-app.hojai.app",
  "status": "live",
  "port": 8801
}
```

Error responses:
- `400` — `name is required` / `manifest is required` / `no files provided and no prior deployment for this name`
- `401` — `missing bearer token` (when auth enabled)
- `403` — `invalid api key` (when auth enabled)
- `500` — backend failed to spawn (with error in body)
- `502` — backend did not bind within 10s (`status: "unhealthy"`)
- `503` — `no free ports in range` (with `range: [start, end]`)

---

## Configuration

All config is via environment variables. Defaults shown in **bold**.

| Env | Default | Purpose |
|---|---|---|
| `HOJAI_CLOUD_PORT` | **4380** | Port the service listens on |
| `HOJAI_PUBLIC_HOST` | **hojai.app** | Public hostname (used in returned URLs) |
| `HOJAI_PUBLIC_SCHEME` | **https** | URL scheme |
| `HOJAI_CLOUD_STORAGE` | **`<package>/.storage`** | Where project files + `deploy.json` live on disk |
| `HOJAI_CLOUD_PORT_RANGE_START` | **8800** | First port in the per-tenant port pool |
| `HOJAI_CLOUD_PORT_RANGE_END` | **8899** | Last port in the pool (inclusive) |
| `HOJAI_API_KEY` | **dev-key** | Bearer token callers must present |
| `HOJAI_CLOUD_REQUIRE_AUTH` | **true** | Set to `false` to disable auth (dev only) |

Per-call timeouts (set by the caller, not the service):
- `HOJAI_DEPLOY_TIMEOUT_MS` (default `60000`) — fetch timeout on the foundry side
- `HOJAI_DEPLOY_MAX_FILES` (default `500`) — cap on files shipped
- `HOJAI_DEPLOY_MAX_FILE_BYTES` (default `262144` = 256 KiB) — cap on each file's size

---

## Lifecycle

1. **Deploy** — files are written to `STORAGE_DIR/<projectId>/`, `deploy.json` is the registry record, backend is spawned.
2. **Re-deploy** (same `name`) — existing `projectId` and `port` are reused; previous child is `SIGTERM`'d before the new one starts.
3. **Restart** — `loadFromDisk()` reads every `STORAGE_DIR/*/deploy.json` and rehydrates the in-memory `deployments` Map. **Note:** the spawned backends are NOT auto-respawned — only the registry is restored. A future v1.2 should re-spawn on boot.
4. **Delete** — backend is `SIGTERM`'d, the registry entry is removed. Project files are left in place (faster re-deploys).

---

## Subdomain Routing (Production)

In production, the recommended setup is:

```
*.hojai.app  →  nginx / Caddy / Cloudflare
                │
                │  Host: <sub>.hojai.app
                ↓
              hojai-cloud (:4380)  /api/v1/route/<sub>/*
                │
                │  proxy to 127.0.0.1:<port>
                ↓
              tenant backend
```

This service exposes a wildcard Express route `app.all(/^\/api\/v1\/route\/([^/]+)\/(.*)$/, proxyToTenant)` that does the per-subdomain lookup and upstream HTTP proxy. For local dev, callers can hit the backend directly on its assigned port (`http://localhost:8801/...`).

---

## Files

```
hojai-cloud/
├── package.json
├── CLAUDE.md                       # this file
├── src/
│   ├── index.js                    # main service (~390 LOC)
│   └── __tests__/
│       └── hojai-cloud.test.js     # 16 tests
└── .storage/                       # per-project deploy.json + files (gitignored)
```

---

## Tests

```bash
npm test    # 16 tests, all pass
```

Tested:
- health / ready / root endpoints
- deploy validation (missing name, missing manifest, no files)
- deploy happy path (real backend spawn, health check via fetch)
- re-deploy (same name → reuses `projectId` + `port`, new `deploymentId`)
- list / get / delete deployments
- 404s for unknown IDs
- bearer auth (401 missing, 403 wrong, next() on right key) — exercised via direct call to exported `requireAuth` with a re-required module under `HOJAI_CLOUD_REQUIRE_AUTH=true`
- `findFreePort()` helper (distinct ports, exhaustion)
- `safeSubdomain()` helper (slugify rules)

---

## Calling It From Foundry

```bash
# From inside any foundry project:
export HOJAI_CLOUD_URL=https://cloud.hojai.app
export HOJAI_API_KEY=…
npx hojai deploy --mode=remote --yes
# → 201 live at https://<name>.hojai.app
```

If `HOJAI_CLOUD_URL` is **not** set, the deploy falls back to the v1.0 stub (prints target URL + a hint about the env var). This keeps existing v1.0 workflows unbroken.
