/**
 * Twin Memory Bridge (port 4704)
 *
 * Architectural principle (from the audit):
 *
 *   "Everything has a Twin. Each Twin owns its own Memory."
 *
 * TwinOS (4705) holds identity + profile + lifecycle.
 * MemoryOS (4703) holds the actual records (episodic, semantic, ...).
 *
 * Twin Memory Bridge is the link layer. It answers questions like:
 *
 *   - "What's the memory partition for twin X?"
 *   - "Bind twin X to memory partition M with kind K."
 *   - "List every twin that has any memory at all."
 *   - "Show what kind of memory twin X owns (episodic / semantic / ...)."
 *   - "Migrate twin X to a new memory partition."
 *   - "Bulk-bind many twins at once (for tenant onboarding)."
 *
 * Consumers:
 *   - FlowOS plans (memory.read / memory.write steps use this to resolve
 *     the partition before calling MemoryOS)
 *   - TwinOS Hub (on twin creation, can pre-bind a default partition)
 *   - MemoryOS (when storing a record, can validate the twin↔memory link)
 *
 * Port: 4704
 * Pattern: in-memory + Express 5
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import * as persistence from './persistence.js';
import { requireAuthMw, requireAuth, setRequireAuth, getRequireAuth } from './auth.js';

const PORT = process.env.TWIN_MEMORY_BRIDGE_PORT || 4704;
const MEMORYOS_BASE = process.env.MEMORYOS_URL || `http://localhost:${process.env.MEMORYOS_PORT || 4703}`;
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// JWT auth via CorpID (off by default; set REQUIRE_AUTH=true to enforce).
// Middleware is sourced from @rtmn/shared/auth (see ./auth.js).
app.use(requireAuthMw);

// Test helper: toggle auth on/off
app.get('/api/auth/toggle', (req, res) => {
  const on = req.query.on === 'true';
  setRequireAuth(on);
  res.json({ success: true, requireAuth: on, message: `Auth is now ${on ? 'REQUIRED' : 'disabled (dev mode)'}` });
});

// =============================================================================
// STORES
// =============================================================================
// binding:     twinId -> { partitions: {kind: partitionRef, ...}, metadata }
// partition:   partitionId -> { twinId, kind, ref, createdAt, stats }
// audit:       global log

const bindings = new PersistentMap('bindings', { serviceName: 'twin-memory-bridge' });      // twinId -> binding record
const partitions = new PersistentMap('partitions', { serviceName: 'twin-memory-bridge' });    // partitionId -> partition record
const audit = [];

// Seed default partitions for the canonical 5 memory kinds
const KINDS = ['episodic', 'semantic', 'procedural', 'working', 'long-term'];
function seedDefaults() {
  // The defaults are placeholders so the bridge returns something even
  // before any twin has been bound. Real partition IDs are issued on bind.
  for (const kind of KINDS) {
    const id = `default-${kind}`;
    partitions.set(id, {
      id,
      kind,
      twinId: null,
      ref: `memory-os://default/${kind}`,
      createdAt: new Date().toISOString(),
      stats: { writes: 0, reads: 0 },
      system: true,
    });
  }
}
seedDefaults();

// =============================================================================
// HELPERS
// =============================================================================

function auditLog(entry) {
  audit.push({ id: uuidv4(), at: new Date().toISOString(), ...entry });
  if (audit.length > 5000) audit.splice(0, audit.length - 5000);
}

function resolveBinding(twinId) {
  return bindings.get(twinId) || null;
}

function ensureBinding(twinId) {
  let b = bindings.get(twinId);
  if (!b) {
    b = { twinId, partitions: {}, createdAt: new Date().toISOString(), tenant: 'system' };
    bindings.set(twinId, b);
  }
  return b;
}

function resolvePartition(twinId, kind) {
  const b = resolveBinding(twinId);
  if (b && b.partitions[kind]) {
    return partitions.get(b.partitions[kind]) || null;
  }
  // Fall back to the default partition for that kind so the bridge
  // always returns *something* and consumers can keep flowing.
  return partitions.get(`default-${kind}`);
}

// Normalize an incoming memory kind. We accept both the bridge-internal
// `long-term` (with dash) and the spec's `longterm` (no dash), plus the
// alias forms used by MemoryOS query params.
function normalizeKind(kind) {
  if (!kind) return null;
  const k = String(kind).toLowerCase().trim();
  if (k === 'longterm' || k === 'long_term') return 'long-term';
  if (k === 'episodic' || k === 'semantic' || k === 'procedural' || k === 'working' || k === 'long-term') return k;
  return null;
}

// Map our internal kind to the MemoryOS HTTP path that actually holds
// the data for that kind. Each path uses a different shape on the
// MemoryOS side, so the bridge has to dispatch carefully. MemoryOS's
// `type` field is a whitelist (event, knowledge, workflow, ...), so
// for the kinds that share the /api/memories endpoint we map our
// internal kind onto the closest whitelisted type.
function memoryOsPathFor(kind, twinId) {
  switch (kind) {
    case 'working':
      return `/api/memory/working/${encodeURIComponent(twinId)}`;
    case 'long-term':
      return `/api/memory/longterm/${encodeURIComponent(twinId)}`;
    case 'episodic':
      return `/api/memories/timeline/${encodeURIComponent(twinId)}`;
    case 'semantic':
      // Semantic memories are searched via the search endpoint with
      // type=knowledge (the whitelisted stand-in for "semantic"). No
      // per-twin path exists.
      return `/api/memories/search?type=knowledge&twinId=${encodeURIComponent(twinId)}`;
    case 'procedural':
      // /api/memories filters by the whitelisted type; we use
      // type=workflow as the closest match for procedural knowledge.
      return `/api/memories?type=workflow&twinId=${encodeURIComponent(twinId)}`;
    default:
      return null;
  }
}

// Per-kind read caps (used to enforce "limit 5 for working", "limit 100
// for long-term", etc.). Working memory is current-task context so a
// tiny window is right; long-term is capped so we don't dump everything.
function readLimitFor(kind) {
  switch (kind) {
    case 'working': return 5;
    case 'long-term': return 100;
    case 'episodic': return 200;
    case 'semantic': return 50;
    case 'procedural': return 100;
    default: return 50;
  }
}

// Tiny HTTP client. Node 20 has global fetch, but we use the built-in
// `http` module here so the bridge has zero runtime dependencies beyond
// what it already pulls in. Returns { status, body } where body is the
// parsed JSON or a raw string.
async function proxyToMemoryOS(method, path, payload, timeoutMs = 5000) {
  const url = new URL(path, MEMORYOS_BASE);
  const isHttps = url.protocol === 'https:';
  const lib = await import(isHttps ? 'node:https' : 'node:http');
  return new Promise((resolve, reject) => {
    const data = payload != null ? Buffer.from(JSON.stringify(payload)) : null;
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Accept': 'application/json',
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}),
      },
    };
    const req = lib.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        let body = raw;
        try { body = raw ? JSON.parse(raw) : null; } catch (_) { /* keep raw */ }
        resolve({ status: res.statusCode, body });
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`MemoryOS timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  const twinsWithBindings = Array.from(bindings.values()).filter((b) => !b.tenant || b.tenant !== 'system').length;
  res.json({
    status: 'healthy',
    service: 'twin-memory-bridge',
    version: '1.0.0',
    port: PORT,
    storage: { mongodb: persistence.isUsingMongo() ? 'connected' : 'in-memory fallback' },
    counts: {
      bindings: bindings.size,
      partitions: partitions.size,
      audit: audit.length,
      twinsWithBindings,
    },
    kinds: KINDS,
    capabilities: [
      'bind-twin-to-partition',
      'get-binding', 'list-bindings', 'unbind',
      'get-partition', 'resolve-partition',
      'bulk-bind', 'bulk-resolve',
      'memory-stat',
      'proxy-memory-read',
      'proxy-memory-write',
      'proxy-memory-migrate',
      'audit',
    ],
    memoryOsBase: MEMORYOS_BASE,
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Bind / unbind ──────────────────────────────────────────────────────────

// Bind a twin to a memory partition (creates the partition if absent)
app.post('/api/twins/:twinId/bind',requireAuth,  async (req, res) => {
  const { twinId } = req.params;
  const { kind, partitionRef, metadata } = req.body || {};
  if (!kind || !KINDS.includes(kind)) {
    return res.status(400).json({ error: `kind required; allowed: ${KINDS.join(',')}` });
  }

  const binding = ensureBinding(twinId);
  // Reuse an existing partition for this twin+kind, else create one
  let partitionId = binding.partitions[kind];
  if (!partitionId) {
    partitionId = uuidv4();
    const partition = {
      id: partitionId,
      twinId,
      kind,
      ref: partitionRef || `memory-os://twin/${twinId}/${kind}`,
      createdAt: new Date().toISOString(),
      stats: { writes: 0, reads: 0 },
      metadata: metadata || {},
    };
    partitions.set(partitionId, partition);
    binding.partitions[kind] = partitionId;
    await persistence.partitionUpsert(partition);
  } else if (partitionRef) {
    const p = partitions.get(partitionId);
    if (p) {
      p.ref = partitionRef;
      await persistence.partitionUpsert(p);
    }
  }
  if (metadata) {
    const p = partitions.get(partitionId);
    if (p) {
      p.metadata = { ...(p.metadata || {}), ...metadata };
      await persistence.partitionUpsert(p);
    }
  }
  binding.updatedAt = new Date().toISOString();
  await persistence.bindingUpsert(twinId, { partitions: binding.partitions, metadata: binding.metadata });
  await persistence.auditAppend({ kind: 'bind', twinId, partitionId, memoryKind: kind });
  auditLog({ kind: 'bind', twinId, partitionId, memoryKind: kind });
  res.status(201).json({ twinId, partitionId, kind: kind, partition: partitions.get(partitionId) });
});

