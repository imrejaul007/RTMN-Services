---
name: API-004 TRAVEL_SERVICE_NO_TYPES
description: All 12 API calls in travel.ts use get<any> — zero TypeScript type safety across the entire service
type: bug
severity: HIGH
domain: API / Type Safety
fix_summary: All 12 API calls now use proper TypeScript generics (TravelDashboardStats, TravelCategory[], TravelService, TravelBooking, etc.). unwrapPayload helper handles double-nesting safely.
fixed_date: 2026-04-19
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: API-004 — Zero Type Safety in `travel.ts`

### Status: OPEN | Severity: HIGH | Domain: API / Type Safety

---

### Summary

Every API call in `services/api/travel.ts` uses `get<any>` or `put<any>`. The entire travel service has no TypeScript type safety — backend field renames silently break the UI with no compile-time warning.

### Files Affected

- `services/api/travel.ts` — all 12 API methods

### Root Cause

```typescript
// Example from travel.ts:
const response = await apiClient.get<any>('/travel/bookings', { params });
const bookings = response.data.data; // no type guarantee
```

### Fix

Define interfaces for each response type:

```typescript
interface TravelBooking {
  id: string;
  userId: string;
  destination: string;
  departureDate: string;
  fix_summary: All 12 API calls now use proper TypeScript generics (TravelDashboardStats, TravelCategory[], TravelService, TravelBooking, etc.). unwrapPayload helper handles double-nesting safely.
fixed_date: 2026-04-19
status: 'pending' | 'confirmed' | 'cancelled';
  totalAmount: number;
}

interface PaginatedBookings {
  bookings: TravelBooking[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// Then:
const response = await apiClient.get<PaginatedBookings>('/travel/bookings', { params });
const bookings = response.data.data.bookings; // fully typed
```

### Test Plan

1. Change a backend field name (e.g., `destination` → `travelDestination`)
2. TypeScript should flag usages of `booking.destination` as errors
3. After fix — compile errors should catch the mismatch
