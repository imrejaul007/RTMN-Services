---
name: AUTH-011 LOGOUT_NO_NAVIGATE
description: AuthContext.logout() clears state but doesn't call router.replace() — race condition on redirect
type: bug
severity: MEDIUM
domain: Auth / Navigation
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: AuthContext.logout() calls router.replace('/(auth)/login') directly (line 394) after dispatching LOGOUT. No reliance on AuthGuardedLayout useEffect for navigation.
---

## Bug: AUTH-011 — Logout Doesn't Navigate

### Status: OPEN | Severity: MEDIUM | Domain: Auth / Navigation

---

### Summary

`AuthContext.logout()` clears in-memory state and storage tokens but doesn't call `router.replace()`. The redirect to login relies on `AuthGuardedLayout`'s `useEffect` checking `isAuthenticated`. This creates a race condition — if the check hasn't fired yet, the user sits on the dashboard briefly.

### Files Affected

- `app/contexts/AuthContext.tsx`

### Fix

```typescript
async function logout() {
  dispatch({ type: 'LOGOUT' });
  await storageService.clearAuthToken();
  await authService.logout();
  router.replace('/login'); // immediate redirect
}
```

Or better — have the component call logout and handle navigation:

```typescript
// In the logout button's handler:
const handleLogout = async () => {
  await logout();
  router.replace('/login');
};
```

### Test Plan

1. Click logout
2. Before fix: brief flash of dashboard before redirect
3. After fix: immediate redirect to `/login`
