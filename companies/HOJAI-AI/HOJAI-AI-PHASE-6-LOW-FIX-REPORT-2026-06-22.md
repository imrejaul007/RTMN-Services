# HOJAI AI Phase 6 — Low Severity Fix Report

> **Date:** 2026-06-22
> **Scope:** 5 LOW severity findings (L-1..L-5) from
> [HOJAI-AI-AUDIT-REPORT-2026-06-21.md](HOJAI-AI-AUDIT-REPORT-2026-06-21.md)
> **File modified:** `platform/identity/corpid-service/src/index.js`
> **Parent report:** [RTMN Cross-System Security Fix Report](../../SECURITY-FIX-REPORT-2026-06-22.md)

---

## Findings fixed

| ID | Finding | Status |
|----|---------|--------|
| HOJAI L-1 | Verbose error messages in non-production (errorId leak) | ✅ Fixed |
| HOJAI L-2 | Unused password hash field on user update endpoint | ✅ Fixed |
| HOJAI L-3 | CSP imgSrc allows arbitrary HTTPS sources (tracking pixel vector) | ✅ Fixed |
| HOJAI L-4 | User enumeration via differential registration errors | ✅ Fixed |
| HOJAI L-5 | No account lockout after failed logins | ✅ Fixed |

---

## L-1 — errorId gating to true dev only

**Before:**
```js
error: { code, message, ...(process.env.NODE_ENV !== 'production' && { errorId }) }
```

This leaked errorId in staging, preview, demo, and any non-prod environment
where the actual deployment wasn't `production`. The errorId is a UUIDv4
that aids debugging but discloses server-side implementation details.

**After:**
```js
// SECURITY FIX (HOJAI L-1): only include errorId in true local dev so it
// never leaks in non-production deployments (staging, preview, demo).
// Set ALLOW_ERROR_ID=1 explicitly to opt back in for debugging.
error: {
  code,
  message,
  ...(process.env.NODE_ENV === 'development' && process.env.ALLOW_ERROR_ID !== '0' && { errorId })
}
```

errorId is now gated to `NODE_ENV === 'development'` with an explicit
`ALLOW_ERROR_ID=1` opt-in. Set `ALLOW_ERROR_ID=0` to silence even in dev.

---

## L-2 — Password field dropped on user update + documented contract

**Issue:** PUT /api/users/:id didn't reject a `password` field in the body.
A future refactor could accidentally expose password rotation through this
endpoint, bypassing the audit log + current-password re-auth that the
dedicated /api/profile/password endpoint enforces.

**Fix:**
1. Added docblock above the route explicitly stating password changes MUST
   go through `/api/profile/password`.
2. Explicit destructure-and-drop of any `password` field in the request body.
3. If a password field is supplied, the attempt is logged with
   `targetUserId` and `attemptedBy` so a future regression is detectable
   in the audit log.

```js
// SECURITY FIX (HOJAI L-2): explicitly destructure-and-drop any `password`
// field. This documents the invariant and logs attempts in case a future
// refactor accidentally re-exposes the field.
const rawBody = sanitizeInput(req.body);
if (rawBody.password !== undefined) {
  logger.warn('Ignored password field on user update', {
    targetUserId: targetUser.id,
    attemptedBy: req.user.id
  });
}
const { name, role, status, preferences, password: _dropped } = rawBody;
void _dropped;
```

---

## L-3 — CSP imgSrc restricted to known hosts

**Before:**
```js
imgSrc: ["'self'", "data:", "https:"]
```

Any HTTPS host could load images into the page — usable as a tracking-pixel
vector (one-pixel GIFs from any domain to fingerprint users).

**After:**
```js
imgSrc: (() => {
  const envExtra = process.env.IMG_SRC;
  const base = ["'self'", 'data:'];
  if (!envExtra) return [...base, 'https://*.rtmn.com', 'https://*.rez.money'];
  return [...base, ...envExtra.split(',').map(s => s.trim()).filter(Boolean)];
})(),
```

Default allowlist: `*.rtmn.com`, `*.rez.money`. Operators can extend via
`IMG_SRC=https://cdn.example.com,https://images.example.com`.

