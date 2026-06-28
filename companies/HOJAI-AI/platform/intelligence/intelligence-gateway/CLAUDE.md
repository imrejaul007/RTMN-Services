# Intelligence Gateway

**Port:** 4750  
**Status:** ✅ Built  
**Purpose:** Unified entry point for all RTMN intelligence services

---

## Overview

Intelligence Gateway provides a single unified API for all intelligence services:
- Routes requests to appropriate intelligence service
- Aggregates responses from multiple services
- Provides fallback mechanisms
- Handles authentication
- Rate limiting and monitoring

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication

---

## API Endpoints

### Intelligence Router

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/intelligence/:service/:action` | Route to specific service |

### Services Connected

| Service | Port | Capabilities |
|---------|------|-------------|
| **ai-intelligence** | 4881 | Intent, Sentiment, Fraud, Classification |
| **predictive-intelligence** | 4754 | Forecasting, Anomaly Detection |
| **risk-intelligence** | 4755 | Fraud, Churn, Credit Scoring |
| **decision-intelligence** | 4756 | Recommendations, NBA |
| **reasoning-engine** | 4933 | Chain-of-thought |
| **intent-engine** | 4786 | Intent Detection |
| **personalization** | 4893 | User Preferences |
| **knowledge-registry** | 4900 | Knowledge Assets |
| **event-platform** | 4901 | Event Management |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/intelligence-gateway
npm install
npm start
```

---

## Example Usage

### Analyze Text (routes to ai-intelligence)
```javascript
const result = await fetch('http://localhost:4750/api/intelligence/ai-intelligence/analyze', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    text: 'I want to buy a laptop',
    userId: 'user-123'
  })
});
```

### Forecast (routes to predictive-intelligence)
```javascript
const forecast = await fetch('http://localhost:4750/api/intelligence/predictive-intelligence/forecast', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    metric: 'sales',
    history: [100, 120, 115, 140]
  })
});
```

### Get Recommendations (routes to decision-intelligence)
```javascript
const recs = await fetch('http://localhost:4750/api/intelligence/decision-intelligence/recommend', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    userId: 'user-123',
    category: 'restaurants',
    limit: 5
  })
});
```

---

## Service Mapping

| Gateway Action | Routes To | Port |
|---------------|----------|------|
| `ai-intelligence/analyze` | ai-intelligence | 4881 |
| `ai-intelligence/intent` | intent-engine | 4786 |
| `ai-intelligence/sentiment` | ai-intelligence | 4881 |
| `predictive-intelligence/forecast` | predictive-intelligence | 4754 |
| `risk-intelligence/score` | risk-intelligence | 4755 |
| `decision-intelligence/recommend` | decision-intelligence | 4756 |
| `reasoning-engine/reason` | reasoning-engine | 4933 |
| `personalization/profile` | personalization | 4893 |
| `knowledge-registry/search` | knowledge-registry | 4900 |
| `event-platform/publish` | event-platform | 4901 |

---

## Health Endpoints

- `GET /health` - Gateway health
- `GET /services` - List connected services
- `GET /services/:name/health` - Individual service health

---

## Integration

| Service | Integration |
|---------|-------------|
| All intelligence services | Routes requests |
| micro-intelligence | Circuit breaker fallback |
| event-platform | Event logging |

---

## Related Services

- [ai-intelligence](ai-intelligence/) - Core AI
- [micro-intelligence](micro-intelligence/) - Circuit breaker
- [event-platform](event-platform/) - Event bus
