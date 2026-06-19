# Micro Intelligence (4753)

> **Status:** ✅ Production-ready v1.0.0 (in-memory, 600+ lines)
> **Owner:** HOJAI AI Foundation + Platform team
> **Last updated:** June 19, 2026

---

## Purpose

**The "always-on" guarantee for HOJAI AI products.** When central HOJAI Intelligence (port 4881) is down, slow, or returning garbage, every product that depends on it should keep working — just with degraded intelligence. Micro Intelligence is the cross-cutting circuit-breaker layer that makes that possible.

This implements the **Micro Intelligence pattern** defined in [Division 3 — Intelligence Cloud](../companies/HOJAI-AI/divisions/03-intelligence-cloud/CLAUDE.md) (section 8): "per-app embedded AI fallback with circuit breaker so apps keep running even when central HOJAI Intelligence is unavailable."

## What it does

1. **Circuit Breakers** — registered per upstream dependency (e.g. `hojai-central`, `memory-os-fallback`). Each breaker tracks a sliding window of call outcomes and transitions through 3 states:
   - `CLOSED` — normal operation
   - `OPEN` — failing fast, returning fallback immediately without calling upstream
   - `HALF_OPEN` — testing recovery with probe requests

2. **Fallbacks** — cached local responses registered by name. When an upstream call fails or the breaker is OPEN, the named fallback is returned instead.

3. **Execution Proxy** — `POST /api/execute/:breakerName` is the single entry point. Apps call this instead of calling the upstream service directly. The breaker handles the rest.

4. **Manual Kill-Switch** — `PATCH /api/breakers/:name/state` lets ops force a breaker OPEN during incidents or planned maintenance.

## Endpoint inventory

### Breaker CRUD
- `POST /api/breakers` — register a breaker
- `GET /api/breakers` — list all
- `GET /api/breakers/:name` — get one (config + state + stats)
- `DELETE /api/breakers/:name`
- `PATCH /api/breakers/:name/state` — force OPEN/CLOSED/HALF_OPEN (kill-switch)
- `POST /api/breakers/:name/reset` — clear stats + return to CLOSED

### Execute
- `POST /api/execute/:breakerName` — body `{payload: {...}}`. Calls upstream, returns response. On failure or OPEN state, returns the configured fallback.
- `GET /api/execute/:breakerName/stats` — recent execution history

### Fallbacks
- `POST /api/fallbacks` — register a fallback
- `GET /api/fallbacks` / `GET /api/fallbacks/:name` / `DELETE /api/fallbacks/:name`

### Status & audit
- `GET /api/status` — global stats
- `GET /api/audit?type=...&limit=...` — audit log
- `GET /api/health` (and `/health` redirect)

## Pre-seeded data

- **2 breakers:**
  - `hojai-central` → target `http://localhost:4881/api/intelligence/analyze`, fallback `sentiment-default`
  - `memory-os-fallback` → target `http://localhost:4703/api/memory/search`, no fallback
- **2 fallbacks:**
  - `sentiment-default` — neutral sentiment response
  - `intent-default` — unknown intent response

## Integration guide

For any HOJAI AI product that calls central HOJAI Intelligence or another shared service:

**Before (no breaker):**
```javascript
const result = await axios.post('http://localhost:4881/api/intelligence/analyze', { text });
```

**After (with breaker):**
```javascript
const result = await axios.post('http://localhost:4753/api/execute/hojai-central', {
  payload: { text }
});
// result.data.response = upstream response OR fallback if breaker is OPEN
```

The `outcome` field tells the caller what happened: `success`, `failure`, `timeout`, or `rejected`. The `fallbackUsed` field tells the caller whether a fallback was returned.

## Design

- **In-memory `Map` storage** — matches the rest of the HOJAI AI ecosystem. No external DB.
- **Sliding window of outcomes** — configurable `windowSize` (default 20). Failure/success thresholds are evaluated against this window.
- **3-state breaker** — classic Hystrix / Resilience4j pattern.
- **No external breaker library** — built from scratch per spec (the user originally suggested `opossum` but the spec was to implement the pattern directly so it's portable to any language).
- **Pure `http`/`https` upstream calls** — no `axios` dependency.

## Next steps

1. **Persistance** — currently stats and audit are in-memory; persist to Redis for cross-instance state.
2. **Half-open probe count** — currently any single success/failure in HALF_OPEN closes/reopens. Add explicit probe count control.
3. **Bulk registration** — `POST /api/breakers/bulk` for mass-importing app configs.
4. **Metrics export** — Prometheus exporter for breaker states and call rates.
5. **HOJAI Intelligence integration** — register breakers for every internal HOJAI service call.

## See also

- [Division 3 — Intelligence Cloud](../companies/HOJAI-AI/divisions/03-intelligence-cloud/CLAUDE.md) — pattern definition
- [services/ai-intelligence/CLAUDE.md](../services/ai-intelligence/CLAUDE.md) — the central intelligence this service protects against
