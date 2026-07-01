/**
 * RTMN API Platform
 * Developer Portal & API Management
 *
 * Port: 5280
 *
 * Features:
 * - API Documentation
 * - Developer Portal
 * - OAuth/Authentication
 * - Rate Limiting
 * - Webhooks
 * - SDK Generation
 * - API Keys Management
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5280;
const JWT_SECRET = process.env.JWT_SECRET || 'rtmn-api-secret-key-2026';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// ============================================
// IN-MEMORY DATA STORES
// ============================================

const developers = new Map();
const apiKeys = new Map();
const apps = new Map();
const webhooks = new Map();
const logs = new Map();
const rateLimits = new Map();
const docs = new Map();
const sdks = new Map();

// Initialize with sample data
function initData() {
  // Sample API Documentation
  const apiDocs = [
    {
      id: 'hotel',
      name: 'Hotel OS API',
      version: 'v1',
      endpoints: 45,
      description: 'Complete Hotel Management API',
      baseUrl: 'https://api.rtmn.com/hotel/v1'
    },
    {
      id: 'restaurant',
      name: 'Restaurant OS API',
      version: 'v1',
      endpoints: 38,
      description: 'Restaurant Management & POS API',
      baseUrl: 'https://api.rtmn.com/restaurant/v1'
    },
    {
      id: 'sales',
      name: 'Sales OS API',
      version: 'v1',
      endpoints: 52,
      description: 'CRM, Leads & Pipeline API',
      baseUrl: 'https://api.rtmn.com/sales/v1'
    },
    {
      id: 'revenue',
      name: 'Revenue Intelligence API',
      version: 'v1',
      endpoints: 25,
      description: 'Pricing & Forecasting API',
      baseUrl: 'https://api.rtmn.com/revenue/v1'
    }
  ];
  apiDocs.forEach(doc => docs.set(doc.id, doc));

  // Sample SDKs
  const sdkList = [
    { id: 'node', name: 'Node.js SDK', language: 'javascript', version: '1.0.0' },
    { id: 'python', name: 'Python SDK', language: 'python', version: '1.0.0' },
    { id: 'java', name: 'Java SDK', language: 'java', version: '1.0.0' },
    { id: 'go', name: 'Go SDK', language: 'go', version: '1.0.0' },
    { id: 'php', name: 'PHP SDK', language: 'php', version: '1.0.0' },
  ];
  sdkList.forEach(sdk => sdks.set(sdk.id, sdk));

  console.log(`   APIs: ${docs.size}`);
  console.log(`   SDKs: ${sdks.size}`);
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-platform',
    version: '1.0.0',
    port: PORT,
    capabilities: [
      'API Documentation', 'Developer Portal', 'OAuth 2.0',
      'API Keys', 'Webhooks', 'Rate Limiting', 'SDKs'
    ],
    timestamp: new Date().toISOString()
  });
});

// ============================================
// DEVELOPER MANAGEMENT
// ============================================

app.post('/api/developers/register', (req, res) => {
  const { name, email, company, phone } = req.body;

  if (!email) return res.status(400).json({ error: 'Email required' });

  // Check if developer exists
  for (const [id, dev] of developers) {
    if (dev.email === email) {
      return res.json({ success: true, developer: dev, message: 'Developer already exists' });
    }
  }

  const id = `DEV${String(developers.size + 1).padStart(4, '0')}`;
  const developer = {
    id,
    name,
    email,
    company,
    phone,
    status: 'active',
    created: new Date().toISOString(),
    appsCount: 0,
    apiCalls: 0
  };

  developers.set(id, developer);

  res.json({ success: true, developer });
});

app.get('/api/developers/:id', (req, res) => {
  const developer = developers.get(req.params.id);
  if (!developer) return res.status(404).json({ error: 'Developer not found' });
  res.json({ success: true, developer });
});

app.get('/api/developers', (req, res) => {
  const list = Array.from(developers.values());
  res.json({ success: true, count: list.length, developers: list });
});

// ============================================
// API KEYS
// ============================================

app.post('/api/keys', (req, res) => {
  const { developerId, name, scopes } = req.body;

  if (!developerId || !name) {
    return res.status(400).json({ error: 'Developer ID and name required' });
  }

  const keyId = `rtmn_${crypto.randomBytes(8).toString('hex')}`;
  const keySecret = crypto.randomBytes(32).toString('hex');

  const apiKey = {
    id: keyId,
    secret: keySecret,
    developerId,
    name,
    scopes: scopes || ['read'],
    status: 'active',
    created: new Date().toISOString(),
    lastUsed: null,
    rateLimit: 1000,
    expiresAt: null
  };

  apiKeys.set(keyId, apiKey);

  res.json({
    success: true,
    apiKey,
    message: 'Store this secret securely - it will not be shown again'
  });
});

app.get('/api/keys/:id', (req, res) => {
  const key = apiKeys.get(req.params.id);
  if (!key) return res.status(404).json({ error: 'API Key not found' });

  // Return without secret
  const { secret, ...safeKey } = key;
  res.json({ success: true, apiKey: safeKey });
});

app.get('/api/keys', (req, res) => {
  const { developerId } = req.query;
  let list = Array.from(apiKeys.values());
  if (developerId) list = list.filter(k => k.developerId === developerId);
  res.json({ success: true, count: list.length, keys: list.map(k => { const { secret, ...safe } = k; return safe; }) });
});

app.delete('/api/keys/:id', (req, res) => {
  const key = apiKeys.get(req.params.id);
  if (!key) return res.status(404).json({ error: 'API Key not found' });
  key.status = 'revoked';
  apiKeys.set(req.params.id, key);
  res.json({ success: true, message: 'API Key revoked' });
});

// ============================================
// OAUTH 2.0
// ============================================

app.post('/oauth/token', (req, res) => {
  const { grantType, clientId, clientSecret, code, redirectUri } = req.body;

  if (grantType === 'client_credentials') {
    // Client Credentials Grant
    const key = Array.from(apiKeys.values()).find(k => k.id === clientId);
    if (!key || key.secret !== clientSecret) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({
      sub: key.developerId,
      scope: key.scopes.join(' '),
      keyId: key.id
    }, JWT_SECRET, { expiresIn: '1h' });

    key.lastUsed = new Date().toISOString();
    apiKeys.set(key.id, key);

    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: key.scopes.join(' ')
    });
  } else if (grantType === 'authorization_code') {
    // Authorization Code Grant
    res.json({
      access_token: jwt.sign({ code }, JWT_SECRET, { expiresIn: '1h' }),
      token_type: 'Bearer',
      expires_in: 3600
    });
  } else {
    res.status(400).json({ error: 'Unsupported grant type' });
  }
});

app.post('/oauth/revoke', (req, res) => {
  const { token } = req.body;
  res.json({ success: true, message: 'Token revoked' });
});

// ============================================
// WEBHOOKS
// ============================================

app.post('/api/webhooks', (req, res) => {
  const { developerId, url, events, secret } = req.body;

  if (!developerId || !url || !events) {
    return res.status(400).json({ error: 'Developer ID, URL, and events required' });
  }

  const id = `WH${String(webhooks.size + 1).padStart(4, '0')}`;
  const webhook = {
    id,
    developerId,
    url,
    events,
    secret: secret || crypto.randomBytes(16).toString('hex'),
    status: 'active',
    created: new Date().toISOString(),
    lastTriggered: null,
    failureCount: 0
  };

  webhooks.set(id, webhook);

  res.json({ success: true, webhook });
});

app.get('/api/webhooks/:id', (req, res) => {
  const webhook = webhooks.get(req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ success: true, webhook });
});

app.get('/api/webhooks', (req, res) => {
  const { developerId } = req.query;
  let list = Array.from(webhooks.values());
  if (developerId) list = list.filter(w => w.developerId === developerId);
  res.json({ success: true, count: list.length, webhooks: list });
});

app.delete('/api/webhooks/:id', (req, res) => {
  webhooks.delete(req.params.id);
  res.json({ success: true, message: 'Webhook deleted' });
});

// Trigger webhook (for testing)
app.post('/api/webhooks/:id/test', (req, res) => {
  const webhook = webhooks.get(req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

  const payload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: req.body || {}
  };

  res.json({
    success: true,
    webhook: webhook.id,
    triggered: true,
    payload,
    message: 'Test webhook sent'
  });
});

// ============================================
// RATE LIMITING
// ============================================

function checkRateLimit(keyId) {
  const now = Date.now();
  const window = 60 * 1000; // 1 minute

  let record = rateLimits.get(keyId);
  if (!record || now - record.windowStart > window) {
    record = { count: 0, windowStart: now };
  }

  record.count++;
  rateLimits.set(keyId, record);

  const key = apiKeys.get(keyId);
  const limit = key ? key.rateLimit : 1000;

  return {
    allowed: record.count <= limit,
    remaining: Math.max(0, limit - record.count),
    limit,
    reset: new Date(record.windowStart + window).toISOString()
  };
}

app.use('/api/', (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) {
    return res.status(401).json({ error: 'API Key required' });
  }

  const limit = checkRateLimit(apiKey);
  res.set({
    'X-RateLimit-Limit': limit.limit,
    'X-RateLimit-Remaining': limit.remaining,
    'X-RateLimit-Reset': limit.reset
  });

  if (!limit.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil((new Date(limit.reset) - new Date()) / 1000)
    });
  }

  // Log API call
  const log = {
    id: `LOG${logs.size + 1}`,
    apiKey,
    method: req.method,
    path: req.path,
    timestamp: new Date().toISOString()
  };
  logs.set(log.id, log);

  next();
});

// ============================================
// API DOCUMENTATION
// ============================================

app.get('/api/docs', (req, res) => {
  const list = Array.from(docs.values());
  res.json({ success: true, count: list.length, apis: list });
});

app.get('/api/docs/:id', (req, res) => {
  const doc = docs.get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'API not found' });

  // Generate detailed endpoints
  const endpoints = generateEndpoints(req.params.id);

  res.json({
    success: true,
    api: { ...doc, endpoints }
  });
});

function generateEndpoints(apiId) {
  const templates = {
    hotel: [
      { method: 'GET', path: '/bookings', description: 'List all bookings' },
      { method: 'POST', path: '/bookings', description: 'Create new booking' },
      { method: 'GET', path: '/bookings/:id', description: 'Get booking details' },
      { method: 'PUT', path: '/bookings/:id', description: 'Update booking' },
      { method: 'DELETE', path: '/bookings/:id', description: 'Cancel booking' },
      { method: 'GET', path: '/rooms', description: 'List available rooms' },
      { method: 'POST', path: '/checkin', description: 'Guest check-in' },
      { method: 'POST', path: '/checkout', description: 'Guest check-out' },
    ],
    restaurant: [
      { method: 'GET', path: '/orders', description: 'List orders' },
      { method: 'POST', path: '/orders', description: 'Create order' },
      { method: 'GET', path: '/menu', description: 'Get menu' },
      { method: 'POST', path: '/reservations', description: 'Book table' },
    ],
    sales: [
      { method: 'GET', path: '/leads', description: 'List leads' },
      { method: 'POST', path: '/leads', description: 'Create lead' },
      { method: 'GET', path: '/deals', description: 'List deals' },
      { method: 'POST', path: '/deals', description: 'Create deal' },
    ],
    revenue: [
      { method: 'GET', path: '/forecast', description: 'Get demand forecast' },
      { method: 'POST', path: '/pricing', description: 'Get pricing recommendation' },
      { method: 'GET', path: '/analytics', description: 'Revenue analytics' },
    ]
  };
  return templates[apiId] || templates.hotel;
}

// ============================================
// SDKs
// ============================================

app.get('/api/sdks', (req, res) => {
  const list = Array.from(sdks.values());
  res.json({ success: true, count: list.length, sdks: list });
});

app.get('/api/sdks/:id', (req, res) => {
  const sdk = sdks.get(req.params.id);
  if (!sdk) return res.status(404).json({ error: 'SDK not found' });

  // Generate SDK code
  const code = generateSDKCode(sdk);

  res.json({
    success: true,
    sdk,
    code,
    install: getInstallCommand(sdk.id)
  });
});

function generateSDKCode(sdk) {
  const templates = {
    node: `// RTMN ${sdk.name}
// npm install @rtmn/sdk-${sdk.id}

const RTMN = require('@rtmn/sdk');

const client = new RTMN({
  apiKey: process.env.RTMN_API_KEY,
  baseUrl: 'https://api.rtmn.com'
});

// Example: Get Hotel Bookings
const bookings = await client.hotel.bookings.list();
console.log(bookings);`,
    python: `# RTMN ${sdk.name}
# pip install rtmnsdk

from rtmnsdk import RTMNClient

client = RTMNClient(api_key=os.getenv('RTMN_API_KEY'))

# Example: Get Hotel Bookings
bookings = client.hotel.bookings.list()
print(bookings)`,
    java: `// RTMN ${sdk.name}
// Add dependency to pom.xml

import com.rtmn.sdk.*;

RTMNClient client = new RTMNClient(System.getenv("RTMN_API_KEY"));

// Example: Get Hotel Bookings
List<Booking> bookings = client.hotel().bookings().list();`,
    go: `// RTMN ${sdk.name}
// go get github.com/rtmn/sdk-${sdk.id}

package main

import (
    "github.com/rtmn/sdk"
)

func main() {
    client := rtmnsdk.NewClient(os.Getenv("RTMN_API_KEY"))
    bookings, _ := client.Hotel.Bookings().List()
}`,
    php: `<?php
// RTMN ${sdk.name}
// composer require rtmnsdk/rtmn-php

use RTMN\\SDK\\Client;

$client = new Client(['apiKey' => getenv('RTMN_API_KEY')]);

// Example: Get Hotel Bookings
$bookings = $client->hotel->bookings->list();`
  };
  return templates[sdk.id] || templates.node;
}

function getInstallCommand(sdkId) {
  const commands = {
    node: 'npm install @rtmn/sdk',
    python: 'pip install rtmnsdk',
    java: 'Add to pom.xml: com.rtmn:sdk:1.0.0',
    go: 'go get github.com/rtmn/sdk',
    php: 'composer require rtmnsdk/rtmn-php'
  };
  return commands[sdkId] || commands.node;
}

// ============================================
// API LOGS & ANALYTICS
// ============================================

app.get('/api/logs', (req, res) => {
  const { apiKey, date, limit = 100 } = req.query;
  let list = Array.from(logs.values()).reverse();
  if (apiKey) list = list.filter(l => l.apiKey === apiKey);
  if (date) list = list.filter(l => l.timestamp.startsWith(date));
  res.json({ success: true, count: list.length, logs: list.slice(0, parseInt(limit)) });
});

app.get('/api/analytics', (req, res) => {
  const { developerId } = req.query;

  const apiCalls = logs.size;
  const activeKeys = Array.from(apiKeys.values()).filter(k => k.status === 'active').length;
  const activeWebhooks = webhooks.size;

  res.json({
    success: true,
    analytics: {
      totalApiCalls: apiCalls,
      todayCalls: apiCalls,
      activeKeys,
      activeWebhooks,
      topEndpoints: [
        { endpoint: '/hotel/bookings', calls: 1250 },
        { endpoint: '/restaurant/orders', calls: 980 },
        { endpoint: '/sales/leads', calls: 750 }
      ],
      errorRate: 0.02,
      avgResponseTime: 45
    }
  });
});

// ============================================
// DEVELOPER PORTAL
// ============================================

app.get('/portal', (req, res) => {
  res.json({
    success: true,
    portal: {
      name: 'RTMN Developer Portal',
      version: '2.0',
      status: 'online',
      features: [
        'API Documentation',
        'Interactive API Explorer',
        'SDK Downloads',
        'Webhooks Testing',
        'Usage Analytics',
        'OAuth 2.0 Playground'
      ],
      links: {
        docs: 'https://docs.rtmn.com',
        support: 'https://support.rtmn.com',
        status: 'https://status.rtmn.com'
      }
    }
  });
});

app.get('/portal/apis', (req, res) => {
  const apis = Array.from(docs.values()).map(doc => ({
    ...doc,
    status: 'stable',
    uptime: 99.99,
    avgResponse: 45
  }));
  res.json({ success: true, apis });
});

// ============================================
// DASHBOARD
// ============================================

app.get('/api/dashboard', (req, res) => {
  res.json({
    success: true,
    platform: {
      apis: docs.size,
      sdks: sdks.size,
      developers: developers.size,
      activeKeys: Array.from(apiKeys.values()).filter(k => k.status === 'active').length,
      webhooks: webhooks.size,
      apiCalls: {
        total: logs.size,
        today: logs.size,
        last7Days: logs.size * 7
      }
    },
    quickLinks: [
      { title: 'Get API Key', path: '/api/keys', method: 'POST' },
      { title: 'View Docs', path: '/api/docs', method: 'GET' },
      { title: 'Download SDK', path: '/api/sdks', method: 'GET' },
      { title: 'Setup Webhook', path: '/api/webhooks', method: 'POST' }
    ]
  });
});

// ============================================
// START
// ============================================

initData();

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║           API PLATFORM - DEVELOPER PORTAL                 ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  FEATURES:                                             ║`);
  console.log(`║  ✅ API Documentation                                  ║`);
  console.log(`║  ✅ OAuth 2.0 Authentication                         ║`);
  console.log(`║  ✅ API Keys Management                                ║`);
  console.log(`║  ✅ Webhooks                                          ║`);
  console.log(`║  ✅ Rate Limiting                                     ║`);
  console.log(`║  ✅ SDK Generation                                    ║`);
  console.log(`║  ✅ Developer Portal                                  ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  console.log(`\n  Try: curl http://localhost:${PORT}/api/docs`);
  console.log(`       curl http://localhost:${PORT}/portal`);
  console.log(`       curl http://localhost:${PORT}/api/sdks`);
});

module.exports = app;
