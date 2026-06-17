# Media OS - AI-Native Media Operating System

> **Version:** 2.0.0  
> **Status:** ✅ **PHASE 1 COMPLETE** - Foundation Ready  
> **Port:** 5600

---

## Overview

Media OS is a complete AI-native operating system for media companies, built on the RTMN ecosystem.

### Architecture

```
Media OS (5600)
│
├── Content OS (Channels, Programs, Episodes, Content)
├── Creator OS (Profiles, Brand Deals, Payments)
├── Audience OS (Viewers, Subscriptions, Personalization)
├── Advertising OS (Campaigns, Bookings, Attribution)
├── Revenue OS (Subscriptions, PPV, Invoicing)
├── Rights OS (Licenses, Territories, Royalties)
├── Production OS (Studios, Equipment, Crew)
│
├── Digital Twins (4 Core: Viewer, Creator, Content, Campaign)
├── AI Media Brain (via HOJAI AI integration)
└── RTMN Integration (CorpID, MemoryOS, TwinOS, Event Bus)
```

---

## Features (Phase 1 Complete)

### ✅ Foundation
- **Winston Logger**: Structured JSON logging with file rotation
- **MongoDB**: Full database with 15+ models
- **Joi Validation**: All request validation
- **JWT Auth**: Token-based authentication with CorpID integration
- **Rate Limiting**: Protection against abuse
- **Health Endpoints**: `/health`, `/health/detailed`, `/ready`, `/live`

### ✅ Digital Twins (4 Core)
- **Viewer Twin**: Demographics, watch patterns, engagement, monetization, segments
- **Creator Twin**: Profile, audience, content, monetization, brand deals
- **Content Twin**: Metadata, rights, performance, recommendations
- **Campaign Twin**: Targeting, budget, performance, optimization

### ✅ Core Models
- Viewer, Creator, Content, Campaign
- Channel, Program, Episode, Advertiser
- Subscription, Booking, Invoice, Payment
- License, Studio, Equipment, Crew, Production
- Comment, Follower, AuditLog

### ✅ RTMN Integration
- **HOJAI AI** (4560): Intent prediction, recommendations, content analysis
- **CorpID** (4702): Identity verification
- **MemoryOS** (4703): Viewer preferences
- **TwinOS** (4705): Digital twin sync
- **Event Bus** (4510): Real-time events
- **AdBazaar** (4980/4990): DSP/SSP integration
- **RABTUL** (4004): Wallet/payments

---

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Health check
curl http://localhost:5600/health
```

---

## API Endpoints

### Health & RTMN
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health with RTMN services
- `GET /api/layers` - All 15 RTMN layers
- `GET /api/layer/:layer` - Specific layer info

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /auth/verify` - Verify token

### Viewers
- `GET /api/viewers` - List viewers (admin)
- `GET /api/viewers/:id` - Get viewer
- `POST /api/viewers` - Create viewer
- `PATCH /api/viewers/:id` - Update viewer
- `POST /api/viewers/:id/watch` - Update watch history

### Content
- `GET /api/content` - List content
- `GET /api/content/:id` - Get content with recommendations
- `POST /api/content` - Create content
- `PATCH /api/content/:id` - Update content
- `POST /api/content/:id/publish` - Publish content

### Channels
- `GET /api/channels` - List channels
- `GET /api/channels/:id` - Get channel with programs

### Creators
- `GET /api/creators` - List creators
- `GET /api/creators/:id` - Get creator
- `POST /api/creators` - Create creator

### Campaigns
- `GET /api/campaigns` - List campaigns
- `GET /api/campaigns/:id` - Get campaign
- `POST /api/campaigns` - Create campaign
- `POST /api/campaigns/:id/performance` - Update performance

### Digital Twins
- `GET /api/twins/viewer/:viewerId` - Get viewer twin
- `GET /api/twins/content/:contentId` - Get content twin
- `GET /api/twins/stats` - Twin statistics (admin)

### Analytics
- `GET /api/analytics/overview` - Overview analytics
- `GET /api/analytics/content` - Content analytics

### AI
- `GET /api/ai/recommendations` - Get personalized recommendations
- `POST /api/ai/analyze` - Analyze content

### Events
- `GET /api/events/history` - Event history (admin)

---

## Environment Variables

```bash
# Server
PORT=5600
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/media-os

# JWT
JWT_SECRET=your-secret-key

# RTMN Services
HOJAI_AI_URL=http://localhost:4560
CORPID_URL=http://localhost:4702
MEMORY_OS_URL=http://localhost:4703
TWIN_OS_URL=http://localhost:4705
ADBAZAAR_DSP_URL=http://localhost:4990
RABTUL_WALLET_URL=http://localhost:4004
```

---

## What's Next (Phase 2-7)

### Phase 2: Content & Production OS
- Editorial calendar
- Production workflow
- AI Script Writer
- Equipment tracking

### Phase 3: Broadcasting & Streaming OS
- Program Grid
- EPG generation
- HLS/DASH streaming
- DRM integration

### Phase 4: Rights & Monetization OS
- License management
- Royalty calculator
- Subscription engine
- AdBazaar integration

### Phase 5: Audience & Creator OS
- Viewer Twin enrichment
- Brand deal pipeline
- Community features
- Social publishing

### Phase 6: AI Media Brain
- 15+ specialized AI agents
- Autonomous publishing
- CEO Dashboard

### Phase 7: GCC & Expansion
- Arabic/RTL support
- Multi-currency
- Regional compliance

---

## Contributing

1. Follow the service template structure
2. Add proper validation with Joi
3. Include Winston logging
4. Add health endpoints
5. Update PORT-REGISTRY.md

---

*Last Updated: June 17, 2026*
