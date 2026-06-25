# `@hojai/foundation` SDK v2 — Rebuild SPEC

> **Status:** Implementation in progress
> **Goal:** Rebuild the SDK bottom-up against the 6 real backend services

---

## Architecture

### Target Backends

| Module | Service | Hub route | Port | Match? |
|--------|---------|-----------|------|--------|
| corp-id | CorpID | `/api/identity/*` | 4702 | NEW route needed |
| memory | MemoryOS | `/api/memory/*` | 4703 | NEW route needed |
| twin | TwinOS Hub | `/api/twins/*` | 4705 | NEW route needed |
| trust | SADA OS | `/api/foundation/sada-os/*` | 4190 | ✅ exists |
| flow | flow-orchestrator | `/api/foundation/flow-orchestrator/*` | 4244 | ✅ exists |
| policy | PolicyOS | `/api/foundation/policy-os/*` | 4254 | ✅ exists |

### SDK URL Strategy

Single `baseUrl: http://localhost:4399` (RTMN Hub). The SDK rewrites each module's path:

```typescript
// SDK paths (what developers call)
corp-id → /api/identity/*       → Hub proxies to http://localhost:4702/*
memory   → /api/memory/*        → Hub proxies to http://localhost:4703/*
twin     → /api/twins/*         → Hub proxies to http://localhost:4705/*
trust    → /api/foundation/sada-os/*   → Hub proxies to http://localhost:4190/*
flow     → /api/foundation/flow-orchestrator/* → Hub proxies to http://localhost:4244/*
policy   → /api/foundation/policy-os/* → Hub proxies to http://localhost:4254/*
```

### Auth Model

The SDK owns JWT lifecycle:

1. Caller provides `{ email, password }` → `hojai.login(email, password)`
2. SDK calls `POST /api/identity/auth/login`, stores `{ accessToken, refreshToken }`
3. All subsequent requests send `Authorization: Bearer <accessToken>`
4. On 401 → SDK auto-refreshes using `POST /api/identity/auth/refresh`
5. If refresh fails → throws `HojaiAuthError`

### Schema Conventions

Each module accepts developer-friendly schemas and transforms to backend schema internally:

| Module | SDK schema | Backend schema | Transform? |
|--------|-----------|---------------|-----------|
| corp-id.create | `{type, metadata}` | `{email, password, name}` | ✅ (synthetic) |
| corp-id.get | `{id}` | `GET /api/users/:id` | ✅ |
| memory.write | `{type, scope, content, confidence}` | `{twinId, type, content, tags, importance, visibility}` | ✅ |
| twin.create | `{type, name, attributes}` | `{id, name, service, type, category}` | ✅ |
| trust | `{entityId}` | `/trust/:entityId` | ✅ |
| flow | `{name, steps}` | `{name, steps}` (match) | no |
| policy | `{name, conditions, rules}` | `{name, conditions, rules}` (match) | no |

### Error Handling

All 6 backends return `{ success: false, error: { code, message } }`. The SDK unwraps this:
- `success: true` → return the `data`/`twin`/`policy` field
- `success: false` → throw `HojaiApiError` with `code`, `message`, `statusCode`

---

## Module Endpoints

### corp-id (→ CorpID service 4702)

| Method | SDK call | Transforms to | Backend path |
|--------|----------|--------------|--------------|
| POST | `corpId.create({type, metadata})` | `{email, password, name}` | `POST /auth/register` |
| GET | `corpId.get(id)` | — | `GET /api/users/:id` |
| GET | `corpId.list(params?)` | query params | `GET /api/users` |
| PUT | `corpId.update(id, data)` | — | `PUT /api/users/:id` |
| GET | `corpId.me()` | — | `GET /api/profile` |
| PUT | `corpId.updateProfile(data)` | — | `PUT /api/profile` |

### memory (→ MemoryOS 4703)

| Method | SDK call | Backend path |
|--------|----------|--------------|
| POST | `memory.write({type, scope, content, confidence, ttlSeconds})` | `POST /api/memories` |
| GET | `memory.get(id)` | `GET /api/memories/:id` |
| POST | `memory.search({query, filters})` | `POST /api/memories/search` |
| PATCH | `memory.update(id, partial)` | `PATCH /api/memories/:id` |
| DELETE | `memory.delete(id)` | `DELETE /api/memories/:id` |

### twin (→ TwinOS Hub 4705)

| Method | SDK call | Backend path |
|--------|----------|--------------|
| POST | `twin.create({type, name, attributes})` | `POST /api/twins` |
| GET | `twin.get(id)` | `GET /api/twins/:id` |
| PUT | `twin.update(id, state)` | `PUT /api/twins/:id/state` |
| GET | `twin.history(id)` | `GET /api/sync/history` |
| POST | `twin.link(sourceId, targetId, type)` | `POST /api/relationships` |
| DELETE | `twin.delete(id)` | `DELETE /api/twins/:id` |

### trust (→ SADA OS 4190)

| Method | SDK call | Backend path |
|--------|----------|--------------|
| GET | `trust.getScore(entityId)` | `GET /trust/:entityId` |
| POST | `trust.verify(entityId, evidence)` | `POST /verification` |
| GET | `trust.history(entityId)` | `GET /trust/:entityId/activity` |

