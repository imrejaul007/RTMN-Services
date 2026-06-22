/**
 * HOJAI Web Intelligence MCP Server
 *
 * Provides standardized tool access for AI agents to web intelligence
 * Port: 4597
 *
 * MCP Tools:
 * - scrape_url(url, options)
 * - search_news(query, filters)
 * - monitor_website(url, frequency)
 * - get_entity_news(entity_name)
 * - extract_entities(content)
 * - get_website_changes(since)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import axios from 'axios';

const app = express();
const PORT = 4597;

// Configuration
const WEB_INTELLIGENCE_URL = process.env.WEB_INTELLIGENCE_URL || 'http://localhost:4595';
const WEB_MONITORING_URL = process.env.WEB_MONITORING_URL || 'http://localhost:4596';

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(helmet());
app.use(express.json({ limit: "10kb" }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-web-intelligence-mcp',
    version: '1.0.0',
    tools: [
      'scrape_url',
      'search_news',
      'monitor_website',
      'get_entity_news',
      'extract_entities',
      'get_website_changes'
    ]
  });
});

// ==================== MCP TOOLS ====================

/**
 * MCP Tool: scrape_url
 * Scrape a URL and extract content
 */
app.post('/tools/scrape_url', async (req, res) => {
  try {
    const { url, selectors } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const response = await axios.post(`${WEB_INTELLIGENCE_URL}/api/scrape/simple`, {
      url,
      selectors
    });

    res.json({
      tool: 'scrape_url',
      success: true,
      result: response.data.data
    });
  } catch (error: any) {
    res.status(500).json({
      tool: 'scrape_url',
      success: false,
      error: error.message
    });
  }
});

/**
 * MCP Tool: search_news
 * Search for news articles
 */
app.get('/tools/search_news', async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    const response = await axios.get(`${WEB_INTELLIGENCE_URL}/api/news/search`, {
      params: { query, maxResults }
    });

    res.json({
      tool: 'search_news',
      success: true,
      result: response.data.data
    });
  } catch (error: any) {
    res.status(500).json({
      tool: 'search_news',
      success: false,
      error: error.message
    });
  }
});

/**
 * MCP Tool: monitor_website
 * Start monitoring a website for changes
 */
app.post('/tools/monitor_website', async (req, res) => {
  try {
    const { url, name, frequency = 'daily' } = req.body;

    if (!url || !name) {
      return res.status(400).json({ error: 'url and name are required' });
    }

    const response = await axios.post(`${WEB_MONITORING_URL}/api/monitor`, {
      url,
      name,
      frequency
    });

    res.json({
      tool: 'monitor_website',
      success: true,
      result: response.data
    });
  } catch (error: any) {
    res.status(500).json({
      tool: 'monitor_website',
      success: false,
      error: error.message
    });
  }
});

/**
 * MCP Tool: get_entity_news
 * Get news about a specific entity (company, person, etc.)
 */
app.get('/tools/get_entity_news', async (req, res) => {
  try {
    const { entity, type = 'organization', maxResults = 10 } = req.query;

    if (!entity) {
      return res.status(400).json({ error: 'entity is required' });
    }

    const response = await axios.get(`${WEB_INTELLIGENCE_URL}/api/news/entity`, {
      params: { entity, type, maxResults }
    });

    res.json({
      tool: 'get_entity_news',
      success: true,
      result: response.data.data
    });
  } catch (error: any) {
    res.status(500).json({
      tool: 'get_entity_news',
      success: false,
      error: error.message
    });
  }
});

/**
 * MCP Tool: extract_entities
 * Extract named entities from content
 */
app.post('/tools/extract_entities', async (req, res) => {
  try {
    const { content, types } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    const response = await axios.post(`${WEB_INTELLIGENCE_URL}/api/extract/entities`, {
      content,
      types
    });

    res.json({
      tool: 'extract_entities',
      success: true,
      result: response.data.data
    });
  } catch (error: any) {
    res.status(500).json({
      tool: 'extract_entities',
      success: false,
      error: error.message
    });
  }
});

/**
 * MCP Tool: get_website_changes
 * Get recent website changes
 */
app.get('/tools/get_website_changes', async (req, res) => {
  try {
    const { monitorId, since } = req.query;

    const endpoint = monitorId
      ? `${WEB_MONITORING_URL}/api/changes/${monitorId}`
      : `${WEB_MONITORING_URL}/api/changes`;

    const params: any = {};
    if (since) params.since = since;

    const response = await axios.get(endpoint, { params });

    res.json({
      tool: 'get_website_changes',
      success: true,
      result: response.data
    });
  } catch (error: any) {
    res.status(500).json({
      tool: 'get_website_changes',
      success: false,
      error: error.message
    });
  }
});

