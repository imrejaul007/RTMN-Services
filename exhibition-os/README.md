# Exhibition OS 🚀

**The complete Exhibition Commerce & Intelligence Platform**

> "The Exhibition Platform That Creates Network Effects"

---

## Overview

Exhibition OS is a comprehensive platform for managing exhibitions, trade shows, and events. It covers everything from **before the event** (planning, exhibitor onboarding) through **during the event** (lead capture, networking, gamification) to **after the event** (CRM, follow-ups, repeat business).

```
Registration → Identity → Wallet → Coins → AI → Leads → Commerce → CRM → Repeat Business
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         EXHIBITION OS                                  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                    OS LAYER                                    │     │
│  │  Organizer │ Exhibitor │ Attendee │ Sponsor │ Venue │ Staff     │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                  INTELLIGENCE LAYER                         │     │
│  │  Genie AI │ Twins │ Analytics │ Floor Intel │ AI Copilots       │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                   COMMERCE LAYER                             │     │
│  │  Marketplace │ Networking │ Appointments │ CRM │ Orders          │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                              │                                       │
│  ┌──────────────────────────────────────────────────────────────┐     │
│  │                   ECONOMY LAYER                              │     │
│  │  REZ Coins │ PROMO/BRANDED │ Passport │ Missions │ Rewards      │     │
│  └──────────────────────────────────────────────────────────────┘     │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start all services
docker-compose -f ../docker-compose.exhibition.yml up -d

# Check health
curl http://localhost:5040/health

# View logs
docker-compose -f ../docker-compose.exhibition.yml logs -f
```

### Option 2: Manual Start

```bash
# Install dependencies
cd exhibition-os && npm install

# Start gateway
npm start

# In separate terminals, start services:
cd ../packages/exhibition-twin-service && npm start
cd ../packages/exhibition-organizer-service && npm start
cd ../packages/exhibition-exhibitor-service && npm start
# ... etc.
```

### Option 3: Development with tsx

```bash
cd exhibition-os
tsx src/index.ts
```

## Services (Ports 5040-5061)

| Port | Service | Description |
|------|---------|-------------|
| 5040 | Gateway | API orchestration, routing |
| 5041 | Organizer | Exhibition CRUD, venues, sessions |
| 5042 | Exhibitor | Booth, leads, team |
| 5043 | Attendee | Registration, tickets |
| 5044 | Twin | 8 Digital Twins |
| 5045 | Badge | QR badges, scanning |
| 5046 | Analytics | Real-time metrics |
| 5047 | Notification | Push, WhatsApp, email |
| 5048 | Payment | Tickets, escrow |
| 5049 | Intelligence | AI copilots |
| 5050 | Economy | REZ Coins, rewards |
| 5051 | Marketplace | Products, RFQ |
| 5052 | Networking | Connections, chat |
| 5053 | Appointment | Scheduling |
| 5054 | Passport | Missions, gamification |
| 5055 | Sponsor | Campaigns, ROI |
| 5056 | Venue Ops | Infrastructure |
| 5057 | Staff | Volunteers |
| 5058 | CRM | Pipeline, deals |
| 5059 | Document | Catalogs |
| 5060 | Integration | Webhooks |
| 5061 | Floor Intel | Heatmaps |

## API Examples

### Create Exhibition
```bash
curl -X POST http://localhost:5040/api/exhibitions \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: my-tenant" \
  -d '{
    "name": "Tech India Expo 2026",
    "industry": "tech",
    "start_date": "2026-08-01",
    "end_date": "2026-08-03",
    "expected_visitors": 50000
  }'
```

### Get Daily Briefing
```bash
curl http://localhost:5040/api/genie/exhibitions/EXH-XXXX/briefing \
  -H "X-Tenant-Id: my-tenant"
```

### Capture Lead
```bash
curl -X POST http://localhost:5040/api/exhibitors/EXP-XXXX/leads \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: my-tenant" \
  -d '{
    "visitor_name": "Rajesh Kumar",
    "visitor_company": "Infosys",
    "intent_level": "hot",
    "source": "badge_scan"
  }'
```

## DO Exhibitor App

Mobile app for exhibitor staff to capture leads on the floor.

```
companies/REZ-Exhibitor/do-exhibitor/
├── app/
│   ├── index.tsx       # Dashboard
│   ├── leads.tsx       # Lead management
│   ├── scan.tsx        # Badge scanner
│   ├── appointments.tsx # Meeting scheduler
│   └── dashboard.tsx   # Analytics
```

### Install
```bash
cd companies/REZ-Exhibitor/do-exhibitor
npm install
npx expo start
```

## RTMN Integration

| Integration | Port | Purpose |
|-------------|------|---------|
| Genie Gateway | 4701 | AI briefings |
| hojai-event | 4510 | Event bus |
| CorpID | 4300 | Identity |
| WhatsApp Bot | 4718 | Notifications |
| SUTAR Escrow | 4149 | Payments |

## Environment Variables

See `.env.example` for all configuration.

Key variables:
- `PORT` - Service port
- `MONGODB_URI` - MongoDB connection
- `REDIS_URL` - Redis connection
- `RAZORPAY_KEY_ID` - Payment gateway
- `OPENAI_API_KEY` - AI features

## File Structure

```
exhibition-os/
├── src/
│   ├── index.ts              # Gateway
│   ├── types/index.ts         # TypeScript types
│   ├── middleware/            # Tenant, auth, error
│   ├── routes/                # API routes
│   └── services/              # Business logic
├── packages/                   # Microservices
│   ├── exhibition-*-service/  # Individual services
└── docker-compose.yml         # Full deployment

companies/REZ-Exhibitor/
└── do-exhibitor/              # Mobile app
    └── app/                  # Expo Router
```

## Status

✅ **Complete** - All 22 microservices built
✅ **Docker Compose** - One-command deployment
✅ **DO Exhibitor App** - Mobile lead capture
✅ **RTMN Integration** - Genie, WhatsApp, SUTAR
✅ **Health Checks** - All endpoints ready

---

**Built with** TypeScript, Express, MongoDB, Redis, Docker
