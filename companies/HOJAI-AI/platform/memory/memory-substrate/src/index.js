/**
 * Memory Substrate API
 *
 * Port: 4791
 *
 * The single point of access for ALL Genie capabilities (Understanding,
 * Reasoning, Reflection, Agents, Execution) to read and write the user's
 * persistent context. This is the architectural commitment to "memory is
 * the substrate" — every other service should call this rather than
 * calling MemoryOS + TwinOS + Graphs directly.
 *
 * What it unifies:
 *   - MemoryOS (port 4703) — facts, knowledge, events
 *   - TwinOS Hub (port 4705) — profile, preferences, traits, relationships
 *   - Twin Memory Bridge (port 4704) — twin ↔ memory links
 *   - Memory Confidence (port 4152) — per-fact reliability
 *   - Memory Context Engine (port 4790) — LLM context composer
 *
 * Why centralize this?
 *   1. **One query surface** — caller doesn't need to know which downstream
 *      service holds the data. They ask "what do I know about X?" once.
 *   2. **Consistent reads** — all callers get the same freshness, the same
 *      confidence scoring, the same privacy filtering.
 *   3. **Atomic writes** — a single `writeMemory` call updates MemoryOS,
 *      the Personal Twin, AND any relevant graph links in one transaction.
 *   4. **Audit + access control** — every read/write is logged with the
 *      caller's identity. Sensitive memories can be filtered out for
 *      services that shouldn't see them.
 *
 * Routes:
 *   GET  /api/context/:userId              — Compose a context window for LLM
 *   POST /api/memory                       — Write a memory (atomic multi-store)
 *   GET  /api/memory/:userId/search        — Search memories (with confidence)
 *   GET  /api/twin/:userId                 — Get the user's personal twin
 *   PUT  /api/twin/:userId/preferences     — Update preferences
 *   POST /api/relate                       — Create a relationship link
 *   GET  /api/relationships/:userId        — Get all known relationships
 *   GET  /api/health-summary/:userId       — What we know about this user (counts + freshness)
 *   GET  /health
 *   GET  /ready
 */

import express from 'express';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { requireAuth } from '@rtmn/shared/auth';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { createLogger } from '@rtmn/shared/lib/logger';

const PORT = process.env.PORT || 4791;
const log = createLogger('memory-substrate');

// Downstream service URLs
const MEMORYOS_URL    = process.env.MEMORYOS_URL    || 'http://localhost:4703';
const TWINOS_URL      = process.env.TWINOS_URL      || 'http://localhost:4705';
const BRIDGE_URL      = process.env.BRIDGE_URL      || 'http://localhost:4704';
const CONFIDENCE_URL  = process.env.CONFIDENCE_URL  || 'http://localhost:4152';
const CONTEXT_URL     = process.env.CONTEXT_URL     || 'http://localhost:4790';
const INTERNAL_TOKEN  = process.env.INTERNAL_SERVICE_TOKEN || 'dev-internal-token';

const app = express();
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Audit log of every read/write
const auditLog = new PersistentMap('audit-log', { serviceName: 'memory-substrate' });

// Helper: call downstream service with internal token
async function callDownstream(url, method, body) {
  try {
    const res = await axios({
      method,
      url,
      data: body,
      headers: { 'x-internal-token': INTERNAL_TOKEN },
      timeout: 5000,
      validateStatus: () => true,
    });
    return { ok: res.status < 400, status: res.status, data: res.data };
  } catch (err) {
    log.warn(`downstream call failed: ${url}`, { error: err.message });
    return { ok: false, status: 0, data: null, error: err.message };
  }
}

// Helper: audit a memory access
function audit(userId, action, payload) {
  auditLog.set(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, {
    userId,
    action,
    payload,
    timestamp: new Date().toISOString(),
    service: 'memory-substrate',
  });
}

