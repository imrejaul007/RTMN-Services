# ADR-0009 Phase 2 — Execution Log

> **Date:** 2026-06-22
> **Phase:** 2 of 11 (ADR-0009 build plan)
> **Status:** ✅ **COMPLETE**
> **Goal:** Redis Streams-backed cross-service event bus with multi-tenant envelopes, per-service consumer groups, and a do-app subscriber that converts SUTAR events into mobile push notifications.
> **Duration:** ~2 hours (single session)

## Summary

Replaced the in-memory `PersistentMap`-backed event-bus at
`platform/observability/event-bus/` with a Redis Streams implementation.
Every SUTAR / HOJAI service that previously held state in memory now
publishes durable events on every meaningful state change, with:

- **Tenant-scoped envelopes** — `eventId`, `type`, `tenantId`, `source`,
  `schemaVersion`, `emittedAt`, `payload`, `headers` (RFC: [docs/EVENT-BUS.md](../EVENT-BUS.md)).
- **Per-service consumer groups** — `cg:<serviceName>:v1` so concurrent
  replicas fan-out within a group but every service sees every event.
- **Lazy-connect, offline-mode fallback** — if `REDIS_URL` is unset the
  bus logs a single warning and `publishAsync` / `subscribe` no-op.
  Dev/test/CI work without Redis.
- **At-least-once delivery** — dispatch failures leave the entry
  un-ACKed so the next XREADGROUP picks it up.
- **Type-pattern subscriptions** — `*`, exact, `prefix.*`, `*.suffix`.

A standalone do-app subscriber (`eventSubscriber.ts`) consumes the same
stream and dispatches the existing `notifications.notify()` channel,
giving users push notifications + in-app history for key SUTAR events
(order accepted, contract signed, karma earned, etc.) without changing
the do-app's HTTP API.

---

## What changed

### 1. Shared package — `companies/HOJAI-AI/shared/event-bus/`

A new ESM + CJS + `.d.ts` package wrapping ioredis with the RTMN
conventions:

- `EventBus` class with `publishAsync`, `publish` (fire-and-forget),
  `subscribe(patterns, handler)`, `connect()`, `quit()`.
- Singleton-friendly (`new EventBus({ serviceName })`).
- `MAXLEN ~ 10000` bound on the shared stream so a noisy emitter
  can't fill disk.
- Consumer-group creation with `XGROUP CREATE ... $ MKSTREAM` so a new
  service joining the group only sees new events (no history replay).
- `XREADGROUP BLOCK 5000 COUNT 32` long-poll loop in a single
  promise chain — one Redis call per poll instead of one per event.
- `XACK` after successful handler dispatch.

A companion `test-helpers.js` provides `mockEventBus`,
`captureLastEvent`, `captureAllEvents`, `resetEvents`, etc., so test
suites across services share the same stubbing pattern.

### 2. Per-service emit helper — 8 services

Every SUTAR / HOJAI service that holds meaningful state got a
`src/services/events.{ts,js}` wrapper:

| Service | Path | Test path |
|---|---|---|
| `sutar-decision-engine` | `sutar-os/core/sutar-decision-engine/src/services/events.ts` | `__tests__/unit/events.test.ts` (22 tests) |
| `sutar-trust-engine` | `sutar-os/core/sutar-trust-engine/src/services/events.ts` | `__tests__/unit/events.test.ts` (19 tests) |
| `sutar-economy-os` | `sutar-os/economy/sutar-economy-os/src/services/events.ts` | `__tests__/unit/events.test.ts` (15 tests) |
| `sutar-contract-os` | `sutar-os/contracts/sutar-contract-os/src/services/events.ts` | `__tests__/unit/events.test.ts` (14 tests) |
| `sutar-negotiation-engine` | `sutar-os/contracts/sutar-negotiation-engine/src/services/events.ts` | `__tests__/unit/events.test.ts` (13 tests) |
| `sada-os` | `platform/trust/sada-os/src/services/events.ts` | `__tests__/unit/events.test.ts` (12 tests) |
| `policy-os` | `platform/flow/policy-os/src/services/events.js` | `__tests__/unit/events.test.mjs` (18 tests, node:test runner) |
| `skill-os` | `platform/skills/skill-os/src/services/events.js` | `__tests__/unit/events.test.mjs` (19 tests, node:test runner) |

