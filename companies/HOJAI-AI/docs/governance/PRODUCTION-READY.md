# Governance Platform — Production-Ready (v1.3)

> **Status:** ✅ Production-ready
> **Services:** policy-os (4254), compliance-engine (4261), consent-engine (4262), flow-orchestrator (4244)
> **Last updated:** 2026-06-21

The Governance Platform is HOJAI AI's universal trust, authorization, consent, and compliance layer. It lets any service ask "may I do X to subject Y for purpose Z under controls C?" and get a single, auditable, fail-closed answer.

This document covers the **what and why**. For endpoint-by-endpoint reference, see [API.md](./API.md). For integration recipes, see [INTEGRATION.md](./INTEGRATION.md).

---

## Why this matters

When you have 50+ services all touching the same user data, the questions pile up fast:

- "Is this user allowed to do this action on this resource?"
- "Did the user consent to receive this kind of message?"
- "If this gets breached, which GDPR / SOC2 / HIPAA controls did we violate?"
- "What was the policy at this point in time 6 months ago?"

Centralizing these into one platform gives every service the same answer with the same evidence, and gives you one audit trail to satisfy regulators.

---

## The four services

| Service | Port | Job | Audience |
|---|---|---|---|
| **policy-os** | 4254 | Universal policy registry, evaluation, simulation, audit, webhooks, analytics | Every service that makes an "is X allowed?" decision |
| **compliance-engine** | 4261 | Regulatory framework mapping (GDPR, SOC2, HIPAA, PCI-DSS, ISO27001), evidence, attestations, readiness snapshots | Security/compliance officers, auditors |
| **consent-engine** | 4262 | User consent capture, purpose binding, withdrawal, check-before-use | Any service that touches user data for any purpose |
| **flow-orchestrator** | 4244 | Multi-step plan execution with **fail-CLOSED** policy integration (calls policy-os) | Workflow authors, automation engineers |

Each service is independently deployable and uses the shared `PersistentStore` so on-disk state survives restarts. Each one ships a graceful-shutdown handler that flushes pending writes before exiting.

---

## Design principles

### 1. Fail-CLOSED by default

If a service can't reach policy-os, or finds no matching policy, or hits a malformed expression, or can't verify consent, the answer is **deny**, with an explicit reason. Every deny is auditable. This is the only safe default for governance code.

### 2. One audit trail, many views

Every state change in the platform produces an `audit` entry. The same audit log powers:
- The `/api/audit` endpoint for forensic queries
- The webhook delivery pipeline for real-time event subscribers
- The `/api/analytics/*` counters for dashboards

### 3. Per-purpose consent

Consent is bound to a *purpose string* (`marketing.email`, `fraud.scoring`, `personalization.recommendations`, …), not a checkbox. If your service needs consent for a purpose that isn't in the predefined list, the engine accepts it but logs the undefined purpose. The `description` field for known purposes is filled in automatically.

### 4. Composition over monolith

Policies can be composed (`anyOf` / `allOf` / majority) so a "release to production" decision can be the composition of "code reviewed" + "tests passed" + "security signed off" — without hardcoding AND/OR logic into one mega-policy.

### 5. Time-bounded everything

Policies have `effectiveFrom` / `effectiveUntil`. A policy that's not yet effective is treated as if it doesn't exist (fail-closed). Attestations have `validUntil`. This lets you schedule, expire, and rotate governance without manual cleanup.

### 6. Schema validation at the edge

Every write hits `validatePolicyBody` (or the equivalent for evidence/attestation/consent) before it touches storage. Bad data is rejected with a 400 + structured error array — no silent corruption.

---

## What's in this release

### PolicyOS v1.3
- 9 policy categories (security, business, commerce, ai, financial, privacy, memory, twin, skill)
- 5 approval strategies (single, multi, sequential, parallel, emergency)
- Rule-based evaluation with custom AST-based expression evaluator (no `eval`, no `new Function`)
- **Composition** via `anyOf` / `allOf` / `majority`
- **Time-bounds** (effectiveFrom / effectiveUntil)
- **Webhooks** with HMAC-SHA256 signature on every delivery
- **Analytics**: per-policy allows/denies, top denial reasons, 30-day time series
- **Bulk operations**: create many policies in one call, bulk-publish
- **Schema validation** for all writes + standalone `POST /api/policies/validate`
- **Hard delete** via `?hard=true` for admin/test cleanup
- Graceful shutdown that flushes PersistentStore on SIGTERM/SIGINT
- 1551 LOC

