# REZ Admin — Cross-Service Integration Map

**Date:** 2026-04-19
**Scope:** All external service connections from rezadmin
**Status:** INCOMPLETE — 10 new cross-service bugs found

---

## Architecture Overview

```
rezadmin (Expo/React Native)
├── REST API Calls ──► rez-api-gateway ──► 9 Microservices
│   (apiClient → buildApiUrl)
│
├── WebSocket ───────► rez-backend-8dfu (monolith) ← BUG: should be gateway
│   (socketService)
│
├── Health Checks ────► 11 Individual Services (pinged directly)
│   (system-health.tsx — MISSING in production) ← BUG
│
├── Analytics ───────► analytics-events
│   (raw fetch, NO auth) ← BUG
│
├── Rendez ──────────► Rendez service (separate auth)
│   (EXPO_PUBLIC_RENDEZ_API_URL + RENDEZ_ADMIN_KEY)
│
└── Config / Status ─► /config/app-status (wrong path) ← BUG
    (_layout.tsx — raw fetch, no auth)
```

---

## Service Connections Matrix

| # | Service | URL | Connected From | Auth Method | Bugs |
|---|---|---|---|---|---|
| 1 | **API Gateway** (primary) | `https://rez-api-gateway.onrender.com/api` | `apiClient` → `buildApiUrl` | Bearer token | 064 (staging=prod), 069 (socket mismatch) |
| 2 | **Monolith Backend** (socket only) | `https://rez-backend-8dfu.onrender.com` | `socketService` | Bearer token | 069 (wrong host for socket) |
| 3 | **Merchant Service** | `https://rez-merchant-service-n3q2.onrender.com` | Direct health check | None (health only) | 067 (no URL in prod) |
| 4 | **Wallet Service** | `https://rez-wallet-service-36vo.onrender.com` | Direct health check | None (health only) | 067 (no URL in prod) |
| 5 | **Payment Service** | `https://rez-payment-service.onrender.com` | Direct health check | None (health only) | 067 (no URL in prod) |
| 6 | **Auth Service** | `https://rez-auth-service.onrender.com` | Direct health check | None (health only) | 067 (no URL in prod) |
| 7 | **Search Service** | `https://rez-search-service.onrender.com` | Direct health check | None (health only) | 067 (no URL in prod) |
| 8 | **Catalog Service** | `https://rez-catalog-service-1.onrender.com` | Direct health check | None (health only) | 067 (no URL in prod) |
| 9 | **Analytics Events** | `https://analytics-events-37yy.onrender.com` | `analytics-dashboard.tsx` | **NONE** (raw fetch) | 065 (no auth headers), 067 (no URL in prod) |
| 10 | **Gamification Service** | `https://rez-gamification-service-3b5d.onrender.com` | Direct health check | None (health only) | 067 (no URL in prod) |
| 11 | **Marketing Service** | `https://rez-marketing-service.onrender.com` | Direct health check | None (health only) | 067 (no URL in prod) |
| 12 | **Rendez Service** | `EXPO_PUBLIC_RENDEZ_API_URL` | `rendez.tsx` | RENDEZ_ADMIN_KEY (separate) | — |
| 13 | **Sentry** | `EXPO_PUBLIC_SENTRY_DSN` | `_layout.tsx`, `apiClient` | DSN (public) | 031 (logger ref before import) |
| 14 | **Expo Updates** | — | `_layout.tsx` | — | 030 (no event listeners) |
| 15 | **Expo Notifications** | — | `_layout.tsx` | — | 009 (no permission request) |
| 16 | **Storage (SecureStore)** | — | `storageService` | SecureStore (native) | 002 (key mismatch), 057 (web: localStorage) |

---

## Auth Flow

```
Login (login.tsx)
  │
  ▼
AuthContext.login(email, password)
  │
  ▼
apiClient.post('/admin/auth/login', { email, password })
  │
  ▼
API Gateway → rez-backend auth
  │
  ▼
Token returned: { token, refreshToken, user }
  │
  ├─► storageService.setAuthToken(token) ──► SecureStore 'admin_auth_token'
  │
  ├─► apiClient internal token ──► all subsequent requests
  │
  └─► AuthContext state: { token, user, isAuthenticated }
```

**Auth providers:**
- `app/contexts/AuthContext.tsx` — BROKEN (useState, wrong signature) ← **AUTH-001**
- `contexts/AuthContext.tsx` — CORRECT (useReducer) — never imported
- `services/api/auth.ts` — auth service
- `services/api/apiClient.ts` — token management + 401 interceptor
- `services/storage.ts` — SecureStore (native) / httpOnly cookies (web)

---

## Environment Variables

### Required for Production

