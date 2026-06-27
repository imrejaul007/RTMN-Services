/**
 * ConnectorOS - Enterprise Integration Layer
 * Connects AI workers to real-world business systems
 *
 * This service provides:
 * - Unified API for 50+ external integrations
 * - OAuth2 authentication flows
 * - Webhook management
 * - Data transformation
 * - Rate limiting and retry logic
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

import { requireAuth } from '../auth-middleware/src/index.js';
import crmConnectors from './connectors/crm/index.js';
import paymentConnectors from './connectors/payments/index.js';
import commerceConnectors from './connectors/commerce/index.js';
import emailConnectors from './connectors/email/index.js';
import calendarConnectors from './connectors/calendar/index.js';
import storageConnectors from './connectors/storage/index.js';
import chatConnectors from './connectors/chat/index.js';
import accountingConnectors from './connectors/accounting/index.js';
import hrConnectors from './connectors/hr/index.js';
import projectConnectors from './connectors/project-management/index.js';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

const PORT = process.env.CONNECTOR_OS_PORT || 4585;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory stores (would be Redis in production)
const connections = new Map();      // connectionId -> connection details
const webhooks = new Map();         // webhookId -> webhook config
const syncJobs = new Map();         // jobId -> sync job status

/**
 * CONNECTION MANAGEMENT
 */

// GET /api/connectors - List all available connectors
app.get('/api/connectors', (req, res) => {
  const allConnectors = [
    ...crmConnectors.list,
    ...paymentConnectors.list,
    ...commerceConnectors.list,
    ...emailConnectors.list,
    ...calendarConnectors.list,
    ...storageConnectors.list,
    ...chatConnectors.list,
    ...accountingConnectors.list,
    ...hrConnectors.list,
    ...projectConnectors.list
  ];

  res.json({
    success: true,
    count: allConnectors.length,
    connectors: allConnectors.map(c => ({
      id: c.id,
      name: c.name,
      category: c.category,
      description: c.description,
      authType: c.authType,
      capabilities: c.capabilities,
      logo: c.logo
    }))
  });
});

// GET /api/connectors/:category - List connectors by category
app.get('/api/connectors/:category', (req, res) => {
  const { category } = req.params;
  const connectorMap = {
    crm: crmConnectors,
    payments: paymentConnectors,
    commerce: commerceConnectors,
    email: emailConnectors,
    calendar: calendarConnectors,
    storage: storageConnectors,
    chat: chatConnectors,
    accounting: accountingConnectors,
    hr: hrConnectors,
    'project-management': projectConnectors
  };

  const connector = connectorMap[category];
  if (!connector) {
    return res.status(404).json({
      success: false,
      error: `Category '${category}' not found`
    });
  }

  res.json({
    success: true,
    category,
    connectors: connector.list
  });
});

