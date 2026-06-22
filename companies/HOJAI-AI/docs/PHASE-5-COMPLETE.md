# TwinOS Phase 5 — Lifecycle, Merge, SSE & Ops Hardening

**Status:** ✅ Complete (2026-06-22)
**Coverage:** 14 of 14 data twins + hub (15 services total)
**Verified by:** `scripts/phase5-smoke-test.sh` (70/70 probes pass) + `scripts/phase5-e2e-test.sh` (full lifecycle flow)

---

## What Phase 5 Adds

Phase 5 brings **operational maturity** to TwinOS: state-machine-aware twins,
first-class merging, real-time event streaming, and graceful shutdown that
doesn't drop in-flight work.

| Capability | Before Phase 5 | After Phase 5 |
|------------|---------------|---------------|
| **Lifecycle states** | Hardcoded `active`/`archived` only, no history | 7-state machine (active ↔ inactive ↔ paused ↔ draft ↔ syncing ↔ archived) with transition history |
| **Twin merging** | Manual JSON editing | `POST /api/twins/merge` with combine/target strategies + audit + event publish |
| **Real-time updates** | Polling | SSE stream from `/api/events/stream` with 500-event backlog |
| **Health vs readiness** | Single `/health` | `/health` (liveness, always 200) + `/ready` (readiness, 503 if checks fail) |
| **Graceful shutdown** | `SIGKILL` on exit | `installGracefulShutdown` flushes SSE hub + persistent stores + publishes `service.shutdown` event |

---

## New Endpoints (per twin)

Every twin now exposes these Phase 5 endpoints in addition to its existing
CRUD routes:

| Method | Path | Purpose |
|--------|------|---------|
| GET    | `/health`                              | Liveness probe (always 200 if process is up) |
| GET    | `/ready`                               | Readiness probe (200 if dependencies healthy, else 503) |
| GET    | `/api/twins/:id/lifecycle`             | Current status + allowed transitions |
| POST   | `/api/twins/:id/lifecycle/transition`  | `{to, reason}` — explicit transition |
| POST   | `/api/twins/:id/lifecycle/archive`     | Shortcut to `archived` |
| POST   | `/api/twins/:id/lifecycle/restore`     | Shortcut from `archived` → `active` |
| GET    | `/api/twins/:id/lifecycle/history`     | Full transition history with actor + reason |
| POST   | `/api/twins/merge`                     | `{sourceId, targetId, strategy?, dryRun?}` |
| POST   | `/api/twins/:sourceId/merge-into/:targetId` | Same as above, alt URL |
| GET    | `/api/events/stream` *(SSE)*           | Server-Sent Events: lifecycle, merge, CRUD notifications |
| GET    | `/api/events/stats` *(SSE)*            | Hub stats: connected clients, backlog size |

---

## Lifecycle State Machine

```
              ┌──────────┐
              │  draft   │
              └────┬─────┘
                   │ active
                   ▼
   ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ inactive │◄►│  active  │◄►│  paused  │
   └────┬─────┘  └────┬─────┘  └────┬─────┘
        │             │             │
        │   ┌─────────┴────────┐    │
        └──►│    archived      │◄───┘
            └────────┬─────────┘
                     │ active (restore)
                     ▼
                  (active)
```

Allowed transitions are encoded in `ALLOWED_TRANSITIONS`:

```js
active:   ['inactive', 'archived', 'paused', 'draft', 'syncing']
inactive: ['active', 'archived', 'paused']
paused:   ['active', 'archived']
draft:    ['active', 'archived']
syncing:  ['active', 'inactive', 'archived']
archived: ['active']    // restore is one-way out of archive
```

---

## Merge Strategies

`POST /api/twins/merge` accepts:

```json
{
  "sourceId": "mer-abc123",
  "targetId": "mer-def456",
  "strategy": "combine",     // or "target"
  "dryRun": false
}
```

| Strategy | Behavior |
|----------|----------|
| `combine` *(default)* | Union of fields; arrays unique-merged; target wins on scalar collisions |
| `target`  | Target kept as-is; source's relationships migrated; source archived |

After merge:
- Target is updated, version incremented, `mergedFrom` array updated
- Source is **soft-deleted** (status=`archived`, `mergedInto=targetId`) unless `hardDelete: true`
- `${twinType}.merged` event published via event-bus
- `policy.audit` records both `merge` and `archive` actions

---

## SSE Real-Time Stream

`GET /api/events/stream` opens a long-lived connection:

```
$ curl -N http://localhost:4888/api/events/stream
id: 1
event: merchant.lifecycle.transitioned
data: {"twinId":"mer-abc","from":"active","to":"archived","actorId":"admin"}

id: 2
event: merchant.merged
data: {"eventId":"mrg-b530e792","sourceId":"mer-abc","targetId":"mer-def"}
```

