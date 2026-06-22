# REZ Admin App — Comprehensive Audit Report

**Date**: 2026-04-08
**Scope**: All 126 dashboard pages, 85+ API services, 50+ components
**Method**: 10 parallel audit agents + manual fixes

---

## Executive Summary

The admin app (`rez-app-admin`) is a React Native/Expo application with **126 dashboard pages** managing a 20-service monorepo. The audit found:

- **12 CRITICAL** security/data issues (7 already fixed)
- **28 HIGH** severity issues
- **45+ MEDIUM** severity issues
- **30+ LOW** severity issues

### Architecture Strengths
- Dual-mode auth (httpOnly cookies + Bearer token) with clean migration path
- Token refresh deduplication and proactive 5-minute revalidation
- Production HTTPS enforcement and missing-config fatal errors
- Sentry integration with sensitive field scrubbing
- Production console guard with JWT/secret redaction
- Maker-checker approval system for high-value wallet operations

---

## Fixes Applied During Audit

| # | Fix | File | Severity |
|---|-----|------|----------|
| 1 | Masked bank account number (shows `....1234`) | `merchants.tsx` | CRITICAL |
| 2 | Added `admin/` prefix to offer-comments endpoints | `offerComments.ts` | CRITICAL |
| 3 | Fixed revenue export auth bypass (was using `Linking.openURL` without auth) | `revenue.tsx` | CRITICAL |
| 4 | Added SUPER_ADMIN role guard to wallet config | `wallet-config.tsx` | CRITICAL |
| 5 | Added ADMIN role guard to user-wallets | `user-wallets.tsx` | CRITICAL |
| 6 | Fixed non-admin route for user transactions | `users.ts` | CRITICAL |
| 7 | Added save confirmation dialog for wallet config | `wallet-config.tsx` | HIGH |
| 8 | Fixed silent flag update failures (now throws on partial failure) | `merchantFlags.ts` | HIGH |
| 9 | Fixed division by zero in MRR percentage | `merchant-plan-analytics.tsx` | MEDIUM |
| 10+ | Disputes search debounce, escalation reason modal, orders duplicate enum, reconciliation pagination, payroll selectors, partner-earnings debounce | Multiple files | HIGH-MEDIUM |

---

## Section-by-Section Audit

### 1. Core Infrastructure

| File | Purpose | Issues |
|------|---------|--------|
| `_layout.tsx` (root) | Provider tree, Sentry, app-status gate | Low: hardcoded colors |
| `_layout.tsx` (dashboard) | 90+ tab screens registered | **No role-based route gating** |
| `apiClient.ts` | Singleton HTTP client, auth headers, token refresh | Good: dedup refresh, 429 retry |
| `AuthContext.tsx` | Auth state, role hierarchy, session revalidation | Good: offline fallback, 5min recheck |
| `socket.ts` + `useAdminSocket.ts` | **Two independent socket implementations** | MEDIUM: duplicate connections |
| `config/api.ts` | URL config, HTTPS enforcement | Good: fatal on missing prod config |
| `utils/logger.ts` | Production console guard with credential redaction | Good |

**Navigation Structure**: 6 visible bottom tabs (Dashboard, Orders, Campaigns, Merchants, Hotels, More) + 120+ hidden screens accessible via the More/Settings menu, organized into sections: Rez Try, Financial & Compliance, Offers & Zones, Homepage Management, Analytics, Operations, Engagement & UGC, System, Monitoring, Support & Moderation.

---

### 2. Merchants & Stores (8 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `merchants.tsx` | Merchant lifecycle CRUD | rez-backend | **FIXED: Bank account unmasked** |
| `merchant-flags/[merchantId].tsx` | Per-merchant feature flag overrides | rez-backend | **FIXED: Silent partial save failures** |
| `merchant-live-status.tsx` | Real-time merchant online status | rez-backend | WebSocket badge misleading, no service file |
| `merchant-plan-analytics.tsx` | Subscription/MRR analytics | rez-backend | **FIXED: Division by zero**, export stub |
| `merchant-withdrawals.tsx` | Pending withdrawal processing | rez-wallet-service | Hardcoded limit=100, no pagination |
| `stores-moderation.tsx` | Store activation/deactivation | rez-catalog-service | No role guard, doesn't use stores service |
| `store-collections.tsx` | Category display config | rez-backend | Optimistic toggle without rollback |
| `upload-bill-stores.tsx` | Upload-bill cashback stores | rez-backend | No debounce on search |

---

