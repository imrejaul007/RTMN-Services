---
name: TS-007 UPDATE_ACTIVITY_UNUSED
description: updateActivity exported from AuthContext but never included in useMemo value — inaccessible to consumers
type: bug
severity: MEDIUM
domain: TypeScript / API Design
fix_summary: updateActivity does not exist in this codebase — it was in a different project (rez-admin-main). No dead code to remove.
fixed_date: 2026-04-19
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: TS-007 — `updateActivity` Exported But Never Included

### Status: OPEN | Severity: MEDIUM | Domain: TypeScript / API Design

---

### Summary

`updateActivity` is defined in `AuthContext` and exported from its public interface, but it's never included in the `useMemo` value object. Consumers cannot call it — the session timeout is based on elapsed time from login, not actual inactivity.

### Files Affected

- `app/contexts/AuthContext.tsx`

### Root Cause

The `useMemo` value object is missing `updateActivity`:

```typescript
// updateActivity is defined but not included:
const value = useMemo(() => ({
  token,
  user,
  isAuthenticated,
  isLoading,
  login,
  logout,
  // updateActivity is MISSING
}), [token, user, isAuthenticated, isLoading]);
```

### Fix

Add `updateActivity` to the `useMemo` value:

```typescript
const value = useMemo(() => ({
  token,
  user,
  isAuthenticated,
  isLoading,
  login,
  logout,
  updateActivity, // add this
}), [token, user, isAuthenticated, isLoading, updateActivity]);
```

And wire it in the app's global interaction handler (document `visibilitychange`, `keydown`, `touchstart`).

### Test Plan

1. `const { updateActivity } = useAuth()` — should be a valid function
2. Call `updateActivity()` — `lastActivityAt` should update
3. Session timeout should be based on actual inactivity
