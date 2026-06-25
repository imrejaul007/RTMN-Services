# Company Starter — HOJAI Foundry

> **Version:** 0.1.0
> **Type:** Industry Starter Kit (generic/foundation)
> **Stack:** HOJAI Foundry + SUTAR + Nexha Federation

---

## What it is

The **generic company template** for HOJAI Foundry. Use this when no specific industry template fits — it creates a fully operational company with 6 AI employees, commerce infrastructure, and federation membership. All other industry starters (marketplace, B2B, restaurant, hotel, etc.) are built on top of this.

---

## What's included

```
company-starter/
├── apps/
│   ├── backend/            # Express server
│   │   └── src/
│   │       ├── index.js  # Entry point
│   │       ├── agents/  # 6 AI employees
│   │       └── __tests__/
│   └── frontend/          # React app
├── foundry/
│   ├── config.yaml       # Company config
│   └── templates/        # Customization templates
├── CLAUDE.md
└── README.md
```

---

## The 6 AI Employees

| Agent | Role | What it does |
|---|---|---|
| **Sales Agent** | Revenue | Lead gen, nurture, close deals |
| **Support Agent** | Retention | FAQ, ticket routing, escalation |
| **Finance Agent** | Accounting | Invoicing, reconciliation, reporting |
| **Procurement Agent** | Operations | Supplier sourcing, RFQ, negotiation |
| **Marketing Agent** | Growth | Content, ads, SEO, referral loops |
| **Operations Agent** | Execution | Order fulfillment, logistics, returns |

---

## Commerce Stack

| Component | Implementation |
|---|---|
| **Payments** | Stripe + REZ Coin |
| **Catalog** | HOJAI Commerce SDK |
| **Orders** | HOJAI Order Management |
| **Logistics** | KHAIRMOVE (Delhivery, BlueDart, FedEx, DHL) |
| **Wallet** | REZ Coin (earn on every transaction) |
| **Widget** | HOJAI Widget (5KB, voice + i18n) |

---

## Federation Stack

| Service | Port | Purpose |
|---|---|---|
| **CapabilityOS** | 4270 | List your capabilities |
| **ReputationOS** | 4271 | ACS trust score |
| **DiscoveryOS** | 4272 | Discover other companies |
| **FederationOS** | 4273 | Join the network |
| **OpportunityOS** | 4274 | Match to opportunities |
| **MarketOS** | 4275 | Market intelligence |
| **GlobalDirectory** | 4276 | Federation yellow pages |

---

## Quick start

```bash
# Create a company
npx hojai create my-brand --type company

# Customize
cd my-brand
nano foundry/config.yaml

# Deploy to federation
hojai deploy
```

---

## Customization

### Change AI employee personality

Edit `apps/backend/src/agents/system-prompt.ts` to customize each agent's behavior.

### Add industry vertical

```bash
# Layer a vertical on top of your company
hojai add vertical fashion
hojai add vertical restaurant
hojai add vertical hotel
```

### Connect to federation

```bash
# Join as a verified Nexha
hojai federation join --tier strategic
```

---

## REZ Coin Integration

Every company gets a REZ Coin wallet seeded with ₹10,000. Companies earn REZ on every transaction through the platform and can spend it across the federation.

```javascript
// Earn REZ
await rezCoinService.mint(walletId, amount, 'sale');

// Spend REZ
await rezCoinService.burn(walletId, amount, 'purchase');

// Transfer
await rezCoinService.transfer(fromWallet, toWallet, amount);
```

---

## Architecture

```
hojai.ai
└── Your Company
    ├── AI Employees (SUTAR framework)
    │   ├── TwinOS (entity memory)
    │   ├── MemoryOS (context + history)
    │   └── REZ Intelligence (predictions)
    ├── Commerce Stack
    │   ├── Payment (Stripe + REZ Coin)
    │   ├── Catalog + Orders
    │   └── Logistics (KHAIRMOVE)
    └── Federation Stack
        ├── Discovery (supply search)
        ├── Reputation (trust scores)
        └── Global Directory (yellow pages)
```

---

*Part of HOJAI Foundry — 9 industry starter kits.*
*Built on HOJAI Foundry v1.1.*