# RTMN-Services - Real-Time Multi-Industry Network Services

**Version:** 1.2.0  
**Last Updated:** June 15, 2026  
**Status:** ✅ OPERATIONAL - 19 Services Running + 24 Industry OS + 35+ Digital Twins + Integration Hub

---

## Deployment Architecture

```
                          ┌──────────────────────┐
                          │   VERCEL (Frontend)   │
                          │  rtmn-pilot-portal   │
                          │  Next.js 14 (port 3000)│
                          └──────────┬───────────┘
                                     │ HTTPS
                          ┌──────────▼───────────┐
                          │  RENDER (Backend)    │
                          │ rtmn-pilot-onboarding│
                          │  Express (port 4399)  │
                          └──────────┬───────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
          ┌──────▼──────┐    ┌───────▼──────┐   ┌──────▼──────┐
          │ Hotel OS    │    │ Restaurant OS│   │ Healthcare  │
          │ :5025       │    │ :5010        │   │ :5020       │
          └─────────────┘    └─────────────┘   └─────────────┘
                 + 21 more Industry OS services on Render
```

### Currently Running Services (Local Development)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| **REZ-ecosystem-connector** | 4399 | ✅ Running | Service Registry & Discovery |
| **REZ-event-bus** | 4510 | ✅ Running | Pub/Sub Event Messaging (29 schemas) |
| **REZ-graphql-federation** | 4000 | ✅ Running | Unified GraphQL API |
| **Goal OS** | 4242 | ✅ Running | Autonomous Goals |
| **Memory OS** | 4703 | ✅ Running | Personal AI Memory |
| **Restaurant OS** | 5010 | ✅ Running | Restaurant management |
| **Healthcare OS** | 5020 | ✅ Running | Healthcare management |
| **Hotel OS** | 5025 | ✅ Running | Hotel management |
| **Retail OS** | 5030 | ✅ Running | Retail management |
| **Legal OS** | 5035 | ✅ Running | Legal management |
| **Hospitality OS** | 5050 | ✅ Running | Hospitality management |
| **Education OS** | 5060 | ✅ Running | Education management |
| **Automotive OS** | 5080 | ✅ Running | Automotive management |
| **Beauty OS** | 5090 | ✅ Running | Beauty/Salon management |
| **Energy OS** | 5100 | ✅ Running | Energy management |
| **Fitness OS** | 5110 | ✅ Running | Fitness/Gym management |
| **Manufacturing OS** | 5150 | ✅ Running | Manufacturing management |
| **RealEstate OS** | 5230 | ✅ Running | Real estate management |
| **Media OS** | 5600 | ✅ Running | Media management |

### Management Scripts

```bash
./start-ecosystem.sh    # Start all services
./stop-ecosystem.sh     # Stop all services
./health-check.sh       # Monitor health status
```

### API Access Points

- **Service Registry:** http://localhost:4399/api/services
- **GraphQL API:** http://localhost:4000/graphql (GraphiQL enabled)
- **Event Bus:** http://localhost:4510/health
- **API Documentation:** [API-DOCUMENTATION.md](API-DOCUMENTATION.md)

### Deploy Targets

| Layer | Platform | Service | URL |
|-------|----------|---------|-----|
| **Frontend** | Vercel | rtmn-pilot-portal | `https://rtmn.vercel.app` |
| **Backend/Gateway** | Render | rtmn-pilot-onboarding | `https://rtmn-api.onrender.com` |
| **Industry OS** | Render | rtmn-hotel-os, rtmn-restaurant-os, etc. | per-service URLs |

### Quick Deploy

```bash
# Frontend → Vercel
cd frontend
vercel                              # Interactive deploy
vercel --prod                       # Direct to production

# Backend → Render
render blueprint create --spec render.yaml
# Or: Import render.yaml in Render dashboard
```

### Environment Variables

**Vercel (Frontend):**
- `NEXT_PUBLIC_API_URL` → Render backend URL (e.g. `https://rtmn-api.onrender.com`)

**Render (Backend):**
- `JWT_SECRET` → Generate with `openssl rand -hex 32`
- `STRIPE_SECRET_KEY` → Stripe publishable key
- `STRIPE_WEBHOOK_SECRET` → Stripe webhook secret
- `RESEND_API_KEY` → Resend email API key
- `ALLOWED_ORIGINS` → Vercel frontend URL
- `PUBLIC_URL` → Vercel frontend URL

---

## Overview

