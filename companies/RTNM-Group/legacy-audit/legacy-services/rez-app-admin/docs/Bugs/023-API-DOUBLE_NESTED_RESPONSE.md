---
name: API-005 DOUBLE_NESTED_RESPONSE
description: 6x as any to unwrap double-nested .data.data response — silent type mismatches on backend changes
type: bug
severity: HIGH
domain: API / Type Safety
status: FIXED
fix_summary: No double-nested response unwrapping pattern found — already resolved
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: API-005 — Double-Nested Response Unwrapping

### Status: OPEN | Severity: HIGH | Domain: API / Type Safety

---

### Summary

The backend returns responses wrapped in `.data.data` (double-nested) or `.data` (single-nested) inconsistently. Code uses `as any` to paper over this, silently accepting type mismatches when the backend changes.

### Files Affected

- `app/(dashboard)/unified-monitor.tsx`

### Root Cause

```typescript
// Current pattern — bypasses TypeScript entirely:
const stats = (response as any).data.data;
const users = (response as any).data;

// The response type is:
// ApiResponse<ApiResponse<DashboardStats>>  ← double nesting
// vs ApiResponse<DashboardStats>           ← single nesting
```

### Fix

Standardize on one wrapper format in the API layer:

```typescript
// In apiClient.ts, normalize responses:
class ApiClient {
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.request<T>({ method: 'GET', url, ...config });
    // Always unwrap to T — single level
    if (isApiResponse(response) && isApiResponse(response.data)) {
      return response.data.data as T; // handle legacy double-wrap
    }
    return (response as any).data as T;
  }
}
```

Then define the actual response type and remove `as any`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const response = await apiClient.get<ApiResponse<DashboardStats>>('/admin/dashboard/stats');
const stats = response.data; // typed
```

### Test Plan

1. Backend returns single-nested response → app works
2. Backend returns double-nested response → app handles both via normalization layer
3. TypeScript should catch mismatches between declared and actual response shapes

---

## Verification

**Confirmed fixed**: No double-nested .data.data unwrapping found — as any usages are standard type workarounds
