# Consent Engine (port 4262)

> **Status:** ✅ Production-ready v1.0.0 (Governance suite — June 22, 2026)
> **Role:** Per-purpose user consent with fail-closed checks.
> **Owner:** HOJAI AI Platform team

## Mission

Before the Consent Engine, every service kept its own "did the user opt in to X?" boolean. The Consent Engine solves this with:

- **Purposes** — 11 predefined (marketing, analytics, personalization, third-party-share, ...)
- **Grants** — explicit, time-stamped, revocable
- **Check** — `POST /api/check` returns `allowed: true | false` (fail-closed)
- **Withdraw** — immediate revocation
- **Audit** — every grant / check / withdraw is logged

## Design Principles

| # | Principle | How Consent Engine implements it |
|---|-----------|---------------------------------|
| 1 | Fail-CLOSED | `check` returns `allowed: false` when no grant exists. Never implicit-permit. |
| 2 | Explicit grant | A `consent` record is required for a check to return true. |
| 3 | Revocation is immediate | `withdraw` flips `validFrom/Until` and the next check denies. |
| 4 | Per-purpose | Each purpose is a separate key. Marketing consent ≠ analytics consent. |
| 5 | Audit non-bypassable | Every grant / check / withdraw emits an audit entry. |

## Endpoints (12)

### Purposes (1)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/purposes` | List 11 predefined purposes |

### Grants (4)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/consents` | Grant consent for a (subject, purpose) |
| GET | `/api/consents/:id` | Get one grant |
| GET | `/api/subjects/:subjectId/consents` | All grants for a subject |
| POST | `/api/consents/:id/withdraw` | Withdraw a specific grant |
| POST | `/api/consents/withdraw` | Withdraw by (subject, purpose) |

### Check (1)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/check` | `allowed: true` only if an active grant exists. **Fail-closed otherwise.** |

### Summary & Audit (2)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/subjects/:subjectId/summary` | Per-subject purpose-by-purpose view |
| GET | `/api/audit` | Audit log of all consent events |

### Health (3)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness + counts |
| GET | `/ready` | Readiness probe |
| GET | `/` | Redirects to `/health` |

## Built-in Purposes (11)

| Purpose ID | Description |
|------------|-------------|
| `marketing` | Marketing emails / notifications |
| `analytics` | Product analytics tracking |
| `personalization` | Personalized content / recommendations |
| `third_party_share` | Sharing data with third parties |
| `ai_training` | Using user data to train AI models |
| `profiling` | Automated profiling / scoring |
| `cross_border_transfer` | Transferring data across borders |
| `marketing_automation` | Automated marketing workflows |
| `voice_recording` | Recording voice interactions |
| `location_tracking` | Tracking user location |
| `device_fingerprinting` | Device fingerprint / tracking |

## Check request / response

```json
// POST /api/check
{
  "subjectId": "user-123",
  "purpose": "marketing",
  "context": { "channel": "email", "campaignId": "summer-2026" }
}

// 200 OK — granted
{ "allowed": true, "consentId": "con-uuid", "grantedAt": "..." }

// 200 OK — denied (fail-closed)
{ "allowed": false, "reason": "no_active_grant" }
```

## Rate Limits

20 req/min default, overridable via `CONSENT_LIMIT` env.

## Storage

`PersistentStore` (file-backed JSON in `data/`).

## Tests

`tests/smoke.sh` — 13 tests covering grant / check / withdraw / summary / audit.

## Related

- [PolicyOS](../policy-os/CLAUDE.md) — governance + authorization
- [Compliance Engine](../compliance-engine/CLAUDE.md) — regulatory mapping
- [Governance SDK](../../shared/lib/governance-sdk.js) — client wrapper
