# ADR 0004: Failure-Tolerant External Service Clients

**Status:** Accepted (2026-06-22)
**Context:** Phase D — do-app backend

## Context and Problem Statement

`do-app/backend/src/services/hojaiClient.ts` makes outbound calls to several external/upstream services (CorpID, TwinOS, Genie, SUTAR, Nexha, SADA). The do-app mobile app is a consumer-facing product — **if any one upstream is down or slow, the user's chat should still work**.

How do we structure these outbound calls so that a single upstream outage doesn't cascade into a UX failure?

## Considered Options

1. **Fail-fast everywhere** — throw on any upstream error, let the route handler catch it
2. **Circuit breaker per upstream** — Hystrix-style; track failures, open the circuit, return cached
3. **Failure-tolerant wrappers** — every client method catches errors and returns `null` (or sensible default) on failure

## Decision Outcome

Chose **Option 3: Failure-tolerant wrappers**. Specifically:

- Every client method has a `try/catch` that returns `null` on network error or 5xx
- Every client method has an **explicit timeout** (2s for status checks, 5s for data fetches)
- Route handlers check `if (x === null) return fallback` instead of `try { x = await call() }`
- Failures are logged with `logger.warn()` (not `error`) so they don't pollute the error dashboard

Example pattern (from `hojaiClient.ts`):

```ts
async function listSuppliers(category: string): Promise<Supplier[] | null> {
  try {
    const r = await fetch(`${RTMN_HUB_URL}/api/nexha/procurement-os/api/suppliers?category=${category}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!r.ok) return null;
    return r.json();
  } catch (err) {
    logger.warn(`nexha.listSuppliers(${category}) failed:`, err);
    return null;
  }
}
```

### Positive Consequences

- **The route handler stays simple** — no nested try/catch, just `if (data === null) return []`
- **One upstream being down doesn't break the whole flow** — the autopilot Step 5 silently skips supplier surfacing if Nexha is down
- **Mobile UX is graceful** — user sees "suppliers unavailable" rather than a crash
- **Operations can take down a service for maintenance** without coordinating with every consumer

### Negative Consequences

- **Silent failures** — if Nexha is always returning `null`, nobody notices until a user complains. Mitigation: `logger.warn` (not error) feeds the log aggregator; we can grep for warn rate spikes
- **No retry logic** — a transient network blip fails the request. That's intentional (we'd rather show stale data than retry-storm the upstream)
- **No circuit breaker** — when SADA is down, every trust score request still waits the full timeout. Acceptable for now; can add if it becomes a problem

## Verification

```bash
# 1. Stop Nexha procurement-os
# 2. Hit do-app autopilot endpoint
$ curl -X POST localhost:3001/api/autopilot/run \
    -d '{"mode":"autopilot","query":"buy milk"}'

# Expected: response includes "recommendations" but no "suppliers" field
# Expected: log line `nexha.listSuppliers failed: ECONNREFUSED`
# NOT expected: 500 error, hang, or crash
```

The mobile UI gracefully degrades to "no supplier suggestions available" instead of erroring out.

## Tradeoffs considered

- **Circuit breaker** would auto-detect sustained outages and stop trying, which would reduce log noise. We deferred this because it's operationally complex (need a shared failure counter across pods/instances) and the `null` return is good enough for v1
- **Cached fallback** would return stale data on outage. We don't have a cache layer in do-app yet; that's a Phase F addition