RTMN-Services is the comprehensive service layer for the RTMN ecosystem - a unified platform connecting 20+ companies across 24 industry verticals, powered by AI agents, digital twins, and autonomous economic infrastructure (SUTAR OS).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         RTMN ECOSYSTEM                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     FOUNDATION LAYER                                   │ │
│  │  CorpID (4702) │ MemoryOS (4703) │ GoalOS (4242) │ Decision (4240) │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     PLATFORM LAYER                                     │ │
│  │  TwinOS Hub (4705) │ AgentOS │ Business Copilot │ SUTAR OS (4140+)  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                     INDUSTRY OS LAYER (24 Industries)                 │ │
│  │  Restaurant │ Hotel │ Healthcare │ Retail │ Legal │ Education │ ...  │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Companies in RTMN Ecosystem

| Company | Purpose | Services | Port Range |
|---------|---------|----------|------------|
| **HOJAI AI** | AI Infrastructure, Genie, SUTAR OS | 190+ products | 4500-4700 |
| **RABTUL Technologies** | Auth, Payment, Wallet, Order | 40+ services | 4001-4040 |
| **REZ-Merchant** | Merchant services, POS, Industry OS | 100+ services | 4800-4899 |
| **REZ-Consumer** | Consumer app, Genie, DO | 80+ services | 3000-4100 |
| **Nexha** | Commerce, Procurement, Distribution | 50+ services | 8000+ |
| **AdBazaar** | Ads, QR, Creator Studio | 1 prod-ready (REZ-crm-hub) | 4056, 5000-5009 |
| **KHAIRMOVE** | Ride, Delivery, Airzy | 40+ services | 4500-4600 |
| **Axom** | BuzzLocal, Community Intelligence | 30+ services | 4000-4027 |
| **CorpPerks** | HR, Payroll, Benefits | 50+ services | 4006 |
| **RisaCare** | Healthcare OS | 40+ services | 7000+ |
| **AssetMind** | Wealth management | 30+ services | 5200+ |
| **StayOwn-Hospitality** | Hotel management | 45+ services | 6000+ |
| **LawGens** | Legal document automation | 25+ services | 5100+ |
| **RisnaEstate** | Real Estate OS | 35+ services | 4300+ |
| **RidZa** | Financial services | 30+ services | 4250+ |

---

## Industry Operating Systems (24 Industries)

| # | Industry | OS Name | Port | Digital Twins |
|---|----------|---------|------|---------------|
| 1 | Hospitality | Restaurant OS | 5010 | Menu, Order, Kitchen, Table, Customer |
| 2 | Healthcare | Healthcare OS | 5020 | Patient, Appointment, Doctor, Prescription |
| 3 | Retail | Retail OS | 5030 | Product, Inventory, Customer, Cart, Supplier |
| 4 | Hotel | Hotel OS | 5025 | Room, Booking, Guest, Service, Revenue |
| 5 | Legal | Legal OS | 5035 | Client, Case, Lawyer, Document |
| 6 | Education | Education OS | 5060 | Course, Student, Instructor, Enrollment |
| 7 | Agriculture | Agriculture OS | 5070 | Farm, Crop, Livestock |
| 8 | Automotive | Automotive OS | 5080 | Vehicle, Customer, Service |
| 9 | Beauty | Beauty OS | 5090 | Client, Service, Staff, Appointment |
| 10 | Fashion | Fashion OS | 5095 | Product, Collection |
| 11 | Fitness | Fitness OS | 5110 | Member, Trainer, Class, Membership |
| 12 | Gaming | Gaming OS | 5120 | Game, Player, Tournament |
| 13 | Government | Government OS | 5130 | Citizen, Service, Department |
| 14 | Home Services | HomeServices OS | 5140 | Provider, Customer, Booking |
| 15 | Manufacturing | Manufacturing OS | 5150 | Product, Machine, Production, Quality |
| 16 | Non-Profit | NonProfit OS | 5160 | Donor, Campaign, Beneficiary |
| 17 | Professional | Professional OS | 5170 | Consultant, Client, Project |
| 18 | Sports | Sports OS | 5180 | Team, Player, Match |
| 19 | Travel | Travel OS | 5190 | Destination, Package |
| 20 | Entertainment | Entertainment OS | 5200 | Event, Venue, Ticket |
| 21 | Construction | Construction OS | 5210 | Project, Contractor |
| 22 | Financial | Financial OS | 5220 | Account, Transaction |
| 23 | Real Estate | RealEstate OS | 5230 | Property, Listing, Lead, Agent |
| 24 | Transport | Transport OS | 5240 | Vehicle, Driver, Rider |

