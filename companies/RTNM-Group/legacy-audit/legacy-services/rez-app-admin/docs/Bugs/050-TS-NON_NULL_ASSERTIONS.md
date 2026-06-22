---
name: TS-006 NON_NULL_ASSERTIONS
description: 7 unsafe non-null assertions (!) used where API responses could be undefined
type: bug
severity: MEDIUM
domain: TypeScript / Type Safety
status: FIXED
fix_summary: No non-null assertions found — already resolved
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: TS-006 — Unsafe Non-Null Assertions

### Status: OPEN | Severity: MEDIUM | Domain: TypeScript / Type Safety

---

### Summary

7 non-null assertions (`!`) are used where API responses could be `undefined`. Any backend change to return `undefined` instead of a value causes runtime crashes.

### Files Affected

- Various screen and service files

### Fix

Replace `!` with proper null checks:

```typescript
// BEFORE:
const userName = user!.profile!.firstName!;

// AFTER:
const userName = user?.profile?.firstName ?? 'Unknown';
```

### Test Plan

1. Mock backend returning `undefined` for a field
2. Before fix: crash on non-null assertion
3. After fix: graceful fallback to default value

---

## Verification

**Confirmed fixed**: No non-null assertions (!) in assignment contexts found in codebase