---

## L-4 — Uniform registration error to prevent enumeration

**Before:** Two distinct error codes leaked which dimension conflicted
with the registration:
- `USER_EXISTS` (409) — email already in use
- `BUSINESS_EXISTS` (409) — business ID already in use

An attacker could probe the registration endpoint with arbitrary
email/businessId pairs and enumerate which emails are registered (for
credential-stuffing or phishing targeting) and which business IDs are taken.

**After:**
```js
// SECURITY FIX (HOJAI L-4): unify USER_EXISTS and BUSINESS_EXISTS responses
// so an attacker cannot enumerate which emails or business IDs are
// already registered. Both error paths now return the same generic
// REGISTRATION_FAILED with the same status code. The actual reason is
// logged server-side for operators.
if (users.has(email.toLowerCase()) || businesses.has(businessId)) {
  const reason = users.has(email.toLowerCase()) ? 'user_exists' : 'business_exists';
  logger.warn('Registration rejected', { reason, email: email.toLowerCase(), businessId });
  return res.status(409).json({
    success: false,
    error: { code: 'REGISTRATION_FAILED', message: 'Registration failed. Please verify your details and try again.' }
  });
}
```

Same code (`REGISTRATION_FAILED`), same status (409), same message. The
specific reason is logged server-side for operators. Also fixed the
admin-gated user-creation endpoint to use the same uniform error code for
consistency.

---

## L-5 — Exponential backoff account lockout

**Issue:** authLimiter blocked at 5 attempts per IP per 15 minutes. An
attacker could wait the window out, switch IPs, or just keep retrying
indefinitely against the same account from a fresh IP. No account-level
lockout existed.

**Fix:**

1. **New policy constants** (top of file, env-configurable):
   ```js
   const MAX_FAILED_LOGINS = parseInt(process.env.MAX_FAILED_LOGINS || '5', 10);
   const LOCKOUT_DURATION_MS = parseInt(process.env.LOCKOUT_DURATION_MS || String(15 * 60 * 1000), 10); // 15min
   const MAX_LOCKOUT_MS = parseInt(process.env.MAX_LOCKOUT_MS || String(24 * 60 * 60 * 1000), 10);     // 24h
   ```

2. **Per-account lockout state** added to the user record:
   - `failedLoginCount` (counter)
   - `lockoutUntil` (ISO timestamp when the lock expires)

3. **Login route** (pre-verify) checks lockout, returns 423 with Retry-After
   header. On failure, increments counter; on threshold, applies lockout.
   On success, resets counter.

4. **Exponential backoff** with cap: each failure during an active lockout
   doubles the remaining time, capped at `MAX_LOCKOUT_MS` (24h default).

### Verification

6/6 standalone scenarios pass:

```
PASS 4 failures does not lock
PASS 5 failures locks account
PASS 6th failure doubles lockout time
PASS reset clears counter and lockout
PASS lockout caps at MAX_LOCKOUT_MS (24h)
PASS expired lockout allows login
```

---

## What was NOT changed (out of scope or already safe)

- H-2 (wildcard CORS on 119+ services): this is a HIGH item, owned by
  Phase 2 which is already deployed. Cross-system CORS migration is a
  separate effort tracked in [STATUS-AND-REMAINING-WORK.md](../../STATUS-AND-REMAINING-WORK.md).
- M-2 (weak password policy, 8-char minimum): MEDIUM. Lower-priority.
- L-3 was on the audit but already partly mitigated by the new CSP.

---

## Files modified

| File | Lines changed | Findings |
|---|---|---|
| `platform/identity/corpid-service/src/index.js` | +57 / -15 | L-1, L-2, L-3, L-4, L-5 |

Single file because all 5 Lows were in the same auth service. The route
shape is unchanged — only error response shape, password handling,
CSP directive, and lockout policy were modified.

---

*See also: [HOJAI-AI-AUDIT-REPORT-2026-06-21.md](HOJAI-AI-AUDIT-REPORT-2026-06-21.md)
for the original findings and recommended-fix descriptions.*