### 3. Users & Wallets (7 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `users.tsx` | User management list | rez-backend | Minor: debounce UX lag |
| `users/[id].tsx` | User detail + stats | rez-backend | **FIXED: Non-admin transaction route** |
| `user-wallets.tsx` | Wallet freeze/adjust/audit | rez-wallet-service | **FIXED: Added role guard** |
| `wallet.tsx` | Platform wallet overview | rez-backend | No date filter, hardcoded 30-day |
| `wallet-adjustment.tsx` | Super Admin wallet ops + approvals | rez-wallet-service | Good: maker-checker, self-approval block |
| `wallet-config.tsx` | Platform wallet settings + kill switch | rez-wallet-service | **FIXED: Role guard + save confirmation** |
| `verifications.tsx` | Identity verification queue | rez-backend | Client-side search only, bulk approve no preview |

**Cross-cutting**: Duplicate wallet functionality between `user-wallets.tsx` (ungated) and `wallet-adjustment.tsx` (super_admin gated).

---

### 4. Orders, Payments & Revenue (7 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `orders.tsx` | Full order management | rez-order-service | Duplicate enum, no refund amount field |
| `disputes.tsx` | Dispute resolution center | rez-backend | No search debounce, hardcoded escalation reason |
| `reconciliation.tsx` | Financial reconciliation | rez-backend | No pagination, no service file |
| `revenue.tsx` | Revenue dashboard + export | rez-backend | **FIXED: Export auth bypass** |
| `revenue-by-vertical.tsx` | Revenue by business vertical | rez-backend | Zero dark mode support |
| `payroll.tsx` | Payroll management | rez-backend | Non-functional month/year selectors, preview always 0 |
| `partner-earnings.tsx` | Partner earnings + config | rez-backend | No amount upper bound, search no debounce |

---

### 5. Offers, Deals & Rewards (13 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `offers.tsx` | Core offer CRUD + approval | rez-backend | No date picker in form |
| `offers-sections.tsx` | Section visibility/ordering | rez-backend | Race condition in reorder (2 parallel PUTs) |
| `offer-comments.tsx` | Comment moderation | rez-backend | **FIXED: Missing admin/ prefix** |
| `homepage-deals.tsx` | Homepage deals config | rez-backend | Good: rich config management |
| `flash-sales.tsx` | Time-limited sales | rez-backend | No pagination (limit=100) |
| `bank-offers.tsx` | Bank payment offers | rez-backend | No search debounce |
| `cashback-rules.tsx` | Global cashback config | rez-backend | **No GET endpoint — always shows defaults** |
| `voucher-management.tsx` | Voucher brand CRUD | rez-backend | Service swallows errors |
| `value-cards.tsx` | Promotional tile cards | rez-backend | No sort order management |
| `gift-cards-admin.tsx` | Gift card CRUD | rez-backend | Doesn't use its own service file |
| `cash-store.tsx` | 7-tab mega page | rez-backend | **God component (900+ lines), 3 duplicate services** |
| `bonus-zone.tsx` | Bonus campaign management | rez-backend | **God component (27K tokens)** |
| `extra-rewards.tsx` | Double cashback + coin drops | rez-backend | Duplicate endpoints with cash-store |

**Critical**: `cash-store.ts`, `vouchers.ts`, and `extraRewards.ts` all hit the same `admin/vouchers/*` and `admin/double-campaigns/*` endpoints with different type definitions.

---

### 6. Gamification & Loyalty (15 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `achievements.tsx` | Achievement CRUD + seed | rez-backend | Hardcoded metrics/categories |
| `challenges.tsx` | Challenge lifecycle | rez-backend | Good: rich status management |
| `tournaments.tsx` | Tournament CRUD | rez-backend | No prize pool validation |
| `coin-rewards.tsx` | Pending reward approval | rez-backend | No approval confirmation |
| `coin-gifts.tsx` | Gift transaction management | rez-backend | Hardcoded refund reason |
| `coin-governor.tsx` | Emergency coin controls | rez-backend | **No role guard, pause state not synced** |
| `surprise-coin-drops.tsx` | Surprise coin drops CRUD | rez-backend | Good: single + bulk create |
| `daily-checkin-config.tsx` | Check-in reward config | rez-backend | Good: dirty tracking |
| `leaderboard-config.tsx` | Leaderboard CRUD + prizes | rez-gamification-service | Good: active delete protection |
| `game-config.tsx` | Mini-game configuration | rez-backend | No coin amount bounds, hardcoded ban reason |
| `gamification-economy.tsx` | Coin economy dashboard | rez-backend + OTA | **OTA admin secret in client bundle** |
| `loyalty.tsx` | Loyalty user management | rez-backend | No coin amount validation |
| `loyalty-milestones.tsx` | Milestone CRUD | rez-backend | Client-side stats only |
| `engagement-config.tsx` | Engagement reward config | rez-backend | Campaign feature not exposed in UI |
| `event-rewards.tsx` | Event reward config | rez-backend | Events picker limited to 100 |

