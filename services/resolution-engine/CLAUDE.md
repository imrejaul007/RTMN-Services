# Resolution Engine Service

**Port:** 4981  
**Status:** Ready for Implementation  
**Purpose:** Auto-resolve issues using Knowledge Base + AI

---

## Overview

The Resolution Engine is an intelligent service that automatically resolves customer support tickets using:
- Knowledge Base matching
- Resolution templates
- AI-powered suggestions
- SLA tracking and escalation

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     RESOLUTION ENGINE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    │
│  │   REST API    │    │  Auto Resolve │    │  SLA Tracker │    │
│  │   Routes     │    │   Service     │    │   Service    │    │
│  └───────┬──────┘    └───────┬───────┘    └───────┬───────┘    │
│          │                   │                     │             │
│  ┌───────▼───────────────────▼─────────────────────▼────────┐  │
│  │                    RESOLUTION MODELS                       │  │
│  │   - Resolution records                                     │  │
│  │   - Templates                                              │  │
│  │   - Escalation rules                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│          ┌───────────────────┼───────────────────┐              │
│          │                   │                   │              │
│  ┌───────▼───────┐   ┌───────▼───────┐   ┌───────▼───────┐     │
│  │  Knowledge    │   │   Customer    │   │    Event      │     │
│  │  Resolver     │   │   Ops Bridge   │   │    Bus        │     │
│  └───────────────┘   └───────────────┘   └───────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Endpoints

### Resolution Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resolutions` | List all resolutions |
| GET | `/api/resolutions/:id` | Get resolution by ID |
| POST | `/api/resolutions` | Create new resolution |
| PATCH | `/api/resolutions/:id` | Update resolution |
| POST | `/api/resolutions/:id/resolve` | Manual resolution |
| POST | `/api/resolutions/:id/escalate` | Escalate resolution |

### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resolutions/templates/list` | List all templates |
| GET | `/api/resolutions/templates/search` | Search templates |
| POST | `/api/resolutions/templates` | Add new template |

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/resolutions/stats/summary` | Resolution statistics |

### SLA Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sla/dashboard` | SLA dashboard |
| GET | `/api/sla/:id/status` | SLA status for resolution |
| PATCH | `/api/sla/config` | Update SLA config |
| GET | `/api/sla/reports` | SLA reports |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## Features

### 1. Auto-Resolution from Knowledge Base

The system automatically matches incoming tickets against:
- Pre-defined resolution templates
- Knowledge Base articles
- Historical resolution patterns

**Confidence Threshold:** 0.85 (configurable via `AUTO_RESOLVE_CONFIDENCE_THRESHOLD`)

### 2. Resolution Templates

Default templates included:
- Password Reset
- Billing Inquiry
- Service Outage
- Feature Request

### 3. SLA Tracking

| Priority | Response SLA | Resolution SLA |
|----------|-------------|----------------|
| Critical | 30 minutes | 1 hour |
| High | 2 hours | 4 hours |
| Medium | 12 hours | 24 hours |
| Low | 36 hours | 72 hours |

### 4. Escalation Rules

Triggers:
- SLA breach
- Customer tier (Enterprise)
- Priority level
- Escalation count threshold

### 5. Agent Assignment

Automatic agent assignment based on:
- Skills matching
- Workload balancing
- Priority level
- Customer tier

---

## Integration Points

### Knowledge Base (MemoryOS)
- Port: 4703
- Used for article search and matching

### Customer Twin
- Port: 3017
- Customer profiles and history

### Agent Twin
- Port: 3011
- Agent profiles and availability

### Event Bus
- Port: 4510
- Event publishing for notifications

---

## Environment Variables

```
PORT=4981
AUTO_RESOLVE_ENABLED=true
AUTO_RESOLVE_CONFIDENCE_THRESHOLD=0.85
KNOWLEDGE_BASE_URL=http://localhost:4703
CUSTOMER_TWIN_URL=http://localhost:3017
AGENT_TWIN_URL=http://localhost:3011
EVENT_BUS_URL=http://localhost:4510
```

---

## Quick Start

```bash
cd services/resolution-engine
npm install
npm run dev
```

---

## API Examples

### Create Resolution
```bash
curl -X POST http://localhost:4981/api/resolutions \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "TKT-001",
    "title": "Password Reset",
    "description": "I forgot my password",
    "category": "account",
    "priority": "medium",
    "customerId": "cust-123"
  }'
```

### Get SLA Dashboard
```bash
curl http://localhost:4981/api/sla/dashboard
```

### Search Templates
```bash
curl "http://localhost:4981/api/resolutions/templates/search?q=password"
```

---

## Events Published

- `resolution.resolved` - Resolution completed
- `resolution.escalated` - Ticket escalated
- `resolution.sla.breached` - SLA breached
- `resolution.sla.alert` - SLA warning
- `notification.*` - Customer notifications

---

*Last Updated: June 16, 2026*
