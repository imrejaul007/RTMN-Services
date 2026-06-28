# SiteOS Commerce Gaps — Build Plan
**Version:** 1.0
**Date:** June 28, 2026
**Status:** Ready for execution

---

## Executive Summary

Based on the competitive audit, 4 critical gaps need to be filled:

| Priority | Module | Effort | Business Impact |
|----------|--------|--------|-----------------|
| P0 | Widget Cart/Checkout UI | High | Enables in-widget purchases |
| P0 | Payment Wiring | High | Native UPI/Razorpay checkout |
| P1 | Review Collection | Medium | Active review requests |
| P1 | Loyalty Integration | Medium | Points/rewards in widget |

---

## Implementation Order

### Phase 1: Core Commerce (P0)
1. Product Catalog Service (Port 5476)
2. Cart Service (Port 5477)
3. Checkout Service (Port 5478)

### Phase 2: Payments (P0)
1. Payment Gateway Service (Port 5479)
2. Wire @hojai/payment SDK into widget backend
3. WhatsApp payment flow

### Phase 3: Reviews & Loyalty (P1)
1. Review Collection Service (Port 5480)
2. Loyalty Connector Service (Port 5481)
3. Widget UI updates

---

## Success Metrics

| Module | Test Count | Lines of Code |
|--------|-----------|---------------|
| Product Catalog | 15 | 250 |
| Cart Service | 20 | 200 |
| Checkout Service | 20 | 250 |
| Payment Gateway | 25 | 350 |
| Review Collection | 15 | 200 |
| Loyalty Connector | 15 | 200 |
| **Total** | **110** | **~1,450** |
