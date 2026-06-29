# Source Tracker - Service Guide

**Service:** `@hojai/source-tracker`
**Path:** `platform/trust/source-tracker/`
**Port:** 4991
**Layer:** Platform / Trust

This is the canonical implementation of the Source Tracker service for citation extraction and verification in AI-generated content.

---

## Service Overview

The Source Tracker addresses **citation verification** - a critical component of AI trust infrastructure. When AI systems generate content with external references, this service:

- Extracts citations from unstructured text using pattern matching
- Categorizes citations by type (academic, numeric, URL, general)
- Tracks sources with reliability scores
- Verifies citations against a managed source database

### Key Features

| Feature | Description |
|---------|-------------|
| Multi-pattern extraction | Detects academic, numeric, URL, and general citations |
| Reliability scoring | Calculates source reliability (0-1 scale) |
| Verification API | Validates citations against tracked sources |
| Type filtering | Query sources by type and reliability |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/index.js` | Main service entry point with Express app and all endpoints |
| `package.json` | Service metadata, dependencies, and scripts |
| `README.md` | User-facing documentation with API reference |
| `vitest.config.js` | Test configuration |
| `__tests__/unit/source-tracker.test.js` | Unit tests for core functionality |

---

## Architecture

```
Source Tracker Architecture
├── Express Server (port 4991)
│   ├── Middleware
│   │   ├── helmet() - Security headers
│   │   ├── cors() - Cross-origin requests
│   │   └── express.json() - Body parsing
│   │
│   ├── In-Memory Store
│   │   └── sources: Map<string, SourceData>
│   │
│   └── Endpoints
│       ├── POST /extract - Citation extraction
│       ├── POST /track - Source tracking
│       ├── POST /verify - Citation verification
│       ├── GET /sources - Source listing
│       └── GET /health - Health check
│
└── Core Functions
    ├── extractCitations(text) → Citation[]
    ├── getCitationType(text) → 'academic' | 'numeric' | 'url' | 'general'
    ├── rankSources(citations) → RankedCitation[]
    └── calculateReliability(citation) → number
```

---

## Core Functions

### `extractCitations(text)`

Extracts all citations from text using regex patterns.

```javascript
// Pattern 1: [1], [42] - Numeric citations
// Pattern 2: (Author, 2023) - Academic citations
// Pattern 3: "Title" ( - Academic citations
// Pattern 4: https://... - URL citations

const citations = extractCitations(text);
// Returns: [{ text, type, confidence, position }, ...]
```

### `getCitationType(text)`

Categorizes a citation by type.

```javascript
getCitationType('[1]')        // 'numeric'
getCitationType('(Smith, 2023)')  // 'academic'
getCitationType('https://...')    // 'url'
getCitationType('"Title" (')  // 'academic'
getCitationType('unknown')    // 'general'
```

### `calculateReliability(citation)`

Calculates reliability score (0-1) for a citation.

```javascript
// Base score: 0.5
// Academic sources: +0.3
// Tracked sources: averaged with tracked reliability
// Maximum: 1.0
```

---

## Common Tasks

### Adding a New Citation Pattern

Edit `src/index.js`, add pattern to the array:

```javascript
const patterns = [
  /\[(\d+)\]/g,
  /\(([^)]+,\s*\d{4})\)/g,
  /"([^"]+)"\s*\(/g,
  /https?:\/\/[^\s]+/g,
  // Add new pattern here:
  /doi:[^\s]+/g,  // DOI patterns like doi:10.1234/abc
];
```

### Integrating with Verification Pipeline

```javascript
// In your service, call source-tracker endpoints
const response = await fetch('http://localhost:4991/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    citations: extractedCitations
  })
});
const { verified } = await response.json();
```

### Querying Tracked Sources

```javascript
// Get all high-reliability academic sources
const response = await fetch(
  'http://localhost:4991/sources?type=academic&minReliability=0.8'
);
const { sources } = await response.json();
```

---

## Integration Points

### Upstream Consumers

| Service | Integration Method |
|---------|-------------------|
| Hallucination Detector | Calls `/verify` to check citation validity |
| Verification Engine | Uses `/extract` + `/verify` pipeline |
| Content Quality OS | Source reliability in quality scores |

### Data Flow

```
AI Content Generation
       │
       ▼
Source Tracker /extract
       │
       ▼
Citation Extraction Results
       │
       ├──────────────────────┐
       ▼                      ▼
Verification Engine    Hallucination Detector
       │                      │
       ▼                      ▼
Source Tracker /verify     Source Reliability
       │
       ▼
Verification Result
       │
       ▼
Content Trust Score
```

---

## Development

### Prerequisites

- Node.js 18+
- npm

### Running Locally

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Or start normally
npm start

# Run tests
npm test
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4991 | Service port |

---

## Testing

Tests cover core extraction and verification logic:

- Citation pattern extraction
- Citation type detection
- Source tracking operations
- Verification workflow
- Reliability scoring

Run tests with: `npm test`

---

## See Also

- [Trust Platform Overview](../CLAUDE.md) - Parent service directory
- [Hallucination Detector](../hallucination-detector/) - Sister trust service
- [Verification Engine](../verification-engine/) - Related verification service
- [SADA OS](../sada-os/) - Trust and governance platform
