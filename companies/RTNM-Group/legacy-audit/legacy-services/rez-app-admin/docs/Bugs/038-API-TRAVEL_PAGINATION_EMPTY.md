---
name: API-013 TRAVEL_PAGINATION_EMPTY_OBJECT
description: travel.ts pagination returns {} on failure — callers accessing fields get undefined silently
type: bug
severity: MEDIUM
domain: API / Service Layer
fix_summary: All pagination fallbacks changed from {} to null with proper null return types. Callers that dereference without null-check now get compile-time error instead of silent undefined.
fixed_date: 2026-04-19
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: API-013 — `travel.ts` Pagination Returns Empty Object on Failure

### Status: OPEN | Severity: MEDIUM | Domain: API / Service Layer

---

### Summary

`travel.ts` uses `pagination: data?.pagination || {}` which silently returns an empty object on API failure. Callers accessing `pagination.total` or `pagination.page` get `undefined` with no error indication.

### Files Affected

- `services/api/travel.ts`

### Root Cause

```typescript
// travel.ts:
return {
  bookings: data?.data ?? [],
  pagination: data?.pagination || {}, // silent fallback
};
// Caller does:
setTotal(response.pagination.total); // undefined → 0
setPage(response.pagination.page); // undefined → NaN
```

### Fix

```typescript
// Return a safe default with known shape:
const safePagination = {
  total: 0,
  page: 1,
  limit: 20,
  hasNext: false,
  nextPage: null,
};

return {
  bookings: data?.data ?? [],
  pagination: data?.pagination ?? safePagination,
};
```

### Test Plan

1. Simulate travel API failure
2. Before fix: `pagination.total` is `undefined`, causes NaN in UI
3. After fix: `pagination.total` is `0`, UI shows "0 results" cleanly
