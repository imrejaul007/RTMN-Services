---
name: API-002 GET_STORES_SILENT_FAIL
description: getStores returns empty array on API error — indistinguishable from "no stores found"
type: bug
fix_summary: "getStores() in campaigns.ts now throws on error instead of returning []. UI in campaigns.tsx catches the error and shows showAlert('Error', 'Failed to load stores. Please try again.'). Same pattern applied to all service files with silent fail."
severity: HIGH
domain: API / Service Layer
status: FIXED
owner: claude
created: 2026-04-18
fixed_date: 2026-04-19
---

## Bug: API-002 — Silent Failure in getStores

### Status: OPEN | Severity: HIGH | Domain: API / Service Layer

---

### Summary

`campaignsService.getStores()` silently returns `[]` on both API errors and "no stores found" responses. Admins see an empty dropdown with no indication that an error occurred — the UI is identical to "no stores exist."

### Files Affected

- `services/api/campaigns.ts` — `getStores` method

### Root Cause

```typescript
// Line ~202 — catches error and returns [] instead of throwing
} catch (error: any) {
  if (__DEV__) console.error('[Campaigns] Get stores error:', error.message);
  return []; // silent failure
}
```

### Fix

```typescript
async getStores(search?: string, limit: number = 50): Promise<StoreOption[]> {
  try {
    const response = await apiClient.get<{ stores: StoreOption[] }>(
      `admin/campaigns/stores?search=${encodeURIComponent(search || '')}&limit=${limit}`
    );
    if (response.success && response.data?.stores) {
      return response.data.stores;
    }
    throw new Error(response.message || 'Failed to load stores');
  } catch (error: any) {
    if (__DEV__) console.error('[Campaigns] Get stores error:', error.message);
    throw error; // Propagate so caller can show error
  }
}
```

Also add error handling in the campaign form component:
```typescript
try {
  const stores = await campaignsService.getStores(search);
  setStoreOptions(stores);
} catch (err) {
  showAlert('Error', 'Failed to load stores. Please try again.');
}
```

### Test Plan

1. Create campaign → store search dropdown → should show stores
2. Simulate API failure (mock server 500) → should show error alert, not empty dropdown
