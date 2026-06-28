# RTMN Codebase Audit: Duplicate Detection

**Version:** 1.0 | **Date:** June 28, 2026
**Purpose:** Prevent duplicate building - audit before creating anything new

---

# FINDINGS SUMMARY

## Duplicates Found by Product

| Product | Canonical Path | Duplicate Locations | Action |
|---------|---------------|---------------------|--------|
| Sales OS | industry-os/services/sales-os/ | services/sales-*, REZ-SalesMind | CONSOLIDATE |
| RisaCare | companies/RisaCare/ | industry-os/services/healthcare-os/ | MERGE |
| StayOwn | companies/StayOwn-Hospitality/ | companies/REZ-Workspace/hotel-os | KEEP |
| Restaurant OS | industry-os/services/restaurant-os/ | REZ-Merchant/industry-os/restaurant-* | CONSOLIDATE |
| Workforce OS | industry-os/services/workforce-os/ | REZ-hr-os, CorpPerks/workforce-* | CONSOLIDATE |
| Franchise OS | companies/Nexha/services/franchise-os/ | REZ-franchise-*, REZ-Merchant/REZ-franchise-* | MERGE |
| Subscription | companies/HOJAI-AI/services/billing-service/ | AdBazaar/subscription-*, REZ-subscription-* | CONSOLIDATE |
| Marketplace | industry-os/services/marketplace-os/ | BLR AI Marketplace, REZ-*-marketplace | CONSOLIDATE |
| Security/Trust | shared/security-shared, LawGens/trust-os-* | industry-os/services/security-os/ | MERGE |
| Elder Care | companies/RisaCare/risa-care-elderly-service/ | industry-os/services/eldercare-os/ | MERGE |
| Telemedicine | companies/RisaCare/risa-care-telemedicine-service/ | - | KEEP |

---

# DETAILED FINDINGS

## Sales OS
```
Canonical: industry-os/services/sales-os/ (port 5055)
Duplicates:
- services/sales-hub/
- services/sales-intelligence/
- services/sales-automation/
- services/REZ-SalesMind/
- services/sales-sync/
- services/customer-graph-360/

Status: NEEDS CONSOLIDATION
Action: Move all features into industry-os/services/sales-os/
```

## RisaCare (Healthcare)
```
Canonical: companies/RisaCare/
Duplicates:
- industry-os/services/healthcare-os/
- companies/RABTUL-Technologies/REZ-healthcare-service/
- companies/REZ-Merchant/industry-os/rez-healthcare-*

Components in RisaCare:
- risa-care-home-healthcare-service/
- risacare-health-memory/
- risacare-health-graph/
- risa-care-marketplace/
- risa-care-elderly-service/ (Elder Care!)
- risa-care-telemedicine-service/ (Telemedicine!)

Status: MOSTLY COMPLETE
Action: Merge healthcare-os into RisaCare
```

## StayOwn (Hotel)
```
Canonical: companies/StayOwn-Hospitality/
Components:
- hotel-pms/ (Property Management)
- hotel-restaurant-booking/
- hotel-dashboard/
- hotel-mobile/
- hotel-os-integration/
- hotel-spa-booking/
- hotel-ota/
- voice-hotel-agent/
- hotel-habixo-service/
- REZ-stayown-service/
- hotel-business-twin/

Status: PRODUCTION READY
Action: Keep as canonical, consolidate hotel-os from REZ-Workspace
```

## Restaurant OS
```
Canonical: industry-os/services/restaurant-os/
Duplicates:
- companies/REZ-Merchant/industry-os/restaurant-os/
- companies/REZ-Merchant/industry-os/rez-ai-restaurant/
- companies/REZ-Merchant/industry-os/restauranthub/

Components in REZ-Merchant:
- rez-restaurant-pos-service/
- rez-restaurant-reservations/
- rez-restaurant-analytics-service/
- rez-restaurant-loyalty-service/
- rez-restaurant-scheduling-service/
- rez-restaurant-inventory-service/

Status: NEEDS CONSOLIDATION
Action: Move REZ-Merchant components into canonical restaurant-os/
```

## Workforce OS
```
Canonical: industry-os/services/workforce-os/ (port 5077)
Duplicates:
- companies/REZ-Merchant/REZ-hr-os/
- companies/CorpPerks/workforce-os/
- companies/CorpPerks/workforce-intelligence/
- industry-os/services/workforce-intelligence/

Status: NEEDS CONSOLIDATION
Action: Consolidate all into industry-os/services/workforce-os/
```

## Franchise OS
```
Canonical: companies/Nexha/services/franchise-os/
Duplicates:
- companies/RABTUL-Technologies/REZ-franchise-os/
- companies/REZ-Merchant/REZ-franchise-management/
- companies/RTNM-REE/franchise-mode/
- companies/REZ-Merchant/industry-os/REZ-franchise-*

Status: NEEDS MERGE
Action: Consolidate into Nexha/franchise-os/
```

