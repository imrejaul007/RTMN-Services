# `@rtmn/shared` — HOJAI AI Shared Library

> **Status:** ✅ Production-ready (Phase 7 — June 22, 2026)
> **Role:** The single source of truth for cross-cutting concerns used by all 139+ HOJAI AI services.
> **Package:** `@rtmn/shared`
> **Owner:** HOJAI AI Platform team

## What is this?

`@rtmn/shared` is the shared Node.js library that every HOJAI AI service imports to avoid reinventing:

- **Persistence** — `lib/persistent-map.js`, `lib/persistent-store.js`, `lib/database.js`
- **Auth** — `auth/index.js` (ESM) and `auth/index.cjs` (CJS) — both loaded automatically via the package's `exports` condition map
- **Logging** — `lib/logger.js` (Winston)
- **Errors** — `lib/errors.js` (typed errors + middleware)
- **Env** — `lib/env.js` (startup validation)
- **Lifecycle** — `lib/shutdown.js` (graceful SIGTERM)
- **Security** — `security/` (helmet configs, rate limiters)
- **Templates** — `templates/` (boilerplate for new services)
- **CRM** — `lib/crm.js` (REZ CRM Hub connector)

## Layout

```
shared/
├── package.json          # exports map (./auth, ./lib/env, ./security each have ESM+CJS)
├── auth/
│   ├── index.js          # ESM auth (requireAuth, createAuthMiddleware, createCorpIdAuthMiddleware, ...)
│   ├── index.cjs         # CJS mirror of the same
│   └── add-to-service.js # One-liner helper to wire auth into a service
├── lib/
│   ├── persistent-store.js  # File-backed JSON (Mongoose-like API)
│   ├── persistent-map.js    # Map-like API with write-through persistence
│   ├── database.js          # MongoDB connection (with in-memory fallback)
│   ├── env.js               # requireEnv, env validation
│   ├── logger.js            # Winston structured logger
│   ├── errors.js            # NotFoundError, ValidationError, etc. + middleware
│   ├── shutdown.js          # installGracefulShutdown(server)
│   ├── crm.js               # REZ CRM Hub connector
│   └── ...
├── security/
│   ├── index.js / index.cjs  # Helmet configs, rate limiters
│   └── ...
├── templates/            # Boilerplate for new services
├── test/                 # Tests for the shared lib itself
└── MIGRATION-GUIDE.md    # How to upgrade a service to use this library
```

## When to use what

| Need | Use |
|------|-----|
| State (in-memory `Map` replacement) | `lib/persistent-map.js` |
| File-backed JSON store | `lib/persistent-store.js` |
| MongoDB connection with fallback | `lib/database.js` |
| CorpID-backed JWT verification | `auth/index.js` → `createCorpIdAuthMiddleware` |
| Quick `requireAuth` (base64 tokens) | `auth/index.js` → `requireAuth` |
| Industry / role-based auth | `auth/index.js` → `createIndustryAuth` |
| Structured logging | `lib/logger.js` → `createLogger('service-name')` |
| Typed errors | `lib/errors.js` → `NotFoundError`, `ValidationError`, etc. |
| Env validation at startup | `lib/env.js` → `requireEnv(['PORT', 'DB_URL'])` |
| Graceful shutdown | `lib/shutdown.js` → `installGracefulShutdown(server)` |
| Rate limiting | `security/index.js` → `defaultLimiter`, `strictLimiter` |
| Helmet config | `security/index.js` → `defaultHelmet` |

## ESM vs CJS — how to import

The package.json `exports` map handles both automatically. Just import the path you want — Node picks the right file:

```js
// ESM service
import { createCorpIdAuthMiddleware } from '@rtmn/shared/auth';
import { createLogger } from '@rtmn/shared/lib/logger';

// CJS service
const { createCorpIdAuthMiddleware } = require('@rtmn/shared/auth');
const { createLogger } = require('@rtmn/shared/lib/logger');
```

Both forms resolve to the same exported functions (CJS via `index.cjs`, ESM via `index.js`). The CJS files are intentional **duplicate-and-adapt** (not a transpiled build artifact) so the CJS path is fully readable in isolation.

## Auth (Phase 7)

The shared auth module is the single source of truth for CorpID JWT verification. Every service that needs real auth should use it instead of rolling its own.

**`createCorpIdAuthMiddleware(options)`** — the recommended helper. It:

- Calls `POST {CORPID_URL}/auth/verify` with the bearer token
- Caches verifications in-process for 60s (configurable)
- 3s timeout per call; returns 503 on timeout
- Honors `REQUIRE_AUTH=true` env var to enforce
- Attaches `{ userId, email, role, businessId }` to `req.user` on success
- Public-path allowlist via `options.publicPaths` (string array) and `options.publicPathPatterns` (regex array)

```js
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

**Other auth helpers:**

- `requireAuth` — base64-token middleware (NOT real JWT verification; use for dev only)
- `createAuthMiddleware({ required, roles })` — base64 with role check
- `createIndustryAuth(industry, config)` — full industry auth bundle with registerBusiness / login
- `createToken(payload, expiresIn)` / `verifyToken(token)` — base64 token mint/verify

## Versioning

- `package.json` version is bumped on breaking changes only
- New exports are added in-place without a version bump (backward-compatible)
- CJS and ESM exports are kept in sync — if you add to `auth/index.js`, also add to `auth/index.cjs`

## Tests

`shared/test/` has unit tests for the persistent store. The auth module is verified by integration via the Memory Layer e2e tests (115/115 passing across memory-os, memory-confidence, memory-context-engine, twin-memory-bridge).

Adding unit tests for `createCorpIdAuthMiddleware` is tracked as a follow-up.

## Open follow-ups

- Unit tests for `createCorpIdAuthMiddleware` (cache hit, cache miss, timeout, public path regex)
- Move `auth/add-to-service.js` documentation into the main `auth/index.js` JSDoc
- Consider extracting a `lib/validation.js` shared validator (zod / joi) — currently every service uses ad-hoc checks

---

*Last Updated: 2026-06-22 (Phase 7)*
