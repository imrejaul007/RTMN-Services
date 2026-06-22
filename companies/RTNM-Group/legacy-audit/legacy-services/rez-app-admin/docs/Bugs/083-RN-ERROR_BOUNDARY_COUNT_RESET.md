---
name: RN-007 ERROR_BOUNDARY_COUNT_RESET
description: ErrorBoundary getDerivedStateFromError was resetting errorCount to 0 on every new error, losing the cumulative error count
type: bug
severity: MEDIUM
domain: React Native / Error Handling
status: FIXED
fixed_date: 2026-04-19
fix_summary: VERIFIED ALREADY FIXED — components/ErrorBoundary.tsx:46-53 already has the fix in place. getDerivedStateFromError returns only { error, hasError: true } without errorCount: 0. componentDidCatch increments errorCount correctly. The FIX comment at line 47-58 documents the fix clearly.
owner: unassigned
created: 2026-04-19
---

## Bug: RN-007 — ErrorBoundary `errorCount` Silently Reset on Each Error

### Status: FIXED | Severity: MEDIUM | Domain: React Native / Error Handling

---

### Summary

`ErrorBoundary.tsx`'s `getDerivedStateFromError` returned `{ errorCount: 0 }` as part of the state update. Since `getDerivedStateFromError` has no access to `prevState`, including `errorCount: 0` silently reset the counter every time a new error occurred. The `componentDidCatch` method (which has access to `prevState`) was meant to increment it, but the reset happened first.

### Files Affected

- `components/ErrorBoundary.tsx:46-53`

### Root Cause

```typescript
// ErrorBoundary.tsx — BEFORE FIX:
static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
  // BUG-083: Do not reset errorCount here — getDerivedStateFromError has no
  // access to prevState, so including errorCount: 0 silently resets the counter
  // each time a new error occurs. Let componentDidCatch increment it instead.
  return {
    error,
    hasError: true,
    errorCount: 0,  // WRONG: this always resets, even on consecutive errors
  };
}

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  // BUG-083: Increment errorCount here where we have access to current state
  this.setState((prev) => ({ errorCount: prev.errorCount + 1 }));
  // ...
}
```

The problem: `getDerivedStateFromError` runs FIRST, then `componentDidCatch` runs SECOND. So the counter is:
1. Reset to `0` by `getDerivedStateFromError` (no access to prevState)
2. Incremented to `1` by `componentDidCatch`
3. On the next error: reset to `0`, then incremented to `1` again — never exceeds `1`

### Fix

Remove `errorCount: 0` from `getDerivedStateFromError`. Let `componentDidCatch` handle the increment:

```typescript
// AFTER FIX:
static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
  // BUG-083 FIX: Do not reset errorCount here — getDerivedStateFromError has no
  // access to prevState, so including errorCount: 0 silently resets the counter
  // each time a new error occurs. Let componentDidCatch increment it instead.
  return {
    error,
    hasError: true,
    // errorCount: 0 — REMOVED
  };
}

componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  // BUG-083 FIX: Increment errorCount here where we have access to current state
  this.setState((prev) => ({ errorCount: prev.errorCount + 1 }));
  // ...
}
```

### Related Bugs

- **BUG-070**: Sentry import wrapped in `Platform.OS !== 'web'` check (ErrorBoundary is the consumer)
- **BUG-048**: Version number hardcoded instead of read from app config

### Test Plan

1. Trigger 3 consecutive errors
2. Before fix: `errorCount` stays at `1` (resets each time)
3. After fix: `errorCount` increments to `3`
4. Check that the error count is displayed correctly in the fallback UI
