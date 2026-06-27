# Cross-Border Trade Copilot — Product Specification

**Version:** 1.0 | **Date:** June 28, 2026 | **Product:** P2 (Phase 4) | **Build:** ₹50L / 9 weeks | **ARR:** ₹3.6Cr

---

## 1. Concept & Vision

AI-powered assistant for international trade — document automation, duty optimization, customs clearance, trade finance.

**The feeling:** Like having a customs broker and trade finance expert in your pocket.

---

## 2. Problem Statement

- 70% of trade delays due to documentation errors
- 15-25% customs duty overpayment avg
- Trade finance gap: ₹30L Crore for Indian SMBs
- 80% of SMBs avoid exports due to compliance complexity

---

## 3. Core Features

### 4.1 HS Code Classification (P0)
```python
classify_product(product_description, image) -> HS Code + Duty Rate + Confidence
```

### 4.2 Document Automation (P0)
- Commercial Invoice, Packing List, Certificate of Origin
- Bill of Lading, Shipping Bill, Bill of Entry
- Auto-fill from order data, digital signatures

### 4.3 Duty Optimization (P0)
- FTA Advisor (India-Korea, India-Japan, India-MERCOSUR)
- Advanced Licensing (EPCG, DEPB, DFIA)
- SEZ benefits, Project imports

### 4.4 Customs Clearance (P0)
- ICEGATE integration
- Bill of Entry generation
- Real-time status tracking

### 4.5 Trade Finance (P1)
- Pre/Post-Shipment Credit
- Export Factoring, LC Discounting
- Supply Chain Finance
- AI matchmaking to best products

---

## 5. AI Agents

| Agent | Function |
|-------|----------|
| Classification Agent | Product description → HS code |
| Document Agent | Error detection, auto-fill |
| Duty Advisor | FTA opportunities, policy changes |
| Compliance Agent | Regulatory tracking, restrictions |

---

## 6. Data Model

```typescript
interface TradeCopilotTwin {
  id: string;
  organizationId: string;
  profile: { iec, gstin, pan, exportMarkets, importMarkets };
  shipments: Shipment[];
  compliance: { licenses, quotas, certificates };
}

interface Shipment {
  id: string;
  type: 'export' | 'import';
  product: { description, hsCode, quantity, value };
  logistics: { incoterm, origin, destination, eta };
  financial: { dutyPaid, gstPaid, totalLandedCost };
  status: ShipmentStatus;
  documents: Document[];
}
```

---

## 7. API Endpoints

```
POST  /api/classify                    # HS Code classification
GET   /api/hs-codes/:code             # Get HS code details
POST  /api/documents/generate          # Generate documents
POST  /api/costs/calculate            # Cost calculation
POST  /api/costs/optimize             # Duty optimization
POST  /api/customs/bill-of-entry       # Generate BoE
GET   /api/finance/products           # Trade finance products
POST  /api/finance/match              # Finance matchmaking
```

---

## 8. Government Integrations

| System | Purpose |
|--------|---------|
| ICEGATE | Filing, duty payment, status |
| DGFT | IEC, licenses, authorizations |
| customs.nic.in | Tariff database |
| GST Portal | GST compliance |
| RBI | Forex reporting |

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Classification accuracy | 95% |
| Document error rate | <5% |
| Duty savings | 15-25% |
| Clearance time | -50% |
| Finance approval rate | 80% |

---

## 10. Go-to-Market

### Phase 1: Pilot (Month 1-3)
- 10 companies, SEA + EU routes
- Basic classification + docs

### Phase 2: Expansion (Month 3-6)
- 50 companies
- Full trade finance + customs

### Phase 3: Scale (Month 6-9)
- 200 companies, multi-country

### Revenue Model
- Subscription: ₹10K-100K/month
- Per-shipment: ₹500-5,000
- Finance referral: 0.5-1% of financed amount

---

*Spec created: June 28, 2026*
