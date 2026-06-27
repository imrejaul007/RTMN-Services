/**
 * PolicyOS — Webhook Routes
 *
 * CRUD for real-time policy event webhooks.
 * Events: policy.created, policy.updated, policy.deleted, policy.evaluated,
 * approval.created, approval.decided, etc.
 */

import { v4 as uuidv4 } from 'uuid';
import { validateWebhookUrl } from '../lib/sanitization.js';

export function registerWebhookRoutes(app, {
  webhooks,
  webhookDeliveries,
  auditLog,
  customAuth,
  writeLimiter,
}) {
  let webhookSeq = 0;

  function signPayload(secret, body) {
    // Lazy crypto import
    const crypto = app.locals && app.locals.crypto;
    if (crypto) {
      return crypto.createHmac('sha256', secret).update(body).digest('hex');
    }
    return null;
  }

  // POST /api/webhooks
  app.post('/api/webhooks', customAuth, writeLimiter, async (req, res) => {
    const { url, events, secret, active } = req.body || {};
    if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });

    // Phase 0.7: validate URL security (no javascript:, internal IPs, etc.)
    const validation = validateWebhookUrl(url);
    if (!validation.valid) return res.status(400).json({ error: validation.reason });
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ error: 'events must be a non-empty array of audit-event types' });
    }
    const wh = {
      id: `wh-${Date.now()}-${uuidv4().slice(0, 6)}`,
      url,
      events,
      secret: secret || uuidv4(),
      active: active !== false,
      createdAt: new Date().toISOString(),
      lastDeliveryAt: null,
      lastError: null,
    };
    await webhooks.set(wh.id, wh);
    auditLog({ type: 'webhook.created', actor: req.auth.role || 'unknown', details: { webhookId: wh.id, url, events } });
    res.json({ ok: true, webhook: wh });
  });

  // GET /api/webhooks
  app.get('/api/webhooks', customAuth, async (req, res) => {
    const items = Array.from(webhooks.values());
    const sanitized = items.map(({ secret, ...rest }) => rest);
    res.json({ count: sanitized.length, webhooks: sanitized });
  });

  // GET /api/webhooks/:id
  app.get('/api/webhooks/:id', customAuth, async (req, res) => {
    const wh = await webhooks.get(req.params.id);
    if (!wh) return res.status(404).json({ error: 'webhook not found' });
    const { secret, ...safe } = wh;
    res.json(safe);
  });

  // DELETE /api/webhooks/:id
  app.delete('/api/webhooks/:id', customAuth, writeLimiter, async (req, res) => {
    const exists = await webhooks.get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'webhook not found' });
    await webhooks.delete(req.params.id);
    auditLog({ type: 'webhook.deleted', actor: req.auth.role || 'unknown', details: { webhookId: req.params.id } });
    res.json({ ok: true, deleted: true, webhookId: req.params.id });
  });

  // POST /api/webhooks/:id/test
  app.post('/api/webhooks/:id/test', customAuth, writeLimiter, async (req, res) => {
    const wh = await webhooks.get(req.params.id);
    if (!wh) return res.status(404).json({ error: 'webhook not found' });
    const testPayload = {
      event: 'webhook.test',
      audit: { type: 'webhook.test', timestamp: new Date().toISOString(), message: 'Test delivery from policy-os' },
      deliveryId: null,
    };
    // Inline delivery (same logic as fireWebhooks in index.js)
    const deliveryId = `wh-${Date.now()}-${++webhookSeq}`;
    const body = JSON.stringify(testPayload);
    const crypto = app.locals && app.locals.crypto;
    const signature = crypto ? crypto.createHmac('sha256', wh.secret || 'policy-os-default').update(body).digest('hex') : '';
    const startedAt = Date.now();
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 5000);
      const resp = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PolicyOS-Event': testPayload.event,
          'X-PolicyOS-Delivery': deliveryId,
          'X-PolicyOS-Signature': `sha256=${signature}`,
        },
        body,
        signal: ac.signal,
      });
      clearTimeout(timer);
      const ok = resp.status >= 200 && resp.status < 300;
      const entry = {
        id: deliveryId, webhookId: wh.id, event: testPayload.event,
        url: wh.url, status: ok ? 'success' : 'failed',
        httpStatus: resp.status, durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
      await webhookDeliveries.set(deliveryId, entry);
      wh.lastDeliveryAt = entry.timestamp;
      wh.lastError = ok ? null : `HTTP ${resp.status}`;
      await webhooks.set(wh.id, wh);
      res.json({ ok, delivery: entry });
    } catch (err) {
      const entry = {
        id: deliveryId, webhookId: wh.id, event: testPayload.event,
        url: wh.url, status: 'failed', error: err.message,
        durationMs: Date.now() - startedAt, timestamp: new Date().toISOString(),
      };
      await webhookDeliveries.set(deliveryId, entry);
      wh.lastError = err.message;
      await webhooks.set(wh.id, wh);
      res.json({ ok: false, delivery: entry });
    }
  });
}
