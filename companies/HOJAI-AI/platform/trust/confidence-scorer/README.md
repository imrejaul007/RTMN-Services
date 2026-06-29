# Confidence Scorer Service

**Package:** `@hojai/confidence-scorer`
**Port:** 4990
**Version:** 1.0.0

---

## Overview

The Confidence Scorer service evaluates AI-generated answers by analyzing three signal types: model confidence, retrieval quality, and reasoning coherence. It produces an overall confidence score (0-1) with three weighted components and a confidence level classification.

This service is part of the **TrustOS** infrastructure within HOJAI AI's platform trust layer.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Confidence Scorer (4990)                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   Input: Answer + Signal Analysis                        │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│   │ Model Signal │ │Retrieval Sig. │ │Reasoning Sig. │  │
│   │  (weight 40%)│ │ (weight 35%) │ │ (weight 25%)  │  │
│   └──────┬───────┘ └──────┬───────┘ └──────┬───────┘  │
│          │                │                │           │
│          └────────────────┼────────────────┘           │
│                           ▼                            │
│                  ┌─────────────────┐                   │
│                  │  Weighted Sum   │                   │
│                  │  + Level Logic  │                   │
│                  └────────┬────────┘                   │
│                           ▼                            │
│   Output: Confidence Score + Level + Verification Flag  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Confidence Scoring Algorithm

The overall confidence score is computed as a weighted average:

```
overall = (model * 0.40) + (retrieval * 0.35) + (reasoning * 0.25)
```

**Confidence Levels:**

| Level | Score Range | Action |
|-------|-------------|--------|
| `high` | >= 0.8 | Answer is reliable |
| `medium` | 0.5 - 0.79 | Use with caution |
| `low` | < 0.5 | Requires verification |

---

## API Endpoints

### POST /score

Score a single answer's confidence.

**Request:**
```json
{
  "answer": "The capital of France is Paris.",
  "modelSignals": {
    "confidence": 0.95
  },
  "retrievalSignals": {
    "score": 0.92
  },
  "reasoningSignals": {
    "coherence": 0.88
  },
  "context": "Geography quiz"
}
```

**Response:**
```json
{
  "answer": "The capital of France is Paris.",
  "scores": {
    "model": 0.95,
    "retrieval": 0.92,
    "reasoning": 0.88,
    "overall": 0.923,
    "level": "high"
  },
  "requiresVerification": false,
  "timestamp": "2026-06-29T10:30:00.000Z"
}
```

**Minimal Request (uses defaults):**
```bash
curl -X POST http://localhost:4990/score \
  -H "Content-Type: application/json" \
  -d '{"answer": "2 + 2 = 4"}'
```

---

### POST /score/batch

Score multiple answers in a single request.

**Request:**
```json
{
  "answers": [
    {
      "answer": "The speed of light is 299,792 km/s",
      "modelSignals": { "confidence": 0.98 },
      "retrievalSignals": { "score": 0.97 },
      "reasoningSignals": { "coherence": 0.95 }
    },
    {
      "answer": "Quantum computing will replace classical computers",
      "modelSignals": { "confidence": 0.45 },
      "retrievalSignals": { "score": 0.40 },
      "reasoningSignals": { "coherence": 0.50 }
    }
  ]
}
```

**Response:**
```json
{
  "results": [
    {
      "answer": "The speed of light is 299,792 km/s",
      "scores": { "model": 0.98, "retrieval": 0.97, "reasoning": 0.95, "overall": 0.969, "level": "high" },
      "requiresVerification": false
    },
    {
      "answer": "Quantum computing will replace classical computers",
      "scores": { "model": 0.45, "retrieval": 0.40, "reasoning": 0.50, "overall": 0.448, "level": "low" },
      "requiresVerification": true
    }
  ],
  "count": 2
}
```

---

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "confidence-scorer",
  "port": 4990
}
```

---

## Installation

```bash
# Navigate to service directory
cd companies/HOJAI-AI/platform/trust/confidence-scorer

# Install dependencies
npm install

# Start in development mode (with auto-reload)
npm run dev

# Or start in production
npm start
```

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npx vitest

# Run with coverage
npx vitest run --coverage
```

---

## Signal Weights Reference

| Signal Type | Source | Weight | Range |
|-------------|--------|--------|-------|
| `modelSignals.confidence` | LLM output logits | 40% | 0.0 - 1.0 |
| `retrievalSignals.score` | RAG retrieval quality | 35% | 0.0 - 1.0 |
| `reasoningSignals.coherence` | Chain-of-thought analysis | 25% | 0.0 - 1.0 |

---

## Integration Points

The Confidence Scorer integrates with:

- **SADA OS** (port 4190) - Trust and verification infrastructure
- **Trust Network** (port 4252) - Cross-entity trust scoring
- **Verification Engine** - Triggered when `requiresVerification: true`
- **MemoryOS** - Stores confidence history for learning

---

## Error Handling

| Status Code | Condition |
|-------------|-----------|
| 200 | Success |
| 400 | Missing required fields |

**Error Response:**
```json
{
  "error": "Answer is required"
}
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4990 | Service port |

---

## See Also

- [Trust Platform Overview](../CLAUDE.md) - Parent platform documentation
- [SADA OS](../sada-os/README.md) - Trust, Governance & Risk platform
- [Verification Engine](../verification-engine/) - Confidence-based verification
