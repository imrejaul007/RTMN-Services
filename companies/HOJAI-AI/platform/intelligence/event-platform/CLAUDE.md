# Event Platform

**Port:** 4901  
**Status:** ✅ Built  
**Purpose:** Schema registry, event ingestion, subscription, routing, and replay for the RTMN ecosystem

---

## Overview

Event Platform is the central event bus and schema management system for RTMN. It provides:
- Schema registry for event types
- Event ingestion and storage
- Subscription-based event delivery
- Routing rules engine
- Event replay capabilities
- Real-time analytics

---

## Tech Stack

- Node.js
- Express.js
- In-memory JSON storage

---

## API Endpoints

### Schema Registry

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schemas` | List all schemas |
| GET | `/api/schemas/:name` | Get schema by name |
| POST | `/api/schemas` | Create new schema |
| DELETE | `/api/schemas/:name/:version` | Deprecate schema |

**Schema Structure:**
```json
{
  "id": "uuid",
  "name": "string",
  "version": 1,
  "fields": ["array", "of", "fields"],
  "createdAt": "ISO date"
}
```

### Event Ingestion

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/events` | Ingest new event |
| GET | `/api/events` | Query events with filters |

**Event Structure:**
```json
{
  "id": "uuid",
  "type": "event-type",
  "source": "service-name",
  "data": {},
  "schemaVersion": 1,
  "timestamp": "ISO date",
  "deliveredTo": []
}
```

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/subscriptions` | List all subscriptions |
| POST | `/api/subscriptions` | Create subscription |
| DELETE | `/api/subscriptions/:id` | Delete subscription |

**Subscription Structure:**
```json
{
  "id": "uuid",
  "name": "subscription-name",
  "type": "event-type",
  "callback": "http://target.service/callback",
  "filter": null,
  "active": true
}
```

### Routing Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules` | List all routing rules |
| POST | `/api/rules` | Create routing rule |
| DELETE | `/api/rules/:id` | Delete rule |

### Event Replay

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/replay` | Start replay job |
| GET | `/api/replay/:id` | Get replay status |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Event statistics |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/event-platform
npm install
npm start
```

---

## Integration

### Publish Event
```javascript
const response = await fetch('http://localhost:4901/api/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'user.signup',
    source: 'auth-service',
    data: { userId: '123', email: 'test@example.com' }
  })
});
```

### Subscribe to Events
```javascript
await fetch('http://localhost:4901/api/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'notify-on-signup',
    type: 'user.signup',
    callback: 'http://notification-service/webhook'
  })
});
```

---

## Health Endpoints

- `GET /health` - Service health
- `GET /ready` - Readiness check

---

## Related Services

- [ai-intelligence](ai-intelligence/) - Event processing
- [rag-platform](rag-platform/) - Knowledge events
- [micro-intelligence](micro-intelligence/) - Event-driven fallbacks
