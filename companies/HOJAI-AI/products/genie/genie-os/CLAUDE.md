# CLAUDE.md - genie-os

> Instructions for AI coding agents (Claude Code, Cursor, etc.) working in this repo.
> Last updated: 2026-06-22

## Project Overview

**Name:** genie-os
**Type:** AI orchestration layer (runtime + web + thin clients)
**Location:** `RTMN/companies/HOJAI-AI/products/genie/genie-os/`
**Owns:** 7 services (3 runtime + 3 thin clients + 1 web)
**Talks to:** External repos (DO, Nexha, Salar) + 23 sibling Genie services in the parent folder + canonical foundation services in `companies/HOJAI-AI/platform/*`

> **Important:** The 7 genie-os foundation services (corpid, twinos, memoryos, goalos, policyos, skillos, flowos) were moved to `_deprecated-foundation/` on 2026-06-21. Their canonical implementations are in `companies/HOJAI-AI/platform/*`. Each `_deprecated-foundation/<svc>/NOTICE.md` explains the move. genie-os no longer starts or owns foundation services.

## Tech Stack

- Node.js 20+
- Express.js
- MongoDB (via Mongoose)
- Vanilla JS (ES modules) — no TypeScript
- Zod for validation
- JWT for auth
- bcrypt for passwords

## Common commands

| Command | Purpose |
|---|---|
| `npm install` | Install dependencies |
| `npm run start:all` | Start all 7 genie-os services (3 runtime + 3 clients + 1 web) |
| `npm run start:runtime` | Start only the 3 runtime services |
| `npm run start:products` | Start only the 3 thin clients |
| `npm run stop:all` | Stop all genie-os services |
| `npm run test` | Run all 6 unit test suites |
| `npm run test:routing` | Run E2E test (web → thin client → external repo). 7 checks. |
| `npm run health` | Check health of all 7 genie-os services |
| `npm run demo` | Run an end-to-end demo flow |
| `npm run seed` | Populate MongoDB with demo data |

## Directory conventions

Every service in this repo follows the same structure:

```
<service-name>/
├── package.json
├── src/
│   └── index.js          ← the service
└── test/
    └── test.js           ← tests for the service
```

When adding a new service:
1. Create the directory with `src/index.js` and `test/test.js`
2. Add the service to `package.json` workspaces (if not already covered by `*`)
3. Add the service to `infrastructure/scripts/start-all.js`
4. Add the service to `infrastructure/scripts/test-all.js`
5. Add the service to `infrastructure/scripts/health-check.js`
6. Document it in `docs/SERVICES.md`
7. **Do NOT add a foundation service here** — those go in `companies/HOJAI-AI/platform/*` and are managed by `companies/HOJAI-AI/start-all.sh`. See `_deprecated-foundation/` for examples of the old (wrong) pattern.

## Environment variables

All env vars are in `.env`. The pattern:
- `<NAME>_PORT` — the port this service listens on
- `<NAME>_URL` — the URL where this service can be reached from others
- `MONGODB_URI` — shared across all services
- `JWT_SECRET` — shared across all services
- `INTERNAL_SERVICE_TOKEN` — used for inter-service auth

When changing ports, update:
1. `.env`
2. `infrastructure/scripts/start-all.js` (uses env vars, usually no change)
3. Any code that hardcodes the old port

## Service pattern

Every service follows this template:

```javascript
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';

const PORT = parseInt(process.env.MYSERVICE_PORT || '7999', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'hojai-internal-service-token-change-me';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));

const send = (res, s, d) => res.status(s).json({ success: true, data: d, meta: { timestamp: new Date().toISOString() } });
const err = (res, s, c, m) => res.status(s).json({ success: false, error: { code: c, message: m }, meta: { timestamp: new Date().toISOString() } });
const reqI = (req, res, next) => {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ success: false });
  next();
};

const MySchema = new mongoose.Schema({...}, { timestamps: true });
const MyModel = mongoose.model('MyModel', MySchema);

app.get('/health', (req, res) => send(res, 200, { service: 'myservice', status: 'healthy' }));

// ... routes here ...

async function start() {
  try { await mongoose.connect(MONGODB_URI); console.log(`[myservice] MongoDB connected`); }
  catch (err) { console.error(`[myservice] MongoDB failed:`, err.message); setTimeout(start, 5000); return; }
  if (process.env.NODE_ENV !== 'test' && !process.env.SUPPRESS_LISTEN) {
    app.listen(PORT, () => console.log(`[myservice] listening on :${PORT}`));
  }
}
start();
export { app };
```

## Test pattern

