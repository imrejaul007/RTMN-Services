# REZ Care Command Center - SPEC.md

**Version:** 1.0.0
**Port:** (see config)
**Company:** RTNM-Group
**Category:** Support

---

## Overview

Agent dashboard for unified customer support operations. Provides real-time customer 360 view, ticket management, CSAT tracking, and proactive issue detection.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  REZ Care Command Center                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  Components:                                                                │
│  ├── Customer360 View → Unified customer profile                         │
│  ├── Ticket Manager   → Ticket CRUD and assignment                        │
│  ├── Real-time Socket → Live updates via WebSocket                        │
│  └── Analytics Panel  → CSAT and performance metrics                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

### Ticket
```typescript
{
  ticketId: string
  userId: string
  subject: string
  description: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedTo?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}
```

### Customer360
```typescript
{
  customerId: string
  profile: Record<string, any>
  recentOrders: string[]
  tickets: string[]
  interactions: Interaction[]
  sentiment: 'positive' | 'neutral' | 'negative'
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
| POST | `/api/tickets/:id/assign` | Assign ticket |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers/:id` | Customer 360 view |
| GET | `/api/customers/:id/history` | Interaction history |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/csat` | CSAT metrics |
| GET | `/api/analytics/performance` | Agent performance |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |

---

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ticket:created` | Server → Client | New ticket |
| `ticket:updated` | Server → Client | Ticket changed |
| `customer:updated` | Server → Client | Customer data changed |

---

## Dependencies

```json
{
  "next": "14.1.0",
  "react": "18.2.0",
  "react-dom": "18.2.0",
  "socket.io-client": "^4.7.4",
  "socket.io": "^4.7.4",
  "express": "^4.18.2",
  "axios": "^1.6.7"
}
```

---

## Status

- [x] Customer 360 view
- [x] Ticket management
- [x] Real-time updates
- [x] CSAT tracking
- [x] Proactive detection

