# Entity Resolution Service

**Port:** 4752  
**Package:** `@hojai/entity-resolution`

Enterprise-grade entity resolution service for deduplicating and linking entities across data sources.

## Features

- **String Similarity Algorithms**: Jaro-Winkler, Levenshtein, Jaccard
- **Phonetic Matching**: Soundex, Metaphone
- **Blocking Strategies**: Reduce comparison space efficiently
- **Probabilistic Scoring**: Confidence-based matching
- **Canonical ID Management**: Master records with aliases
- **Manual Review Queue**: Low-confidence matches for human review
- **Source Tracking**: Track provenance of each entity resolution

## Quick Start

```bash
npm install
npm run dev
```

## API Endpoints

### Resolution

```bash
# Resolve single entity
POST /api/resolve
{
  "entity": { "name": "John Smith", "email": "john@example.com" },
  "source": "crm",
  "options": { "threshold": 0.85 }
}

# Batch resolve
POST /api/resolve/batch
{
  "entities": [...],
  "source": "import"
}

# Link extracted entity to canonical
POST /api/resolve/link
{
  "extractedEntity": { "name": "J. Smith" },
  "canonicalId": "canonical-123",
  "confidence": 0.95
}
```

### Entities

```bash
# Get canonical entity
GET /api/entities/:id

# Get sources contributing to entity
GET /api/entities/:id/sources

# Get aliases
GET /api/entities/:id/aliases

# Merge entities
POST /api/entities/:id/merge
{
  "sourceIds": ["entity-1", "entity-2"]
}

# Split merged entity
POST /api/entities/:id/split
{
  "splitInto": ["entity-a", "entity-b"]
}
```

### Review Queue

```bash
# Get review queue
GET /api/review-queue?limit=50&offset=0&status=pending

# Resolve review item
POST /api/review-queue/:id/resolve
{
  "action": "merge",
  "canonicalId": "canonical-123",
  "confidence": 0.9
}
```

### Graph

```bash
# Get linked entities
GET /api/graph/:entityId/linked?types=person,organization
```

## Architecture

```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
┌────────▼────────┐
│   Routes Layer   │
│  (Express.js)    │
└────────┬────────┘
         │
┌────────▼────────┐
│ Resolution      │
│ Service         │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌───▼───┐
│Algo-   │ │Database│
│rithms  │ │Service │
└────┬───┘ └───┬───┘
     │         │
     └────┬────┘
          │
    ┌────▼────┐
    │PostgreSQL│
    └──────────┘
```

## Algorithms

### String Similarity

| Algorithm | Best For |
|-----------|----------|
| Jaro-Winkler | Names, Typos |
| Levenshtein | Edit Distance |
| Jaccard | Token Sets |

### Phonetic

| Algorithm | Best For |
|-----------|----------|
| Soundex | Historical Names |
| Metaphone | English Words |

## Configuration

```bash
PORT=4752
DATABASE_URL=postgresql://localhost:5432/entity_resolution
JWT_SECRET=your-secret
THRESHOLD=0.85
```

## Testing

```bash
npm test
npm run test:coverage
```

## License

MIT
