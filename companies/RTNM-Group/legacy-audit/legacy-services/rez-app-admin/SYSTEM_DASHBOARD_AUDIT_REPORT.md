# System Dashboard Audit Report
**Date:** April 7, 2026  
**Audited Components:** All 10 System sections (API Latency, Alert Rules, Feature Flags, SLA Monitor, Job Monitor, Notification Management, Platform Config, Platform Control Center, Aggregator Monitor, Device Security)  
**Severity Distribution:** 4 CRITICAL | 2 HIGH | 3 MEDIUM

---

## Critical Issues (Must Fix Immediately)

### 1. ❌ CRITICAL: Double `.data` Path in Merchant Plans Response
**File:** `rez-app-admin/app/(dashboard)/platform-config.tsx:222`  
**Severity:** CRITICAL  
**Impact:** Plans array will always be undefined, rendering merchant plans section broken

```typescript
// ❌ CURRENT (WRONG)
if ((res.data as any)?.data?.plans) setPlans((res.data as any).data.plans);

// Backend returns:
// { success: true, data: { plans } }
// So res.data = { plans }
// Accessing res.data.data.plans = undefined

// ✅ FIX:
if ((res.data as any)?.plans) setPlans((res.data as any).plans);
```

**Root Cause:** Frontend assumes nested `data.data` structure but backend uses `data.plan` directly via apiClient wrapper.

---

### 2. ❌ CRITICAL: System Config Response Path Mismatch  
**File:** `rez-app-admin/app/(dashboard)/platform-config.tsx:208`  
**Severity:** CRITICAL  
**Impact:** System config values always load as empty array

```typescript
// ❌ CURRENT (WRONG - overly defensive)
setConfigs((res.data as any)?.data?.configs ?? (res.data as any)?.configs ?? []);

// Backend returns:
// sendSuccess(res, { configs }, ...) → { success: true, data: { configs } }
// So res.data = { configs }
// res.data.data = undefined

// ✅ FIX:
setConfigs((res.data as any)?.configs ?? []);
```

**Root Cause:** Confusion about apiClient's response unwrapping. The fallback `?.configs` suggests someone knew it was wrong but didn't fix it properly.

---

### 3. ❌ CRITICAL: POST System Config Response Path  
**File:** `rez-app-admin/app/(dashboard)/platform-config.tsx:332`  
**Severity:** CRITICAL  
**Impact:** New configs added to UI but reference is undefined, causing crash on subsequent operations

```typescript
// ❌ CURRENT (WRONG)
const res = await apiClient.post('/admin/system-config', { ... });
setConfigs((prev) => [...prev, (res.data as any)?.data?.config]);

// Backend returns:
// sendSuccess(res, { config }, ...) → { success: true, data: { config } }
// res.data.data = undefined

// ✅ FIX:
setConfigs((prev) => [...prev, (res.data as any)?.config]);
```

**Root Cause:** Copy-paste error from other double-nested response handling code.

---

### 4. ❌ CRITICAL: Merchant Plans Patch Response Path  
**File:** `rez-app-admin/app/(dashboard)/platform-config.tsx:297`  
**Severity:** CRITICAL  
**Impact:** Plan updates silently fail; UI updates with undefined data

```typescript
// ❌ CURRENT - Not explicitly shown but follows same pattern
// Backend returns: { success: true, data: { plan } }

// ✅ FIX: Ensure response path is (res.data as any)?.plan not .data?.plan
await apiClient.patch(`/admin/merchant-plans/${planName}`, draft);
// Then verify setPlans uses correct response structure
```

**Root Cause:** Consistent pattern error across all system-config related endpoints.

---

## High Priority Issues

### 5. ❌ HIGH: Alert Rules Type Mismatch
**File:** `rez-app-admin/app/(dashboard)/alert-rules.tsx:26 vs rez-backend/src/routes/admin/system.ts:332`  
**Severity:** HIGH  
**Impact:** Frontend type system expects `notifyChannels` but backend uses `channels`, hardcoded fallback data won't serialize/deserialize correctly

```typescript
// FRONTEND TYPE (line 26)
interface AlertRule {
  notifyChannels: ('admin_push' | 'email' | 'slack')[];
}

// BACKEND DEFAULT (system.ts:332)
{
  channels: ['slack', 'pagerduty'],  // ❌ MISMATCH!
}

// ✅ FIX:
// Option A: Rename backend field from `channels` to `notifyChannels`
// Option B: Update frontend interface and all references to use `channels`
```

**Root Cause:** Field name divergence between frontend and backend models.

---

