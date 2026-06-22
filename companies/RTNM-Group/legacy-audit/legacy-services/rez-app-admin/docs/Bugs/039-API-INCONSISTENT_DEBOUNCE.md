---
name: API-014 INCONSISTENT_DEBOUNCE_DURATIONS
description: Debounce durations vary: merchants 300ms, orders 300ms, users 500ms — no consistency
type: bug
severity: LOW
domain: API / Performance
fix_summary: Created utils/debounce.ts with DEBOUNCE_MS constants (SEARCH/FILTER/INPUT all 300ms). Applied to merchants.tsx, orders.tsx, users.tsx. Also standardized users.tsx from 500ms to 300ms.
status: FIXED
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: API-014 — Inconsistent Debounce Durations

### Status: OPEN | Severity: LOW | Domain: API / Performance

---

### Summary

Debounce durations are inconsistent across screens: Merchants = 300ms, Orders = 300ms, Users = 500ms. No centralized constant — changing the default requires updating every file.

### Files Affected

- `app/(dashboard)/merchants.tsx`
- `app/(dashboard)/orders.tsx`
- `app/(dashboard)/users.tsx`

### Fix

Extract to a constants file:

```typescript
// constants/search.ts
export const SEARCH_DEBOUNCE_MS = 300;
export const FILTER_DEBOUNCE_MS = 300;

// Then in screens:
import { SEARCH_DEBOUNCE_MS } from '@/constants/search';
const timer = setTimeout(() => fetchData(searchText), SEARCH_DEBOUNCE_MS);
```

### Test Plan

1. Search on Merchants, Orders, Users — all should have consistent debounce behavior
2. Change `SEARCH_DEBOUNCE_MS` — all 3 screens should update simultaneously