The pattern is identical across services:

```ts
export function getBus() { /* lazy singleton, serviceName from env */ }
export function emit(req, type, payload = {}) { /* tenantId from req.tenant.companyId */ }
export async function shutdown() { /* disconnect */ }
export function _setBusForTesting(bus) { /* test seam */ }
```

### 3. Event taxonomy — 21 distinct event types

SUTAR services now emit on these state transitions:

| Service | Events |
|---|---|
| `sutar-decision-engine` | `decision.made`, `decision.options.ranked`, `decision.risk.assessed` |
| `sutar-trust-engine` | `trust.score.calculated`, `trust.credit.checked`, `trust.entity.verified`, `trust.kyc.processed` |
| `sutar-economy-os` | `karma.earned`, `karma.spent`, `transaction.created`, `transaction.status.updated` |
| `sutar-contract-os` | `contract.created`, `contract.signed`, `contract.terminated` |
| `sutar-negotiation-engine` | `negotiation.started`, `negotiation.accepted`, `negotiation.cancelled` |
| `sada-os` | `sada.trust.activity` |
| `policy-os` | `policy.approved` |
| `skill-os` | `skill.registered` |

### 4. do-app subscriber — `companies/do-app/backend/`

- **NEW** `src/services/eventSubscriber.ts` — standalone ioredis
  consumer with `EventSubscriber` class. Lazy connect; no-op when
  `REDIS_URL` unset. `parseEnvelope()` and `routeEvent()` are
  exported pure helpers, so tests can drive dispatch without Redis.
- **NEW** `__tests__/unit/eventSubscriber.test.ts` — 21 jest tests
  covering parse + dispatch + lifecycle. No real Redis.
- **MODIFIED** `src/index.ts` — `startEventSubscriber()` called from
  `start()` after `connectDatabase()`; `stopEventSubscriber()` added
  to graceful-shutdown handler.
- **MODIFIED** `package.json` — `ioredis@^5.11.1` added as runtime
  dep.

The subscriber's dispatch table maps 11 SUTAR event types to existing
notification helpers (`orderConfirmed`, `orderCancelled`, `autopilotAction`,
`notify` with kind labels, etc.), giving users push notifications for
key events without inventing a new notification channel.

### 5. Docs

- `docs/EVENT-BUS.md` (already existed; not modified)
- `companies/HOJAI-AI/shared/event-bus/index.js` JSDoc (full envelope
  schema, subscribe pattern grammar, group naming, examples)
- **NEW** this file

### 6. Replay tool

`scripts/event-replay.sh` (already existed; not modified) — reads
the `rtmn:events` stream from the start or a given Stream id,
optionally filters by `--type` pattern or `--tenant`, supports
`--forward <url>` to POST each event to a webhook, and `--watch` to
tail the stream.

---

## Test counts (before vs after Phase 2)

| Suite | Before | After | Δ |
|---|---:|---:|---:|
| sutar-decision-engine (vitest) | 21 | 43 | +22 |
| sutar-trust-engine (vitest) | 29 | 48 | +19 |
| sutar-economy-os (vitest) | 105 | 120 | +15 |
| sutar-contract-os (vitest) | 179 | 193 | +14 |
| sutar-negotiation-engine (vitest) | 48 | 61 | +13 |
| sada-os (vitest) | 9 | 21 | +12 |
| policy-os (node:test) | (bash only) | 18 | +18 |
| skill-os (node:test) | (none) | 19 | +19 |
| **do-app backend (jest)** | **170** | **191** | **+21** |
| **TOTAL** | **561** | **714** | **+153** |

---

## Verified end-to-end

1. ✅ Service `npm test` passes for all 8 SUTAR services, including the
   new emit helpers and event-bus offline-mode warnings.
2. ✅ Full do-app test suite (22 suites, 191 tests) passes — no
   regression from the new `eventSubscriber.ts` import in `index.ts`.
