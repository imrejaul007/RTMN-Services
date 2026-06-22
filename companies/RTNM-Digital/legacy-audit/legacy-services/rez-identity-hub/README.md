# REZ Identity Hub v2.0

**Version:** 2.0.0 | **Port:** 6000 | **Admin UI:** http://localhost:6000/admin

Unified User Intelligence + Knowledge Graph across ALL 25 REZ apps. Know everything about any user before outreach.

---

## What's New in v2.0

- **25 Data Sources** (previously 18)
- **MongoDB Persistence** - All identities stored in MongoDB
- **Event Bus Integration** - Real-time updates via REZ Event Bus (4025)
- **Admin UI Dashboard** - Visual management interface
- **Background Sync Jobs** - Automatic data refresh
- **Data Quality Tracking** - Completeness and freshness monitoring
- **Real API Clients** - Integration clients for all sources

---

## All 25 Data Sources

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REZ IDENTITY HUB                                      │
│                    25 SYSTEMS CONNECTED                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CORE REZ APPS                    INFRASTRUCTURE                             │
│  ├── REZ Consumer (4200)          ├── RABTUL Auth (4002)                   │
│  │   wallet, loyalty, orders        │   login, MFA, devices                 │
│  ├── REZ Merchant (4100)           ├── RABTUL Payment (4001)                │
│  │   business, tech, reviews       │   transactions, amounts                 │
│                                    ├── RABTUL Wallet (4004)                 │
│                                    │   balance, cashback                    │
│                                    └── RABTUL Order (4006)                  │
│                                        order history                        │
│                                                                              │
│  ECOSYSTEM COMPANIES                   AI & PERSONAL                         │
│  ├── CorpPerks (4720)                 ├── Genie (4703-4707)                  │
│  │   employee, HR, salary             │   memory, relationships              │
│  ├── Nexha (5001)                     ├── Shab AI (4970)                      │
│  │   vendor, franchise                │   family, memories                   │
│  ├── KHAIRMOVE (4600)                ├── AssetMind                          │
│  │   driver, fleet, rides             │   financial, assets                   │
│  ├── RisaCare (4800)                                                         │
│  │   patient, medical, insurance      INTELLIGENCE                           │
│  ├── StayOwn (4801)                  ├── REZ SalesMind (5150+)                 │
│  │   guest, host, bookings            │   lead score, territory              │
│  ├── RisnaEstate (4901)              ├── HOJAI AI (4500+)                   │
│  │   buyer, seller, agent            │   memory, knowledge graph            │
│  ├── REZ Workspace                   ├── REZ Intelligence (4018)            │
│  │   documents, calendar              │   intent, fraud signals               │
│  ├── Z-Events                                           │
│  │   tickets, events                  TRUST & GOVERNANCE                     │
│  ├── RIDZA (5200)                    ├── SADA (4190)                        │
│  │   credit, insurance, lending       │   trust, KYC, assertions            │
│  └── LawGens (5100)                   └── Salar OS (4710)                    │
│      contracts, compliance                  human/agent twins               │
│                                                                              │
│  CROSS-CUTTING (REE)                    SOCIAL MEDIA                       │
│  ├── Trust Platform (3001)              ├── LinkedIn ✓                       │
│  ├── Growth Engine (3002)              ├── Facebook ✓                       │
│  └── Attribution (3004)                ├── Instagram ✓                      │
│                                          ├── Twitter ✓                       │
│                                          └── YouTube ✓                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Features

### 1. Pre-Call Research Brief
Before calling anyone, get complete intelligence:
```bash
curl http://localhost:6000/api/identity/id_001/brief
```

### 2. Knowledge Graph
Get ALL data from all 25 sources:
```bash
curl http://localhost:6000/api/knowledge/id_001
```

### 3. Aggregated Insights
- Total value across all systems
- Risk score
- Engagement score
- Churn risk
- Upsell potential
- Data completeness %

### 4. Admin Dashboard
Visual UI at `/admin` with:
- Identity list and search
- Data source status
- Quality reports
- Sync management

### 5. Background Sync
Automatic data refresh:
- Realtime sources: every minute
- Hourly sources: every hour
- Daily sources: once per day
- Weekly sources: once per week

