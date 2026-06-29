# Confidence Scorer - Service Documentation

**Package:** `@hojai/confidence-scorer`
**Port:** 4990
**Canonical Path:** `companies/HOJAI-AI/platform/trust/confidence-scorer/`
**Part of:** TrustOS / Platform Trust Layer

---

## Service Overview

The Confidence Scorer evaluates AI-generated answers by computing a weighted confidence score from three signal types: model confidence, retrieval quality, and reasoning coherence. It provides real-time confidence assessment to downstream systems that need to know whether an AI answer is trustworthy.

### Key Responsibilities

1. **Score AI Confidence** - Compute weighted confidence scores (0-1) for AI answers
2. **Classify Confidence Level** - Categorize as `high`, `medium`, or `low`
3. **Flag for Verification** - Mark low-confidence answers requiring human review
4. **Batch Processing** - Support bulk scoring for multiple answers

---

## Key Files and Their Purposes

| File | Purpose |
|------|---------|
| `src/index.js` | Express server with scoring logic and API endpoints |
| `package.json` | Dependencies and npm scripts |
| `vitest.config.js` | Vitest test configuration |
| `__tests__/unit/*.test.js` | Unit tests for scoring functions |
| `README.md` | User-facing API documentation |

### Source Code Structure

```javascript
// src/index.js - Main server
├── scoreConfidence({ modelSignals, retrievalSignals, reasoningSignals })
│   ├── Extracts: model.confidence, retrieval.score, reasoning.coherence
│   ├── Computes weighted overall: (model*0.4 + retrieval*0.35 + reasoning*0.25)
│   ├── Assigns level: high(>=0.8) | medium(>=0.5) | low(<0.5)
│   └── Returns: { model, retrieval, reasoning, overall, level }
│
├── POST /score
│   └── Single answer scoring endpoint
│
├── POST /score/batch
│   └── Batch answer scoring endpoint
│
└── GET /health
    └── Health check endpoint
```

---

## Architecture

```
                    Input Signals
                    ┌────────────┐
                    │modelSignals│───► confidence (0-1)
                    │   .40 weight            │
                    └────────────┘            │
                    ┌────────────┐            │  Weighted
                    │retrieval   │───► score   │    Sum
                    │   .35 weight            ├──────► overall (0-1)
                    └────────────┘            │
                    ┌────────────┐            │
                    │reasoning   │───► coher. │
                    │   .25 weight            │
                    └────────────┘            │
                                                 │
                    ┌───────────────────────────┘
                    ▼
            ┌───────────────┐
            │ Score Logic   │
            │               │
            │ overall >= 0.8 ──► level: "high"
            │ overall >= 0.5 ──► level: "medium"
            │ otherwise      ──► level: "low"
            └───────┬───────┘
                    │
                    ▼
            ┌───────────────┐
            │   Output      │
            ├───────────────┤
            │ scores:       │
            │   {model,     │
            │    retrieval, │
            │    reasoning, │
            │    overall,   │
            │    level}     │
            │               │
            │ requiresVerif:│
            │   level=="low"│
            └───────────────┘
```

---

## Common Tasks

### Scoring a Single Answer

```javascript
const scores = scoreConfidence({
  modelSignals: { confidence: 0.95 },
  retrievalSignals: { score: 0.88 },
  reasoningSignals: { coherence: 0.92 }
});
// Returns: { model: 0.95, retrieval: 0.88, reasoning: 0.92, overall: 0.9175, level: 'high' }
```

### Using Default Values

When signals are not provided, defaults to 0.5:

```javascript
scoreConfidence({});
// Returns: { model: 0.5, retrieval: 0.5, reasoning: 0.5, overall: 0.5, level: 'medium' }
```

### Starting the Service

```bash
npm install     # Install dependencies
npm start       # Production
npm run dev     # Development with auto-reload
npm test        # Run tests
```

---

## Integration Points

### Upstream (provides signals)

| Service | Signal Provided |
|---------|----------------|
| LLM Inference | `modelSignals.confidence` |
| RAG Retrieval | `retrievalSignals.score` |
| Chain-of-Thought | `reasoningSignals.coherence` |

### Downstream (consumes scores)

| Service | Usage |
|---------|-------|
| Verification Engine | Triggers human review when `requiresVerification: true` |
| Trust Network | Updates entity trust based on confidence history |
| MemoryOS | Stores confidence patterns for learning |

### API Proxy Routes

The service is accessible via RTMN Hub at:
- `POST /api/trust/confidence/score`
- `POST /api/trust/confidence/score/batch`

---

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | 4990 | Service port |

---

## Testing Strategy

Unit tests cover:

1. **Scoring Logic** - Verify weighted score calculation
2. **Level Classification** - Test boundary conditions (0.8, 0.5)
3. **Default Values** - Missing signals default to 0.5
4. **Batch Processing** - Multiple answers scored correctly
5. **API Responses** - Status codes and response formats

### Running Tests

```bash
npm test           # Run all tests (vitest run)
npx vitest         # Watch mode
npx vitest run --coverage  # With coverage report
```

---

## Relationship to Other Trust Services

```
┌─────────────────────────────────────────────────────────┐
│                    Trust Platform                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  confidence-scorer (4990)                               │
│  └── Scores AI answer confidence                        │
│       │                                                 │
│       └──► verification-engine                         │
│            └── Flags low-confidence answers             │
│                                                          │
│  agent-reputation (4820)                                 │
│  └── Trust scores for AI agents                         │
│                                                          │
│  trust-network (4252)                                    │
│  └── Social reputation graph                            │
│                                                          │
│  sada-os (4190)                                         │
│  └── Governance and risk assessment                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| express | ^4.18.2 | HTTP server |
| cors | ^2.8.5 | Cross-origin requests |
| helmet | ^7.1.0 | Security headers |
| vitest | ^1.2.0 | Testing framework |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-29 | Initial release with basic scoring |

---

## See Also

- [Trust Platform CLAUDE.md](../CLAUDE.md) - Parent platform docs
- [README.md](./README.md) - API reference and usage
- [SADA OS](../sada-os/) - Governance and verification
- [Verification Engine](../verification-engine/) - Confidence-based verification
