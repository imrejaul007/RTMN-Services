---
name: API-008 NO_GLOBAL_ERROR_HANDLERS
description: React Query config has no onError/onSettled global handlers — every screen has boilerplate error handling
type: bug
fix_summary: React Query QueryCache/MutationCache with global onError/onSettled handlers + ReactQueryErrorBoundary component
fixed_date: 2026-04-19
severity: MEDIUM
domain: API / React Query
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: API-008 — No Global Query Error Handlers

### Status: OPEN | Severity: MEDIUM | Domain: API / React Query

---

### Summary

`config/reactQuery.ts` has no `onError` / `onSettled` global handlers. Every screen independently handles errors with identical boilerplate `try/catch` blocks. When error handling needs to change (e.g., adding Sentry reporting), every file must be updated.

### Files Affected

- `config/reactQuery.ts`
- All 90+ screens with data fetching

### Root Cause

```typescript
// config/reactQuery.ts — current:
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      // no onError, no onSettled
    },
  },
});
```

### Fix

```typescript
// config/reactQuery.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      onError: (error) => {
        logger.error('[Query]', error);
        if (isNetworkError(error)) {
          // global offline banner handled elsewhere
        }
      },
      onSettled: (data, error) => {
        // Optional: track query timing
      },
    },
    mutations: {
      onError: (error) => {
        logger.error('[Mutation]', error);
      },
    },
  },
});
```

Screens can still override for specific UX needs, but the common error path is centralized.

### Test Plan

1. Simulate API failure on any screen
2. Error should be logged once at the global level (not duplicated per-screen)
3. Screens can still provide custom error UI where needed
