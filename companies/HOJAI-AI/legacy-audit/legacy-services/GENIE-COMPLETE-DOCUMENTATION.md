# Genie AI - Complete Documentation

**Last Updated:** 2026-06-13  
**Status:** ✅ ALL SERVICES BUILT

---

## Overview

Genie is HOJAI AI's Personal Intelligence OS - a suite of microservices for personal memory, relationships, briefings, meetings, and AI-powered business insights. It integrates with the RTNM ecosystem and uses HOJAI Voice services for speech capabilities.

**Tagline:** "You don't use Genie. You talk to Genie."

---

## Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              GENIE PERSONAL AI                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        ALL SERVICES (6 BUILT)                         │   │
│  │                                                                       │   │
│  │   ✅ genie-personal-os-gateway  (4702) - Orchestrator                │   │
│  │   ✅ genie-memory-service      (4703) - Memory                       │   │
│  │   ✅ genie-relationship-service (4704) - Relationships                │   │
│  │   ✅ genie-briefing-service    (4706) - Daily briefings              │   │
│  │   ✅ genie-meeting-service     (4713) - Meeting intelligence          │   │
│  │   ✅ genie-business-intelligence (4725) - Business insights            │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                    USES HOJAI SERVICES (NO BUILD)                     │   │
│  │                                                                       │   │
│  │   Voice (STT/TTS)    → HOJAI-VOICE-PLATFORM (4033)                │   │
│  │   Edge STT           → hojai-edge-stt (4035)                         │   │
│  │   AI Processing      → hojaiGateway (4500)                          │   │
│  │   Vector Memory      → hojaiMemory (4520)                           │   │
│  │   AI Agents          → hojaiAgents (4550)                          │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Service Registry

### ✅ BUILT Services

| Service | Port | Location | Status | Notes |
|---------|------|----------|--------|-------|
| `genie-personal-os-gateway` | 4702 | `hojai-ai/services/genie-personal-os-gateway/` | ✅ BUILT | API orchestrator |
| `genie-memory-service` | 4703 | `hojai-ai/genie-memory-service/` | ✅ BUILT | Full memory operations |
| `genie-relationship-service` | 4704 | `hojai-ai/genie-relationship-service/` | ✅ BUILT | Relationship tracking |
| `genie-briefing-service` | 4706 | `hojai-ai/genie-briefing-service/` | ✅ BUILT | Daily briefings |
| `genie-meeting-service` | 4713 | `hojai-ai/services/genie-meeting-service/` | ✅ BUILT | Meeting summaries |
| `genie-business-intelligence` | 4725 | `hojai-ai/genie-business-intelligence/` | ✅ BUILT | Business insights |

### Uses External Services (No Build Required)

| Service | Port | Location | Purpose |
|---------|------|----------|---------|
| `HOJAI-VOICE-PLATFORM` | 4033 | `hojai-ai/HOJAI-VOICE-PLATFORM/` | STT, TTS, Voice Agents |
| `hojai-edge-stt` | 4035 | `hojai-ai/services/hojai-edge-stt/` | On-device STT |
| `hojaiGateway` | 4500 | `hojai-ai/packages/hojai-api-gateway/` | API Gateway |
| `hojaiMemory` | 4520 | `hojai-ai/packages/hojai-memory/` | Vector Memory |
| `hojaiAgents` | 4550 | `hojai-ai/packages/hojai-agents/` | AI Agents |

---

## File Structure

```
hojai-ai/
├── genie-memory-service/           ✅ BUILT (4703)
│   ├── src/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── routes/memoryRoutes.ts
│   │   ├── services/memoryService.ts
│   │   ├── models/index.ts
│   │   ├── middleware/tenant.ts
│   │   └── utils/logger.ts
│   ├── package.json
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env.example
│
├── genie-relationship-service/   ✅ BUILT (4704)
│   ├── src/
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── routes/relationshipRoutes.ts
│   │   ├── services/relationshipService.ts
│   │   ├── models/index.ts
│   │   ├── middleware/tenant.ts
│   │   └── utils/logger.ts
│   └── ...
│
├── genie-briefing-service/       ✅ BUILT (4706)
│   └── ...
│
├── services/
│   ├── genie-personal-os-gateway/  ✅ BUILT (4702)
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── types.ts
│   │   │   ├── routes/gatewayRoutes.ts
│   │   │   ├── services/gatewayService.ts
│   │   │   ├── middleware/tenant.ts
│   │   │   └── utils/logger.ts
│   │   └── ...
│   │
│   └── genie-meeting-service/    ✅ BUILT (4713)
│       ├── src/
│       │   ├── index.ts
│       │   ├── types.ts
│       │   ├── routes/meetingRoutes.ts
│       │   ├── services/meetingService.ts
│       │   ├── models/index.ts
│       │   ├── middleware/tenant.ts
│       │   └── utils/logger.ts
│       └── ...
│
└── genie-business-intelligence/   ✅ BUILT (4725)
    ├── src/
    │   ├── index.ts
    │   ├── types.ts
    │   ├── routes/businessRoutes.ts
    │   ├── services/businessIntelligenceService.ts
    │   ├── middleware/tenant.ts
    │   └── utils/logger.ts
    └── ...
```