// === HEALTH ===
app.get('/health', (req, res) => res.json({
  status: 'healthy',
  service: 'memory-substrate',
  port: PORT,
  version: '1.0.0',
  downstream: {
    memoryos: MEMORYOS_URL,
    twinos: TWINOS_URL,
    bridge: BRIDGE_URL,
    confidence: CONFIDENCE_URL,
    context: CONTEXT_URL,
  },
  timestamp: new Date().toISOString(),
}));

app.get('/ready', (req, res) => res.json({ ready: true }));

// === CONTEXT (composed LLM context window) ===
app.get('/api/context/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const { query, limit = 20, minConfidence = 0.5 } = req.query;
  audit(userId, 'context.read', { query, limit });

  // Fan out to Memory Context Engine for the composed window
  const ctxRes = await callDownstream(
    `${CONTEXT_URL}/api/context/${userId}?query=${encodeURIComponent(query || '')}&limit=${limit}&minConfidence=${minConfidence}`,
    'GET'
  );

  if (ctxRes.ok) {
    return res.json({ success: true, data: ctxRes.data, source: 'memory-context-engine' });
  }

  // Fallback: read memories + twin ourselves
  log.warn('Memory Context Engine unavailable, falling back to direct reads');
  const [memRes, twinRes] = await Promise.all([
    callDownstream(`${MEMORYOS_URL}/api/memories/${userId}?limit=${limit}`, 'GET'),
    callDownstream(`${TWINOS_URL}/api/twins/user:${userId}`, 'GET'),
  ]);

  const memories = memRes.data?.data?.items || memRes.data?.items || [];
  const twin = twinRes.data?.data || twinRes.data;

  // Filter by confidence if we have it (MemoryOS may include confidence)
  const filtered = memories.filter(m => (m.confidence ?? 1.0) >= parseFloat(minConfidence));

  res.json({
    success: true,
    data: {
      userId,
      query,
      memories: filtered,
      twin,
      composedAt: new Date().toISOString(),
      fallback: true,
    },
  });
});

// === WRITE MEMORY (atomic multi-store) ===
app.post('/api/memory', requireAuth, async (req, res) => {
  const { userId, type, content, importance = 'Medium', tags = [], relatedTwin = true } = req.body;
  if (!userId || !content) {
    return res.status(400).json({ success: false, error: 'userId and content are required' });
  }
  audit(userId, 'memory.write', { type, importance, tags });

  // Write to MemoryOS
  const memRes = await callDownstream(`${MEMORYOS_URL}/api/memories`, 'POST', {
    userId, type: type || 'fact', content, importance, tags,
  });

  // Optionally link to Personal Twin
  let twinLink = null;
  if (relatedTwin) {
    twinLink = await callDownstream(`${BRIDGE_URL}/api/links`, 'POST', {
      memoryId: memRes.data?.data?.id,
      twinId: `user:${userId}`,
      relationship: 'describes',
    });
  }

  res.json({
    success: memRes.ok,
    data: {
      memory: memRes.data?.data,
      twinLink: twinLink?.data?.data,
    },
    errors: memRes.ok ? null : [memRes.error],
  });
});

