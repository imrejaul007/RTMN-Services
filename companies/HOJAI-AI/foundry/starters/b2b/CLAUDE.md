# B2B Starter — HOJAI Foundry

> **Version:** 0.1.0
> **Type:** Industry Starter Kit
> **Stack:** HOJAI Foundry + SUTAR + Nexha Federation

---

## What it is

A **B2B platform for RFQ workflows, bulk procurement, and supplier management** built on HOJAI Foundry. Creates a fully operational B2B marketplace with AI procurement agents, supplier discovery, and federation buying networks — in 30 minutes.

---

## What's included

```
b2b-starter/
├── apps/
│   ├── backend/          # Express server
│   │   └── src/
│   │       ├── index.js   # Entry point
│   │       ├── agents/   # AI procurement agents
│   │       └── __tests__/
│   └── frontend/          # React app
│       └── src/
├── foundry/               # HOJAI Foundry config
│   ├── config.yaml
│   └── templates/
├── CLAUDE.md
└── README.md
```

---

## AI Employees

| Agent | Role | Port |
|---|---|---|
| Procurement Agent | Supplier sourcing, RFQ, negotiation | — |
| Sales Agent | B2B lead gen, proposal gen | — |
| Finance Agent | Invoice reconciliation, credit checks | — |
| Compliance Agent | KYC, supplier verification | — |

---

## Key workflows

### RFQ workflow

```bash
Buyer posts RFQ
  → Procurement Agent finds matching suppliers (DiscoveryOS)
  → Each supplier gets AI-generated proposal
  → Buyer compares proposals (Trust + Price + SLA)
  → Negotiation Agent assists both parties
  → Contract signed (Smart Contracts via SUTAR)
  → Order created (Nexha Commerce)
  → Fulfillment via KHAIRMOVE logistics
  → Payment via Stripe + REZ Coin
  → Trust score updated (ReputationOS)
```

---

## Federation integration

- **DiscoveryOS** — suppliers discover buyers' RFQs
- **ReputationOS** — ACS scores for all participants
- **GlobalDirectory** — yellow pages for B2B services
- **REZ Coin** — bulk transaction token (1 REZ = 1 INR)

---

## Quick start

```bash
npx hojai create my-b2b --type b2b
cd my-b2b
hojai deploy
```

---

*Part of HOJAI Foundry — 9 industry starter kits.*