The hub polls the event-bus every 1.5s and keeps a 500-event backlog for
late subscribers. Use `Last-Event-ID` header to resume.

**Note:** SSE was built but is **opt-in** via the `sse` flag in
`installPhase5`. To enable in a twin:

```js
installPhase5(app, {
  serviceName: 'merchant-twin',
  twinType: 'merchant',
  store: merchants,
  sse: { enabled: true, eventBusUrl: 'http://localhost:4254' }
});
```

---

## Health vs Readiness

| Endpoint | Returns | Used for |
|----------|---------|----------|
| `/health` | 200 always (if process is up) | Kubernetes liveness probe — restart on failure |
| `/ready`  | 200 if all readiness checks pass, 503 otherwise | Kubernetes readiness probe — remove from load balancer on failure |

Readiness checks are cached for 5 seconds to avoid hammering dependencies.
Built-in checks include:
- PersistentStore reachable
- (optional) Custom checks via `checks: [async () => true]`

---

## Graceful Shutdown

`installGracefulShutdown(server, cleanup)` from `@rtmn/shared/lib/shutdown`
now receives the `phase5Cleanup` callback from `installPhase5`. On SIGTERM/SIGINT:

1. Stop accepting new connections (`server.close()`)
2. Run `phase5Cleanup`:
   - Flush persistent stores to disk
   - Stop SSE hub (close all client connections cleanly)
   - Publish `service.shutdown` event via event-bus
3. Process exits with code 0

**Before:** A twin killed mid-write could lose unflushed data and orphan SSE clients.
**After:** All writes flush, all clients get a clean disconnect event.

---

## Implementation

### Single-call wiring

```js
import { installPhase5 } from '@rtmn/twinos-shared';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';

const phase5Cleanup = installPhase5(app, {
  serviceName: 'merchant-twin',
  twinType: 'merchant',
  store: merchants,
  version: '2.0.0',
  stats: () => ({ count: merchants.size })
});

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(PORT, () => logger.info('Merchant Twin running on ' + PORT));

installGracefulShutdown(server, phase5Cleanup);
```

### Source modules (all in `twinos-shared/src/`)

| File | Exports | Purpose |
|------|---------|---------|
| `lifecycle.js`  | `lifecycleRouter`, `LIFECYCLE_STATUSES` | State machine + transitions + history |
| `merge.js`     | `mergeRouter`                          | Combine/target merge strategies |
| `sse.js`       | `sseRouter`, `SSEHub`                  | Polling-based SSE broadcaster |
| `health.js`    | `installHealthRoutes`, `runChecks`     | Liveness vs readiness split |
| `phase5.js`    | `installPhase5`                        | One-call bundled installer |

---

## Verification

```bash
# 70-probe smoke test (all 14 data twins × 5 endpoints)
./scripts/phase5-smoke-test.sh
# → 70 / 70 passed, 0 failed

# Real end-to-end (creates merchants, merges, archives, restores)
./scripts/phase5-e2e-test.sh
# → All 10 steps succeed
```

Sample output:
```
╔════════════════════════════════════════════════════════════╗
║         RTMN TwinOS Phase 5 Smoke Test                    ║
║         14 twins × 5 endpoints = 70 probes                ║
╚════════════════════════════════════════════════════════════╝
  ✓ organization-twin    port 4710   health=200 ready=200 lifecycle=ROUTE_OK merge=ROUTE_OK archive=ROUTE_OK
  ✓ product-twin         port 4720   health=200 ready=200 lifecycle=ROUTE_OK merge=ROUTE_OK archive=ROUTE_OK
  ...
  RESULT: 70 / 70 passed, 0 failed
```

---

## Coverage Matrix

| Twin | lifecycle | merge | archive | restore | /ready | smoke |
|------|-----------|-------|---------|---------|--------|-------|
| organization-twin (4710) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| product-twin (4720)      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| employee-twin (4730)     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| voice-twin (4876)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| order-twin (4885)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| payment-twin (4886)      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| inventory-twin (4887)    | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| merchant-twin (4888)     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| user-twin (4889)         | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| asset-twin (4890)        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| partner-twin (4892)      | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| lead-twin (4894)         | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| customer-twin (4895)     | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| wallet-twin (4896)       | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Known Limitations

- **SSE is opt-in** — most twins don't enable it yet (would require event-bus URL configuration). The route exists in `sseRouter` but is only mounted when `sse.enabled: true` is passed to `installPhase5`.
- **`hardDelete` is not exposed in the route** — merge.js accepts it as an option but the HTTP route defaults to soft-delete. Operators wanting hard-delete must call the store directly.
- **No bulk operations** — `POST /api/twins/merge` handles two twins at a time. For 3-way merges, run twice.

---

*Last Updated: 2026-06-22*
*Phase 5 complete. All 5 phases of TwinOS rebuild are DONE.*