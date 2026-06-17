# Axom - Complete Product Documentation

**Version:** 2.0 | **Date:** June 17, 2026  
**Status:** 🚀 PRODUCTION READY  
**Tagline:** *"Community Intelligence & Local Discovery"*

---

## Overview

Axom provides the **hyperlocal community layer** for the RTMN ecosystem. It connects residents, businesses, events, safety, and local commerce through AI-powered apps.

---

## Products

### 🚀 PRODUCTION READY

| Product | Type | Port | Status |
|---------|------|------|--------|
| **BuzzLocal** | Neighborhood OS | 4200-4260 | 🚀 Ready |
| **Rendez** | Social Connecting | 4009 | 🚀 Ready |
| **Z-Events** | Event Discovery | 4008 | 🚀 Ready |
| **Cosmic-OS** | AI Wellness | 4160 | 🚀 Ready |

---

## BuzzLocal - Neighborhood OS

> *"Know what's happening around you in real time."*

A combination of **Nextdoor + Citizen + Google Maps** powered by AI.

### 10 Core Modules

| Module | Description |
|--------|-------------|
| **Local Feed** | News, offers, events, alerts |
| **Society OS** | Apartment management |
| **Crowd Intelligence** | Real-time crowd tracking |
| **Safety Map** | Community safety alerts |
| **Trusted Circle** | Family/friends groups |
| **Live Route** | Journey sharing |
| **Crisis Management** | Emergency response |
| **Local Business** | Business discovery |
| **Local Events** | Event discovery |
| **Weather Intelligence** | Local weather alerts |

### Services

| Service | Port | Purpose |
|---------|------|---------|
| buzzlocal-feed-service | 4200 | News, offers, events, alerts |
| buzzlocal-society-service | 4210 | Community management |
| buzzlocal-safety-service | 4220 | SOS, alerts, trusted circles |
| buzzlocal-business-service | 4230 | Local business discovery |
| buzzlocal-crowd-service | 4240 | Real-time crowd intelligence |
| buzzlocal-weather-service | 4250 | Weather alerts |

### App Structure

```
buzzlocal-app/
├── app/(tabs)/
│   ├── index.tsx        # Feed (news, offers, events)
│   ├── map.tsx         # Interactive map
│   ├── safety.tsx      # SOS, alerts, trusted circles
│   ├── business.tsx    # Nearby businesses
│   └── society.tsx     # Society management
└── src/
    ├── constants/      # Design system
    └── services/       # API client
```

### Quick Start

```bash
# Start Feed Service
cd buzzlocal-feed-service && npm install && npm start

# Start App
cd buzzlocal-app && npm install && npm start
```

---

## Rendez - Social Connecting

> *"Find people. Meet safely. Build relationships. Do things together."*

A **Relationship OS** combining dating, networking, events, AI, and commerce.

### Features

| Feature | Description |
|--------|-------------|
| **AI Matchmaking** | Compatibility scores (0-100%) |
| **Safety Center** | SOS, verification, live tracking |
| **Couple Mode** | Shared timeline, bucket list |
| **Business Network** | Founder/investor matching |
| **Events Integration** | Meet at events |
| **AI Chat Assistant** | Genie in conversations |

### Screens (23)

- Onboarding, Login, Profile Setup
- Discover (swipe), Matches, Chat
- Plans, Meetups, Gifts
- AI Compatibility, Safety Center
- Couple Mode, Business Networking
- Events Discovery

### Backend Services (67)

- MatchService, DiscoveryService, MessagingService
- MeetupService, GiftService, KarmaService
- WalletService, SafetyService, VerificationService

### Quick Start

```bash
# Backend
cd rendez/rendez-backend && npm install && npm start

# App
cd rendez/rendez-app && npm install && npm start
```

---

## Z-Events - Event Discovery

> *"Discover events. Book tickets. Meet people."*

### Features

| Feature | Description |
|--------|-------------|
| **Event Discovery** | Browse by category, location |
| **Smart Search** | AI-powered recommendations |
| **Ticketing** | QR-based entry system |
| **Attendee Matching** | See who's going |
| **Reviews** | Community ratings |
| **Organizer Tools** | Event management |

### API Routes

| Route | Description |
|-------|-------------|
| `GET /api/events` | List events |
| `GET /api/events/:id` | Event details |
| `GET /api/events/:id/attendees` | Who's attending |
| `POST /api/tickets` | Book ticket |
| `GET /api/reviews/event/:id` | Event reviews |

### Quick Start

```bash
cd z-events-service && npm install && npm start
```

---

## Cosmic-OS - AI Wellness

> *"Illuminate your path with cosmic wisdom."*

An AI-powered wellness app with 7 **Council Agents**.

### AI Council Agents

