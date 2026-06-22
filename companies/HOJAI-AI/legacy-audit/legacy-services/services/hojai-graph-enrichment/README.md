# HOJAI Graph Enrichment - Knowledge Graph

> **HOJAI AI** | Company: hojai-ai  
> **Port:** 4810 | **Status:** ✅ **BUILT** (June 13, 2026)

## Overview

**HOJAI Graph Enrichment** provides knowledge graph capabilities. Manage entities and their relationships for intelligent insights.

### Key Features

- 🏢 **Entity Management** - Create and track entities
- 📊 **Entity Types** - Company, person, product, document, policy, SOP
- 🔗 **Relationships** - Define entity relationships
- 🔍 **Text Search** - Full-text entity search
- 🌐 **Graph Traversal** - Navigate entity connections
- 📝 **Properties** - Flexible entity properties

## Architecture

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| Framework | Express.js 4.x |
| Language | TypeScript 5.x |
| Database | MongoDB 6.x |
| Validation | Zod 3.x |

## API Endpoints

### Entities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/entities` | List entities |
| POST | `/api/v1/entities` | Create entity |
| GET | `/api/v1/entities/:id` | Get entity |
| PUT | `/api/v1/entities/:id` | Update entity |
| DELETE | `/api/v1/entities/:id` | Delete entity |
| GET | `/api/v1/entities/:id/relationships` | Entity relationships |

### Relationships

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/relationships` | List relationships |
| POST | `/api/v1/relationships` | Create relationship |

## Entity Types

| Type | Description |
|------|-------------|
| company | Company entity |
| person | Person entity |
| product | Product entity |
| document | Document entity |
| policy | Policy entity |
| sop | Standard Operating Procedure |
| decision | Decision entity |
| goal | Goal entity |
| project | Project entity |

## Data Models

### Entity

```typescript
{
  id: string;
  type: 'company' | 'person' | 'product' | 'document' | 'policy' | 'sop' | 'decision' | 'goal' | 'project';
  name: string;
  properties: Record<string, unknown>;
}
```

### Relationship

```typescript
{
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, unknown>;
}
```

## Security Features

| Feature | Status |
|---------|--------|
| Input Validation (Zod) | ✅ |
| Graceful Shutdown | ✅ |
| Health Checks | ✅ |

## Quick Start

```bash
npm install
npm run dev
npm run build
npm start
```

---

**License:** Proprietary - RTNM Digital  
**Last Updated:** June 13, 2026
