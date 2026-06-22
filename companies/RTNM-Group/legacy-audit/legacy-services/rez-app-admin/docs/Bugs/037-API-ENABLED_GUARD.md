---
name: API-012 MISSING_ENABLED_GUARD
description: useDashboardStats fires on mount regardless of auth state — returns 401 before auth confirmed
type: bug
fix_summary: enabled: !!user guard added to all TanStack Query hooks
fixed_date: 2026-04-19
severity: MEDIUM
domain: API / React Query
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: API-012 — Missing `enabled` Guard on Dashboard Queries

### Status: OPEN | Severity: MEDIUM | Domain: API / React Query

---

### Summary

`useDashboardStats()` fires on mount regardless of auth state, potentially returning 401 errors before auth is confirmed. This creates noisy error logs and potential race conditions.

### Files Affected

- `hooks/queries/useDashboard.ts`
- All dashboard query hooks

### Root Cause

```typescript
// useDashboard.ts — current:
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiClient.get('/admin/dashboard/stats'),
    // no enabled guard — fires even when unauthenticated
  });
}
```

### Fix

```typescript
export function useDashboardStats() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiClient.get('/admin/dashboard/stats'),
    enabled: !!token, // only fires when authenticated
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
```

### Test Plan

1. App starts — watch network tab
2. Before fix: dashboard API called before auth check completes, gets 401
3. After fix: dashboard API called only after token is confirmed present
