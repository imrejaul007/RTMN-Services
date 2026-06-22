# HOJAI Research Assistant

**Tagline:** "AI-powered research that delivers insights, not just data."

**Port:** 4756

## Overview

The Research Assistant is an AI-powered service for market research, competitor analysis, and report generation. It provides comprehensive research capabilities through modular components.

## Features

- **Web Search** - Search across multiple sources with intelligent filtering
- **Competitor Analysis** - Analyze competitors with SWOT, products, and market positioning
- **Report Generation** - Generate detailed reports in multiple formats
- **Trend Detection** - Track and analyze market trends across categories
- **Content Summarization** - Summarize articles, documents, and web content
- **Entity Extraction** - Extract organizations, people, locations, and dates

## Architecture

```
ResearchAssistant
├── Search Module       - Web search functionality
├── Analysis Module     - Competitor analysis
├── Report Module       - Report generation
├── Trends Module       - Trend detection and analysis
├── Summary Module      - Content summarization
└── Research Service    - Orchestration layer
```

## API Endpoints

### Search

```bash
POST /api/research/search
```

Search the web for research topics.

```json
{
  "query": "market trends 2026",
  "limit": 10,
  "filters": {
    "dateRange": { "from": "2026-01-01", "to": "2026-05-30" },
    "language": "en"
  }
}
```

### Competitor Analysis

```bash
POST /api/research/competitor
```

Analyze competitors for a company.

```json
{
  "company": "Apple",
  "competitors": ["Samsung", "Google"],
  "includeProducts": true,
  "includePricing": false,
  "includeMarketShare": true
}
```

### Report Generation

```bash
POST /api/research/report
```

Generate a comprehensive research report.

```json
{
  "topic": "AI in Healthcare",
  "format": "detailed",
  "includeCharts": true,
  "includeRecommendations": true,
  "audience": "Healthcare executives",
  "timeframe": "2024-2026"
}
```

### Trend Detection

```bash
GET /api/research/trends
GET /api/research/trends/technology
GET /api/research/trends/search?keyword=AI
```

Get current market trends.

### Content Summarization

```bash
POST /api/research/summarize
```

Summarize content.

```json
{
  "content": "Long article or document content...",
  "contentType": "article",
  "maxLength": 500,
  "style": "standard",
  "includeKeyPoints": true
}
```

### Comprehensive Research

```bash
POST /api/research/comprehensive
```

Perform comprehensive research combining all capabilities.

```json
{
  "topic": "Generative AI Market",
  "includeReport": true,
  "includeTrends": true,
  "includeCompetitors": true
}
```

## Usage

### Start the service

```bash
cd employees/research-assistant
npm install
npm run dev    # Development
npm run build && npm start  # Production
```

### Test endpoints

```bash
# Health check
curl http://localhost:4756/health

# Service info
curl http://localhost:4756/api/info

# Search
curl -X POST http://localhost:4756/api/research/search \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant123" \
  -H "X-User-Id: user456" \
  -d '{"query":"market trends"}'

# Competitor analysis
curl -X POST http://localhost:4756/api/research/competitor \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant123" \
  -H "X-User-Id: user456" \
  -d '{"company":"Apple"}'

# Generate report
curl -X POST http://localhost:4756/api/research/report \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant123" \
  -H "X-User-Id: user456" \
  -d '{"topic":"AI Market","format":"summary"}'

# Get trends
curl http://localhost:4756/api/research/trends \
  -H "X-Tenant-Id: tenant123" \
  -H "X-User-Id: user456"

# Summarize content
curl -X POST http://localhost:4756/api/research/summarize \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant123" \
  -H "X-User-Id: user456" \
  -d '{"content":"Sample text to summarize...","style":"brief"}'
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4756 | Service port |
| NODE_ENV | development | Environment |
| CORS_ORIGINS | * | CORS allowed origins |

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-05-30T12:00:00.000Z",
    "requestId": "req_1234567890_abc",
    "tenantId": "tenant123"
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query is required",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2026-05-30T12:00:00.000Z",
    "requestId": "req_1234567890_abc"
  }
}
```

## Rate Limiting

- Global: 100 requests/minute
- Expensive operations (report, comprehensive): 10 requests/minute

## Dependencies

- Express.js - Web framework
- Zod - Schema validation
- express-rate-limit - Rate limiting
- TypeScript - Type safety

## Version

1.0.0 - May 30, 2026
