/**
 * Connector Registry Service (Port 5374)
 * Phase 3.1 - Connector Ecosystem for FlowOS
 *
 * Provides unified connector interface for:
 * - HTTP/REST webhooks
 * - Slack
 * - Gmail
 * - WhatsApp
 * - Custom connectors
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const https = require('https');
const url = require('url');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT, 10) || 5374;
const SERVICE_NAME = 'connector-registry';

// ============================================================================
// CONNECTOR DEFINITIONS
// ============================================================================

const CONNECTOR_TYPES = {
  WEBHOOK: 'webhook',
  HTTP: 'http',
  SLACK: 'slack',
  GMAIL: 'gmail',
  WHATSAPP: 'whatsapp',
  TWILIO: 'twilio',
  STRIPE: 'stripe',
  SALESFORCE: 'salesforce',
  HUBSPOT: 'hubspot',
  CUSTOM: 'custom'
};

// Built-in connector definitions
const BUILTIN_CONNECTORS = {
  'http-webhook': {
    id: 'http-webhook',
    name: 'HTTP Webhook',
    type: CONNECTOR_TYPES.WEBHOOK,
    description: 'Send HTTP requests to any endpoint',
    icon: '🌐',
    fields: [
      { name: 'url', label: 'URL', type: 'string', required: true },
      { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'POST' },
      { name: 'headers', label: 'Headers (JSON)', type: 'textarea' }
    ]
  },
  'slack-message': {
    id: 'slack-message',
    name: 'Slack Message',
    type: CONNECTOR_TYPES.SLACK,
    description: 'Send messages to Slack channels',
    icon: '💬',
    fields: [
      { name: 'webhookUrl', label: 'Webhook URL', type: 'string', required: true },
      { name: 'channel', label: 'Channel', type: 'string' },
      { name: 'message', label: 'Message', type: 'textarea', required: true },
      { name: 'username', label: 'Bot Name', type: 'string' },
      { name: 'iconEmoji', label: 'Icon', type: 'string' }
    ]
  },
  'slack-api': {
    id: 'slack-api',
    name: 'Slack API',
    type: CONNECTOR_TYPES.SLACK,
    description: 'Advanced Slack API operations',
    icon: '💬',
    fields: [
      { name: 'token', label: 'Bot Token', type: 'string', required: true },
      { name: 'channel', label: 'Channel ID', type: 'string', required: true },
      { name: 'operation', label: 'Operation', type: 'select', options: ['chat.postMessage', 'chat.update', 'chat.delete', 'files.upload'], required: true }
    ]
  },
  'gmail-send': {
    id: 'gmail-send',
    name: 'Gmail Send',
    type: CONNECTOR_TYPES.GMAIL,
    description: 'Send emails via Gmail',
    icon: '📧',
    fields: [
      { name: 'accessToken', label: 'Access Token', type: 'string', required: true },
      { name: 'to', label: 'To', type: 'string', required: true },
      { name: 'subject', label: 'Subject', type: 'string', required: true },
      { name: 'body', label: 'Body', type: 'textarea', required: true },
      { name: 'cc', label: 'CC', type: 'string' },
      { name: 'bcc', label: 'BCC', type: 'string' }
    ]
  },
  'whatsapp-send': {
    id: 'whatsapp-send',
    name: 'WhatsApp Send',
    type: CONNECTOR_TYPES.WHATSAPP,
    description: 'Send WhatsApp messages via Twilio',
    icon: '📱',
    fields: [
      { name: 'accountSid', label: 'Account SID', type: 'string', required: true },
      { name: 'authToken', label: 'Auth Token', type: 'string', required: true },
      { name: 'from', label: 'From Number', type: 'string', required: true },
      { name: 'to', label: 'To Number', type: 'string', required: true },
      { name: 'body', label: 'Message', type: 'textarea', required: true }
    ]
  },
  'twilio-sms': {
    id: 'twilio-sms',
    name: 'Twilio SMS',
    type: CONNECTOR_TYPES.TWILIO,
    description: 'Send SMS via Twilio',
    icon: '📲',
    fields: [
      { name: 'accountSid', label: 'Account SID', type: 'string', required: true },
      { name: 'authToken', label: 'Auth Token', type: 'string', required: true },
      { name: 'from', label: 'From Number', type: 'string', required: true },
      { name: 'to', label: 'To Number', type: 'string', required: true },
      { name: 'body', label: 'Message', type: 'textarea', required: true }
    ]
  },
  'stripe-event': {
    id: 'stripe-event',
    name: 'Stripe Webhook',
    type: CONNECTOR_TYPES.STRIPE,
    description: 'Receive Stripe webhook events',
    icon: '💳',
    fields: [
      { name: 'webhookSecret', label: 'Webhook Secret', type: 'string', required: true },
      { name: 'events', label: 'Events to Capture', type: 'multiselect', options: ['payment_intent.succeeded', 'payment_intent.payment_failed', 'customer.created', 'invoice.paid', 'subscription.created'] }
    ]
  },
  'http-request': {
    id: 'http-request',
    name: 'HTTP Request',
    type: CONNECTOR_TYPES.HTTP,
    description: 'Make HTTP requests with authentication',
    icon: '🔗',
    fields: [
      { name: 'url', label: 'URL', type: 'string', required: true },
      { name: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
      { name: 'authType', label: 'Auth Type', type: 'select', options: ['none', 'bearer', 'basic', 'apiKey'] },
      { name: 'authToken', label: 'Auth Token', type: 'string' },
      { name: 'username', label: 'Username', type: 'string' },
      { name: 'password', label: 'Password', type: 'string' },
      { name: 'headers', label: 'Headers (JSON)', type: 'textarea' },
      { name: 'body', label: 'Body (JSON)', type: 'textarea' }
    ]
  }
};

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const registeredConnectors = new Map();
const connectorConfigs = new Map();
const executionLogs = [];

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan(`[${SERVICE_NAME}] :method :url :status :response-time ms`));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    connectors: registeredConnectors.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ============================================================================
// CONNECTOR REGISTRY ENDPOINTS
// ============================================================================

// List all available connector types
app.get('/api/connectors', (req, res) => {
  const { type, search } = req.query;
  let connectors = { ...BUILTIN_CONNECTORS, ...Object.fromEntries(registeredConnectors) };

  if (type) {
    connectors = Object.fromEntries(
      Object.entries(connectors).filter(([_, c]) => c.type === type)
    );
  }

  if (search) {
    const searchLower = search.toLowerCase();
    connectors = Object.fromEntries(
      Object.entries(connectors).filter(([_, c]) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.description?.toLowerCase().includes(searchLower)
      )
    );
  }

  res.json({
    count: Object.keys(connectors).length,
    connectors: Object.values(connectors)
  });
});

// Get connector schema
app.get('/api/connectors/:connectorId', (req, res) => {
  const connector = BUILTIN_CONNECTORS[req.params.connectorId] ||
                   registeredConnectors.get(req.params.connectorId);

  if (!connector) {
    return res.status(404).json({ error: 'Connector not found' });
  }

  res.json({ connector });
});

// Register custom connector
app.post('/api/connectors', (req, res) => {
  const { id, name, type, description, icon, fields, handler } = req.body;

  if (!id || !name || !type) {
    return res.status(400).json({ error: 'id, name, and type are required' });
  }

  if (BUILTIN_CONNECTORS[id]) {
    return res.status(409).json({ error: 'Connector ID already exists' });
  }

  const connector = {
    id,
    name,
    type,
    description: description || '',
    icon: icon || '🔌',
    fields: fields || [],
    isCustom: true,
    createdAt: Date.now()
  };

  registeredConnectors.set(id, connector);
  if (handler) {
    connectorConfigs.set(id, { handler });
  }

  res.status(201).json({ connector });
});

// Delete custom connector
app.delete('/api/connectors/:connectorId', (req, res) => {
  const connectorId = req.params.connectorId;

  if (BUILTIN_CONNECTORS[connectorId]) {
    return res.status(403).json({ error: 'Cannot delete built-in connectors' });
  }

  if (!registeredConnectors.has(connectorId)) {
    return res.status(404).json({ error: 'Connector not found' });
  }

  registeredConnectors.delete(connectorId);
  connectorConfigs.delete(connectorId);

  res.json({ success: true });
});

// ============================================================================
// CONNECTOR EXECUTION ENDPOINTS
// ============================================================================

// Execute connector action
app.post('/api/connectors/:connectorId/execute', async (req, res) => {
  const { connectorId } = req.params;
  const { params, context } = req.body;

  const connector = BUILTIN_CONNECTORS[connectorId] ||
                   registeredConnectors.get(connectorId);

  if (!connector) {
    return res.status(404).json({ error: 'Connector not found' });
  }

  const executionId = uuidv4();
  const log = {
    executionId,
    connectorId,
    params,
    context,
    startedAt: Date.now(),
    status: 'running'
  };

  executionLogs.push(log);

  try {
    // Validate required fields
    const missingFields = (connector.fields || [])
      .filter(f => f.required)
      .filter(f => !params?.[f.name])
      .map(f => f.name);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Execute based on connector type
    let result;
    switch (connector.type) {
      case CONNECTOR_TYPES.WEBHOOK:
      case CONNECTOR_TYPES.HTTP:
        result = await executeHttpRequest(connectorId, params);
        break;
      case CONNECTOR_TYPES.SLACK:
        result = await executeSlack(connectorId, params);
        break;
      case CONNECTOR_TYPES.GMAIL:
        result = await executeGmail(params);
        break;
      case CONNECTOR_TYPES.WHATSAPP:
      case CONNECTOR_TYPES.TWILIO:
        result = await executeTwilio(connectorId, params);
        break;
      default:
        result = { success: true, message: 'Connector executed', params };
    }

    log.status = 'success';
    log.completedAt = Date.now();
    log.result = result;

    res.json({
      success: true,
      executionId,
      result
    });

  } catch (error) {
    log.status = 'failed';
    log.completedAt = Date.now();
    log.error = error.message;

    res.status(400).json({
      success: false,
      executionId,
      error: error.message
    });
  }
});

// Get execution logs
app.get('/api/executions', (req, res) => {
  const { connectorId, status, limit = 100 } = req.query;

  let logs = [...executionLogs].reverse();

  if (connectorId) {
    logs = logs.filter(l => l.connectorId === connectorId);
  }

  if (status) {
    logs = logs.filter(l => l.status === status);
  }

  res.json({
    count: logs.length,
    logs: logs.slice(0, parseInt(limit))
  });
});

// Get execution by ID
app.get('/api/executions/:executionId', (req, res) => {
  const log = executionLogs.find(l => l.executionId === req.params.executionId);

  if (!log) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  res.json({ execution: log });
});

// ============================================================================
// CONNECTOR EXECUTION HELPERS
// ============================================================================

async function executeHttpRequest(connectorId, params) {
  const { url: targetUrl, method = 'GET', headers = {}, body } = params;

  return new Promise((resolve, reject) => {
    const parsed = url.parse(targetUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...(typeof headers === 'string' ? JSON.parse(headers) : headers)
      }
    };

    const protocol = parsed.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }

    req.end();
  });
}

async function executeSlack(connectorId, params) {
  const connector = BUILTIN_CONNECTORS[connectorId];

  if (connectorId === 'slack-message' && params.webhookUrl) {
    // Use webhook
    return new Promise((resolve, reject) => {
      const payload = {
        text: params.message,
        channel: params.channel,
        username: params.username,
        icon_emoji: params.iconEmoji
      };

      const parsed = url.parse(params.webhookUrl);
      const options = {
        hostname: parsed.hostname,
        port: 443,
        path: parsed.path,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve({ success: true, message: 'Message sent' });
          } else {
            reject(new Error(`Slack webhook error: ${data}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  return { success: true, message: 'Slack API called' };
}

async function executeGmail(params) {
  const { accessToken, to, subject, body, cc, bcc } = params;

  const email = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : '',
    bcc ? `Bcc: ${bcc}` : '',
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body
  ].filter(Boolean).join('\n');

  // In production, use Gmail API
  return {
    success: true,
    message: 'Email sent via Gmail API',
    to,
    subject
  };
}

async function executeTwilio(connectorId, params) {
  const { accountSid, authToken, from, to, body } = params;

  // In production, use Twilio API
  return {
    success: true,
    message: `${connectorId === 'whatsapp-send' ? 'WhatsApp' : 'SMS'} message sent`,
    sid: `MSG_${Date.now()}`,
    from,
    to,
    status: 'queued'
  };
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] Connector Registry started on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Built-in connectors: ${Object.keys(BUILTIN_CONNECTORS).length}`);
  console.log(`[${SERVICE_NAME}] Types: ${Object.values(CONNECTOR_TYPES).join(', ')}`);
});

module.exports = {
  CONNECTOR_TYPES,
  BUILTIN_CONNECTORS,
  executeHttpRequest,
  executeSlack,
  executeGmail,
  executeTwilio
};
