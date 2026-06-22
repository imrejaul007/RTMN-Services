---
name: SEC-008 AUTH_CONTEXT_RERENDER
description: hasRole function recreated on every user change — triggers useMemo re-creation and full app re-renders
type: bug
fix_summary: hasRole and hasPermission wrapped in useCallback, context value wrapped in useMemo
fixed_date: 2026-04-19
severity: MEDIUM
domain: Security / Performance
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-008 — AuthContext Causes Full App Re-Renders

### Status: OPEN | Severity: MEDIUM | Domain: Security / Performance

---

### Summary

The `hasRole` function is recreated on every `user` change. Since `hasRole` is included in the `useMemo` value object passed to `useAuth()` consumers, every component subscribed to `useAuth()` re-renders when `user` changes — potentially re-rendering all 100+ dashboard components.

### Files Affected

- `app/contexts/AuthContext.tsx`

### Fix

```typescript
// Memoize hasRole inside the context:
const hasRole = useCallback((role: string) => {
  return user?.role === role;
}, [user?.role]); // only depends on role string

// hasRole is now stable across user object changes
// Only components that actually use hasRole will re-render
```

### Test Plan

1. Add render logging to a dashboard child component
2. Change user profile data (not auth state)
3. Before fix: child component re-renders
4. After fix: child component does NOT re-render
