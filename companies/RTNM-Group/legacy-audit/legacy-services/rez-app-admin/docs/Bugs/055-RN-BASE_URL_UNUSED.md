---
name: RN-015 BASE_URL_UNUSED
description: BASE_URL declared but never used in revenue.tsx:326 — dead code
type: bug
fix_summary: Unused BASE_URL constant removed from revenue.tsx
fixed_date: 2026-04-19
severity: LOW
domain: React Native / Dead Code
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: RN-015 — Dead Code: `BASE_URL` Never Used

### Status: OPEN | Severity: LOW | Domain: React Native / Dead Code

---

### Summary

`BASE_URL` is declared in `revenue.tsx:326` but never used — all API calls use `apiClient` instead. Dead code that adds noise and confusion.

### Files Affected

- `app/(dashboard)/revenue.tsx:326`

### Fix

Remove the declaration:

```typescript
// REMOVE:
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5001/api';
```

### Test Plan

1. Search for `BASE_URL` usage across the file
2. Should find 0 references to it
3. Remove it — file should still compile and work
