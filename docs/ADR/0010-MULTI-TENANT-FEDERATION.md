# ADR-0010 — Multi-Tenant Federation (RTMN ↔ SUTAR ↔ Nexha)

> **Note:** This ADR was originally numbered ADR-0009 in early drafts, then
> was renumbered to ADR-0010 to avoid colliding with the existing
> `0009-PHASE-WISE-UPGRADE-PLAN.md` which is the canonical "Phase 0-1 move"
> ADR. ADR-0010 is the follow-on "Phase 2+ federation" ADR.

**Status:** In Progress (Phase 5 / 11)
**Date:** 2026-06-22
**Authors:** Rejaul Karim (HOJAI AI / RTMN), with HOJAI AI engineering
**Supersedes:** None
**Related ADRs:** [0008](0008-nexha-os-real-services.md), [0009](0009-PHASE-WISE-UPGRADE-PLAN.md)

---

## Context

The RTMN ecosystem has grown to three distinct but federating layers:

| Layer | Owner | Role |
|---|---|---|
| **RTMN** | RTMN root (monorepo) | Unified Hub, Industry OS, Department OS, Consumer apps |
| **HOJAI AI / SUTAR OS** | HOJAI AI (submodule) | Autonomous economic infrastructure (AI agents, contracts, reputation) |
| **Nexha** | Nexha (subfolder in monorepo) | Real-world commerce network (suppliers, warehouses, distributors, pricing) |

Until June 22 2026, every SUTAR / Nexha capability was a **stub** behind an L1 `procurement-os` / `distribution-os` facade on the Hub. There was **no shared business directory**, **no trust linkage between SUTAR agents and Nexha companies**, **no per-tenant isolation**, and **no standardized way** for an external consumer (do-app, REZ-Workspace, mobile) to find a real supplier or partner.

Worse, the L1 stubs were duplicates of services that already lived in `companies/Nexha/services/`, and the SUTAR trust engine had no public read path, so external callers could not consume trust scores at all.

## Decision

We will build a **federated, multi-tenant business directory** spanning all three layers, in **11 sequential phases** — each one independently shippable, each one ending with passing tests and a doc commit. The directory will be the canonical "source of truth" for:

- Who is a registered company (nexha)?
- Who is a registered AI agent (sutar twin)?
- What capabilities does each entity claim?
- What is the public trust score (from SADA)?

…all reachable from **one Hub URL** (`http://localhost:4399/api/nexha/nexha-business-directory/...`).

### Phase Plan

| Phase | Title | Owner | What it ships |
|---|---|---|---|
| **0** | Repo reshape (done 2026-06-22) | Nexha | Move 5 real nexha-* services out of HOJAI-AI into `companies/Nexha/services/`. Drop 3 L1 stubs. |
| **1** | Hub de-aliasing (done 2026-06-22) | RABTUL | Remove 5 sutar-* deprecation aliases from `NEXHA_SERVICES`. Canonical `nexha-*` only. |
| **2** | Event Bus — Redis Streams (done 2026-06-22) | Nexha | `nexha-event-bus` (port 4380). Pub/sub backbone for federation events. |
| **3** | **Business Directory** (done 2026-06-22) | Nexha + HOJAI + RTMN | `nexha-business-directory` (port 4360) — companies + agents + capabilities + trust linkage. Public trust API in SADA. Shared HTTP directory client. Hub wiring. do-app + REZ-Workspace clients. |
| **4** | **ACP-Messaging real impl** (done 2026-06-22) | Nexha + HOJAI + RTMN | `nexha-acp-messaging` (port 4340) — per-tenant Agent Commerce Protocol with persistent negotiation state and message logs. Full state machine (8 message types, 6 statuses). do-app + REZ-Workspace clients. |
| **5** | **Agent Marketplace** (done 2026-06-22) | HOJAI AI | `marketplace-listings` (port 4250) — per-tenant Mongo-backed listings + reviews + directory linkage. Replaces in-memory `sutar-marketplace`. Hub wired. do-app + REZ-Workspace clients. |
| **6** | Mission Planner | HOJAI AI | Cross-tenant mission composition (capability graph → DAG → execution). |
| **7** | Partner Graph | Nexha | "Companies I've transacted with" social graph + recommendation engine. |
| **8** | Commerce Runtime | Nexha | The execution plane: orders, fulfillment, payments, escrow, returns. |
| **9** | Per-Tenant SUTAR Instances | HOJAI AI | Optional: spin up an isolated SUTAR shard per large tenant. |
| **10** | Industry OS Split | RTMN | Per-tenant industry OS instances for regulated industries (healthcare, finance). |
| **11** | Final docs + audit | RTMN | The big ADR retrospective + ecosystem health audit + investor update. |

