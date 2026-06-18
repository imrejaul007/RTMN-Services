# RTMN Ecosystem - Complete Technical Documentation

> **Version:** 4.0  
> **Updated:** June 17, 2026  
> **Status:** ✅ **FULLY OPERATIONAL** - 50+ Services Connected

---

## 📑 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Service Registry](#-service-registry)
3. [Unified Hub API](#-unified-hub-api)
4. [Industry Workflows](#-industry-workflows)
5. [Digital Twins](#-digital-twins)
6. [AI Agents](#-ai-agents)
7. [Deployment Guide](#-deployment-guide)
8. [Quick Start](#-quick-start)
9. [API Reference](#-api-reference)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           RTMN ECOSYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                 RTMN UNIFIED HUB (4399)                           │ │
│  │                 Single Gateway for All Services                     │ │
│  │     Service Registry • Health Monitoring • Cross-OS Workflows       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                        │
│        ┌──────────────────────────┼──────────────────────────┐              │
│        │                          │                          │              │
│   ┌────▼────┐             ┌───────▼──────┐            ┌──────▼─────┐       │
│   │ Sales OS │             │  Media OS   │            │Marketing OS│       │
│   │  (5055) │             │   (5600)   │            │  (5500)   │       │
│   └────┬────┘             └───────┬──────┘            └──────┬─────┘       │
│        │                        │                        │              │
│        └────────────────────────┼────────────────────────┘              │
│                                 │                                       │
│  ┌─────────────────────────────┼─────────────────────────────────────┐ │
│  │                    24 INDUSTRY OS                                 │ │
│  │  Restaurant │ Hotel │ Healthcare │ Retail │ Legal │ Education    │ │
│  │  Beauty │ Fitness │ Gaming │ Automotive │ Manufacturing │ Travel   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    FOUNDATION (3)                                 │ │
│  │         CorpID (4702) │ MemoryOS (4703) │ TwinOS (4705)         │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    HOJAI AI SUITE (5)                           │ │
│  │    Intelligence │ Memory │ Twin │ Agents │ Copilot               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    ADBAZAAR (4)                                   │ │
│  │          DSP │ Audience │ Attribution │ CDP                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    REZ SERVICES (4)                             │ │
│  │              CRM │ Care │ Wallet │ Auth                        │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Service Registry

### Core Business OS (3)

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| **Sales OS** | 5055 | ✅ | CRM, Leads, Pipeline, Deals |
| **Media OS** | 5600 | ✅ | Content, Streaming, Channels |
| **Marketing OS** | 5500 | ✅ | Campaigns, Journey, Audience |

### Foundation Services (3)

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| **CorpID** | 4702 | ✅ | Universal Identity |
| **MemoryOS** | 4703 | ✅ | Personal AI Memory |
| **TwinOS Hub** | 4705 | ✅ | Digital Twins |

### HOJAI AI Suite (5)

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| **Leverge Intelligence** | 4761 | ✅ | Business Analytics |
| **Leverge Memory** | 4762 | ✅ | AI Memory Platform |
| **Leverge Twin** | 4763 | ✅ | Digital Twin Platform |
| **Leverge Agents** | 4764 | ✅ | AI Agent Orchestration |
| **Leverge Copilot** | 4765 | ✅ | Business AI Copilot |

### REZ Services (4)

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| **REZ Auth** | 4002 | ✅ | Authentication |
| **REZ Wallet** | 4004 | ✅ | Payments & Rewards |
| **REZ CRM Hub** | 4056 | ✅ | Customer Relations |
| **REZ Care Service** | 4055 | ✅ | Customer Support |

### AdBazaar (4)

| Service | Port | Status | Description |
|---------|------|--------|-------------|
| **REZ DSP** | 4990 | ✅ | Ad Campaign Delivery |
| **REZ Audience** | 4805 | ✅ | Audience Segments |
| **REZ Attribution** | 4803 | ✅ | Multi-touch Attribution |
| **REZ CDP** | 4901 | ✅ | Customer Data Platform |

### 24 Industry Operating Systems

| # | Industry | Port | Status |
|---|----------|------|--------|
| 1 | Hospitality | 5010 | ✅ |
| 2 | Hotel | 5025 | ✅ |
| 3 | Healthcare | 5020 | ✅ |
| 4 | Retail | 5030 | ✅ |
| 5 | Legal | 5035 | ✅ |
| 6 | Education | 5060 | ✅ |
| 7 | Agriculture | 5070 | ✅ |
| 8 | Automotive | 5080 | ✅ |
| 9 | Beauty | 5090 | ✅ |
| 10 | Fashion | 5095 | ✅ |
| 11 | Fitness | 5110 | ✅ |
| 12 | Gaming | 5120 | ✅ |
| 13 | Government | 5130 | ✅ |
| 14 | Home Services | 5140 | ✅ |
| 15 | Manufacturing | 5150 | ✅ |
| 16 | Non-Profit | 5160 | ✅ |
| 17 | Professional | 5170 | ✅ |
| 18 | Sports | 5180 | ✅ |
| 19 | Travel | 5190 | ✅ |
| 20 | Entertainment | 5200 | ✅ |
| 21 | Construction | 5210 | ✅ |
| 22 | Financial | 5220 | ✅ |
| 23 | Real Estate | 5230 | ✅ |
| 24 | Transport | 5240 | ✅ |

---

## 🌐 Unified Hub API

### Base URL
```
http://localhost:4399
```

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Hub health check |
| `/ready` | GET | Readiness check |
| `/live` | GET | Liveness check |

### Service Registry

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services` | GET | All registered services |
| `/api/services/:category` | GET | Services by category |
| `/api/services/:id` | GET | Single service info |

### Industry Proxy Routes

| Endpoint | Proxies To | Port | Description |
|----------|-------------|------|-------------|
| `/api/sales/*` | Sales OS | 5055 | CRM, Leads, Pipeline |
| `/api/media/*` | Media OS | 5600 | Content, Streaming |
| `/api/marketing/*` | Marketing OS | 5500 | Campaigns, Journey |
| `/api/restaurant/*` | Restaurant OS | 5010 | Orders, Tables |
| `/api/hotel/*` | Hotel OS | 5025 | Bookings, Rooms |
| `/api/healthcare/*` | Healthcare OS | 5020 | Appointments, Patients |
| `/api/retail/*` | Retail OS | 5030 | Products, Inventory |
| `/api/legal/*` | Legal OS | 5035 | Cases, Contracts |
| `/api/education/*` | Education OS | 5060 | Courses, Students |
| `/api/realestate/*` | RealEstate OS | 5230 | Properties, Leads |
| `/api/automotive/*` | Automotive OS | 5080 | Vehicles, Service |
| `/api/beauty/*` | Beauty OS | 5090 | Appointments, Services |
| `/api/fitness/*` | Fitness OS | 5110 | Memberships, Classes |
| `/api/travel/*` | Travel OS | 5190 | Bookings, Packages |
| `/api/entertainment/*` | Entertainment OS | 5200 | Events, Tickets |
| `/api/manufacturing/*` | Manufacturing OS | 5150 | Orders, Production |
| `/api/construction/*` | Construction OS | 5210 | Projects, Quotes |
| `/api/financial/*` | Financial OS | 5220 | Accounts, Transactions |
| `/api/transport/*` | Transport OS | 5240 | Shipments, Fleet |
| `/api/ads/*` | AdBazaar DSP | 4990 | Campaigns |
| `/api/audiences/*` | AdBazaar Audience | 4805 | Segments |
| `/api/crm/*` | REZ CRM | 4056 | Contacts |
| `/api/wallet/*` | REZ Wallet | 4004 | Payments |
| `/api/care/*` | REZ Care | 4055 | Support Tickets |
| `/api/identity/*` | CorpID | 4702 | User Identity |
| `/api/memory/*` | MemoryOS | 4703 | Preferences |
| `/api/twins/*` | TwinOS | 4705 | Digital Twins |
| `/api/ai/*` | Leverge Intelligence | 4761 | AI Operations |

---

## 🔄 Industry Workflows

### Restaurant Order Flow

```bash
POST /api/workflow/restaurant/order
```

**Request:**
```json
{
  "customerId": "user123",
  "items": [
    { "itemId": "burger", "quantity": 2, "price": 299 }
  ],
  "table": "T5",
  "paymentMethod": "wallet"
}
```

**Response:** Order + CRM Contact + Wallet Transaction + Analytics

---

### Hotel Booking Flow

```bash
POST /api/workflow/hotel/booking
```

**Request:**
```json
{
  "guestId": "guest456",
  "roomType": "deluxe",
  "checkIn": "2026-07-01",
  "checkOut": "2026-07-03",
  "guests": 2,
  "paymentMethod": "card"
}
```

**Response:** Booking + CRM Contact + Wallet + Marketing Journey + Twin Update

---

### Healthcare Appointment

```bash
POST /api/workflow/healthcare/appointment
```

**Request:**
```json
{
  "patientId": "patient789",
  "doctorId": "DR001",
  "department": "cardiology",
  "date": "2026-07-05",
  "time": "10:00",
  "insuranceId": "INS123"
}
```

**Response:** Appointment + Patient Record + CRM Ticket + Care Reminders + Twin

---

### Retail Order

```bash
POST /api/workflow/retail/order
```

**Request:**
```json
{
  "customerId": "cust001",
  "items": [
    { "productId": "PROD123", "quantity": 2, "price": 999 }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "Mumbai",
    "pincode": "400001"
  },
  "paymentMethod": "upi"
}
```

**Response:** Order + Inventory Reserve + Payment + Shipping + Loyalty + CRM + Twin

---

### Real Estate Inquiry

```bash
POST /api/workflow/realestate/inquiry
```

**Request:**
```json
{
  "customerId": "lead456",
  "propertyId": "PROP789",
  "inquiryType": "site_visit"
}
```

**Response:** Lead + Viewing + CRM + Marketing + Analytics + Twin

---

### E-commerce Order

```bash
POST /api/workflow/retail/order
```

---

### Event Registration

```bash
POST /api/workflow/events/registration
```

---

### B2B Order (Manufacturing)

```bash
POST /api/workflow/manufacturing/b2b-order
```

---

## 👥 Digital Twins (35+)

| Twin | Purpose | Updates From |
|------|---------|-------------|
| Customer Twin | 360° view | All systems |
| Lead Twin | Lead behavior | Marketing, CRM |
| Order Twin | Order lifecycle | Sales, Wallet |
| Product Twin | Product intelligence | All Industry OS |
| Campaign Twin | Marketing performance | AdBazaar, Media |
| Audience Twin | Segment insights | AdBazaar |
| Booking Twin | Reservation state | Hotel, Restaurant |
| Patient Twin | Health records | Healthcare |
| Student Twin | Learning progress | Education |
| Vehicle Twin | Auto lifecycle | Automotive |
| Member Twin | Membership state | Fitness, Beauty |
| Property Twin | Real estate status | RealEstate OS |
| Shipment Twin | Logistics tracking | Transport |
| Guest Twin | Stay history | Hotel OS |
| Order Twin | Restaurant orders | Restaurant OS |

---

## 🤖 AI Agents (20+)

### Marketing
| Agent | Capabilities |
|-------|-------------|
| AI CMO | Strategy, Budget allocation |
| AI Brand Manager | Guidelines, voice |
| AI Campaign Manager | Planning, optimization |
| AI Content Writer | Blog, ads, social |
| AI Social Manager | Scheduling, replies |
| AI Email Specialist | Subject lines, copy |
| AI SEO Specialist | Keywords, rankings |

### Sales
| Agent | Capabilities |
|-------|-------------|
| AI Sales Rep | Lead qualification |
| AI Account Executive | Deal negotiation |
| AI Sales Coach | Call analysis |

### Support
| Agent | Capabilities |
|-------|-------------|
| AI Support Agent | Ticket resolution |
| AI Billing Agent | Invoice queries |

### Industry
| Agent | Industry |
|-------|----------|
| AI Hotel Concierge | Hospitality |
| AI Doctor | Healthcare |
| AI Tutor | Education |

---

## 🚀 Deployment

### Docker Compose

```bash
# Deploy entire ecosystem
docker-compose -f docker-compose.unified-hub.yml up -d

# Check status
docker-compose -f docker-compose.unified-hub.yml ps
```

### Render Blueprint

```bash
# Deploy to Render
render blueprint apply render.unified-hub.yaml
```

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/RTMN.git
cd RTMN

# 2. Start Hub
cd services/unified-os-hub && npm install && npm start

# 3. Test
curl http://localhost:4399/health
curl http://localhost:4399/api/services

# 4. Try workflow
curl -X POST http://localhost:4399/api/workflow/hotel/booking \
  -H "Content-Type: application/json" \
  -d '{"guestId":"test","roomType":"deluxe","checkIn":"2026-07-01","checkOut":"2026-07-03"}'
```

---

## 📁 Project Structure

```
RTMN/
├── services/
│   └── unified-os-hub/         # Unified Gateway (4399)
│       └── src/
│           ├── index.js         # Main server
│           └── workflows.js      # 24 industry workflows
├── industry-os/
│   └── services/
│       ├── sales-os/           # Sales OS (5055)
│       ├── media-os/            # Media OS (5600)
│       ├── marketing-os/       # Marketing OS (5500)
│       ├── hotel-os/           # Hotel OS (5025)
│       └── [20+ industry]/     # All Industry OS
├── companies/                  # Company services
├── shared/                    # Shared libraries
├── docker-compose.unified-hub.yml
├── render.unified-hub.yaml
└── docs/README.COMPLETE.md
```

---

## 🔒 Security

- ✅ JWT Authentication
- ✅ Rate Limiting (100 req/min)
- ✅ Helmet Security Headers
- ✅ CORS Configuration
- ✅ Input Validation
- ✅ Audit Logging

---

## 📈 Statistics

| Metric | Count |
|--------|-------|
| Total Services | 50+ |
| Core OS | 3 |
| Industry OS | 24 |
| Foundation | 3 |
| AI Agents | 20+ |
| Digital Twins | 35+ |
| Workflows | 24 |
| API Endpoints | 500+ |

---

*Last Updated: June 17, 2026*
*RTMN Ecosystem - Real-Time Multi-Industry Network*
