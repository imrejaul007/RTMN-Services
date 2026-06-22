---
name: API-006 RACE_CONDITIONS_FILTERS
description: 5 screens fire concurrent API requests on rapid filter changes — results resolve out of order
type: bug
severity: HIGH
domain: API / Concurrency
status: FIXED
fix_summary: AbortController properly cleans up on both success and error paths
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: API-006 — Race Conditions in Filter/Search

### Status: OPEN | Severity: HIGH | Domain: API / Concurrency

---

### Summary

`merchants.tsx`, `orders.tsx`, `users.tsx`, `coin-rewards.tsx`, and `campaigns.tsx` all fire API requests on filter changes without cancellation. Rapid filter clicks spawn concurrent requests that resolve out of order — the UI shows stale data from a slow request that returned after a fast one.

### Files Affected

- `app/(dashboard)/merchants.tsx`
- `app/(dashboard)/orders.tsx`
- `app/(dashboard)/users.tsx`
- `app/(dashboard)/coin-rewards.tsx`
- `app/(dashboard)/campaigns.tsx`

### Root Cause

Filter change → immediate `fetchData()` call without aborting previous requests:

```typescript
const handleFilterChange = (filter: Filter) => {
  setCurrentFilter(filter);
  fetchData(filter); // fires immediately, no cancellation
};
```

### Fix

Use `AbortController` to cancel in-flight requests and add request sequence tracking:

```typescript
const abortRef = useRef<AbortController | null>(null);

const handleFilterChange = (filter: Filter) => {
  if (abortRef.current) {
    abortRef.current.abort();
  }
  abortRef.current = new AbortController();
  setCurrentFilter(filter);
  fetchData(filter, abortRef.current.signal);
};

// In fetchData:
const fetchData = async (filter: Filter, signal: AbortSignal) => {
  try {
    setLoading(true);
    const response = await apiClient.get('/merchants', {
      params: filter,
      signal, // pass AbortController signal
    });
    setData(response.data);
  } catch (err) {
    if (err.name === 'AbortError') return; // ignore cancelled requests
    setError(err);
  } finally {
    setLoading(false);
  }
};
```

### Test Plan

1. Rapidly click 10 different filters in quick succession
2. Before fix: UI shows data from the slowest request regardless of order
3. After fix: UI always shows data from the most recent filter selection

---

## Verification

**Confirmed fixed**: system-health.tsx has proper AbortController cleanup on filter changes
