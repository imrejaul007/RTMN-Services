# RTMN Knowledge Base Service

> **Version:** 1.0.0
> **Port:** 4940
> **Status:** ✅ Built - Phase 2 High Priority

---

## Overview

The Knowledge Base Service provides centralized knowledge management with AI-powered search, article organization, categories, tags, and analytics.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Article Management** | Create, update, publish, archive, delete articles |
| **Categories** | Organize articles into categories |
| **Tags** | Multi-tag support for flexible categorization |
| **AI Search** | Relevance-based search with scoring |
| **Related Articles** | AI-powered related content suggestions |
| **Ratings** | Helpful/not helpful voting system |
| **Statistics** | Views, engagement, and performance analytics |
| **Visibility Controls** | Public, private, team visibility options |

### Article Status Flow

```
Draft → Review → Published → Archived
              ↑
              └──────────────┘ (republish)
```

---

## API Endpoints

### Articles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/articles` | List all articles |
| GET | `/api/articles/:id` | Get single article |
| POST | `/api/articles` | Create article |
| PUT | `/api/articles/:id` | Update article |
| DELETE | `/api/articles/:id` | Delete article |
| POST | `/api/articles/:id/publish` | Publish article |
| POST | `/api/articles/:id/rate` | Rate article (helpful/not helpful) |
| GET | `/api/articles/:id/related` | Get related articles |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete category |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=query` | AI-powered search |
| GET | `/api/statistics` | Get KB statistics |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health check |

---

## Data Model

### Article

```javascript
{
  id: "art-1",
  title: "Welcome to RTMN Platform",
  slug: "welcome-to-rtmn",
  content: "# Markdown content...",
  summary: "Brief summary of the article",
  categoryId: "cat-1",
  author: "System Admin",
  authorId: "user-1",
  tags: ["welcome", "introduction"],
  status: "published",  // draft, review, published, archived
  visibility: "public",  // public, private, team
  views: 1542,
  helpful: 89,
  notHelpful: 5,
  createdAt: "2025-01-15T00:00:00.000Z",
  updatedAt: "2025-06-10T00:00:00.000Z",
  publishedAt: "2025-01-15T00:00:00.000Z"
}
```

### Category

```javascript
{
  id: "cat-1",
  name: "Getting Started",
  description: "Onboarding guides and basics",
  icon: "rocket",
  articleCount: 12
}
```

---

## Search Algorithm

The search uses a multi-factor relevance scoring system:

1. **Title Match (100 points)** - Exact title matches score highest
2. **Content Match (50 points)** - Body content matches
3. **Tag Match (30 points)** - Matching tags
4. **Summary Match (20 points)** - Summary matches
5. **Popularity Boost** - Based on views and helpful ratings

---

## Sample Categories

| ID | Name | Icon |
|----|------|------|
| cat-1 | Getting Started | rocket |
| cat-2 | Sales | trending-up |
| cat-3 | Marketing | megaphone |
| cat-4 | Customer Success | heart |
| cat-5 | Operations | settings |
| cat-6 | Finance | dollar-sign |
| cat-7 | HR & People | users |
| cat-8 | Product | box |

---

## Usage Examples

### Create Article

```bash
curl -X POST http://localhost:4940/api/articles \
  -H "Content-Type: application/json" \
  -d '{
    "title": "How to Use Sales Copilot",
    "content": "# Sales Copilot Guide...",
    "summary": "Learn how to leverage the AI Sales Copilot",
    "categoryId": "cat-2",
    "author": "Sales Team",
    "tags": ["sales", "ai", "copilot"]
  }'
```

### Search Articles

```bash
curl "http://localhost:4940/api/search?q=sales%20pipeline&limit=10"
```

### Get Related Articles

```bash
curl http://localhost:4940/api/articles/art-1/related
```

### Publish Article

```bash
curl -X POST http://localhost:4940/api/articles/art-1/publish
```

### Rate Article

```bash
curl -X POST http://localhost:4940/api/articles/art-1/rate \
  -H "Content-Type: application/json" \
  -d '{"helpful": true}'
```

---

## Integration Points

| Service | Connection | Purpose |
|---------|------------|---------|
| **Unified Hub** | Hub routes to this service | Knowledge access via unified API |
| **Sales OS** | Category: Sales | Sales knowledge articles |
| **Marketing OS** | Category: Marketing | Marketing knowledge articles |
| **Customer Success OS** | Support KB | Self-service support |
| **TwinOS** | Article analytics | Track article engagement |

---

## Statistics

| Metric | Value |
|--------|-------|
| Total Articles | 3+ |
| Categories | 8 |
| Built-in Articles | 3 |
| Status | ✅ Operational |

---

## Quick Start

```bash
cd services/knowledge-base
npm install
npm start
```

---

*Built with Phase 2 - High Priority Services*