### Compliance Engine v1.0
- 5 pre-loaded frameworks with 32 controls total: GDPR (10), SOC2 (7), HIPAA (4), PCI-DSS (6), ISO27001 (5)
- **Policy mapping**: which internal policy covers which external control
- **Evidence** records (config snapshots, audit logs, screenshots) linked to a control
- **Attestations** with `validUntil` and revocations
- **Coverage** report: which controls are mapped vs gaps, with severity weighting
- **Snapshot** per framework: full readiness score + per-control status (attested / evidence-pending / mapped / uncovered)
- 430 LOC

### Consent Engine v1.0
- Predefined purpose catalog (11 purposes, including the GDPR/CCPA standards)
- Grant + single-withdraw + bulk-withdraw-all-for-purpose
- `/api/check` is the **only** endpoint most services need
- **Fail-closed**: no record = deny, expired = deny
- Per-subject summary
- 320 LOC

### Flow Orchestrator v1.0
- Plan creation, versioning, rollback
- Execution with feedback collection + learning endpoints
- Templates for reusable patterns
- Analytics: plans, steps, bottlenecks
- **Fail-closed by default** (POLICY_FAIL_MODE env var)
- `/api/policy-cache` for hot-path policy decisions
- 1461 LOC

### Governance SDK (`@rtmn/shared/lib/governance-sdk`)
- One import, one client, all four services
- Fail-closed network handling (timeout / connection error → ok:false → caller must deny)
- Per-service token support
- 9-call smoke test verifies evaluate / validate / checkConsent / recordEvidence / frameworkSnapshot

---

## Reliability characteristics

| Property | Implementation |
|---|---|
| State survives restarts | All services use `PersistentStore` (file-backed JSON with async write queue) |
| Clean shutdown | SIGTERM/SIGINT handlers in all 4 services flush pending writes before exit |
| Hot-path latency | policy-os evaluate: ~10-15ms p50, ~50ms p99 (with in-memory cache) |
| Load test | 32 RPS sustained via bash+curl, 79ms avg latency, 100% success — `tests/load.test.sh` |
| Backpressure | `express-rate-limit` on writes (default 20/min) and evaluates (default 100/min) |
| Security headers | Helmet with strict CSP, HSTS, cross-origin isolation |
| Audit durability | Audit entries written synchronously to JSONL + rotated to archives when over AUDIT_MAX |

---

## What this release does NOT cover

- **Identity & roles** live in CorpID — policy-os has its own internal `roles` + `api-keys` for service-to-service, but user identity is verified via the `X-Service-Token` / `Bearer` / `X-API-Key` headers at the edge
- **Realtime pub-sub** for policy changes: webhooks are the only delivery channel. If you need streaming, a future Kafka/Redis pub-sub adapter is straightforward.
- **Per-tenant isolation**: all policies and consents are global. If you need tenant scoping, prefix policy IDs / consent subjects with the tenant ID and filter at the call site.
- **Encrypted at rest**: state lives in plain JSON on disk. Wrap the data directory with file-level encryption (LUKS / eCryptfs) if that's a concern.

---

## Next phases (not in this release)

| Phase | What | Why |
|---|---|---|
| 9 | **Policy DSL** | Let policy authors write `IF user.role == 'manager' AND amount > 1000 THEN require_approval` in a small typed DSL, compile to the existing rule shape |
| 10 | **Streaming analytics** | Per-second allow/deny counters + WebSocket dashboard |
| 11 | **Multi-region replication** | Mirror state across regions with CRDTs for consent, last-writer-wins for policies |
| 12 | **OPA-compatible import** | Read existing Rego policies and translate to our rule format |

---

## See also

- [API.md](./API.md) — full endpoint reference
- [INTEGRATION.md](./INTEGRATION.md) — recipes for common integrations
- [TESTS.md](./TESTS.md) — what we test and how to run it
- [policy-os README](../../platform/flow/policy-os/)
- [compliance-engine README](../../platform/flow/compliance-engine/)
- [consent-engine README](../../platform/flow/consent-engine/)
