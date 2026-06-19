# Division 10 — AI Developer Platform

> **Status:** 🟡 ~40% built (API gateway + GraphQL exist; SDKs/CLI/Sandbox are missing)
> **Owner:** HOJAI AI Developer Experience team

---

## 1. Mission

**For developers and partners.** Make it trivial to build on top of HOJAI AI. APIs, SDKs, CLI, sandbox, webhooks, observability, billing APIs, connector framework.

## 2. Target State (per plan)

```
Developer Platform
├── API Platform           (REST + GraphQL, versioning, OpenAPI)
├── SDKs                   (TypeScript, Python, Go, Java, Ruby)
├── CLI                    (one CLI to manage everything)
├── Plugin Framework       (extensibility for 3rd parties)
├── Authentication         (OAuth, API keys, mTLS)
├── Webhooks               (event subscriptions)
├── Documentation          (auto-generated, interactive)
├── Sandbox                (free test environment)
├── Billing APIs           (usage, invoices, subscriptions)
├── Connector Framework    (build pre-built integrations to other SaaS)
└── Observability APIs     (logs, metrics, traces for consumers)
```

## 3. Current State — What's Built

| Capability | Service | Port | State |
|---|---|---|---|
| **API Platform** (REST + proxy) | [./services/api-gateway/](../services/api-gateway/) | 4000 | ✅ Real |
| **GraphQL Federation** | [./services/graphql-federation/](../services/graphql-federation/) | 4000 | ✅ Real |
| **Unified OS Hub** (cross-OS routing) | [./services/unified-os-hub/](../services/unified-os-hub/) | 4399 | ✅ Real |
| **Onboarding Portal** (client self-service) | [./services/onboarding-portal/](../services/onboarding-portal/) | — | ✅ Real |
| **Pilot Onboarding** (signup, verify, payment) | [./services/pilot-onboarding/](../services/pilot-onboarding/) | 4399 | ✅ Real |
| **Agent SDK** (basic, RTMN-branded) | (embedded in agent-orchestration) | — | 🟡 Partial |
| **Authentication** | [./services/corpid-service/](../services/corpid-service/) | 4702 | ✅ Real |

## 4. What's NOT Built

| Missing | Why It Matters | Effort |
|---|---|---|
| **SDKs** (TypeScript, Python, Go) | Critical for 3rd-party adoption | 4-6 weeks per language |
| **CLI** | Developer ergonomics | 4-6 weeks |
| **Sandbox** (free test env) | Lower barrier to try HOJAI | 2-4 weeks |
| **Webhooks** | Event subscriptions for partners | 2-4 weeks |
| **Plugin Framework** | 3rd-party extensibility | 8-12 weeks |
| **Connector Framework** | Pre-built integrations (Salesforce, HubSpot, etc.) | 8-12 weeks |
| **Auto-generated Interactive Docs** (OpenAPI + GraphQL Playground) | Critical for DX | 1-2 weeks |
| **Billing APIs** (usage, invoices for customers) | Monetization | 4-6 weeks |
| **Observability APIs** (logs/metrics/traces for consumers) | Customer trust | 4-6 weeks |

## 5. Gap Score

**~40% of target state is built.** The API layer is solid. SDKs, CLI, sandbox, webhooks — none of it.

## 6. Gap List (Priority Ordered)

| # | Missing | Priority | Effort |
|---|---|---|---|
| 1 | **TypeScript SDK** | 🔴 P0 | 4-6 weeks — most common stack |
| 2 | **Python SDK** | 🔴 P0 | 4-6 weeks — AI/ML community |
| 3 | **CLI** | 🟡 P1 | 4-6 weeks |
| 4 | **Sandbox** | 🟡 P1 | 2-4 weeks |
| 5 | **Auto-generated API docs** | 🟡 P1 | 1-2 weeks |
| 6 | **Webhooks** | 🟡 P1 | 2-4 weeks |
| 7 | **Billing APIs** (customer-facing) | 🟡 P1 | 4-6 weeks |
| 8 | **Go SDK** | 🟢 P2 | 4-6 weeks |
| 9 | **Connector Framework** | 🟢 P2 | 8-12 weeks |
| 10 | **Observability APIs** | 🟢 P2 | 4-6 weeks |
| 11 | **Plugin Framework** | 🟢 P2 | 8-12 weeks |
| 12 | **Java SDK** | 🟢 P3 | 4-6 weeks |
| 13 | **Ruby SDK** | 🟢 P3 | 4-6 weeks |

## 7. Dependencies

- **Depends on:** Division 1 (auth, API gateway), Division 4 (agents are consumed via SDKs)
- **Blocks:** Division 11 (marketplace needs SDKs for 3rd-party listings)

## 8. Open Questions

- **SDK languages:** Your plan lists 5 (TS, Python, Go, Java, Ruby). Realistic v1 = 2 (TS + Python). Java/Ruby can come later.
- **CLI scope:** Should it just be a wrapper around the API, or a powerful tool for managing agents/workflows locally?
- **Sandbox data:** Does sandbox reset daily, or is it persistent? Affects billing model.
- **Webhook delivery:** At-least-once or exactly-once? Affects idempotency requirements on consumers.
- **Open-source the SDKs?** Many AI companies open-source their SDKs for adoption. Consider.

---

*See also: [./services/api-gateway/CLAUDE.md](../services/api-gateway/CLAUDE.md), [./services/graphql-federation/CLAUDE.md](../services/graphql-federation/CLAUDE.md), [./services/unified-os-hub/CLAUDE.md](../services/unified-os-hub/CLAUDE.md)*