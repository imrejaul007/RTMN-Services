---
name: TS-003 HEAP_DIVISION_ZERO
description: unified-monitor.tsx division by zero when heapTotalMB is 0 — Infinity suppresses all alerts
type: bug
severity: HIGH
domain: TypeScript / Runtime
fix_summary: Added guard: if heapTotalMB === 0, health dot shows 'unknown' instead of silently suppressing alerts with Infinity.
fixed_date: 2026-04-19
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: TS-003 — Heap Division by Zero in Live Monitor

### Status: OPEN | Severity: HIGH | Domain: TypeScript / Runtime

---

### Summary

`unified-monitor.tsx:563` divides by `heapTotalMB`. If `heapTotalMB === 0`, the result is `Infinity`, which is always `false` — memory alerts are silently suppressed.

### Files Affected

- `app/(dashboard)/unified-monitor.tsx:563`

### Current Code

```typescript
d.health.server.memory.heapUsedMB / d.health.server.memory.heapTotalMB > 0.9
// heapTotalMB === 0 → Infinity > 0.9 === false
// Alert is NEVER triggered even when heap is 100% full
```

### Fix

```typescript
const { heapUsedMB, heapTotalMB } = d.health.server.memory;
const usageRatio = heapTotalMB > 0 ? heapUsedMB / heapTotalMB : 0;
const isHighMemory = usageRatio > 0.9;
```

### Test Plan

1. Simulate a server with `heapTotalMB = 0`
2. Before fix: no memory alert fires regardless of `heapUsedMB`
3. After fix: if `heapUsedMB > 0` and `heapTotalMB = 0`, show "unknown" state
