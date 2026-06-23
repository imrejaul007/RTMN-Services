# nexha-tenant-summary

> **ADR-0011 Phase 13 (2026-06-23)** — Read-only fan-out aggregator that returns a unified view of a tenant across all 9 ADR-0010 services in a single Hub call.

## What it does

Asks the question: **"What does tenant X own / have / participate in across the whole Nexha network?"**

Instead of asking 9 different services individually, a client calls `nexha-tenant-summary` once and gets back a merged response with one section per upstream service.

This is the **only** service in ADR-0011 that talks to other services. It has no DB of its own — read-only, stateless, horizontally scalable.

## Architecture

```
                                ┌──────────────────────────────────┐
do-app / REZ-Workspace          │  nexha-tenant-summary :4387      │
(or any Hub caller)             │                                  │
        │                       │  GET /api/tenants/:id/summary    │
        │                       └────────────┬─────────────────────┘
        │                                    │ Promise.allSettled (parallel)
        ▼                                    ▼
   single response          ┌────────────────────────────────────────────────────┐
                            │  9 upstream services (via Hub at :4399)            │
                            │                                                    │
                            │  1. nexha-business-directory    :4360  → companies│
                            │  2. nexha-acp-messaging         :4340  → threads  │
                            │  3. nexha-mission-planner       :4362  → missions │
                            │  4. nexha-partner-graph         :4363  → partners │
                            │  5. nexha-commerce-runtime      :4364  → orders   │
                            │  6. sutar-tenant-instances      :4141  → instances│
                            │  7. industry-tenant-instances   :4365  → industry │
                            │  8. nexha-provisioning-engine   :4385  → plans    │
                            │  9. nexha-hooks-sdk             :4386  → webhooks │
                            └────────────────────────────────────────────────────┘
                                                │
                                                ▼
                          ┌──────────────────────────────────────────┐
                          │  Merged response:                        │
                          │    { tenantId, summary: { health, ... }, │
                          │      sections: { directory, missions,   │
                          │        partners, commerce, instances,   │
                          │        plans, webhooks, ... },          │
                          │      errors?: { source: { message } } } │
                          └──────────────────────────────────────────┘
```

## Failure isolation

Each upstream call has a **3-second timeout** (configurable via `UPSTREAM_TIMEOUT_MS`). All 9 calls run in parallel via `Promise.allSettled`. A failure of one does NOT block the rest.

The response includes:
- `summary.okCount` — number of successful upstreams
- `summary.errorCount` — number of failed upstreams
- `summary.health` — `healthy` (0 errors) / `partial` (some errors) / `degraded` (all errors)
- `errors` (optional) — only present when at least one upstream failed

## API

### GET /api/tenants/:tenantId/summary

Returns the full merged summary. Requires JWT or internal token.

Example response:

```json
{
  "success": true,
  "tenantId": "t_x",
  "generatedAt": "2026-06-23T12:00:00Z",
  "summary": {
    "totalSources": 9,
    "okCount": 8,
    "errorCount": 1,
    "health": "partial"
  },
  "sections": {
    "directory": {
      "label": "Business Directory entries",
      "data": {
        "total": 3,
        "companies": [
          { "companyId": "co_1", "name": "Acme Health", "industry": "healthcare", "trustScore": 82 }
        ]
      }
    },
    "missions": {
      "label": "Missions",
      "data": { "total": 2, "missions": [...] }
    },
    "commerce": {
      "label": "Commerce activity",
      "error": { "message": "connection refused", "code": "UPSTREAM_ERROR" }
    },
    ...
  },
  "errors": {
    "commerce": { "message": "connection refused", "code": "UPSTREAM_ERROR" }
  }
}
```

### GET /api/tenants/:tenantId/summary/:section

Single-section view (when the client only wants one piece, e.g. only missions):

```
GET /api/tenants/t_x/summary/missions
→ { success: true, section: "missions", tenantId: "t_x", data: {...} }
```

Valid sections: `directory`, `messaging`, `missions`, `partners`, `commerce`, `sutarInstances`, `industryInstances`, `provisioningPlans`, `webhooks`.

Returns 404 `UNKNOWN_SECTION` for unknown section keys. Returns 502/504 on upstream failure/timeout.

### GET /api/sources

Returns the configured fan-out registry (which keys + services + paths are queried). Useful for the operator dashboard.

### GET /api/health/upstreams

Per-upstream health check. Returns `{ upstreams: { key: { ok, error? } }, summary: { total, up, down } }`.

## Authentication

Same dual-auth pattern as the other nexha-* services:
- **External callers:** JWT (any role works — the service is read-only).
- **Service-to-service:** `x-internal-token` header.

The `Authorization` and `x-internal-token` headers from the incoming request are forwarded to upstream calls so per-tenant access controls on the upstream services still apply.

## Hub Wiring

Exposed at the RTMN Hub (4399):

```
GET  http://localhost:4399/api/nexha/nexha-tenant-summary/api/sources
GET  http://localhost:4399/api/nexha/nexha-tenant-summary/api/tenants/:tenantId/summary
GET  http://localhost:4399/api/nexha/nexha-tenant-summary/api/tenants/:tenantId/summary/:section
GET  http://localhost:4399/api/nexha/nexha-tenant-summary/api/health/upstreams
```

Plus direct port access (port 4387).

## Capabilities registered at the Hub

| Capability | Purpose |
|------------|---------|
| `tenant-summary` | The aggregator |
| `tenant-fanout` | Parallel multi-service fan-out pattern |
| `upstream-health` | Per-upstream health roll-up |

## Tests

- `summaryService.test.js` — **19 tests** (fillPath, fetchJson timeout, happy-path fan-out, failure isolation, partial/degraded health, upstream health, FANOUT_TARGETS shape)
- `routes.test.js` — **19 tests** (JWT + internal-token auth, /sources, /summary, /summary/:section, /health/upstreams, meta routes, error cases)
- **Total: 38 vitest tests, 0 failures**

## Why this matters

Before this service, an operator dashboard had to make **9 separate Hub calls** to render a "tenant overview" page. With this service, it's **1 call**. The merge logic is server-side, so:
- Network latency drops from `9 × ~50ms = 450ms` to `~50ms` (max of all calls in parallel).
- A flaky upstream doesn't break the page; it's shown as "data unavailable for X".
- The response shape is stable even as we add more upstream services.