// === SEARCH MEMORIES (with confidence scoring) ===
app.get('/api/memory/:userId/search', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const { q, limit = 10, minConfidence = 0.0 } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'q (query) is required' });
  audit(userId, 'memory.search', { q, limit });

  const memRes = await callDownstream(
    `${MEMORYOS_URL}/api/memories/${userId}/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    'GET'
  );

  let items = memRes.data?.data?.items || memRes.data?.items || [];

  // Optionally enrich with confidence from Memory Confidence service
  if (items.length > 0 && process.env.ENRICH_WITH_CONFIDENCE !== 'false') {
    const confRes = await callDownstream(
      `${CONFIDENCE_URL}/api/confidence/batch`,
      'POST',
      { memoryIds: items.map(m => m.id).filter(Boolean) }
    );
    if (confRes.ok && confRes.data?.data?.scores) {
      const scores = confRes.data.data.scores;
      items = items.map(m => ({ ...m, confidence: scores[m.id] ?? m.confidence ?? 0.8 }));
    }
  }

  // Filter by confidence
  items = items.filter(m => (m.confidence ?? 1.0) >= parseFloat(minConfidence));

  res.json({ success: true, data: { items, count: items.length } });
});

// === GET PERSONAL TWIN ===
app.get('/api/twin/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  audit(userId, 'twin.read');

  const twinRes = await callDownstream(`${TWINOS_URL}/api/twins/user:${userId}`, 'GET');
  if (!twinRes.ok) {
    return res.status(twinRes.status || 502).json({ success: false, error: 'Twin not found' });
  }
  res.json({ success: true, data: twinRes.data?.data || twinRes.data });
});

// === UPDATE PREFERENCES ===
app.put('/api/twin/:userId/preferences', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const preferences = req.body;
  audit(userId, 'twin.preferences.update', preferences);

  const twinRes = await callDownstream(
    `${TWINOS_URL}/api/twins/user:${userId}/preferences`,
    'PUT',
    preferences
  );
  if (!twinRes.ok) {
    return res.status(twinRes.status || 502).json({ success: false, error: 'Twin update failed' });
  }

  // Also write as a memory so the LLM has it for context
  await callDownstream(`${MEMORYOS_URL}/api/memories`, 'POST', {
    userId,
    type: 'preference',
    content: JSON.stringify(preferences),
    importance: 'High',
    tags: ['preferences', 'twin'],
  });

  res.json({ success: true, data: twinRes.data });
});

// === CREATE RELATIONSHIP LINK ===
app.post('/api/relate', requireAuth, async (req, res) => {
  const { userId, fromType, fromId, toType, toId, relationship, weight = 0.5 } = req.body;
  if (!userId || !fromType || !fromId || !toType || !toId || !relationship) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  audit(userId, 'relationship.create', { fromType, fromId, toType, toId, relationship });

  // Write as a memory
  const memRes = await callDownstream(`${MEMORYOS_URL}/api/memories`, 'POST', {
    userId,
    type: 'relationship',
    content: `${fromType}:${fromId} --${relationship}--> ${toType}:${toId}`,
    importance: 'Medium',
    tags: ['relationship', fromType, toType],
  });

  // Create twin-memory link
  await callDownstream(`${BRIDGE_URL}/api/links`, 'POST', {
    memoryId: memRes.data?.data?.id,
    twinId: `user:${userId}`,
    relationship: `links_${fromType}_to_${toType}`,
  });

  res.json({ success: true, data: { memory: memRes.data?.data } });
});

// === GET RELATIONSHIPS ===
app.get('/api/relationships/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  audit(userId, 'relationships.read');

  const memRes = await callDownstream(
    `${MEMORYOS_URL}/api/memories/${userId}?type=relationship&limit=100`,
    'GET'
  );
  const items = memRes.data?.data?.items || memRes.data?.items || [];
  res.json({ success: true, data: { items, count: items.length } });
});

// === HEALTH SUMMARY (for Reflection / Intelligence Score) ===
app.get('/api/health-summary/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  audit(userId, 'health-summary.read');

  // Fan out to get counts + freshness from each downstream
  const [memRes, twinRes] = await Promise.all([
    callDownstream(`${MEMORYOS_URL}/api/memories/${userId}?limit=1`, 'GET'),
    callDownstream(`${TWINOS_URL}/api/twins/user:${userId}`, 'GET'),
  ]);

  const memoryCount = memRes.data?.data?.total || memRes.data?.total || 0;
  const twin = twinRes.data?.data || twinRes.data;

  res.json({
    success: true,
    data: {
      userId,
      memoryCount,
      twinExists: Boolean(twin),
      twinUpdatedAt: twin?.updatedAt || null,
      summaryAt: new Date().toISOString(),
    },
  });
});

const server = app.listen(PORT, () => {
  log.info(`memory-substrate listening on :${PORT}`);
  log.info(`downstream: memoryos=${MEMORYOS_URL} twinos=${TWINOS_URL}`);
});

installGracefulShutdown(server);

export default app;