---

## API Endpoints

### genie-personal-os-gateway (4702)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/personal/context` | Get personal context |
| POST | `/api/search` | Unified search |
| GET | `/api/timeline` | Personal timeline |
| GET | `/api/briefing` | Daily briefing |
| GET | `/api/health/services` | Check connected services |

### genie-memory-service (4703)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/memories` | List memories |
| POST | `/api/memories` | Create memory |
| GET | `/api/memories/:id` | Get memory |
| PATCH | `/api/memories/:id` | Update memory |
| DELETE | `/api/memories/:id` | Delete memory |
| POST | `/api/memories/search` | Search memories |
| GET | `/api/memories/stats` | Memory statistics |
| GET | `/api/memories/timeline` | Memory timeline |

### genie-relationship-service (4704)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/relationships` | List relationships |
| POST | `/api/relationships` | Create relationship |
| GET | `/api/relationships/:id` | Get relationship |
| PATCH | `/api/relationships/:id` | Update relationship |
| DELETE | `/api/relationships/:id` | Delete relationship |
| GET | `/api/relationships/:id/interactions` | Get interactions |

### genie-briefing-service (4706)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/briefings` | List briefings |
| POST | `/api/briefings` | Create briefing |
| GET | `/api/briefings/:id` | Get briefing |
| GET | `/api/briefings/daily` | Get daily briefing |
| GET | `/api/briefings/scheduled` | Get scheduled briefings |

### genie-meeting-service (4713)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/meetings` | List meetings |
| POST | `/api/meetings` | Create meeting |
| GET | `/api/meetings/:id` | Get meeting |
| POST | `/api/meetings/:id/transcript` | Add transcript |
| GET | `/api/meetings/:id/summary` | Get AI summary |
| GET | `/api/meetings/:id/actions` | Get action items |
| GET | `/api/meetings/:id/decisions` | Get decisions |

### genie-business-intelligence (4725)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/business/:merchantId/summary` | Business overview |
| GET | `/api/business/:merchantId/sales` | Sales data |
| GET | `/api/business/:merchantId/customers` | Customer analytics |
| GET | `/api/business/:merchantId/orders` | Order insights |
| GET | `/api/business/:merchantId/peak-hours` | Peak hours |
| GET | `/api/business/:merchantId/top-items` | Top selling items |
| GET | `/api/business/:merchantId/report` | Generate report |
| POST | `/api/business/:merchantId/query` | Natural language query |
| GET | `/api/business/:merchantId/trends` | Trend analysis |

---

## Client Integrations

### DO App Backend

**File:** `companies/REZ-Consumer/do/do-backend/src/services/genieMemoryClient.ts`

```typescript
import { genieMemory } from './services/genieMemoryClient';

// Remember a transaction
await genieMemory.rememberTransaction('user-123', {
  merchantName: 'La Pinoz',
  amount: 1200,
  category: 'restaurant'
});

// Get user's "usual"
const usual = await genieMemory.getUsual('user-123');

// Get booking pattern
const pattern = await genieMemory.getBookingPattern('user-123');
```

### DO App Frontend

**File:** `companies/REZ-Consumer/do/src/hooks/useGenieMemory.ts`

```typescript
import { useGenieMemory } from '@/hooks/useGenieMemory';

const { remember, recall, getUsual, getContext } = useGenieMemory(userId);

// Remember preference
await remember({ type: 'preference', content: 'I love Italian food' });

// Recall memories
const memories = await recall('Italian restaurants');

// Get context
const context = await getContext();
```

### Genie Voice Service

**File:** `companies/REZ-Consumer/do/src/services/genieVoiceService.ts`

