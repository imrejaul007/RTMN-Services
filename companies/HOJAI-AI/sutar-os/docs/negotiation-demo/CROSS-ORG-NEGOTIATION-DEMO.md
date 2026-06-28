# Cross-Organization Negotiation Demo

> **Scenario:** Global Electronics Manufacturer + Taiwanese Components Supplier + Indian Logistics Partner
> **Platform:** SUTAR OS + Nexha Federation
> **Date:** June 27, 2026

---

## Participants

| Party | Role | Industry | SUTAR Agent |
|-------|------|---------|-------------|
| **TechNova Electronics** | Buyer | Electronics Manufacturing | TechNova SUTAR (Buyer Agent) |
| **YuanWei Components** | Supplier | Taiwan Semiconductor Components | YuanWei SUTAR (Supplier Agent) |
| **KHAIRMOVE Logistics** | Logistics | Indian Freight & Customs | KHAIRMOVE SUTAR (Logistics Agent) |
| **Nexha Federation** | Network | Global B2B Commerce | Federation Discovery Agent |

---

## Negotiation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: DISCOVERY                                                    │
│                                                                         │
│  TechNova SUTAR ──► Nexha Discovery ──► Find components suppliers     │
│                           │                                            │
│                           └──► Matches: YuanWei Components (score: 0.94)│
│                                    KHAIRMOVE Logistics (score: 0.87)   │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: TRUST VERIFICATION                                            │
│                                                                         │
│  TechNova SUTAR ──► SADA Trust Engine ──► Verify YuanWei             │
│                           │                                            │
│                           ├──► YuanWei Trust Score: 87/100 (Gold)      │
│                           ├──► Compliance: ISO 9001 ✓, ISO 27001 ✓    │
│                           ├──► Trade History: 127 successful deals      │
│                           └──► Risk Level: LOW ✓                       │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: NEGOTIATION (8 rounds)                                       │
│                                                                         │
│  TechNova SUTAR (buyer) ──────── ACP Protocol ──────── YuanWei SUTAR  │
│                                                                         │
│  Round 1: TechNova → Request for Quotation (RFQ)                       │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ {                                                          │       │
│  │   "action": "QUERY",                                       │       │
│  │   "product": "MCU-ARM-Cortex-M4",                          │       │
│  │   "quantity": 50000,                                       │       │
│  │   "target_price": 2.80,                                    │       │
│  │   "delivery": "2026-09-30",                                │       │
│  │   "payment_terms": "net_60"                                │       │
│  │ }                                                          │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Round 2: YuanWei → Initial Quote                                     │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ {                                                          │       │
│  │   "action": "QUOTE",                                       │       │
│  │   "unit_price": 3.45,                                     │       │
│  │   "total": 172500,                                         │       │
│  │   "lead_time": "6 weeks",                                  │       │
│  │   "valid_until": "2026-07-15",                             │       │
│  │   "incoterms": "FOB Kaohsiung",                           │       │
│  │   "payment_terms": "net_30"                                │       │
│  │ }                                                          │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Round 3: TechNova → Counter-Offer                                    │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ {                                                          │       │
│  │   "action": "COUNTER",                                    │       │
│  │   "unit_price": 2.95,                                     │       │
│  │   "quantity": 75000,    // increased for better price     │       │
│  │   "payment_terms": "net_45",                               │       │
│  │   "delivery": "2026-10-15",                               │       │
│  │   "incoterms": "CIF Mumbai",    // we handle freight      │       │
│  │ }                                                          │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Round 4: YuanWei → Concessions                                        │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ {                                                          │       │
│  │   "action": "COUNTER",                                    │       │
│  │   "unit_price": 3.15,                                     │       │
│  │   "quantity": 75000,                                      │       │
│  │   "payment_terms": "net_45",                               │       │
│  │   "lead_time": "5 weeks",                                  │       │
│  │   "warranty": "24 months extended"                         │       │
│  │ }                                                          │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Round 5: TechNova → Final Push                                        │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ {                                                          │       │
│  │   "action": "COUNTER",                                    │       │
│  │   "unit_price": 3.05,                                     │       │
│  │   "bundle": {                                              │       │
│  │     "logistics": "KHAIRMOVE Logistics",                    │       │
│  │     "insurance": "included",                              │       │
│  │     "quality_inspection": "3rd party SGS"                  │       │
│  │   }                                                        │       │
│  │ }                                                          │       │
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Round 6: YuanWei → Agreement Reached                                  │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ {                                                          │       │
│  │   "action": "ACCEPT",                                      │       │
│  │   "unit_price": 3.05,                                     │       │
│  │   "total": 228750,                                         │       │
│  │   "quantity": 75000,                                       │       │
│  │   "payment_terms": "net_45",                               │       │
│  │   "lead_time": "5 weeks",                                  │       │
│  │   "incoterms": "CIF Mumbai",                              │       │
│  │   "warranty": "24 months",                                 │       │
│  │   "savings_vs_initial": "11.6%"                            │       │
│  │ }                                                          │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: CONTRACT EXECUTION                                             │
│                                                                         │
│  Contract OS ──► Generate Smart Contract ──► All Parties Sign (ACP)   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ SMART CONTRACT: SC-2026-0627-001                            │       │
│  │ ─────────────────────────────────────────────────────────   │       │
│  │ Buyer:         TechNova Electronics (IND)                   │       │
│  │ Supplier:      YuanWei Components (TWN)                     │       │
│  │ Product:       MCU-ARM-Cortex-M4                           │       │
│  │ Quantity:       75,000 units                               │       │
│  │ Unit Price:     USD 3.05                                   │       │
│  │ Total Value:    USD 228,750                                │       │
│  │ Payment:        Net 45 days from BL date                   │       │
│  │ Delivery:       CIF Mumbai, by 2026-10-15                  │       │
│  │ Warranty:       24 months                                  │       │
│  │ Escrow:         10% held until quality inspection passed    │       │
│  │ Dispute Res:    SUTAR Arbitration (48h resolution)         │       │
│  │ Governing Law:  Singapore International Arbitration Centre   │       ���
│  └──────────────────────────────────────────────────────────────┘       │
│                                                                         │
│  Trust Engine ──► Escrow: USD 22,875 (10%) deposited                   │
│  Contract OS ──► Contract Hash: 0x7f3a... committed to ledger          │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: LOGISTICS COORDINATION                                        │
│                                                                         │
│  KHAIRMOVE SUTAR ──► Receives shipment request via ACP                │
│                           │                                            │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │ LOGISTICS BOOKING: LB-2026-0627-001                       │       │
│  │ ─────────────────────────────────────────────────────────   │       │
│  │ Route:       Kaohsiung (TWN) → Mumbai (IND)               │       │
│  │ Carrier:     Evergreen Marine (vessel)                     │       │
│  │ Container:   1×20ft HQ + 2×40ft                          │       │
│  │ Freight:     USD 8,400 (negotiated from USD 9,200)        │       │
│  │ Customs:     Pre-cleared via KHAIRMOVE customs AI         │       │
│  │ Insurance:   USD 250,000 coverage, USD 375 premium        │       │
│  │ ETA:         14 days from departure                        │       │
│  │ Tracking:     IoT sensors + GPS via KHAIRMOVE             │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: DELIVERY & PAYMENT                                            │
│                                                                         │
│  Day 0:     Shipment departs Kaohsiung                                │
│  Day 14:    Arrives Mumbai Port                                        │
│  Day 15:    KHAIRMOVE customs AI clears in 4 hours (vs 2 days)        │
│  Day 15:    Quality inspection by SGS (India)                          │
│  Day 16:    Inspection passed → escrow released to YuanWei             │
│  Day 16:    TechNova receives goods → initiates payment                │
│  Day 61:    Payment of USD 228,750 clears to YuanWei account          │
│             (saved USD 31,725 vs original USD 258,750 quote)           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Negotiation Analytics