### Architectural Principles

1. **One URL per concern.** Consumers (do-app, REZ-Workspace) talk to the Hub. The Hub proxies to the right SUTAR / Nexha / Foundation service. No consumer ever talks to an upstream port directly.
2. **One shared directory, two read paths.** HOJAI publishes entities to Nexha directory; the directory reads trust from SADA. Public consumers hit the directory only — they never see SADA internal data.
3. **One tenant boundary.** Every entity (company, agent, mission, contract) carries a `tenantId`. Every API enforces `req.user.tenantId === entity.tenantId`. Internal callers supply `x-internal-token` and may act cross-tenant (audit-logged).
4. **One event backbone.** `nexha-event-bus` (port 4380, Redis Streams) carries `company.registered`, `agent.published`, `trust.updated`, `mission.completed`. Each subscriber is idempotent + retryable.
5. **One trust source.** SADA at port 4190 is the only writer of trust scores. The directory caches the sanitized public view. Consumers never see PII or raw history.
6. **Phased, sequential, shippable.** No phase merges into another. Each phase ends with passing tests and a docs commit. Rollback is per-phase.

### Data Flow (steady-state, post Phase 11)

```
┌──────────────────┐    publish     ┌─────────────────────┐
│ SUTAR Agent Twin │ ─────────────► │                     │
└──────────────────┘                │                     │
┌──────────────────┐    publish     │  nexha-business-    │     read    ┌──────────────┐
│ SUTAR Merchant   │ ─────────────► │  directory :4360    │ ◄────────── │ do-app / RZ  │
└──────────────────┘                │                     │             └──────────────┘
┌──────────────────┐    publish     │  - companies        │
│ Nexha Supplier   │ ─────────────► │  - agents           │     trust   ┌──────────────┐
└──────────────────┘                │  - capabilities     │ ◄────────── │ sada-os :4190│
                                   │  - public_trust     │ (sanitized) └──────────────┘
                                   └──────────┬──────────┘
                                              │ events
                                              ▼
                                   ┌─────────────────────┐
                                   │ nexha-event-bus     │
                                   │ (Redis Streams)     │
                                   └─────────────────────┘
                                              │
                                              ▼
                                   ┌─────────────────────┐
                                   │ Subscribers:        │
                                   │  - sutar-trust-engine│
                                   │  - nexha-pricing    │
                                   │  - analytics        │
                                   └─────────────────────┘
```

## Consequences

### Positive

- External consumers (do-app, REZ-Workspace) can now discover real Nexhas without per-tenant integration code.
- SADA trust scores become first-class public infrastructure, not internal-only.
- Per-tenant isolation becomes the rule, not the exception, baked into every API.
- The Hub becomes a real **federation gateway**, not just a service registry.

### Negative

- 11 phases × multi-repo changes per phase = a lot of work and a lot of commits.
- Each phase adds infrastructure complexity (events, caches, idempotency keys) — operators must learn it.
- Per-tenant isolation can become a bottleneck if every service has its own auth path — mitigated by the shared `@rtmn/shared/auth` lib.

### Risks

| Risk | Mitigation |
|---|---|
| Tenant data leaks across boundaries | Every service writes tests that try to read another tenant's data and expects 403/404 |
| SADA public view accidentally leaks PII | Sanitization is a separate module with its own tests (19 unit tests) |
| Event bus becomes a single point of failure | Redis Streams with consumer groups + at-least-once delivery; subscribers must be idempotent |
| Directory becomes a write bottleneck | Write path is fire-and-forget; read path is direct MongoDB query with text index |

## Status Tracking

A short **execution log** is kept at [`docs/nexha/PHASE-LOG.md`](../nexha/PHASE-LOG.md). Each phase lists what shipped, which repos were touched, how many tests were added, and any deviations from the plan.

## References

- [`docs/nexha/`](../nexha/) — per-phase docs, including the execution log
- [`companies/Nexha/services/nexha-business-directory/CLAUDE.md`](../../companies/Nexha/services/nexha-business-directory/CLAUDE.md) — directory service doc
- [`companies/HOJAI-AI/platform/trust/sada-os/CLAUDE.md`](../../companies/HOJAI-AI/platform/trust/sada-os/CLAUDE.md) — SADA trust engine doc
- [`companies/HOJAI-AI/shared/directory-client/CLAUDE.md`](../../companies/HOJAI-AI/shared/directory-client/CLAUDE.md) — shared directory client
- [`companies/RABTUL-Technologies/REZ-ecosystem-connector/CLAUDE.md`](../../companies/RABTUL-Technologies/REZ-ecosystem-connector/CLAUDE.md) — Hub federation gateway doc