---

### 7. Content, Moderation & Social (14 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `categories.tsx` | Full category + page builder | rez-backend | Good: 25 well-decomposed components |
| `reviews.tsx` | Old review moderation | rez-backend | **Duplicate page, uses wrong API contract** |
| `review-moderation.tsx` | New review moderation | rez-backend | Better implementation, should replace reviews.tsx |
| `comments-moderation.tsx` | Redirect to offer-comments | — | Just a redirect |
| `photo-moderation.tsx` | Photo upload moderation | rez-backend | Missing admin/ prefix on endpoints |
| `ugc-moderation.tsx` | User reel moderation | rez-backend | **Uses window.open (web-only), missing admin/ prefix** |
| `moderation-queue.tsx` | Flagged user queue | rez-backend | No max deduction validation |
| `reactions.tsx` | Coming Soon stub | — | No functionality |
| `polls.tsx` | Poll CRUD | rez-backend | Missing admin/ prefix, no date picker |
| `whats-new.tsx` | Story management | rez-backend | No create functionality |
| `learning-content.tsx` | Educational content CRUD | rez-backend | No markdown preview |
| `faq-management.tsx` | FAQ CRUD + reorder | rez-backend | Error silently swallowed |
| `creators.tsx` | Creator program management | rez-backend | Leading slash inconsistency |
| `special-profiles.tsx` | Special access profiles | rez-backend | Data loss risk on edit |

---

### 8. Marketing, Campaigns & Prive (15 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `campaigns.tsx` | Full campaign CRUD | rez-backend | Role check imported but never used |
| `campaign-management.tsx` | Discovery campaigns | rez-backend | **Edit button non-functional, shares endpoint with campaigns.tsx** |
| `prive.tsx` | 11-tab Prive management | rez-backend | Error handling via console.error only |
| `prive-campaigns.tsx` | Social campaign submissions | rez-backend | **Bulk action buttons permanently disabled** |
| `broadcast.tsx` | Push notification sender | rez-backend | No idempotency protection |
| `ads.tsx` | Ad campaign management | rez-backend | **Double API prefix (api/admin/ads)** |
| `ab-test-manager.tsx` | A/B test management | rez-backend | "New Test" button non-functional |
| `marketing-analytics.tsx` | Marketing KPI dashboard | rez-backend | Footer leaks internal API path |
| `cohort-analysis.tsx` | User retention cohorts | rez-backend | No dark mode, hardcoded 6 months |
| `funnel-analytics.tsx` | Conversion funnels | rez-backend | No dark mode, hardcoded funnels |
| `explore.tsx` | Explore content management | rez-backend | Good: rich moderation features |
| `sponsors.tsx` | Sponsor management | rez-backend | **Missing admin/ prefix on endpoints** |
| `social-impact.tsx` | CSR event management | rez-backend | **Missing admin/ prefix, no delete** |
| `institute-referrals.tsx` | Institute referral tracking | rez-backend | No "declined" action button |
| `institutions.tsx` | Verified institution CRUD | rez-backend | **No email domain validation (could add gmail.com)** |

---

### 9. BBPS, Travel & Verticals (14 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `bbps-analytics.tsx` | BBPS KPI dashboard | rez-backend | Period filter ignored, many fields hardcoded to 0 |
| `bbps-config.tsx` | BBPS bill type config | rez-backend | Shows defaults on load failure |
| `bbps-health.tsx` | Biller health monitoring | rez-backend | No dark mode, bypasses service layer |
| `bbps-providers.tsx` | BBPS provider CRUD | rez-backend | Free-text type input |
| `bbps-transactions.tsx` | BBPS transaction list | rez-backend | **No pagination (only 20 visible)** |
| `travel.tsx` | 6-tab travel management | rez-backend + OTA | **Hardcoded OTA production URL** |
| `hotels.tsx` | Redirect to travel | — | Doesn't activate Hotels tab |
| `table-bookings.tsx` | Restaurant reservations | rez-backend | Read-only (no status updates) |
| `service-appointments.tsx` | Salon/spa appointments | rez-backend | No status transition validation |
| `mall.tsx` | 8-tab mall management | rez-backend | **God component (27K+ tokens)** |
| `experiences.tsx` | Store experience CRUD | rez-backend | Good: most complete admin page |
| `exclusive-zones.tsx` | Restricted access zones | rez-backend | Data loss risk on edit |
| `hotspot-areas.tsx` | Geographic hotspot CRUD | rez-backend | Good: form validation |
| `bundle-management.tsx` | Trial bundle CRUD | rez-backend | Response shape uncertainty |

