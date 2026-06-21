# @rtmn/security-shared

**The single source of truth for security in the RTMN ecosystem.**

This package replaces the bespoke, broken authentication code that was found in every audited service. It enforces the patterns that should have been there from the start:

- **JWT with mandatory `algorithms: ['HS256']` whitelist** — no `alg: none`, no algorithm confusion
- **Fail-fast on missing or weak secrets** — no hardcoded fallbacks
- **bcrypt-12 for human passwords** — never SHA-256, never unsalted
- **SHA-256+pepper for server secrets** (API keys, refresh tokens) — O(1) lookup
- **Real `requireAuth` middleware** that verifies signatures, issuers, audiences, and expiry
- **Append-only, hash-chained audit logs** — tamper-detectable
- **Strict CORS** — no wildcard+credentials
- **Per-route rate limiting** — auth endpoints always limited

## What it fixes

The June 2026 audit of CorpID Cloud, HOJAI AI, CorpPerks, and REZ Auth (RABTUL) found that **every system** had independently re-implemented auth with the same bugs:

| Bug | Fixed by |
|---|---|
| Hardcoded JWT secret fallback | `sign`/`verify` throw if `JWT_SECRET` is missing or < 32 bytes |
| `jwt.verify` without `algorithms` whitelist | `verify` always pins to `['HS256']` |
| `requireAuth` that only checks `Bearer` header presence | `requireAuth` actually verifies the JWT signature |
| Unsalted SHA-256 password hashing | `hashPassword` uses bcrypt-12 |
| API keys hashed with bcrypt (DoS amplifier) | `generateApiKey` + `verifyApiKey` use SHA-256+pepper |
| "Immutable" audit logs that mutate with `splice`/`shift` | `AuditLog` is append-only, hash-chained, verifiable |
| Wildcard CORS with credentials | `createCors` throws on this combination |
| Predictable internal-service token | `INTERNAL_SERVICE_TOKEN` must be set, no fallback |

## Usage

```javascript
import {
  validateProductionEnv,
  requireAuth,
  requireRole,
  createHelmet,
  createCors,
  authLimiter,
  defaultLimiter,
  sign,
  verify,
  hashPassword,
  verifyPassword,
  generateApiKey,
  verifyApiKey,
  createAuditLog,
  AuditLog,
} from '@rtmn/security-shared';

// 1. Validate env vars at startup. Throws if anything is missing.
validateProductionEnv({ requireAdminSecret: true });

// 2. Build your app
const app = express();
app.use(createHelmet());
app.use(createCors({ credentials: true }));
app.use(express.json());

const audit = createAuditLog();

// 3. Auth endpoints use the auth limiter
app.post('/login', authLimiter, async (req, res) => {
  // ... bcrypt verification ...
  const token = sign({ sub: user.id, role: 'user' }, { expiresIn: '15m' });
  audit.append({ type: 'auth.login', actorId: user.id });
  res.json({ token });
});

// 4. Protected routes use requireAuth
app.get('/me', requireAuth(), (req, res) => {
  res.json(req.user);
});

// 5. Admin routes use requireRole
app.delete('/users/:id', requireAuth(), requireRole('admin'), async (req, res) => {
  // ...
});

// 6. Verify the audit chain integrity periodically
const tamperedAt = audit.verifyChain();
if (tamperedAt !== -1) {
  console.error(`Audit log tampered at index ${tamperedAt}!`);
}
```

## Environment variables

| Variable | Required | Min length | Purpose |
|---|---|---|---|
| `JWT_SECRET` | Yes | 32 bytes | User JWT signing key |
| `JWT_ADMIN_SECRET` | For admin endpoints | 32 bytes | Superadmin JWT signing key |
| `JWT_MERCHANT_SECRET` | For merchant endpoints | 32 bytes | Merchant JWT signing key |
| `SECRETS_PEPPER` | Yes | 32 bytes | HMAC pepper for `hashSecret` |
| `AUDIT_LOG_SECRET` | Yes | 32 bytes | HMAC secret for audit chain |
| `INTERNAL_SERVICE_TOKEN` | Yes | 32 bytes | Service-to-service auth |
| `CORS_ORIGIN` | Production | — | Comma-separated allowed origins |

Generate a secret with:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## API

### Auth

#### `sign(payload, options?) → string`
Sign a JWT. Always HS256, always with expiry, issuer, and audience.

#### `verify(token, options?) → object`
Verify a JWT. Throws on any failure (bad sig, expired, wrong iss/aud, alg confusion).

#### `hashPassword(plaintext) → Promise<string>`
bcrypt-12 hash. For human-typed passwords only.

#### `verifyPassword(plaintext, hash) → Promise<boolean>`
Timing-safe bcrypt compare.

#### `generateApiKey() → { plaintext, fingerprint, prefix }`
Generate a new API key. `plaintext` is shown to the user once; `fingerprint` is stored.

### Middleware

#### `requireAuth(options?) → Middleware`
Verifies JWT signature, issuer, audience, and expiry. Attaches `req.user`.

#### `requireRole(...roles) → Middleware`
Require a specific role. Use after `requireAuth`.

#### `requireOwnership(options?) → Middleware`
Require the URL param to match `req.user.id` (kills IDOR).

#### `authLimiter`, `defaultLimiter`, `strictLimiter`, `internalLimiter`
Pre-configured rate limiters.

#### `createCors(options?) → Middleware`
Strict CORS. Throws on startup if config is invalid for production.

#### `createHelmet(options?) → Middleware`
Secure headers, CSP, HSTS (production only).

### Audit

#### `createAuditLog() → AuditLog`
Build an audit log from `AUDIT_LOG_SECRET`. Returns a new `AuditLog` instance.

#### `audit.append(event)`
Append an event. Returns `{ seq, chainHash }`. Never mutates existing events.

#### `audit.verifyChain() → number`
Walk the chain. Returns -1 if intact, or the index of the first tampered event.

#### `audit.prune()`
Remove events older than retention. Re-chains from the new head.

## Versioning

This package follows semver. Breaking changes to the API require a major version bump.

## License

UNLICENSED — internal RTMN use only.
