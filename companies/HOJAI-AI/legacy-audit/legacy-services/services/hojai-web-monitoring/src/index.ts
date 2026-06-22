/**
 * HOJAI Web Monitoring Service
 *
 * Scheduled monitoring, change detection, and web intelligence integration
 * Port: 4596
 *
 * Features:
 * - Scheduled monitoring via REZ Scheduler integration
 * - Change detection with content hashing
 * - TwinOS bridge for company twin updates
 * - Knowledge Graph bridge for entity relationships
 * - AssetMind connector for financial intelligence
 *
 * Integrates with:
 * - REZ Scheduler (4320) - Job scheduling
 * - HOJAI Web Intelligence (4595) - Scraping
 * - TwinOS (4142) - Digital twins
 * - Knowledge Graph (4540) - Entity relationships
 * - AssetMind (5001-5299) - Financial intelligence
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { SimpleScraper } from './scrapers/simpleScraper';
import { ContentHasher } from './change/contentHasher';
import { TwinOSBridge } from './bridges/twinosBridge';
import { KnowledgeGraphBridge } from './bridges/knowledgeGraphBridge';
import { AssetMindConnector } from './bridges/assetmindConnector';

const app = express();
const PORT = 4596;

// Configuration
const WEB_INTELLIGENCE_URL = process.env.WEB_INTELLIGENCE_URL || 'http://localhost:4595';
const REZ_SCHEDULER_URL = process.env.REZ_SCHEDULER_URL || 'http://localhost:4320';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4142';
const KNOWLEDGE_GRAPH_URL = process.env.KNOWLEDGE_GRAPH_URL || 'http://localhost:4540';
const ASSETMIND_URL = process.env.ASSETMIND_URL || 'http://localhost:5001';

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Initialize services
const simpleScraper = new SimpleScraper();
const contentHasher = new ContentHasher();
const twinOSBridge = new TwinOSBridge(TWINOS_URL);
const knowledgeGraphBridge = new KnowledgeGraphBridge(KNOWLEDGE_GRAPH_URL);
const assetMindConnector = new AssetMindConnector(ASSETMIND_URL);

// In-memory stores (use Redis in production)
interface ScrapeSelectors {
  title?: string;
  content?: string;
  price?: string;
  [key: string]: string | undefined;
}

interface MonitoredURL {
  id: string;
  url: string;
  name: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  intervalMs: number;
  selectors?: ScrapeSelectors;
  onChange?: string[];
  status: 'active' | 'paused';
  lastScrape?: string;
  lastHash?: string;
  createdAt: string;
}

interface ChangeEvent {
  id: string;
  urlId: string;
  url: string;
  changeType: 'content' | 'price' | 'structure' | 'new' | 'removed';
  previousHash?: string;
  newHash?: string;
  diff?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

const monitoredURLs = new Map<string, MonitoredURL>();
const changeEvents = new Map<string, ChangeEvent[]>();
const scrapeHistory = new Map<string, any[]>();

// ==================== HEALTH & STATUS ====================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-web-monitoring',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      monitoredURLs: monitoredURLs.size,
      changeEvents: Array.from(changeEvents.values()).reduce((sum, arr) => sum + arr.length, 0)
    }
  });
});

// ==================== MONITOR MANAGEMENT ====================

/**
 * Register a URL for monitoring
 * POST /api/monitor
 */
