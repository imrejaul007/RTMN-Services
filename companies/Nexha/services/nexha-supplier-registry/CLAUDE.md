# Nexha Supplier Registry — Service Documentation

> **Version:** 1.0.0
> **Port:** 4281
> **Path:** `companies/Nexha/services/nexha-supplier-registry/`
> **Phase:** Tier-5 — complete trade lifecycle

## Overview

The **Nexha Supplier Registry** closes the Tier-5 gap in the Nexha platform — the complete supplier trade lifecycle that runs from onboarding through to payment settlement. It sits on top of the existing `nexha-supplier-network` (port 4280, discovery + scoring) and adds the operational layer: KYB verification, digital contracts, RFQ/Quote/PO flow, shipment tracking, and payment settlement.

**Connected to:**
- `nexha-supplier-network` (4280) — discovery & matching
- `nexha-trade-finance-network` (4287) — payment/escrow
- `nexha-distribution-network` (4285) — logistics
- `nexha-pricing-network` (4286) — dynamic pricing intelligence
- `corp-id` (4702) — identity
- `sutar-contract-os` (4292) — smart contracts

## Trade Flow

```
Supplier Onboarding          Trade Operations
┌──────────────────┐         ┌─────────────────────────────────────┐
│ 1. Register      │         │                                     │
│ 2. KYB Submit    │────────►│ 6. Create RFQ ──────────────────┐   │
│ 3. KYB Verify    │         │ 7. Receive Quotes ──────────┐    │   │
│ 4. Create Draft  │         │ 8. Accept Quote            │    │   │
│ 5. Sign Contract │────────►│ 9. Purchase Order (PO)     │    │   │
│                  │         │ 10. Shipment Created ◄─────┘    │   │
└──────────────────┘         │ 11. Update Tracking ──────────┐    │   │
                             │ 12. Confirm Delivery ────────┤    │   │
                             │ 13. Initiate Payment ────────┤    │   │
                             │ 14. Settle (RABTUL) ──────────┘    │   │
                             │ 15. Dispute (if needed)            │   │
                             └─────────────────────────────────────┘
```

## Endpoints

### Registry & Onboarding
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/suppliers` | Register new supplier |
| `GET` | `/api/v1/suppliers` | List suppliers (filter by status/tier/verified) |
| `GET` | `/api/v1/suppliers/:id` | Get supplier details |
| `PATCH` | `/api/v1/suppliers/:id` | Update supplier |
| `GET` | `/api/v1/suppliers/:id/checklist` | Get onboarding checklist |
| `PATCH` | `/api/v1/suppliers/:id/checklist/:itemId` | Update checklist item |
| `GET` | `/api/v1/stats` | Registry + trade stats |

### KYB / Verification
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/suppliers/:id/kyb/initiate` | Start KYB process |
| `POST` | `/api/v1/suppliers/:id/kyb/submit` | Submit KYB data (GSTIN, PAN, bank) |
| `POST` | `/api/v1/suppliers/:id/kyb/approve` | Approve KYB (admin) |
| `POST` | `/api/v1/suppliers/:id/kyb/reject` | Reject KYB with reason |
| `POST` | `/api/v1/suppliers/:id/documents` | Upload verification document |
| `GET` | `/api/v1/suppliers/:id/trust-score` | Compute trust score |

### Contract
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/v1/contract/templates` | List contract templates |
| `POST` | `/api/v1/suppliers/:id/contract` | Create draft contract |
| `PATCH` | `/api/v1/suppliers/:id/contract` | Update draft contract |
| `POST` | `/api/v1/suppliers/:id/contract/sign` | Sign & activate contract |
| `GET` | `/api/v1/suppliers/:id/contract` | Get contract |

### Trade Flow
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/trade/rfq` | Create RFQ (Request for Quote) |
| `GET` | `/api/v1/trade/rfq` | List RFQs |
| `GET` | `/api/v1/trade/rfq/:id` | Get RFQ with quotes |
| `POST` | `/api/v1/trade/quotes` | Submit quote |
| `POST` | `/api/v1/trade/quotes/:id/accept` | Accept quote → PO |
| `POST` | `/api/v1/trade/quotes/:id/reject` | Reject quote |
| `GET` | `/api/v1/trade/po/:id` | Get PO |
| `GET` | `/api/v1/trade/po` | List POs |
| `PATCH` | `/api/v1/trade/po/:id/status` | Update PO status |
| `GET` | `/api/v1/trade/shipment/po/:poId` | Get shipment |
| `PATCH` | `/api/v1/trade/shipment/:id/track` | Update tracking info |
| `POST` | `/api/v1/trade/shipment/:id/event` | Add shipment event |
| `POST` | `/api/v1/trade/po/:id/payment` | Initiate payment |
| `POST` | `/api/v1/trade/payment/:id/complete` | Mark payment complete |
| `POST` | `/api/v1/trade/disputes` | Raise dispute |
| `PATCH` | `/api/v1/trade/disputes/:id/resolve` | Resolve dispute |

