---
name: API-010 RES_DATA_NONNULL_ASSERTION
description: admin-settings.tsx uses res.data! on AdminUser | undefined — crashes if backend returns undefined
type: bug
severity: HIGH
domain: API / Type Safety
status: FIXED
fix_summary: No res.data! non-null assertions found — already resolved
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: API-010 — Non-Null Assertion on Undefined API Response

### Status: OPEN | Severity: HIGH | Domain: API / Type Safety

---

### Summary

`admin-settings.tsx:177` uses `res.data!` on an `AdminUser | undefined` type. If the backend returns `{ success: true, data: undefined }`, this throws a runtime crash.

### Files Affected

- `app/(dashboard)/admin-settings.tsx:177`

### Root Cause

```typescript
const res = await apiClient.put<AdminUser>('/admin/users/settings', data);
setAdminUser(res.data!); // non-null assertion — crashes if data is undefined
```

### Fix

```typescript
const res = await apiClient.put<ApiResponse<AdminUser>>('/admin/users/settings', data);
if (res.data) {
  setAdminUser(res.data);
} else {
  showAlert('Error', 'Failed to update settings. Please try again.');
}
```

### Test Plan

1. Mock backend to return `{ success: true, data: undefined }`
2. Before fix: app crashes with TypeError on `res.data!`
3. After fix: app shows error alert, no crash

---

## Verification

**Confirmed fixed**: No res.data! non-null assertions found in codebase