---

### 10. System Monitoring, Fraud & Platform Config (33 pages)

| Page | Purpose | Backend | Critical Issues |
|------|---------|---------|-----------------|
| `index.tsx` (dashboard) | Main KPI dashboard | rez-backend | **ErrorBoundary unreachable**, alerts dead UI |
| `system-health.tsx` | System + microservice health | All services | **Hardcoded production URLs for 11 services** |
| `live-monitor.tsx` | 10-second auto-refresh dashboard | rez-backend | 5 API calls per 10s |
| `unified-monitor.tsx` | Command center (all monitoring) | rez-backend | 10 API calls per 15s |
| `aggregator-monitor.tsx` | Swiggy/Zomato/Dunzo orders | rez-backend | **Fabricated integration data** |
| `sla-monitor.tsx` | SLA contract monitoring | rez-backend | Good: REST + socket |
| `job-monitor.tsx` | Background job management | rez-backend | Good: trigger with confirmation |
| `api-latency.tsx` | API performance metrics | rez-backend | Good: Prometheus-based |
| `alert-rules.tsx` | Alert threshold config | rez-backend | **Shows fake data on API failure** |
| `fraud-alerts.tsx` | Trial fraud feed | rez-backend | Good: socket + pagination |
| `fraud-config.tsx` | Fraud/cashback settings | rez-backend | Good: SUPER_ADMIN check |
| `fraud-queue.tsx` | Coin velocity review | rez-backend | Good: suspension requires reason |
| `fraud-reports.tsx` | Full fraud report management | rez-backend | Good: proper modal workflows |
| `device-security.tsx` | Device fingerprint management | rez-backend | Good: debounced search |
| `audit-log.tsx` | Admin action timeline | rez-backend | CSV export may bypass auth |
| `analytics-dashboard.tsx` | Platform analytics | analytics-events | Most data unavailable |
| `business-metrics.tsx` | 7-day business trends | rez-backend | Good: custom chart |
| `web-menu-analytics.tsx` | QR/dine-in analytics | rez-backend | Clean implementation |
| `platform-config.tsx` | System config key management | rez-backend | Allows arbitrary keys |
| `platform-control-center.tsx` | Merchant stats overview | rez-backend | Read-only |
| `feature-flags.tsx` | Global + merchant flags | rez-backend | Good: confirmation dialogs |
| `support-config.tsx` | Support system config | rez-backend | Hardcoded 5 timezones |
| `support-tickets.tsx` | Ticket management + replies | rez-backend | Good: socket real-time |
| `support-tools.tsx` | Wallet ops + campaigns | rez-backend | Mixes unrelated concerns |
| `notification-management.tsx` | Notification templates + send | rez-notification-events | No send confirmation |
| `delivery-settings.tsx` | Delivery config | rez-backend | **No GET endpoint — always shows defaults** |
| `membership-config.tsx` | Subscription tier management | rez-backend | Good: comprehensive |
| `quick-actions.tsx` | Consumer app quick actions | rez-backend | Good: icon picker |
| `pending-approvals.tsx` | Action approval queue | rez-backend | Good: rejection requires reason |
| `trial-approvals.tsx` | Trial management | rez-backend | Complex 6-tab screen |
| `special-programs.tsx` | Student/Corporate/Prive programs | rez-backend | Clean implementation |
| `admin-settings.tsx` | Platform settings + admin users | rez-backend | **Duplicates admin-users.tsx** |
| `admin-users.tsx` | Dedicated admin user CRUD | rez-backend | Good: role-gated |
| `settings.tsx` | Personal settings + logout | rez-auth-service | Good: bug fixes applied |

---

## Service Connection Map

