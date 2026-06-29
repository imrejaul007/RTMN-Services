# CLAUDE.md — Evidence Collector Service

> **Service:** Evidence Collector (TrustOS)
> **Port:** 4992
> **Package:** `@hojai/evidence-collector`
> **Status:** v1.0.0 — Production ready

---

## What This Service Is

Evidence Collector is a lightweight in-memory evidence storage and retrieval service for claim verification. It collects evidence items, calculates relevance scores against claims using keyword matching, and ranks evidence by quality.

### One-Line Definition

> Given a claim, find and rank relevant evidence by relevance and quality.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Main service entry point — Express app with 4 endpoints |
| `package.json` | Dependencies and npm scripts |
| `vitest.config.js` | Test configuration |
| `__tests__/unit/*.test.js` | Unit tests |

---

## Source Code Structure

```
evidence-collector/
├── src/
│   └── index.js          # Main service (138 lines)
├── __tests__/
│   └── unit/
│       └── *.test.js     # Unit tests
├── README.md              # User documentation
├── CLAUDE.md              # This file
├── vitest.config.js       # Test config
└── package.json
```

---

## Architecture

### Data Flow

```
Client Request
     │
     ▼
┌────────────────────────────────────┐
│        Express Server (4992)       │
├────────────────────────────────────┤
│ POST /collect ──────────────────► In-memory evidence[]
│ POST /retrieve ──► [retrieveEvidence] ──► [rankEvidence]
│ GET /evidence ────► filtered results
│ GET /health ────► status check
└────────────────────────────────────┘
```

### Core Functions

#### `retrieveEvidence(claim, options)`
- **Input:** Claim string, optional `{ limit, minRelevance }`
- **Process:** Keyword overlap scoring between claim and evidence
- **Output:** Array of evidence with relevance scores
- **Location:** `src/index.js`, lines 16-34

#### `rankEvidence(evidences)`
- **Input:** Array of evidence items
- **Process:** Apply quality scoring via `calculateQuality()`
- **Output:** Evidence sorted by quality (descending)
- **Location:** `src/index.js`, lines 37-43

#### `calculateQuality(evidence)`
- **Input:** Single evidence item
- **Process:** Apply boosts for source type, recency, citations
- **Output:** Quality score (0-1)
- **Location:** `src/index.js`, lines 45-66

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/collect` | Add evidence to store |
| POST | `/retrieve` | Find evidence for a claim |
| GET | `/evidence` | List all evidence (filterable) |
| GET | `/health` | Health check |

### Request/Response Examples

**POST /collect**
```javascript
// Request
{ content, source?, sourceType?, date?, citations?, supporting? }

// Response
{ success: true, evidence: { id, content, source, sourceType, date, citations, supporting, addedAt } }
```

**POST /retrieve**
```javascript
// Request
{ claim, limit?, minRelevance? }

// Response
{ claim, evidence: [{ ...evidence, relevance, quality, supporting }], count }
```

---

## Quality Scoring Algorithm

```javascript
function calculateQuality(evidence) {
  let score = 0.5;                    // Base score

  // Source type boost
  if (evidence.sourceType === 'academic')   score += 0.20;
  if (evidence.sourceType === 'government')  score += 0.15;
  if (evidence.sourceType === 'verified')    score += 0.10;

  // Recency boost (years since date)
  if (years < 1)  score += 0.10;
  else if (years < 5) score += 0.05;

  // Citation boost
  if (citations > 10) score += 0.10;
  else if (citations > 5) score += 0.05;

  return Math.min(1, score);           // Cap at 1.0
}
```

### Quality Score Ranges

| Source Type | Boost | Example Quality |
|-------------|-------|-----------------|
| academic + recent + high citations | +0.40 | 0.90 |
| government + recent | +0.25 | 0.75 |
| verified + 2yr old | +0.15 | 0.65 |
| general + 6yr old | +0.00 | 0.50 |

---

## Relevance Scoring Algorithm

```javascript
function retrieveEvidence(claim, options) {
  const { limit = 10, minRelevance = 0.3 } = options;
  const claimWords = claim.toLowerCase().split(/\s+/);

  return evidence
    .map(e => ({
      ...e,
      relevance: keywordOverlap(claimWords, e.content) / claimWords.length
    }))
    .filter(e => e.relevance >= minRelevance)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit);
}
```

---

## Common Development Tasks

### Adding a New Source Type

Edit `src/index.js`, `calculateQuality()` function:

```javascript
// Example: Add news source boost
if (evidence.sourceType === 'news') score += 0.05;
```

### Adding a New Endpoint

Add to `src/index.js`:

```javascript
app.post('/custom-endpoint', (req, res) => {
  // Your logic here
  res.json({ /* response */ });
});
```

### Persisting Evidence (Future)

Current implementation uses in-memory storage. To persist:

1. Add MongoDB or PostgreSQL dependency
2. Replace `evidence.push(item)` with database insert
3. Replace `evidence.filter()` with database queries

---

## Integration Points

### TrustOS Suite (this platform)

| Service | Port | Integration |
|---------|------|-------------|
| SADA OS | 4190 | Central trust platform — calls Evidence Collector |
| Confidence Scorer | 4991 | Uses evidence quality for confidence calculation |
| Hallucination Detector | 4993 | Cross-references evidence for fact-checking |
| Source Tracker | 4994 | Tracks source credibility over time |
| Risk Scorer | 4995 | Uses evidence for risk assessment |
| Verification Engine | 4996 | Verifies claims against collected evidence |

### RTMN Hub Routes

```
/api/trust/evidence-collector/* → proxied to :4992
```

### External Consumers

- **SUTAR OS**: Agents retrieve evidence before making decisions
- **TwinOS**: Evidence linked to entity digital twins
- **AgentOS**: Agents store and query evidence autonomously

---

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4992 | HTTP server port |

### Dependencies

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "helmet": "^7.1.0"
}
```

### Dev Dependencies

```json
{
  "vitest": "^1.2.0"
}
```

---

## Testing

### Run Tests

```bash
npm test           # Run once
npm run test:watch # Watch mode
```

### Writing Tests

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index.js';
import request from 'supertest';

describe('Evidence Collector', () => {
  // Reset state before each test
  beforeEach(() => {
    evidence.length = 0; // Clear in-memory store
  });

  it('should collect evidence', async () => {
    const res = await request(app)
      .post('/collect')
      .send({ content: 'Test evidence' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

---

## Gotchas

1. **In-memory storage**: Evidence is lost on restart. Use database for production.
2. **Keyword matching**: Simple word overlap — not semantic. Consider embedding-based retrieval for production.
3. **No authentication**: No auth middleware. Add for production use.
4. **No pagination**: `/evidence` returns all results (limited by `limit` param). Add cursor-based pagination for large datasets.

---

## Future Improvements

- [ ] Add MongoDB persistence
- [ ] Add semantic search using embeddings
- [ ] Add authentication middleware
- [ ] Add evidence expiration/TTL
- [ ] Add source type validation
- [ ] Add pagination to `/evidence` endpoint
- [ ] Add evidence linking (evidence supporting/refuting other evidence)

---

*Last updated: 2026-06-29*