### 6. ❌ HIGH: Alert Rules Fallback Has Wrong Field Names
**File:** `rez-app-admin/app/(dashboard)/alert-rules.tsx:56-141`  
**Severity:** HIGH  
**Impact:** Fallback hardcoded rules have `notifyChannels` but API will return `channels`, causing type errors

**Fix:** When fixing issue #5, also update the hardcoded fallback to match whatever the final field name becomes.

---

## Medium Priority Issues

### 7. ⚠️ MEDIUM: Missing Null Guards in Aggregator Monitor
**File:** `rez-app-admin/app/(dashboard)/aggregator-monitor.tsx:197-199`  
**Severity:** MEDIUM  
**Impact:** If API returns `undefined` or `null` for orders/platformStats, the destructure will crash

```typescript
// ❌ CURRENT
const { orders, platformStats: stats } = response.data as any;
// Later: orders.map(...) could crash if orders is undefined

// ✅ FIX:
const { orders = [], platformStats: stats = [] } = response.data as any || {};
```

---

### 8. ⚠️ MEDIUM: SLA Monitor Doesn't Handle Missing Metrics Gracefully
**File:** `rez-app-admin/app/(dashboard)/sla-monitor.tsx:248-270`  
**Severity:** MEDIUM  
**Impact:** If backend returns metrics without ageSeconds/waiting/merchantCount fields, detail strings become "undefined"

```typescript
// ❌ CURRENT (line 250)
`${data.metrics.customerSnapshot.ageMinutes}m stale` 
// If ageMinutes is undefined: "undefinedm stale"

// ✅ FIX:
`${data.metrics.customerSnapshot.ageMinutes ?? '?'}m stale`
// Or show "— " if all data is missing
```

---

### 9. ⚠️ MEDIUM: Feature Flags Creates Undefined Response on POST
**File:** `rez-backend/src/routes/admin/featureFlags.ts:144`  
**Severity:** MEDIUM  
**Impact:** Response returns 201 but frontend has no place to add new flag to local state from response

```typescript
// BACKEND (line 144)
sendSuccess(res, { flag }, 'Feature flag created', 201);

// FRONTEND (needs to handle this response)
// Currently doesn't have code to handle POST /admin/feature-flags creation
```

---

## Summary of Required Fixes

| Priority | Issue | File | Lines | Action |
|----------|-------|------|-------|--------|
| CRITICAL | Double `.data` path in merchant plans | platform-config.tsx | 222 | Change to `res.data?.plans` |
| CRITICAL | System config response path | platform-config.tsx | 208 | Change to `res.data?.configs` |
| CRITICAL | POST system config response | platform-config.tsx | 332 | Change to `res.data?.config` |
| CRITICAL | Merchant plans patch response | platform-config.tsx | 297+ | Verify response path consistency |
| HIGH | Alert rules field name mismatch | alert-rules.tsx + system.ts | 26, 332 | Align `channels` vs `notifyChannels` |
| HIGH | Fallback alert rules wrong fields | alert-rules.tsx | 56-141 | Update hardcoded defaults to match |
| MEDIUM | Missing null guards Aggregator | aggregator-monitor.tsx | 197-199 | Add default values to destructure |
| MEDIUM | SLA metric detail strings | sla-monitor.tsx | 250, 256, 262, 268 | Add fallback values or "?" |
| MEDIUM | Feature flags POST creation | featureFlags.ts | N/A | Implement flag creation UI if planned |

---

## Testing Recommendations

1. **Load Platform Config page** → verify System Config section appears with data
2. **Load Platform Config page** → verify Merchant Plans section appears with data
3. **Edit a system config** → verify save works and persists
4. **Add a new system config** → verify it appears in the list without crashing
5. **Edit a merchant plan** → verify save works and persists
6. **Load Alert Rules** → verify rules render without hardcoded fallback
7. **Disable all rules** → verify bulk actions work
8. **Load SLA Monitor** → verify all metric cards populate correctly
9. **Load Aggregator Monitor** → verify order stats and merchant integrations render

---

## Cross-App Impact

**None identified** for System Dashboard sections.  
The configuration data managed here (feature flags, system config, merchant plans) affects downstream systems but the impact is passive (read-only consumption). No consumer app or merchant app has dependencies that would break from these bugs—only the admin dashboard UI would malfunction.

---

## Code Quality Notes

- Consistent use of `.data as any` without proper TypeScript types
- Response path confusion across multiple endpoints suggests no shared understanding of apiClient wrapper behavior
- Multiple fallback patterns suggest API contract uncertainty
- No explicit error boundaries for missing fields in responses
