# InternetOS Reuse Audit - Existing Services to Leverage

> **Purpose:** Audit RTMN/HOJAI ecosystem for existing services that InternetOS can REUSE instead of rebuilding
> **Audit Date:** June 30, 2026
> **Scope:** HOJAI-AI platform, services, and industry-os directories

---

## Executive Summary

InternetOS (HOJAI's web intelligence platform) has **35+ existing services** it can reuse across 8 categories. **DO NOT REBUILD** these services - integrate with them instead.

| Category | Services Found | Key Ports |
|----------|---------------|-----------|
| Memory Services | 8 | 4703, 4152, 4786, 4793, 4785 |
| Twin Services | 5 | 4705, 4704, 5321-5324 |
| Knowledge/Graph | 6 | 4750-4753, 4783, 4784 |
| Web Scraping/Monitoring | 5 | Review scrapers, InternetOS actors |
| Skills/Playbook | 4 | 4743, 4806, 4855 |
| Notification/Messaging | 5 | 4110, 4870, 4750 |
| Database Services | 3 | 4780 (vector), 4783 (graph) |
| Intelligence/Analytics | 8 | 4770-4792 |

---

## 1. MEMORY SERVICES (DO NOT REBUILD)

### 1.1 Core MemoryOS (Port 4703)
**Path:** `platform/memory/memory-os/`
**What it does:** Central memory storage with 15 memory types, knowledge graph, working/long-term memory
**Use for:** Store scraped data, web content, entity memories
**SDK:** `@hojai/memory-sdk`
```javascript
import { MemoryOS } from '@hojai/memory-sdk';
const memory = new MemoryOS({ apiKey: '...' });
await memory.remember('Scraped content from zomato', 'actor_zomato');
```

### 1.2 Memory Confidence (Port 4152)
**Path:** `platform/memory/memory-confidence/`
**What it does:** Per-fact reliability scoring (base x decay x contradiction)
**Use for:** Track reliability of scraped data sources

### 1.3 Memory Intelligence (Port 4786)
**Path:** `platform/memory/memory-intelligence-service/`
**What it does:** Smart memory operations - Remember, Forget, Compress, Merge, Contradiction, Importance, Decay
**Use for:** Intelligent memory management for web data

### 1.4 Memory Context Engine (Port 4793)
**Path:** `platform/memory/memory-context-engine/`
**What it does:** Composes relevant context window for AI agents
**Use for:** Build context for AI analysis of scraped content

### 1.5 Memory Observation (Port 4854)
**Path:** `platform/memory/memory-observation/`
**What it does:** Pattern detection, habit identification, predictions
**Use for:** Detect patterns in scraped web data

### 1.6 Memory Relationships (Port 4794)
**Path:** `platform/memory/memory-relationships/`
**What it does:** Graph-based relationships, bidirectional links, path finding
**Use for:** Build relationship graphs between scraped entities

### 1.7 Memory Substrate (Port 4782)
**Path:** `platform/memory/memory-substrate/`
**What it does:** PostgreSQL + pgvector backend for memory
**Use for:** Persistent storage for scraped data

### 1.8 Twin Working Memory (Port 4724)
**Path:** `platform/memory/twin-working-memory/`
**What it does:** Twin ↔ working memory bridge
**Use for:** Connect web entities to their digital twins

---

## 2. TWIN SERVICES (DO NOT REBUILD)

### 2.1 TwinOS Hub (Port 4705)
**Path:** `platform/twins/twinos-hub/`
**What it does:** Central registry for 86+ digital twins
**Use for:** Register scraped entities as digital twins
**SDK:** `@hojai/twin-sdk`
```javascript
import { TwinOS } from '@hojai/twin-sdk';
const twins = new TwinOS({ apiKey: '...' });
await twins.create('restaurant', { name: 'Zomato Restaurant', scrapedAt: Date.now() });
```

### 2.2 Twin Memory Bridge (Port 4704)
**Path:** `platform/twins/twin-memory-bridge/`
**What it does:** Links twins to memory partitions
**Use for:** Connect entity twins to their scraped memories

### 2.3 Knowledge Twin (Port 4750)
**Path:** `platform/twins/knowledge-twin/`
**What it does:** Digital twin for knowledge entities
**Use for:** Create knowledge representation of scraped data

### 2.4 Organization Twin (Port 4710)
**Path:** `platform/twins/organization-twin/`
**What it does:** Digital twin for organizations
**Use for:** Represent scraped businesses/companies

### 2.5 Product Twin (Port 4720)
**Path:** `platform/twins/product-twin/`
**What it does:** Digital twin for products
**Use for:** Store scraped product information

---

## 3. KNOWLEDGE/GRAPH SERVICES (DO NOT REBUILD)

### 3.1 Persistent Graph Store (Port 4750)
**Path:** `platform/knowledge-graph/persistent-graph-store/`
**What it does:** Graph + vector storage with PostgreSQL/pgvector
**Use for:** Store scraped data as graph with vector embeddings
**SDK:** `@hojai/knowledge-sdk`
```javascript
// Store scraped entities as graph nodes
await graphStore.addNode({
  type: 'restaurant',
  properties: { name: 'X', rating: 4.5 },
  embedding: await embed(text)
});
```

### 3.2 Ontology Engine (Port 4751)
**Path:** `platform/knowledge-graph/ontology-engine/`
**What it does:** Schema validation and ontology management
**Use for:** Validate scraped data against business schemas

### 3.3 Entity Resolution (Port 4752)
**Path:** `platform/knowledge-graph/entity-resolution/`
**What it does:** Entity deduplication across sources
**Use for:** Deduplicate scraped entities (same restaurant on Zomato + Google Maps)

### 3.4 Reasoning Engine (Port 4785)
**Path:** `platform/intelligence/reasoning-engine/`
**What it does:** Deductive/inductive/abductive reasoning
**Use for:** Derive insights from scraped data

### 3.5 Knowledge Extraction (Port 4784)
**Path:** `platform/intelligence/knowledge-extraction/`
**What it does:** NER, entity linking, fact triple extraction
**Use for:** Extract structured entities from scraped HTML/text
```javascript
// Extract entities from scraped content
POST /api/extract-all
{ "text": "Scraped HTML content..." }
// Returns: { entities: [], facts: [], links: [] }
```

### 3.6 Graph Database (Port 4783)
**Path:** `platform/intelligence/graph-database/`
**What it does:** In-memory property graph (Neo4j alternative)
**Use for:** Fast graph operations on scraped data

---

## 4. WEB SCRAPING/MONITORING (LEVERAGE EXISTING)

### 4.1 InternetOS Actor Runtime (Port 4595)
**Path:** `platform/internet-os/actor-runtime/`
**What it does:** Standardized framework for web data extraction with 7 actors
**Actors Available:**
- `google-maps-actor` - Business discovery
- `zomato-actor` - Restaurant data
- `airbnb-actor` - Hospitality data
- `linkedin-actor` - Professional network
- `news-actor` - News extraction
- `company-intel-actor` - Company research
- `justdial-actor` - Local business
**DO NOT REBUILD** - Extend the existing actors

### 4.2 InternetOS Watcher Runtime
**Path:** `platform/internet-os/watcher-runtime/`
**What it does:** Continuous monitoring for changes
**Use for:** Schedule periodic scraping

### 4.3 Review Scrapers
**Path:** `products/review-scrapers/`
**What it does:** Monitor reviews across Google, social, app stores
**Use for:** Track brand reputation from scraped reviews

### 4.4 Twin Health Monitor
**Path:** `platform/twins/twin-health-monitor/`
**What it does:** Monitor twin health and data freshness
**Use for:** Track when scraped data needs refresh

### 4.5 SUTAR Monitoring (Port 3100)
**Path:** `sutar-os/core/sutar-monitoring/`
**What it does:** Monitoring infrastructure
**Use for:** Monitor InternetOS scraping operations

---

## 5. SKILLS/PLAYBOOK FRAMEWORKS (LEVERAGE)

### 5.1 SkillOS (Port 4743)
**Path:** `platform/skills/skill-os/`
**What it does:** Capability registry for AI agents
**Use for:** Register InternetOS scraping as a skill
```javascript
// Register scraping as a skill
POST /api/skills
{
  id: 'web.scrape',
  name: 'Web Scraping',
  capabilities: ['extract_restaurants', 'extract_reviews', 'monitor_changes'],
  pricing: { perRequest: 0.01 }
}
```

### 5.2 Skill Library (Port 4806)
**Path:** `platform/agent-os/skill-library/`
**What it does:** Reusable skill compositions
**Use for:** Composable scraping workflows

### 5.3 Workflow Marketplace (Port 4938)
**Path:** `platform/skills/workflow-marketplace/`
**What it does:** Workflow templates marketplace
**Use for:** Share scraping workflow templates

### 5.4 Connector Hub (Port 4855)
**Path:** `platform/connectors/connector-hub/`
**What it does:** Data connectors adapter hub
**Use for:** Connect scraped data to downstream systems

---

## 6. NOTIFICATION/MESSAGING SERVICES (LEVERAGE)

### 6.1 Webhook Bus (Port 4110)
**Path:** `platform/observability/webhook-bus/`
**What it does:** Event subscriptions and delivery with retries
**Use for:** Send webhooks when scraped data changes
```javascript
// Register webhook for scraped data changes
POST /api/webhooks
{
  event: 'scraped_data_changed',
  url: 'https://your-app.com/webhook',
  secret: 'your-secret'
}
```

### 6.2 Notification Service (Port 4870)
**Path:** `platform/observability/notification-service/`
**What it does:** Multi-channel notifications (email, SMS, push, in-app)
**Use for:** Alert users when monitored sites change

### 6.3 Emotion Alerts (Port 4765)
**Path:** `platform/emotion/emotion-alerts/`
**What it does:** Real-time emotion alerts
**Use for:** Alert on sentiment changes in scraped reviews

### 6.4 Budget Alerts (Port 4750)
**Path:** `platform/flow/loop-os/budget-alerts/`
**What it does:** Real-time budget notifications and webhooks
**Use for:** Alert on API quota usage for scraping

### 6.5 Event Bus (Port 4510)
**Path:** `services/event-bus/`
**What it does:** Cross-service pub/sub with webhooks, replay, DLQ
**Use for:** Event-driven scraping workflows

---

## 7. DATABASE SERVICES (LEVERAGE)

### 7.1 Vector DB (Port 4780)
**Path:** `platform/intelligence/vector-db/`
**What it does:** In-memory vector store with cosine similarity, metadata filtering
**Use for:** Semantic search on scraped content
```javascript
// Store and search scraped content
await vectorDB.upsert({ id: 'doc1', vector: embedding, metadata: { source: 'zomato' }});
const results = await vectorDB.query({ vector: queryEmbedding, topK: 10 });
```

### 7.2 RAG Platform (Port 4781)
**Path:** `platform/intelligence/rag-platform/`
**What it does:** Retrieval-augmented generation
**Use for:** Query scraped data with natural language

### 7.3 Graph Database (Port 4783)
**Path:** `platform/intelligence/graph-database/`
**What it does:** In-memory property graph
**Use for:** Build entity relationship graphs from scraped data

---

## 8. INTELLIGENCE/ANALYTICS SERVICES (LEVERAGE)

### 8.1 Intelligence Gateway (Port 4770)
**Path:** `platform/intelligence/intelligence-gateway/`
**What it does:** Unified entry point for all intelligence services
**Use for:** Route scraped data to appropriate intelligence services

### 8.2 AI Intelligence (Port 4881)
**Path:** `platform/intelligence/ai-intelligence/`
**What it does:** Multi-agent orchestration
**Use for:** Coordinate multiple scraping agents

### 8.3 Behavior Intelligence (Port 4788)
**Path:** `platform/intelligence/behavior-intelligence/`
**What it does:** Event tracking, funnels, anomalies
**Use for:** Track user behavior from scraped competitor data

### 8.4 Semantic Cache (Port 4772)
**Path:** `platform/intelligence/semantic-cache/`
**What it does:** Embedding-based semantic caching
**Use for:** Cache similar scraping requests

### 8.5 Intent Engine (Port 4786)
**Path:** `platform/intelligence/intent-engine/`
**What it does:** Keyword-based intent detection
**Use for:** Classify user queries for scraping needs

### 8.6 Reflection Engine (Port 4787)
**Path:** `platform/intelligence/reflection-engine/`
**What it does:** Quality scoring
**Use for:** Score scraped data quality

### 8.7 Proactive Engine (Port 4789)
**Path:** `platform/intelligence/proactive-engine/`
**What it does:** Rule-based suggestions
**Use for:** Suggest scraping schedules based on patterns

### 8.8 Trust Intelligence (Port 4882)
**Path:** `platform/flow/trust-intelligence/`
**What it does:** AI agent trust scoring
**Use for:** Score data source reliability

---

## 9. AVAILABLE SDKs

| SDK | Path | Use for |
|-----|------|---------|
| `@hojai/memory-sdk` | `sdk/hojai-memory-sdk/` | Memory operations |
| `@hojai/twin-sdk` | `sdk/hojai-twin/` | Digital twins |
| `@hojai/knowledge-sdk` | `sdk/hojai-knowledge-sdk/` | Knowledge graph |
| `@hojai/human-intelligence-sdk` | `sdk/hojai-human-intelligence-sdk/` | Emotion/trust analysis |
| `@hojai/intelligence-sdk` | `sdk/hojai-intelligence-sdk/` | AI intelligence |
| `@hojai/skill-os` | `sdk/hojai-skills/` | Skills marketplace |
| `@hojai/sutar-sdk` | `sdk/hojai-sutar/` | Autonomous commerce |

---

## 10. INTEGRATION ARCHITECTURE

### Recommended Integration Flow

```
InternetOS
    │
    ├── [REUSE] Actor Runtime (4595) ──► Scraped Data
    │                                        │
    ├── [REUSE] MemoryOS (4703) ◄────────────┘
    │         │
    │         ├── [REUSE] Knowledge Extraction (4784) ──► Entities
    │         │                                              │
    │         ├── [REUSE] Entity Resolution (4752) ◄─────────┘
    │         │                     │
    │         └── [REUSE] Memory Context (4793)
    │                                   │
    ├── [REUSE] TwinOS Hub (4705) ◄────┘
    │         │
    │         └── [REUSE] Organization Twin (4710)
    │                   │
    ├── [REUSE] Persistent Graph Store (4750)
    │         │
    │         └── [REUSE] Vector DB (4780)
    │
    ├── [REUSE] Webhook Bus (4110) ──► Notify on changes
    │
    └── [REUSE] SkillOS (4743) ──► Register scraping skill
```

---

## 11. WHAT TO BUILD vs WHAT TO REUSE

### DO NOT BUILD (Use Existing)
- Memory storage layer
- Twin registry and creation
- Knowledge graph storage
- Vector embeddings
- Entity extraction (use knowledge-extraction)
- Entity deduplication (use entity-resolution)
- Notification system
- Webhook delivery
- Skill registry
- Monitoring/alerting

### BUILD NEW (InternetOS-Specific)
- Actor framework enhancements (extends existing)
- Scraping logic per website
- Rate limiting per domain
- Proxy rotation
- CAPTCHA handling
- Data normalization
- Scheduling logic
- Change detection algorithms

---

## 12. PORTS REFERENCE

| Service | Port | Protocol |
|---------|------|----------|
| Actor Runtime | 4595 | HTTP |
| MemoryOS | 4703 | HTTP |
| Memory Confidence | 4152 | HTTP |
| Memory Context Engine | 4793 | HTTP |
| TwinOS Hub | 4705 | HTTP |
| Twin Memory Bridge | 4704 | HTTP |
| Knowledge Twin | 4750 | HTTP |
| Persistent Graph Store | 4750 | HTTP |
| Ontology Engine | 4751 | HTTP |
| Entity Resolution | 4752 | HTTP |
| Reasoning Engine | 4785 | HTTP |
| Knowledge Extraction | 4784 | HTTP |
| Graph Database | 4783 | HTTP |
| Vector DB | 4780 | HTTP |
| RAG Platform | 4781 | HTTP |
| SkillOS | 4743 | HTTP |
| Skill Library | 4806 | HTTP |
| Connector Hub | 4855 | HTTP |
| Webhook Bus | 4110 | HTTP |
| Notification Service | 4870 | HTTP |
| Event Bus | 4510 | HTTP |
| Intelligence Gateway | 4770 | HTTP |
| AI Intelligence | 4881 | HTTP |

---

## 13. EXAMPLE INTEGRATION CODE

```javascript
// InternetOS Integration Example
import { MemoryOS } from '@hojai/memory-sdk';
import { TwinOS } from '@hojai/twin-sdk';
import { KnowledgeGraph } from '@hojai/knowledge-sdk';

// 1. Initialize SDKs
const memory = new MemoryOS({ url: 'http://localhost:4703' });
const twins = new TwinOS({ url: 'http://localhost:4705' });
const graph = new KnowledgeGraph({ url: 'http://localhost:4750' });

// 2. After scraping, store data
async function onScrapeComplete(data, source) {
  // Store in memory
  await memory.remember({
    type: 'web_content',
    content: data.rawHtml,
    source: source,
    scrapedAt: new Date().toISOString()
  });

  // Extract entities
  const entities = await fetch('http://localhost:4784/api/extract-all', {
    method: 'POST',
    body: JSON.stringify({ text: data.text })
  });

  // Create or update twin
  for (const entity of entities) {
    await twins.upsert(entity.type, entity);
  }

  // Add to knowledge graph
  await graph.addNode({
    type: 'scraped_entity',
    properties: entities,
    source: source
  });
}

// 3. Register webhook for changes
await fetch('http://localhost:4110/api/webhooks', {
  method: 'POST',
  body: JSON.stringify({
    event: 'monitoring.alert',
    url: 'http://internetos/webhook',
    filter: { type: 'price_change' }
  })
});

// 4. Register as skill
await fetch('http://localhost:4743/api/skills', {
  method: 'POST',
  body: JSON.stringify({
    id: 'internet.scrape',
    name: 'Web Scraping',
    description: 'Scrape and monitor web content',
    capabilities: ['scrape', 'monitor', 'extract_entities']
  })
});
```

---

## 14. SUMMARY

InternetOS has **35+ existing services** to leverage across the HOJAI ecosystem. Key takeaways:

1. **Memory** - Use MemoryOS for all scraped data storage
2. **Twins** - Register scraped entities as digital twins
3. **Knowledge** - Use knowledge-extraction for NER, entity-resolution for deduplication
4. **Graph** - Use persistent-graph-store for entity relationships
5. **Notifications** - Use webhook-bus for change alerts
6. **Skills** - Register scraping as a SkillOS capability

**DO NOT REBUILD** infrastructure - integrate with existing services.
