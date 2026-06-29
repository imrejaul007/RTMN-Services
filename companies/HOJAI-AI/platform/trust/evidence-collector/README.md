# Evidence Collector Service

**Version:** 1.0.0 | **Port:** 4992 | **Package:** `@hojai/evidence-collector`

---

## Overview

Evidence Collector is a TrustOS service that provides evidence retrieval and ranking capabilities for claim verification. It allows AI agents to collect, store, and retrieve relevant evidence when processing claims or making trust decisions.

### Position in RTMN Trust Architecture

```
CorpID (4702)
    │
SADA OS (4190) — Trust, Governance & Risk
    │
TrustOS Services
├── Evidence Collector (4992) ← You are here
├── Confidence Scorer (4991)
├── Hallucination Detector (4993)
├── Source Tracker (4994)
├── Risk Scorer (4995)
└── Verification Engine (4996)
```

---

## Features

- **Evidence Collection**: Store evidence items with metadata (source, date, citations, type)
- **Keyword-Based Retrieval**: Find relevant evidence for a given claim using keyword overlap
- **Quality Ranking**: Score and rank evidence by source quality, recency, and citations
- **Filtering**: Filter evidence by source type and support/oppose classification
- **Relevance Scoring**: Calculate relevance scores based on keyword matching

---

## API Reference

### POST /collect

Add a new evidence item to the store.

**Request:**
```json
{
  "content": "The company has 15 years of industry experience",
  "source": "LinkedIn Profile",
  "sourceType": "verified",
  "date": "2024-01-15",
  "citations": 12,
  "supporting": true
}
```

**Response:**
```json
{
  "success": true,
  "evidence": {
    "id": "evidence-1719564800000",
    "content": "The company has 15 years of industry experience",
    "source": "LinkedIn Profile",
    "sourceType": "verified",
    "date": "2024-01-15",
    "citations": 12,
    "supporting": true,
    "addedAt": "2024-06-28T10:30:00.000Z"
  }
}
```

**Source Types:** `academic`, `government`, `verified`, `general`, `social`, `news`

### POST /retrieve

Retrieve and rank evidence relevant to a claim.

**Request:**
```json
{
  "claim": "Company has extensive industry experience",
  "limit": 5,
  "minRelevance": 0.3
}
```

**Response:**
```json
{
  "claim": "Company has extensive industry experience",
  "evidence": [
    {
      "id": "evidence-1719564800000",
      "content": "The company has 15 years of industry experience",
      "source": "LinkedIn Profile",
      "sourceType": "verified",
      "date": "2024-01-15",
      "citations": 12,
      "supporting": true,
      "addedAt": "2024-06-28T10:30:00.000Z",
      "relevance": 0.75,
      "quality": 0.7,
      "supporting": true
    }
  ],
  "count": 1
}
```

### GET /evidence

List all evidence with optional filters.

**Query Parameters:**
- `sourceType` — Filter by source type (academic, government, verified, general)
- `supporting` — Filter by support type (true/false)
- `limit` — Limit number of results

**Examples:**
```bash
# Get all evidence
curl http://localhost:4992/evidence

# Get academic sources only
curl "http://localhost:4992/evidence?sourceType=academic"

# Get supporting evidence only
curl "http://localhost:4992/evidence?supporting=true&limit=10"
```

**Response:**
```json
{
  "evidence": [...],
  "count": 42
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "evidence-collector",
  "port": 4992,
  "evidence": 42
}
```

---

## Architecture

### Evidence Quality Scoring

Evidence is scored based on three factors:

| Factor | Boost | Description |
|--------|-------|-------------|
| **Source Type** | +0.20 | Academic sources get highest boost |
| | +0.15 | Government sources |
| | +0.10 | Verified sources |
| **Recency** | +0.10 | Less than 1 year old |
| | +0.05 | Less than 5 years old |
| **Citations** | +0.10 | More than 10 citations |
| | +0.05 | More than 5 citations |

**Quality Formula:**
```
quality = 0.5 (base)
        + sourceType boost
        + recency boost
        + citation boost
        (capped at 1.0)
```

### Relevance Calculation

Relevance is calculated using keyword overlap:

```
relevance = matching_keywords / claim_word_count
```

---

## Installation

```bash
cd companies/HOJAI-AI/platform/trust/evidence-collector
npm install
```

## Usage

### Development
```bash
npm run dev
# Starts on port 4992 with watch mode
```

### Production
```bash
npm start
# Starts on port 4992
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4992 | HTTP server port |

---

## Testing

```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch
```

### Test Coverage

The unit tests cover:
- Evidence collection with validation
- Evidence retrieval with relevance scoring
- Quality ranking algorithm
- Filtering by source type and support type
- Health endpoint

---

## Integration Points

### TrustOS Integration
Evidence Collector is part of the TrustOS suite and works with:
- **SADA OS (4190)**: Central trust platform
- **Confidence Scorer (4991)**: Calculates claim confidence
- **Verification Engine (4996)**: Verifies claims against evidence

### RTMN Hub Integration
Access via RTMN Hub at `/api/trust/evidence-collector/*`:

```bash
# Via Hub proxy
curl http://localhost:4399/api/trust/evidence-collector/health
curl http://localhost:4399/api/trust/evidence-collector/evidence
```

---

## Example Use Case

A trust verification flow:

```javascript
// 1. Collect evidence for a company
await fetch('http://localhost:4992/collect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: 'Company founded in 2010 with 500+ employees',
    source: 'Company Website',
    sourceType: 'verified',
    supporting: true
  })
});

// 2. Retrieve evidence for a claim
const result = await fetch('http://localhost:4992/retrieve', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    claim: 'This company has been operating for over 10 years',
    limit: 5
  })
});

// 3. Use ranked evidence for trust decision
const { evidence } = await result.json();
const totalQuality = evidence.reduce((sum, e) => sum + e.quality, 0);
const avgQuality = totalQuality / evidence.length;
```

---

## License

Part of HOJAI AI TrustOS Platform