app.post('/api/monitor', async (req, res) => {
  try {
    const { url, name, frequency = 'daily', selectors, onChange } = req.body;

    if (!url || !name) {
      return res.status(400).json({ error: 'url and name required' });
    }

    const frequencyMap: Record<string, number> = {
      hourly: 3600000,
      daily: 86400000,
      weekly: 604800000
    };

    const monitorId = uuidv4();
    const monitor: MonitoredURL = {
      id: monitorId,
      url,
      name,
      frequency,
      intervalMs: frequencyMap[frequency] || frequencyMap.daily,
      selectors,
      onChange,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    monitoredURLs.set(monitorId, monitor);

    // Register with REZ Scheduler
    try {
      await axios.post(`${REZ_SCHEDULER_URL}/api/scheduler/jobs`, {
        name: `web-monitor-${monitorId}`,
        handler: 'web-intelligence-scrape',
        intervalMs: monitor.intervalMs,
        data: { monitorId, url }
      });
    } catch (schedulerError) {
      console.warn('REZ Scheduler not available, using local scheduling');
      // Fall back to local interval
      scheduleLocalScrape(monitorId, monitor.intervalMs);
    }

    res.json({
      success: true,
      monitorId,
      message: `Monitoring ${url} ${frequency}`
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all monitored URLs
 * GET /api/monitor
 */
app.get('/api/monitor', (req, res) => {
  const { status } = req.query;
  let monitors = Array.from(monitoredURLs.values());

  if (status) {
    monitors = monitors.filter(m => m.status === status);
  }

  res.json({
    monitors,
    count: monitors.length
  });
});

/**
 * Get specific monitor
 * GET /api/monitor/:id
 */
app.get('/api/monitor/:id', (req, res) => {
  const monitor = monitoredURLs.get(req.params.id);
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  const events = changeEvents.get(req.params.id) || [];
  const history = scrapeHistory.get(req.params.id) || [];

  res.json({
    monitor,
    events: events.slice(-50),
    history: history.slice(-10),
    stats: {
      totalEvents: events.length,
      lastScrape: monitor.lastScrape,
      lastChange: events.length > 0 ? events[events.length - 1].timestamp : null
    }
  });
});

/**
 * Pause monitoring
 * POST /api/monitor/:id/pause
 */
app.post('/api/monitor/:id/pause', (req, res) => {
  const monitor = monitoredURLs.get(req.params.id);
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  monitor.status = 'paused';
  res.json({ success: true, monitor });
});

/**
 * Resume monitoring
 * POST /api/monitor/:id/resume
 */
app.post('/api/monitor/:id/resume', (req, res) => {
  const monitor = monitoredURLs.get(req.params.id);
  if (!monitor) {
    return res.status(404).json({ error: 'Monitor not found' });
  }

  monitor.status = 'active';
  scheduleLocalScrape(monitor.id, monitor.intervalMs);
  res.json({ success: true, monitor });
});

/**
 * Delete monitor
 * DELETE /api/monitor/:id
 */
app.delete('/api/monitor/:id', (req, res) => {
  monitoredURLs.delete(req.params.id);
  scrapeHistory.delete(req.params.id);
  changeEvents.delete(req.params.id);
  res.json({ success: true });
});

// ==================== CHANGE EVENTS ====================

/**
 * Get change events for a monitor
 * GET /api/changes/:monitorId
 */
app.get('/api/changes/:monitorId', (req, res) => {
  const events = changeEvents.get(req.params.monitorId) || [];
  const { limit = 50, type } = req.query;

  let filtered = events;
  if (type) {
    filtered = events.filter(e => e.changeType === type);
  }

  res.json({
    events: filtered.slice(-Number(limit)),
    count: filtered.length
  });
});

/**
 * Get all recent changes
 * GET /api/changes
 */
app.get('/api/changes', (req, res) => {
  const allEvents = Array.from(changeEvents.values()).flat();
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const { severity, limit = 100 } = req.query;
  let filtered = allEvents;

  if (severity) {
    filtered = allEvents.filter(e => e.severity === severity);
  }

  res.json({
    events: filtered.slice(0, Number(limit)),
    count: filtered.length
  });
});

// ==================== SCRAPE & CHANGE DETECTION ====================

/**
 * Manually trigger scrape for a monitor
 * POST /api/scrape/:id
 */
app.post('/api/scrape/:id', async (req, res) => {
  try {
    const monitor = monitoredURLs.get(req.params.id);
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }

    const result = await scrapeAndDetect(monitor);

    res.json({
      success: true,
      result,
      changed: result.changed
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Scrape all active monitors
 * POST /api/scrape-all
 */
app.post('/api/scrape-all', async (req, res) => {
  const results = await Promise.allSettled(
    Array.from(monitoredURLs.values())
      .filter(m => m.status === 'active')
      .map(m => scrapeAndDetect(m))
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  const changed = results.filter(r =>
    r.status === 'fulfilled' && (r.value as any).changed
  ).length;

  res.json({
    total: monitoredURLs.size,
    successful,
    changed,
    results: results.map((r, i) => ({
      monitorId: Array.from(monitoredURLs.keys())[i],
      status: r.status,
      changed: r.status === 'fulfilled' ? (r.value as any).changed : false
    }))
  });
});

// ==================== BRIDGE ENDPOINTS ====================

/**
 * Update TwinOS with web intelligence
 * POST /api/bridges/twinos
 */
app.post('/api/bridges/twinos', async (req, res) => {
  try {
    const { entityId, entityType = 'company', webData } = req.body;

    if (!entityId) {
      return res.status(400).json({ error: 'entityId required' });
    }

    const result = await twinOSBridge.updateTwin(entityId, entityType, webData);

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Sync entities to Knowledge Graph
 * POST /api/bridges/knowledge-graph
 */
app.post('/api/bridges/knowledge-graph', async (req, res) => {
  try {
    const { entities, relationships } = req.body;

    if (!entities) {
      return res.status(400).json({ error: 'entities required' });
    }

    const result = await knowledgeGraphBridge.syncEntities(entities, relationships);

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send intelligence to AssetMind
 * POST /api/bridges/assetmind
 */
app.post('/api/bridges/assetmind', async (req, res) => {
  try {
    const { companyId, intelligenceType, data } = req.body;

    if (!companyId || !intelligenceType) {
      return res.status(400).json({ error: 'companyId and intelligenceType required' });
    }

    const result = await assetMindConnector.sendIntelligence(companyId, intelligenceType, data);

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== INTERNAL FUNCTIONS ====================

/**
 * Scrape URL and detect changes
 */
async function scrapeAndDetect(monitor: MonitoredURL): Promise<{
  changed: boolean;
  changeType?: string;
  previousHash?: string;
  newHash?: string;
  content?: any;
}> {
  // Scrape the URL
  const scrapeResult = await simpleScraper.scrape(monitor.url, {
    selectors: typeof monitor.selectors === 'object' && !Array.isArray(monitor.selectors)
      ? monitor.selectors
      : undefined
  });

  // Calculate content hash
  const contentString = JSON.stringify(scrapeResult);
  const newHash = contentHasher.hash(contentString);

  // Store in history
  const history = scrapeHistory.get(monitor.id) || [];
  history.push({
    timestamp: new Date().toISOString(),
    hash: newHash,
    content: scrapeResult
  });
  // Keep last 30 scrapes
  if (history.length > 30) history.shift();
  scrapeHistory.set(monitor.id, history);

  // Check for changes
  const changed: boolean = !!(monitor.lastHash && monitor.lastHash !== newHash);

  if (changed) {
    // Detect change type
    const changeAnalysis = contentHasher.detectChangeType(
      history.length > 1 ? history[history.length - 2].content : null,
      scrapeResult
    );

    // Create change event
    const event: ChangeEvent = {
      id: uuidv4(),
      urlId: monitor.id,
      url: monitor.url,
      changeType: changeAnalysis.type,
      previousHash: monitor.lastHash,
      newHash,
      timestamp: new Date().toISOString(),
      severity: changeAnalysis.severity
    };

    const events = changeEvents.get(monitor.id) || [];
    events.push(event);
    // Keep last 100 events
    if (events.length > 100) events.shift();
    changeEvents.set(monitor.id, events);

    // Trigger web intelligence updates
    await triggerBridges(monitor, scrapeResult, event);

    // Execute onChange callbacks
    if (monitor.onChange) {
      for (const callback of monitor.onChange) {
        console.log(`Triggering callback: ${callback}`);
      }
    }
  }

  // Update monitor
  monitor.lastScrape = new Date().toISOString();
  monitor.lastHash = newHash;

  // Get change type for return value
  const changeTypeForReturn = changed
    ? (history.length > 1 ? contentHasher.detectChangeType(history[history.length - 2].content, scrapeResult) : null)
    : null;

  return {
    changed,
    changeType: changeTypeForReturn ? changeTypeForReturn.type : undefined,
    previousHash: changed ? monitor.lastHash : undefined,
    newHash,
    content: scrapeResult
  };
}

/**
 * Trigger bridge updates on change
 */
async function triggerBridges(monitor: MonitoredURL, content: any, event: ChangeEvent): Promise<void> {
  // Update TwinOS
  try {
    await twinOSBridge.updateTwin(
      `web-${monitor.id}`,
      'company',
      {
        name: monitor.name,
        url: monitor.url,
        lastUpdate: event.timestamp,
        lastChange: event.changeType,
        contentSnapshot: content.title || content.content?.slice(0, 500)
      }
    );
  } catch (error) {
    console.warn('TwinOS bridge failed:', error);
  }

  // Sync to Knowledge Graph
  try {
    await knowledgeGraphBridge.syncEntities([{
      id: `web-${monitor.id}`,
      type: 'website',
      name: monitor.name,
      url: monitor.url,
      lastScraped: event.timestamp
    }]);
  } catch (error) {
    console.warn('Knowledge Graph bridge failed:', error);
  }

  // Send to AssetMind
  try {
    await assetMindConnector.sendIntelligence(
      monitor.name,
      'web_change',
      {
        changeType: event.changeType,
        severity: event.severity,
        timestamp: event.timestamp,
        content: content.title || content.content?.slice(0, 200)
      }
    );
  } catch (error) {
    console.warn('AssetMind bridge failed:', error);
  }
}

/**
 * Local scheduling fallback when REZ Scheduler is unavailable
 */
const localIntervals = new Map<string, NodeJS.Timeout>();

function scheduleLocalScrape(monitorId: string, intervalMs: number): void {
  // Clear existing interval
  if (localIntervals.has(monitorId)) {
    clearInterval(localIntervals.get(monitorId));
  }

  const interval = setInterval(async () => {
    const monitor = monitoredURLs.get(monitorId);
    if (monitor && monitor.status === 'active') {
      await scrapeAndDetect(monitor);
    }
  }, intervalMs);

  localIntervals.set(monitorId, interval);
}

// ==================== MCP SERVER ENDPOINTS ====================

/**
 * MCP tool: scrape_url
 */
app.post('/api/mcp/scrape', (req, res) => {
  const { url, selectors } = req.body;
  simpleScraper.scrape(url, { selectors })
    .then(result => res.json({ success: true, result }))
    .catch(error => res.status(500).json({ error: error.message }));
});

/**
 * MCP tool: monitor_website
 */
app.post('/api/mcp/monitor', (req, res) => {
  const { url, name, frequency = 'daily' } = req.body;
  const monitorId = uuidv4();

  const monitor: MonitoredURL = {
    id: monitorId,
    url,
    name,
    frequency,
    intervalMs: frequency === 'hourly' ? 3600000 : frequency === 'weekly' ? 604800000 : 86400000,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  monitoredURLs.set(monitorId, monitor);
  scheduleLocalScrape(monitorId, monitor.intervalMs);

  res.json({ success: true, monitorId, message: `Monitoring ${url}` });
});

/**
 * MCP tool: get_changes
 */
app.get('/api/mcp/changes', (req, res) => {
  const { monitorId, since } = req.query;
  const events = monitorId
    ? changeEvents.get(monitorId as string) || []
    : Array.from(changeEvents.values()).flat();

  let filtered = events;
  if (since) {
    const sinceDate = new Date(since as string);
    filtered = events.filter(e => new Date(e.timestamp) > sinceDate);
  }

  res.json({ success: true, events: filtered.slice(-50) });
});

/**
 * MCP tool: search_news
 */
app.get('/api/mcp/news', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.query;
    const response = await axios.get(`${WEB_INTELLIGENCE_URL}/api/news/search`, {
      params: { query, maxResults }
    });
    res.json({ success: true, articles: response.data.data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🔭 HOJAI Web Monitoring Service running on port ${PORT}`);
  console.log(`
  Endpoints:
  - GET  /health
  - POST /api/monitor          (Register URL)
  - GET  /api/monitor          (List monitors)
  - GET  /api/monitor/:id      (Get monitor details)
  - POST /api/monitor/:id/pause (Pause)
  - POST /api/monitor/:id/resume (Resume)
  - DELETE /api/monitor/:id    (Delete)
  - GET  /api/changes/:id      (Get changes)
  - GET  /api/changes          (All changes)
  - POST /api/scrape/:id       (Manual scrape)
  - POST /api/scrape-all       (Scrape all)
  - POST /api/bridges/twinos   (Update TwinOS)
  - POST /api/bridges/knowledge-graph (Sync KG)
  - POST /api/bridges/assetmind (Send to AssetMind)
  - MCP Tools:
    POST /api/mcp/scrape
    POST /api/mcp/monitor
    GET  /api/mcp/changes
    GET  /api/mcp/news
  `);
});

export default app;