| Variable | Where Used | Current Status |
|---|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | `apiClient` → `buildApiUrl` | ✅ Set in vercel.json/eas.json |
| `EXPO_PUBLIC_SOCKET_URL` | `socketService` | ⚠️ Points to monolith, not gateway |
| `EXPO_PUBLIC_ENVIRONMENT` | `config/api.ts` env detection | ✅ Set in vercel.json/eas.json |
| `EXPO_PUBLIC_SENTRY_DSN` | `_layout.tsx`, `apiClient` | ⚠️ Set to `""` in vercel.json |
| `EXPO_PUBLIC_GATEWAY_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_BACKEND_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_MERCHANT_SERVICE_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_WALLET_SERVICE_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_PAYMENT_SERVICE_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_AUTH_SERVICE_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_SEARCH_SERVICE_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_CATALOG_SERVICE_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_ANALYTICS_SERVICE_URL` | `analytics-dashboard.tsx`, `system-health.tsx` | ❌ Not set in prod |
| `EXPO_PUBLIC_GAMIFICATION_SERVICE_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_MARKETING_SERVICE_URL` | `system-health.tsx` health checks | ❌ Not set in prod |
| `EXPO_PUBLIC_RENDEZ_API_URL` | `rendez.tsx` | ❌ Not set |
| `EXPO_PUBLIC_RENDEZ_ADMIN_KEY` | `rendez.tsx` | ❌ Not set |

---

## API Endpoint Convention

### CURRENT (INCONSISTENT — BUG-068)

| Convention | Services | Example |
|---|---|---|
| `/admin/...` | Most services | `/admin/orders`, `/admin/merchants` |
| `/programs/...` | `socialImpact.ts` | `/programs/social-impact` ← **WRONG: no auth** |
| `/sponsors/...` | `socialImpact.ts` | `/sponsors` ← **WRONG: no auth** |
| `/mall/admin/...` | `mall.ts` | `/mall/admin/brands` ← **WRONG: reversed** |
| No leading `/` | 20+ endpoints | `admin/campaigns/...` ← inconsistent |

### SHOULD BE (FIXED)

All endpoints: `/admin/<resource>/...`

---

## File → Service Mapping

| Screen / Service File | Target Service | Auth |
|---|---|---|
| `apiClient.ts` | rez-api-gateway | Bearer token |
| `socketService.ts` | rez-backend-8dfu (BUG: should be gateway) | Bearer token |
| `analytics-dashboard.tsx` | analytics-events (BUG: no auth) | None |
| `rendez.tsx` | Rendez service | RENDEZ_ADMIN_KEY |
| `system-health.tsx` | 11 individual services | None (health checks) |
| `app/_layout.tsx` (app-status) | `/config/app-status` (BUG: wrong path) | None (BUG: no auth) |
| `socialImpact.ts` | `/programs/` + `/sponsors/` (BUG: wrong prefix) | Bearer |
| `mall.ts` | `/mall/admin/...` (BUG: wrong prefix) | Bearer |
| `travel.ts` | gateway → travel microservice | Bearer |
| `gamificationStats.ts` | gateway → gamification microservice | Bearer |
| `offers.ts` | gateway → offers | Bearer |
| `unified-monitor.tsx` | gateway + BBPS | Bearer |

---

## Bug Distribution by Service

| Service | Bugs | Priority |
|---|---|---|
| rez-api-gateway (primary) | 001, 002, 003, 004, 064, 068, 069 | CRITICAL |
| Analytics Events | 065, 067 | CRITICAL |
| System Health (all 11 services) | 067 | HIGH |
| App Config / Status | 066 | CRITICAL |
| WebSocket / Socket Service | 069, 026 (reconnect) | MEDIUM |
| Rendez Service | — | OK |
| Social Impact | 070, 068 | HIGH |
| Mall | 068 | MEDIUM |
| Sentry | 031 | HIGH |
| Notifications | 009 | HIGH |
| Expo Updates | 030 | HIGH |
| Storage | 002, 057 | CRITICAL |

---

## Cross-Cutting Concerns

### Auth Token Forwarding
- ✅ All `apiClient` calls forward Bearer token
- ✅ Storage via SecureStore (native) / httpOnly cookies (web)
- ❌ Analytics dashboard uses raw `fetch()` — no token
- ❌ App-status uses raw `fetch()` — no token
- ❌ Health checks (raw `fetch()`) — expected (no auth needed)

### Environment Isolation
- ❌ EAS staging build uses production API URL (BUG-064)
- ❌ 11 service health URLs missing in production (BUG-067)
- ✅ HTTPS enforced in production

### URL Construction
- ⚠️ Two functions: `getApiUrl()` and `buildApiUrl()` — can diverge (BUG-072)
- ⚠️ App-status uses `getApiUrl()`, all other calls use `buildApiUrl()`

### Retry / Resilience
- ⚠️ 429 retry leaks state via `as any` (BUG-071)
- ⚠️ 5 socket events registered but backend never emits them
- ✅ AbortController timeout on all requests (60s default)
- ✅ Token refresh with retry on 401

---

## Fix Priority — Cross-Service Bugs

### CRITICAL (Fix First)
1. **064** — EAS staging/production URL mismatch → Deploy staging gateway
2. **065** — Analytics raw fetch → Route through apiClient or add auth
3. **066** — App-status wrong path → Change to `/admin/config/app-status`
4. **067** — 11 service URLs missing → Add all to vercel.json/eas.json

### HIGH (Week 1)
5. **070** — Social Impact wrong prefix → Change `/programs/` → `/admin/programs/`
6. **068** — Inconsistent paths → Standardize all to `/admin/` prefix
7. **073** — Offers data.data! → Use optional chaining

### MEDIUM (Week 2)
8. **069** — Socket → gateway host mismatch → Use gateway for socket
9. **071** — 429 retry as any → Pass retry count as function param
10. **072** — Two URL construction paths → Consolidate to one function

---

*Map generated 2026-04-19. See `docs/Bugs/064-073-SVC-*.md` for individual bug details.*
