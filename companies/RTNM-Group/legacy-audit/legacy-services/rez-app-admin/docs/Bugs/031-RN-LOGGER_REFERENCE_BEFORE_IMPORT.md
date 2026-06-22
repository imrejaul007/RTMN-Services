---
name: RN-006 LOGGER_REFERENCE_BEFORE_IMPORT
description: logger.error() called at line 50 but logger imported at line 67 — ReferenceError in production
type: bug
severity: HIGH
domain: React Native / Build
status: FIXED
fixed_date: 2026-04-19
fix_summary: FALSE POSITIVE — Line 50 uses console.error, not logger.error. The logger import at line 68 is used correctly in the useEffect at line 294 (installProductionConsoleGuard). No ReferenceError exists. No code change needed.
owner: unassigned
created: 2026-04-18
---

## Bug: RN-006 — `logger` Referenced Before Import

### Status: OPEN | Severity: HIGH | Domain: React Native / Build

---

### Summary

`app/_layout.tsx` calls `logger.error()` at line 50 but imports `logger` at line 67. In production builds without `EXPO_PUBLIC_SENTRY_DSN`, this throws `ReferenceError: logger is not defined`.

### Files Affected

- `app/_layout.tsx:50` (call) and `:67` (import)

### Root Cause

```typescript
// Line 50 — called before import:
logger.error('[App] Missing config:', missingVars);

// ... 17 lines later ...

// Line 67 — actual import:
import { logger } from '@/utils/logger';
```

### Fix

Move the `logger` import to the top of the file, before any usage. Or hoist the call into a `useEffect`:

```typescript
// CORRECT order:
import { logger } from '@/utils/logger';
// ... other imports ...
// ... component code ...
// THEN call logger:
logger.error('[App] Missing config:', missingVars);
```

### Test Plan

1. Build for production with `EXPO_PUBLIC_SENTRY_DSN` unset
2. Before fix: crash on app launch with `ReferenceError: logger is not defined`
3. After fix: app launches normally, error is logged