## Usage Example

```bash
# 1. Register a supplier
curl -X POST http://localhost:4281/api/v1/suppliers \
  -H 'Content-Type: application/json' \
  -d '{"corpId":"corp-freshkart","name":"FreshKart Grocers","email":"ops@freshkart.in"}'

# 2. Submit KYB
curl -X POST http://localhost:4281/api/v1/suppliers/reg-xxx/kyb/submit \
  -H 'Content-Type: application/json' \
  -d '{"gstin":"27AABCU9603R1ZM","pan":"AAACH1234C","businessType":"private_ltd","annualTurnover":50000000}'

# 3. Create & sign contract
curl -X POST http://localhost:4281/api/v1/suppliers/reg-xxx/contract \
  -H 'Content-Type: application/json' \
  -d '{"template":"standard"}'

curl -X POST http://localhost:4281/api/v1/suppliers/reg-xxx/contract/sign \
  -H 'Content-Type: application/json' \
  -d '{"signedBy":"user-123","signedName":"Raj Kumar","signedTitle":"Director"}'

# 4. Create RFQ
curl -X POST http://localhost:4281/api/v1/trade/rfq \
  -H 'Content-Type: application/json' \
  -d '{
    "buyerNexhaId":"nx-buyer-001",
    "supplierIds":["reg-xxx"],
    "category":"groceries",
    "items":[{"description":"Basmati Rice 5kg","quantity":100,"unit":"bag"}],
    "deliveryLocation":"Mumbai",
    "deliveryBy":"2026-07-01"
  }'

# 5. Submit quote (supplier side)
curl -X POST http://localhost:4281/api/v1/trade/quotes \
  -H 'Content-Type: application/json' \
  -d '{"rfqId":"rfq-xxx","supplierId":"reg-xxx","supplierName":"FreshKart Grocers","lineItems":[{"description":"Basmati Rice 5kg","quantity":100,"unitPrice":380}]}'

# 6. Accept quote → PO created
curl -X POST http://localhost:4281/api/v1/trade/quotes/quote-xxx/accept

# 7. Initiate payment
curl -X POST http://localhost:4281/api/v1/trade/po/po-xxx/payment
```

## Supplier Tiers

| Tier | Max Order | Commission | Payment Terms | Verification |
|------|-----------|------------|---------------|--------------|
| Bronze | ₹50K | 5% | 30 days | Basic |
| Silver | ₹5L | 4% | 30 days | Standard |
| Gold | ₹50L | 3% | 15 days | Enhanced |
| Platinum | ₹5Cr | 2% | 7 days | Enhanced |
| Diamond | Unlimited | 1% | 0 days | Certified |

## Order Status Flow

```
rfq → quote_received → quote_accepted → negotiating → awarded → confirmed → processing → shipped → delivered → completed
                                                                         ↘ disputed ↘ disputed
```

## File Structure

```
nexha-supplier-registry/
├── src/
│   ├── index.ts                    # Express server, all routes
│   ├── types/index.ts             # All type definitions
│   └── services/
│       ├── onboarding.service.ts  # Registry CRUD + checklist
│       ├── verification.service.ts # KYB, GSTIN, trust score
│       ├── contract.service.ts    # Contract templates, signing
│       └── trade.service.ts      # RFQ → PO → shipment → payment
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml
└── CLAUDE.md
```
