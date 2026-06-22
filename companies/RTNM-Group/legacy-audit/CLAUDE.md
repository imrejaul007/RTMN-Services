# RTNM-Group - Developer Guide

**Version:** 4.0.0
**Updated:** June 10, 2026
**Status:** PRODUCTION

---

## OVERVIEW

RTNM Group is the **Platform Administration Company** for the REZ ecosystem. It provides cross-cutting platform services including:
- Unified API Gateway
- SSO & Authentication
- Billing & Subscriptions
- Trust & Reputation
- Economic Ledger
- Inter-Company Services
- Nexha Commerce Network

**Tagline:** "The World's First Programmable Economic Network"

---

## 🏢 THE 12-LAYER STACK

```
Layer 12: AGENT ECONOMY - 22 Company AI Agents + 100+ Industry AI
Layer 11: AUTONOMOUS COMMERCE - Negotiation, Orders, Discovery
Layer 10: SERVICE CATALOG - Every service with pricing, SLA, API
Layer 9:  EXCHANGE NETWORK - AI-to-AI matching, price discovery
Layer 8:  TRUST & REPUTATION - Trust, payment, fulfillment, credit scores
Layer 7:  ECONOMIC INTELLIGENCE - Demand sensing, supply intel
Layer 6:  WORKFLOW NETWORK - Multi-step workflows across companies
Layer 5:  ECONOMIC GRAPH - Commerce, workforce, financial graphs
Layer 4:  POLICY & CONTRACT - Policy engine, machine-readable contracts
Layer 3:  ECONOMIC LEDGER - Double-entry accounting, audit trail
Layer 2:  TWIN LAYER - Personal, merchant, company, asset twins
Layer 1:  IDENTITY NETWORK (CorpID) - Universal identity
```

---

## 📦 SERVICE REGISTRY (60+ Services)

### Core Admin Services (RTNM-Group)

| Service | Port | Purpose |
|---------|------|---------|
| `REZ-access-control-service` | - | Centralized access control |
| `REZ-api-key-rotation` | - | API key rotation service |
| `REZ-bnpl-service` | - | Buy Now Pay Later |
| `REZ-capital-service` | - | Capital/funding services |
| `REZ-central-permissions` | - | Centralized permissions |
| `REZ-circuit-breaker-dashboard` | - | Circuit breaker UI |
| `REZ-compliance-platform` | - | Compliance management |
| `REZ-financial-ledger-platform` | - | Financial ledger |
| `REZ-identity-service` | - | Identity management |
| `REZ-ops-dashboard` | - | Operations dashboard |
| `REZ-platform-admin` | - | Platform admin |
| `REZ-secrets-manager` | - | Secrets management |
| `REZ-trust-admin` | - | Trust administration |
| `REZ-trust-service` | - | Trust & reputation |

### RTNM Integration Services (Ports 3000-3020)

| Service | Port | Purpose |
|---------|------|---------|
| `unified-api-gateway` | 3000 | Single entry point |
| `help-center` | 3001 | Support portal |
| `integrations` | 3010 | Auto-provisioning |
| `unified-dashboard` | 3012 | Monitoring |
| `sso-service` | 3015 | Enterprise SSO |
| `billing-service` | 3016 | Multi-product billing |
| `api-docs` | 3017 | Developer docs |
| `connect-service` | 3018 | Service registry |

### RTNM Economic Network Services (Ports 6000-6007)

| Service | Port | Purpose |
|---------|------|---------|
| `rtnm-company-registry` | 6000 | Register all 22 companies |
| `rtnm-inter-company-graph` | 6001 | Map who pays whom |
| `rtnm-company-twins` | 6002 | Each company's digital twin |
| `rtnm-service-catalog` | 6003 | Every service published |
| `rtnm-inter-company-ledger` | 6004 | Track revenue/cost between companies |
| `rtnm-automated-billing` | 6005 | Monthly settlements, invoices |
| `rtnm-company-credit` | 6006 | Credit limits, BNPL between companies |
| `rtnm-company-trust` | 6007 | Company trust scores |