// Bulk-bind many twins (for tenant onboarding, batch imports, etc.)
app.post('/api/bulk-bind',requireAuth,  async (req, res) => {
  const { twinIds, kinds, partitionRefPrefix } = req.body || {};
  if (!Array.isArray(twinIds) || twinIds.length === 0) {
    return res.status(400).json({ error: 'twinIds[] required' });
  }
  const useKinds = Array.isArray(kinds) && kinds.length > 0 ? kinds : KINDS;
  const bound = [];
  for (const twinId of twinIds) {
    const binding = ensureBinding(twinId);
    for (const kind of useKinds) {
      if (binding.partitions[kind]) continue;
      const partitionId = uuidv4();
      const partition = {
        id: partitionId,
        twinId,
        kind,
        ref: `${partitionRefPrefix || 'memory-os://twin'}/${twinId}/${kind}`,
        createdAt: new Date().toISOString(),
        stats: { writes: 0, reads: 0 },
      };
      partitions.set(partitionId, partition);
      binding.partitions[kind] = partitionId;
      bound.push({ twinId, kind, partitionId });
      await persistence.partitionUpsert(partition);
    }
    await persistence.bindingUpsert(twinId, { partitions: binding.partitions, metadata: binding.metadata });
  }
  await persistence.auditAppend({ kind: 'bulk-bind', count: bound.length });
  auditLog({ kind: 'bulk-bind', count: bound.length });
  res.status(201).json({ bound: bound.length, records: bound });
});

