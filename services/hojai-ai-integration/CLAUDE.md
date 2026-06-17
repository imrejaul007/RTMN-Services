# HOJAI AI Integration Service

**Version:** 1.0.0
**Port:** 4960
**Status:** Production Ready

---

## Overview

The HOJAI AI Integration Service connects HOJAI AI products (Genie, Copilot, SUTAR OS) to the Customer Operations OS. It provides seamless data synchronization between AI products and the RTMN ecosystem.

## Architecture

```
                    ┌─────────────────────────────────────┐
                    │   HOJAI AI Integration (Port 4960)  │
                    ├─────────────────────────────────────┤
                    │  /api/genie  - Genie conversations  │
                    │  /api/copilot - Support copilot    │
                    │  /api/sutar  - SUTAR decisions     │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
              ▼                    ▼                    ▼
    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
    │ CustomerOpsBridge│  │    TwinSync     │  │  HojaiProfile   │
    │                 │  │                 │  │     Model       │
    └────────┬────────┘  └────────┬────────┘  └─────────────────┘
             │                    │
    ┌────────┴────────┐    ┌──────┴───────┐
    │                │    │              │
    ▼                ▼    ▼              ▼
┌───────┐  ┌─────────┐ ┌───────┐  ┌─────────┐
│Memory │  │  Goal   │ │ Agent │  │  Buyer  │
│   OS  │  │    OS   │ │ Twin  │  │  Twin   │
└───────┘  └─────────┘ └───────┘  └─────────┘
```

## Connected Services

| Service | Port | Purpose |
|---------|------|---------|
| Customer Ops | 4399 | User sync, Customer Twin |
| Memory OS | 4703 | Conversation memory |
| Goal OS | 4242 | Outcome intelligence |
| Decision Engine | 4240 | Decision recording |
| Copilot | 4765 | Support context |
| Agent Twin | 3011 | Agent profiles |
| Buyer Twin | 3017 | Buyer profiles |
| Area Twin | 3019 | Area/conversation data |
| Referral Twin | 3016 | Referral activity |
| Deal Twin | 3018 | Deal decisions |
| Property Twin | 3015 | Property data |
| Event Bus | 4510 | Event publishing |

---

## API Endpoints

### Genie Routes (`/api/genie`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profiles` | Create HOJAI profile for Genie |
| GET | `/profiles/:profileId` | Get profile by ID |
| GET | `/profiles` | List all profiles |
| PUT | `/profiles/:profileId` | Update profile |
| POST | `/conversations` | Create conversation |
| GET | `/conversations/:id` | Get conversation |
| POST | `/conversations/:id/messages` | Add message |
| POST | `/conversations/:id/context` | Update context |
| POST | `/integrate/:profileId` | Activate integration |
| GET | `/health` | Service health check |

### Copilot Routes (`/api/copilot`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profiles` | Create HOJAI profile for Copilot |
| GET | `/profiles/:profileId` | Get profile by ID |
| GET | `/profiles` | List all profiles |
| POST | `/support/context` | Create support context |
| POST | `/assist` | AI-assisted support |
| POST | `/recommendations` | Generate recommendations |
| POST | `/analytics/sync` | Sync analytics data |
| POST | `/integrate/:profileId` | Activate integration |
| GET | `/health` | Service health check |

### SUTAR Routes (`/api/sutar`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/profiles` | Create HOJAI profile for SUTAR |
| GET | `/profiles/:profileId` | Get profile by ID |
| GET | `/profiles` | List all profiles |
| POST | `/decisions` | Record autonomous decision |
| GET | `/decisions` | List decisions |
| PUT | `/decisions/:id/outcome` | Update decision outcome |
| POST | `/goals` | Create goal mapping |
| PUT | `/goals/:id/progress` | Update goal progress |
| POST | `/goals/:id/milestones` | Add milestone |
| POST | `/autonomous/execute` | Execute autonomous action |
| POST | `/integrate/:profileId` | Activate integration |
| GET | `/health` | Service health check |

---

## Integration Mappings

### HOJAI to Customer Operations

| HOJAI Component | Customer Operations | Sync Direction |
|-----------------|---------------------|----------------|
| HOJAI Users | Customer Twin | HOJAI -> Customer Ops |
| Genie Conversations | Conversation Memory | HOJAI -> Memory OS |
| SUTAR Decisions | Decision Engine | HOJAI -> Decision Engine |
| Copilot | Support Copilot | Bidirectional |
| Goals | Outcome Intelligence | HOJAI -> Goal OS |
| Trust Level | Trust Intelligence | HOJAI -> Customer Ops |

### Twin Synchronization

