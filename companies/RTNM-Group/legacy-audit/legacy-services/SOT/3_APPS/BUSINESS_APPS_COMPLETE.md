# BUSINESS APPS - Complete Audit

**Date:** May 11, 2026  
**Version:** 1.0

---

## PART 1: REZ MERCHANT (Restaurant OS)

### Service: `Resturistan App/restauranthub/`

| Component | Technology |
|-----------|------------|
| Frontend | Next.js 14 + TypeScript |
| Backend | NestJS + Prisma |
| Database | PostgreSQL |
| Auth | JWT + RBAC |
| Real-time | Redis + Socket.io |

### Features

| Category | Features |
|----------|----------|
| **Admin** | User management, analytics, reports |
| **Restaurant** | Menu, orders, staff, kitchen |
| **Employee** | Attendance, tasks, orders |
| **Vendor** | Supply chain, deliveries |
| **Marketplace** | Multi-vendor support |
| **Jobs** | Hiring portal |
| **Forum** | Community discussions |
| **Messaging** | Real-time chat |

### Frontend Apps

| App | Purpose |
|-----|---------|
| `apps/web` | Main admin dashboard |
| `apps/mobile` | Restaurant app |
| `apps/vendor-portal` | Vendor management |

### API Modules

| Module | Endpoints |
|--------|-----------|
| Users | Auth, profile, roles |
| Restaurants | CRUD, settings |
| Menu | Categories, items, modifiers |
| Orders | Create, update, track |
| Kitchen | KDS, display |
| Jobs | Listings, applications |
| Forum | Posts, comments |
| Messaging | Chat, notifications |

### Security

| Feature | Status |
|---------|--------|
| JWT Auth | ✅ |
| RBAC | ✅ |
| Token Blacklisting | ✅ |
| Rate Limiting | ✅ |
| Input Validation | ✅ |

---

## PART 2: NEXABIZZ (B2B Procurement)

### Service: `nexabizz/`

| Item | Value |
|------|-------|
| Platform | Next.js 15 |
| Monorepo | Turborepo + pnpm |
| Database | Supabase |
| Payments | Stripe |
| Auth | NextAuth.js |

### Features

#### For Buyers
| Feature | Description |
|---------|-------------|
| Catalog browsing | Advanced filtering |
| RFQ | Request for Quotes |
| Purchase orders | Order management |
| BNPL | Credit line |
| Supplier comparison | Side-by-side |

#### For Suppliers
| Feature | Description |
|---------|-------------|
| Product listings | Rich catalog |
| Order dashboard | Fulfillment tracking |
| Inventory | Stock management |
| Scoring | Performance ratings |
| Settlement | Payment tracking |

### Core Services

| Service | Purpose |
|---------|---------|
| Reorder Engine | Automated replenishment |
| Scoring Engine | Supplier/buyer ratings |
| Payment Settlement | Transaction processing |

### API Endpoints

| Category | Examples |
|----------|----------|
| Products | CRUD, search, filter |
| Orders | Create, track, cancel |
| Suppliers | Onboard, manage |
| RFQ | Create, respond, award |

---

## PART 3: CORPPERKS (Enterprise Benefits)

### Service: `CorpPerks/`

| Feature | Description |
|---------|-------------|
| Employee benefits | Portal management |
| GST invoices | Tax compliance |
| Rewards | Tier-based rewards |
| Campaigns | Employee engagement |

### Architecture

```
CorpPerks
├── Admin Portal
├── Employee App (ReZ Karma)
└── Gateway API (Port 4013)
    ├── GST Invoice
    ├── Rewards & Tiers
    └── Campaigns
```

### Features

| Module | Features |
|--------|----------|
| Admin | Benefits setup, reporting |
| Employee | View benefits, redeem |
| GST | Invoice generation |
| Rewards | Points, tiers |
| Campaigns | Promotions |

### Integration Points

| Service | Connection |
|---------|------------|
| `rez-auth-service` | Employee login |
| `rez-wallet-service` | Coin rewards |
| `rez-gamification-service` | Karma points |

---

## PART 4: RESTOPAPA (Restaurant SaaS)

### Service: `RestoPapa/`

| Component | Technology |
|-----------|------------|
| Frontend | Next.js |
| Backend | NestJS |
| Database | PostgreSQL |
| Cache | Redis |
| Payments | Razorpay |

### Multi-Role Support

| Role | Access |
|------|--------|
| Admin | Full platform access |
| Restaurant | Own store management |
| Employee | Assigned tasks |
| Vendor | Supply deliveries |

### Features

| Category | Features |
|----------|----------|
| **Hiring** | Job postings, applications |
| **Verification** | KYC, documents |
| **Marketplace** | Multi-vendor |
| **Forum** | Community posts |
| **Messaging** | Real-time chat |
| **Analytics** | Reports, insights |
| **Payments** | Transactions, settlements |

### API Modules

| Module | Purpose |
|--------|---------|
| Jobs | Recruitment portal |
| Users | Multi-role auth |
| Marketplace | Vendor products |
| Forum | Community |
| Chat | Messaging |

---

## INTEGRATION MATRIX

| App | ReZ Auth | ReZ Wallet | ReZ Mind |
|-----|----------|-------------|-----------|
| ReZ Merchant | ✅ | ✅ | ✅ |
| NexaBizz | ✅ | ✅ | ✅ |
| CorpPerks | ✅ | ✅ | - |
| RestoPapa | ✅ | ✅ | ✅ |

---

## DEPLOYMENTS

| App | Platform | URL |
|-----|----------|-----|
| NexaBizz Web | Vercel | `nexabizz.vercel.app` |
| CorpPerks API | Render | `corpperks-api.onrender.com` |

---

## SECURITY STATUS

| App | Auth | Rate Limit | Validation |
|-----|------|------------|-------------|
| ReZ Merchant | JWT + RBAC | ✅ | ✅ |
| NexaBizz | NextAuth | ✅ | ✅ |
| CorpPerks | JWT | ✅ | ✅ |
| RestoPapa | JWT | ✅ | ✅ |

---

**Last Updated:** May 11, 2026
