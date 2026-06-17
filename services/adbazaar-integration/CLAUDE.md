# AdBazaar Integration Service

**Version:** 1.0.0
**Port:** 4962
**Status:** Ready for Integration

---

## Overview

The AdBazaar Integration Service connects AdBazaar products (CRM Hub, Lead Intelligence, WhatsApp Business) to Customer Operations and Digital Twins in the RTMN ecosystem.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AdBazaar Integration                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐             │
│  │   CRM Hub    │    │    Lead      │    │   WhatsApp   │             │
│  │  (4056)      │    │ Intelligence │    │   Business   │             │
│  └──────┬───────┘    │   (5000)     │    │   (5001)     │             │
│         │            └──────┬───────┘    └──────┬───────┘             │
│         │                   │                   │                      │
│  ┌──────▼──────────────────────────────────────────────────┐           │
│  │              AdBazaar Integration Service (4962)       │           │
│  │                                                          │           │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐  │           │
│  │  │   CRM   │  │  Lead   │  │WhatsApp │  │Campaigns │  │           │
│  │  │ Routes  │  │ Routes  │  │ Routes  │  │  Routes  │  │           │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬─────┘  │           │
│  │       │            │            │             │        │           │
│  │  ┌────▼────────────▼────────────▼─────────────▼────┐  │           │
│  │  │            TwinSync Service                     │  │           │
│  │  │  Lead Twin │ Customer Twin │ Campaign Twin      │  │           │
│  │  └─────────────────────────────────────────────────┘  │           │
│  │       │                                              │           │
│  │  ┌────▼─────────────────────────────────────────────┐ │           │
│  │  │          CustomerOpsBridge Service               │ │           │
│  │  └─────────────────────────────────────────────────┘ │           │
│  └─────────────────────────────────────────────────────────┘           │
│                                │                                        │
│         ┌──────────────────────┼──────────────────────┐                │
│         │                      │                      │                 │
│  ┌──────▼──────┐    ┌──────────▼──────┐    ┌────────▼─────┐            │
│  │  Lead Twin │    │ Customer Twin  │    │Campaign Twin │            │
│  │   (3017)   │    │    (4705)      │    │   (3018)     │            │
│  └────────────┘    └─────────────────┘    └──────────────┘            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Customer Operations                            │   │
│  │  REZ-ecosystem-connector (4399) │ REZ-graphql-federation (4000)   │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Integration Points

### CRM Hub (Port 4056)
| Endpoint | Description |
|----------|-------------|
| `/api/crm/profiles` | Create/update profiles |
| `/api/crm/segments` | Manage segments |
| `/api/crm/bulk-sync` | Bulk profile sync |

**Twins:** CRM Hub → Lead Twin → Customer Twin

### Lead Intelligence
| Endpoint | Description |
|----------|-------------|
| `/api/leads` | Create/update leads |
| `/api/leads/:id/score` | Update lead score |
| `/api/leads/:id/qualify` | Qualify lead |
| `/api/leads/:id/convert` | Convert to customer |
| `/api/leads/stats/summary` | Lead statistics |

**Twins:** Lead Intelligence → Lead Twin

### WhatsApp Business
| Endpoint | Description |
|----------|-------------|
| `/api/whatsapp/webhook` | Incoming message webhook |
| `/api/whatsapp/messages` | Send messages |
| `/api/whatsapp/messages/bulk` | Bulk send |
| `/api/whatsapp/opt-in` | Register consent |
| `/api/whatsapp/templates` | Manage templates |

**Twins:** WhatsApp → Customer Twin

### Campaigns
| Endpoint | Description |
|----------|-------------|
| `/api/campaigns` | Create/update campaigns |
| `/api/campaigns/:id/metrics` | Update metrics |
| `/api/campaigns/:id/launch` | Launch campaign |
| `/api/campaigns/:id/track/:event` | Track events |

**Twins:** Campaigns → Campaign Twin

### DOOH & Journey Intelligence
| Endpoint | Description |
|----------|-------------|
| `/api/dooh/journey` | Sync DOOH exposure |

**Twins:** DOOH → Journey Intelligence → Customer Twin

## Twin Sync Connections

| AdBazaar Product | Source Twin | Target Twin | Events |
|-----------------|-------------|-------------|--------|
| CRM Hub | CRM Data | Lead Twin | profile.created, profile.updated |
| Lead Intelligence | Leads | Lead Twin | lead.created, lead.scoreUpdated |
| WhatsApp | Messages | Customer Twin | message.received, optIn |
| Campaigns | Campaign Data | Campaign Twin | campaign.launched, campaign.metricsUpdated |
| DOOH | Exposure Data | Customer Twin | dooh.exposure |

