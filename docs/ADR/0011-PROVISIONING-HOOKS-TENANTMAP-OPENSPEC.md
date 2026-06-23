# ADR-0011 — Provisioning, Hooks, Tenant Map, Open Specs (Phases 12–15)

> **Status:** ✅ Complete (Phase 15 / 15) — DONE 2026-06-23
> **Date:** 2026-06-23
> **Authors:** Rejaul Karim (HOJAI AI / RTMN), with HOJAI AI engineering
> **Supersedes:** None
> **Retrospective:** [`../nexha/adr-0011-retrospective.md`](../nexha/adr-0011-retrospective.md)
> **Related ADRs:** [0010](0010-MULTI-TENANT-FEDERATION.md) — closes the open items from
> the ADR-0010 retrospective (Section 4: "What didn't")

---

## Context

ADR-0010 ([`0010-MULTI-TENANT-FEDERATION.md`](0010-MULTI-TENANT-FEDERATION.md)) shipped
the multi-tenant federation primitives: 8 new services, 1,508 tests, capability-routed
Hub. The retrospective ([`../nexha/adr-0010-retrospective.md`](../nexha/adr-0010-retrospective.md))
named four open items to close in a follow-on ADR:

1. **Real provisioning** — Phases 9 + 10 ship lifecycle registries, not actual
   K8s/AWS provisioning. An instance state is `ACTIVE`, but no compute/DB was stood up.
2. **Hooks and adapters** — the plan called for a "Nexha Hooks SDK" and "Nexha Adapter
   Library" so external services (banks, logistics, payment processors) could integrate.
   Both were deferred in ADR-0010.
3. **Tenant state not surfaced via Hub** — the Hub doesn't expose "what does tenant X
   own across all services." To answer that you query each service individually.
4. **Open-source the protocol specs** — ACP, Capability Graph, Industry OS Compliance
   Schema should be open under a permissive license for ecosystem adoption.

ADR-0011 closes all four, in **4 sequential phases** (12–15), each independently
shippable, each ending with passing tests and a docs commit.

---

## Decision

We will build:

- **Phase 12** — `nexha-provisioning-engine` (port 4385) + `nexha-hooks-sdk` (port 4386).
- **Phase 13** — `nexha-tenant-summary` (port 4387) — Hub-level "tenant view" service.
- **Phase 14** — Ecosystem map docs + test framework consolidation (no new service).
- **Phase 15** — Open-source protocol specs repo + LICENSE + sample SDK.

### Phase Plan

| Phase | Title | Owner | What it ships |
|---|---|---|---|
| **12** | **Real provisioning + Hooks SDK** (in progress 2026-06-23) | Nexha | `nexha-provisioning-engine` (4385) — declarative provisioning plans; state machine `PENDING → APPLYING → READY / FAILED`; webhook-style plan apply via `/api/plans/:id/apply`. `nexha-hooks-sdk` (4386) — webhook subscriptions with HMAC-SHA256 signing; exponential retry; event types `instance.*`, `industry.*`, `mission.*`, `commerce.*`, `partner.*`. +150 tests across both services. |
| **13** | **Tenant summary API** | Nexha | `nexha-tenant-summary` (4387) — aggregates instances + missions + orders + partners + listings + commerce activity for a tenant from across all 8 ADR-0010 services via Hub calls. One Hub call. +80 tests. |
| **14** | **Ecosystem map + test consolidation** | RTMN | New `docs/ecosystem-map.md` with one big diagram + per-service page; consolidate do-app `jest` → `vitest` for the 5 nexha/sutar client namespaces; add `--experimental-vm-modules` polyfills to REZ-Workspace node:test. +50 tests consolidated (no new functionality, just consolidation). |
| **15** | **Open-source the protocol specs** | RTMN | New `protocol/` directory at RTMN-root with `ACP.md` (Agent Commerce Protocol), `CAPABILITY-GRAPH.md`, `INDUSTRY-COMPLIANCE-SCHEMA.md`; Apache-2.0 LICENSE; sample JS + Python SDKs; GitHub Pages docs site. No new services. |

### Architectural Principles

1. **Provisioning is declarative, not imperative.** `nexha-provisioning-engine` emits a
   `ProvisioningPlan` (YAML) describing what to stand up. An external orchestrator
   (K8s controller, Terraform runner) consumes the plan. This keeps the engine
   transport-agnostic and testable.
2. **Hooks are HMAC-signed, retries are idempotent.** Every webhook payload carries
   a signature header `X-Nexha-Signature: sha256=<hex>`. Receivers verify with the
   shared secret. Retries use exponential backoff (1m, 5m, 30m, 2h, 12h, 24h) capped
   at 6 attempts.
