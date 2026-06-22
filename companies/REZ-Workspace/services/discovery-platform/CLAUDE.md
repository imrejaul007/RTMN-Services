# REZ Discovery Platform

> **Migrated from `companies/AdBazaar/` to `RTMN-Group` on 2026-06-20.**
>
> Reason: core platform engine.
>
> The AdBazaar canonical-home note was removed as part of the move.


**Version:** 1.0.0
**Date:** June 2026
**Company:** AdBazaar
**Port:** 3000

## Overview
Product discovery and recommendation platform that combines semantic search, geo-ranking, trending, local ranking, and sponsored products into a unified search experience. Uses a recommendation blend engine to combine results from multiple rankers with configurable strategies.

## Tech Stack
- Framework: Express.js (Node.js)
- Search: Semantic Search Engine (1536-dim embeddings)
- Validation: Zod
- Security: Helmet, CORS, Rate Limiting, Internal Auth
- Logging: Winston

## Key Features
1. **Semantic Search** - Natural language product search with embeddings
2. **Geo-Ranking** - Location-based product ranking
3. **Trending Products** - Track views, purchases, wishlists by time window
4. **Local Products** - Rank products by locality (city, state, country)
5. **Sponsored Products** - Bid-based sponsored product placement
6. **Recommendation Blend** - Combine multiple rankers with strategies
7. **Batch Indexing** - Efficient bulk product indexing
8. **Event Tracking** - Track views, purchases, wishlists

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check with ranker stats |
| GET | /stats | Service statistics |
| POST | /search | Search products with blended results |
| POST | /products | Index a single product |
| POST | /products/batch | Batch index multiple products |
| POST | /events | Track product events |
| GET | /trending | Get trending products |
| GET | /nearby | Get nearby products by location |
| GET | /local | Get local products by locality |
| POST | /sponsored/register | Register sponsored product |
| GET | /strategies | List available blend strategies |

## Quick Start

```bash
cd REZ-discovery-platform
npm install
npm run dev
```

## Environment Variables
- PORT (default: 3000)
- NODE_ENV
- INTERNAL_SERVICE_TOKEN

## Related Services
- REZ-intent-graph - User intent signals
- REZ-media-analytics - Analytics pipeline
- REZ-marketing-backend - Campaign data
- REZ-growth-playbook - Growth strategies