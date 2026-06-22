# HOJAI Web Monitoring Service

**Port:** 4596

Scheduled web monitoring, change detection, and bridge integrations.

## Features

- **Scheduled Monitoring** - Register URLs for periodic scraping (hourly/daily/weekly)
- **Change Detection** - SHA-256 hashing to detect content changes
- **TwinOS Bridge** - Update company twins with web intelligence
- **Knowledge Graph Bridge** - Sync entities and relationships
- **AssetMind Connector** - Send financial intelligence

## Architecture

```
REZ Scheduler (4320)
    │
    ├──► Register monitoring jobs
    │
    ▼
HOJAI Web Monitoring (4596)
    │
    ├──► Scheduled scraping
    ├──► Change detection (content hashing)
    │
    ├──► TwinOS Bridge (4142)
    ├──► Knowledge Graph Bridge (4540)
    └──► AssetMind Connector (5001)
```

## Quick Start

```bash
cd hojai-ai/services/hojai-web-monitoring
npm install
npm run dev
```

## Environment Variables

```bash
WEB_INTELLIGENCE_URL=http://localhost:4595
REZ_SCHEDULER_URL=http://localhost:4320
TWINOS_URL=http://localhost:4142
KNOWLEDGE_GRAPH_URL=http://localhost:4540
ASSETMIND_URL=http://localhost:5001
```

## API Endpoints

### Monitoring

```bash
# Register URL for monitoring
POST /api/monitor
{"url": "https://example.com", "name": "Example Site", "frequency": "daily"}

# List all monitors
GET /api/monitor

# Get monitor details
GET /api/monitor/:id

# Pause/Resume
POST /api/monitor/:id/pause
POST /api/monitor/:id/resume

# Delete monitor
DELETE /api/monitor/:id
```

### Change Detection

```bash
# Get changes for a monitor
GET /api/changes/:monitorId

# Get all recent changes
GET /api/changes?severity=high&limit=50

# Manually trigger scrape
POST /api/scrape/:id

# Scrape all monitors
POST /api/scrape-all
```

### Bridges

```bash
# Update TwinOS
POST /api/bridges/twinos
{"entityId": "company-123", "entityType": "company", "webData": {...}}

# Sync to Knowledge Graph
POST /api/bridges/knowledge-graph
{"entities": [...], "relationships": [...]}

# Send to AssetMind
POST /api/bridges/assetmind
{"companyId": "Tesla", "intelligenceType": "web_change", "data": {...}}
```

### MCP Tools

```bash
POST /api/mcp/scrape
POST /api/mcp/monitor
GET  /api/mcp/changes
GET  /api/mcp/news
```

## Change Types

| Type | Severity | Description |
|------|----------|-------------|
| price | high | Price change detected |
| content | medium | Content update |
| structure | medium | Link/image count change |
| new | low | First time scraping |
| removed | medium | Content removed |

## Integration with REZ Scheduler

When REZ Scheduler is available, monitoring jobs are automatically registered:

```bash
# Job registered with REZ Scheduler
{
  "name": "web-monitor-{monitorId}",
  "handler": "web-intelligence-scrape",
  "intervalMs": 86400000,  // daily
  "data": { "monitorId": "...", "url": "..." }
}
```

If REZ Scheduler is unavailable, falls back to local `setInterval` scheduling.
