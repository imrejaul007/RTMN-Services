# CorpPerks — Complete Documentation

> Corporate Spend & Benefits Platform powered by ReZ ecosystem

---

## Quick Links

| Document | Description |
|----------|-------------|
| [CORPPERKS-MVP-PLAN.md](CORPPERKS-MVP-PLAN.md) | MVP scope, 3-feature wedge, 8-week sprint |
| [CORPPERKS-GST-INTEGRATION.md](CORPPERKS-GST-INTEGRATION.md) | GST architecture, ITC optimization, e-invoicing |
| [CORPPERKS-SERVICE-INTEGRATIONS.md](CORPPERKS-SERVICE-INTEGRATIONS.md) | Service integration specs, API contracts |

---

## What is CorpPerks?

**CorpPerks** is an enterprise layer on top of the ReZ ecosystem that enables companies to:
- Book team meals, client dinners, and catering
- Book corporate hotel stays with GST invoices
- Send employee and client gifts at scale
- Track and optimize corporate spend with GST/ITC

**Not building from scratch** — CorpPerks assembles existing ReZ services with corporate-specific extensions.

---

## The Wedge: 3 Features

| Feature | Killer Differentiator |
|---------|----------------------|
| **Corporate Dining** | GST invoices for every meal booking |
| **Corporate Hotel Booking** | ITC-eligible invoices + travel benefits |
| **Corporate Gifting** | Bulk orders + personalization + GST |

---

## Why GST is the Wedge

Indian companies can claim **Input Tax Credit (ITC)** on GST paid for:
- Business travel (hotels)
- Client entertainment (dining)
- Employee gifts (with limits)

**Current problem**: Manual invoice collection → missing invoices → ITC loss.

**CorpPerks solution**: Every transaction = automatic GST-compliant invoice with ITC eligibility.

**Value**: Companies recover 12-18% of corporate spend via ITC.

---

## Architecture Summary

```
CorpPerks Admin Portal (rez-app-admin)
    │
    ▼
CorpPerks API Routes (NEW in rez-api-gateway)
    │
    ├─────────────────────────────────────────┐
    ▼                                         ▼
ReZ Services (Extended)              External Services (Integrated)
    │                                         │
    ├─ rez-wallet-service (benefits)         ├─ Hotel OTA (bookings)
    ├─ rez-merchant-service (partners)        ├─ nextabizz (gifting)
    ├─ rez-order-service (orders)            └─ GST Portal (e-invoice)
    ├─ rez-payment-service (settlement)
    ├─ rez-finance-service (GST invoices)
    ├─ rez-gamification-service (rewards)
    ├─ rez-karma-service (CSR)
    └─ rez-auth-service (RBAC)
```

---

## Service Integration Map

| Module | ReZ Services | External |
|--------|--------------|----------|
| **Corporate Dining** | merchant, order, wallet, payment, finance | — |
| **Corporate Hotel** | finance, wallet, payment | Hotel OTA |
| **Corporate Gifting** | merchant, catalog, wallet, payment | nextabizz |
| **Rewards** | gamification, wallet | — |
| **CSR/Karma** | karma (already has CorporatePartner) | — |

---

## Pricing Tiers

| Feature | Core (₹99/emp/mo) | Pro (₹249/emp/mo) | Enterprise (Custom) |
|---------|-------------------|-------------------|---------------------|
| Corporate Dining | ✓ | ✓ | ✓ |
| Hotel Booking | ✓ | ✓ | ✓ |
| GST Invoices | Basic | Full + ITC reports | ✓ |
| Corporate Gifting | — | ✓ | ✓ |
| Employee Benefits | 1 type | 3 types | Unlimited |
| Rewards/Recognition | — | ✓ | ✓ |
| CSR Campaigns | — | ✓ | ✓ |
| HRIS Integration | — | — | ✓ |
| SSO/SAML | — | — | ✓ |
| SLA | — | — | 99.9% |

---

## MVP Scope (8 Weeks)

### Week 1-2: Foundation
- Corp API routes in gateway
- Corp roles in auth service
- New models: CorporateBenefit, CorporateEmployee

### Week 3-4: Corporate Dining
- Merchant corporate config
- Order corporate fields
- GST invoice for dining

### Week 5-6: Hotel Booking + GST
- Hotel OTA corporate rates
- GST service extension
- E-invoice support

### Week 7-8: Gifting + Polish
- nextabizz integration
- Gift campaign flow
- Employee mobile experience

---

## New Files to Create

```
rez-wallet-service/src/models/
├── CorporateBenefit.ts      # Benefit packages
├── CorporateEmployee.ts     # Enrollment
└── BenefitAllocation.ts     # Monthly allocations

rez-merchant-service/src/models/
└── MerchantCorporateConfig.ts

rez-finance-service/src/services/
└── CorpGSTService.ts       # GST calculations + e-invoice

rez-api-gateway/src/routes/corp/
├── index.ts
├── dining.ts
├── hotels.ts
├── gifting.ts
└── auth.ts

rez-app-admin/src/pages/corp/
├── benefits/
├── dining/
├── hotels/
├── gifting/
└── reports/
```

---

## Key Differentiators

1. **GST as a feature, not an afterthought**
   - Every transaction generates compliant invoice
   - ITC eligibility auto-flagged
   - E-invoice submission built-in

2. **Powered by existing ReZ infrastructure**
   - Merchant network (dining partners)
   - Wallet/coins (benefit allocations)
   - Karma/CSR (existing CorporatePartner)

3. **Single platform for corporate spend**
   - Dining + Hotels + Gifting + Rewards + CSR
   - Unified invoice and reporting

4. **India-first architecture**
   - GST compliance
   - UPI/bulk payment support
   - E-invoice portal integration

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Pilot companies | 3 |
| Monthly GMV (pilot) | ₹5L |
| ITC recovery rate | >95% |
| Time to book | < 5 min |
| Invoice generation | Auto, < 30 sec |

---

## What's NOT in MVP

- Expense claims engine
- Full reimbursement workflows
- Corporate wallet with float
- HRIS integrations
- Complex policy engine
- Full Concur-like features

These are **v2+** features.

---

## Competitive Positioning

| Category | Competitors | CorpPerks |
|----------|-------------|-----------|
| Benefits | Edenred, Sodexo | Benefits + commerce + GST |
| Travel | SAP Concur | Merchant network + ITC optimization |
| HR | Darwinbox | Add transactional layer |

**Position**: Not just perks. **Corporate Spend Commerce Platform**.

---

## Files Created

1. **CORPPERKS-MVP-PLAN.md** — Full MVP plan with 3-feature wedge
2. **CORPPERKS-GST-INTEGRATION.md** — GST architecture and e-invoicing
3. **CORPPERKS-SERVICE-INTEGRATIONS.md** — Service specs and API contracts
4. **CORPPERKS-README.md** — This summary

---

## Next Steps

1. Review and approve MVP scope
2. Start Phase 1: Foundation (Week 1-2)
3. Build CorpPerks API routes
4. Extend auth service with corp roles
5. Create new models

**Ready to build?**
