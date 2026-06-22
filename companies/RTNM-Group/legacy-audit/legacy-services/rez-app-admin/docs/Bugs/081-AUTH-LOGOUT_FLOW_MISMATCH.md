---
name: AUTH-015 LOGOUT_FLOW_MISMATCH
description: settings.tsx had duplicate logout paths — one that properly clears global auth state vs one that silently navigates without clearing tokens
type: bug
severity: HIGH
domain: Auth / Navigation
status: FIXED
owner: unassigned
created: 2026-04-19
---

## Bug: AUTH-015 — Settings Logout Flow Mismatch

### Status: FIXED | Severity: HIGH | Domain: Auth / Navigation

---

### Summary

`settings.tsx` had two logout paths — one correctly using `AuthContext.logout()` which clears global auth state and tokens, and another that silently called `router.replace('/login')` without clearing anything. This meant a user could appear logged out (redirected to login) but retain valid tokens, potentially allowing token reuse or stale session state.

### Files Affected

- `app/(dashboard)/settings.tsx:78, 88, 114, 172`

### Root Cause

```typescript
// settings.tsx — BEFORE FIX:
// BUG-020/081: Use AuthContext logout so the global auth state is properly cleared.

// Direct navigation without clearing auth:
const handleLogout = () => {
  // BUG-081: This silently navigates to login but leaves tokens in SecureStore.
  // If the user somehow returns (back button, session restore), they remain authenticated.
  router.replace('/login');
};
```

The `AuthContext.logout()` does the full cleanup:
```typescript
// AuthContext.logout():
await storageService.clearAuthToken();  // removes from SecureStore
await storageService.clearUser();      // removes user data
dispatch({ type: 'LOGOUT' });          // clears React state
router.replace('/login');               // navigates
```

### Fix

All logout paths must use `AuthContext.logout()`:

```typescript
// app/(dashboard)/settings.tsx:
// BUG-020/081: Use AuthContext logout so the global auth state is properly cleared.
const { logout: authLogout } = useAuth();

const handleLogout = async () => {
  try {
    await authLogout();
  } catch (error) {
    // Even if logout API fails, clear local state and redirect
    await authLogout();
  }
};
```

Additionally, `BUG-062` was also fixed: the `isDirty` flag was removed since toggle values were never persisted and the "Unsaved changes" banner had no associated save action.

### Related Bugs

- **BUG-020**: `router.replace` accepts `any` path — type safety issue
- **BUG-062**: `isDirty` flag set but never cleared

### Test Plan

1. Log in as admin
2. Go to Settings → trigger logout
3. Verify token is cleared from SecureStore
4. Verify user data is cleared from storage
5. Verify auth state is reset in AuthContext
6. Attempt to access a protected route — should redirect to login
