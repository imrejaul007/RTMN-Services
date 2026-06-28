# RTMN Codebase Audit: Duplicate Detection

**Version:** 1.0 | **Date:** June 28, 2026
**Purpose:** Ensure no duplicate building - audit before creating anything new

---

# 15 STRATEGIC PRODUCTS TO AUDIT

## Customer-Facing (12)
1. Sales OS | 2. StayOwn | 3. RisaCare | 4. Doctor Copilot | 5. Telemedicine
6. Elder Care | 7. Revenue AI | 8. Concierge AI | 9. Restaurant OS
10. Franchise OS | 11. Cloud Kitchen | 12. Workforce OS

## Platform (3)
13. SubscriptionOS | 14. MarketplaceOS | 15. Trust & SecurityOS

---

# AUDIT CHECKLIST (Before Building)

For each product, answer:
```
1. Does [PRODUCT] exist in codebase?
2. Is [PRODUCT] production-ready?
3. Is [PRODUCT] canonical?
4. What are dependencies?
5. What's the gap?
```

---

# SEARCH LOCATIONS

```
industry-os/services/*/
companies/HOJAI-AI/
services/
companies/Nexha/
companies/RABTUL-Technologies/
```

---

# KNOWN DUPLICATES (Consolidate)

## Sales CRM
- sales-os/ (industry-os)
- REZ-SalesMind/ (services)
- customer-graph-360/ (services)
**Action:** Consolidate into Sales OS

## Healthcare
- healthcare-os/ (industry-os)
- risacare/ (companies)
**Action:** Merge into RisaCare

## Analytics
- revenue-intelligence-os/
- analytics-os/
- cxos/
**Action:** Consolidate Revenue Intelligence

---

# PRODUCT STATUS AUDIT

| Product | Search Path | Exists? | Canonical? | Gap |
|---------|-------------|---------|-----------|-----|
| Sales OS | industry-os/services/sales-os/ | ? | ? | - |
| StayOwn | StayOwn/ | ? | ? | - |
| RisaCare | RisaCare/, healthcare-os/ | ? | ? | - |
| Doctor Copilot | */doctor*copilot* | ? | ? | - |
| Telemedicine | */telemedicine* | ? | ? | - |
| Elder Care | */elder*care* | ? | ? | - |
| Revenue AI | revenue-intelligence-os/ | ? | ? | - |
| Restaurant OS | restaurant-os/ | ? | ? | - |
| Franchise OS | */franchise* | ? | ? | - |
| Cloud Kitchen | */cloud*kitchen* | ? | ? | - |
| Workforce OS | workforce-os/ | ? | ? | - |
| SubscriptionOS | */subscription*, */billing* | ? | ? | - |
| MarketplaceOS | */marketplace*, nexha/ | ? | ? | - |
| Trust & Security | */security*, */trust* | ? | ? | - |

---

# ACTION ITEMS

## Immediate
1. Search for each of 15 products in codebase
2. Identify canonical version
3. Flag duplicates for consolidation
4. Identify gaps (products not built)
5. Document what NOT to build

## Consolidation Priority
1. Sales CRM -> Sales OS
2. Healthcare -> RisaCare
3. Analytics -> Revenue Intelligence

---

*Document Version: 1.0*
*Purpose: Prevent duplicate building*
