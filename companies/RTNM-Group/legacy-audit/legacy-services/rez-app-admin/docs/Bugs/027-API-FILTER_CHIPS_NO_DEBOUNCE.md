---
name: API-009 FILTER_CHIPS_NO_DEBOUNCE
description: Search inputs have 300ms debounce but filter chip clicks fire immediate API calls — API spam
type: bug
fix_summary: Filter chips debounced 300ms in merchants.tsx, orders.tsx, users.tsx
fixed_date: 2026-04-19
severity: MEDIUM
domain: API / Performance
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: API-009 — Filter Chips Not Debounced

### Status: OPEN | Severity: MEDIUM | Domain: API / Performance

---

### Summary

Search text inputs have debounce (300ms), but filter chip selections fire immediate API calls. Rapidly toggling multiple filter chips creates a burst of concurrent API requests — wasteful and can trigger rate limits.

### Files Affected

- `app/(dashboard)/merchants.tsx`
- `app/(dashboard)/orders.tsx`
- `app/(dashboard)/campaigns.tsx`

### Root Cause

```typescript
// Filter chip click fires immediately:
const handleChipToggle = (chipId: string) => {
  setActiveFilters(prev => ({ ...prev, [chipId]: !prev[chipId] }));
  fetchData(); // no debounce — fires immediately
};

// Text search has debounce:
useEffect(() => {
  const timer = setTimeout(() => fetchData(searchText), 300);
  return () => clearTimeout(timer);
}, [searchText]);
```

### Fix

Apply the same debounce pattern to filter chips:

```typescript
const [debouncedFilters, setDebouncedFilters] = useState(activeFilters);

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedFilters(activeFilters);
    fetchData(activeFilters);
  }, 300);
  return () => clearTimeout(timer);
}, [activeFilters]);
```

Or use a `useDebouncedValue` hook:

```typescript
const debouncedFilters = useDebouncedValue(activeFilters, 300);
useEffect(() => {
  fetchData(debouncedFilters);
}, [debouncedFilters]);
```

### Test Plan

1. Rapidly click 10 different filter chips
2. Before fix: 10 concurrent API requests fire
3. After fix: 1 API request fires after the last click