```typescript
import { GenieVoiceService } from '@/services/genieVoiceService';

const voiceService = new GenieVoiceService();

// Process voice command
const response = await voiceService.processVoiceCommand({
  text: 'Hey Genie, remember I love Italian food',
  language: 'en-IN'
});
```

---

## Environment Variables

### Genie Services

```bash
# Service Configuration
PORT=4703                                    # Service port
NODE_ENV=production
SERVICE_NAME=genie-memory

# Genie Service URLs
GENIE_MEMORY=http://localhost:4703
GENIE_RELATIONSHIP=http://localhost:4704
GENIE_BRIEFING=http://localhost:4706
GENIE_MEETING=http://localhost:4713
GENIE_GATEWAY=http://localhost:4702
GENIE_BUSINESS=http://localhost:4725

# HOJAI Services
HOJAI_GATEWAY=http://localhost:4500
HOJAI_MEMORY=http://localhost:4520
HOJAI_AGENTS=http://localhost:4550

# Voice Services
HOJAI_VOICE_URL=http://localhost:4033
EDGE_STT_URL=http://localhost:4035
```

### DO App (Frontend)

```bash
EXPO_PUBLIC_GENIE_MEMORY_URL=http://localhost:4703
EXPO_PUBLIC_GENIE_RELATIONSHIP_URL=http://localhost:4704
EXPO_PUBLIC_GENIE_BRIEFING_URL=http://localhost:4706
EXPO_PUBLIC_GENIE_MEETING_URL=http://localhost:4713
EXPO_PUBLIC_GENIE_GATEWAY_URL=http://localhost:4702
EXPO_PUBLIC_GENIE_BUSINESS_URL=http://localhost:4725
EXPO_PUBLIC_HOJAI_VOICE_URL=http://localhost:4033
EXPO_PUBLIC_EDGE_STT_URL=http://localhost:4035
```

---

## Docker Compose

**File:** `docker/docker-compose.genie.yml`

All 6 Genie services are configured with:
- Health checks
- Environment variables
- Network configuration
- Volume persistence

```bash
# Start all Genie services
cd docker
docker-compose -f docker-compose.genie.yml up -d

# Check status
docker-compose -f docker-compose.genie.yml ps

# View logs
docker-compose -f docker-compose.genie.yml logs -f genie-memory
```

---

## Port Reference

| Service | Port | Protocol |
|---------|------|----------|
| genie-gateway | 4702 | HTTP |
| genie-memory | 4703 | HTTP |
| genie-relationship | 4704 | HTTP |
| genie-briefing | 4706 | HTTP |
| genie-meeting | 4713 | HTTP |
| genie-business | 4725 | HTTP |
| HOJAI-VOICE-PLATFORM | 4033 | HTTP |
| hojai-edge-stt | 4035 | HTTP |
| hojaiGateway | 4500 | HTTP |
| hojaiMemory | 4520 | HTTP |
| hojaiAgents | 4550 | HTTP |

---

## Development

### Start All Genie Services

```bash
cd docker
docker-compose -f docker-compose.genie.yml up -d
```

### Start Individual Service

```bash
cd companies/hojai-ai/genie-memory-service
npm install
npm run dev
```

### Run Tests

```bash
cd companies/hojai-ai/genie-memory-service
npm test
```

---

## Troubleshooting

### Service Won't Start

1. Check if port is already in use: `lsof -i :4703`
2. Check MongoDB connection: `docker logs genie-mongo`
3. Check logs: `docker logs genie-memory`

### API Returns 500

1. Check if MongoDB is running
2. Check environment variables
3. Check logs for specific error

### Voice Not Working

1. Verify HOJAI-VOICE-PLATFORM is running (port 4033)
2. Check Edge STT is available (port 4035)
3. Verify network connectivity between containers

---

## Business Intelligence Examples

### Natural Language Queries

```bash
# Ask about today's sales
curl -X POST http://localhost:4725/api/business/merchant-123/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What were my sales today?"}'

# Get top items
curl -X POST http://localhost:4725/api/business/merchant-123/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Show me top selling items"}'

# Generate report
curl http://localhost:4725/api/business/merchant-123/report?type=weekly
```

---

## Contributing

When adding new Genie services:

1. Follow the standard service structure
2. Add to `docker/docker-compose.genie.yml`
3. Update this documentation
4. Add environment variables to `.env.example`
5. Write unit tests
6. Update client integrations if needed

---

**Status:** ✅ ALL GENIE SERVICES BUILT AND DOCUMENTED

**End of Documentation**
