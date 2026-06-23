# RABTUL Technologies - Economic Layer Platform

**Version:** 5.1.0  
**Last Updated:** June 23, 2026  
**Status:** ✅ **AgentFin v1 SHIPPED** — 15 services on ports 5510-5524, full Hub wiring, e2e demo working

---

## Overview

RABTUL Technologies is the economic layer for the RTMN ecosystem - providing authentication, payments, wallet, and economic infrastructure for all 24 industry verticals. As of 2026-06-23 it also hosts **AgentFin**, the agent-native financial infrastructure layer (replacing the "SUTAR Finance Agent" placeholder in the 5-year HOJAI plan).

---

## Services

### Core Services

| Service | Port | Purpose |
|---------|------|---------|
| api-gateway | 4000 | API routing |
| rez-auth-service | 4002 | Authentication |
| rez-payment-service | 4001 | Payments |
| rez-wallet-service | 4004 | Wallet |

### Economic Layer

| Service | Port | Purpose |
|---------|------|---------|
| REZ-unified-loyalty | 4040 | Loyalty |
| rez-referral-os | 4041 | Referral |
| REZ-multi-currency | 4042 | Currency |
| rez-rewards | 4043 | Rewards |
| REZ-treasury-os | 4055 | Treasury |
| rabtul-trust-engine | 4050 | Trust |

### 💳 AgentFin — Agent-native Financial Infrastructure (Layer 10) — NEW 2026-06-23

15 services on ports 5510-5524. Wraps the existing RABTUL engines (rez-wallet-service, rez-payment-service, REZ-treasury-os, REZ-subscription-service, REZ-procurement-os, REZ-negotiation-engine, sutar-economy-os) with agent-native primitives: per-agent allowances, virtual cards, spending policies, approval workflows, vendor twins, expense twins, finance memory, CorpID binding, cross-Nexha settlement.

See [agentfin/README.md](agentfin/README.md) and [agentfin/ARCHITECTURE.md](agentfin/ARCHITECTURE.md).

| Service | Port | Purpose |
|---------|------|---------|
| agentfin-gateway | 5510 | Owns `/api/agentfin/*` route table |
| agentfin-agent-wallet | 5511 | Per-agent wallet (wraps rez-wallet) |
| agentfin-allowance-engine | 5512 | Daily/weekly/monthly/total limits |
| agentfin-agent-card | 5513 | Virtual cards (Razorpay + Stripe) |
| agentfin-spending-policy | 5514 | YAML DSL for spending rules |
| agentfin-approval-engine | 5515 | Multi-step approval workflows |
| agentfin-finance-memory | 5516 | Domain-partitioned memory |
| agentfin-vendor-twin | 5517 | Vendor identity + financial profile |
| agentfin-expense-twin | 5518 | Per-transaction expense records |
| agentfin-subscription-adapter | 5519 | Agent-aware subscriptions |
| agentfin-treasury-adapter | 5520 | Agent-aware treasury views |
| agentfin-procurement-adapter | 5521 | Agent-driven procurement |
| agentfin-negotiation-agent | 5522 | RFQ + counter-offer logic |
| agentfin-agent-identity | 5523 | CorpID ↔ AgentID ↔ WalletID linkage |
| agentfin-nexha-settlement | 5524 | Multi-agent splits + cross-Nexha |

---

## Quick Start

```bash
cd companies/RABTUL-Technologies
npm install
```

To start the full RABTUL stack including AgentFin:

```bash
# Start all 15 AgentFin services
cd agentfin
npm install
npm run dev

# Or start the gateway only (it proxies to the others)
cd agentfin/gateway
npm run dev
```

---

## Deployment

### Render
```bash
render blueprint apply render.yaml
```

---

*Last Updated: June 23, 2026*
*RABTUL Technologies - Economic Layer Platform*
