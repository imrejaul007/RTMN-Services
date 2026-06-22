---
name: AUTH-007 TRIPLE_AUTH_SYSTEMS
description: Three independent auth systems (AuthContext, authService, apiClient) manage state separately — can diverge
type: bug
severity: HIGH
domain: Auth / Architecture
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: Unified architecture: AuthContext (useReducer) is the single source of truth. It coordinates with authService (storage) and apiClient (401 interceptor) via explicit wiring. app/contexts/AuthContext.tsx exists but has zero source-code imports.
---

## Bug: AUTH-007 — Three Independent Auth Systems

### Status: OPEN | Severity: HIGH | Domain: Auth / Architecture

---

### Summary

Three separate systems manage authentication independently:
1. **AuthContext** — in-memory React state (`token`, `user`, `isAuthenticated`)
2. **authService** — storage operations via `storageService` (`getAuthToken`, `logout`)
3. **apiClient** — token refresh, 401 interceptor, `setOnLogoutCallback`

These systems can diverge. For example, `apiClient` can clear its token during refresh failure while `AuthContext` still shows `isAuthenticated: true`.

### Files Affected

- `app/contexts/AuthContext.tsx`
- `services/api/auth.ts`
- `services/api/apiClient.ts`
- `services/storage.ts`

### Root Cause

No unified authority. Each system owns a piece but there's no single source of truth that coordinates all three.

### Fix

Create a unified `AuthManager` that owns all auth state and coordinates the three systems:

```typescript
// services/auth/AuthManager.ts
class AuthManager {
  private state: AuthState = { token: null, user: null, status: 'idle' };
  private listeners: Set<(state: AuthState) => void> = new Set();

  async login(email: string, password: string): Promise<void> {
    const { token, user } = await authService.login(email, password);
    await storageService.setAuthToken(token);
    apiClient.setToken(token);
    this.setState({ token, user, status: 'authenticated' });
  }

  async logout(): Promise<void> {
    await authService.logout();
    await storageService.clearAuthToken();
    apiClient.clearToken();
    this.setState({ token: null, user: null, status: 'unauthenticated' });
  }

  async restoreSession(): Promise<void> {
    const token = await storageService.getAuthToken();
    if (token) {
      const user = await authService.getCurrentUser(token);
      apiClient.setToken(token);
      this.setState({ token, user, status: 'authenticated' });
    }
  }
}

export const authManager = new AuthManager();
```

Then `AuthContext` becomes a thin wrapper around `AuthManager`.

### Test Plan

1. Login → all three systems should have consistent state
2. Token refresh failure → all three systems should clear simultaneously
3. App restart → session restore should work via storageService
4. Logout → all three systems should clear simultaneously
