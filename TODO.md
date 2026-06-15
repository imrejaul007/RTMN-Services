# NeXha - TODO / Missing Features

**Last Updated:** June 15, 2026
**Status:** 60% Built

---

## Completed ✅

### Core ProcurementOS
- [x] Supplier Directory
- [x] RFQ Management
- [x] Deal State Machine (17 states)
- [x] Capability Matching (7-dimension)
- [x] Negotiation Tracking
- [x] Quote Comparison
- [x] Contract Management

### Buyer Agent
- [x] Multi-channel communication
- [x] RFQ dispatch
- [x] SLA tracking
- [x] Counter-offer handling
- [x] Quote recording

### Seller Agent (Built June 15, 2026)
- [x] Guest supplier registration (no GST)
- [x] Temporary IDs (GST-XXXXXXXX)
- [x] WhatsApp onboarding
- [x] Inbound RFQ webhook
- [x] Auto-quote generation
- [x] Counter-offer workflow

### Commerce Intelligence (Built June 15, 2026)
- [x] Commerce Memory
- [x] Seasonal pattern detection
- [x] Supplier insights
- [x] Buyer patterns
- [x] Commerce Feed
- [x] Auto-Reputation Pipeline
- [x] Nexha-SUTAR Bridge

### Other OS Services
- [x] DistributionOS
- [x] FranchiseOS
- [x] ManufacturingOS
- [x] TradeFinance
- [x] Intelligence
- [x] Ecosystem Connector

---

## Missing - Critical Priority

### 1. Supplier Product Catalog API
**Impact:** Required for auto-quote to work

```typescript
// MISSING - Need to build
POST /api/sellers/products      // Add product
GET  /api/sellers/:id/products  // List products
PUT  /api/sellers/:id/products/:pid  // Update product
DELETE /api/sellers/:id/products/:pid  // Delete product
POST /api/sellers/:id/products/bulk  // Bulk import
```

**Why:** Currently auto-quote can't find products to price.

---

### 2. Inventory Check Integration
**Impact:** Required for accurate auto-quote

```typescript
// MISSING - Need to build
GET /api/sellers/:id/inventory  // Check stock levels
POST /api/sellers/:id/inventory/reserve  // Reserve stock
POST /api/sellers/:id/inventory/sync  // Sync with ERP
```

**Why:** Suppliers need to check actual stock before quoting.

---

### 3. WhatsApp Business API Integration
**Impact:** Required for guest onboarding

```typescript
// MISSING - Need to build
POST /api/whatsapp/send-rfq    // Send RFQ via WhatsApp
POST /api/whatsapp/webhook     // Receive WhatsApp messages
POST /api/whatsapp/send-otp   // Send OTP for verification
```

**Why:** Suppliers need to receive RFQs via WhatsApp without installing apps.

---

### 4. SUTAR Intent Bus Connection
**Impact:** Required for autonomous agents

```typescript
// MISSING - Need to verify connection
// Currently bridge emits events but connection may not be live
await sutarIntentBus.subscribe('rfq.received', handler);
await sutarIntentBus.publish({ type: 'rfq.received', data });
```

**Why:** Without this, agents can't communicate autonomously.

---

## Missing - High Priority

### 5. ContractOS Integration
**Impact:** Required for deal closure

```typescript
// MISSING - Need to build
POST /api/contracts/generate  // Generate from negotiated terms
GET  /api/contracts/:id       // Get contract
POST /api/contracts/:id/sign  // E-signature
POST /api/contracts/:id/verify  // Verify signatures
```

**Why:** After negotiation, need legally binding contracts.

---

### 6. Payment Gateway Connection
**Impact:** Required for settlement

```typescript
// MISSING - Need to connect
// TradeFinance has the service but need to connect:
// - Razorpay for UPI/card payments
// - BNPL settlement
// - Credit line utilization

POST /api/payments/initiate  // Initiate payment
POST /api/payments/verify   // Verify payment
GET  /api/payments/:id      // Get status
```

**Why:** Need actual payment processing, not just record-keeping.

---

### 7. Supplier Dashboard Portal
**Impact:** Required for adoption

```typescript
// MISSING - Need to build Next.js portal
// pages/seller/
//   - dashboard.tsx      // Overview stats
//   - rfqs.tsx         // Pending RFQs
//   - quotes.tsx       // Submitted quotes
//   - products.tsx     // Product catalog
//   - orders.tsx       // Active orders
//   - analytics.tsx    // Performance analytics
//   - settings.tsx     // Account settings
```

**Why:** Suppliers need a UI to manage their business.

---

### 8. Buyer Analytics Dashboard
**Impact:** Required for intelligence