---

## Services in This Repo

### Foundation Services

| Service | Port | Purpose | Files |
|---------|------|---------|-------|
| corpid-service | 4702 | Universal Identity | [corpid-service/](corpid-service/) |
| memory-os | 4703 | Personal AI Memory | [memory-os/](memory-os/) |
| goal-os | 4242 | Autonomous Goals | [goal-os/](goal-os/) |
| decision-engine | 4240 | Policy & Authorization | [decision-engine/](decision-engine/) |
| agent-economy | 4251 | Karma & Payments | [agent-economy/](agent-economy/) |

### Digital Twin Services

| Service | Port | Purpose | Files |
|---------|------|---------|-------|
| twinos-hub | 4705 | Twin Registry (35+ twins) | [twinos-hub/](twinos-hub/) |
| agent-twin | 3011 | Agent profiles, karma | [agent-twin/](agent-twin/) |
| property-twin | 3015 | Properties, listings | [property-twin/](property-twin/) |
| referral-twin | 3016 | Referrals, rewards | [referral-twin/](referral-twin/) |
| buyer-twin | 3017 | Buyer profiles | [buyer-twin/](buyer-twin/) |
| deal-twin | 3018 | Deal management | [deal-twin/](deal-twin/) |
| area-twin | 3019 | Area/Region data | [area-twin/](area-twin/) |

### Industry Operating Systems

| Service | Port | Purpose | Files |
|---------|------|---------|-------|
| restaurant-os | 5010 | Restaurant management | [restaurant-os/](restaurant-os/) |
| hotel-os | 5025 | Hotel management | [hotel-os/](hotel-os/) |
| healthcare-os | 5020 | Healthcare management | [healthcare-os/](healthcare-os/) |
| retail-os | 5030 | Retail management | [retail-os/](retail-os/) |
| legal-os | 5035 | Legal management | [legal-os/](legal-os/) |
| education-os | 5060 | Education management | [education-os/](education-os/) |
| automotive-os | 5080 | Automotive management | [automotive-os/](automotive-os/) |
| beauty-os | 5090 | Beauty/Salon management | [beauty-os/](beauty-os/) |
| fitness-os | 5110 | Fitness/Gym management | [fitness-os/](fitness-os/) |
| manufacturing-os | 5150 | Manufacturing management | [manufacturing-os/](manufacturing-os/) |
| hospitality-os | 5050 | General hospitality | [hospitality-os/](hospitality-os/) |
| realestate-os | 5230 | Real estate management | [realestate-os/](realestate-os/) |

---

## Quick Start

```bash
# Install all services
npm install

# Start specific service
cd services/restaurant-os && npm install && npm start

# Start with Docker
docker-compose up -d

# Health checks
curl http://localhost:5010/health  # Restaurant OS
curl http://localhost:5025/health  # Hotel OS
curl http://localhost:4702/health  # CorpID
curl http://localhost:4703/health  # MemoryOS
curl http://localhost:4056/health  # AdBazaar / REZ-crm-hub
```

---

## Port Registry

| Range | Services |
|-------|----------|
| 3000-3099 | Core (API Gateway, Business Copilot, AgentOS) |
| 4001-4040 | RABTUL (Auth, Payment, Wallet) |
| 4100-4119 | REZ-Mart |
| 4140-4256 | SUTAR OS |
| 4240-4256 | GoalOS, Decision Engine, Economy |
| 4300-4399 | Axom/BuzzLocal |
| 4500-4550 | HOJAI AI |
| 4702-4725 | Genie AI / Foundation |
| 4800-4899 | REZ-Merchant |
| 4900-4999 | Industry-specific |
| 5000-5240 | Industry OS (24) |

---

## Documentation

- [RTNM-COMPANIES-AUDIT.md](RTNM-COMPANIES-AUDIT.md) - Complete company registry
- [RTNM-PRODUCTS-FEATURES-AUDIT.md](RTNM-PRODUCTS-FEATURES-AUDIT.md) - Product features
- [PORT-REGISTRY.md](PORT-REGISTRY.md) - Port assignments
- [README.md](README.md) - Quick start guide

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Framework | Express.js, Fastify |
| Language | JavaScript, TypeScript |
| Database | MongoDB (services), In-Memory (demos) |
| Security | Helmet, CORS, JWT |
| Logging | Winston |
| Container | Docker, Docker Compose |

---

## Contributing