### RidZa Platform Services (Ports 4500-4520)

**AI-Powered Digital Financial Marketplace** (PolicyBazaar + Paisabazaar competitor)

| Service | Port | Purpose | RABTUL |
|---------|------|---------|--------|
| `ridza-core` | 4500 | Lead engine, matching | Auth, Wallet |
| `ridza-partner-api` | 4501 | Partner API | Payment |
| `ridza-agent-portal` | 4502 | Agent CRM | Auth, Notify |
| `ridza-ai-search` | 4505 | NL search | Signals |
| `ridza-provider-api` | 4506 | Provider portal | Auth |
| `ridza-corpperks-hub` | 4503 | CorpPerks integration | Wallet, Notify |
| `ridza-compliance` | 4507 | Consent, audit, PII vault | Auth |
| `ridza-events` | 4508 | Event bus | - |
| `ridza-workflow` | 4509 | State machine | - |
| `ridza-fraud` | 4510 | Fraud detection | Fraud Agent |
| `ridza-merchant-finance` | 4511 | Merchant capital | Signals |
| `ridza-finance-intelligence` | 4512 | Credit scoring | Signals, Loyalty |
| `ridza-insurance` | 4520 | Insurance products | Auth, Payment, Notify |

**Insurance Products (15+):** Health, Life, Term, Car, Bike, Travel, Home, Gadget, Pet, Critical Illness, Accident, Child Education

**Insurers:** LIC India, SBI Life, HDFC Life, ICICI Lombard, Bajaj Allianz, TATA AIG, Star Health, Niva Bupa, Acko

### Nexha Commerce Network (Ports 4300-4399)

**"The Operating System for Commerce Networks"** - Zomato Hyperpure competitor

| Service | Port | Layer | Purpose |
|---------|------|-------|---------|
| `distribution-os` | 4300 | Operations | Distributor & wholesaler management |
| `franchise-os` | 4310 | Operations | Multi-location franchise operations |
| `procurement-os` | 4320 | Operations | Supplier network & RFQ |
| `manufacturing-os` | 4330 | Operations | Production & BOM management |
| `trade-finance` | 4340 | Intelligence | BNPL, credit lines, invoice financing |
| `nexha-intelligence` | 4350 | Intelligence | AI predictions & analytics |
| `network-graph` | 4360 | Infrastructure | Entity relationships |
| `commerce-identity` | 4365 | Infrastructure | Unified ID system |
| `reputation-service` | 4370 | Infrastructure | Multi-dimensional reputation |
| `territory-intelligence` | 4375 | Infrastructure | Geographic insights |
| `portal` | 4388 | Experience | B2B Infrastructure Marketplace |
| `ecosystem-connector` | 4399 | Experience | Central event bus |

### Admin & Dashboard Apps

| Service | Purpose |
|---------|---------|
| `rez-admin-service` | Admin dashboard |
| `rez-admin-training-panel` | Training panel |
| `rez-app-admin` | App administration |
| `rez-care-command-center` | Care command center |
| `rez-loyalty-admin` | Loyalty admin |
| `rez-merchant-gateway` | Merchant gateway |
| `rez-payment-links-service` | Payment links |
| `rez-security-middleware` | Security middleware |
| `rez-support-dashboard` | Support dashboard |
| `rez-support-dashboard-ui` | Support UI |
| `rez-unified-admin` | Unified admin |

---

## 🏛️ THE 22 COMPANIES AS ECONOMIC ENTITIES

