---
name: SEC-011 INCONSISTENT_ERROR_FORMATTING
description: Different screens show errors differently — showAlert, inline banners, Toast — no consistency
type: bug
fix_summary: Created hooks/useErrorDisplay.ts with extractErrorMessage, showApiError, showValidationError, showNetworkError, showApiErrorWithStatus. Applied to merchants.tsx, orders.tsx, users.tsx — consistent error extraction from any error shape.
severity: LOW
domain: Security / UX
status: FIXED
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-011 — Inconsistent Error Message Formatting

### Status: OPEN | Severity: LOW | Domain: Security / UX

---

### Summary

Different screens show error messages using different patterns: `showAlert`, inline error banners, `Toast`, or raw `console.error`. No consistent UX for errors — users see different presentation patterns depending on which screen they're on.

### Files Affected

- All 90+ screen files

### Fix

Create a centralized error display hook:

```typescript
// hooks/useErrorDisplay.ts
export function useErrorDisplay() {
  const { showAlert } = useAlert();

  return {
    showApiError: (error: any) => {
      const message = error?.response?.data?.message || error?.message || 'An error occurred';
      showAlert('Error', message);
    },
    showInlineError: (field: string) => `Invalid ${field}`,
    showToast: (message: string) => Toast.show(message),
  };
}
```

### Test Plan

1. Trigger errors on different screens
2. Before fix: different error display patterns
3. After fix: consistent error display across all screens
