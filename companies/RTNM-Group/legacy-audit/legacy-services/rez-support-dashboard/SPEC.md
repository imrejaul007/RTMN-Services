# REZ Support Dashboard - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Support

---

## Overview

Unified support dashboard backend aggregating all support channels. Provides ticket management, agent routing, and cross-channel support operations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     REZ Support Dashboard                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Ticket Engine    → Multi-channel ticket management                   │
│  ├── Agent Router    → Ticket routing and assignment                       │
│  ├── Channel Aggregator → Unified inbox across channels                    │
│  └── WebSocket Server → Real-time updates                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Ticket
```typescript
{
  ticketId: string
  channel: 'email' | 'chat' | 'whatsapp' | 'call'
  subject: string
  body: string
  status: 'new' | 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  customerId: string
  assignedTo?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}
```

### Agent
```typescript
{
  agentId: string
  name: string
  email: string
  role: 'agent' | 'supervisor' | 'admin'
  status: 'available' | 'busy' | 'away'
  currentTickets: number
  maxTickets: number
}
```

---

## API Endpoints

### Tickets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tickets` | List tickets |
| POST | `/api/tickets` | Create ticket |
| GET | `/api/tickets/:id` | Ticket details |
| PUT | `/api/tickets/:id` | Update ticket |
| POST | `/api/tickets/:id/assign` | Assign agent |
| POST | `/api/tickets/:id/reassign` | Reassign ticket |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List agents |
| GET | `/api/agents/:id` | Agent details |
| PUT | `/api/agents/:id/status` | Update status |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/summary` | Support summary |
| GET | `/api/analytics/sla` | SLA metrics |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ticket:new` | Server → Client | New ticket created |
| `ticket:updated` | Server → Client | Ticket changed |
| `agent:status` | Server → Client | Agent status changed |

---

## Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^8.0.0",
  "ioredis": "^5.3.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0",
  "winston": "^3.11.0",
  "zod": "^3.22.4",
  "socket.io": "^4.7.2"
}
```

---

## Status

- [x] Multi-channel support
- [x] Ticket management
- [x] Agent routing
- [x] Real-time updates
- [x] SLA tracking

