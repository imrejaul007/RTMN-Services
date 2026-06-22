# HOJAI AI Shared Library Migration Guide

> **Date:** 2026-06-22 (Phase 7: added `createCorpIdAuthMiddleware`)
> **Audience:** Anyone upgrading an HOJAI AI service to use `@rtmn/shared` for persistence, auth, logging, and errors.

## What's in `@rtmn/shared`

The shared library at `companies/HOJAI-AI/shared/` provides:

| Module | What it does | When to use |
|---|---|---|
| `lib/persistent-store.js` | File-backed JSON storage (Mongoose-like API) | **Always** — replaces in-memory `Map` |
| `lib/database.js` | MongoDB connection (with in-memory fallback) | Optional — for high-throughput services |
| `lib/persistent-map.js` | `Map`-like API with write-through persistence | **Always** for stateful services |
| `auth/index.js` (or `auth/index.cjs`) | `requireAuth`, `createAuthMiddleware`, **`createCorpIdAuthMiddleware`** | **Always** for protected routes |
| `lib/logger.js` | Winston-based structured logger | **Always** — replaces `console.log` |
| `lib/errors.js` | `NotFoundError`, `ValidationError`, error middleware | **Always** — replaces ad-hoc error responses |
| `lib/env.js` | `requireEnv`, env validation at startup | **Always** — fail fast on missing config |
| `lib/shutdown.js` | `installGracefulShutdown(server)` | **Always** — clean SIGTERM/SIGINT |
| `lib/crm.js` | REZ CRM Hub connector | When you need to talk to CRM |

## Why use it?

**Without shared lib:**
- Data dies on every process restart (in-memory Map)
- Errors are inconsistent across services
- Tests are bash-only smoke tests (low coverage)
- Each service reinvents auth, logging, validation

**With shared lib:**
- Data survives restarts (file-backed JSON)
- Consistent error responses
- Easy to add real tests with `node --test`
- One library to update, all services benefit

## 5-Step Migration (per service)

### Step 1: Add the dependency

In your service's `package.json`:

```json
{
  "dependencies": {
    "@rtmn/shared": "file:../../shared",
    ...
  }
}
```

Then `npm install`.

### Step 2: Replace in-memory Maps

**Before:**
```js
const users = new Map();
app.get('/users/:id', (req, res) => {
  const user = users.get(req.params.id);
  if (!user) return res.status(404).json({ error: 'not found' });
  res.json(user);
});
```

**After:**
```js
import { createModel } from '../../../shared/lib/persistent-store.js';
const User = createModel('User', { key: 'id' });

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findOne(req.params.id);
  if (!user) throw new NotFoundError('User not found');
  res.json(user);
}));
```

### Step 3: Use typed errors + middleware

```js
import { errorMiddleware, asyncHandler, NotFoundError, ConflictError, ValidationError, UnauthorizedError, ForbiddenError } from '../../../shared/lib/errors.js';

// Wrap async routes:
app.post('/users', asyncHandler(async (req, res) => {
  if (!req.body.email) throw new ValidationError('email required');
  if (await User.findOne(req.body.email)) throw new ConflictError('Email taken');
  const user = await User.create(req.body);
  res.status(201).json(user);
}));
```

### Step 3a: Use shared auth (CorpID-backed JWT)

For any service that needs real JWT verification against the CorpID identity
service, use `createCorpIdAuthMiddleware` from `@rtmn/shared/auth`. This is
**strongly recommended** over rolling your own auth — it gives you a single
source of truth across the 139+ services and handles token caching, timeouts,
and toggleable enforcement.

```js
// CJS service:
const { createCorpIdAuthMiddleware, setRequireAuth, getRequireAuth } = require('@rtmn/shared/auth');

// ESM service:
import { createCorpIdAuthMiddleware, setRequireAuth, getRequireAuth } from '@rtmn/shared/auth';

const requireAuthMw = createCorpIdAuthMiddleware({
  publicPaths: ['/health', '/', '/api/auth/toggle'],
});
app.use(requireAuthMw);

// Runtime toggle for dev/test:
app.get('/api/auth/toggle', (req, res) => {
  const on = req.query.on === 'true';
  setRequireAuth(on);
  res.json({ success: true, requireAuth: on });
});
```

**What it does:**
- Calls `POST {CORPID_URL}/auth/verify` with the bearer token from each request
- Caches verifications in-process for 60s (configurable via `cacheTtlMs`)
- 3s timeout per call (configurable via `timeoutMs`); returns 503 on timeout
- Honors `REQUIRE_AUTH=true` env var to enforce; off by default in dev
- Attaches `{ userId, email, role, businessId }` to `req.user` on success

**Why use the shared one (not your own copy):**
- Single source of truth for auth behavior across the ecosystem
- Updates / bugfixes in `@rtmn/shared/auth` propagate to every service on next deploy
- Eliminates 70-120 lines of duplicate CorpID-verify logic per service
- Easier to reason about security audits — one file to review

See `platform/memory/memory-os/src/auth.js` for the canonical thin-shim pattern
(most services use a 30-line shim that just configures `publicPaths`).

