/**
 * PolicyOS — Extensions, Compliance, DR, Analytics, Multi-tenant Routes (Phases P5–P9)
 */

import { registerPlugin, unregisterPlugin, listPlugins, generateCLI, buildWebhook, generateOpenAPI } from '../services/extensions.js';
import { generateComplianceReport, generateAuditExport } from '../services/compliance.js';
import { createSnapshot, restoreSnapshot, listSnapshots, getReplicationStatus, generateAnalyticsReport } from '../services/dr-analytics-tenant.js';
import { createTenant, getTenant, listTenants, checkQuota, recordUsage, getTenantAnalytics } from '../services/dr-analytics-tenant.js';

export function registerExtensionsRoutes(app, { customAuth }) {

  // ── Plugin Management ───────────────────────────────────────────────────

  app.get('/api/extensions/plugins', customAuth, (req, res) => {
    res.json({ plugins: listPlugins() });
  });

  app.post('/api/extensions/plugins', customAuth, (req, res) => {
    const plugin = req.body;
    if (!plugin.id) return res.status(400).json({ error: 'id required' });
    try {
      const result = registerPlugin(plugin);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/extensions/plugins/:id', customAuth, (req, res) => {
    res.json(unregisterPlugin(req.params.id));
  });

  // ── CLI & SDK Generator ────────────────────────────────────────────────

  app.get('/api/extensions/cli', customAuth, (req, res) => {
    const { language = 'bash', apiKey } = req.query;
    res.json(generateCLI({ language, apiKey }));
  });

  app.post('/api/extensions/webhook-builder', customAuth, (req, res) => {
    const { events, url, secret } = req.body || {};
    if (!url) return res.status(400).json({ error: 'url required' });
    if (!events) return res.status(400).json({ error: 'events required' });
    res.json(buildWebhook({ events, url, secret, tenantId: req.auth?.tenantId }));
  });

  app.get('/api/extensions/openapi', (req, res) => {
    const { version, baseUrl } = req.query;
    res.json(generateOpenAPI({ version, baseUrl }));
  });

  // ── Compliance Reports ─────────────────────────────────────────────

  app.get('/api/compliance/report', customAuth, (req, res) => {
    const { framework = 'SOC2', from, to } = req.query;
    const report = generateComplianceReport({ framework, from, to });
    res.json(report);
  });

  app.get('/api/compliance/audit-export', customAuth, (req, res) => {
    const { from, to, limit } = req.query;
    res.json(generateAuditExport({ from, to, limit: parseInt(limit) || 1000 }));
  });

  // ── Disaster Recovery ────────────────────────────────────────────

  app.post('/api/dr/snapshots', customAuth, (req, res) => {
    const { label } = req.body || {};
    const snap = createSnapshot(label);
    res.status(201).json(snap);
  });

  app.get('/api/dr/snapshots', customAuth, (req, res) => {
    const { limit = 10 } = req.query;
    res.json({ snapshots: listSnapshots(parseInt(limit)) });
  });

  app.post('/api/dr/restore/:id', customAuth, (req, res) => {
    res.json(restoreSnapshot(req.params.id));
  });

  app.get('/api/dr/replication', customAuth, (req, res) => {
    res.json(getReplicationStatus());
  });

  // ── Analytics ─────────────────────────────────────────────────

  app.get('/api/analytics/report', customAuth, (req, res) => {
    const { granularity = 'daily', from, to, tenantId } = req.query;
    res.json(generateAnalyticsReport({ tenantId, from, to, granularity }));
  });

  // ── Multi-Tenant ───────────────────────────────────────────────

  app.post('/api/tenants', customAuth, (req, res) => {
    const tenant = createTenant(req.body || {});
    res.status(201).json(tenant);
  });

  app.get('/api/tenants', customAuth, (req, res) => {
    res.json({ tenants: listTenants() });
  });

  app.get('/api/tenants/:id', customAuth, (req, res) => {
    const tenant = getTenant(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  });

  app.get('/api/tenants/:id/usage', customAuth, (req, res) => {
    res.json(getTenantAnalytics(req.params.id) || { error: 'Tenant not found' });
  });

  app.post('/api/tenants/:id/quota-check', customAuth, (req, res) => {
    const { resource } = req.body || {};
    res.json(checkQuota(req.params.id, resource));
  });

  app.post('/api/tenants/:id/usage', customAuth, (req, res) => {
    const { resource, delta = 1 } = req.body || {};
    recordUsage(req.params.id, resource, delta);
    res.json({ ok: true });
  });
}