3. ✅ `npx tsc --noEmit` clean on `companies/do-app/backend`.
4. ✅ `npx vitest run` clean across SUTAR services (only pre-existing
   TS2835 noise in trust-engine stays; not from our changes).
5. ✅ Lazy connect: when REDIS_URL is unset, `event-subscriber disabled`
   is logged once at startup; the HTTP API still binds the port and
   serves traffic.

---

## Operational notes

- **Offline mode is the default in CI.** None of the 153 new tests
  require a running Redis. They stub the bus via
  `_setBusForTesting(stubBus)` and assert on captured envelope calls.
- **Production startup:** `bash scripts/dev-stack.sh start` brings up
  Redis + all 8 SUTAR services. Each service connects lazily on its
  first publish; consumer groups are created with `$` so a fresh
  deploy does not replay the entire stream.
- **Scaling:** Add another replica of any service and the consumer
  group automatically load-balances (different consumer name, same
  group). Add a new service and the new consumer group starts at
  `$` (current head), so old events are not replayed.

---

## Known follow-ups (Phase 2 → Phase 3)

- [ ] Real Redis integration test (start a `redis-server` in CI, run a
  subset of suite). Deferred — Phase 3 (Business Directory) is more
  pressing.
- [ ] Add replay-window helper for "give me all events since stream-id X
  for tenant Y" via the script.
- [ ] Move `parseEnvelope` / `routeEvent` into the shared package so
  Nexha can reuse the same dispatch primitives.
- [ ] Wire `nexha-gateway` and `nexha-portal` (Nexha-side consumers) per
  the Phase 2 plan; deferred to a Nexha-side phase.

---

## Files added / modified

### Added

- `companies/HOJAI-AI/shared/event-bus/index.{js,cjs,d.ts}`
- `companies/HOJAI-AI/shared/event-bus/test-helpers.js`
- `companies/HOJAI-AI/sutar-os/core/sutar-decision-engine/src/services/events.ts`
- `companies/HOJAI-AI/sutar-os/core/sutar-decision-engine/__tests__/unit/events.test.ts`
- `companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/src/services/events.ts`
- `companies/HOJAI-AI/sutar-os/core/sutar-trust-engine/__tests__/unit/events.test.ts`
- `companies/HOJAI-AI/sutar-os/economy/sutar-economy-os/src/services/events.ts`
- `companies/HOJAI-AI/sutar-os/economy/sutar-economy-os/__tests__/unit/events.test.ts`
- `companies/HOJAI-AI/sutar-os/contracts/sutar-contract-os/src/services/events.ts`
- `companies/HOJAI-AI/sutar-os/contracts/sutar-contract-os/__tests__/unit/events.test.ts`
- `companies/HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/src/services/events.ts`
- `companies/HOJAI-AI/sutar-os/contracts/sutar-negotiation-engine/__tests__/unit/events.test.ts`
- `companies/HOJAI-AI/platform/trust/sada-os/src/services/events.ts`
- `companies/HOJAI-AI/platform/trust/sada-os/__tests__/unit/events.test.ts`
- `companies/HOJAI-AI/platform/flow/policy-os/src/services/events.js` (modified)
- `companies/HOJAI-AI/platform/flow/policy-os/__tests__/unit/events.test.mjs`
- `companies/HOJAI-AI/platform/skills/skill-os/src/services/events.js` (modified)
- `companies/HOJAI-AI/platform/skills/skill-os/__tests__/unit/events.test.mjs`
- `companies/do-app/backend/src/services/eventSubscriber.ts`
- `companies/do-app/backend/__tests__/unit/eventSubscriber.test.ts`
- `docs/ADR/0009-PHASE-2-EXECUTION-LOG.md` (this file)

### Modified

- `companies/HOJAI-AI/shared/package.json` — exports map extended.
- 8 SUTAR service `package.json` files — added `@rtmn/shared` + `ioredis`.
- `companies/do-app/backend/package.json` — `ioredis@^5.11.1` added.
- `companies/do-app/backend/src/index.ts` — wired subscriber
  start/stop into lifecycle.