// Unbind one kind (removes the binding; does NOT delete the partition)
app.delete('/api/twins/:twinId/bind/:kind',requireAuth,  async (req, res) => {
  const { twinId, kind } = req.params;
  const binding = bindings.get(twinId);
  if (!binding || !binding.partitions[kind]) {
    return res.status(404).json({ error: 'binding not found' });
  }
  const partitionId = binding.partitions[kind];
  delete binding.partitions[kind];
  const p = partitions.get(partitionId);
  if (p) p.twinId = null;          // orphan the partition (still queryable)
  await persistence.bindingDeleteKind(twinId, kind);
  await persistence.partitionOrphan(partitionId);
  auditLog({ kind: 'unbind', twinId, memoryKind: kind, partitionId });
  res.status(204).end();
});

// Unbind ALL kinds for a twin
app.delete('/api/twins/:twinId/bind',requireAuth,  async (req, res) => {
  const binding = bindings.get(twinId);
  if (!binding) return res.status(404).json({ error: 'no bindings for twin' });
  for (const kind of Object.keys(binding.partitions)) {
    const pid = binding.partitions[kind];
    const p = partitions.get(pid);
    if (p) p.twinId = null;
    await persistence.partitionOrphan(pid);
  }
  bindings.delete(twinId);
  await persistence.bindingDeleteAll(twinId);
  auditLog({ kind: 'unbind-all', twinId });
  res.status(204).end();
});

// ── Read ───────────────────────────────────────────────────────────────────

app.get('/api/twins/:twinId/binding', (req, res) => {
  const b = resolveBinding(req.params.twinId);
  if (!b) return res.json({ twinId: req.params.twinId, partitions: {}, bound: false });
  res.json({ ...b, bound: true });
});

