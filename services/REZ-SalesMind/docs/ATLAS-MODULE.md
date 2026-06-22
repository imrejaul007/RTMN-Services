# REZ Atlas Module - Sales Mind Integration

**Version:** 1.0.0
**Date:** June 18, 2026
**Status:** Phase 1 Complete - Gateway Foundation

---

## Overview

The REZ Atlas Module provides unified access to all REZ Atlas microservices (v1 + v2) through a single gateway layer in REZ Sales Mind. This eliminates the need for clients to manage multiple Atlas service endpoints.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        REZ Sales Mind                               │
│                         (Port 5170)                                 │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              REZ Atlas Gateway (/api/atlas/*)               │    │
│  │                                                              │    │
│  │  • Circuit breaker pattern                                   │    │
│  │  • Service health monitoring                                  │    │
│  │  • Unified error handling                                    │    │
│  │  • Request/response logging                                   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                        │
│          ┌───────────────────┼───────────────────┐                    │
│          │                   │                   │                    │
│    ┌─────▼─────┐    ┌──────▼──────┐   ┌──────▼──────┐           │
│    │ Atlas v1  │    │  Atlas v2   │   │ Atlas v2    │           │
│    │ (5151-5191)│    │  (5150-5165)│   │(5174-5183)  │           │
│    └───────────┘    └─────────────┘   └─────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

### Phase 1 (Completed)
- [x] Centralized gateway to all Atlas services
- [x] Circuit breaker pattern for fault tolerance
- [x] Health monitoring for all services
- [x] Unified error handling
- [x] All v1 service proxies (Discover, Maps, Twin, Score, Signals, Territory, Routes, Copilot, Graph)
- [x] Core v2 service proxies (Company Twin, Person Twin, Intent Engine, CRM, Pipeline, Forecast, Conversation Intel, SDR Agent)
- [x] Unified search across multiple Atlas services

## API Endpoints

### Health & Status

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/health` | Check health of all Atlas services |
| GET | `/api/atlas/status` | Quick status without health pings |

### Atlas v1 - Core Intelligence

#### Discover
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/discover/search` | Search merchants |
| GET | `/api/atlas/discover/nearby` | Find nearby merchants |
| GET | `/api/atlas/discover/categories` | List categories |
| POST | `/api/atlas/discover/sync/google` | Sync from Google Places |

#### Maps
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/maps/heat` | Get heat map data |
| GET | `/api/atlas/maps/clusters` | Get cluster data |
| GET | `/api/atlas/maps/territory/:id` | Get territory overlay |

#### Twin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/twin/:merchantId` | Get merchant twin |
| GET | `/api/atlas/twin/:merchantId/dashboard` | Get twin dashboard |
| GET | `/api/atlas/twin/:merchantId/performance` | Get performance data |
| GET | `/api/atlas/twin/:merchantId/presence` | Get presence twin |
| GET | `/api/atlas/twin/:merchantId/reputation` | Get reputation twin |
| GET | `/api/atlas/twin/:merchantId/operations` | Get operations twin |
| GET | `/api/atlas/twin/:merchantId/growth` | Get growth signals |

#### Score
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/score/leads` | Get all leads with scores |
| POST | `/api/atlas/score/leads` | Create scored lead |
| GET | `/api/atlas/score/leads/:id` | Get lead score |
| POST | `/api/atlas/score/leads/:id/score` | Score a lead |
| GET | `/api/atlas/score/stats` | Get scoring statistics |

#### Signals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/signals/opportunities` | Get opportunities |
| GET | `/api/atlas/signals/stats` | Get opportunity stats |
| GET | `/api/atlas/signals/competitors` | Get competitor data |
| GET | `/api/atlas/signals/dashboard` | Get signals dashboard |
| POST | `/api/atlas/signals/enrich` | Enrich with web intelligence |
| POST | `/api/atlas/signals/web-intelligence` | Get signals from web |

### Atlas v1 - Sales Intelligence

#### Territory
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/territory` | List territories |
| POST | `/api/atlas/territory` | Create territory |
| GET | `/api/atlas/territory/:id` | Get territory |
| PUT | `/api/atlas/territory/:id` | Update territory |
| GET | `/api/atlas/territory/:id/performance` | Territory performance |
| POST | `/api/atlas/territory/balance` | Balance territories |

#### Routes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/routes` | List routes |
| POST | `/api/atlas/routes` | Create route |
| GET | `/api/atlas/routes/:id` | Get route |
| POST | `/api/atlas/routes/optimize` | Optimize route |
| PATCH | `/api/atlas/routes/:id/stops/:stopId` | Update stop |

#### Copilot
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/atlas/copilot/summarize` | Generate summary |
| POST | `/api/atlas/copilot/pitch` | Generate pitch |
| POST | `/api/atlas/copilot/compare` | Competitor comparison |

#### Graph
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/graph/merchant/:merchantId` | Get network graph |
| GET | `/api/atlas/graph/relationships` | Get relationships |
| POST | `/api/atlas/graph/connect` | Create relationship |

### Atlas v2 - Core Services

#### Company Twin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/v2/company/:id` | Get company twin |
| POST | `/api/atlas/v2/company` | Create/update company |

#### Person Twin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/v2/person/:id` | Get person twin |
| POST | `/api/atlas/v2/person` | Create/update person |

#### Intent Engine
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/v2/intent/:prospectId` | Get intent signals |
| POST | `/api/atlas/v2/intent/signals` | Detect intent |

#### Research Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/atlas/v2/research` | Research company/contact |

#### CRM
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/v2/crm/accounts` | List accounts |
| POST | `/api/atlas/v2/crm/accounts` | Create account |
| GET | `/api/atlas/v2/crm/contacts` | List contacts |
| POST | `/api/atlas/v2/crm/contacts` | Create contact |
| GET | `/api/atlas/v2/crm/opportunities` | List opportunities |
| POST | `/api/atlas/v2/crm/opportunities` | Create opportunity |

#### Pipeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/v2/pipeline` | Get pipeline |

#### Forecast
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/v2/forecast` | Get revenue forecast |

#### Conversation Intel
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/atlas/v2/conversation/transcribe` | Transcribe |
| POST | `/api/atlas/v2/conversation/analyze` | Analyze |

#### SDR Agent
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/atlas/v2/sdr/start` | Start SDR workflow |
| GET | `/api/atlas/v2/sdr/status/:id` | Workflow status |

#### Email
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/atlas/v2/email/campaign` | Create campaign |
| POST | `/api/atlas/v2/email/send` | Send email |

#### WhatsApp
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/atlas/v2/whatsapp/send` | Send WhatsApp |

#### SMS
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/atlas/v2/sms/send` | Send SMS |

### Unified Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/atlas/search` | Search across all Atlas services |

## Environment Variables

### Atlas v1
```
ATLAS_DISCOVER_URL=http://localhost:5151
ATLAS_MAPS_URL=http://localhost:5152
ATLAS_TWIN_URL=http://localhost:5153
ATLAS_SCORE_URL=http://localhost:5154
ATLAS_SIGNALS_URL=http://localhost:5155
ATLAS_TERRITORY_URL=http://localhost:5170
ATLAS_ROUTES_URL=http://localhost:5171
ATLAS_COPILOT_URL=http://localhost:5172
ATLAS_GRAPH_URL=http://localhost:5173
ATLAS_DASHBOARD_URL=http://localhost:5190
```

### Atlas v2
```
ATLAS_V2_DISCOVER_URL=http://localhost:5150
ATLAS_V2_CONTACT_FINDER_URL=http://localhost:5151
ATLAS_V2_COMPANY_TWIN_URL=http://localhost:5156
ATLAS_V2_PERSON_TWIN_URL=http://localhost:5157
ATLAS_V2_RESEARCH_AGENT_URL=http://localhost:5158
ATLAS_V2_INTENT_ENGINE_URL=http://localhost:5159
ATLAS_V2_ENRICHMENT_URL=http://localhost:5160
ATLAS_V2_EMAIL_URL=http://localhost:5161
ATLAS_V2_WHATSAPP_URL=http://localhost:5162
ATLAS_V2_SMS_URL=http://localhost:5163
ATLAS_V2_CALL_URL=http://localhost:5164
ATLAS_V2_DELIVERABILITY_URL=http://localhost:5165
ATLAS_V2_SDR_AGENT_URL=http://localhost:5174
ATLAS_V2_QUALIFICATION_AGENT_URL=http://localhost:5175
ATLAS_V2_MEETING_AGENT_URL=http://localhost:5176
ATLAS_V2_FOLLOWUP_AGENT_URL=http://localhost:5177
ATLAS_V2_CRM_CORE_URL=http://localhost:5180
ATLAS_V2_PIPELINE_URL=http://localhost:5181
ATLAS_V2_FORECAST_URL=http://localhost:5182
ATLAS_V2_CONVERSATION_INTEL_URL=http://localhost:5183
```

## Circuit Breaker

The Atlas Gateway implements circuit breaker pattern for fault tolerance:

- **Failure Threshold:** 5 consecutive failures opens the circuit
- **Reset Timeout:** 30 seconds before attempting recovery
- **Half-Open Success Threshold:** 2 successes needed to close circuit

### Circuit Breaker States
- **CLOSED:** Normal operation, requests pass through
- **OPEN:** Service unavailable, requests rejected immediately
- **HALF_OPEN:** Testing recovery, limited requests allowed

### Monitoring
```bash
# Check circuit breaker status
GET /api/atlas/health
# Returns: { circuitBreakers: { serviceName: { state, failures, successes, nextAttempt } } }
```

## Error Responses

### Service Unavailable
```json
{
  "error": "Service temporarily unavailable",
  "reason": "circuit_open",
  "service": "atlas-discover",
  "nextRetry": "2026-06-18T10:00:00.000Z"
}
```

### Backend Error
```json
{
  "error": "Connection refused",
  "status": 500,
  "service": "atlas-twin",
  "requestId": "uuid"
}
```

## Example Usage

### Search for merchants in an area
```bash
curl "http://localhost:5170/api/atlas/discover/nearby?lat=28.6139&lng=77.2090&radius=5000"
```

### Get merchant twin
```bash
curl "http://localhost:5170/api/atlas/twin/merchant_123"
```

### Get opportunities
```bash
curl "http://localhost:5170/api/atlas/signals/opportunities?severity=high&limit=10"
```

### Unified search
```bash
curl "http://localhost:5170/api/atlas/search?q=restaurant&lat=28.6139&lng=77.2090&limit=20"
```

### Check all services health
```bash
curl "http://localhost:5170/api/atlas/health"
```

## Roadmap

### Phase 2 (Planned)
- [ ] Replace mock endpoints in `/api/sales` with real Atlas calls
- [ ] Replace mock endpoints in `/api/insights` with Atlas v2 calls
- [ ] Replace mock endpoints in `/api/dashboard` with Atlas calls

### Phase 3 (Planned)
- [ ] Consolidate SDR → Atlas v2 SDR Agent
- [ ] Consolidate Call Transcription → Atlas v2 Conversation Intel
- [ ] Add CRM routes from Atlas v2

### Phase 4 (Future)
- [ ] Full Atlas v2 Engage layer integration
- [ ] AI Workforce integration
- [ ] GTM module integration

## Files

```
src/
├── services/atlas/
│   └── atlasGateway.js      # Reusable proxy service
└── routes/atlas/
    └── atlas.js            # Atlas gateway routes

docs/
└── ATLAS-MODULE.md         # This documentation
```

---

**Last Updated:** June 18, 2026