// Add error handler LAST:
app.use(errorMiddleware(logger));
```

### Step 4: Use structured logger

```js
import { createLogger } from '../../../shared/lib/logger.js';
const logger = createLogger('my-service');

// Before:
console.log('User created:', user.id);

// After:
logger.info({ userId: user.id, createdBy: req.user?.id }, 'User created');
```

### Step 5: Add health + ready split

```js
app.get('/health', async (req, res) => {
  res.json({ status: 'healthy', service: 'my-service', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req, res) => {
  try {
    await User.countDocuments(); // touches DB
    res.json({ status: 'ready', dataLayer: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'not ready', error: err.message });
  }
});
```

### Step 6 (optional): Write tests

```js
// test/my-service.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
// ... see corpid-service/test/corpid.test.js for full pattern
```

Add to package.json:
```json
{
  "scripts": {
    "test": "NODE_ENV=test node --test test/*.test.js"
  }
}
```

`NODE_ENV=test` disables rate limiters for test runs.

## Path conventions

Services live at `companies/HOJAI-AI/services/<service-name>/src/`. To reach shared:

```js
// From src/index.js:
import { ... } from '../../../shared/lib/...';
```

That's 3 levels up: `src/` → `service-name/` → `services/` → `HOJAI-AI/`.

## How persistent store works

- Each "model" = a JSON file at `<HOJAI_DATA_DIR>/<collection>s.json`
- Default data dir is `./data/` relative to cwd; override with `HOJAI_DATA_DIR=/path`
- Writes are atomic (write to `.tmp`, then rename)
- For production: set `HOJAI_DATA_DIR` to a persistent volume (e.g., Docker volume, EBS)
- For high-throughput (>1000 writes/sec): migrate to MongoDB by setting `MONGODB_URI`

## Performance notes

The persistent store is **not** a database. It's designed to:
- ✅ Eliminate data loss on restart
- ✅ Work without infrastructure setup
- ✅ Handle 161 services' worth of low-traffic CRUD

It's **not** designed to:
- ❌ Replace MongoDB at high throughput
- ❌ Support concurrent writers from multiple processes
- ❌ Scale to millions of records

For services that need real DB, swap the import:

```js
// Before (in-memory file-backed):
import { createModel } from '../../../shared/lib/persistent-store.js';

// After (MongoDB):
import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema({ email: String, name: String });
const User = mongoose.model('User', UserSchema);
```

## Reference implementation

See `services/corpid-service/` for a complete migration:
- `src/index.persistent.js` — full v3.0 rewrite using shared library
- `test/corpid.test.js` — 23 tests, all passing
- `package.json` — references `@rtmn/shared`

## Common gotchas

1. **Path depth**: Always `../../../shared/lib/...` from `src/`
2. **`findOne` ambiguity**: When `findOne(string)` is a key lookup, when `findOne(object)` is a query
3. **Rate limiting**: Set `NODE_ENV=test` to disable for tests
4. **Auto port**: Use `app.listen(0)` in tests for random port; use `process.env.PORT || <default>` in production
5. **JSON file corruption**: If a file is corrupted, the store starts fresh (and logs an error). Don't store binary data.

## Adoption status (2026-06-22)

**Memory Layer (Phase 7 complete):**
- ✅ `platform/memory/memory-os/` (4703) — uses `createCorpIdAuthMiddleware` via shim
- ✅ `platform/memory/memory-confidence/` (4152) — uses `createCorpIdAuthMiddleware` via shim
- ✅ `platform/memory/memory-context-engine/` (4790) — uses `createCorpIdAuthMiddleware` via shim
- ✅ `platform/twins/twin-memory-bridge/` (4704) — uses `createCorpIdAuthMiddleware` via shim

**Other migrated services (snapshot):**
- ✅ `platform/identity/corpid-service/` (4702) — fully migrated to shared lib (v3.0.0)
- ✅ `platform/flow/*` (15+ services) — graceful-shutdown + JWT auth applied
- ✅ `platform/twins/*` (10+ services) — PersistentMap migration + auth
- ⏳ Remaining 100+ services to migrate

**Migration is mechanical: ~2 hours per service. Prioritize by usage:**
1. corpid-service (4702) — used by everyone ✅
2. twinos-hub (4705) — used by everyone
3. memory-os (4703) — used by Genie ✅
4. memory-confidence, twin-memory-bridge, memory-context-engine ✅
5. customer-intelligence, lead-twin, order-twin
6. All others (batched)

**Shim pattern (recommended):** Create a thin `src/auth.js` that just
re-exports the shared auth functions and configures `publicPaths`. This keeps
the auth allowlist in one place per service and makes the public surface
self-documenting:

```js
// src/auth.js
import { createCorpIdAuthMiddleware } from '@rtmn/shared/auth';

export const requireAuthMw = createCorpIdAuthMiddleware({
  publicPaths: ['/health', '/', '/api/auth/toggle'],
});
export { setRequireAuth, getRequireAuth } from '@rtmn/shared/auth';
```

```js
// src/index.js
import { requireAuthMw, setRequireAuth, getRequireAuth } from './auth.js';
app.use(requireAuthMw);
```
