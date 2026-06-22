# ReZ Commerce Platform

**Powered by ReZ Mind** - AI-powered commerce intelligence

---

## What is ReZ Mind?

**ReZ Mind** is the unified intelligence layer for the ReZ commerce ecosystem. It combines:

| Component | Purpose |
|-----------|---------|
| **RTMN Commerce Memory** | Tracks user intent across all apps |
| **ReZ Agent OS** | 8 autonomous AI agents that act on the data |
| **Chat Intelligence** | Conversational AI for customer support |

---

## Package Structure

```
ReZ Full App/
├── packages/
│ ├── rez-chat-ai/ ← Chat AI Engine
│ ├── rez-chat-service/ ← Chat Backend
│ ├── rez-chat-integration/ ← Chat Integrations
│ ├── rez-agent-memory/ ← Agent Memory
│ ├── shared-types/ ← Shared Types
│ └── rez-ui/ ← Shared UI
├── services/
│ ├── rez-wallet-service/
│ ├── rez-order-service/
│ ├── rez-payment-service/
│ └── ... (15+ services)
└── apps/
 ├── Hotel OTA
 ├── Rendez
 ├── adBazaar
 └── ...
```

**Note:** [rez-intent-graph](https://github.com/imrejaul007/rez-intent-graph) (ReZ Mind) is now a **separate repository** — deploys independently via Render Blueprint.

---

## ReZ Mind - Commerce Intelligence

```bash
npm install @rez/intent-graph
```

### Features

- **Intent Capture** - Track search → view → cart → purchase
- **Dormant Revival** - Reactivate abandoned intents
- **8 Autonomous Agents** - Self-operating AI agents
- **45 Support Scenarios** - Across 9 apps
- **100% Test Coverage** - 93 tests passing

### Quick Start

```typescript
import { startAutonomousMode } from '@rez/intent-graph';

// Enable full autonomy
await startAutonomousMode();
```

---

## Connected Apps

| App | Type | ReZ Mind Integration |
|-----|------|---------------------|
| Hotel OTA | Booking | Travel intent tracking |
| Room QR | Guest Services | Service request memory |
| ReZ Consumer | E-commerce | Purchase prediction |
| Web Menu | Restaurant | Dining intent |
| Merchant OS | Business Dashboard | Demand signals |
| Karma | Gamification | Engagement memory |
| Rendez | Social | Profile intelligence |
| AdBazaar | Advertising | Attribution |
| NextaBiZ | Enterprise | Business insights |

---

## Backend Services

| Service | Purpose |
|---------|---------|
| Wallet | Multi-coin wallet management |
| Order | Order lifecycle (11 states) |
| Payment | Payment gateway integration |
| Merchant | Merchant operations |
| Auth | Authentication & authorization |
| Notification | Push, email, SMS |
| Search | Product search |
| Catalog | Product catalog |
| Karma | Gamification points |
| Finance | Financial operations |

---

## Development

```bash
# Install dependencies
npm install

# Build packages
npm run build

# Run tests
npm test

# Start agent server
npx tsx packages/rez-intent-graph/src/server/agent-server.ts
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Apps                                │
│    Hotel OTA | Consumer | Merchant | Rendez | etc.         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ReZ Mind                                │
│  ┌──────────────────┐    ┌──────────────────┐            │
│  │ Commerce Memory  │ +  │   Agent OS       │            │
│  │ • Intent Graph   │    │ • 8 Super Agents │            │
│  │ • Dormant Revival│    │ • Swarm Coord.  │            │
│  │ • Demand Signals │    │ • Action Trigger│            │
│  └──────────────────┘    └──────────────────┘            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend Services                          │
│  Wallet | Orders | Payments | Auth | Notifications | etc.  │
└─────────────────────────────────────────────────────────────┘
```

---

## Advertising Ecosystem

The ReZ platform includes a comprehensive advertising ecosystem:

| Product | Purpose | Status |
|---------|---------|--------|
| **AdBazaar** | Marketplace for ad inventory | Live |
| **AdsQr** | Quick QR campaigns | MVP Ready |
| **AdOS** | Intelligence layer | Spec Ready |

### Products

#### AdBazaar
- Live at [ad-bazaar.vercel.app](https://ad-bazaar.vercel.app)
- ~100/111 security issues fixed
- Booking flow with Razorpay
- QR attribution tracking

#### AdsQr
- Quick campaign creation (5 minutes)
- Bulk QR generation
- Multi-step rewards (scan/visit/purchase)
- 3 landing page templates

#### AdOS (Future)
- AI recommendations
- ROI prediction
- Budget optimization
- Requires 100+ campaigns

### Documentation

| Document | Description |
|----------|-------------|
| [AdBazaar Features](adBazaar/FEATURES.md) | Features & architecture |
| [AdBazaar Fixes](adBazaar/FIXES-REQUIRED.md) | Issue tracker |
| [AdsQr README](adsqr/README.md) | Full AdsQr documentation |
| [AdsQr Concept](adsqr/CONCEPT.md) | Product concept & vision |
| [AdOS Spec](ados/ADOS-SPEC.md) | Intelligence layer spec |
| [Roadmap](ROADMAP.md) | Build order & timeline |

### Quick Start

**AdBazaar:**
```bash
cd adBazaar && npm install && npm run dev
```

**AdsQr:**
```bash
cd adsqr && npm install && npm run dev
```

---

## License

Proprietary - ReZ / RuFlo

---

---

# QR Systems

The ReZ platform includes four comprehensive QR-based systems for different use cases.

## QR System Types

| System | Description | App | Status |
|--------|-------------|-----|--------|
| **Room QR** | Guest services in hotels - service requests, charges, checkout | `rez-now/` | Complete |
| **Menu QR** | Restaurant ordering - scan table QR, view menu, order & pay | `Hotel OTA/` | Complete |
| **Rez Now** | Digital business cards with shareable QR profiles | `rez-now/` | Complete |
| **Ads QR** | Advertising campaigns with QR codes and attribution | `adBazaar/`, `adsqr/` | Complete |

## Quick Start

```bash
# Install dependencies
npm install

# Run health checks
npx tsx scripts/health-check.ts

# Run integration tests
npx tsx scripts/test-qr-integration.ts
```

## Documentation

| Document | Description |
|----------|-------------|
| [QR Systems Guide](docs/QR-SYSTEMS-COMPLETE-GUIDE.md) | Complete architecture and API reference |
| [Quick Start](docs/QUICK-START/SETUP.md) | Setup in 5 minutes |
| [Environment Variables](docs/ENV-VARIABLES.md) | All required env vars |
| [Deployment Guide](docs/DEPLOYMENT-GUIDE.md) | Deploy to production |
| [Audit Summary](docs/QR-AUDIT-SUMMARY.md) | Complete audit results |
| [Testing Guide](docs/QUICK-START/TESTING.md) | How to test all systems |

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          QR CODE SCANNING                            │
│                    (Native App / Camera / Scanner)                   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────────────┐
│                        QR DATA PARSING                               │
│   Formats: rez://room/{id} | rez://menu/{id} | rez://profile/{id}   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Room QR    │   │   Menu QR     │   │   Ads QR      │
│  (rez-now)   │   │ (Hotel OTA)   │   │  (AdBazaar)  │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    REZ PLATFORM SERVICES                             │
│      Auth | Wallet | Payment | Merchant | Intent Graph | Chat        │
└─────────────────────────────────────────────────────────────────────┘
```

## Running Individual Apps

```bash
# Rez Now (Room QR + Profiles)
cd rez-now && npm run dev

# Hotel OTA (Menu QR + Booking)
cd "Hotel OTA" && npm run dev

# AdBazaar (Ads QR)
cd adBazaar && npm run dev
```

## Testing

```bash
# Health check all services
npx tsx scripts/health-check.ts

# Run QR integration tests
npx tsx scripts/test-qr-integration.ts
```

## App READMEs

- [rez-now](rez-now/README.md) - Room QR and Profile system
- [Hotel OTA](Hotel%20OTA/README.md) - Hotel booking and Menu QR
- [adBazaar](adBazaar/README.md) - Advertising marketplace
- [rez-app-merchant](rez-app-merchant/README.md) - Merchant dashboard

---

**Powered by ReZ Mind** 🤖
