# Hallucination Detector

**Service Name:** Hallucination Detector
**Port:** 4994
**Package:** `@hojai/hallucination-detector`
**Part of:** TrustOS / HOJAI AI Platform

A lightweight service that detects potential hallucinations in AI-generated text by analyzing consistency, source grounding, and overconfidence patterns.

## Overview

The Hallucination Detector is a rule-based service that identifies potential inaccuracies in AI outputs. It analyzes text for:

- **Unsupported specificity** - Specific claims (numbers, statistics) without citations
- **Internal inconsistencies** - Contradictory statements within the same text
- **Overconfidence patterns** - Absolute statements (100%, always, never) that may indicate fabrication
- **Ungrounded facts** - Specific claims without supporting evidence markers

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Hallucination Detector                     │
├─────────────────────────────────────────────────────────────┤
│  POST /detect          → Analyze single text               │
│  POST /detect/batch    → Analyze multiple texts            │
│  GET  /health          → Health check                      │
├─────────────────────────────────────────────────────────────┤
│                     Detection Modules                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Source       │  │ Consistency  │  │ Overconfidence   │  │
│  │ Grounding    │  │ Checker      │  │ Detector         │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Named Entity │  │ Ungrounded   │                        │
│  │ Extractor    │  │ Claims       │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

### POST /detect

Analyze a single text for potential hallucinations.

**Request:**
```json
{
  "text": "According to recent studies, 75 million people have adopted AI technology. The market will definitely grow by 200% next year.",
  "context": {
    "domain": "technology",
    "source": "ai-model"
  }
}
```

**Response:**
```json
{
  "text": "According to recent studies, 75 million people have adopted AI...",
  "issues": [
    {
      "type": "unsupported_specificity",
      "severity": "medium",
      "message": "Specific claims made without supporting sources"
    },
    {
      "type": "ungrounded_specific_fact",
      "severity": "medium",
      "message": "Specific claim without evidence: \"The market will definitely grow by 200%...\""
    }
  ],
  "hallucinationScore": 0.35,
  "risk": "medium",
  "requiresReview": false
}
```

### POST /detect/batch

Analyze multiple texts in a single request.

**Request:**
```json
{
  "texts": [
    "The company generated $1 billion in revenue last quarter.",
    "All experts agree that this is the best approach.",
    "Our solution works 100% of the time."
  ],
  "context": {
    "domain": "business"
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "text": "The company generated $1 billion in revenue last quarter...",
      "issues": [
        {
          "type": "ungrounded_specific_fact",
          "severity": "medium",
          "message": "Specific claim without evidence: \"The company generated $1 billion...\""
        }
      ],
      "hallucinationScore": 0.15,
      "risk": "low",
      "requiresReview": false
    },
    {
      "text": "All experts agree that this is the best approach...",
      "issues": [
        {
          "type": "overconfidence",
          "severity": "high",
          "message": "Multiple absolute statements detected"
        }
      ],
      "hallucinationScore": 0.3,
      "risk": "medium",
      "requiresReview": true
    },
    {
      "text": "Our solution works 100% of the time...",
      "issues": [
        {
          "type": "overconfidence",
          "severity": "high",
          "message": "Multiple absolute statements detected"
        }
      ],
      "hallucinationScore": 0.3,
      "risk": "medium",
      "requiresReview": true
    }
  ],
  "summary": {
    "avgScore": 0.25,
    "highRisk": 0,
    "mediumRisk": 2,
    "lowRisk": 1
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "hallucination-detector",
  "port": 4994
}
```

## Hallucination Score

The `hallucinationScore` is a value between 0 and 1:

| Score Range | Risk Level | Requires Review |
|-------------|------------|-----------------|
| 0.0 - 0.4   | Low        | No              |
| 0.4 - 0.7   | Medium     | No              |
| 0.7 - 1.0   | High       | Yes             |

**Score Calculation:**
- High severity issues: +0.3
- Medium severity issues: +0.15
- Low severity issues: +0.05
- Score is normalized by text length (shorter texts with issues get higher scores)

## Issue Types

| Type | Severity | Description |
|------|----------|-------------|
| `unsupported_specificity` | Medium | Specific numbers/statistics without citations or links |
| `internal_inconsistency` | High | Contradictory statements (e.g., "however" + "therefore") |
| `overconfidence` | High | Multiple absolute statements (100%, always, never, impossible) |
| `ungrounded_specific_fact` | Medium | Facts without evidence markers (because, study, research) |

## Installation

```bash
# Install dependencies
npm install

# Start the service
npm start

# Development mode with hot reload
npm run dev

# Run tests
npm test
```

## Usage

### Standalone

```bash
# Start the server
npm start

# Send a detection request
curl -X POST http://localhost:4994/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "Our product has been used by 500 million people worldwide."}'
```

### As a Module

```javascript
import { detectHallucinations } from '@hojai/hallucination-detector';

// Direct function call (if extracted)
const result = detectHallucinations("Text to analyze", { domain: "business" });
console.log(result.hallucinationScore);
```

## Integration Points

The Hallucination Detector integrates with:

- **TrustOS** - Part of the trust and verification layer
- **TwinOS** - Can be called from digital twin services for content verification
- **AgentOS** - AI agents can use it to self-validate outputs
- **Verification Engine** - Complements source verification with hallucination detection

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | 4994 | Service port |
| `NODE_ENV` | development | Environment (development/production) |

## License

Part of HOJAI AI Platform - Internal use