app.get('/api/twins/:twinId/binding/:kind', (req, res) => {
  const partition = resolvePartition(req.params.twinId, req.params.kind);
  if (!partition) return res.status(404).json({ error: 'partition not found' });
  res.json(partition);
});

app.get('/api/bindings', (_req, res) => {
  res.json({ bindings: Array.from(bindings.values()) });
});

// The "what memory does this twin own?" query — the centerpiece of the
// "each twin owns its own memory" principle.
app.get('/api/twins/:twinId/memory', (req, res) => {
  const b = resolveBinding(req.params.twinId);
  if (!b) {
    return res.json({ twinId: req.params.twinId, ownedKinds: [], partitions: [] });
  }
  const owned = [];
  for (const [kind, pid] of Object.entries(b.partitions)) {
    const p = partitions.get(pid);
    if (p) owned.push({ kind, partitionId: pid, ref: p.ref, stats: p.stats });
  }
  res.json({ twinId: req.params.twinId, ownedKinds: owned.map((o) => o.kind), partitions: owned });
});

// Bulk resolve — for FlowOS plans that touch many twins
app.post('/api/bulk-resolve',requireAuth,  (req, res) => {
  const { twinIds, kind } = req.body || {};
  if (!Array.isArray(twinIds) || !kind) {
    return res.status(400).json({ error: 'twinIds[] and kind required' });
  }
  const out = twinIds.map((twinId) => {
    const p = resolvePartition(twinId, kind);
    return { twinId, partition: p };
  });
  res.json({ kind, count: out.length, results: out });
});

// ── Stats ──────────────────────────────────────────────────────────────────

// Record a read/write hit against a partition (callable from MemoryOS or
// from any consumer that wants to update the count).
app.post('/api/partitions/:partitionId/record',requireAuth,  async (req, res) => {
  const { op } = req.body || {};
  const p = partitions.get(req.params.partitionId);
  if (!p) return res.status(404).json({ error: 'partition not found' });
  if (op === 'read') p.stats.reads += 1;
  else if (op === 'write') p.stats.writes += 1;
  else return res.status(400).json({ error: 'op must be read or write' });
  await persistence.partitionInc(req.params.partitionId, op === 'read' ? 'reads' : 'writes', 1);
  res.json(p);
});

app.get('/api/twins/:twinId/memory-stat', (req, res) => {
  const b = resolveBinding(req.params.twinId);
  if (!b) return res.json({ twinId: req.params.twinId, totalReads: 0, totalWrites: 0 });
  let reads = 0; let writes = 0;
  for (const pid of Object.values(b.partitions)) {
    const p = partitions.get(pid);
    if (!p) continue;
    reads += p.stats.reads;
    writes += p.stats.writes;
  }
  res.json({ twinId: req.params.twinId, totalReads: reads, totalWrites: writes, partitionCount: Object.keys(b.partitions).length });
});

// ── Proxy: actually talk to MemoryOS ───────────────────────────────────────
//
// The endpoints above are *metadata* (which partition does this twin own?).
// These three are the *data* layer: read memories, write a memory, and
// migrate a binding from one kind to another (e.g. promote "episodic"
// memories into "long-term" once they have stabilized).
//
// All three endpoints speak MemoryOS's native HTTP shape on the wire so
// callers can trust the bridge as a single, stable front door.

const PROXY_KINDS = ['working', 'long-term', 'longterm', 'episodic', 'semantic', 'procedural'];