### flow (→ flow-orchestrator 4244)

| Method | SDK call | Backend path |
|--------|----------|--------------|
| POST | `flow.create({name, steps})` | `POST /api/plans` |
| GET | `flow.get(id)` | `GET /api/plans/:id` |
| GET | `flow.list()` | `GET /api/plans` |
| POST | `flow.run(id, inputs)` | `POST /api/executions` |
| GET | `flow.getRun(runId)` | `GET /api/executions/:runId` |

### policy (→ PolicyOS 4254)

| Method | SDK call | Backend path |
|--------|----------|--------------|
| POST | `policy.create({name, conditions, rules})` | `POST /api/policies` |
| GET | `policy.get(id)` | `GET /api/policies/:id` |
| GET | `policy.list()` | `GET /api/policies` |
| POST | `policy.evaluate({action, context, corpId})` | `POST /api/policies/evaluate` |

---

## Package.json Changes

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    },
    "./corp-id": { "types": "./dist/corp-id.d.ts", "import": "./dist/corp-id.js", "require": "./dist/corp-id.cjs" },
    "./memory":  { "types": "./dist/memory.d.ts",  "import": "./dist/memory.js",  "require": "./dist/memory.cjs"  },
    "./twin":    { "types": "./dist/twin.d.ts",    "import": "./dist/twin.js",    "require": "./dist/twin.cjs"    },
    "./trust":   { "types": "./dist/trust.d.ts",   "import": "./dist/trust.js",   "require": "./dist/trust.cjs"   },
    "./flow":    { "types": "./dist/flow.d.ts",    "import": "./dist/flow.js",    "require": "./dist/flow.cjs"    },
    "./policy":  { "types": "./dist/policy.d.ts",  "import": "./dist/policy.js",  "require": "./dist/policy.cjs"  }
  }
}
```

- Add `"type": "module"` — enables ESM
- Generate both `.js` (CJS fallback via `--module commonjs`) and `.mjs` (ESM via `--module esnext`) outputs, OR use a bundler (tsup/esbuild) for dual-output
- Remove broken `./client` export
- `tsconfig` keep `"module": "ES2022"` for ESM output; separate `tsconfig.cjs.json` for CJS

---

## Tests

9 tests (Node `--test` runner, fetch mocks):

1. `hojai.login()` calls `/api/identity/auth/login`, stores token
2. `hojai.corpId.create()` sends POST to correct Hub path
3. `hojai.corpId.get()` sends GET with token
4. `hojai.memory.write()` sends POST with correct body schema
5. `hojai.memory.search()` sends POST to `/api/memory/search`
6. `hojai.twin.create()` sends POST with `{type, name, attributes}`
7. `hojai.twin.get()` sends GET, unwraps `{success: true, twin}`
8. `hojai.trust.getScore()` sends GET to `/api/foundation/sada-os/trust/:id`
9. `hojai.policy.evaluate()` sends POST, returns raw object (no envelope)

Plus 3 error tests:
10. `401 → throws HojaiAuthError`
11. `500 → retries then throws HojaiApiError`
12. `{success: false, error} → throws HojaiApiError`

---

## Hub Route Additions Needed

Three routes need to be added to `REZ-ecosystem-connector/src/index.ts`:

```typescript
const FOUNDATION_SERVICES = {
  // ... existing ...
  'corp-id':  process.env.CORP_ID_URL  || 'http://localhost:4702',
  'memory-os': process.env.MEMORY_OS_URL || 'http://localhost:4703',
  'twinos-hub': process.env.TWIN_OS_URL || 'http://localhost:4705',
};

app.use('/api/identity',  (req, res) => proxyToUpstream(req, res, FOUNDATION_SERVICES['corp-id']  + req.originalUrl, 'CorpID'));
app.use('/api/memory',   (req, res) => proxyToUpstream(req, res, FOUNDATION_SERVICES['memory-os'] + req.originalUrl, 'MemoryOS'));
app.use('/api/twins',     (req, res) => proxyToUpstream(req, res, FOUNDATION_SERVICES['twinos-hub'] + req.originalUrl, 'TwinOS'));
```

This makes the Hub the single entry point for all 6 services.

---

## File Map

```
sdk/hojai-foundation/
├── SPEC.md                          ← this file
├── src/
│   ├── index.ts                    ← Hojai orchestrator + login()
│   ├── config.ts                   ← HojaiConfig, DEFAULT_CONFIG
│   ├── utils.ts                    ← request(), error classes, sleep, backoff
│   ├── corp-id.ts                  ← CorpIDClient (6 methods)
│   ├── memory.ts                   ← MemoryClient (6 methods)
│   ├── twin.ts                     ← TwinClient (6 methods)
│   ├── trust.ts                    ← TrustClient (3 methods)
│   ├── flow.ts                     ← FlowClient (5 methods)
│   ├── policy.ts                   ← PolicyClient (4 methods)
│   └── __tests__/
│       └── index.test.ts           ← 12 tests with fetch mocks
├── tsconfig.json                   ← ESM output
├── tsconfig.cjs.json               ← CJS output
└── package.json                   ← type:module, dual exports
```
