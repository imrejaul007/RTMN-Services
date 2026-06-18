# Division 1 — AI Foundation

> **Status:** 🟢 ~70% built
> **Owner:** Platform team (currently distributed across `/services/` and `industry-os/`)

---

## 1. Mission

Everything required to **run** AI at all. Identity, auth, gateway, eventing, monitoring, billing. Every other division depends on this layer.

## 2. Target State (per plan)

```
AI Foundation
├── Identity          (CorpID — universal identity for every AI actor, agent, tenant)
├── Security          (network policies, mTLS, secret rotation)
├── Authentication    (JWT, OAuth, API keys, mTLS for service-to-service)
├── Authorization     (RBAC, ABAC, per-tenant scoping)
├── API Gateway       (routing, rate limiting, request shaping)
├── Event Bus         (pub/sub, streaming, event sourcing)
├── Context Engine    (request-scoped context propagation)
├── Feature Flags     (gradual rollout, kill switches, A/B)
├── Secrets Manager   (API keys, DB creds, model keys, rotation)
├── Monitoring        (metrics, traces, logs, SLOs)
├── Logging           (structured, queryable, audit-grade)
├── Billing           (Stripe + per-tenant metering)
└── Tenant Manager    (orgs, projects, RBAC scoping)
```

## 3. Current State — What's Built

| Capability | Service | Port | State |
|---|---|---|---|
| Identity | [services/corpid-service/](../../../services/corpid-service/) | 4702 | ✅ Real (running, v4.0) |
| API Gateway | [services/api-gateway/](../../../services/api-gateway/) | 4000 | ✅ Real (gateway + proxy) |
| Event Bus | [services/event-bus/](../../../services/event-bus/) | 4751 | ✅ Real (running, pub/sub) |
| GraphQL Federation | [services/graphql-federation/](../../../services/graphql-federation/) | 4000 | ✅ Real |
| Billing | [services/billing/](../../../services/billing/) | — | ✅ Real (Stripe integrated) |
| Monitoring / Logs | (cross-cutting, in individual services) | — | 🟡 Partial (each service has its own logger, no central observability) |
| Onboarding | [services/onboarding-portal/](../../../services/onboarding-portal/) + [services/pilot-onboarding/](../../../services/pilot-onboarding/) | 4399 | ✅ Real |
| Unified Hub (gateway) | [services/unified-os-hub/](../../../services/unified-os-hub/) | 4399 | ✅ Real (cross-OS router) |

## 4. Gap Score

**~70% of target state is built.** The core "identity + gateway + events + billing" loop is operational. The gaps are in **cross-cutting concerns** (monitoring, logging, secrets, feature flags) which are still per-service rather than platform-level.

## 5. Gap List (Priority Ordered)

| # | Missing | Priority | Estimated Effort |
|---|---|---|---|
| 1 | **Centralized observability** (metrics + tracing + log aggregation) | 🔴 P0 | 2-3 weeks — adopt OpenTelemetry, ship a collector |
| 2 | **Secrets Manager** (Vault or AWS Secrets Manager) | 🔴 P0 | 1 week — most services use `.env` files today |
| 3 | **Feature Flag service** | 🟡 P1 | 2 weeks — needed for safe rollouts of AI model changes |
| 4 | **Context Engine** (request-scoped propagation) | 🟡 P1 | 3 weeks — needed for multi-agent context |
| 5 | **Tenant Manager** (multi-tenant data isolation) | 🟡 P1 | 4 weeks — needed before any B2B offering |
| 6 | **RBAC + ABAC layer** on top of CorpID | 🟢 P2 | 3 weeks — extends CorpID |
| 7 | **mTLS service-to-service** | 🟢 P2 | 2 weeks — security hardening |

## 6. Dependencies

- **Blocks:** Every other division depends on Foundation.
- **Depends on:** Nothing. This is the bottom of the stack.

## 7. Open Questions

- **Auth model for AI agents:** Should agents have their own identities (separate from users), or act on behalf of a user/org? Affects CorpID + RBAC design.
- **Per-tenant model keys:** Does each tenant get their own OpenAI/Anthropic API key, or is it pooled? Affects Billing + Secrets Manager.
- **Region strategy:** Single-region (cheaper) or multi-region (compliance + latency)? Affects API Gateway, Event Bus, all databases.

---

*See also: [services/corpid-service/CLAUDE.md](../../../services/corpid-service/CLAUDE.md), [services/api-gateway/CLAUDE.md](../../../services/api-gateway/CLAUDE.md)*