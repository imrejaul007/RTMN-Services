# Reflection Engine

**Port:** 4787  
**Status:** ✅ Built  
**Purpose:** Self-reflection and quality scoring across dimensions (clarity, accuracy, completeness, tone, relevance)

---

## Overview

Reflection Engine evaluates content quality through multi-dimensional analysis:
- 5 quality dimensions
- Weighted scoring
- Text comparison/ranking
- Improvement feedback

---

## Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **accuracy** | 1.2 | Factual correctness |
| **relevance** | 1.1 | Context relevance |
| **clarity** | 1.0 | Understandability |
| **completeness** | 1.0 | Thoroughness |
| **tone** | 0.8 | Appropriate tone |

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)
- PersistentMap (`@rtmn/shared/lib/persistent-map`)

---

## API Endpoints

### Reflection

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reflect` | Score text quality |
| POST | `/api/reflect/compare` | Compare multiple texts |
| GET | `/api/reflect` | List reflections |

### Reference Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reflect/dimensions` | List dimensions |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reflect/audit` | View audit log |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/api/health` | Detailed health |
| GET | `/ready` | Readiness |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/reflection-engine
npm install
npm start
```

---

## Example Usage

### Score Text
```javascript
const result = await fetch('http://localhost:4787/api/reflect', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    text: 'Based on our verified data, the customer profile shows complete accuracy with all relevant information properly documented in a clear and professional manner.',
    dimensions: ['accuracy', 'relevance', 'clarity']
  })
});
// Returns: { scores: {...}, overall: 0.87, feedback: [...] }
```

### Compare Texts
```javascript
const comparison = await fetch('http://localhost:4787/api/reflect/compare', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer <token>'
  },
  body: JSON.stringify({
    items: [
      { id: 'a', text: 'Quick response.' },
      { id: 'b', text: 'We have received your request and will process it within 24 hours.' },
      { id: 'c', text: 'Thank you for contacting us. Your inquiry has been noted and our team is working on it.' }
    ]
  })
});
// Returns: { ranked: [...], winner: 1, count: 3 }
```

---

## Response Format

```json
{
  "id": "uuid",
  "scores": {
    "accuracy": 0.85,
    "relevance": 0.92,
    "clarity": 0.78
  },
  "overall": 0.85,
  "feedback": [
    "relevance: strong (0.92)",
    "clarity: low score (0.78) — consider adding more clear, simple"
  ]
}
```

---

## Integration

| Service | Integration |
|---------|-------------|
| `Genie` | Response quality scoring |
| `agent-os` | Agent output evaluation |
| `ai-intelligence` | Quality analysis |
| `planning-engine` | Plan quality |

---

## Related Services

- [ai-intelligence](ai-intelligence/) - AI analysis
- [agent-os](agent-os/) - Agent evaluation
- [proactive-engine](proactive-engine/) - Proactive suggestions
