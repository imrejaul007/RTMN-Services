# Proactive Engine

**Port:** 4789  
**Status:** ✅ Built  
**Purpose:** Proactive suggestions based on context and rule evaluation

---

## Overview

Proactive Engine provides context-aware proactive suggestions:
- Rule-based trigger system
- Condition evaluation (eq, neq, gt, lt, in, contains)
- Priority-based suggestion ranking
- Multiple action types

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)
- PersistentMap (`@rtmn/shared/lib/persistent-map`)

---

## Rule Structure

```json
{
  "id": "uuid",
  "name": "string",
  "trigger": {
    "conditions": [
      { "key": "field", "op": "eq|neq|gt|lt|in|contains", "value": "value" }
    ]
  },
  "action": { "type": "string", "data": {} },
  "priority": 5,
  "enabled": true,
  "createdAt": "ISO date"
}
```

---

## API Endpoints

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/proactive/rule` | Create rule |
| GET | `/api/proactive/rules` | List rules |
| GET | `/api/proactive/rules/:id` | Get rule |
| DELETE | `/api/proactive/rules/:id` | Delete rule |

### Suggestions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/proactive/suggest` | Get suggestions |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/proactive/audit` | View audit log |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/api/health` | Detailed health |
| GET | `/ready` | Readiness |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/proactive-engine
npm install
npm start
```

---

## Example Usage

### Create Rule
```javascript
await fetch('http://localhost:4789/api/proactive/rule', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    name: 'low-balance-alert',
    trigger: {
      conditions: [
        { key: 'balance', op: 'lt', value: 100 }
      ]
    },
    action: {
      type: 'notification',
      data: { message: 'Your balance is low', channel: 'push' }
    },
    priority: 8
  })
});
```

### Get Suggestions
```javascript
const suggestions = await fetch('http://localhost:4789/api/proactive/suggest', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    userId: 'user-123',
    context: { balance: 50, lastActivity: '2 hours ago' },
    prefer: ['notification', 'upsell']
  })
});
```

---

## Condition Operators

| Operator | Description |
|----------|-------------|
| `eq` | Equal |
| `neq` | Not equal |
| `gt` | Greater than |
| `lt` | Less than |
| `in` | Value in array |
| `contains` | String contains |

---

## Integration

| Service | Integration |
|---------|-------------|
| `Genie` | Proactive notifications |
| `DO App` | Action triggers |
| `event-platform` | Event-based rules |
| `personalization` | Context enrichment |

---

## Related Services

- [personalization](personalization/) - User preferences
- [event-platform](event-platform/) - Event triggers
- [reflection-engine](reflection-engine/) - Quality scoring
