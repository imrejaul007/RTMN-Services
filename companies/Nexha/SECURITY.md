# Security — NeXha Commerce Network (L1)

> **Date:** 2026-06-21
> **Audience:** Security reviewers, operators, and contributors.
> **Status:** Living document. Updated as the threat model evolves.

---

## Threat model

L1 (commerce-identity + sutar-mock + portal) is a **publicly exposed** B2B
service running on Render (backend) + Vercel (portal). The trust boundary
is the network — any internet caller can hit `/api/*`. Assumed adversary:

- **Anonymous attacker** — can hit any public endpoint
- **Authenticated low-privilege user** — supplier or buyer
- **Authenticated guest** — verified by OTP, not by GSTIN
- **Compromised operator** — Render dashboard or Vercel env access
- **Compromised SUTAR service** — indirect adversary via the bridge

We do **not** defend against:

- A compromised Render or Vercel account (rotate secrets immediately on
  suspicion; see [RUNBOOK.md § Secret rotation](RUNBOOK.md#secret-rotation))
- Nation-state attackers with full TLS-stripping capability
- A user who has their own JWT leaked (use short `JWT_EXPIRES_IN`; consider
  adding a revocation list in a future phase)

---

## Authentication & authorization guarantees

### What's hardened (closed in Phase 3 of NEXHA-DEEP-AUDIT.md)

| # | Guarantee | Mechanism |
|---|---|---|
| A-1 | Roles are derived from the persisted entity (Supplier vs Buyer), not from the corpId string prefix | `resolveRole()` in `auth.service.ts` |
| A-2 | `/api/corpid/issue` is no longer public; only authenticated callers can mint new CorpIDs | `requireAuth('strict')` on the route |
| A-3 | Rating submission ignores body-supplied `raterCorpId` and `raterRole`; only JWT values are used | `rating.routes.ts` |
| A-4 | Supplier PII (bank details, document URLs) is gated on JWT identity, not on a client-supplied `x-corp-id` header | `supplier.routes.ts` |
| A-5 | `GET /api/buyers/:corpId` requires strict auth and ownership | `buyer.routes.ts` |
| A-6 | Production fails fast if `JWT_SECRET` is unset or set to the dev placeholder | `auth.service.ts` |
| A-7 | Internal-key comparison is timing-safe | `crypto.timingSafeEqual` with length check |
| A-8 | Guest conversion and event recording check JWT ownership | `guest.routes.ts` |
| A-9 | CORS uses exact origin match — no `https://*.vercel.app` wildcard | `app.ts` |
| A-10 | OTP codes are stored as bcrypt hashes in MongoDB | `guest-supplier.service.ts` |
| A-11 | OTP comparison uses `bcrypt.compare` (constant-time) | `guest-supplier.service.ts` |
| A-12 | Default rate limit (100 req/min/IP) on all `/api/*`; strict (20 req/min/IP) on sensitive write endpoints | `rate-limit.middleware.ts` |
| A-13 | Browser sessions use httpOnly cookies (XSS-safe); no localStorage | `auth.routes.ts` + `portal/lib/api.ts` |
| A-14 | Login uses a single error message regardless of cause (no user enumeration) | `auth.routes.ts` |

### What's NOT yet hardened (known limitations)

| # | Limitation | Risk | Mitigation in L1 |
|---|---|---|---|
| L-1 | Bank account numbers are stored unencrypted in Mongoose | India DPDP Act compliance; insider DB-read exposure | Documented in this section; encryption-at-rest is planned but deferred (L1 has no per-field crypto infra) |
| L-2 | No JWT revocation list — leaked tokens remain valid until `exp` | Token theft gives full session access | Set `JWT_EXPIRES_IN` to a short value (default 7d); consider 1d for high-security deploys |
| L-3 | SUTAR mock is in-memory — events and trust links do not survive restart | Dev-only; no production data is at risk | sutar-mock is deployed separately and only pointed at from dev/test environments |
| L-4 | OTP codes are logged to console in dev mode | Dev-only log noise; OTPs are real in dev | Document the requirement to clear logs / set `LOG_LEVEL=warn` for non-prod demo deploys |
| L-5 | Password hashes are stored in `metadata.passwordHash` (Mongoose `Mixed` type) | Mixed types bypass Mongoose schema validation | Migration to a typed field is tracked; L1 keeps the metadata shape for backward compat |
| L-6 | CORS defaults to allowing `http://localhost:3001` (Vercel preview) | In dev, an attacker on a preview URL could call the API | Set `ALLOWED_ORIGINS` to the production Vercel URL only |
| L-7 | The dev `.env.example` has the dev `JWT_SECRET` value visible | Operators may forget to rotate | Runbook § Secret rotation has the explicit `openssl rand -hex 32` command |
| L-8 | The dev `INTERNAL_API_KEY` is `change-me-in-production` | If deployed unchanged, anyone on the network can call internal endpoints | Runbook rotation required |
| L-9 | No CSP headers on the portal | XSS could exfiltrate data via injected scripts | Helmet sets basic headers; full CSP not configured (deferred) |
| L-10 | No CSRF protection on cookie-based auth | A malicious site could trigger state-changing requests via the user's cookie | `SameSite=Lax` mitigates the common case; double-submit planned for high-value mutations |

### Deferred (not L1 scope)

- Webhook signature verification (HMAC-SHA256) — N/A, no webhooks in L1
- 2FA / TOTP — not in L1
- Per-IP allowlisting for `/api/corpid/issue` — would need a WAF
- Field-level encryption for bank account numbers, GSTIN, PAN
- Distributed rate limiting across multiple Render instances

---

## Data classification

| Field | Classification | Storage | Notes |
|---|---|---|---|
| `Supplier.email` | PII | MongoDB | Visible to self/admin only |
| `Supplier.phone` | PII | MongoDB | Visible to self/admin only |
| `Supplier.bankDetails.accountNumber` | Sensitive PII | MongoDB (plaintext) | See L-1 |
| `Supplier.documents[].number` (GSTIN/PAN) | Sensitive PII | MongoDB | Visible to self/admin only |
| `Buyer.email`, `phone`, `address` | PII | MongoDB | Visible to self/admin only |
| `Rating.feedback` | User content | MongoDB | Visible to subject + admin |
| `GuestSupplier.phone`, `whatsapp` | PII | MongoDB | Visible to guest + admin |
| `metadata.passwordHash` | Secret (bcrypt) | MongoDB | Never returned via API |
| `otpHistory[].code` | Secret (bcrypt) | MongoDB | Never returned via API |
| SUTAR event payloads | Mixed | sutar-mock in-memory | Dev-only; production SUTAR handles its own retention |

---

## Incident response

If you suspect a compromise:

1. **Rotate secrets immediately** (see [RUNBOOK.md § Secret rotation](RUNBOOK.md#secret-rotation))
2. Pull the Render logs for the window of suspected compromise
3. Grep for `corpId` values that should not have been active
4. If a supplier/buyer was unauthorized-modified, restore from a MongoDB
   backup (`mongodump` is recommended; not configured in L1 — see
   [RUNBOOK.md § Backups](RUNBOOK.md#backups))
5. If the JWT secret leaked, all existing sessions become forgeable —
   immediately re-issue and require all users to re-login

---

## Reporting a vulnerability

Email `security@rtmn.example` (placeholder — update with the real address
when set up). PGP key TBD.

---

*Last updated: 2026-06-21 (Phase 6 of NEXHA-DEEP-AUDIT.md)*