| # | Company | Role | AI Provider | Payment Provider |
|---|---------|------|-------------|-----------------|
| 1 | HOJAI-AI | AI Brain | Owns AI | RABTUL |
| 2 | RABTUL-Technologies | Financial Infrastructure | HOJAI | Owns payments |
| 3 | REZ-Intelligence | AI/ML Platform | HOJAI | RABTUL |
| 4 | REZ-Consumer | B2C Consumer Apps | HOJAI | RABTUL |
| 5 | KHAIRMOVE | Mobility + Airport | HOJAI | RABTUL |
| 6 | AXOM | Social + Entertainment | HOJAI | RABTUL |
| 7 | AdBazaar | Marketing + DOOH | HOJAI | RABTUL |
| 8 | REZ-Merchant | Industry OS | HOJAI | RABTUL |
| 9 | REZ-Move | Relocation Platform | HOJAI | RABTUL |
| 10 | RIDZA | Money Intelligence | HOJAI | RABTUL |
| 11 | LawGens | Legal AI | HOJAI | RABTUL |
| 12 | AssetMind | Financial Intelligence | HOJAI | RABTUL |
| 13 | RisaCare | Healthcare OS | HOJAI | RABTUL |
| 14 | CorpPerks | HRMS Platform | HOJAI | RABTUL |
| 15 | StayOwn-Hospitality | Hotel Management | HOJAI | RABTUL |
| 16 | **RTNM-Group** | Platform Administration | HOJAI | RABTUL |
| 17 | RisnaEstate | Real Estate Platform | HOJAI | RABTUL |
| 18 | REZ-Workspace | Business OS | HOJAI | RABTUL |
| 19 | Nexha | Commerce Network OS | HOJAI | RABTUL |
| 20 | BIZORA | Business OS | HOJAI | RABTUL |
| 21 | Hotel OTA | Hotel Channel Integration | HOJAI | RABTUL |
| 22 | Z-Events | Event Platform | HOJAI | RABTUL |

---

## 🔗 RABTUL SERVICES INTEGRATION

| RABTUL Service | Port | Usage |
|----------------|------|-------|
| Auth Service | 4002 | JWT/OTP verification |
| Payment Service | 4001 | Premium collection |
| Wallet Service | 4004 | Coin rewards, balance |
| Notify Service | 4011 | SMS/WhatsApp/Email |
| Signal Aggregator | 4142 | User behavior signals |
| Fraud Agent | 3007 | Risk scoring |

---

## 🚀 QUICK START

### RidZa Platform

```bash
git clone git@github.com:imrejaul007/RidZa.git
cd RidZa
cp .env.example .env
make docker-up
```

### Nexha Commerce Network

```bash
cd RTNM-Group/nexha
pnpm install
docker-compose up
```

### RTNM Integration Services

```bash
cd RTNM-Group/rtnm-integration-services
chmod +x start-production.sh
./start-production.sh development
```

### RTNM Economic Network

```bash
cd RTNM-Group/rtnm-company-registry && npm run dev  # Port 6000
cd RTNM-Group/rtnm-inter-company-graph && npm run dev  # Port 6001
cd RTNM-Group/rtnm-inter-company-ledger && npm run dev  # Port 6004
```

---

## 📚 DOCUMENTATION

| Document | Location | Purpose |
|----------|----------|---------|
| RidZa SOT | `SOT.md` | RidZa platform documentation |
| Nexha CLAUDE | `nexha/CLAUDE.md` | Nexha commerce network |
| RTNM SOT | `SOT/README.md` | Complete source of truth |
| Integration Services | `rtnm-integration-services/README.md` | Unified gateway |

---

## 🔑 KEY ENVIRONMENT VARIABLES

```bash
# RABTUL Services
AUTH_SERVICE_URL=http://localhost:4002
PAYMENT_SERVICE_URL=http://localhost:4001
WALLET_SERVICE_URL=http://localhost:4004
NOTIFICATION_SERVICE_URL=http://localhost:4011
REZ_SIGNAL_AGGREGATOR_URL=http://localhost:4142

# Internal
INTERNAL_SERVICE_TOKEN=your-token
JWT_SECRET=your-jwt-secret
```

---

**Last Updated:** June 10, 2026
**Version:** 4.0.0
**Status:** PRODUCTION
