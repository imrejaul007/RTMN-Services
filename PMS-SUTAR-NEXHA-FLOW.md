# PMS → SUTAR → NEXHA Complete Flow

**Date:** June 18, 2026

---

## The Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 1: PMS DETECTS LOW INVENTORY                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PMS (Property Management System) runs inventory check:                 │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     INVENTORY CHECK                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │   │
│  │  │ Bath Towels  │  │  Bed Sheets  │  │  Pillows     │        │   │
│  │  │ Stock: 50    │  │ Stock: 30    │  │ Stock: 80    │        │   │
│  │  │ Min: 100    │  │ Min: 50     │  │ Min: 40     │        │   │
│  │  │ ⚠️ LOW      │  │ ⚠️ LOW      │  │ ✅ OK       │        │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘        │   │
│  │                                                                  │   │
│  │  Alert: "Towels and Sheets below minimum!"                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 2: PMS CALLS SUTAR                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PMS publishes event to SUTAR Event Bus:                               │
│                                                                          │
│  POST http://localhost:4799/events/publish                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  {                                                               │   │
│  │    "topic": "hotel.inventory.low",                              │   │
│  │    "payload": {                                                 │   │
│  │      "hotelId": "GRAND-001",                                    │   │
│  │      "category": "linen",                                       │   │
│  │      "items": [                                                 │   │
│  │        {"name": "Bath Towels", "qty": 50, "min": 100},         │   │
│  │        {"name": "Bed Sheets", "qty": 30, "min": 50}            │   │
│  │      ],                                                          │   │
│  │      "urgency": "high",                                         │   │
│  │      "detectedBy": "pms"                                        │   │
│  │    }                                                             │   │
│  │  }                                                               │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Response:                                                              │
│  { "eventId": "89592c5c-6ff3-4b5e-88e6-5b090a6e1701" }              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 3: SUTAR PROCESSES                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  SUTAR does THREE things with this event:                              │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  1. STORE EVENT                                                 │   │
│  │     └── Added to event log for audit trail                      │   │
│  │     └── Available for later query                                │   │
│  │                                                                  │   │
│  │  2. EVALUATE TRUST SCORES                                       │   │
│  │     └── Query suppliers with trust >= threshold                  │   │
│  │     └── urgency=high → threshold=75                            │   │
│  │     └── Only trusted suppliers will be contacted                │   │
│  │                                                                  │   │
│  │  3. NOTIFY SUBSCRIBERS                                          │   │
│  │     └── Nexha ProcurementOS is listening                         │   │
│  │     └── "hotel.inventory.low" event triggers RFQ creation      │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  SUTAR Policy Check:                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  POST http://localhost:4799/policy/evaluate                     │   │
│  │  { "action": "supplier.status.active", "corpId": "SUP-XXX" }   │   │
│  │  Response: { "allowed": true }                                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 4: NEXHA PROCUREMENT                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Nexha ProcurementOS receives the trigger:                              │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  1. MATCH SUPPLIERS                                             │   │
│  │     └── Category: "linen"                                       │   │
│  │     └── Trust Score >= 75 (from SUTAR)                         │   │
│  │     └── Location: Same city/region                              │   │
│  │     └── Capacity: Can fulfill in time                          │   │
│  │                                                                  │   │
│  │  2. CREATE RFQ                                                  │   │
│  │     ┌─────────────────────────────────────────────────────┐    │   │
│  │     │  RFQ-2024-001                                       │    │   │
│  │     │  ─────────────────────────────────────────────    │    │   │
│  │     │  Buyer: GRAND-001 (Hotel)                        │    │   │
│  │     │  Category: Linen                                 │    │   │
│  │     │  Items:                                          │    │   │
│  │     │    • Bath Towels x 100                          │    │   │
│  │     │    • Bed Sheets x 50                            │    │   │
│  │     │  Urgency: High                                  │    │   │
│  │     │  Invited Suppliers: ABC Linen, XYZ Textiles      │    │   │
│  │     │  Deadline: 24 hours                             │    │   │
│  │     └─────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  3. SEND RFQ TO SUPPLIERS                                      │   │
│  │     └── WhatsApp/SMS/Email notifications                        │   │
│  │     └── Auto-generated quotes requested                        │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 5: SUPPLIERS RESPOND                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  SUPPLIER 1: ABC Linen Supply                                   │   │
│  │  ├── Trust Score: 85                                           │   │
│  │  ├── Quote: ₹15,000 (Bath Towels x 100)                       │   │
│  │  ├── Quote: ₹8,000 (Bed Sheets x 50)                          │   │
│  │  └── Delivery: 2 days                                          │   │
│  │                                                                  │   │
│  │  SUPPLIER 2: XYZ Textiles                                       │   │
│  │  ├── Trust Score: 78                                           │   │
│  │  ├── Quote: ₹14,500 (Bath Towels x 100)                       │   │
│  │  ├── Quote: ₹7,500 (Bed Sheets x 50)                          │   │
│  │  └── Delivery: 3 days                                          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  Nexha ranks by: Trust Score + Price + Delivery Time                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 6: DEAL AWARDED                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Best quote selected (ABC Linen - lower price, faster delivery):       │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  DEAL CREATED                                                   │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  Deal ID: DEAL-ABC-001                                 │    │   │
│  │  │  ─────────────────────────────────────────────────    │    │   │
│  │  │  Supplier: ABC Linen Supply                           │    │   │
│  │  │  Supplier CorpID: SUP-ABC-001                        │    │   │
│  │  │  Trust Score: 85 ✅                                   │    │   │
│  │  │                                                          │    │   │
│  │  │  Items:                                                  │    │   │
│  │  │    • Bath Towels x 100 = ₹15,000                      │    │   │
│  │  │    • Bed Sheets x 50 = ₹8,000                         │    │   │
│  │  │    ─────────────────────────                          │    │   │
│  │  │    TOTAL: ₹23,000                                    │    │   │
│  │  │                                                          │    │   │
│  │  │  Status: awarded → processing                         │    │   │
│  │  │  Expected Delivery: 2 days                            │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  SUTAR Policy Check:                                                   │
│  POST /policy/evaluate                                                 │
│  { "action": "payment.process", "corpId": "GRAND-001" }               │
│  Response: { "allowed": true, "reason": "Within credit limit" }     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                     STEP 7: DELIVERY & PAYMENT                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  TRACKING:                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────┐    │   │
│  │  │  [████░░░░░░] Processing → Shipped → Delivered        │    │   │
│  │  │       25%           50%        100%                     │    │   │
│  │  └─────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  When DELIVERED:                                                │   │
│  │  ├── SUTAR: Supplier trust score +5 (on-time delivery)       │   │
│  │  ├── PMS: Inventory updated (Towels: 150, Sheets: 80)          │   │
│  │  ├── Nexha TradeFinance: Payment triggered                    │   │
│  │  └── SUTAR Event: "hotel.inventory.replenished"              │   │
│  │                                                                  │   │
│  │  When PAID:                                                     │   │
│  │  ├── Hotel trust score +2 (paid on time)                      │   │
│  │  └── Supplier trust score +3 (good payment relation)           │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

                                    │
                                    ▼