| Metric | Value |
|--------|-------|
| Total negotiation time | 23 minutes (8 rounds) |
| Initial ask | USD 3.45/unit |
| Final deal | USD 3.05/unit |
| **Savings** | **11.6% (USD 30,000)** |
| Logistics savings | 8.7% (USD 800) |
| Combined savings | USD 30,800 (13.2%) |
| Time to contract | 4 minutes (auto-generated) |
| Trust verification | 8 seconds |
| Cross-border compliance | Automated |

---

## What SUTAR Accomplished

| Task | Manual Time | SUTAR Time |
|------|-------------|------------|
| Supplier discovery | 2-3 days | 30 seconds |
| Trust verification | 1-2 days | 8 seconds |
| Negotiation | 2-4 weeks | 23 minutes |
| Contract drafting | 3-5 days | 4 minutes |
| Customs clearance | 1-2 days | 4 hours |
| **Total** | **3-6 weeks** | **24 hours** |

---

## Multi-Agent Orchestration

```
TechNova SUTAR (orchestrator)
├── TechNova-Negotiation-Agent     ──► Negotiates with YuanWei
├── TechNova-Logistics-Agent       ──► Coordinates with KHAIRMOVE
├── TechNova-Finance-Agent         ──► Payment scheduling, FX hedging
├── TechNova-Compliance-Agent     ──► Ensures import regulations met
├── TechNova-Inventory-Agent      ──► Syncs with ERP for just-in-time
└── TechNova-Risk-Agent           ──► Monitors delivery, flags delays
```

All agents communicate via **ACP Protocol** and report to the TechNova SUTAR orchestrator.
