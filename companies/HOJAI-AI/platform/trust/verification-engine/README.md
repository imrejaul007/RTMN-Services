# Verification Engine — TrustOS

> **Part of:** HOJAI Trust Platform
> **Port:** 4993
> **Package:** `@hojai/verification-engine`

Verification Engine is a fact-checking and knowledge graph service that validates statements against a structured knowledge base. It supports single statement verification, batch processing, and provides confidence scores with supporting/contradicting evidence.

---

## Overview

The Verification Engine maintains an in-memory knowledge graph where facts are stored as subject-predicate-object triples. When a statement is submitted for verification, the engine:

1. Parses the statement into components (subject, predicate, object)
2. Looks up matching facts in the knowledge graph
3. Calculates confidence based on supporting vs contradicting evidence
4. Returns a verdict: `verified`, `disputed`, `partial`, or `unverified`

---

## API Endpoints

### Health Check

```bash
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "service": "verification-engine",
  "port": 4993,
  "facts": 0
}
```

---

### Add Fact

Add a fact to the knowledge graph for future verification.

```bash
POST /fact
Content-Type: application/json

{
  "subject": "water",
  "predicate": "boils_at",
  "object": "100_celsius",
  "source": "physics_textbook",
  "reliability": 0.95
}
```

**Response:**
```json
{
  "success": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | string | Yes | The entity being described |
| `predicate` | string | Yes | Relationship type (e.g., "is", "has", "boils_at") |
| `object` | string | Yes | The value or related entity |
| `source` | string | No | Source of the fact (default: "unknown") |
| `reliability` | number | No | Reliability score 0-1 (default: 0.8) |

---

### Verify Statement

Verify a single statement against the knowledge graph.

```bash
POST /verify
Content-Type: application/json

{
  "statement": "water is 100_celsius",
  "source": "user_claim"
}
```

**Response:**
```json
{
  "statement": "water is 100_celsius",
  "verified": true,
  "confidence": 0.95,
  "supportingFacts": [
    {
      "object": "100_celsius",
      "source": "physics_textbook",
      "reliability": 0.95,
      "timestamp": "2026-06-29T12:00:00.000Z"
    }
  ],
  "contradictingFacts": [],
  "sources": ["physics_textbook"],
  "verdict": "verified"
}
```

**Verdict Values:**
| Value | Meaning | Confidence |
|-------|---------|------------|
| `verified` | Statement is supported by evidence | >= 0.8 |
| `disputed` | Contradicting evidence exists | >= 0.8 |
| `partial` | Mixed evidence, needs review | 0.5-0.8 |
| `unverified` | No evidence found | < 0.5 |

---

### Batch Verify

Verify multiple statements at once.

```bash
POST /verify/batch
Content-Type: application/json

{
  "statements": [
    "water is 100_celsius",
    "earth is flat",
    "light is fast"
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "statement": "water is 100_celsius",
      "verified": true,
      "confidence": 0.95,
      "verdict": "verified",
      "supportingFacts": [...],
      "contradictingFacts": [],
      "sources": [...]
    },
    {
      "statement": "earth is flat",
      "verified": false,
      "confidence": 0.1,
      "verdict": "unverified",
      "supportingFacts": [],
      "contradictingFacts": [...],
      "sources": []
    }
  ],
  "summary": {
    "verified": 1,
    "disputed": 0,
    "unverified": 2
  }
}
```

---

### Query Knowledge Graph

Query facts from the knowledge graph.

```bash
# Get all facts for a specific subject and predicate
GET /graph?subject=water&predicate=boils_at

