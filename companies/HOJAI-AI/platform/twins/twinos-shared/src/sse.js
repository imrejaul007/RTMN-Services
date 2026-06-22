/**
 * RTMN TwinOS - SSE Router (Phase 5)
 *
 * Server-Sent Events endpoint that streams twin events to clients in
 * real time. Subscribes to the shared event bus (port 4510) over HTTP
 * (long-poll style) and forwards events that match the configured
 * pattern to all connected SSE clients.
 */

import express from 'express';
import { randomUUID } from 'crypto';

const HEARTBEAT_MS = 25000;
const PULL_INTERVAL_MS = 1500;
const MAX_BACKLOG = 500;

export class SSEHub {
  constructor(opts = {}) {
    this.eventBusUrl = opts.eventBusUrl || process.env.EVENT_BUS_URL || 'http://localhost:4510';
    this.maxBacklog = opts.maxBacklog || MAX_BACKLOG;
    this.clients = new Set();
    this.backlog = [];
    this.seen = new Set();
    this._pullTimer = null;
    this._stopped = false;
  }

  start() {
    if (this._pullTimer) return;
    this._stopped = false;
    this._pullTimer = setInterval(() => this._pullOnce().catch(() => {}), PULL_INTERVAL_MS);
  }

  async stop() {
    this._stopped = true;
    if (this._pullTimer) {
      clearInterval(this._pullTimer);
      this._pullTimer = null;
    }
    for (const c of this.clients) {
      try { c.res.write(`: hub shutting down\n\n`); c.res.end(); } catch (_e) { /* ignore */ }
    }
    this.clients.clear();
  }

  addClient(res, filter) {
    const id = randomUUID();
    const client = { id, res, filter, connectedAt: Date.now() };
    this.clients.add(client);
    for (const evt of this.backlog) {
      if (filter.matches(evt)) {
        try { res.write(_formatEvent(evt, id)); } catch (_e) { /* ignore */ }
      }
    }
    return client;
  }

  removeClient(client) {
    this.clients.delete(client);
  }

  broadcast(topic, event) {
    const enriched = {
      id: event.id || randomUUID(),
      topic,
      data: event.data || event,
      at: event.at || new Date().toISOString()
    };
    this.backlog.push(enriched);
    if (this.backlog.length > this.maxBacklog) this.backlog.shift();
    for (const c of this.clients) {
      if (c.filter.matches(enriched)) {
        try { c.res.write(_formatEvent(enriched, c.id)); } catch (_e) { /* ignore */ }
      }
    }
  }

  async _pullOnce() {
    if (this._stopped) return;
    try {
      const res = await fetch(`${this.eventBusUrl}/api/events/recent?limit=50`, {
        signal: AbortSignal.timeout(2000)
      });
      if (!res.ok) return;
      const body = await res.json();
      const events = Array.isArray(body && body.events) ? body.events
        : Array.isArray(body) ? body
        : [];
      for (const evt of events) {
        const id = evt.id || `${evt.topic || 'evt'}-${evt.timestamp || evt.at || Date.now()}`;
        if (this.seen.has(id)) continue;
        this.seen.add(id);
        this.broadcast(evt.topic || 'unknown', {
          id,
          data: evt.data || evt.payload || evt,
          at: evt.timestamp || evt.at || new Date().toISOString()
        });
      }
      if (this.seen.size > 5000) {
        const arr = Array.from(this.seen).slice(-2500);
        this.seen = new Set(arr);
      }
    } catch (_err) { /* ignore network blips */ }
  }
}

function _formatEvent(evt, clientId) {
  let out = '';
  if (evt.id) out += `id: ${evt.id}\n`;
  if (clientId) out += `event: twin-event\n`;
  out += `data: ${JSON.stringify({ ...evt, _clientId: clientId })}\n\n`;
  return out;
}

export function sseRouter(opts = {}) {
  const { hub, twinType = 'twin', requireAuth = null } = opts;
  if (!hub || !(hub instanceof SSEHub)) {
    throw new Error('sseRouter: `hub` must be an SSEHub instance');
  }
  const router = express.Router();
  const auth = requireAuth || ((req, res, next) => next());

  function _filterFromQuery(q) {
    const topics = (q.topics || q.topic || '').toString().split(',').map(s => s.trim()).filter(Boolean);
    const twinId = q.twinId || null;
    return {
      matches(evt) {
        if (topics.length && !topics.includes(evt.topic)) return false;
        if (twinId) {
          const tId = (evt.data && (evt.data.twinId || evt.data.id)) || null;
          if (tId !== twinId) return false;
        }
        return true;
      }
    };
  }

  router.get('/stream', auth, (req, res) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });
    if (res.flushHeaders) res.flushHeaders();
    res.write(`: connected to ${twinType} hub\n\n`);
    const filter = _filterFromQuery(req.query);
    const client = hub.addClient(res, filter);
    const heartbeat = setInterval(() => {
      try { res.write(`: keep-alive ${Date.now()}\n\n`); } catch (_e) { /* ignore */ }
    }, HEARTBEAT_MS);
    req.on('close', () => {
      clearInterval(heartbeat);
      hub.removeClient(client);
    });
  });

  router.get('/stats', (req, res) => {
    res.json({
      success: true,
      twinType,
      clients: hub.clients.size,
      backlog: hub.backlog.length,
      seen: hub.seen.size,
      eventBusUrl: hub.eventBusUrl
    });
  });

  return router;
}

export default sseRouter;
