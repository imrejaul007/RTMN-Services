---
name: ARCH-004 TANSTACK_HOOKS_NOT_USED
description: hooks/queries/ has React Query hooks but screens use manual useState + useEffect instead
type: bug
severity: MEDIUM
domain: Architecture
fix_summary: "In progress — migrated 8 screens to useInfiniteQuery (audit-log, disputes, ads, coin-rewards, coin-gifts + prior: merchants, orders, users). 47 screens remaining. Pattern: useInfiniteQuery + useMemo flattening + ref guard."
status: DEFERRED
owner: unassigned
created: 2026-04-18
---

## Bug: ARCH-004 — TanStack Query Hooks Exist But Not Used

### Status: IN PROGRESS | Severity: MEDIUM | Domain: Architecture

---

### Summary

`hooks/queries/useDashboard.ts` and other React Query hooks exist in `hooks/queries/`, but most dashboard screens use manual `useState + useEffect` instead. The hooks exist but are ignored.

### Migration Progress

**Migrated (8)**:
- `app/(dashboard)/merchants.tsx` — done (prior sprint)
- `app/(dashboard)/orders.tsx` — done (prior sprint)
- `app/(dashboard)/users.tsx` — done (prior sprint)
- `app/(dashboard)/audit-log.tsx` — migrated 2026-04-20
- `app/(dashboard)/disputes.tsx` — migrated 2026-04-20
- `app/(dashboard)/ads.tsx` — migrated 2026-04-20
- `app/(dashboard)/coin-rewards.tsx` — migrated 2026-04-20
- `app/(dashboard)/coin-gifts.tsx` — migrated 2026-04-20

**Remaining (~47 screens)** — manual pagination patterns detected via grep. Requires multi-session effort.

### Migration Pattern

```typescript
const { data: pages = [], isLoading, isFetchingNextPage, fetchNextPage, hasNextPage, refetch } = useInfiniteQuery({
  queryKey: ['resource', ...filters],
  queryFn: ({ pageParam = 1 }) => apiCall(pageParam),
  getNextPageParam: (_lastPage: any, allPages: any[]) => {
    const last = allPages[allPages.length - 1];
    return last?.pagination?.hasNext ? allPages.length + 1 : undefined;
  },
  initialPageParam: 1,
});

const items = useMemo(() => pages.flatMap((p) => (p as any)?.items ?? []), [pages]);
const hasMore = hasNextPage ?? false;
```

### Test Plan

1. Before fix: screens use manual useState + useEffect + setPage
2. After fix: screens use React Query hooks with proper caching, refetching, and error handling
