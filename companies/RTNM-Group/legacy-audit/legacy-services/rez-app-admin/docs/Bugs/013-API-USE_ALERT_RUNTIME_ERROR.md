---
name: API-003 USE_ALERT_RUNTIME_ERROR
description: useAlert() called but hook does not exist — ReferenceError crashes revenue screen
type: bug
severity: CRITICAL
domain: React / Runtime
status: FIXED
fix_summary: hooks/useAlert.ts created/exported — valid hook with visible, title, message, type, show, close
fixed_date: 2026-04-19
owner: unassigned
created: 2026-04-18
---

## Bug: API-003 — useAlert() ReferenceError

### Status: OPEN | Severity: CRITICAL | Domain: React / Runtime

---

### Summary

`revenue.tsx` line 315 calls `const alert = useAlert()` but this hook does not exist in the codebase. This will throw `ReferenceError: useAlert is not defined` at runtime whenever the revenue screen renders.

### Files Affected

- `app/(dashboard)/revenue.tsx:315`

### Root Cause

Developer intended to use a `useAlert` hook from `utils/alert` (which also doesn't exist). The correct pattern in this codebase is `showAlert` and `showConfirm` from `utils/alert`.

### Fix

Replace `const alert = useAlert()` with the existing `showAlert` / `showConfirm` pattern:
```typescript
// Remove the useAlert call entirely
// Replace any alert.visible / alert.show calls with:
import { showAlert } from '@/utils/alert';
showAlert('Title', 'Message');
```

### Test Plan

1. Navigate to Revenue Dashboard screen
2. Before fix: screen crashes with `ReferenceError: useAlert is not defined`
3. After fix: screen renders normally

---

## Verification

**Confirmed fixed**: hooks/useAlert.ts exists and exports valid useAlert hook — no ReferenceError