```
rez-app-admin
  |
  +-- rez-backend (primary — all admin/* routes)
  |     |-- admin/users, admin/merchants, admin/orders
  |     |-- admin/offers, admin/campaigns, admin/disputes
  |     |-- admin/wallet, admin/wallet-config
  |     |-- admin/system/*, admin/fraud-*, admin/feature-flags
  |     |-- admin/prive/*, admin/gamification-stats/*
  |     |-- admin/bbps/*, admin/travel/*, mall/admin/*
  |     +-- admin/support/*, admin/notifications/*
  |
  +-- rez-wallet-service (via backend proxy)
  |     |-- admin/user-wallets/*, admin/merchant-wallets/*
  |     +-- admin/wallet-config
  |
  +-- rez-auth-service (via backend proxy)
  |     |-- admin/auth/login, admin/auth/logout
  |     |-- admin/auth/me, admin/auth/refresh-token
  |     +-- admin/auth/change-password
  |
  +-- analytics-events (direct fetch, bypasses gateway)
  |     +-- /api/analytics/platform/summary
  |
  +-- Hotel OTA API (direct fetch, bypasses gateway)
  |     +-- /v1/admin/overview, /v1/admin/hotels
  |
  +-- 11 microservices (direct health pings from system-health.tsx)
        +-- /health endpoints
```

---

## Top Priority Issues Remaining

### CRITICAL (fix immediately)
1. **`delivery-settings.tsx` has no GET** — always shows hardcoded defaults, admins may unknowingly overwrite real config
2. **`system-health.tsx` hardcoded production URLs** — 11 service URLs baked into client code
3. **`gamification-economy.tsx` OTA admin secret in client bundle** — exposed via `EXPO_PUBLIC_` env var
4. **`alert-rules.tsx` shows fake fallback data on API failure** — admins may edit non-existent rules
5. **Duplicate campaign systems** — `campaigns.tsx` and `campaign-management.tsx` hit same endpoint with different schemas

### HIGH (fix this sprint)
6. Cash-store / vouchers / extra-rewards triple endpoint duplication
7. God components (cash-store 900+ lines, mall 1000+ lines, bonus-zone 27K tokens)
8. Two independent socket implementations
9. No role-based route gating in dashboard layout
10. Duplicate review moderation pages with conflicting API contracts
11. Multiple pages missing `admin/` prefix on endpoints
12. EmergencyActionBar doesn't read server cashback state
13. Payroll month/year selectors non-functional + preview always 0
14. No coin amount upper bounds on gamification pages

### MEDIUM (fix next sprint)
15. 20+ pages with hardcoded `Colors.light.*` breaking dark mode
16. Inconsistent `showConfirm` usage (callback vs await)
17. Missing search debounce on multiple pages
18. Client-side filtering instead of server-side on several pages
19. Many services use `as any` casts losing type safety
20. Unused service methods across 6+ files

---

## API Endpoint Patterns

### Inconsistencies Found
- `adCampaigns.ts` uses `api/admin/ads` (double prefix)
- `socialImpact.ts` uses `/sponsors` and `/programs/social-impact` (no admin prefix)
- `offerComments.ts` used `offers/comments/*` (FIXED: now uses `admin/`)
- `photoModeration.ts` uses `photos/*` (no admin prefix)
- `ugcModeration.ts` uses `ugc/*` (no admin prefix)
- `polls.ts` uses `polls/*` (no admin prefix)
- `table-bookings.tsx` uses `/table-bookings/admin` (inverted pattern)
- `cashStore.ts` uses `cashstore/affiliate/analytics/` (no admin prefix)
- Some services use leading `/admin/...`, others use `admin/...`

### Pages Without Dedicated Service Files
reconciliation.tsx, revenue.tsx, revenue-by-vertical.tsx, payroll.tsx, cashback-rules.tsx, moderation-queue.tsx, whats-new.tsx, delivery-settings.tsx, merchant-live-status.tsx, merchant-plan-analytics.tsx, ab-test-manager.tsx, marketing-analytics.tsx, cohort-analysis.tsx, funnel-analytics.tsx

---

## Metrics

| Metric | Count |
|--------|-------|
| Total dashboard pages | 126 |
| API service files | 85 |
| Components | 50+ |
| Unique backend endpoints | ~350+ |
| Backend services connected | 5+ (backend, wallet, auth, analytics, OTA) |
| Pages with full CRUD | ~40 |
| Read-only pages | ~25 |
| Config/settings pages | ~15 |
| Monitoring/analytics pages | ~20 |
| Moderation pages | ~10 |
| Pages with role guards | ~5 (should be ~30+) |
| Pages without service files | ~14 |
| God components (500+ lines) | ~5 |
