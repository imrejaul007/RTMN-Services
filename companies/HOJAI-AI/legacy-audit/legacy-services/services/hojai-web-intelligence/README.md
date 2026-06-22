# HOJAI Web Intelligence Service

**Port:** 4595

Continuous web monitoring, scraping, and event extraction for the HOJAI ecosystem.

## Features

### Scraping
- **Simple scraping** (Cheerio) - Fast, no JS rendering
- **Firecrawl** - Cloud-based JS rendering
- **Puppeteer** - Self-hosted JS rendering

### News Monitoring
- **GDELT integration** - Free, unlimited news
- Entity-based search
- Timeline analysis
- Company/industry news

### Content Extraction
- Structured data extraction
- Named entity recognition
- LLM-powered extraction (optional)

### Memory Integration
- Automatic event storage in MemoryOS
- Entity-based retrieval
- Historical search

## Quick Start

```bash
cd hojai-ai/services/hojai-web-intelligence
npm install
npm run dev
```

## Configuration

Create `.env` file:

```bash
FIRECRAWL_API_KEY=your-firecrawl-api-key  # Optional
OPENAI_API_KEY=your-openai-api-key        # Optional, for LLM extraction
MEMORY_SERVICE_URL=http://localhost:4520   # MemoryOS URL
MEMORY_API_KEY=memory-internal-key         # MemoryOS auth key
```

## API Endpoints

### Scraping

```bash
# Simple scraping (Cheerio)
curl -X POST http://localhost:4595/api/scrape/simple \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Firecrawl (JS rendering)
curl -X POST http://localhost:4595/api/scrape/firecrawl \
  -H "Content-Type: application/json" \
  -d '{"url": "https://react-site.com"}'

# Puppeteer (self-hosted JS)
curl -X POST http://localhost:4595/api/scrape/puppeteer \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "waitForSelector": ".content"}'
```

### News

```bash
# Search news
curl "http://localhost:4595/api/news/search?query=artificial+intelligence&maxResults=50"

# Search by entity
curl "http://localhost:4595/api/news/entity?entity=Tesla&type=organization"

# Get timeline
curl "http://localhost:4595/api/news/timeline?query=startup+funding&interval=1h"
```

### Extraction

```bash
# Extract structured data
curl -X POST http://localhost:4595/api/extract \
  -H "Content-Type: application/json" \
  -d '{"content": "Article text here", "prompt": "Extract company name, revenue, and founder"}'

# Extract entities
curl -X POST http://localhost:4595/api/extract/entities \
  -H "Content-Type: application/json" \
  -d '{"content": "Elon Musk founded Tesla in 2003.", "types": ["person", "organization"]}'
```

### Memory

```bash
# Get recent events
curl "http://localhost:4595/api/memory/events?limit=100"

# Get events by entity
curl "http://localhost:4595/api/memory/entity/company-123"
```

## Integration Points

| Service | Integration |
|---------|------------|
| **MemoryOS** | Auto-stores all events |
| **HOJAI Intelligence** | Feeds into ML pipeline |
| **TwinOS** | Updates company/asset twins |
| **AssetMind** | Company news feed |
| **REZ Atlas** | Competitor monitoring |

## Architecture

```
Web Sources
    ↓
┌─────────────────────────────────────────┐
│         HOJAI Web Intelligence          │
│              (Port 4595)                │
├─────────────────────────────────────────┤
│  Scrapers: Cheerio │ Firecrawl │ Puppeteer │
│  News: GDELT (free, unlimited)          │
│  Extract: Regex │ LLM (OpenAI)          │
│  Memory: MemoryOS integration           │
└─────────────────────────────────────────┘
    ↓
  MemoryOS → TwinOS → HOJAI Intelligence
```

## Use Cases

### AssetMind - Financial News
```typescript
// Get company news for portfolio monitoring
const news = await newsMonitor.searchCompanyNews('Tesla');
// → Updates Asset Twin, triggers prediction
```

### REZ Atlas - Competitor Monitoring
```typescript
// Track competitor pricing changes
const competitor = await simpleScraper.scrape('https://competitor.com/pricing');
// → Store in Memory, detect changes
```

### HOJAI - Market Intelligence
```typescript
// Monitor industry trends
const articles = await newsMonitor.searchIndustryNews('fintech');
// → Feed into Knowledge Graph
```

## License

Proprietary - RTNM Digital
