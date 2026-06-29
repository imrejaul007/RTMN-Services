# Source Tracker Service

**TrustOS Source Tracker** is a citation extraction and verification service that identifies, tracks, and validates sources referenced in AI-generated content. It helps ensure content authenticity by extracting citations from text and verifying them against a tracked source database.

**Port:** 4991
**Package:** `@hojai/source-tracker`
**Layer:** Platform / Trust

---

## Overview

The Source Tracker service addresses a critical challenge in AI-generated content: **citation verification**. When AI systems generate content with references to external sources (articles, papers, websites), this service:

1. **Extracts** citations from unstructured text using pattern matching
2. **Categorizes** citations by type (academic, numeric, URL, general)
3. **Tracks** sources with reliability scores in an in-memory store
4. **Verifies** citations against tracked sources to assess authenticity

---

## API Endpoints

### POST /extract

Extract citations from text content.

**Request:**
```json
{
  "text": "According to Smith et al. (2023) [1], machine learning has grown significantly. See https://example.com/research for details."
}
```

**Response:**
```json
{
  "citations": [
    {
      "text": "(Smith et al., 2023)",
      "type": "academic",
      "confidence": 0.8,
      "position": 26
    },
    {
      "text": "[1]",
      "type": "numeric",
      "confidence": 0.8,
      "position": 42
    },
    {
      "text": "https://example.com/research",
      "type": "url",
      "confidence": 0.8,
      "position": 90
    }
  ],
  "count": 3
}
```

### POST /track

Register a source for tracking with reliability metadata.

**Request:**
```json
{
  "source": "https://example.com/research",
  "type": "website",
  "reliability": 0.85,
  "metadata": {
    "domain": "example.com",
    "verified": true,
    "lastChecked": "2026-06-29"
  }
}
```

**Response:**
```json
{
  "success": true,
  "source": "https://example.com/research"
}
```

### POST /verify

Verify extracted citations against tracked sources.

**Request:**
```json
{
  "citations": [
    { "text": "[1]", "type": "numeric", "confidence": 0.8, "position": 42 },
    { "text": "https://example.com/research", "type": "url", "confidence": 0.8, "position": 90 }
  ]
}
```

**Response:**
```json
{
  "verified": [
    {
      "text": "[1]",
      "type": "numeric",
      "confidence": 0.8,
      "position": 42,
      "verified": false,
      "reliability": 0,
      "source": null
    },
    {
      "text": "https://example.com/research",
      "type": "url",
      "confidence": 0.8,
      "position": 90,
      "verified": true,
      "reliability": 0.85,
      "source": {
        "type": "website",
        "reliability": 0.85,
        "metadata": { "domain": "example.com", "verified": true },
        "trackedAt": "2026-06-29T10:00:00.000Z"
      }
    }
  ],
  "count": 2
}
```

### GET /sources

List tracked sources with optional filtering.

**Query Parameters:**
- `type` - Filter by source type (academic, numeric, url, general)
- `minReliability` - Minimum reliability score (0-1)

**Response:**
```json
{
  "sources": [
    {
      "source": "https://example.com/research",
      "type": "website",
      "reliability": 0.85,
      "metadata": { "domain": "example.com" },
      "trackedAt": "2026-06-29T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "source-tracker",
  "port": 4991,
  "sources": 1
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Source Tracker Service                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  /extract   │    │   /track    │    │    /verify      │  │
│  │  Endpoint   │    │   Endpoint  │    │    Endpoint     │  │
│  └──────┬──────┘    └──────┬──────┘    └────────┬────────┘  │
│         │                  │                   │           │
│         ▼                  ▼                   ▼           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Citation Engine                          │   │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────────┐  │   │
│  │  │  Pattern   │ │   Type     │ │   Reliability   │  │   │
│  │  │ Extraction │ │ Detection  │ │  Calculation    │  │   │
│  │  └────────────┘ └────────────┘ └─────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              In-Memory Source Store                   │   │
│  │              (Map<string, SourceData>)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Citation Pattern Detection

The service uses four regex patterns to extract citations:

| Pattern | Example | Type |
|---------|---------|------|
| `\[(\d+)\]` | `[1]`, `[42]` | numeric |
| `\(([^)]+,\s*\d{4})\)` | `(Smith, 2023)` | academic |
| `"([^"]+)"\s*\(` | `"Title" (` | academic |
| `https?:\/\/[^\s]+` | `https://...` | url |

### Reliability Scoring

Base score starts at 0.5 and is adjusted:

- **Academic sources**: +0.3 boost
- **Tracked sources**: Averaged with tracked reliability
- **Maximum score**: 1.0

---

## Installation

```bash
# Install dependencies
npm install

# Start the service
npm start

# Development mode (with auto-reload)
npm run dev

# Run tests
npm test
```

---

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `PORT` | 4991 | Service port |

---

## Integration Points

### With Hallucination Detector

The Source Tracker integrates with the hallucination-detector service to validate AI-generated claims:

```
Hallucination Detector → Source Tracker /verify → Citation validity score
```

### With Trust Network

Verified sources can feed into the trust-network for reputation scoring:

```
Source Tracker → Trust Network → Agent Trust Scores
```

### With Verification Engine

Combined with the verification-engine for comprehensive claim validation:

```
User Input → Verification Engine → Source Tracker (extract) → Source Tracker (verify)
```

---

## Testing

### Run Tests

```bash
npm test
```

### Manual Testing with curl

```bash
# Start service
npm start &

# Extract citations
curl -X POST http://localhost:4991/extract \
  -H "Content-Type: application/json" \
  -d '{"text": "According to Smith (2023) [1], AI is transforming industries. See https://example.com for more."}'

# Track a source
curl -X POST http://localhost:4991/track \
  -H "Content-Type: application/json" \
  -d '{"source": "https://example.com", "type": "website", "reliability": 0.9}'

# Verify citations
curl -X POST http://localhost:4991/verify \
  -H "Content-Type: application/json" \
  -d '{"citations": [{"text": "https://example.com", "type": "url", "confidence": 0.8}]}'

# Health check
curl http://localhost:4991/health
```

---

## Example Use Cases

### Content Verification Pipeline

```javascript
async function verifyContent(text, claims) {
  // 1. Extract citations from text
  const extractRes = await fetch('http://localhost:4991/extract', {
    method: 'POST',
    body: JSON.stringify({ text }),
    headers: { 'Content-Type': 'application/json' }
  });
  const { citations } = await extractRes.json();

  // 2. Verify citations against tracked sources
  const verifyRes = await fetch('http://localhost:4991/verify', {
    method: 'POST',
    body: JSON.stringify({ citations }),
    headers: { 'Content-Type': 'application/json' }
  });
  const { verified } = await verifyRes.json();

  // 3. Calculate overall content reliability
  const avgReliability = verified.reduce((sum, v) => sum + v.reliability, 0) / verified.length;

  return { citations: verified, overallReliability: avgReliability };
}
```

---

## Related Services

| Service | Port | Purpose |
|---------|------|---------|
| `hallucination-detector` | - | Detects potentially false AI claims |
| `verification-engine` | - | Comprehensive claim verification |
| `sada-os` | 4190 | Trust and governance |
| `agent-reputation` | 4820 | Agent trust scoring |
| `trust-network` | 4252 | Social reputation graph |

---

## License

Internal HOJAI AI service - All rights reserved
