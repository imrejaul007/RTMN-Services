# Feature Flags Service

**Version:** 1.0.0  
**Port:** 4745  
**Status:** ✅ READY  
**Division:** HOJAI AI Foundation (Division 1)

---

## Overview

The Feature Flags service is a centralized system for **safe rollouts**, **kill switches**, **A/B testing**, and **dynamic configuration** across the RTMN ecosystem. Modeled after LaunchDarkly, Unleash, and Flagsmith.

Use cases:
- Gradual rollout of new AI models (e.g., `ai-model-v2-rollout` at 10%)
- Kill switches for risky features
- Per-tenant configuration (e.g., `use-new-checkout` for tenant `acme`)
- A/B testing different providers (`openai` vs `anthropic` vs `local`)
- Dynamic limits (e.g., `max-tokens` for premium plans)

---

## Architecture

```
services/feature-flags/
├── src/
│   └── index.js              # Flags, rules, evaluation engine, segments, audit
├── package.json
└── CLAUDE.md
```

In-memory storage via `Map` (TODO: persistence). Evaluation uses **consistent hashing** for percentage rollouts so the same `userId` always lands in the same bucket.

---

## Flag Types

| Type    | Example Use                            |
|---------|----------------------------------------|
| boolean | Feature on/off                         |
| string  | Provider selection ("openai" / "local")|
| number  | Limits (max tokens, rate limits)       |
| json    | Complex configuration objects          |

---

## Targeting Rules

Rules are evaluated **in order, first match wins**. Each rule has:

```javascript
{
  id: "uuid",
  name: "Premium tenants get higher limits",
  segmentKey: null,              // optional, links to a segment
  conditions: [
    { attribute: "plan", op: "in", values: ["premium", "enterprise"] }
  ],
  variation: 8192,                // value to return when matched
  // OR
  percentageRollout: 10           // 0-100, consistent hash on userId
}
```

### Supported Operators

| Operator  | Description                       | Example                                |
|-----------|-----------------------------------|----------------------------------------|
| `eq`      | Equals                            | `{ op: "eq", values: ["acme"] }`       |
| `neq`     | Not equals                        | `{ op: "neq", values: ["banned"] }`    |
| `in`      | Attribute is in list              | `{ op: "in", values: ["us", "ca"] }`   |
| `nin`     | Attribute not in list             | `{ op: "nin", values: ["blocked"] }`   |
| `gt`      | Greater than (numeric)            | `{ op: "gt", values: [18] }`           |
| `lt`      | Less than (numeric)               | `{ op: "lt", values: [100] }`          |
| `contains`| Substring or array membership     | `{ op: "contains", values: ["vip"] }`  |
| `regex`   | Regular expression match          | `{ op: "regex", values: ["^vip-"] }`   |

### Evaluation Order

1. If flag is **disabled** → return `defaultValue`
2. Walk rules in order
3. If a rule's conditions all match → check `percentageRollout`
   - If bucket is inside rollout → return rule's `variation` (or `defaultValue` if none)
   - If bucket is outside rollout → return `defaultValue` with `reason: "percentage_rollout_miss"`
4. If no rules matched → return `defaultValue`

---

## API Endpoints

### Flags CRUD

```
POST   /api/flags                       # Create flag
GET    /api/flags                       # List all flags (filter by ?tag=, ?owner=)
GET    /api/flags/:key                  # Get flag details
PUT    /api/flags/:key                  # Update flag
DELETE /api/flags/:key                  # Delete flag
POST   /api/flags/:key/toggle           # Quick on/off
POST   /api/flags/:key/rules            # Add a targeting rule
DELETE /api/flags/:key/rules/:ruleId    # Remove a rule
GET    /api/flags/:key/history          # Change history + evaluation count
```

### Evaluation

```
POST /api/flags/evaluate                # Evaluate single flag
POST /api/flags/bulk-evaluate           # Evaluate many flags at once
```

### Segments

```
GET  /api/segments                      # List segments
POST /api/segments                      # Create segment
```

### Audit & Health

```
GET /api/audit                          # Recent audit log (?resource=, ?action=, ?limit=)
GET /api/health                         # Service health check
```

---

## Quick Start

```bash
cd services/feature-flags
npm install
npm start

curl http://localhost:4745/api/health
curl http://localhost:4745/api/flags
```

### Example: Evaluate a flag

```bash
curl -X POST http://localhost:4745/api/flags/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "flagKey": "ai-model-v2-rollout",
    "context": {
      "userId": "user-123",
      "tenantId": "hojai",
      "attributes": { "tenantType": "internal", "region": "us" }
    }
  }'
```

Response:
```json
{
  "flagKey": "ai-model-v2-rollout",
  "value": true,
  "variation": true,
  "reason": "percentage_rollout_hit",
  "ruleId": "...",
  "type": "boolean",
  "evaluationCount": 1
}
```

### Example: Toggle a flag (kill switch)

```bash
curl -X POST http://localhost:4745/api/flags/ai-model-v2-rollout/toggle \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false }'
```

---

## Pre-Seeded Flags

| Key                       | Type    | Default | Rules                                              |
|---------------------------|---------|---------|----------------------------------------------------|
| `ai-model-v2-rollout`     | boolean | false   | 10% rollout for `tenantType=internal`              |
| `use-new-checkout`        | boolean | false   | ON for `tenantId=acme`                             |
| `max-tokens`              | number  | 4096    | 8192 for `plan in [enterprise, premium]`           |
| `recommendation-engine`   | string  | "openai"| EU → "local", beta → "anthropic"                   |

Also pre-seeded: `internal-tenants` segment.

---

## Security & Middleware

- `helmet` — Security headers
- `cors` — Cross-origin resource sharing
- `express.json()` — Body parsing (1mb limit)

---

## TODOs (Future Work)

- **Persistence** — replace in-memory `Map`s with Postgres/MongoDB
- **RBAC via CorpID (4702)** — restrict mutations to authorized owners
- **Multi-tenant scoping** — namespace flags by tenantId
- **Real-time updates via Event Bus (4751)** — publish `flag.changed` events for SDKs

---

*Last Updated: June 19, 2026*