/**
 * MCP Tool: batch_scrape
 * Scrape multiple URLs at once
 */
app.post('/tools/batch_scrape', async (req, res) => {
  try {
    const { urls, method = 'simple' } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ error: 'urls array is required' });
    }

    const response = await axios.post(`${WEB_INTELLIGENCE_URL}/api/batch/scrape`, {
      urls,
      method
    });

    res.json({
      tool: 'batch_scrape',
      success: true,
      result: response.data
    });
  } catch (error: any) {
    res.status(500).json({
      tool: 'batch_scrape',
      success: false,
      error: error.message
    });
  }
});

/**
 * MCP Tool: enrich_company
 * Get comprehensive intelligence about a company
 */
app.post('/tools/enrich_company', async (req, res) => {
  try {
    const { companyName, website, includeNews = true, includeMonitoring = false } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: 'companyName is required' });
    }

    const result: any = {
      company: companyName
    };

    // Get news
    if (includeNews) {
      try {
        const newsResponse = await axios.get(`${WEB_INTELLIGENCE_URL}/api/news/search`, {
          params: { query: companyName, maxResults: 5 }
        });
        result.news = newsResponse.data.data;
      } catch {
        result.news = [];
      }
    }

    // Scrape website if provided
    if (website) {
      try {
        const scrapeResponse = await axios.post(`${WEB_INTELLIGENCE_URL}/api/scrape/simple`, {
          url: website
        });
        result.website = scrapeResponse.data.data;
      } catch {
        result.website = null;
      }
    }

    // Setup monitoring if requested
    if (includeMonitoring && website) {
      try {
        const monitorResponse = await axios.post(`${WEB_MONITORING_URL}/api/monitor`, {
          url: website,
          name: `${companyName} Website`,
          frequency: 'daily'
        });
        result.monitoring = {
          enabled: true,
          monitorId: monitorResponse.data.monitorId
        };
      } catch {
        result.monitoring = { enabled: false };
      }
    }

    res.json({
      tool: 'enrich_company',
      success: true,
      result
    });
  } catch (error: any) {
    res.status(500).json({
      tool: 'enrich_company',
      success: false,
      error: error.message
    });
  }
});

// ==================== MCP DISCOVERY ====================

/**
 * MCP tools manifest - used by AI agents to discover available tools
 */
app.get('/tools', (req, res) => {
  res.json({
    tools: [
      {
        name: 'scrape_url',
        description: 'Scrape content from a URL using Cheerio',
        input: { url: 'string', selectors: 'object (optional)' },
        output: { title: 'string', content: 'string', links: 'string[]' }
      },
      {
        name: 'search_news',
        description: 'Search for news articles using GDELT',
        input: { query: 'string', maxResults: 'number (optional, default 10)' },
        output: { articles: 'array' }
      },
      {
        name: 'monitor_website',
        description: 'Start monitoring a website for changes',
        input: { url: 'string', name: 'string', frequency: 'hourly|daily|weekly (optional)' },
        output: { monitorId: 'string' }
      },
      {
        name: 'get_entity_news',
        description: 'Get news about a specific entity',
        input: { entity: 'string', type: 'person|organization|location (optional)', maxResults: 'number (optional)' },
        output: { articles: 'array' }
      },
      {
        name: 'extract_entities',
        description: 'Extract named entities from text',
        input: { content: 'string', types: 'string[] (optional)' },
        output: { entities: 'array' }
      },
      {
        name: 'get_website_changes',
        description: 'Get recent website changes',
        input: { monitorId: 'string (optional)', since: 'ISO date (optional)' },
        output: { events: 'array' }
      },
      {
        name: 'batch_scrape',
        description: 'Scrape multiple URLs at once',
        input: { urls: 'string[]', method: 'simple|firecrawl (optional)' },
        output: { results: 'array' }
      },
      {
        name: 'enrich_company',
        description: 'Get comprehensive intelligence about a company',
        input: { companyName: 'string', website: 'string (optional)', includeNews: 'boolean (optional)', includeMonitoring: 'boolean (optional)' },
        output: { company: 'object', news: 'array', website: 'object', monitoring: 'object' }
      }
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🤖 HOJAI Web Intelligence MCP Server running on port ${PORT}`);
  console.log(`
  MCP Tools Available:
  - POST /tools/scrape_url
  - GET  /tools/search_news
  - POST /tools/monitor_website
  - GET  /tools/get_entity_news
  - POST /tools/extract_entities
  - GET  /tools/get_website_changes
  - POST /tools/batch_scrape
  - POST /tools/enrich_company
  - GET  /tools (discovery)
  `);
});

export default app;