## Subscription/Billing
```
Canonical: companies/HOJAI-AI/services/billing-service/
Duplicates:
- companies/HOJAI-AI/platform/infra/billing/
- companies/HOJAI-AI/platform/infra/billing-apis/
- companies/AdBazaar/subscription-management/
- companies/AdBazaar/subscription-billing-service/
- companies/RABTUL-Technologies/REZ-subscription-service/
- companies/REZ-Merchant/rez-voice-billing/

Status: NEEDS CONSOLIDATION
Action: Build SubscriptionOS wrapper around HOJAI billing
```

## Marketplace
```
Canonical: industry-os/services/marketplace-os/
Duplicates:
- companies/HOJAI-AI/blr-ai-marketplace/
- companies/RABTUL-Technologies/REZ-agent-marketplace/
- companies/REZ-Merchant/rez-supplier-marketplace/
- companies/REZ-Merchant/marketplace-network/
- companies/RTNM-REE/ai-marketplace/
- companies/AdBazaar/*-marketplace/ (8 instances!)

Status: NEEDS CONSOLIDATION
Action: Merge BLR AI Marketplace into industry-os/services/marketplace-os/
```

## Trust & Security
```
Canonical Components:
- shared/security-shared/
- LawGens/REZ-trust-os/
- LawGens/trust-os-shield-*/
- companies/RABTUL-Technologies/rabtul-trust-engine/
- companies/RABTUL-Technologies/REZ-trust-scorer/
- industry-os/services/security-os/

Status: NEEDS UNIFIED TRUST & SECURITYOS
Action: Merge into single Trust & SecurityOS product
```

## Elder Care
```
Canonical: companies/RisaCare/risa-care-elderly-service/
Duplicate: industry-os/services/eldercare-os/

Status: EXISTS IN RISA CARE
Action: Use RisaCare version, deprecate eldercare-os
```

## Telemedicine
```
Canonical: companies/RisaCare/risa-care-telemedicine-service/

Status: EXISTS IN RISA CARE
Action: Keep, add to RisaCare product bundle
```

## Doctor Copilot
```
Search Results: No standalone doctor copilot found

Status: MISSING (as standalone product)
Action: Build as module within RisaCare
```

## Cloud Kitchen
```
Search Results: No standalone cloud kitchen found

Status: MISSING
Action: Build as module within Restaurant OS
```

## Revenue AI
```
Canonical: industry-os/services/revenue-intelligence-os/ (port 5400)

Status: EXISTS
Action: Keep, rename to "Revenue AI"
```

---

# CONSOLIDATION PRIORITY

## P0 - Critical for Phase 1

1. **Sales OS**
   - Consolidate sales-hub, sales-intelligence, REZ-SalesMind
   - Target: industry-os/services/sales-os/

2. **RisaCare**
   - Merge healthcare-os into RisaCare
   - Add doctor copilot module
   - Add telemedicine module

3. **StayOwn**
   - Consolidate hotel-os from REZ-Workspace
   - Keep as canonical

## P1 - Platform Heroes

4. **SubscriptionOS**
   - Consolidate billing services
   - Build SubscriptionOS wrapper

5. **MarketplaceOS**
   - Consolidate 8+ marketplace instances
   - Build unified marketplace

6. **Trust & SecurityOS**
   - Merge trust + security services
   - Build unified security product

## P2 - Product Extensions

7. Restaurant OS → Add Cloud Kitchen module
8. Workforce OS → Consolidate from multiple sources
9. Franchise OS → Consolidate from Nexha + REZ

---

# WHAT NOT TO BUILD (Already Exists)

```
1. Sales CRM - EXISTS (sales-os)
2. Healthcare OS - EXISTS (RisaCare)
3. Hotel OS - EXISTS (StayOwn)
4. Restaurant OS - EXISTS (restaurant-os)
5. Workforce OS - EXISTS (workforce-os)
6. Telemedicine - EXISTS (RisaCare)
7. Elder Care - EXISTS (RisaCare)
8. Franchise Management - EXISTS (Nexha)
9. Subscription Billing - EXISTS (HOJAI billing)
10. Marketplace - EXISTS (BLR AI Marketplace)
11. Trust Engine - EXISTS (RABTUL)
12. Security - EXISTS (LawGens, shared)
13. Revenue Intelligence - EXISTS (revenue-intelligence-os)
```

---

# WHAT TO BUILD (Gaps)

```
1. Doctor Copilot - Add to RisaCare
2. Cloud Kitchen OS - Add to Restaurant OS
3. SubscriptionOS - Wrapper around existing billing
4. MarketplaceOS - Wrapper around BLR AI Marketplace
5. Trust & SecurityOS - Unified wrapper
6. PartnerOS - NEW (not found in codebase)
7. DeveloperOS - NEW (not found in codebase)
```

---

*Document Version: 1.0*
*Status: AUDIT COMPLETE*
*Next: Execute consolidation plan*
