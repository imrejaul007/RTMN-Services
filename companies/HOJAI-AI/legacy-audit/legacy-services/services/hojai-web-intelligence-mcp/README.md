# HOJAI Web Intelligence MCP Server

**Port:** 4597

MCP (Model Context Protocol) server providing standardized tool access for AI agents to web intelligence.

## MCP Tools

| Tool | Purpose | Input | Output |
|------|---------|-------|--------|
| `scrape_url` | Scrape a URL | url, selectors? | title, content, links |
| `search_news` | Search news (GDELT) | query, maxResults? | articles |
| `monitor_website` | Start monitoring | url, name, frequency? | monitorId |
| `get_entity_news` | News about entity | entity, type?, maxResults? | articles |
| `extract_entities` | Extract named entities | content, types? | entities |
| `get_website_changes` | Recent changes | monitorId?, since? | events |
| `batch_scrape` | Scrape multiple URLs | urls[], method? | results |
| `enrich_company` | Full company intel | companyName, website?, includeNews?, includeMonitoring? | company data |

## Quick Start

```bash
cd hojai-ai/services/hojai-web-intelligence-mcp
npm install
npm run dev
```

## Environment Variables

```bash
WEB_INTELLIGENCE_URL=http://localhost:4595
WEB_MONITORING_URL=http://localhost:4596
```

## Usage

### Direct API

```bash
# Scrape a URL
curl -X POST http://localhost:4597/tools/scrape_url \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Search news
curl "http://localhost:4597/tools/search_news?query=Tesla"

# Monitor a website
curl -X POST http://localhost:4597/tools/monitor_website \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "name": "Example", "frequency": "daily"}'

# Enrich company
curl -X POST http://localhost:4597/tools/enrich_company \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Tesla", "website": "https://tesla.com", "includeNews": true}'
```

### AI Agent Integration

AI agents can discover tools and call them:

```bash
# Discover available tools
curl http://localhost:4597/tools

# Call a tool
curl -X POST http://localhost:4597/tools/enrich_company \
  -H "Content-Type: application/json" \
  -d '{"companyName": "Apple", "includeNews": true}'
```

## Architecture

```
AI Agent
    │
    ├──► MCP Discovery (/tools)
    │
    ├──► Tool Calls
    │     │
    │     ▼
    │    HOJAI Web Intelligence MCP (4597)
    │         │
    │         ├──► /tools/scrape_url ──────────► HOJAI Web Intelligence (4595)
    │         ├──► /tools/search_news ──────────► HOJAI Web Intelligence (4595)
    │         ├──► /tools/monitor_website ─────► HOJAI Web Monitoring (4596)
    │         └──► /tools/get_website_changes ─► HOJAI Web Monitoring (4596)
    │
    └──► Structured Response
```

## Example: Company Research Agent

```typescript
// Agent uses MCP to research a company
const response = await fetch('http://localhost:4597/tools/enrich_company', {
  method: 'POST',
  body: JSON.stringify({
    companyName: 'Reliance Industries',
    website: 'https://ril.com',
    includeNews: true,
    includeMonitoring: true
  })
});

const { company, news, website, monitoring } = await response.json();

// Agent now has:
// - company name and metadata
// - recent news articles
// - website content
// - monitoring setup for changes
```