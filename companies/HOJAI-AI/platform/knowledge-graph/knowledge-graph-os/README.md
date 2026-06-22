# KnowledgeGraphOS

**Service:** KnowledgeGraphOS  
**Port:** 4501  
**Type:** Graph Database & Knowledge Management

---

## Overview

KnowledgeGraphOS provides a graph database for the RTMN ecosystem, enabling knowledge representation, entity relationships, and graph traversal queries.

## Quick Start

```bash
cd core/knowledge-graph-os
npm install
npm start

curl http://localhost:4501/health
```

## Node Types

- **Concept**: Abstract concepts
- **Entity**: Real-world entities
- **Document**: Documents
- **Event**: Events
- **Person**: People
- **Organization**: Organizations
- **Location**: Locations
- **Product**: Products
- **Service**: Services

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/nodes` | Create node |
| GET | `/api/nodes` | List nodes |
| GET | `/api/nodes/:id` | Get node |
| PUT | `/api/nodes/:id` | Update node |
| DELETE | `/api/nodes/:id` | Delete node |
| POST | `/api/relationships` | Create relationship |
| GET | `/api/relationships/:id` | Get relationship |
| DELETE | `/api/relationships/:id` | Delete relationship |
| GET | `/api/nodes/:id/neighbors` | Get neighbors |
| POST | `/api/traverse` | Traverse graph |
| GET | `/api/search` | Search nodes |

---

*Part of RTMN Core Platform*
