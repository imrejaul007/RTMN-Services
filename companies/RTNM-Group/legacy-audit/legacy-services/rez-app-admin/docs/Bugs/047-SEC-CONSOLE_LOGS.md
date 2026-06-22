---
name: SEC-010 CONSOLE_LOG_STATEMENTS
description: 150+ console.log statements throughout dashboard screens — bundle size overhead and log pollution
type: bug
fix_summary: All console.* replaced with centralized logger from utils/logger
fixed_date: 2026-04-19
severity: LOW
domain: Security / Performance
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: SEC-010 — Console.log Statements Throughout Codebase

### Status: OPEN | Severity: LOW | Domain: Security / Performance

---

### Summary

`if (__DEV__) console.log()` patterns appear 150+ times across dashboard screens. While guarded by `__DEV__`, they add bundle size overhead and create log pollution in development. More importantly, some may accidentally slip through without the `__DEV__` guard.

### Files Affected

- All dashboard screen files

### Fix

Replace all `console.log` calls with the centralized logger:

```typescript
// BEFORE:
if (__DEV__) console.log('[Orders] Fetched:', data);

// AFTER:
import { logger } from '@/utils/logger';
logger.debug('[Orders] Fetched:', data);

// The centralized logger strips all logs in production automatically
```

Then run the arch-fitness check:
```bash
bash scripts/arch-fitness/no-console-log.sh
```

### Test Plan

1. Run arch-fitness `no-console-log.sh`
2. Should report 0 violations after fix
3. Development: logs visible in console
4. Production: no logs emitted
