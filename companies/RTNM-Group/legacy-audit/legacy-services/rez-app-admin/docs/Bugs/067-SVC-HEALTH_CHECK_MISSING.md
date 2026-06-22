---
name: SVC-004 HEALTH_CHECK_PROD_URLS_MISSING
description: 11 service health-check URLs default to empty in production — system health panel shows all services 'unconfigured'
type: bug
severity: HIGH
domain: Cross-Service / Configuration
fix_summary: buildServiceUrl() now derives URLs from GATEWAY_URL in production (instead of empty string). All 11 services show health status instead of 'unconfigured'.
fixed_date: 2026-04-19
status: FIXED
owner: unassigned
created: 2026-04-19
---

## Bug: SVC-004 — 11 Service Health Check URLs Missing in Production

### Status: OPEN | Severity: HIGH | Domain: Cross-Service / Configuration

---

### Summary

`system-health.tsx` defines 11 microservice health-check URLs. In production, all 11 fall back to empty string (`''`) because their `EXPO_PUBLIC_*` env vars are not set in the Vercel or EAS production builds. The system health panel shows all services as "unconfigured" — it's completely useless in production.

### Files Affected

- `app/(dashboard)/system-health.tsx:59-75`
- `vercel.json`
- `eas.json`
- `.env.production`

### Root Cause

```typescript
// system-health.tsx — SERVICE_URLS:
const SERVICE_URLS = {
  gateway:     process.env.EXPO_PUBLIC_GATEWAY_URL           || (__DEV__ ? 'http://localhost:5002' : ''),
  backend:    process.env.EXPO_PUBLIC_BACKEND_URL          || (__DEV__ ? 'http://localhost:5001' : ''),
  merchant:   process.env.EXPO_PUBLIC_MERCHANT_SERVICE_URL  || (__DEV__ ? 'http://localhost:5010' : ''),
  wallet:     process.env.EXPO_PUBLIC_WALLET_SERVICE_URL    || (__DEV__ ? 'http://localhost:5006' : ''),
  payment:    process.env.EXPO_PUBLIC_PAYMENT_SERVICE_URL   || (__DEV__ ? 'http://localhost:5005' : ''),
  auth:       process.env.EXPO_PUBLIC_AUTH_SERVICE_URL      || (__DEV__ ? 'http://localhost:5003' : ''),
  search:     process.env.EXEX_PUBLIC_SEARCH_SERVICE_URL    || (__DEV__ ? 'http://localhost:5008' : ''),
  catalog:    process.env.EXPO_PUBLIC_CATALOG_SERVICE_URL   || (__DEV__ ? 'http://localhost:5007' : ''),
  analytics:  process.env.EXPO_PUBLIC_ANALYTICS_SERVICE_URL || (__DEV__ ? 'http://localhost:5011' : ''),
  gamification: process.env.EXPO_PUBLIC_GAMIFICATION_SERVICE_URL || (__DEV__ ? 'http://localhost:5009' : ''),
  marketing:  process.env.EXPO_PUBLIC_MARKETING_SERVICE_URL || (__DEV__ ? 'http://localhost:5012' : ''),
};

// Only services with a non-empty URL are checked:
const SERVICES: ServiceDef[] = ALL_SERVICES.filter((s) => s.url !== '');
```

None of these `EXPO_PUBLIC_*` vars are set in `vercel.json` or `eas.json`. Result: in production, every service shows as "unconfigured".

### Fix

Add all service URLs to deployment configs:

```json
// vercel.json — add all 11 service URLs:
"EXPO_PUBLIC_GATEWAY_URL": "https://rez-api-gateway.onrender.com",
"EXPO_PUBLIC_BACKEND_URL": "https://rez-backend-8dfu.onrender.com",
"EXPO_PUBLIC_MERCHANT_SERVICE_URL": "https://rez-merchant-service-n3q2.onrender.com",
"EXPO_PUBLIC_WALLET_SERVICE_URL": "https://rez-wallet-service-36vo.onrender.com",
"EXPO_PUBLIC_PAYMENT_SERVICE_URL": "https://rez-payment-service.onrender.com",
"EXPO_PUBLIC_AUTH_SERVICE_URL": "https://rez-auth-service.onrender.com",
"EXPO_PUBLIC_SEARCH_SERVICE_URL": "https://rez-search-service.onrender.com",
"EXPO_PUBLIC_CATALOG_SERVICE_URL": "https://rez-catalog-service-1.onrender.com",
"EXPO_PUBLIC_ANALYTICS_SERVICE_URL": "https://analytics-events-37yy.onrender.com",
"EXPO_PUBLIC_GAMIFICATION_SERVICE_URL": "https://rez-gamification-service-3b5d.onrender.com",
"EXPO_PUBLIC_MARKETING_SERVICE_URL": "https://rez-marketing-service.onrender.com"
```

Note: health-check paths (`/health`) are hardcoded — verify all 11 services expose a `/health` endpoint.

### Test Plan

1. Production build — open system health panel
2. Before fix: all 11 services show "unconfigured"
3. After fix: all 11 services show real health status