| Agent | Specialty |
|-------|-----------|
| 🔮 **The Mystic** | Spiritual guidance |
| 💚 **The Healer** | Emotional wellness |
| 🎯 **The Strategist** | Career planning |
| 👁️ **The Oracle** | Pattern recognition |
| 💫 **The Connector** | Relationship harmony |
| 💎 **The Wealth Guide** | Financial clarity |
| 🧭 **The Explorer** | Personal growth |

### Screens

- Home (daily affirmation, cosmic state)
- Insights (AI council insights)
- Council (meet the 7 agents)
- Mood Check-In (3-step flow)
- Profile (stats, achievements)

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/mood/checkin` | POST | Submit mood |
| `/api/daily/:userId` | GET | Daily reading |
| `/api/council` | POST | Get insights |
| `/api/guidance/:domain` | GET | Domain guidance |

### Quick Start

```bash
cd cosmic-api && npm install && npm run build && npm start
```

---

## Ecosystem Integration

Axom connects to the full RTMN ecosystem:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RTMN ECOSYSTEM                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      AXOM PRODUCTS                                   │  │
│  │  BuzzLocal │ Rendez │ Z-Events │ Cosmic-OS                       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   CONNECTED SERVICES                                │  │
│  │  HOJAI AI │ AdBazaar │ REZ │ CorpPerks │ SUTAR OS             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### HOJAI AI Integration (Port 4701-4799)

| Service | Port | Purpose | Used By |
|---------|------|---------|---------|
| Genie Gateway | 4701 | AI orchestration | All Axom apps |
| Genie Memory | 4703 | Personal memory | Rendez, BuzzLocal |
| Genie Briefing | 4704 | Daily briefings | All apps |
| Genie Personal Twin | 4708 | User identity | All apps |
| Genie Health Twin | 4717 | Health tracking | Cosmic-OS |
| Genie Financial Twin | 4715 | Financial insights | All apps |

### AdBazaar Integration (Port 5000-5099)

| Service | Port | Purpose | Used By |
|---------|------|---------|---------|
| Ad Service | 5000 | Advertising | BuzzLocal |
| Campaign Builder | 5001 | Ad campaigns | BuzzLocal |
| Attribution | 5002 | Ad tracking | BuzzLocal |

### REZ Ecosystem Integration (Port 4000-4099)

| Service | Port | Purpose | Used By |
|---------|------|---------|---------|
| REZ Auth | 4002 | Authentication | All apps |
| REZ Wallet | 4004 | Payments | Z-Events |
| REZ Loyalty | 4040 | Rewards | BuzzLocal |
| CorpID | 4300 | Identity | All apps |

### SUTAR OS Integration (Port 4140-4259)

| Service | Port | Purpose | Used By |
|---------|------|---------|---------|
| SUTAR Gateway | 4140 | Commerce | Z-Events |
| SUTAR Escrow | 4149 | Payments | Z-Events |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              AXOM ECOSYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         APPS                                        │  │
│  │  BuzzLocal │ Rendez │ Z-Events │ Cosmic-OS                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      SERVICES (6)                                  │  │
│  │  Feed │ Society │ Safety │ Business │ Crowd │ Weather             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                    │                                     │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      RTMN ECOSYSTEM                                │  │
│  │  REZ │ HOJAI AI │ AdBazaar │ SUTAR OS │ CorpPerks              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Port Map

| Product | Port | Service |
|---------|------|---------|
| z-events-service | 4008 | Events API |
| rendez-backend | 4009 | Social API |
| buzzlocal-feed | 4200 | Feed API |
| buzzlocal-society | 4210 | Society API |
| buzzlocal-safety | 4220 | Safety API |
| buzzlocal-business | 4230 | Business API |
| buzzlocal-crowd | 4240 | Crowd API |
| buzzlocal-weather | 4250 | Weather API |
| cosmic-api | 4160 | Wellness AI |

---

## Environment Variables

```env
# Service
PORT=4000
NODE_ENV=production

# MongoDB
MONGODB_URI=mongodb://localhost:27017/{service-name}

# Internal Token
INTERNAL_SERVICE_TOKEN=your-internal-token

# Connected Services
CORPID_URL=http://localhost:4300
REZ_AUTH_URL=http://localhost:4002
GENIE_GATEWAY_URL=http://localhost:4701

# CORS
CORS_ORIGIN=*
```

---

## Deployment

### Docker

```bash
# Build all services
docker-compose up -d

# Check status
docker-compose ps
```

### Manual

```bash
# Install dependencies
npm install

# Build
npm run build

# Start
npm start
```

---

## Strategic Positioning

| Product | Role |
|---------|------|
| REZ | Commerce & rewards |
| **Axom** | Hyperlocal community |
| Z-Events | Event discovery |
| AdBazaar | Advertising |
| HOJAI AI | Intelligence |

---

## License

Proprietary - Axom / RTMN Ecosystem

---

*Last Updated: June 17, 2026*
