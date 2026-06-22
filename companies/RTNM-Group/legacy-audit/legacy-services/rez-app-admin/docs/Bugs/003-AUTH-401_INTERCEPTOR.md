---
name: AUTH-003 401_INTERCEPTOR_STATE_DESYNC
description: 401 interceptor clears SecureStore but does not clear AuthContext state — user stuck on dashboard with dead session
type: bug
severity: CRITICAL
domain: Authentication
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: apiClient.setOnLogoutCallback() is wired in AuthContext.tsx useEffect (line 230). When a 401 refresh fails, apiClient clears storage and invokes the callback, which dispatches LOGOUT and calls router.replace to login. Confirmed at apiClient.ts:178-180 and AuthContext.tsx:229-234.
---

## Bug: AUTH-003 — 401 Interceptor Clears Storage But Not Auth State

### Status: OPEN | Severity: CRITICAL | Domain: Authentication

---

### Summary

When an API call returns 401 and token refresh fails, `apiClient` clears `storageService` but never clears `AuthContext` state. The user stays on the dashboard with a dead session — every API call silently fails and the UI never shows a logout.

### Files Affected

- `services/api/apiClient.ts:173-180` — callback called but nothing registered
- `app/contexts/AuthContext.tsx` — no `apiClient.setOnLogoutCallback()` wiring

### Root Cause

`apiClient.setOnLogoutCallback()` is defined but never called. `AuthContext` never registers the callback, so `onLogoutCallback` is always `null`.

### Fix

In `app/_layout.tsx` `AuthGuardedLayout` function, add:
```typescript
const { logout: authLogout } = useAuth();

useEffect(() => {
  apiClient.setOnLogoutCallback(() => {
    authLogout(); // This clears state AND triggers redirect via useEffect
  });
}, [authLogout]);
```

Also update `AuthContext.logout()` to include navigation:
```typescript
import { router } from 'expo-router';

const logout = useCallback(async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  setToken(null);
  setUser(null);
  router.replace('/(auth)/login');
}, []);
```

### Test Plan

1. Login → dashboard loads
2. Expire token manually (clear SecureStore mid-session)
3. Make any API call → should redirect to login immediately
4. Dashboard should show NO content after redirect
