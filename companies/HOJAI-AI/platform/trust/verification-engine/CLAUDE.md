# CLAUDE.md — Verification Engine

> **Service:** Verification Engine
> **Part of:** HOJAI Trust Platform (trust/)
> **Port:** 4993
> **Package:** `@hojai/verification-engine`

---

## What This Service Is

The Verification Engine is a fact-checking service that validates statements against a knowledge graph. It provides confidence scores and verdicts for any claim by matching against stored facts.

**Key capabilities:**
- Add facts to an in-memory knowledge graph
- Verify single statements
- Batch verify multiple statements
- Query the knowledge graph
- Detect contradictions in evidence

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Main Express server, all routes, knowledge graph logic |
| `package.json` | Dependencies and scripts |
| `vitest.config.js` | Test configuration |
| `__tests__/unit/index.test.js` | Unit tests for core functions |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Verification Engine                 │
│                    src/index.js                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  POST /fact ──────► addFact() ──────► knowledgeGraph│
│                     (Map)                           │
│                                                      │
│  POST /verify ────► verifyFact() ───► Verdict     │
│                       │                              │
│                       ├── parseStatement()           │
│                       ├── lookup facts              │
│                       └── calculate confidence      │
│                                                      │
│  POST /verify/batch ──► map(verifyFact) ──► Summary│
│                                                      │
│  GET /graph ────────► query knowledgeGraph ──► Facts│
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## Core Functions

### `addFact(subject, predicate, object, source, reliability)`
Adds a fact to the knowledge graph as a subject-predicate-object triple.

```javascript
addFact('water', 'boils_at', '100_celsius', 'physics', 0.95);
```

### `verifyFact(statement)`
Verifies a statement and returns confidence score and verdict.

```javascript
const result = verifyFact('water is 100_celsius');
// result.verdict: 'verified' | 'disputed' | 'partial' | 'unverified'
// result.confidence: 0-1
```

### `parseStatement(statement)`
Extracts subject-predicate-object from natural language.

```javascript
parseStatement('coffee is hot');
// { subject: 'coffee', predicate: 'is', object: 'hot' }
```

### `isContradiction(obj1, obj2)`
Detects if two values are direct opposites.

```javascript
isContradiction('hot', 'cold'); // true
isContradiction('true', 'false'); // true
```

---

## API Routes

| Method | Path | Handler | Description |
|--------|------|---------|-------------|
| `GET` | `/health` | inline | Health check with fact count |
| `POST` | `/fact` | inline | Add fact to knowledge graph |
| `POST` | `/verify` | inline | Verify single statement |
| `POST` | `/verify/batch` | inline | Batch verify statements |
| `GET` | `/graph` | inline | Query knowledge graph |

---

## Common Tasks

### Adding a new fact
```bash
curl -X POST http://localhost:4993/fact \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "product_a",
    "predicate": "is_certified",
    "object": "true",
    "source": "certification_authority",
    "reliability": 0.95
  }'
```

### Verifying a claim
```bash
curl -X POST http://localhost:4993/verify \
  -H "Content-Type: application/json" \
  -d '{"statement": "product_a is certified"}'
```

### Checking for contradictions
1. Add supporting fact: `product_a is certified = true`
2. Add contradicting fact: `product_a is certified = false`
3. Verify statement — verdict becomes `disputed`

---

## Running the Service

```bash
# Install dependencies
npm install

# Development with watch
npm run dev

# Production
npm start

# Run tests
npm test
```

---

## Testing

Tests cover:
- Statement parsing (3 patterns: "X is Y", "X has Y", "X equals Y")
- Fact verification with supporting evidence
- Contradiction detection
- Confidence score calculation
- Batch verification
- Knowledge graph queries
- Error handling (missing fields, invalid input)

```bash
# Run all tests
npm test

# Watch mode during development
npx vitest
```

---

## Integration Points

This service is part of the Trust Platform. It may be called by:

| Caller | Purpose |
|--------|---------|
| SADA OS | Cross-reference verification during trust assessment |
| Agent Reputation | Verify claims made by agents |
| Dispute Resolution | Validate evidence in disputes |
| Copilot Suite | Fact-checking in AI responses |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4993 | HTTP server port |

---

## Limitations

1. **No persistence**: Facts live in memory, lost on restart
2. **Simple parser**: Limited to 3 statement patterns
3. **Basic contradictions**: Only checks for direct opposites
4. **No ML**: Rule-based matching only

For production, consider:
- Adding Redis or MongoDB for persistence
- Using NLP library for better parsing
- Training ML model for contradiction detection
- Connecting to TwinOS for entity resolution

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | HTTP server |
| cors | ^2.8.5 | Cross-origin requests |
| helmet | ^7.1.0 | Security headers |
| vitest | ^1.2.0 | Testing framework |

---

*Last updated: 2026-06-29*
