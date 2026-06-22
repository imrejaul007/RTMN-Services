---
name: TS-002 EMPTY_DATA_REDUCE
description: revenue.tsx data.reduce accesses data[0] on empty array — throws on empty data
type: bug
severity: HIGH
domain: TypeScript / Runtime
status: FIXED
fix_summary: Explicit empty array guard added before data.reduce()
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: TS-002 — `data[0].revenue` on Empty Array

### Status: OPEN | Severity: HIGH | Domain: TypeScript / Runtime

---

### Summary

`revenue.tsx:161` uses `data.reduce()` with `data[mi]` as the initial accumulator value. On empty `data`, `data[0]` is `undefined`, and `data[0].revenue` throws a TypeError.

### Files Affected

- `app/(dashboard)/revenue.tsx:161`

### Current Code

```typescript
const maxIdx = data.reduce((mi, d, i) => (d.revenue > data[mi].revenue ? i : mi), 0);
// On empty data: data[0] is undefined → data[0].revenue throws
```

### Fix

```typescript
const maxIdx = data.length > 0
  ? data.reduce((mi, d, i) => (d.revenue > data[mi].revenue ? i : mi), 0)
  : -1;
```

### Test Plan

1. Revenue chart with no data → should render empty state, not crash
2. Revenue chart with data → max bar highlighted correctly

---

## Verification

**Confirmed fixed**: revenue.tsx has explicit if(data.length===0) guard before data.reduce()