// POST /api/connections - Create a new connection
app.post('/api/connections', requireInternal, async (req, res) => {
  try {
    const { connectorId, credentials, config } = req.body;

    if (!connectorId) {
      return res.status(400).json({
        success: false,
        error: 'connectorId is required'
      });
    }

    const connectionId = uuidv4();
    const connection = {
      id: connectionId,
      connectorId,
      status: 'pending',
      credentials: encryptCredentials(credentials),
      config: config || {},
      createdAt: new Date().toISOString(),
      lastSync: null,
      metadata: {}
    };

    // Find the connector
    const connector = findConnector(connectorId);
    if (!connector) {
      return res.status(404).json({
        success: false,
        error: `Connector '${connectorId}' not found`
      });
    }

    // Test connection
    try {
      await connector.testConnection(credentials, config);
      connection.status = 'active';
    } catch (err) {
      connection.status = 'error';
      connection.error = err.message;
    }

    connections.set(connectionId, connection);

    res.status(201).json({
      success: true,
      connection: {
        id: connectionId,
        connectorId,
        status: connection.status,
        createdAt: connection.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/connections - List all connections
app.get('/api/connections', (req, res) => {
  const allConnections = Array.from(connections.values()).map(conn => ({
    id: conn.id,
    connectorId: conn.connectorId,
    status: conn.status,
    createdAt: conn.createdAt,
    lastSync: conn.lastSync,
    metadata: conn.metadata
  }));

  res.json({
    success: true,
    count: allConnections.length,
    connections: allConnections
  });
});

// GET /api/connections/:connectionId - Get connection details
app.get('/api/connections/:connectionId', (req, res) => {
  const { connectionId } = req.params;
  const connection = connections.get(connectionId);

  if (!connection) {
    return res.status(404).json({
      success: false,
      error: 'Connection not found'
    });
  }

  res.json({
    success: true,
    connection: {
      id: connection.id,
      connectorId: connection.connectorId,
      status: connection.status,
      config: connection.config,
      createdAt: connection.createdAt,
      lastSync: connection.lastSync,
      metadata: connection.metadata
    }
  });
});

// DELETE /api/connections/:connectionId - Delete a connection
app.delete('/api/connections/:connectionId', requireInternal, (req, res) => {
  const { connectionId } = req.params;

  if (!connections.has(connectionId)) {
    return res.status(404).json({
      success: false,
      error: 'Connection not found'
    });
  }

  connections.delete(connectionId);

  res.json({
    success: true,
    message: 'Connection deleted'
  });
});

// POST /api/connections/:connectionId/sync - Trigger sync
app.post('/api/connections/:connectionId/sync', requireInternal, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const { direction = 'pull', entities = [] } = req.body;

    const connection = connections.get(connectionId);
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }

    const connector = findConnector(connection.connectorId);
    if (!connector) {
      return res.status(404).json({
        success: false,
        error: 'Connector not found'
      });
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      connectionId,
      direction,
      entities,
      status: 'running',
      startedAt: new Date().toISOString(),
      completedAt: null,
      progress: 0,
      results: { created: 0, updated: 0, errors: 0 },
      errors: []
    };

    syncJobs.set(jobId, job);

    // Run sync in background
    runSync(jobId, connector, connection, direction, entities);

    res.json({
      success: true,
      job: {
        id: jobId,
        status: 'running'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/connections/:connectionId/sync/:jobId - Get sync job status
app.get('/api/connections/:connectionId/sync/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = syncJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Sync job not found'
    });
  }

  res.json({
    success: true,
    job
  });
});

/**
 * WEBHOOK MANAGEMENT
 */

// POST /api/webhooks - Create a webhook
app.post('/api/webhooks', requireInternal, (req, res) => {
  const { connectionId, events, url, secret } = req.body;

  if (!connectionId || !events || !url) {
    return res.status(400).json({
      success: false,
      error: 'connectionId, events, and url are required'
    });
  }

  const webhookId = uuidv4();
  const webhook = {
    id: webhookId,
    connectionId,
    events,
    url,
    secret: secret || uuidv4(),
    status: 'active',
    createdAt: new Date().toISOString(),
    deliveries: []
  };

  webhooks.set(webhookId, webhook);

  res.status(201).json({
    success: true,
    webhook: {
      id: webhookId,
      url,
      secret: webhook.secret,
      events,
      status: 'active'
    }
  });
});

// GET /api/webhooks - List webhooks
app.get('/api/webhooks', (req, res) => {
  const { connectionId } = req.query;

  let webhookList = Array.from(webhooks.values());
  if (connectionId) {
    webhookList = webhookList.filter(w => w.connectionId === connectionId);
  }

  res.json({
    success: true,
    count: webhookList.length,
    webhooks: webhookList.map(w => ({
      id: w.id,
      connectionId: w.connectionId,
      events: w.events,
      url: w.url,
      status: w.status,
      createdAt: w.createdAt
    }))
  });
});

// DELETE /api/webhooks/:webhookId - Delete a webhook
app.delete('/api/webhooks/:webhookId', requireInternal, (req, res) => {
  const { webhookId } = req.params;

  if (!webhooks.has(webhookId)) {
    return res.status(404).json({
      success: false,
      error: 'Webhook not found'
    });
  }

  webhooks.delete(webhookId);

  res.json({
    success: true,
    message: 'Webhook deleted'
  });
});

/**
 * AI WORKER INTEGRATION
 * These endpoints allow AI workers to interact with external systems
 */

// POST /api/ai/query - AI worker query across all connected systems
app.post('/api/ai/query', requireInternal, async (req, res) => {
  try {
    const { query, context } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'query is required'
      });
    }

    // Route query to appropriate connector(s)
    const results = await routeAIQuery(query, context);

    res.json({
      success: true,
      query,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/ai/action - Execute action via connector
app.post('/api/ai/action', requireInternal, async (req, res) => {
  try {
    const { connectorId, action, params, connectionId } = req.body;

    if (!connectorId || !action) {
      return res.status(400).json({
        success: false,
        error: 'connectorId and action are required'
      });
    }

    const connector = findConnector(connectorId);
    if (!connector) {
      return res.status(404).json({
        success: false,
        error: `Connector '${connectorId}' not found`
      });
    }

    const connection = connectionId ? connections.get(connectionId) : null;
    const credentials = connection ? decryptCredentials(connection.credentials) : null;

    if (!connector.actions[action]) {
      return res.status(400).json({
        success: false,
        error: `Action '${action}' not supported by connector '${connectorId}'`
      });
    }

    const result = await connector.actions[action](credentials, connection?.config, params);

    res.json({
      success: true,
      connectorId,
      action,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/ai/actions/:connectorId - List available actions for a connector
app.get('/api/ai/actions/:connectorId', (req, res) => {
  const { connectorId } = req.params;
  const connector = findConnector(connectorId);

  if (!connector) {
    return res.status(404).json({
      success: false,
      error: `Connector '${connectorId}' not found`
    });
  }

  res.json({
    success: true,
    connectorId,
    actions: Object.keys(connector.actions).map(action => ({
      name: action,
      description: connector.actions[action].description || 'No description',
      params: connector.actions[action].params || []
    }))
  });
});

/**
 * HELPER FUNCTIONS
 */

function findConnector(connectorId) {
  const allConnectors = [
    ...crmConnectors.list,
    ...paymentConnectors.list,
    ...commerceConnectors.list,
    ...emailConnectors.list,
    ...calendarConnectors.list,
    ...storageConnectors.list,
    ...chatConnectors.list,
    ...accountingConnectors.list,
    ...hrConnectors.list,
    ...projectConnectors.list
  ];

  return allConnectors.find(c => c.id === connectorId);
}

function encryptCredentials(credentials) {
  // In production, use proper encryption (AWS KMS, etc.)
  return Buffer.from(JSON.stringify(credentials)).toString('base64');
}

function decryptCredentials(encrypted) {
  return JSON.parse(Buffer.from(encrypted, 'base64').toString());
}

async function runSync(jobId, connector, connection, direction, entities) {
  const job = syncJobs.get(jobId);
  const credentials = decryptCredentials(connection.credentials);

  try {
    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      job.progress = Math.round(((i + 1) / entities.length) * 100);

      try {
        if (direction === 'pull') {
          await connector.pullEntity(credentials, connection.config, entity);
          job.results.created++;
        } else {
          await connector.pushEntity(credentials, connection.config, entity);
          job.results.updated++;
        }
      } catch (err) {
        job.results.errors++;
        job.errors.push({ entity, error: err.message });
      }

      syncJobs.set(jobId, job);
    }

    job.status = 'completed';
    job.completedAt = new Date().toISOString();

    // Update connection last sync
    connection.lastSync = new Date().toISOString();
    connections.set(connection.id, connection);
  } catch (error) {
    job.status = 'failed';
    job.errors.push({ fatal: error.message });
  }

  syncJobs.set(jobId, job);
}

async function routeAIQuery(query, context) {
  // Simple query routing based on keywords
  // In production, use LLM to determine routing
  const queryLower = query.toLowerCase();
  const results = [];

  if (queryLower.includes('customer') || queryLower.includes('contact')) {
    const hubspot = crmConnectors.list.find(c => c.id === 'hubspot');
    if (hubspot) {
      results.push({
        connector: 'hubspot',
        data: await hubspot.search(credentials, { query })
      });
    }
  }

  if (queryLower.includes('payment') || queryLower.includes('invoice')) {
    const stripe = paymentConnectors.list.find(c => c.id === 'stripe');
    if (stripe) {
      results.push({
        connector: 'stripe',
        data: await stripe.search(credentials, { query })
      });
    }
  }

  if (queryLower.includes('calendar') || queryLower.includes('meeting')) {
    const googleCalendar = calendarConnectors.list.find(c => c.id === 'google-calendar');
    if (googleCalendar) {
      results.push({
        connector: 'google-calendar',
        data: await googleCalendar.search(credentials, { query })
      });
    }
  }

  return results;
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'connector-os',
    status: 'healthy',
    connectors: {
      crm: crmConnectors.list.length,
      payments: paymentConnectors.list.length,
      commerce: commerceConnectors.list.length,
      email: emailConnectors.list.length,
      calendar: calendarConnectors.list.length,
      storage: storageConnectors.list.length,
      chat: chatConnectors.list.length,
      accounting: accountingConnectors.list.length,
      hr: hrConnectors.list.length,
      'project-management': projectConnectors.list.length
    },
    connections: connections.size,
    webhooks: webhooks.size
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ConnectorOS running on port ${PORT}`);
  console.log(`   ${crmConnectors.list.length} CRM connectors`);
  console.log(`   ${paymentConnectors.list.length} Payment connectors`);
  console.log(`   ${commerceConnectors.list.length} Commerce connectors`);
  console.log(`   ${emailConnectors.list.length} Email connectors`);
  console.log(`   ${calendarConnectors.list.length} Calendar connectors`);
  console.log(`   ${storageConnectors.list.length} Storage connectors`);
  console.log(`   ${chatConnectors.list.length} Chat connectors`);
  console.log(`   ${accountingConnectors.list.length} Accounting connectors`);
  console.log(`   ${hrConnectors.list.length} HR connectors`);
  console.log(`   ${projectConnectors.list.length} Project Management connectors`);
});

export default app;