// POST /api/twins/:twinId/memory/read   { kind, query }
//   Routes to the per-kind MemoryOS endpoint, then normalizes the result
//   so every caller gets { twinId, kind, count, memories } regardless of
//   which underlying endpoint produced the data.
app.post('/api/twins/:twinId/memory/read',requireAuth,  async (req, res) => {
  const { twinId } = req.params;
  const { kind, query } = req.body || {};
  const k = normalizeKind(kind);
  if (!k) {
    return res.status(400).json({
      error: `kind required; allowed: ${PROXY_KINDS.join(',')}`,
    });
  }

  // Make sure there's a binding so partition stats get updated even when
  // we end up falling back to a default partition.
  ensureBinding(twinId);
  const partition = resolvePartition(twinId, k);

  const path = memoryOsPathFor(k, twinId);
  if (!path) return res.status(400).json({ error: `no MemoryOS path for kind ${k}` });

  try {
    // `query` is forwarded to the MemoryOS search endpoint (semantic /
    // procedural) when present. For working/long-term/episodic the
    // underlying endpoints don't accept a query string, so we ignore it.
    // MemoryOS's `type` whitelist is honoured here: semantic → knowledge,
    // procedural → workflow.
    const method = 'GET';
    const upstreamPath = (k === 'semantic' && query)
      ? `/api/memories/search?q=${encodeURIComponent(query)}&type=knowledge&twinId=${encodeURIComponent(twinId)}&limit=${readLimitFor(k)}`
      : (k === 'procedural' && query)
        ? `/api/memories?type=workflow&twinId=${encodeURIComponent(twinId)}&q=${encodeURIComponent(query)}&limit=${readLimitFor(k)}`
        : path + (path.includes('?') ? '&' : '?') + `limit=${readLimitFor(k)}`;

    const upstream = await proxyToMemoryOS(method, upstreamPath, null);
    if (upstream.status >= 400) {
      auditLog({ kind: 'proxy-read', twinId, memoryKind: k, ok: false, upstreamStatus: upstream.status });
      return res.status(upstream.status === 404 ? 404 : 502).json({
        error: 'MemoryOS rejected read',
        twinId, kind: k,
        upstreamStatus: upstream.status,
        upstreamBody: upstream.body,
      });
    }

    // Normalize: every MemoryOS endpoint returns a slightly different
    // shape. Collapse to { twinId, kind, count, memories }.
    let memories = [];
    let count = 0;
    const body = upstream.body || {};
    if (Array.isArray(body.entries)) {
      // /api/memory/longterm/:twinId → { entries: [...] }
      memories = body.entries.map((e) => ({
        id: e.id, key: e.key, value: e.value, kind: e.kind, createdAt: e.createdAt, source: 'long-term',
      }));
      count = memories.length;
    } else if (Array.isArray(body.memories)) {
      // /api/memories/timeline/:twinId, /api/memories?type=...  → { memories: [...] }
      memories = body.memories.map((m) => ({ ...m, source: k }));
      count = body.count != null ? body.count : memories.length;
    } else if (body.data && Array.isArray(body.data.results)) {
      // /api/memories/search → { data: { results: [...] } } wrapped in success envelope
      memories = body.data.results.map((m) => ({ ...m, source: 'semantic' }));
      count = body.data.count != null ? body.data.count : memories.length;
    } else if (Array.isArray(body.results)) {
      // Some MemoryOS shapes return { results: [...] } at top level
      memories = body.results.map((m) => ({ ...m, source: 'semantic' }));
      count = body.count != null ? body.count : memories.length;
    } else if (body.data && (body.data.context || body.data.currentTask || body.data.currentConversation)) {
      // /api/memory/working/:twinId → { data: { ...wm } }
      memories = [body.data];
      count = 1;
    } else if (body.success === false) {
      // MemoryOS returned an error envelope (e.g. no working memory yet)
      memories = [];
      count = 0;
    } else {
      // Unknown shape — pass through so callers can inspect it
      memories = [];
      count = 0;
    }

    // Apply per-kind cap (defence in depth: MemoryOS already limits
    // via ?limit=, but the spec requires these specific caps).
    if (memories.length > readLimitFor(k)) memories = memories.slice(0, readLimitFor(k));

    if (partition) {
      partition.stats.reads += 1;
      persistence.partitionInc(partition.id, 'reads', 1).catch(() => {});
    }
    auditLog({ kind: 'proxy-read', twinId, memoryKind: k, ok: true, returned: memories.length });

    res.json({
      twinId,
      kind: k,
      partitionId: partition ? partition.id : null,
      count: memories.length,
      memories,
      source: 'memory-os',
      memoryOsPath: upstreamPath,
    });
  } catch (err) {
    auditLog({ kind: 'proxy-read', twinId, memoryKind: k, ok: false, error: err.message });
    res.status(502).json({
      error: 'failed to reach MemoryOS',
      twinId, kind: k,
      memoryOsBase: MEMORYOS_BASE,
      detail: err.message,
    });
  }
});