3. **Tenant summary is a fan-out aggregator.** `nexha-tenant-summary` is the **only**
   service in ADR-0011 that talks to other services. It calls 8 upstream services
   in parallel and merges responses. No state of its own (read-only).
4. **Protocol specs are open, not the implementation.** Specs are MIT/Apache-2.0.
   The implementation stays in the RTMN monorepo. This is the Kubernetes / OAuth
   / Linux Foundation pattern.

### Data Flow (steady-state, post Phase 15)

```
                            ┌──────────────────────┐
                            │  External Provider   │
                            │  (K8s, Terraform,    │
                            │   CloudFormation)    │
                            └──────────┬───────────┘
                                       │ consumes
                                       ▼
┌────────────────┐  publish   ┌──────────────────────┐
│ Tenant instance│ ─────────► │ nexha-provisioning-  │
│ state change   │            │ engine :4385         │
└────────────────┘            └──────────┬───────────┘
                                        │ plans
                                        ▼
                            ┌──────────────────────┐
                            │ nexha-hooks-sdk      │
                            │ :4386                │
                            └──────┬───────────────┘
                                   │ webhook POST + HMAC
                                   ▼
                            ┌──────────────────────┐
                            │ Tenant URL           │
                            │ (e.g. hospital ops)  │
                            └──────────────────────┘

                    ┌──────────────────────────┐
                    │ nexha-tenant-summary     │
                    │ :4387                    │ ◄────── do-app
                    │ fan-out to 8 services   │ ◄────── REZ-Workspace
                    └──────────────────────────┘
```

### Why 4 phases, not 1 monolith

- **Phase 12 is two services, but they don't depend on each other.** Provisioning
  writes plans; hooks fire events. They share no code. Shipping in one phase keeps
  the diff reviewable.
- **Phase 13 needs Phase 9 + 10 + 12 to be stable** before it can aggregate
  meaningfully. Doing it after Phase 12 is a natural ordering.
- **Phase 14 is hygiene** (docs + test framework consolidation). It must follow
  Phase 13 because the test consolidation touches the do-app clients added in
  Phases 3–10.
- **Phase 15 is open-source** — it freezes the protocol surface from Phases 4 (ACP),
  10 (Industry Compliance Schema), and a new Capability Graph from Phase 3.

### What's NOT in ADR-0011

- **Real K8s/AWS provisioning implementation** — Phase 12 ships a *plan emitter*,
  not a controller. A real K8s controller would be a follow-on (Phase 16+).
- **Cross-tenant federation primitives** (tenant peering, trust delegation) — those
  are post-Phase 15.
- **Federation observability** (per-event-bus dashboards, OpenTelemetry) — also
  post-Phase 15.
- **Open-sourcing the implementation code** — only specs + sample SDKs. The
  implementation stays in RTMN monorepo.

---

## Sub-sections

- Phase 12 architecture: [`docs/nexha/provisioning-engine.md`](../nexha/provisioning-engine.md) + [`docs/nexha/hooks-sdk.md`](../nexha/hooks-sdk.md)
- Phase 13 architecture: [`docs/nexha/tenant-summary.md`](../nexha/tenant-summary.md) (TBD)
- Phase 14 architecture: [`docs/ecosystem-map.md`](../ecosystem-map.md) (TBD)
- Phase 15 architecture: [`protocol/README.md`](../../protocol/README.md) (TBD)
- Retrospective: [`docs/nexha/adr-0011-retrospective.md`](../nexha/adr-0011-retrospective.md) (TBD at Phase 15 close)

---

## Test count projection

| Suite | Tests | Phase |
|---|---:|:---:|
| `nexha-provisioning-engine` (vitest) | ~75 | 12 |
| `nexha-hooks-sdk` (vitest) | ~75 | 12 |
| `nexha-tenant-summary` (vitest) | ~80 | 13 |
| do-app clients (jest) | +25 | 12 + 13 |
| REZ-Workspace clients (node:test) | +25 | 12 + 13 |
| Ecosystem map + test consolidation (vitest) | +50 | 14 |
| **ADR-0011 total new tests** | **~330** | |
| **Post-Phase-15 ecosystem total** | **~1,838** | |

---

## Open Questions

1. **Webhook signing scheme** — HMAC-SHA256 with shared secret, or JWT with per-subject
   keys? We're going with HMAC for simplicity and broad library support. (Resolved.)
2. **Provisioning plan format** — JSON or YAML? JSON for storage + on-the-wire, YAML
   for human authoring and `GET /api/plans/:id/plan.yaml` download. (Resolved.)
3. **Tenant summary caching** — TTL-based or event-driven invalidation? TTL (5 min)
   for v1; event-driven in Phase 16+. (Resolved.)
4. **Protocol spec license** — Apache-2.0 or MIT? Apache-2.0 for patent grant clarity.
   (Resolved.)