# Get all facts in the graph
GET /graph
```

**Response (all facts):**
```json
{
  "graph": [
    {
      "subject": "water",
      "predicate": "boils_at",
      "facts": [
        {
          "object": "100_celsius",
          "source": "physics_textbook",
          "reliability": 0.95,
          "timestamp": "2026-06-29T12:00:00.000Z"
        }
      ]
    }
  ],
  "count": 1
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Verification Engine                      │
│                        Port 4993                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  Express    │───►│   Parser    │───►│  Verifier       │  │
│  │  Router     │    │  (statement │    │  (confidence    │  │
│  │  /verify    │    │   → SPO)    │    │   scoring)      │  │
│  └─────────────┘    └─────────────┘    └────────┬────────┘  │
│                                                  │           │
│  ┌─────────────┐    ┌─────────────┐    ┌────────▼────────┐  │
│  │  Express    │───►│   Graph     │◄───│  Contradiction  │  │
│  │  Router     │    │   Store     │    │  Detector       │  │
│  │  /fact      │    │  (Map)      │    │                 │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Express Server | `src/index.js` | HTTP API routing and middleware |
| Knowledge Graph | In-memory `Map` | Stores subject-predicate-object facts |
| Statement Parser | `parseStatement()` | Extracts SPO from natural language |
| Verifier | `verifyFact()` | Calculates confidence and verdict |
| Contradiction Detector | `isContradiction()` | Detects opposing facts |

---

## Statement Parsing

The engine supports three statement patterns:

| Pattern | Example | Extracted SPO |
|---------|---------|---------------|
| `X is Y` | "water is cold" | subject: "water", predicate: "is", object: "cold" |
| `X has Y` | "water has purity" | subject: "water", predicate: "has", object: "purity" |
| `X equals Y` | "speed equals velocity" | subject: "speed", predicate: "equals", object: "velocity" |

---

## Confidence Scoring

```
confidence = supportingFacts / (supportingFacts + contradictingFacts)
```

If no contradictions exist but facts are sparse, confidence is based on average source reliability.

| Verdict | Condition |
|---------|-----------|
| `verified` | confidence >= 0.8, no contradictions |
| `disputed` | confidence >= 0.8, has contradictions |
| `partial` | 0.5 <= confidence < 0.8 |
| `unverified` | confidence < 0.5 or no facts found |

---

## Integration Points

The Verification Engine is part of the Trust Platform and integrates with:

| Service | Integration |
|---------|-------------|
| **TrustOS Hub** | Part of Trust Platform cluster |
| **SADA OS** (port 4190) | May receive verification requests from SADA |
| **MemoryOS** (port 4703) | Could store verified facts for persistence |
| **TwinOS Hub** (port 4705) | Can verify facts about digital twins |

---

## Installation

```bash
cd companies/HOJAI-AI/platform/trust/verification-engine
npm install
```

## Running

```bash
# Development (with watch mode)
npm run dev

# Production
npm start

# Run tests
npm test
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npx vitest run --coverage

# Watch mode
npx vitest
```

### Example Test Scenarios

```bash
# Start the service
npm start &
sleep 2

# Add facts
curl -X POST http://localhost:4993/fact \
  -H "Content-Type: application/json" \
  -d '{"subject":"coffee","predicate":"contains","object":"caffeine","source":"health_site","reliability":0.9}'

# Verify statement
curl -X POST http://localhost:4993/verify \
  -H "Content-Type: application/json" \
  -d '{"statement":"coffee contains caffeine"}'

# Batch verify
curl -X POST http://localhost:4993/verify/batch \
  -H "Content-Type: application/json" \
  -d '{"statements":["coffee contains caffeine","coffee is blue"]}'
```

---

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | 4993 | HTTP server port |

---

## Limitations

- **In-memory storage**: Facts are not persisted across restarts
- **Simple parsing**: Limited to three statement patterns
- **Basic contradiction**: Only detects direct opposites (hot/cold, true/false, etc.)
- **No ML**: Uses rule-based matching, not machine learning

For production use, consider integrating with MemoryOS for persistence and a graph database (Neo4j) for complex relationship queries.

---

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| SADA OS | 4190 | Trust, governance, risk, verification |
| Agent Reputation | 4820 | Trust scores for AI agents |
| Evidence Collector | 4991 | Collects evidence for disputes |
| Source Tracker | 4992 | Tracks source reliability |

---

*Part of the HOJAI AI Trust Platform — verifying truth in the autonomous economy.*
