---
name: AUTH-006 REACT_QUERY_CACHE_LOGOUT
description: queryClient.clear() never called on logout — cached sensitive data persists in memory after logout
type: bug
severity: HIGH
domain: Auth / React Query
status: FIXED
owner: unassigned
created: 2026-04-18
fixed_date: 2026-04-19
fix_summary: AuthContext.logout() calls queryClient.clear() (line 391) to wipe all React Query cache on logout. This ensures no sensitive data leaks between admin sessions.
---

## Bug: AUTH-006 — React Query Cache Not Cleared on Logout

### Status: OPEN | Severity: HIGH | Domain: Auth / React Query

---

### Summary

When a user logs out, `queryClient.clear()` is never called. All cached API responses — orders, wallet data, merchant data, user profiles — remain in memory. On a shared device, the next user sees the previous admin's data until the cache naturally expires.

### Files Affected

- `app/_layout.tsx`
- `app/contexts/AuthContext.tsx`
- `services/api/auth.ts`

### Root Cause

`AuthContext.logout()` clears AuthContext state and storage tokens, but React Query's `QueryClient` instance is not accessed. The cache persists independently.

### Fix

```typescript
// In app/_layout.tsx, create the client once
const [queryClient] = useState(() => new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
}));

// Pass queryClient through context or import directly
// In AuthContext.logout():
import { useQueryClient } from '@tanstack/react-query';

async function logout() {
  const queryClient = getQueryClient(); // via context or module-level ref
  await queryClient.clear();
  // ... existing logout logic
}
```

Or import the client from `app/_layout.tsx` via a module-level reference:

```typescript
// contexts/queryClient.ts
export const queryClient = new QueryClient();
```

### Test Plan

1. Login → browse sensitive screens (orders, wallet)
2. Logout
3. Inspect React Query devtools cache — should be empty
4. Login as different user — previous user's data should not appear
