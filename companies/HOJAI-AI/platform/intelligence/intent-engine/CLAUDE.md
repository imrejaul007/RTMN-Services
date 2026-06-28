# Intent Engine

**Port:** 4786  
**Status:** ✅ Built  
**Purpose:** Classify user queries into intents via keyword/pattern matching

---

## Overview

Intent Engine detects user intent from natural language text using keyword and pattern matching:
- 12 built-in intent categories
- Confidence scoring
- Batch processing
- Audit logging
- Internal token authentication

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)

---

## Intent Catalog

| Intent | Keywords |
|--------|----------|
| **search** | find, search, look up, where, what is |
| **buy** | buy, purchase, order, checkout, cart |
| **cancel** | cancel, stop, terminate, unsubscribe |
| **support** | help, issue, problem, support, broken, error |
| **compare** | compare, vs, versus, difference, better |
| **recommend** | recommend, suggest, best, top, should i |
| **track** | track, where is, status, shipped, delivery |
| **return** | return, refund, exchange, send back |
| **greet** | hi, hello, hey, good morning, thanks |
| **unknown** | (fallback for unrecognized) |

---

## API Endpoints

### Intent Detection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/intent` | Detect intent from text |
| POST | `/api/intent/batch` | Batch intent detection |

### Catalog

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intent/catalog` | List all available intents |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intent/audit` | View audit log (filter: action, limit) |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/api/health` | Detailed health with stats |
| GET | `/ready` | Readiness check |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/intent-engine
npm install
npm start
```

---

## Example Usage

### Detect Intent
```javascript
const response = await fetch('http://localhost:4786/api/intent', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-internal-token': 'intent-engine-internal-token'
  },
  body: JSON.stringify({
    text: 'I want to buy a new laptop',
    actor: 'user-123'
  })
});

const result = await response.json();
// result.intent = "buy"
// result.confidence = 0.85
// result.alternatives = ["search", "recommend"]
```

### Batch Detection
```javascript
await fetch('http://localhost:4786/api/intent/batch', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-internal-token': 'intent-engine-internal-token'
  },
  body: JSON.stringify({
    texts: [
      'Track my order please',
      'How do I return this item?',
      'What is the best restaurant nearby?'
    ]
  })
});
```

### View Catalog
```javascript
const catalog = await fetch('http://localhost:4786/api/intent/catalog');
```

---

## Response Format

```json
{
  "text": "I want to buy a new laptop",
  "intent": "buy",
  "confidence": 0.85,
  "alternatives": ["search", "recommend"]
}
```

---

## Authentication

The service uses internal token authentication:
- Set `x-internal-token` header
- Or set `INTENT_ENGINE_REQUIRE_AUTH=false` to bypass

---

## Integration with Other Services

| Service | Integration |
|---------|-------------|
| `ai-intelligence` | Intent routing |
| `planning-engine` | Goal decomposition |
| `event-platform` | Intent events |
| `DO App` | User action detection |
| `Genie` | Intent understanding |
| `RAZO` | Intent communication |

---

## Health Endpoints

- `GET /health` - Basic health
- `GET /api/health` - Detailed stats (uptime, audit count)
- `GET /ready` - Readiness check

---

## Related Services

- [ai-intelligence](ai-intelligence/) - AI orchestration
- [planning-engine](planning-engine/) - Task planning
- [event-platform](event-platform/) - Event routing