// POST /api/twins/:twinId/memory/write   { kind, memory }
//   Writes a memory through the bridge and tags it with the twin's
//   partition so the bridge binding stays in sync with what's actually
//   on the MemoryOS side.
app.post('/api/twins/:twinId/memory/write',requireAuth,  async (req, res) => {
  const { twinId } = req.params;
  const { kind, memory } = req.body || {};
  const k = normalizeKind(kind);
  if (!k) return res.status(400).json({ error: `kind required; allowed: ${PROXY_KINDS.join(',')}` });
  if (!memory || typeof memory !== 'object') {
    return res.status(400).json({ error: 'memory object required' });
  }

  // Auto-bind so a write before an explicit bind still has a partition.
  const binding = ensureBinding(twinId);
  let partition = resolvePartition(twinId, k);
  if (!binding.partitions[k] || !partition || partition.system) {
    // Reuse the bind logic so partitions are never created twice.
    const partitionId = uuidv4();
    partitions.set(partitionId, {
      id: partitionId,
      twinId,
      kind: k,
      ref: `memory-os://twin/${twinId}/${k}`,
      createdAt: new Date().toISOString(),
      stats: { writes: 0, reads: 0 },
      metadata: { createdBy: 'twin-memory-bridge:write' },
    });
    binding.partitions[k] = partitionId;
    partition = partitions.get(partitionId);
  }

  // Choose the MemoryOS write path based on kind. Most kinds share
  // /api/memories (which records to the per-twin timeline and is the
  // canonical "store a memory" endpoint). Working and long-term have
  // their own dedicated write endpoints on MemoryOS.
  let upstreamPath;
  let upstreamBody;
  let method = 'POST';
  const enriched = { ...memory, twinId, kind: k };
  if (k === 'working') {
    upstreamPath = `/api/memory/working/${encodeURIComponent(twinId)}`;
    upstreamBody = enriched.context ? enriched : { ...enriched };
    method = 'PUT';
  } else if (k === 'long-term') {
    upstreamPath = `/api/memory/longterm/${encodeURIComponent(twinId)}`;
    upstreamBody = {
      key: enriched.key || enriched.title || `entry-${Date.now()}`,
      value: enriched.value != null ? enriched.value : (enriched.content || enriched),
      kind: enriched.entryKind || 'preference',
    };
  } else {
    // episodic, semantic, procedural — all go through /api/memories
    // MemoryOS restricts the `type` field to a whitelist (event,
    // knowledge, workflow, ...). We map our 3 kinds onto that whitelist
    // and record the actual kind in metadata so downstream consumers
    // (and the timeline) can still tell the difference.
    const typeForKind = {
      episodic: 'event',
      semantic: 'knowledge',
      procedural: 'workflow',
    };
    upstreamPath = '/api/memories';
    upstreamBody = {
      twinId,
      type: typeForKind[k] || 'event',
      content: enriched.content || enriched.text || enriched.value || '',
      tags: enriched.tags || [k],
      visibility: enriched.visibility || 'private',
      metadata: { ...(enriched.metadata || {}), kind: k, partitionId: partition.id },
    };
  }

  try {
    const upstream = await proxyToMemoryOS(method, upstreamPath, upstreamBody);
    if (upstream.status >= 400) {
      auditLog({ kind: 'proxy-write', twinId, memoryKind: k, ok: false, upstreamStatus: upstream.status });
      return res.status(upstream.status).json({
        error: 'MemoryOS rejected write',
        twinId, kind: k,
        upstreamStatus: upstream.status,
        upstreamBody: upstream.body,
      });
    }
    partition.stats.writes += 1;
    persistence.partitionInc(partition.id, 'writes', 1).catch(() => {});
    auditLog({ kind: 'proxy-write', twinId, memoryKind: k, ok: true, partitionId: partition.id });

    // Unwrap MemoryOS's success envelope { success: true, data: {...} }
    const written = (upstream.body && upstream.body.data) ? upstream.body.data : upstream.body;
    res.status(201).json({
      twinId,
      kind: k,
      partitionId: partition.id,
      memory: written,
      bridgeBinding: partition,
    });
  } catch (err) {
    auditLog({ kind: 'proxy-write', twinId, memoryKind: k, ok: false, error: err.message });
    res.status(502).json({
      error: 'failed to reach MemoryOS',
      twinId, kind: k,
      memoryOsBase: MEMORYOS_BASE,
      detail: err.message,
    });
  }
});