### 6. Event Bus Integration
Real-time profile updates via REZ Event Bus (4025):
- user.created
- user.updated
- transaction.completed
- verification.completed
- trust.updated
- social.profile.updated

---

## API Endpoints

### Identity
```
GET    /api/identity/:id              - Get unified profile
POST   /api/identity/resolve           - Resolve by phone/email
POST   /api/identity/link              - Link identities
GET    /api/identity/:id/brief         - Pre-call research brief
GET    /api/identity/:id/summary       - Quick summary
```

### Knowledge Graph
```
GET    /api/knowledge/:id              - Full knowledge from 25 sources
GET    /api/knowledge/:id/source/:name - Data from specific source
GET    /api/knowledge/:id/insights    - Aggregated insights
GET    /api/knowledge/:id/compare     - Compare with segment
GET    /api/knowledge/sources         - All sources status
POST   /api/knowledge/sync/:source     - Trigger sync
```

### Social Media
```
POST   /api/social/verify              - Verify social accounts
GET    /api/social/:id                - Get verified profiles
POST   /api/social/scrape              - Scrape from website
```

### Search
```
GET    /api/search/users              - Search all users
GET    /api/search/merchants           - Search merchants
GET    /api/search/customers          - Search customers
GET    /api/search/vendors            - Search vendors
GET    /api/search/phone/:phone       - Quick phone lookup
```

### Admin
```
GET    /api/admin/dashboard           - Dashboard stats
GET    /api/admin/identities         - Identity list
GET    /api/admin/identities/:id      - Identity detail
GET    /api/admin/quality            - Data quality report
GET    /api/admin/sync               - Sync management
POST   /api/admin/sync/:source       - Trigger sync
```

---

## Quick Start

```bash
cd rez-identity-hub

# Install dependencies
pnpm install

# Start (with MongoDB)
export MONGODB_URI=mongodb://localhost:27017/rez-identity-hub
pnpm dev

# Or just the API
pnpm dev

# Open Admin UI
open http://localhost:6000/admin
```

---

## Environment Variables

```env
MONGODB_URI=mongodb://localhost:27017/rez-identity-hub
EVENT_BUS_URL=http://localhost:4025

# API Keys for data sources
REZ_CONSUMER_KEY=
REZ_MERCHANT_KEY=
RABTUL_KEY=
CORPPERKS_KEY=
NEXHA_KEY=
KHAIRMOVE_KEY=
RISACARE_KEY=
STAYOWN_KEY=
RISNAESTATE_KEY=
REZWORKSPACE_KEY=
ZEVENTS_KEY=
RIDZA_KEY=
LAWGENS_KEY=
SADA_KEY=
SALAR_KEY=
SHAB_KEY=
GENIE_KEY=
ASSET_KEY=
ATLAS_KEY=
HOJAI_KEY=
REZINTEL_KEY=
REE_KEY=
```

---

## Architecture

```
REZ Identity Hub (6000)
│
├── API Layer (Express)
│   ├── Identity Routes
│   ├── Knowledge Routes
│   ├── Social Routes
│   ├── Search Routes
│   └── Admin Routes
│
├── Services
│   ├── IdentityService (in-memory store)
│   ├── DatabaseService (MongoDB)
│   ├── DataSourceClients (25 API clients)
│   ├── EventBusService (REZ Event Bus)
│   ├── SyncJobManager (background jobs)
│   └── DataQualityTracker
│
├── Admin UI (static HTML/JS/CSS)
│
└── Data Sources (25 external services)
```

---

## Data Flow

```
1. User searches/creates identity
   ↓
2. Resolve identity by phone/email
   ↓
3. Aggregate data from 25 sources
   ↓
4. Store in MongoDB
   ↓
5. Subscribe to Event Bus for updates
   ↓
6. Background sync keeps data fresh
   ↓
7. Pre-call brief generates insights
   ↓
8. Sales rep calls with full knowledge
```

---

## Data Quality

The system tracks:
- **Completeness** - How much data we have (0-100%)
- **Freshness** - How recent the data is
- **Verification** - Identity verification status
- **Confidence** - Trust in the data

Quality report:
```bash
curl http://localhost:6000/api/admin/quality
```

---

**License:** Proprietary - RTNM Digital