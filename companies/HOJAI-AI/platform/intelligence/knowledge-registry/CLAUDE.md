# Knowledge Registry

**Port:** 4900  
**Status:** ✅ Built  
**Purpose:** Asset CRUD, versioning, taxonomy, and search for the RTMN knowledge ecosystem

---

## Overview

Knowledge Registry is the central knowledge management system:
- Asset CRUD operations
- Version history tracking
- Taxonomy management (hierarchical categories)
- Full-text search
- Dependency tracking
- Usage analytics

---

## Tech Stack

- Node.js
- Express.js
- In-memory JSON storage

---

## Core Concepts

### Asset
A piece of knowledge with metadata:
```json
{
  "id": "uuid",
  "name": "string",
  "type": "document|article|api|guide|policy",
  "content": "string",
  "tags": ["array"],
  "taxonomy": "category",
  "source": "string",
  "confidence": 0.0-1.0,
  "version": 1,
  "metadata": {},
  "createdAt": "ISO date",
  "updatedAt": "ISO date"
}
```

### Taxonomy
Hierarchical category structure:
```json
{
  "id": "uuid",
  "name": "string",
  "parentId": "uuid or null",
  "description": "string"
}
```

### Dependency
Relationships between assets:
```json
{
  "id": "uuid",
  "fromId": "uuid",
  "toId": "uuid",
  "type": "uses|extends|deprecated_by"
}
```

---

## API Endpoints

### Assets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List assets (filter: type, tags, taxonomy, q) |
| GET | `/api/assets/:id` | Get asset |
| POST | `/api/assets` | Create asset |
| PUT | `/api/assets/:id` | Update asset |
| DELETE | `/api/assets/:id` | Delete asset |

### Versioning

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets/:id/versions` | List versions |
| GET | `/api/assets/:id/versions/:version` | Get specific version |
| POST | `/api/assets/:id/versions` | Create new version |

### Taxonomy

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/taxonomy` | List categories |
| POST | `/api/taxonomy` | Create category |
| GET | `/api/taxonomy/:id/children` | Get subcategories |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search` | Search assets (q, type, tags, taxonomy) |

### Dependencies

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets/:id/dependencies` | Get what this asset uses |
| GET | `/api/assets/:id/dependents` | Get what uses this asset |
| POST | `/api/assets/:id/dependencies` | Add dependency |
| DELETE | `/api/assets/:id/dependencies/:depId` | Remove dependency |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats` | Registry statistics |

---

## Quick Start

```bash
cd companies/HOJAI-AI/platform/intelligence/knowledge-registry
npm install
npm start
```

---

## Example Usage

### Create Asset
```javascript
await fetch('http://localhost:4900/api/assets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'API Documentation',
    type: 'api',
    content: 'Complete API reference for v2.0',
    tags: ['api', 'documentation', 'v2'],
    taxonomy: 'technical',
    source: 'api-team',
    confidence: 0.95
  })
});
```

### Search
```javascript
const results = await fetch('http://localhost:4900/api/search?q=authentication&type=api&tags=security');
```

### Create Taxonomy
```javascript
await fetch('http://localhost:4900/api/taxonomy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Technical Documentation',
    parentId: null,
    description: 'All technical docs'
  })
});
```

### Track Dependencies
```javascript
await fetch('http://localhost:4900/api/assets/{id}/dependencies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    toId: 'related-asset-id',
    type: 'uses'
  })
});
```

---

## Integration with Other Services

| Service | Integration |
|---------|-------------|
| `rag-platform` | Knowledge retrieval |
| `knowledge-extraction` | Content ingestion |
| `knowledge-marketplace` | Knowledge sharing |
| `ai-intelligence` | Knowledge queries |
| `Genie` | User knowledge |

---

## Health Endpoints

- `GET /health` - Service health
- `GET /ready` - Readiness check

---

## Related Services

- [rag-platform](rag-platform/) - RAG retrieval
- [knowledge-extraction](knowledge-extraction/) - Content extraction
- [knowledge-marketplace](knowledge-marketplace/) - Knowledge sharing
- [ai-intelligence](ai-intelligence/) - AI queries
