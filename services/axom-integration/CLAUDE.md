# Axom Integration Service

**Status:** Ready for Development  
**Port:** 4973  
**Purpose:** BuzzLocal & Community Intelligence - Customer Operations Bridge

---

## Overview

Axom Integration connects community intelligence (BuzzLocal) to the RTMN customer operations ecosystem. It manages local community members, events, and engagement data, syncing with Journey Twin, Customer Twin, and Industry Twin.

---

## Twin Connections

| Twin | URL | Purpose |
|------|-----|---------|
| **Journey Twin** | http://localhost:3012 | Track customer journey stages |
| **Customer Twin** | http://localhost:3017 | Unified customer profiles |
| **Industry Twin** | http://localhost:4705 | Community/area intelligence |

---

## API Endpoints

### BuzzLocal Routes (`/api/buzzlocal`)
```
POST /posts          - Create buzz post
GET  /feed           - Get local buzz feed
POST /engage/:id     - Like, comment, share, save
GET  /trending       - Trending buzz in area
GET  /businesses     - Local businesses
```

### Community Routes (`/api/community`)
```
POST /events         - Create community event
GET  /events         - List events in area
GET  /events/:id     - Get event details
POST /events/:id/rsvp - RSVP to event
GET  /insights       - Community insights
GET  /members        - List community members
```

### Intelligence Routes (`/api/intelligence`)
```
GET /sentiment        - Sentiment analysis
GET /recommendations  - Personalized recommendations
GET /trends           - Trend prediction
GET /influence-network - Network analysis
GET /engagement-prediction - Engagement forecast
GET /health-score     - Community health score
```

### Profile Routes (`/api/profiles`)
```
POST   /             - Create profile
GET    /             - List profiles
GET    /:id           - Get profile
PUT    /:id           - Update profile
```

### Sync Routes (`/api/sync`)
```
POST /profile/:id     - Sync single profile to twins
POST /all            - Batch sync all profiles
```

---

## Data Model

### AxomProfile
- `profileId` - Unique identifier
- `axomUserId` - User's Axom ID
- `displayName`, `username`, `avatarUrl`
- `primaryLocation` - Area/Neighborhood/City
- `stats` - Followers, posts, engagement rate
- `buzzContent` - Posts, reviews, events
- `connectedBusinesses` - Linked businesses
- `interests` - Interest tags with weights
- `customerSegment` - influencer/active/passive/business
- `engagementTier` - platinum/gold/silver/bronze

---

## Service Dependencies

| Service | Port | Required |
|---------|------|----------|
| REZ-ecosystem-connector | 4399 | Yes |
| REZ-event-bus | 4510 | Yes |
| Journey Twin | 3012 | Yes |
| Customer Twin | 3017 | Yes |
| Industry Twin | 4705 | Yes |

---

## Start Commands

```bash
# Development
cd services/axom-integration
npm install
npm run dev

# Production
npm run build
npm start

# Health check
curl http://localhost:4973/health
```

---

## Environment Variables

```bash
PORT=4973
JOURNEY_TWIN_URL=http://localhost:3012
CUSTOMER_TWIN_URL=http://localhost:3017
INDUSTRY_TWIN_URL=http://localhost:4705
COMMUNITY_EVENT_BUS_URL=http://localhost:4510
CUSTOMER_OPS_BRIDGE_URL=http://localhost:4399/api/customer-ops
```

---

## Features

- Community member profiles with engagement tracking
- Local buzz feed with sentiment analysis
- Event management (create, RSVP, track)
- AI-powered recommendations and trend prediction
- Twin synchronization (Journey, Customer, Industry)
- Influence network analysis
- Community health scoring

---

## RTMN Ecosystem

Part of RTMN-Services - Real-Time Multi-Industry Network

**Companies:** HOJAI AI, Leverge, RABTUL, REZ-Merchant, REZ-Consumer, Nexha, AdBazaar, KHAIRMOVE, Axom, CorpPerks, RisaCare, AssetMind, StayOwn-Hospitality, LawGens, RisnaEstate, RidZa

**Last Updated:** June 16, 2026