1. Follow the service template structure
2. Add CLAUDE.md to each service
3. Include FEATURES.md with detailed features
4. Add health check endpoint (`/health`)
5. Update PORT-REGISTRY.md
6. Add to docker-compose.yml

---

## Service Integration Architecture (Connect, Don't Copy)

**Updated:** June 15, 2026  
**Pattern:** Service Mesh / Event-Driven  
**Philosophy:** Connect services via APIs instead of copying code

### Architecture Overview

```
                    RABTUL
                    Services
                 ┌─────────┐
                 │  Auth   │──────────► HOJAI AI
                 │  Wallet │──────────► SutAR OS
                 │  Mfg OS │──────────► Industry AI
                 │  HR Hub │──────────► REZ-Merchant
                 │  Graph  │──────────► All Services
                 │  Search │──────────► HOJAI RAG
                 │  Memory │──────────► HOJAI Vector
                 │  Events │◄───────── All Publishers
                 └─────────┘
                      ▲
                      │
              ┌───────┴───────┐
              │   RTMN        │
              │  Ecosystem    │
              └───────────────┘
```

### Core Integration Hub

| Service | Port | Description |
|---------|------|-------------|
| **REZ-ecosystem-connector** | 4399 | Service Registry & Discovery |
| **REZ-event-bus** | 4510 | Pub/Sub Event Messaging |
| **REZ-integration-connector** | 4314 | Multi-service API Gateway |
| **REZ-graphql-federation** | 4000 | Unified GraphQL API |

### Integration Patterns

#### 1. REST API (Synchronous)
```typescript
const response = await fetch('http://localhost:4330/api/manufacturing/orders', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ orderData })
});
```

#### 2. Event Bus (Asynchronous)
```typescript
eventBus.publish('manufacturing.order.created', { orderId: 'MO-123' });
eventBus.subscribe('manufacturing.order.*', (event) => { /* handle */ });
```

#### 3. gRPC (High Performance)
```protobuf
service ManufacturingService {
  rpc CreateOrder(OrderRequest) returns (OrderResponse);
}
```

### RABTUL Services Available

| Service | Port | Use Case |
|---------|------|----------|
| rez-auth-service | 4002 | Authentication |
| rez-wallet-service | 4004 | Payments |
| REZ-manufacturing-os | 4330 | Manufacturing |
| REZ-workflow-executor | TBD | Workflows |
| REZ-knowledge-search | TBD | RAG/Search |
| REZ-memory-cloud | TBD | Vector storage |
| REZ-agent-marketplace | TBD | Agent registry |
| REZ-event-bus | 4510 | Pub/Sub |

### Service Connection Map

| HOJAI Service | RABTUL Source | Protocol |
|--------------|----------------|----------|
| hojai-agent-marketplace | REZ-agent-marketplace | REST |
| hojai-compliance | rez-wallet-service | REST |
| hojai-monitoring | REZ-agent-observability | REST |
| hojai-workflow | REZ-workflow-executor | REST/Event |
| hojai-rag | REZ-knowledge-search | REST |
| hojai-vector | REZ-memory-cloud | REST |
| hojai-event-bus | REZ-event-bus | Event |
| hojai-auth | rez-auth-service | REST |
| hojai-wallet | rez-wallet-service | REST |
| hojai-contract | REZ-contract-management | REST |

### REZ Merchant Integration

| Service | RABTUL Source | Connection |
|---------|--------------|------------|
| REZ-hr-os | REZ-unified-hub | REST API |
| REZ-realestate-os | REZ-contract-management | REST API |
| REZ-manufacturing-os | REZ-manufacturing-os | REST API |

### SDK Usage
```typescript
import { RESTClient, EventBus } from '@rtnm/shared-sdk';

const rabtul = new RESTClient({
  baseUrl: 'http://localhost:4399',
  apiKey: process.env.RABTUL_API_KEY
});

const events = new EventBus({ url: 'http://localhost:4510' });

const orders = await rabtul.get('/manufacturing-os/orders');
events.subscribe('manufacturing.*', (event) => { /* handle */ });
```

### Implementation Phases

| Phase | Timeline | Tasks |
|-------|----------|-------|
| 1 | Week 1-2 | Deploy Gateway, Event Bus, SDK |
| 2 | Week 3-4 | Connect SutAR, HOJAI → RABTUL |
| 3 | Week 5-8 | Industry bridges, Event subscriptions |
| 4 | Week 9-12 | Full mesh, Monitoring |

---

*Last Updated: June 15, 2026*
*RTMN-Services - Real-Time Multi-Industry Network*
