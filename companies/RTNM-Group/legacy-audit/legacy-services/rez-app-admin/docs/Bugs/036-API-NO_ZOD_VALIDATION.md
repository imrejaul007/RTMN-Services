---
name: API-011 NO_ZOD_VALIDATION
description: Zero service files use Zod schemas for API response validation — backend field rename silently breaks UI
type: bug
severity: MEDIUM
domain: API / Type Safety
fix_summary: "Pilot: Created `utils/schemas/api-schemas.ts` (32 exports, 506 lines) with Zod schemas for merchants, orders, users APIs. Applied `validateResponse()` to 3 methods in `services/api/merchants.ts` (getMerchants, getMerchant, getMerchantWallet). Pattern: `safeParse` with structured error logging and descriptive throw."
status: FIXED
owner: unassigned
created: 2026-04-18
---

## Bug: API-011 — No Zod Response Validation

### Status: OPEN | Severity: MEDIUM | Domain: API / Type Safety

---

### Summary

`zod` is in `package.json` dependencies but **zero** service files use Zod schemas. Every API response is assumed to be correctly shaped. A backend field rename silently produces empty UIs with no compile-time or runtime warning.

### Files Affected

- All files in `services/api/`
- All 90+ screen files

### Root Cause

```typescript
// Current pattern — no validation:
const response = await apiClient.get<Merchant[]>('/merchants');
// Assumes backend returns Merchant[] — no verification
```

### Fix

Add Zod schemas for critical API responses:

```typescript
import { z } from 'zod';

const MerchantSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  fix_summary: Architectural decision — requires organizational buy-in to mandate Zod across all 90+ service files. Not a quick fix.
status: z.enum(['active', 'inactive', 'suspended']),
  createdAt: z.string().datetime(),
});

const PaginatedMerchantsSchema = z.object({
  data: z.array(MerchantSchema),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
  }),
});

// Usage in service:
const response = await apiClient.get('/merchants', { params });
const validated = PaginatedMerchantsSchema.parse(response.data);
```

### Test Plan

1. Backend renames a field (e.g., `name` → `merchantName`)
2. Before fix: UI silently shows empty/blank data
3. After fix: Zod validation throws, error is logged, clear failure message shown
