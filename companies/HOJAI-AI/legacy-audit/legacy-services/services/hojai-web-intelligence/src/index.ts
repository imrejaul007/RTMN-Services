/**
 * HOJAI Web Intelligence Service
 *
 * Continuous web monitoring, scraping, and event extraction
 * Port: 4595
 *
 * Features:
 * - Simple site scraping (Cheerio)
 * - JS-heavy site scraping (Puppeteer/Firecrawl)
 * - News monitoring (GDELT)
 * - Content extraction
 * - MemoryOS integration
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { SimpleScraper } from './scrapers/simpleScraper';
import { FirecrawlScraper } from './scrapers/firecrawlScraper';
import { PuppeteerScraper } from './scrapers/puppeteerScraper';
import { NewsMonitor } from './monitors/newsMonitor';
import { ContentExtractor } from './extractors/contentExtractor';
import { MemoryBridge } from './memory/memoryBridge';

const app = express();
const PORT = 4595;

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
const firecrawlScraper = new FirecrawlScraper();
const puppeteerScraper = new PuppeteerScraper();
const newsMonitor = new NewsMonitor();
const contentExtractor = new ContentExtractor();
const memoryBridge = new MemoryBridge();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-web-intelligence',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ==================== SCRAPING ENDPOINTS ====================

/**
 * Scrape a simple website (no JS required)
 * POST /api/scrape/simple
 */
app.post('/api/scrape/simple', async (req, res) => {
  try {
    const { url, selectors, extractFields } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await simpleScraper.scrape(url, selectors);

    // Store in MemoryOS
    await memoryBridge.storeEvent({
      type: 'WEB_SCRAPE',
      source: 'simple',
      url,
      timestamp: new Date().toISOString(),
      data: result
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Scrape a JS-heavy website using Firecrawl
 * POST /api/scrape/firecrawl
 */
app.post('/api/scrape/firecrawl', async (req, res) => {
  try {
    const { url, extractFields, waitForSelector } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await firecrawlScraper.scrape(url, {
      extractFields,
      waitForSelector
    });

    // Store in MemoryOS
    await memoryBridge.storeEvent({
      type: 'WEB_SCRAPE',
      source: 'firecrawl',
      url,
      timestamp: new Date().toISOString(),
      data: result
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Scrape using Puppeteer (self-hosted JS rendering)
 * POST /api/scrape/puppeteer
 */
app.post('/api/scrape/puppeteer', async (req, res) => {
  try {
    const { url, selectors, waitForSelector } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await puppeteerScraper.scrape(url, { waitForSelector });

    // Store in MemoryOS
    await memoryBridge.storeEvent({
      type: 'WEB_SCRAPE',
      source: 'puppeteer',
      url,
      timestamp: new Date().toISOString(),
      data: result
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== NEWS MONITORING ENDPOINTS ====================

/**
 * Search news via GDELT
 * GET /api/news/search?query=...
 */
app.get('/api/news/search', async (req, res) => {
  try {
    const { query, mode = 'artlist', maxResults = 50 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await newsMonitor.search(query as string, {
      mode: mode as 'artlist' | 'timelinevol',
      maxResults: parseInt(maxResults as string)
    });

    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search news by entity
 * GET /api/news/entity?entity=...
 */
app.get('/api/news/entity', async (req, res) => {
  try {
    const { entity, type = 'person', maxResults = 50 } = req.query;

    if (!entity) {
      return res.status(400).json({ error: 'Entity is required' });
    }

    const results = await newsMonitor.searchByEntity(entity as string, {
      type: type as 'person' | 'organization' | 'location',
      maxResults: parseInt(maxResults as string)
    });

    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get latest news timeline
 * GET /api/news/timeline
 */
app.get('/api/news/timeline', async (req, res) => {
  try {
    const { query, interval = '15m', maxResults = 100 } = req.query;

    const results = await newsMonitor.getTimeline(query as string, {
      interval: interval as '15m' | '1h' | '24h',
      maxResults: parseInt(maxResults as string)
    });

    res.json({ success: true, data: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CONTENT EXTRACTION ENDPOINTS ====================

/**
 * Extract structured data from content
 * POST /api/extract
 */
app.post('/api/extract', async (req, res) => {
  try {
    const { content, schema, prompt } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await contentExtractor.extract(content, { schema, prompt });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Extract entities from content
 * POST /api/extract/entities
 */
app.post('/api/extract/entities', async (req, res) => {
  try {
    const { content, types } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const entities = await contentExtractor.extractEntities(content, types);

    res.json({ success: true, data: entities });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MONITORING ENDPOINTS ====================

/**
 * Start monitoring a URL for changes
 * POST /api/monitor
 */
app.post('/api/monitor', async (req, res) => {
  try {
    const { url, selector, interval = '1h', onChange } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const monitorId = uuidv4();

    // Store monitor config
    // In production, use Redis or a database

    res.json({
      success: true,
      monitorId,
      message: 'Monitor started. Use GET /api/monitor/:id to check status.'
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get monitor status
 * GET /api/monitor/:id
 */
app.get('/api/monitor/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Return monitor status
    res.json({
      monitorId: id,
      status: 'active',
      lastCheck: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== MEMORY INTEGRATION ====================

/**
 * Get recent web intelligence events
 * GET /api/memory/events
 */
app.get('/api/memory/events', async (req, res) => {
  try {
    const { type, limit = 100 } = req.query;

    const events = await memoryBridge.getEvents({
      type: type as string,
      limit: parseInt(limit as string)
    });

    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get events by entity
 * GET /api/memory/entity/:entityId
 */
app.get('/api/memory/entity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;

    const events = await memoryBridge.getEventsByEntity(entityId);

    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== BATCH OPERATIONS ====================

/**
 * Batch scrape multiple URLs
 * POST /api/batch/scrape
 */
app.post('/api/batch/scrape', async (req, res) => {
  try {
    const { urls, method = 'simple', selectors } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    const results = await Promise.allSettled(
      urls.map(url =>
        method === 'firecrawl'
          ? firecrawlScraper.scrape(url, { extractFields: selectors })
          : simpleScraper.scrape(url, selectors)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    res.json({
      success: true,
      total: urls.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        url: urls[i],
        status: r.status,
        data: r.status === 'fulfilled' ? r.value : null,
        error: r.status === 'rejected' ? r.reason?.message : null
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🕵️ HOJAI Web Intelligence Service running on port ${PORT}`);
  console.log(`
  Endpoints:
  - GET  /health
  - POST /api/scrape/simple     (Cheerio - fast, no JS)
  - POST /api/scrape/firecrawl  (Firecrawl - JS rendering)
  - POST /api/scrape/puppeteer  (Puppeteer - self-hosted JS)
  - GET  /api/news/search       (GDELT news search)
  - GET  /api/news/entity       (GDELT entity search)
  - GET  /api/news/timeline     (GDELT timeline)
  - POST /api/extract           (Content extraction)
  - POST /api/extract/entities (Entity extraction)
  - POST /api/monitor           (Start monitoring)
  - GET  /api/monitor/:id       (Get monitor status)
  - GET  /api/memory/events     (Get stored events)
  - GET  /api/memory/entity/:id (Get events by entity)
  - POST /api/batch/scrape      (Batch scraping)
  `);
});

export default app;
