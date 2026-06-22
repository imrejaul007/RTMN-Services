---
name: AUTH-010 INCONSISTENT_AUTH_STATE
description: settings.tsx uses both useAuth() and authService.getCurrentUser() — can show stale data
type: bug
severity: MEDIUM
domain: Auth / Data Consistency
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: contexts/AuthContext.tsx uses useReducer with typed AuthAction union. All state updates go through dispatch(). No direct state mutation. Actions: AUTH_START, AUTH_SUCCESS, AUTH_OFFLINE, AUTH_ERROR, LOGOUT, CLEAR_ERROR, UPDATE_USER.
---

## Bug: AUTH-010 — Inconsistent Auth State Across Components

### Status: OPEN | Severity: MEDIUM | Domain: Auth / Data Consistency

---

### Summary

`settings.tsx` uses both `useAuth()` (from AuthContext) and `authService.getCurrentUser()` for user data. These can return different data — the service call bypasses AuthContext state and can return stale or fresh data independently.

### Files Affected

- `app/(dashboard)/settings.tsx`

### Fix

Consolidate on a single source of truth:

```typescript
// Remove the direct authService call, use only useAuth:
const { user, updateUser } = useAuth();

// If the user data needs refreshing:
const { data: freshUser } = useQuery({
  queryKey: ['currentUser'],
  queryFn: () => authService.getCurrentUser(),
  enabled: false, // opt-in refresh only
});
```

### Test Plan

1. User updates their profile
2. Before fix: settings page may show old data from authService vs new data from AuthContext
3. After fix: single source of truth — both display and update use AuthContext