```typescript
// MISSING - Need to build
// pages/buyer/
//   - analytics.tsx      // Supplier performance
//   - comparison.tsx     // Side-by-side comparison
//   - trends.tsx        // Price/trend analysis
//   - reports.tsx       // Downloadable reports
```

**Why:** Buyers need insights on supplier performance.

---

## Missing - Medium Priority

### 9. Multi-language Support
**Impact:** India market requirement

```typescript
// MISSING - Need to build
// i18n configuration
// - Hindi
// - Marathi
// - Tamil
// - Telugu
// - Bengali

import i18n from './i18n';

app.use(i18n.init);
```

**Why:** Not all suppliers speak English.

---

### 10. Mobile App (React Native)
**Impact:** Field supplier requirement

```typescript
// MISSING - Need to build
// apps/nexha-seller-app/
//   - src/screens/
//     - HomeScreen.tsx
//     - RFQListScreen.tsx
//     - QuoteScreen.tsx
//     - OrderScreen.tsx
//   - src/services/
//     - api.ts
//     - websocket.ts
//   - src/components/
```

**Why:** Field suppliers need mobile access.

---

### 11. SUTAR Trust Engine Connection
**Impact:** Required for credit scoring

```typescript
// MISSING - Need to connect
await sutarTrust.updateScore({
  entityId: supplierId,
  scores: { trust: 85, risk: 'low' }
});

await sutarTrust.getScore(entityId);
```

**Why:** BNPL requires trust scores for credit decisions.

---

### 12. Insurance Verification
**Impact:** Required for compliance

```typescript
// MISSING - Need to build
POST /api/verification/insurance  // Submit insurance
GET  /api/verification/status      // Check verification status
POST /api/verification/certificate  // Upload certificate
```

**Why:** Certain categories require insurance.

---

### 13. GST Verification
**Impact:** Required for tax compliance

```typescript
// MISSING - Need to build
POST /api/verification/gstin    // Verify GSTIN
GET  /api/verification/gstin/:id  // Get GSTIN details
POST /api/verification/pan      // Verify PAN
```

**Why:** GSTIN verification for tax compliance.

---

### 14. E-Invoicing Integration
**Impact:** Required for B2B compliance

```typescript
// MISSING - Need to build
POST /api/invoicing/generate   // Generate e-invoice
GET  /api/invoicing/:id/irn   // Get IRN
POST /api/invoicing/ewaybill  // Generate e-way bill
```

**Why:** B2B requires e-invoicing.

---

### 15. Notification Service
**Impact:** Required for engagement

```typescript
// MISSING - Need to build
POST /api/notifications/send  // Send notification
GET  /api/notifications       // List notifications
PUT  /api/notifications/:id/read  // Mark as read
POST /api/notifications/preferences  // Set preferences
```

**Why:** Suppliers need alerts for RFQs, orders, payments.

---

## Missing - Low Priority

### 16. AI Quote Assistant
**Impact:** Nice to have

```typescript
// MISSING - Future feature
POST /api/ai/quote-suggestions  // Get AI suggestions
POST /api/ai/price-recommendation  // Get price recommendation
```

**Why:** Help suppliers price competitively.

---

### 17. Bulk Order Processing
**Impact:** Enterprise feature

```typescript
// MISSING - Future feature
POST /api/orders/bulk-create   // Create multiple orders
POST /api/orders/bulk-import   // Import from CSV
GET  /api/orders/bulk-export   // Export to CSV
```

**Why:** Large buyers need bulk operations.

---

### 18. White-label / Reseller
**Impact:** Business model

```typescript
// MISSING - Future feature
POST /api/reseller/register    // Register as reseller
GET  /api/reseller/dashboard   // Reseller dashboard
POST /api/reseller/configure   // Configure white-label
```

**Why:** Enable partners to resell NeXha.

---

## Build Order

### Phase 1: Critical (This Week)
1. Supplier Product Catalog API
2. Inventory Check Integration
3. WhatsApp Business API

### Phase 2: High (This Month)
4. SUTAR Intent Bus Verification
5. ContractOS Integration
6. Payment Gateway Connection
7. Supplier Dashboard Portal

### Phase 3: Medium (This Quarter)
8. Buyer Analytics Dashboard
9. Multi-language Support
10. Mobile App MVP
11. SUTAR Trust Engine Connection
12. GST/PAN Verification

### Phase 4: Future
13. Insurance Verification
14. E-Invoicing
15. Notification Service
16. AI Quote Assistant
17. Bulk Order Processing
18. White-label/Reseller

---

## Estimated Effort

| Phase | Features | Estimated Time |
|-------|----------|----------------|
| Phase 1 | 3 | 1 week |
| Phase 2 | 4 | 2 weeks |
| Phase 3 | 5 | 1 month |
| Phase 4 | 6 | 1 quarter |

---

**Last Updated:** June 15, 2026