// POST /api/twins/:twinId/migrate   { fromKind, toKind, preserveHistory }
//   Promotes (or moves) the binding from one memory kind to another.
//   Useful for promoting episodic → long-term once memories have
//   stabilized. If preserveHistory is true, the fromKind binding is
//   kept alongside the new toKind binding (so reads can hit both);
//   otherwise the fromKind binding is removed and the partition is
//   orphaned.
app.post('/api/twins/:twinId/migrate',requireAuth,  async (req, res) => {
  const { twinId } = req.params;
  const { fromKind, toKind, preserveHistory = true } = req.body || {};
  const from = normalizeKind(fromKind);
  const to = normalizeKind(toKind);
  if (!from || !to) {
    return res.status(400).json({ error: 'fromKind and toKind required' });
  }
  if (from === to) {
    return res.status(400).json({ error: 'fromKind and toKind must differ' });
  }

  const binding = bindings.get(twinId);
  if (!binding || !binding.partitions[from]) {
    return res.status(404).json({ error: `no binding for twin ${twinId} kind ${from}` });
  }

  const fromPartitionId = binding.partitions[from];
  const fromPartition = partitions.get(fromPartitionId);

  // Create (or reuse) the destination partition.
  let toPartitionId = binding.partitions[to];
  if (!toPartitionId) {
    toPartitionId = uuidv4();
    const toPartitionNew = {
      id: toPartitionId,
      twinId,
      kind: to,
      ref: `memory-os://twin/${twinId}/${to}`,
      createdAt: new Date().toISOString(),
      stats: { writes: 0, reads: 0 },
      metadata: { migratedFrom: from, preserveHistory },
    };
    partitions.set(toPartitionId, toPartitionNew);
    binding.partitions[to] = toPartitionId;
    await persistence.partitionUpsert(toPartitionNew);
  }
  const toPartition = partitions.get(toPartitionId);

  // If preserveHistory is false, orphan the source binding so subsequent
  // reads no longer route through it. The partition stays queryable
  // directly via /api/twins/:twinId/binding/:kind but the default
  // read path is gone.
  if (!preserveHistory) {
    delete binding.partitions[from];
    if (fromPartition) {
      fromPartition.twinId = null;
      fromPartition.metadata = { ...(fromPartition.metadata || {}), orphanedAt: new Date().toISOString() };
      await persistence.partitionUpsert(fromPartition);
    }
  }

  binding.updatedAt = new Date().toISOString();
  await persistence.bindingUpsert(twinId, { partitions: binding.partitions, metadata: binding.metadata });
  await persistence.auditAppend({ kind: 'migrate', twinId, fromKind: from, toKind: to, preserveHistory, fromPartitionId, toPartitionId });
  auditLog({ kind: 'migrate', twinId, fromKind: from, toKind: to, preserveHistory, fromPartitionId, toPartitionId });

  res.status(200).json({
    twinId,
    fromKind: from,
    toKind: to,
    preserveHistory,
    fromPartitionId,
    toPartitionId,
    fromPartition: preserveHistory ? fromPartition : null,
    toPartition,
    binding: { ...binding },
  });
});

// ── Audit ──────────────────────────────────────────────────────────────────

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[twin-memory-bridge]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// =============================================================================
// START — with persistence init and warm-up
// =============================================================================

async function startup() {
  await persistence.connect();
  if (persistence.isUsingMongo()) {
    try {
      // Warm up partitions
      const allPartitions = await persistence.partitionsListAll();
      if (allPartitions) {
        for (const p of allPartitions) partitions.set(p.id, p);
        console.log(`[twin-memory-bridge] warmed up ${allPartitions.length} partitions from MongoDB`);
      }
      // Warm up bindings
      const allBindings = await persistence.bindingsListAll();
      if (allBindings) {
        for (const b of allBindings) bindings.set(b.twinId, { partitions: b.partitions || {}, metadata: b.metadata || {}, updatedAt: b.updatedAt });
        console.log(`[twin-memory-bridge] warmed up ${allBindings.length} bindings from MongoDB`);
      }
      // Re-seed default partitions (idempotent — they always exist)
      seedDefaults();
    } catch (e) {
      console.warn('[twin-memory-bridge] warmup failed:', e.message);
    }
  }
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[twin-memory-bridge] listening on :${PORT}`);
    console.log(`  Storage: ${persistence.isUsingMongo() ? 'MongoDB' : 'in-memory (fallback)'}`);
  });
  installGracefulShutdown(server);
}

startup().catch(err => {
  console.error('twin-memory-bridge startup failed:', err);
  process.exit(1);
});

export default app;