| HOJAI Data | Target Twin | Sync Trigger |
|------------|-------------|--------------|
| User Profile | Agent Twin | Profile creation/update |
| Buyer Data | Buyer Twin | Copilot integration |
| Conversation Activity | Area Twin | Message in conversation |
| Goals | Linked Twin | Goal progress update |
| Decisions | Deal Twin | Decision recorded |

---

## Quick Start

```bash
# Install dependencies
cd services/hojai-ai-integration
npm install

# Copy environment file
cp .env.example .env

# Build TypeScript
npm run build

# Start service
npm start

# Or development mode
npm run dev
```

## Health Check

```bash
curl http://localhost:4960/health
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4960 | Service port |
| NODE_ENV | development | Environment |
| CUSTOMER_OPS_URL | http://localhost:4399 | Customer Ops URL |
| MEMORY_OS_URL | http://localhost:4703 | Memory OS URL |
| GOAL_OS_URL | http://localhost:4242 | Goal OS URL |
| DECISION_ENGINE_URL | http://localhost:4240 | Decision Engine URL |
| COPILOT_SERVICE_URL | http://localhost:4765 | Copilot URL |
| AGENT_TWIN_URL | http://localhost:3011 | Agent Twin URL |
| BUYER_TWIN_URL | http://localhost:3017 | Buyer Twin URL |
| AREA_TWIN_URL | http://localhost:3019 | Area Twin URL |
| REFERRAL_TWIN_URL | http://localhost:3016 | Referral Twin URL |
| DEAL_TWIN_URL | http://localhost:3018 | Deal Twin URL |
| PROPERTY_TWIN_URL | http://localhost:3015 | Property Twin URL |
| EVENT_BUS_URL | http://localhost:4510 | Event Bus URL |
| SERVICE_API_KEY | - | API authentication key |
| LOG_LEVEL | info | Logging level |

---

## Example Usage

### Create Genie Profile

```bash
curl -X POST http://localhost:4960/api/genie/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "hojaiUserId": "user-456",
    "products": ["genie", "memory"],
    "preferences": {
      "language": "en",
      "timezone": "UTC"
    }
  }'
```

### Add Genie Conversation Message

```bash
curl -X POST http://localhost:4960/api/genie/conversations/CONV-123/messages \
  -H "Content-Type: application/json" \
  -d '{
    "role": "user",
    "content": "Help me find a restaurant",
    "metadata": {"intent": "search"}
  }'
```

### Record SUTAR Decision

```bash
curl -X POST http://localhost:4960/api/sutar/decisions \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "decisionId": "dec-789",
    "context": {"user": "user-456", "action": "recommend"},
    "decision": "Recommend Italian restaurant",
    "confidence": 0.85,
    "agentId": "agent-001"
  }'
```

### Create Support Context

```bash
curl -X POST http://localhost:4960/api/copilot/support/context \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-123",
    "customerId": "customer-456",
    "issueType": "billing",
    "priority": "high",
    "summary": "Customer charged twice"
  }'
```

---

## Multi-Tenant Support

All endpoints support `tenantId` for multi-client isolation:

- Profiles are scoped to `tenantId`
- Conversations are isolated per `tenantId`
- Decisions are stored per `tenantId`
- Twin sync includes `tenantId` in all requests

---

## Models

### HojaiProfile

```typescript
{
  id: string;              // HP-XXXXXXXX
  tenantId: string;
  hojaiUserId: string;
  products: HojaiProduct[];
  trustLevel: TrustLevel;
  integrations: IntegrationRecord[];
  customerTwinId?: string;
  agentTwinId?: string;
  preferences: ProfilePreferences;
  createdAt: Date;
  updatedAt: Date;
}
```

### HojaiProduct Enum

- `genie` - Genie AI assistant
- `copilot` - Business copilot
- `sutar` - SUTAR autonomous OS
- `memory` - Memory OS integration
- `goals` - Goal tracking

### TrustLevel Enum

- `unverified` - New user
- `basic` - Verified email
- `verified` - Identity verified
- `trusted` - High trust score
- `elite` - Top tier user

---

## Service Health

```json
{
  "service": "hojai-ai-integration",
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-06-16T10:00:00.000Z",
  "services": {
    "bridge": {
      "status": "healthy",
      "services": {
        "customerOps": true,
        "memoryOs": true,
        "goalOs": true,
        "decisionEngine": true,
        "copilot": true
      }
    },
    "twinSync": {
      "status": "healthy",
      "twins": {
        "agentTwin": true,
        "buyerTwin": true,
        "areaTwin": true,
        "referralTwin": true,
        "dealTwin": true,
        "propertyTwin": true
      }
    }
  }
}
```

---

*Last Updated: June 16, 2026*
*HOJAI AI Integration Service*
