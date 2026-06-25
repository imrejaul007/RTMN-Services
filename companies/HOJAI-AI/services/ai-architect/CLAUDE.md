# HOJAI AI Architect Service

> **Port:** 4390
> **Version:** 1.0.0
> **Status:** ✅ Built (2026-06-25)

The AI Architect is the interview engine that generates `company.blueprint.yaml` from founder ideas. It asks 12 structured questions and produces a complete company configuration.

---

## Quick Start

```bash
cd companies/HOJAI-AI/services/ai-architect
npm install
npm start        # Port 4390
npm test         # 31 tests, all passing
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/interview/start` | Start a new interview with a company idea |
| `POST` | `/api/v1/interview/:id/answer` | Submit an answer to a question |
| `GET` | `/api/v1/interview/:id` | Get interview state + all answers |
| `POST` | `/api/v1/interview/:id/complete` | Force-complete an interview |
| `GET` | `/api/v1/blueprint/:id` | Get blueprint by interview ID |
| `GET` | `/api/v1/blueprint/:id/summary` | Get blueprint summary |

## The 12 Questions

1. **Name** — Company/brand name
2. **Type** — Business type (marketplace, b2b, company, hotel, restaurant, logistics, crm, erp, pos)
3. **Industries** — Target industries (multi-select)
4. **Regions** — Operating regions (multi-select)
5. **Languages** — Supported languages (multi-select)
6. **Currency** — Primary currency
7. **Market Size** — Target market size
8. **Workforce** — AI workforce selection (multi-select)
9. **Compliance** — Compliance requirements (multi-select)
10. **Commerce** — E-commerce requirements
11. **Platforms** — Mobile/web platforms (multi-select)
12. **Federation** — Join Global Nexha?

## Usage Example

```bash
# Start an interview
curl -X POST http://localhost:4390/api/v1/interview/start \
  -H 'Content-Type: application/json' \
  -d '{"idea":"Build me a D2C fashion brand for Indian women"}'

# Submit answers
curl -X POST http://localhost:4390/api/v1/interview/{id}/answer \
  -H 'Content-Type: application/json' \
  -d '{"questionId": 1, "answer": "Maya Collective"}'

# Get the blueprint
curl http://localhost:4390/api/v1/blueprint/{id}
```

## Files

```
src/
├── index.js              # Main Express server
├── interview-store.js     # In-memory interview state
├── blueprint-generator.js # Blueprint generation logic
└── questions/
    └── index.js          # 12 question definitions
```

## Related Services

- **Blueprint Compiler** (port 4391) — Takes blueprint → generates project files
- **HOJAI Studio UI** — Web UI that uses this service
