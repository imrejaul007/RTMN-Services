# @rtmn/twinos-shared

**Version:** 2.0.0
**Type:** Shared library (not a service — no port)
**Module type:** ESM (`import`/`export`)
**Status:** ✅ Published internally to all TwinOS twins

---

## Overview

`@rtmn/twinos-shared` is the single import surface every TwinOS twin service depends on. It provides production-grade middleware (auth, rate limiting, validation, sanitization, error handling), structured logging, JWT signing/verification, RBAC primitives, typed error classes, and a `createBaseTwinService()` factory that scaffolds a hardened Express app in one call.

This is the v2.0 release — it consolidates what used to be duplicated boilerplate across all twin services into one place. Notable additions in v2: polymorphic `requireAuth`/`optionalAuth`/`preventPrototypePollution` (work as both factory and middleware), `authLimiter` for login endpoints, `Errors` typed error classes, and `createBaseTwinService`.

---

## Exports

### Authentication & Authorization
- `requireAuth` — JWT middleware (factory or direct). Reads `Authorization: Bearer <token>`, validates `secret + issuer + type=access`, sets `req.user = { id, email, role, businessId }`
- `optionalAuth` — Same as `requireAuth` but never rejects; `req.user` is set only when token is valid
- `requireBusiness` — 403 unless `req.user.businessId` is set
- `requireRole` — 403 unless `req.user.role` is in allowed list
- `signToken(payload, opts)` — Sign a JWT with standard claims (`sub`, `email`, `role`, `businessId`, `type`)
- `verifyJwt(token, opts)` — Verify a JWT and return decoded payload, or throw
- `generateTokens(user, opts)` — Returns `{ accessToken, refreshToken (7d), expiresIn }`

### Security & Sanitization
- `preventPrototypePollution` — Strips `__proto__`, `constructor`, `prototype` keys. Works as middleware OR as legacy `clean(obj)` call
- `sanitizeObject(obj)` — Recursive strip of pollution keys (returns copy)
- `sanitizeSearchInput(input, maxLen=200)` — Trim + collapse whitespace + cap length

### Rate Limiting (express-rate-limit)
- `defaultLimiter` — 100 req/min per IP, returns JSON 429
- `strictLimiter` — 20 req/min per IP, returns JSON 429
- `authLimiter` — 10 req/min per IP for login/refresh endpoints

### Error Handling & Logging
- `errorHandler(err, req, res, next)` — Consistent JSON error responses, maps `JsonWebTokenError`/`TokenExpiredError`/`ValidationError` to proper status codes
- `notFoundHandler` — Returns 404 JSON for unmatched routes
- `asyncHandler(fn)` — Wraps async handlers so thrown errors flow to `errorHandler`
- `requestId` — Assigns/echoes `X-Request-ID` header
- `requestLogger` — Logs `{ requestId, method, path, status, durationMs }` on `res.finish`
- `logger` — Structured JSON logger (`info`, `warn`, `error`, `debug`, `child(bindings)`) — no external deps
- `Errors` — Typed error classes: `TwinOSError`, `ValidationError`, `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `ConflictError` + factory shorthands (`Errors.VALIDATION(msg)`, `Errors.NOT_FOUND(resource)`, etc.)

### Validation & Config
- `validateInput(schema)` — Body/params/query validator factory. Schema = `{ body: { email: { type: 'string', format: 'email', required: true } } }`
- `PAGINATION` — `{ DEFAULT_LIMIT: 20, DEFAULT_PAGE: 1, MAX_LIMIT: 100, parse(query), envelope(items, total, page, limit) }`
- `corsOptions` — Default CORS config with credentials + comma-separated `CORS_ORIGIN`
- `helmetConfig` — Default Helmet config (CSP disabled in dev)

### Service Scaffolding
- `createBaseTwinService({ serviceName, jsonLimit })` — Returns preconfigured Express app with helmet, cors, json parser, requestId, requestLogger, preventPrototypePollution, defaultLimiter, errorHandler, and `/health` endpoint

### Event Publishing (re-exported from `./event-publisher.js`)
- `publish(topic, payload)` — Synchronous publish
- `publishAsync(topic, payload)` — Fire-and-forget async publish (used by wallet/customer twins for cross-service events)

---

## Architecture

```
twinos-shared/
├── src/
│   ├── index.js                  # All exports (this file)
│   ├── middleware/
│   │   ├── auth.js               # (referenced via package exports)
│   │   ├── validation.js
│   │   ├── rateLimit.js
│   │   └── errors.js
│   └── event-publisher.js        # publish / publishAsync
├── tests/
│   ├── smoke.sh
│   └── e2e.sh
├── package.json                  # name: @rtmn/twinos-shared, v2.0.0
└── CLAUDE.md
```

---

## Dependencies

- **express** ^4.18.2
- **express-rate-limit** ^7.1.5
- **helmet** ^7.1.0
- **cors** ^2.8.5
- **jsonwebtoken** ^9.0.2
- **uuid** ^9.0.1
- **@rtmn/shared** (peer) — `requireEnv` for PORT validation

---

## Recent Changes

- 2026-06-21: v2.0.0 release — polymorphic middleware (factory + direct call), `authLimiter`, `Errors` typed classes, `createBaseTwinService` factory, event-publisher re-exports
- 2026-06-20: `requireAuth` accepts both `requireAuth({...})` factory form AND direct middleware form
- 2026-06-19: `preventPrototypePollution` made polymorphic (middleware + legacy `clean(obj)`)
- 2026-06-18: Logger now has `child(bindings)` for per-service structured logging
- 2026-06-17: JWT_SECRET validation — production startup throws if not set (dev uses safe default)

---

## Quick Start

```js
// Standard twin service scaffold (used by user-twin and others)
import {
  createBaseTwinService,
  requireAuth,
  strictLimiter,
  asyncHandler,
  Errors,
  logger,
  publishAsync
} from '@rtmn/twinos-shared';

const app = createBaseTwinService({ serviceName: 'my-twin', jsonLimit: '1mb' });

app.post('/api/twins/widgets',
  requireAuth,
  strictLimiter,
  asyncHandler(async (req, res) => {
    if (!req.body.name) throw Errors.VALIDATION('name required');
    // ... create widget
    await publishAsync('widget.created', { id, name });
    res.status(201).json({ success: true });
  })
);

app.listen(process.env.PORT || 4899, () => logger.info('my-twin started'));
```

```bash
# Tests
cd companies/HOJAI-AI/platform/twins/twinos-shared
npm test                # smoke + e2e
npm run test:smoke      # smoke only
npm run test:e2e        # e2e only
```