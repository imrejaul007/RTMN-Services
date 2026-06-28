# Reasoning Engine

**Port:** 4933  
**Status:** ✅ Built  
**Purpose:** Chain-of-thought reasoning - decompose queries into reasoning steps with confidence scoring

---

## Overview

Reasoning Engine provides multi-strategy reasoning:
- Deductive reasoning (general → specific)
- Inductive reasoning (specific → general)
- Abductive reasoning (best explanation)
- Step-by-step decomposition
- Confidence scoring

---

## Strategies

| Strategy | Description |
|----------|-------------|
| **deductive** | General rules → specific conclusions |
| **inductive** | Specific examples → general rules |
| **abductive** | Observations → best explanation |

---

## Tech Stack

- Node.js
- Express.js
- JWT Authentication (`@rtmn/shared/auth`)

---

## API Endpoints

### Reasoning

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reason` | Run reasoning |
| GET | `/api/reason` | List reasoning runs |
| GET | `/api/reason/:id` | Get reasoning run |
| DELETE | `/api/reason/:id` | Delete run |

### Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reason/templates` | List strategies |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reason/audit` | View audit log |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health |
| GET | `/api/health` | Detailed health |
| GET | `/ready` | Readiness |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/reasoning-engine
npm install
npm start
```

---

## Example Usage

### Run Reasoning
```javascript
const result = await fetch('http://localhost:4933/api/reason', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'x-internal-token': '<INTERNAL_TOKEN>'
  },
  body: JSON.stringify({
    query: 'If all merchants want lower fees and customers want lower prices, how should we design the pricing model?',
    strategy: 'deductive',
    context: { merchantCount: 1000, avgTransaction: 500 }
  })
});

// Returns:
// {
//   id: "uuid",
//   query: "...",
//   strategy: "deductive",
//   steps: [
//     { id: "step-1", statement: "If all merchants want lower fees...", confidence: 0.85 },
//     { id: "step-2", statement: "Customers want lower prices...", confidence: 0.82 }
//   ],
//   conclusion: "...",
//   confidence: 0.84
// }
```

---

## Response Format

```json
{
  "id": "uuid",
  "query": "original query",
  "strategy": "deductive",
  "steps": [
    {
      "id": "step-1",
      "index": 1,
      "statement": "reasoning statement",
      "rationale": "deductive step",
      "confidence": 0.87
    }
  ],
  "conclusion": "final conclusion",
  "confidence": 0.85,
  "createdAt": "ISO date"
}
```

---

## Integration

| Service | Integration |
|---------|-------------|
| `planning-engine` | Goal decomposition |
| `Genie` | Reasoning capabilities |
| `agent-os` | Agent reasoning |
| `ai-intelligence` | AI decision support |

---

## Related Services

- [planning-engine](planning-engine/) - Task planning
- [reflection-engine](reflection-engine/) - Quality scoring
- [proactive-engine](proactive-engine/) - Proactive suggestions