┌─────────────────────────────────────────────────────────────────────────┐
│                     COMPLETE FLOW SUMMARY                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PMS ──────────▶ SUTAR ──────────▶ Nexha ──────────▶ Hotel           │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                                                                  │   │
│  │  1. PMS detects low inventory                                   │   │
│  │  2. PMS → SUTAR: Publish "inventory.low" event                │   │
│  │  3. SUTAR: Stores event, checks supplier trust scores          │   │
│  │  4. SUTAR → Nexha: Notify "inventory.low"                     │   │
│  │  5. Nexha: Match suppliers (trust >= threshold)                │   │
│  │  6. Nexha: Create RFQ, send to matched suppliers              │   │
│  │  7. Suppliers: Submit quotes                                   │   │
│  │  8. Nexha: Award deal to best supplier                        │   │
│  │  9. SUTAR: Policy check (can hotel pay?)                      │   │
│  │  10. Nexha TradeFinance: Process BNPL if needed               │   │
│  │  11. Supplier: Delivers goods                                  │   │
│  │  12. PMS: Inventory updated                                    │   │
│  │  13. SUTAR: Update trust scores (supplier + hotel)            │   │
│  │  14. Nexha: Payment settlement                                │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  TOTAL TIME: ~24-48 hours from detection to delivery                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Calls

### Step 1: PMS Publishes Event
```bash
curl -X POST http://localhost:4799/events/publish \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "hotel.inventory.low",
    "payload": {
      "hotelId": "GRAND-001",
      "category": "linen",
      "items": [
        {"name": "Bath Towels", "qty": 50, "min": 100},
        {"name": "Bed Sheets", "qty": 30, "min": 50}
      ],
      "urgency": "high"
    }
  }'
```

### Step 2: Query Events
```bash
curl http://localhost:4799/events?topic=hotel.inventory.low
```

### Step 3: Supplier Trust Check
```bash
curl -X POST http://localhost:4799/trust/link \
  -H "Content-Type: application/json" \
  -d '{"corpId": "SUP-ABC-001", "subject": "supplier"}'
```

### Step 4: Policy Evaluation
```bash
curl -X POST http://localhost:4799/policy/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "action": "supplier.status.active",
    "corpId": "SUP-ABC-001"
  }'
```

### Step 5: Full Stats
```bash
curl http://localhost:4799/stats
```

---

## Event Types

| Event | Topic | Triggered By | Action |
|-------|-------|--------------|--------|
| Low Inventory | `hotel.inventory.low` | PMS | Start RFQ |
| RFQ Created | `procurement.rfq.created` | Nexha | Notify suppliers |
| Quote Received | `procurement.quote.received` | Supplier | Update ranking |
| Deal Awarded | `procurement.deal.awarded` | Nexha | Start fulfillment |
| Goods Shipped | `procurement.shipped` | Supplier | Update tracking |
| Goods Delivered | `procurement.delivered` | Supplier | Update inventory |
| Payment Done | `procurement.payment.done` | Finance | Update trust |

---

## Trust Score Impact

| Action | Supplier Score | Hotel Score |
|--------|---------------|-------------|
| On-time delivery | +5 | - |
| Quality accepted | +3 | - |
| Paid on time | +3 | +2 |
| Late delivery | -5 | - |
| Quality rejected | -10 | - |
| Late payment | -5 | -3 |

---

*PMS → SUTAR → Nexha = Autonomous Supply Chain*
