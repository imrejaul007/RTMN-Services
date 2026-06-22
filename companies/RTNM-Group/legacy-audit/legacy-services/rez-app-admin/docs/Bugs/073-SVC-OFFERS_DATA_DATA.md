---
name: SVC-010 OFFERS_DATA_DATA_NONNULL
description: offers.ts has 8 data.data! non-null assertions — crashes if backend returns undefined
type: bug
severity: HIGH
domain: API / Type Safety
status: FIXED
owner: unassigned
created: 2026-04-19
fixed_date: 2026-04-19
fix_summary: All 8 non-null assertions replaced with safe fallbacks: getOffers/getPendingOffers return empty list structures, getStats returns zeroed stats object, getStores returns empty array, getOffer/create/update/approve/reject return null on failure.
---

## Bug: SVC-010 — Offers Service `data.data!` Non-Null Assertions

### Status: OPEN | Severity: HIGH | Domain: API / Type Safety

---

### Summary

`services/api/offers.ts` has 8 non-null assertions (`data.data!`) accessing potentially undefined response data. If the backend returns an error response or changes the response shape, these throw at runtime.

### Files Affected

- `services/api/offers.ts:164, 170, 176, 182, 188, 194, 200, 213, 219, 225`

### Root Cause

```typescript
// offers.ts — all 8 non-null assertions:
return data.data!;  // line 164
return data.data!;  // line 170
return data.data!;  // line 176
// ... 6 more
```

These use the double-nesting pattern but with `!` instead of optional chaining. Related to BUG-023 (double-nested response) but specific to the offers service.

### Fix

```typescript
// Before:
return data.data!;

// After:
return data?.data ?? [];
// or with type validation:
return data?.data ?? null;
```

### Test Plan

1. Mock backend returning `{ success: true }` (no `data` field)
2. Before fix: crash on `data.data!` → TypeError
3. After fix: graceful fallback to `[]`
