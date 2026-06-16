/**
 * Exhibition Integration Hub
 * Port 5060
 *
 * Webhooks, CRM/ERP Connectors, External Integrations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

dotenv.config();

const PORT = process.env.PORT || 5060;
const SERVICE_NAME = 'exhibition-integration-hub';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })],
});

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================
// DATA MODELS
// ============================================

interface Integration {
  id: string;
  exhibition_id: string;
  type: 'crm' | 'erp' | 'accounting' | 'marketing' | 'badge_printer' | 'access_control' | 'custom';
  provider: string; // hubspot, zoho, tally, etc.
  name: string;
  config: Record<string, unknown>;
  credentials?: Record<string, string>; // encrypted
  is_active: boolean;
  last_sync?: string;
  sync_status: 'idle' | 'syncing' | 'error';
  created_at: string;
  updated_at: string;
}

interface SyncJob {
  id: string;
  integration_id: string;
  type: 'attendees' | 'leads' | 'orders' | 'payments';
  status: 'pending' | 'running' | 'completed' | 'failed';
  records_synced: number;
  errors: string[];
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

interface WebhookEndpoint {
  id: string;
  exhibition_id: string;
  event_type: string;
  url: string;
  method: 'POST' | 'GET' | 'PUT';
  headers: Record<string, string>;
  secret: string;
  is_active: boolean;
  retry_policy: { max_retries: number; backoff_seconds: number };
  last_triggered?: string;
  failure_count: number;
  created_at: string;
}

// Stores
const integrations = new Map<string, Integration>();
const syncJobs = new Map<string, SyncJob>();
const webhookEndpoints = new Map<string, WebhookEndpoint>();

// Supported integrations
const supportedIntegrations = [
  { type: 'crm', providers: ['hubspot', 'zoho_crm', 'salesforce', 'pipedrive'] },
  { type: 'erp', providers: ['tally', 'sap', 'zoho_books', 'quickbooks'] },
  { type: 'accounting', providers: ['tally', 'zoho_books', 'myob', 'xero'] },
  { type: 'marketing', providers: ['klaviyo', 'mailchimp', 'sendgrid', 'hubspot_marketing'] },
  { type: 'badge_printer', providers: ['zebra', 'datacard', 'evolis'] },
  { type: 'access_control', providers: ['hid', 'allegion', 'custodead'] },
];

// ============================================
// HEALTH
// ============================================

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString(), stats: { integrations: integrations.size, sync_jobs: syncJobs.size, webhooks: webhookEndpoints.size } });
});

app.get('/health/live', (_req, res) => res.json({ status: 'alive' }));
app.get('/health/ready', (_req, res) => res.json({ status: 'ready' }));

// ============================================
// INTEGRATIONS
// ============================================

app.get('/api/integrations', (req, res) => {
  const { exhibition_id, type, is_active } = req.query;
  let results = Array.from(integrations.values());

  if (exhibition_id) results = results.filter((i) => i.exhibition_id === exhibition_id);
  if (type) results = results.filter((i) => i.type === type);
  if (is_active !== undefined) results = results.filter((i) => i.is_active === (is_active === 'true'));

  res.json({ success: true, data: results });
});

app.get('/api/integrations/supported', (_req, res) => {
  res.json({ success: true, data: supportedIntegrations });
});

app.get('/api/integrations/:id', (req, res) => {
  const integration = integrations.get(req.params.id);
  if (!integration) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });
  res.json({ success: true, data: integration });
});

app.post('/api/integrations', (req, res) => {
  const { exhibition_id, type, provider, name, config } = req.body;

  if (!exhibition_id || !type || !provider || !name) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const integration: Integration = {
    id: `INT-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    type,
    provider,
    name,
    config: config || {},
    is_active: true,
    sync_status: 'idle',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  integrations.set(integration.id, integration);
  logger.info('Integration created', { id: integration.id, type, provider });

  res.status(201).json({ success: true, data: integration });
});

app.patch('/api/integrations/:id', (req, res) => {
  const integration = integrations.get(req.params.id);
  if (!integration) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });

  const updated = { ...integration, ...req.body, updated_at: new Date().toISOString() };
  integrations.set(integration.id, updated);

  res.json({ success: true, data: updated });
});

app.post('/api/integrations/:id/test', (req, res) => {
  const integration = integrations.get(req.params.id);
  if (!integration) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });

  // Simulate test connection
  logger.info('Testing integration', { id: integration.id, provider: integration.provider });

  const success = Math.random() > 0.2; // 80% success rate for demo

  res.json({
    success: true,
    data: {
      integration_id: integration.id,
      test_status: success ? 'connected' : 'failed',
      message: success ? 'Connection successful' : 'Authentication failed',
      response_time_ms: Math.floor(Math.random() * 500 + 100),
    },
  });
});

// ============================================
// SYNC JOBS
// ============================================

app.post('/api/sync', (req, res) => {
  const { integration_id, type } = req.body;

  if (!integration_id || !type) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const integration = integrations.get(integration_id);
  if (!integration) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Integration not found' } });

  const job: SyncJob = {
    id: `SYNC-${uuidv4().substring(0, 8).toUpperCase()}`,
    integration_id,
    type,
    status: 'pending',
    records_synced: 0,
    errors: [],
    created_at: new Date().toISOString(),
  };

  syncJobs.set(job.id, job);

  // Simulate sync job running
  job.status = 'running';
  job.started_at = new Date().toISOString();
  syncJobs.set(job.id, job);

  integration.sync_status = 'syncing';
  integration.last_sync = new Date().toISOString();
  integrations.set(integration.id, integration);

  // Simulate async completion
  setTimeout(() => {
    job.status = 'completed';
    job.completed_at = new Date().toISOString();
    job.records_synced = Math.floor(Math.random() * 100 + 10);
    syncJobs.set(job.id, job);

    integration.sync_status = 'idle';
    integrations.set(integration.id, integration);

    logger.info('Sync completed', { job_id: job.id, records: job.records_synced });
  }, 2000);

  res.status(201).json({ success: true, data: job });
});

app.get('/api/sync/:jobId', (req, res) => {
  const job = syncJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Sync job not found' } });
  res.json({ success: true, data: job });
});

app.get('/api/integrations/:integrationId/sync-history', (req, res) => {
  const jobs = Array.from(syncJobs.values())
    .filter((j) => j.integration_id === req.params.integrationId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20);

  res.json({ success: true, data: jobs });
});

// ============================================
// WEBHOOK ENDPOINTS
// ============================================

app.get('/api/webhooks', (req, res) => {
  const { exhibition_id, event_type } = req.query;
  let results = Array.from(webhookEndpoints.values());

  if (exhibition_id) results = results.filter((w) => w.exhibition_id === exhibition_id);
  if (event_type) results = results.filter((w) => w.event_type === event_type);

  res.json({ success: true, data: results });
});

app.post('/api/webhooks', (req, res) => {
  const { exhibition_id, event_type, url, method = 'POST', headers, retry_policy } = req.body;

  if (!exhibition_id || !event_type || !url) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } });
  }

  const endpoint: WebhookEndpoint = {
    id: `WH-${uuidv4().substring(0, 8).toUpperCase()}`,
    exhibition_id,
    event_type,
    url,
    method,
    headers: headers || {},
    secret: uuidv4(),
    is_active: true,
    retry_policy: retry_policy || { max_retries: 3, backoff_seconds: 60 },
    failure_count: 0,
    created_at: new Date().toISOString(),
  };

  webhookEndpoints.set(endpoint.id, endpoint);
  res.status(201).json({ success: true, data: endpoint });
});

app.delete('/api/webhooks/:id', (req, res) => {
  if (!webhookEndpoints.has(req.params.id)) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
  webhookEndpoints.delete(req.params.id);
  res.json({ success: true, data: { message: 'Webhook deleted' } });
});

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  logger.info(`🔗 Exhibition Integration Hub started on port ${PORT}`);
});

export default app;