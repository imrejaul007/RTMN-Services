# @rtmn/twinos-shared

Shared utilities for RTMN TwinOS services. One import, one version, one
consistent security baseline across every twin in the platform.

## What's in it

| Export | Type | Purpose |
|---|---|---|
| `requireAuth` | middleware factory | JWT `Bearer` authentication. Attaches `req.user`. |
| `preventPrototypePollution` | middleware | Strips `__proto__`, `constructor`, `prototype` from `req.body`, `req.params`, `req.query`. |
| `errorHandler` | middleware | Converts thrown errors / known error shapes into consistent JSON responses. |
| `defaultLimiter` | middleware | Rate limit 100 req/min per IP. |
| `strictLimiter` | middleware | Rate limit 20 req/min per IP. |
| `logger` | object | Structured JSON logger (`info` / `warn` / `error` / `debug` / `child`). No external deps. |
| `validateInput` | middleware factory | Schema-validate `body` / `params` / `query` with string / number / integer / boolean / enum / format (uuid, email, url) rules. |
| `corsOptions` | object | Drop-in CORS config for `cors(corsOptions)`. |
| `helmetConfig` | middleware | Drop-in Helmet config (CSP disabled in dev). |

Two extras for convenience: `VERSION` and `SERVICE_NAME` strings, plus a
default export object containing every utility.

## Install

This package lives inside the RTMN monorepo and is consumed via a `file:`
dependency. The standard consumer `package.json` is:

```json
{
  "dependencies": {
    "@rtmn/twinos-shared": "file:../twinos-shared"
  }
}
```

Then `npm install` from the consumer's directory. The shared package has no
build step - it is consumed directly as ES modules (`"type": "module"`).

## Usage

```js
import express from 'express';
import {
  requireAuth,
  preventPrototypePollution,
  errorHandler,
  defaultLimiter,
  strictLimiter,
  logger,
  validateInput,
  corsOptions,
  helmetConfig
} from '@rtmn/twinos-shared';

const app = express();
app.use(express.json());
app.use(preventPrototypePollution);
app.use(helmetConfig);
app.use(cors(corsOptions));
app.use(defaultLimiter);

app.post(
  '/twins',
  requireAuth(),
  validateInput({
    body: {
      type:    { type: 'string', required: true, min: 1, max: 64 },
      payload: { type: 'object', required: true }
    }
  }),
  handler
);

app.use(errorHandler);
```

## Configuration

All config is environment-driven:

| Env var | Default | Effect |
|---|---|---|
| `JWT_SECRET` | `rtmn-twin-shared-default-secret-change-me` | HMAC secret for `requireAuth`. **Set in production.** |
| `JWT_ISSUER` | `rtmn-twinos` | Expected `iss` claim. |
| `JWT_EXPIRES_IN` | `1h` | Default token lifetime used by callers when signing. |
| `LOG_LEVEL` | `info` | One of `error`, `warn`, `info`, `debug`. |
| `CORS_ORIGIN` | `true` | Comma-separated origin allowlist, or `true` for any. |
| `NODE_ENV` | unset | When `production`, error responses omit `errorId`. |

## API

### `requireAuth(options?)`

Returns Express middleware. Verifies a `Bearer` JWT signed with `secret`
(defaults to `JWT_SECRET`) and the configured issuer.

- **Success:** attaches `req.user = { id, email, role, businessId }` and calls `next()`.
- **Missing header / wrong scheme:** `401 UNAUTHORIZED`.
- **Invalid signature:** `401 INVALID_TOKEN`.
- **Expired token:** `401 TOKEN_EXPIRED`.
- **Wrong token type (e.g. refresh used as access):** `401 INVALID_TOKEN_TYPE`.

```js
app.use(requireAuth());                 // use env defaults
app.use(requireAuth({ secret: 'k' }));  // override secret per-route
```

### `preventPrototypePollution`

Walks `req.body`, `req.params`, `req.query` and replaces each object with a
clean copy that drops the keys `__proto__`, `constructor`, and `prototype`.
This prevents attackers from mutating `Object.prototype` via crafted JSON.

### `errorHandler(err, req, res, next)`

Final error-handling middleware. Normalizes errors to:

```json
{
  "success": false,
  "error": { "code": "INTERNAL_ERROR", "message": "...", "errorId": "..." }
}
```

Recognizes `JsonWebTokenError`, `TokenExpiredError`, and `ValidationError` and
maps them to appropriate status codes. Logs `error` / `warn` via `logger`.

### `defaultLimiter` / `strictLimiter`

Express rate limiters built on `express-rate-limit`:

- `defaultLimiter`: 100 req / min / IP, returns `429` with `RATE_LIMIT` code.
- `strictLimiter`: 20 req / min / IP, same response shape.

### `logger`

```js
logger.info('twin updated', { twinId: 't-1' });
logger.warn('rate limit near', { count: 95 });
logger.error('db down', { err: e.message });
const child = logger.child({ requestId: 'r-1' });
child.info('handled');
```

Output is newline-delimited JSON written to `stdout` (info/debug) or
`stderr` (warn/error). No external logger dependency.

### `validateInput(schema)`

Tiny schema validator, no extra dependency.

```js
validateInput({
  body: {
    email:   { type: 'string', format: 'email', required: true },
    age:     { type: 'integer', min: 0, max: 150 },
    role:    { type: 'enum', values: ['admin', 'user'] },
    bio:     { type: 'string', max: 500 },
    active:  { type: 'boolean' },
    refId:   { type: 'string', format: 'uuid' },
    score:   { type: 'number', min: 0 }
  },
  params: { id: { type: 'string', format: 'uuid', required: true } },
  query:  { q: { type: 'string', max: 100 } }
});
```

Rule fields:

- `type`: `string` | `number` | `integer` | `boolean` | `enum`
- `required`: true to fail when missing/empty
- `min` / `max`: numeric or length bounds (per `type`)
- `format`: `uuid` | `email` | `url` (strings only)
- `pattern`: `RegExp` to test string values against
- `values`: array of allowed values (`enum` only)

On failure responds with `400 VALIDATION_ERROR` and a `details` array listing
every failed field.

### `corsOptions`

```js
import cors from 'cors';
app.use(cors(corsOptions));
```

Allows `GET, POST, PUT, PATCH, DELETE, OPTIONS`, headers
`Content-Type, Authorization, X-Request-ID, X-API-Key`, credentials on.

### `helmetConfig`

```js
app.use(helmetConfig);
```

CSP is disabled outside production to keep dev workflows unblocked; otherwise
the standard Helmet defaults apply.

## Testing

The package ships with two test scripts:

- `tests/smoke.sh` - verifies each export is present, callable, and shaped
  correctly (22 assertions). No network, no server.
- `tests/e2e.sh` - boots a real Express app that uses every export, then
  makes HTTP requests and checks responses (14 assertions).

Both scripts are macOS-safe (BSD `sed`, no `mktemp`, no `head -n -1`).

```bash
npm test            # runs smoke then e2e
npm run test:smoke
npm run test:e2e
```

Expected output ends with `Passed: 22 / Failed: 0` and
`Passed: 14 / Failed: 0` respectively.

## Versioning

Current version: **2.0.0**. Breaking changes to the 9 public exports follow
semver. Additions to the default export object are non-breaking.

## License

MIT - HOJAI AI / RTMN.