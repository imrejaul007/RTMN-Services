# CompanyOS - AI Context

**Version:** 1.3.0
**Platform:** RTMN CompanyOS
**Status:** 23 Phases Complete ✅

## Quick Start

```bash
cd /Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/company-os

# Start platform
bash scripts/start-company-os.sh start

# CLI
cd cli && npm install && npm link
company-os create "My Restaurant" --industry restaurant

# Run tests
cd ../composition-engine && npm test
```

---

## Platform Overview

CompanyOS is a **23-phase platform** for building companies.

### Phases 1-11: Core Platform
- Composition Engine (46 tests)
- Manifest Registry (24 tests)
- 6 Department Packs
- 26 Industry Extensions
- 10 AI Workers
- Studio UI + CLI

### Phases 12-15: EconomyOS
- 3 Wallet Types (Corporate/User/Agent)
- 10+ Distribution Channels
- 26 Company Factory Templates
- Wallet Adapters (REZ, Agent, HOJAI)

### Phases 16-19: Intelligence
- LearningOS (collective insights)
- Evolution Engine (startup→franchise)
- GovernanceOS (policies, authority)
- Company Intelligence (AI CEO layer)

### Phases 20-23: Ecosystem
- Creator Economy (partner revenue sharing)
- Industry Builder (partners create industries)
- Network Builder (Nexha networks)
- Federation Layer (global commerce)

---

## Key Files

| Module | Purpose |
|--------|---------|
| `composition-engine/` | Core company composer |
| `department-packs/` | Finance, HR, Marketing, Sales, Operations, Legal |
| `industry-extensions/` | 26 industry services |
| `economy-os/` | Wallets, Trust, Transactions |
| `learning-os/` | Industry insights |
| `evolution-engine/` | Company lifecycle |
| `governance-os/` | Policies, Authority |
| `creator-economy/` | Partner ecosystem |
| `network-builder/` | Nexha networks |
| `federation-layer/` | Global commerce |

---

## Tests

| Module | Count |
|--------|-------|
| composition-engine | 46 |
| manifest-registry | 24 |
| department-packs/finance | 9 |
| ai-workforce | 23 |
| restaurant extension | 15 |
| beauty extension | 10 |
| economy-os | 20 |
| All other modules | ~100+ |
| **Total** | **250+** |

---

## Distribution Channels (Phase 13)

| Channel | Type | Industries |
|---------|------|------------|
| DO | Consumer App | Restaurant, Beauty |
| REZ | Rewards | All |
| Nuqta | Loyalty | Restaurant |
| BuzzLocal | Discovery | Beauty |
| StayOwn | Hospitality | Hotel |
| Nexha | Agentic | All |
| Global Nexus | Federation | All |

---

## Connected Services

| Service | Location |
|---------|----------|
| REZ Wallet | RABTUL-Technologies/rez-wallet-service |
| Agent Wallet | agentfin/agent-wallet |
| HOJAI Wallet | HOJAI Wallet |
| Cross-Wallet | REZ-cross-wallet-identity |
| Nexha | companies/Nexha |
| REZ Services | REZ-Merchant/* |

---

## Evolution Stages

| Stage | Revenue | Employees | Features |
|-------|---------|-----------|----------|
| Startup | 0-5L | 1-10 | Basic CRM |
| Growth | 5L-50L | 5-50 | Multi-location |
| Enterprise | 50L-5Cr | 25-500 | Full suite |
| Franchise | 1Cr+ | 50+ | Brand mgmt |

---

## AI Workers

| Department | Workers |
|------------|---------|
| Finance | AI CFO, AI Accountant |
| HR | AI Recroller, AI Payroll |
| Marketing | AI CMO, AI Content |
| Sales | AI SDR, AI Closer |
| Operations | AI Ops Manager |
| Legal | AI Legal Counsel |

---

## Wallet Adapters

```typescript
import { unifiedWalletManager } from '@hojai/economy-os';

const wallet = await unifiedWalletManager.createCorporateWallet(companyId);
const balance = await wallet.getBalance(walletId);
```

---

## Company Factory

```bash
# CLI
company-os create "My Restaurant" --industry restaurant

# API
POST /api/company/create
```

---

## Architecture

```
CompanyOS Control Plane (4010)
    │
    ├── Composition Engine
    ├── Department Packs
    ├── Industry Extensions
    ├── EconomyOS (Wallets + Trust)
    ├── LearningOS (Insights)
    ├── Evolution Engine (Stages)
    ├── GovernanceOS (Policies)
    ├── Creator Economy (Partners)
    ├── Network Builder (Networks)
    └── Federation (Global Commerce)
```

---

## Ports

| Service | Port |
|---------|------|
| Control Plane | 4010 |
| Finance | 4801 |
| Restaurant | 5010 |
| Beauty | 5090 |
| Studio UI | 5173 |
| REZ Wallet | 4004 |
| Agent Wallet | 4040 |
| HOJAI Wallet | 4891 |
