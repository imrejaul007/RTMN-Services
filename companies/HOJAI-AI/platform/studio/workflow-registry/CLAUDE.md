# Workflow Registry

> **Service:** Workflow Registry  
> **Port:** 4902  
> **Phase:** 34  
> **Status:** Production-ready

## Overview

Registry for AI workflow templates — save, version, categorize, and search reusable workflow patterns across all HOJAI services.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/templates` | List templates (filter by category, industry, tags, search) |
| POST | `/api/templates` | Create template (name, nodes, edges, category, industry, complexity) |
| GET | `/api/templates/:id` | Get template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template |
| GET | `/api/templates/:id/versions` | List template versions |
| POST | `/api/templates/:id/versions` | Create new version (bumps version number) |
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category (name, type, description) |
| GET | `/api/search` | Search templates (q, category, industry, complexity, tags) |
| GET | `/api/analytics` | Template statistics (by-category, by-industry, by-complexity) |

## Template Structure

```javascript
{
  id, name, description,
  category, industry, complexity,
  nodes: [{ id, type, config }],
  edges: [{ from, to }],
  tags: [],
  author, version,
  createdAt, updatedAt
}
```

## Complexity Levels

`simple` | `medium` | `complex`