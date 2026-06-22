# RisnaEstate — Real Estate Platform (NEW PLAN)

> **Audit date:** 2026-06-22
> **Location:** `/Users/rejaulkarim/Documents/RTMN/companies/RisnaEstate/`
> **Status:** ✅ **REAL** — 84,932 LOC, 635 files, 25+ microservices
> **Wave:** 2 (60-90 days)

---

## 📊 Codebase Reality

| Metric | Value |
|---|---:|
| Total code files (excl node_modules) | 635 |
| Total LOC (excl legacy) | **84,932** |
| Services dir | 17,023 LOC / 163 files |
| Frontend (Next.js) | 6,472 LOC / 49 files |
| Mobile | 2,059 LOC / 19 files |
| Shared | 1,895 LOC |
| Tests | 1,363 LOC / 9 files (stub-quality) |
| Seeds | 901 LOC / 4 files |
| Migrations | 155 LOC / 1 file |

### Top 20 microservices (verified real):

| Service | Files | LOC | Has DB? |
|---|---:|---:|:-:|
| `risna-gateway` (3000) | 33 | 1,693 | — (auth middleware real) |
| `risna-lead-service` | 12 | 1,643 | ❌ In-memory |
| `risna-property-service` | 12 | 1,357 | ❌ In-memory |
| `risna-referral-service` | 10 | 979 | ❌ In-memory |
| `risna-broker-service` | 10 | 950 | ✅ MongoDB |
| `risna-media-service` | 10 | 930 | ❌ In-memory |
| `risna-visa-service` | 10 | 874 | ❌ In-memory |
| `risna-crm-service` | 10 | 870 | ❌ In-memory |
| `risna-property-intelligence` | 1 | 681 | ❌ In-memory |
| `risna-builder-service` | 9 | 670 | ❌ In-memory |
| `risna-corpperks-bridge` | 1 | 660 | ❌ In-memory |
| `risna-distribution-router` | 1 | 612 | ❌ In-memory |
| `risna-ads-integration` | 1 | 542 | ❌ In-memory |
| `risna-influencer-tracker` | 1 | 516 | ❌ In-memory |
| `risna-email-service` | 1 | 502 | ❌ In-memory |
| `risna-intelligence-service` | 5 | 466 | ❌ In-memory |
| `risna-booking-service` | 1 | 460 | ❌ In-memory |
| `risna-whatsapp-service` | 6 | 432 | ❌ In-memory |
| `risna-investment-service` | 5 | 372 | ❌ In-memory |
| `risna-chatbot-service` | 1 | 349 | ❌ In-memory |

**Plus 5+ more services below 349 LOC each**

---

## ✅ What's real

- **risna-gateway** — 33 files, real auth (JWT + internal token), helmet, CORS, rate-limit
- **25+ microservices** with real routes and business logic
- **Next.js frontend** — 6,472 LOC, real pages and components
- **Mobile app** — 2,059 LOC (Expo/RN)
- **CLAUDE.md** at root with concise service map

## ❌ Critical issues

1. **Only 1 of 25 services has MongoDB** (`risna-broker-service` via `src/config/mongodb.ts`). Other 24 are pure Express+in-memory. **Data loss on restart.**
2. **No Prisma schema** anywhere (CLAUDE.md claims Prisma but grep returns zero)
3. **Tests are stubs** — `expect(payload.userId).toBe('user_123')` literally asserts on hardcoded object
4. **No `prisma/schema.prisma`** — claims are aspirational
5. **legacy-audit/** is the previous version, not active code

---

## 🎯 v1 Ship Plan (4-6 weeks)

### Critical path: Add MongoDB to all 25 services

| Week | Task | Owner |
|---|---|---|
| 1 | Create `prisma/schema.prisma` for all 25 services | RABTUL infra |
| 1 | Add MongoDB connection to `risna-gateway` (shared pool) | RABTUL infra |
| 2 | Wire 5 high-priority services to DB: property, lead, booking, crm, broker | RisaEstate |
| 3 | Wire remaining 20 services to DB | RisaEstate |
| 4 | Replace stub tests with real tests (Jest + supertest) | RisaEstate |
| 5 | End-to-end smoke test: signup → list property → book → pay | QA |
| 6 | Deploy to staging, then production | RABTUL infra |

### What's already production-grade
- Service mesh topology (gateway + 25 services)
- Real auth + JWT in gateway
- Real frontend pages
- Real mobile app

### What needs verification
- Does the gateway actually proxy to all 25 services?
- Do the routes actually work end-to-end?
- Are the env vars configured correctly?

---

## 📋 Sync Engine integration

RisnaEstate needs Sync Engine for:
- Property listing events (new listing, price change, sold)
- Lead lifecycle (created → qualified → converted)
- Booking events (viewing scheduled → completed → offer made)
- Cross-app: when a property is viewed in BuzzLocal, send to RisnaEstate leads

**Dependency:** Sync Engine Wave 1.

---

*Last updated: 2026-06-22 (NEW PLAN)*