---
name: TS-001 DIVISION_BY_ZERO_BUSINESS_METRICS
description: data.length === 0 causes division by zero in business metrics chart — barWidth becomes -Infinity and crashes
type: bug
severity: HIGH
domain: TypeScript / Runtime
status: FIXED
fix_summary: Math.max(...data, 1) prevents division by zero in bar chart calculations
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: TS-001 — Division by Zero in Business Metrics Chart

### Status: OPEN | Severity: HIGH | Domain: TypeScript / Runtime

---

### Summary

Business metrics chart calculates bar width with `/ data.length` but doesn't guard against empty arrays. When `data.length === 0`, this produces `barWidth = -Infinity` and crashes chart rendering.

### Files Affected

- `app/(dashboard)/business-metrics.tsx:96`

### Current Code

```typescript
const barWidth = Math.max(4, Math.floor((Dimensions.get('window').width - 80) / data.length) - 4);
// data.length === 0 → barWidth = -Infinity
```

### Fix

```typescript
const barWidth = data.length > 0
  ? Math.max(4, Math.floor((Dimensions.get('window').width - 80) / data.length) - 4)
  : 0;
```

Also check `revenue.tsx:161`:
```typescript
const maxIdx = data.reduce((mi, d, i) => (d.revenue > data[mi].revenue ? i : mi), 0);
// On empty data: data[0] is undefined → data[0].revenue throws
```

### Test Plan

1. Business Metrics with no data → chart renders empty state, no crash
2. Revenue chart with no data → bar chart shows empty state

---

## Verification

**Confirmed fixed**: business-metrics.tsx uses Math.max(...data, 1) as chart max — no division by zero
