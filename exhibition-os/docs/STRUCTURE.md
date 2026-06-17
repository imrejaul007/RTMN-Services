# Exhibition OS - Platform Structure

**Last Updated:** June 17, 2026  
**Status:** ✅ Complete

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     RTMN PLATFORM                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                  EXHIBITION OS PLATFORM                         │   │
│  │                     (Ports 5040-5061)                          │   │
│  │                                                               │   │
│  │  Services: Gateway, Organizer, Exhibitor, Attendee, Twins,    │   │
│  │           Analytics, AI, Economy, Commerce, CRM, etc.          │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                              │                                        │
│         ┌────────────────────┼────────────────────┐                   │
│         │                    │                    │                    │
│         ▼                    ▼                    ▼                   │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐            │
│  │    REZ      │     │  REZ-       │     │    Axom     │            │
│  │  Consumer   │     │  Exhibitor  │     │ BuzzLocal   │            │
│  │            │     │             │     │             │            │
│  │ • DO App   │     │ • DO        │     │ • Z Events  │            │
│  │   Exhibitions │   │   Exhibitor │     │   App       │            │
│  │   Tab       │     │   App       │     │             │            │
│  └─────────────┘     └─────────────┘     └─────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
RTMN/
│
├── exhibition-os/                    # ⚠️ PLATFORM - Shared Services
│   ├── src/
│   │   ├── index.ts               # Gateway (5040)
│   │   ├── models/               # MongoDB models
│   │   ├── routes/               # API routes
│   │   ├── services/              # Business logic
│   │   └── db/                   # MongoDB + Redis
│   ├── packages/                  # 16 microservice packages
│   ├── docker-compose.yml         # Full deployment
│   ├── README.md
│   └── docs/
│       └── STRUCTURE.md           # This file
│
├── packages/                        # Shared packages
│   ├── exhibition-*-service/      # 16 service packages
│   └── exhibition-os-sdk/          # Shared SDK
│
├── companies/
│   ├── REZ-Consumer/              # 👤 Consumer App
│   │   └── do/
│   │       └── app/
│   │           └── (tabs)/
│   │               └── exhibitions/  # Exhibition Tab
│   │
│   ├── REZ-Exhibitor/             # 🏢 Exhibitor App
│   │   ├── CLAUDE.md
│   │   ├── FEATURES.md
│   │   └── do-exhibitor/          # DO Exhibitor Mobile App
│   │       └── app/
│   │           ├── index.tsx      # Dashboard
│   │           ├── leads.tsx       # Lead management
│   │           ├── scan.tsx        # Badge scanner
│   │           └── appointments.tsx # Meeting scheduler
│   │
│   └── Axom/
│       └── buzzlocal/
│           └── z-events-app/        # 🎪 Consumer Events App
│               └── app/
│                   ├── (tabs)/      # Home, Explore, Tickets
│                   ├── event/       # Event detail
│                   ├── booth/       # Booth detail
│                   └── session/     # Session detail
│
└── shared/
    └── rtmn-shared-sdk/           # Shared SDKs
```

---

## Company Responsibilities

| Company | Role | Apps |
|---------|------|------|
| **RTMN Platform** | Exhibition OS Services | Gateway, microservices |
| **REZ-Consumer** | Consumer App | DO App (Exhibitions tab) |
| **REZ-Exhibitor** | Exhibitor App | DO Exhibitor |
| **Axom/BuzzLocal** | Events Discovery | Z Events App |

---

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Z Events   │     │   DO App    │     │    DO       │
│    App      │     │  Exhibitions│     │  Exhibitor  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │    Exhibition OS Gateway (5040)         │
       └────────────────────┼────────────────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Exhibitor  │     │  Attendee    │     │  Analytics  │
│  Service    │     │  Service     │     │  Service    │
│  (5042)     │     │  (5043)      │     │  (5046)     │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## Integration Points

### REZ-Consumer (DO App)

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Browse Exhibitions | `/api/exhibitions` | List all exhibitions |
| Exhibition Detail | `/api/exhibitions/:id` | Get details |
| Register | `/api/exhibitions/:id/register` | Register for event |
| Book Ticket | `/api/payments/intent` | Create payment |
| Booth List | `/api/exhibitions/:id/booths` | List booths |
| Sessions | `/api/exhibitions/:id/sessions` | List sessions |

### REZ-Exhibitor (DO Exhibitor)

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Lead Capture | `/api/leads` | Capture leads |
| Lead List | `/api/leads` | List captured leads |
| Badge Scan | `/api/badges/scan` | Scan attendee badge |
| Analytics | `/api/analytics/exhibitor` | Booth metrics |

### Axom/BuzzLocal (Z Events)

| Feature | Endpoint | Description |
|---------|----------|-------------|
| Events | `/api/exhibitions` | Browse events |
| Event Detail | `/api/exhibitions/:id` | Event info |
| Book Ticket | `/api/payments/intent` | Purchase ticket |
| My Tickets | `/api/tickets` | View purchased tickets |

---

## RTMN Service Integration

| Service | Port | Usage |
|---------|------|-------|
| CorpID | 4300 | User identity |
| Genie Gateway | 4701 | AI briefings |
| SUTAR Escrow | 4149 | Payments |
| WhatsApp Bot | 4718 | Notifications |

---

## Deployment

### Gateway
```bash
cd exhibition-os && npm install && npm start
```

### Apps
```bash
# Z Events
cd companies/Axom/buzzlocal/z-events-app && npx expo start

# DO App
cd companies/REZ-Consumer/do && npx expo start

# DO Exhibitor
cd companies/REZ-Exhibitor/do-exhibitor && npx expo start
```

### Docker (All Services)
```bash
cd exhibition-os && docker-compose up -d
```

---

*Last Updated: June 17, 2026*