Every test follows this template:

```javascript
// Set env BEFORE importing app so the URL/PORT are captured correctly
process.env.MY_UPSTREAM_URL = 'http://localhost:19999';
process.env.MYSERVICE_PORT = '18999'; // free test port, NOT the real port
process.env.NODE_ENV = 'test';
const { app } = await import('../src/index.js');
const PORT = 18999;
let server;
async function setup() { await new Promise(r => { server = app.listen(PORT, r); }); }
async function teardown() { if (server) server.close(); }
async function req(m, p, b, h = {}) { const r = await fetch(`http://localhost:${PORT}${p}`, { method: m, headers: { 'content-type': 'application/json', ...h }, body: b ? JSON.stringify(b) : undefined }); return { status: r.status, data: await r.json() }; }
let p = 0, f = 0; const a = (n, c) => { if (c) { p++; console.log(`  ✓ ${n}`); } else { f++; console.log(`  ✗ ${n}`); } };
async function run() {
  await setup();
  console.log('\nMyService tests:');
  // ... tests here ...
  await teardown();
  console.log(`\nMyService: ${p} passed, ${f} failed`); process.exit(f > 0 ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
```

**Critical:** Tests must set a free port and a non-existent upstream URL to avoid EADDRINUSE conflicts with running services.

## Response envelope

All services use the same response shape:

```json
// Success
{ "success": true, "data": {...}, "meta": { "timestamp": "..." } }

// Error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." }, "meta": { "timestamp": "..." } }
```

## Inter-service communication

- **Internal auth:** `x-internal-token` header (from `.env`)
- **Outgoing calls:** use `axios` with timeout, wrapped in a helper
- **Failure mode:** return graceful degradation, don't crash the service

## Database

- Single MongoDB at `MONGODB_URI` (default: `mongodb://localhost:27017/hojai`)
- Each service has its own collections
- Collection names often prefixed by service (e.g., `dosessions`, `nexhasessions`) to avoid collisions
- Mongoose with `{ timestamps: true }` for automatic `createdAt`/`updatedAt`

## Where to find what

| What you want | Where to look |
|---|---|
| Add a new service | `infrastructure/scripts/start-all.js` + `package.json` workspaces |
| Change a port | `.env` + `infrastructure/scripts/start-all.js` |
| Wire genie-os to call another service | `runtime/genie/src/index.js` (look for `tryGenieGateway` and the intent-detection block) |
| Update the web UI | `frontend/web/public/index.html` (single-page app) |
| Add a thin client | `products/<name>-client/` (mirror existing ones) |
| Change how tests run | `infrastructure/scripts/test-all.js` |

## Known gotchas

1. **Port conflicts during tests:** Tests bind to the same port as the running service. Always set a free test port via `process.env.<NAME>_PORT` before importing the app in tests.

2. **EADDRINUSE on first run after a long time:** Run `node infrastructure/scripts/stop-all.js` to clear stale processes, then `start-all.js` again.

3. **The `tryGenieGateway` function in `runtime/genie` references `conv.messages` — make sure you pass the conversation through or set up a local one.**

4. **External repos must be started in their own terminals.** genie-os does NOT start DO, Nexha, or Salar.

5. **The 23 specialized Genie services in the parent folder (`../genie-gateway/`, etc.) are optional.** genie-os works without them but delegates more to genie-gateway when they're up.

## Last verified

- 2026-06-22 (final): **All 27 services healthy.** 6/6 intent delegation checks pass (shopping → genie-shopping-agent, calendar → genie-calendar-service, money → genie-money-os, wellness → genie-wellness-os, goal → goalos, remember → memoryos). 7/7 E2E routing checks pass. **6/6 unit test suites pass.** Web `/api/health` shows 27/27 services responding (4 own services + 23 sibling Genie specialists). Port conflicts resolved (genie-memory-inbox moved 4710→4810, genie-consultant-agent moved 4720→4820). CJS+ESM shared auth now accepts x-internal-token for service-to-service calls. Web super-app and all 3 thin clients use optional auth (public browsing). `npm run start:specialists` added. All fix details in `CHANGELOG.md`.

- 2026-06-22 (earlier): All 7 genie-os services start cleanly, 6/6 unit test suites pass, 7/7 E2E routing checks pass (web → thin client → external repo for DO, Nexha, Salar, Genie). 9 of the 23 sibling Genie specialists respond. 2 port conflicts documented in `CANONICAL-PORT-REGISTRY.md` (genie-consultant-agent↔product-twin on 4720, genie-memory-inbox↔organization-twin on 4710).
