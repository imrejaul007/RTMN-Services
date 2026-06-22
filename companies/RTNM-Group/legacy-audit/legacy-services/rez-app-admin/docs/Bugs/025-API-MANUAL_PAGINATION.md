---
name: API-007 MANUAL_PAGINATION
description: 3 screens use useState for pagination instead of TanStack Query useInfiniteQuery — race conditions
type: bug
fix_summary: "Migrated merchants.tsx, orders.tsx, users.tsx from manual useState pagination to useInfiniteQuery. Eliminates race conditions; TanStack Query now manages cache, appending pages, and loading state. Mutation callbacks use queryClient.invalidateQueries instead of manual reload."
severity: HIGH
domain: API / React Query
status: FIXED
owner: claude
created: 2026-04-18
fixed_date: 2026-04-19
---

## Bug: API-007 — Manual Pagination Instead of `useInfiniteQuery`

### Status: OPEN | Severity: HIGH | Domain: API / React Query

---

### Summary

`merchants.tsx`, `orders.tsx`, and `users.tsx` use manual `useState` for pagination tracking instead of TanStack Query's `useInfiniteQuery`. This causes race conditions between page increments and API responses, and bypasses React Query's built-in cache management.

### Files Affected

- `app/(dashboard)/merchants.tsx`
- `app/(dashboard)/orders.tsx`
- `app/(dashboard)/users.tsx`

### Root Cause

```typescript
// Current pattern:
const [page, setPage] = useState(1);
const [data, setData] = useState<Merchant[]>([]);

const fetchPage = async (pageNum: number) => {
  const res = await apiClient.get(`/merchants?page=${pageNum}`);
  setData(res.data); // replaces instead of appends
};
```

### Fix

Replace with `useInfiniteQuery`:

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['merchants', filters],
  queryFn: ({ pageParam = 1 }) =>
    apiClient.get<PaginatedResponse<Merchant>>('/merchants', {
      params: { ...filters, page: pageParam },
    }),
  getNextPageParam: (lastPage) =>
    lastPage.pagination.hasNext ? lastPage.pagination.nextPage : undefined,
  initialPageParam: 1,
});

// Flatten pages:
const allMerchants = data?.pages.flatMap(p => p.data.merchants) ?? [];
```

### Test Plan

1. Load page 1, then page 2, then page 3 rapidly
2. Navigate back — React Query cache should return cached data instantly
3. New data loads in background — UI shows loading state, not stale data
