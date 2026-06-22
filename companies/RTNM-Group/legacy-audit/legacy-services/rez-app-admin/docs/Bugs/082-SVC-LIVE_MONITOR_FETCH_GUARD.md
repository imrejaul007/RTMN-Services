---
name: SVC-012 LIVE_MONITOR_FETCH_GUARD
description: live-monitor.tsx 10s polling interval could pile up concurrent fetches if a fetch took longer than 10s — guard ref prevents this
type: bug
severity: MEDIUM
domain: Performance / Concurrency
status: FIXED
owner: unassigned
created: 2026-04-19
---

## Bug: SVC-012 — Live Monitor Concurrent Fetch Pile-Up

### Status: FIXED | Severity: MEDIUM | Domain: Performance / Concurrency

---

### Summary

The live-monitor screen uses a 10-second `setInterval` to poll 5 services in parallel via `Promise.allSettled()`. If a fetch takes longer than 10 seconds (slow network, large payload), the interval could fire again before the previous fetch completes, creating N concurrent in-flight fetches that race to update state. A `useRef` guard prevents concurrent fetches.

### Files Affected

- `app/(dashboard)/live-monitor.tsx:339-411`

### Root Cause

```typescript
// live-monitor.tsx — naive interval without guard:
// setInterval fires every 10s
// If fetch takes 15s, the next interval fires at t=10s while t=0s fetch is still running
// By t=10s, two fetches are in-flight, each calling setIsLoading + setData
// Race condition: whichever finishes last wins, potentially overwriting newer data with stale
```

```typescript
// Interval setup:
intervalRef.current = setInterval(() => {
  fetchAll();  // no guard — could overlap with in-flight fetch
}, 10000);
```

### Fix

```typescript
// app/(dashboard)/live-monitor.tsx:
// BUG-082: Guard flag so the 10s setInterval can't pile up parallel fetches.
const isFetchingRef = useRef(false);

// BUG-082: Prevent concurrent fetches when the 10s interval fires while a
// previous fetch is still in-flight (e.g. slow network or large payload).
const fetchAll = useCallback(async (silent = false) => {
  if (isFetchingRef.current) return;
  isFetchingRef.current = true;
  if (!silent) setIsLoading(true);

  try {
    const [health, stats, economics, orderStats, ordersResp] = await Promise.allSettled([
      // 5 parallel fetches
    ]);
    // ... process results
  } catch (error) {
    // ...
  } finally {
    // BUG-082: Always release the in-progress guard so future fetches are not blocked.
    isFetchingRef.current = false;
    if (!silent) setIsLoading(false);
  }
}, []);
```

### Remaining Issue

The guard silently drops fetches when one is in-flight. A better approach would use `AbortController` to cancel the in-flight request:

```typescript
// BETTER: Cancel in-flight request instead of dropping
const abortRef = useRef<AbortController | null>(null);

const fetchAll = useCallback(async () => {
  abortRef.current?.abort();
  abortRef.current = new AbortController();

  try {
    const results = await Promise.allSettled([
      systemService.getHealth({ signal: abortRef.current.signal }),
      // ... other fetches with signal
    ]);
  } finally {
    abortRef.current = null;
  }
}, []);
```

### Related Bugs

- **BUG-038**: Pause polling intervals when app is backgrounded
- **BUG-026**: Socket connection-lost detection

### Test Plan

1. Throttle network to 30+ second latency
2. Start live-monitor — first fetch begins
3. Wait 10s — second interval fires
4. Verify no concurrent fetches pile up (check network tab)
5. After fix: second fetch should be skipped or previous cancelled