## API Endpoints

### Health & Status
```bash
GET  /health                  # Service health
GET  /api/integration/status  # Integration status
```

### CRM Routes
```bash
POST   /api/crm/profiles              # Create/update profile
GET    /api/crm/profiles/:id          # Get profile
PATCH  /api/crm/profiles/:id          # Update profile
POST   /api/crm/profiles/:id/activity # Record activity
GET    /api/crm/profiles/:id/engagement # Get engagement
POST   /api/crm/segments              # Create segment
GET    /api/crm/segments/:id/profiles # Get segment profiles
POST   /api/crm/bulk-sync             # Bulk sync profiles
```

### Lead Routes
```bash
POST   /api/leads                     # Create lead
GET    /api/leads/:id                 # Get lead
PATCH  /api/leads/:id                 # Update lead
POST   /api/leads/:id/score           # Update score
POST   /api/leads/:id/qualify         # Qualify lead
POST   /api/leads/:id/convert         # Convert lead
POST   /api/leads/:id/assign          # Assign lead
GET    /api/leads                     # Search leads
GET    /api/leads/stats/summary       # Get stats
```

### WhatsApp Routes
```bash
POST   /api/whatsapp/webhook          # Webhook receiver
POST   /api/whatsapp/messages         # Send message
POST   /api/whatsapp/messages/bulk    # Bulk send
GET    /api/whatsapp/messages/:id     # Get message status
GET    /api/whatsapp/conversations/:phone # Get conversation
POST   /api/whatsapp/opt-in           # Register opt-in
POST   /api/whatsapp/opt-out          # Handle opt-out
POST   /api/whatsapp/templates        # Create template
GET    /api/whatsapp/templates/:id   # Get template
```

### Campaign Routes
```bash
POST   /api/campaigns                 # Create campaign
GET    /api/campaigns/:id             # Get campaign
PATCH  /api/campaigns/:id             # Update campaign
POST   /api/campaigns/:id/metrics     # Update metrics
POST   /api/campaigns/:id/audience    # Set audience
POST   /api/campaigns/:id/launch      # Launch campaign
POST   /api/campaigns/:id/pause       # Pause campaign
POST   /api/campaigns/:id/complete    # Complete campaign
GET    /api/campaigns                 # List campaigns
GET    /api/campaigns/stats/summary   # Get stats
POST   /api/campaigns/:id/track/:event # Track event
```

### DOOH Routes
```bash
POST   /api/dooh/journey               # Sync DOOH exposure
```

## Environment Variables

```bash
# Service
PORT=4962
NODE_ENV=development

# Service URLs
CRM_HUB_URL=http://localhost:4056
LEAD_INTELLIGENCE_URL=http://localhost:5000
WHATSAPP_API_URL=http://localhost:5001
CUSTOMER_OPS_URL=http://localhost:4000

# Twin Services
LEAD_TWIN_URL=http://localhost:3017
CUSTOMER_TWIN_URL=http://localhost:4705
CAMPAIGN_TWIN_URL=http://localhost:3018

# DOOH
DOOH_API_URL=http://localhost:5002
JOURNEY_INTELLIGENCE_URL=http://localhost:4761

# Auth
SERVICE_API_KEY=your-service-api-key-here
JWT_SECRET=your-jwt-secret-here

# Logging
LOG_LEVEL=info
```

## Quick Start

```bash
# Install dependencies
cd services/adbazaar-integration
npm install

# Start development
npm run dev

# Build
npm run build

# Start production
npm start
```

## Testing

```bash
# Health check
curl http://localhost:4962/health

# Integration status
curl http://localhost:4962/api/integration/status

# Create a lead
curl -X POST http://localhost:4962/api/leads \
  -H "Content-Type: application/json" \
  -d '{"firstName":"John","email":"john@example.com","company":"Acme","score":75}'

# Track DOOH exposure
curl -X POST http://localhost:4962/api/dooh/journey \
  -H "Content-Type: application/json" \
  -d '{"adId":"AD-001","location":"Mall-A","audienceId":"A-123"}'
```

## Services Connected

| Service | Port | Purpose |
|---------|------|---------|
| REZ-ecosystem-connector | 4399 | Service Registry |
| REZ-graphql-federation | 4000 | GraphQL API |
| Lead Twin | 3017 | Lead profiles |
| Customer Twin | 4705 | Customer profiles |
| Campaign Twin | 3018 | Campaign tracking |
| Leverge Intelligence | 4761 | Journey Intelligence |

---

*Last Updated: June 16, 2026*
