/**
 * mm-asset-store — Multi-Modal Asset Store (port 5343)
 *
 * Stores raw bytes (base64-encoded) + metadata for any modality:
 *   image, audio, video, document, other
 *
 * Provides content-hash dedup: storing the same bytes twice returns the same id.
 *
 * Endpoints:
 *   POST /assets                              store asset (idempotent on content_hash)
 *   GET  /assets                              list (filter: modality, source, q, tag)
 *   GET  /assets/:id                          get asset metadata
 *   GET  /assets/:id/bytes                    get raw base64 bytes
 *   PUT  /assets/:id                          update metadata (NOT bytes)
 *   POST /assets/:id/tags                     add tag(s)
 *   DELETE /assets/:id/tags/:tag              remove tag
 *   DELETE /assets/:id                        delete asset
 *   GET  /hash/:contentHash                   lookup by content_hash
 *   GET  /stats                               counts by modality, source, total bytes
 *
 * Storage: $DATA_DIR/assets.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5343', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-asset-store-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'assets.json');

const VALID_MODALITIES = ['image', 'audio', 'video', 'document', 'other'];
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }
function sha256(input) { return crypto.createHash('sha256').update(input).digest('hex'); }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ assets: {}, hashIndex: {} }, null, 2));
  }
}
function loadAll() {
  ensureDataDir();
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (_) { return { assets: {}, hashIndex: {} }; }
}
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateAssetBody(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.data) return 'data (base64-encoded bytes) required';
  if (!body.modality || !VALID_MODALITIES.includes(body.modality)) return `modality must be one of ${VALID_MODALITIES.join(',')}`;
  if (body.mime_type && typeof body.mime_type !== 'string') return 'mime_type must be string';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-asset-store', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/assets', requireInternal, (req, res) => {
    const err = validateAssetBody(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const buf = Buffer.from(req.body.data, 'base64');
    if (buf.length > MAX_BYTES) return res.status(413).json({ error: 'too_large', max_bytes: MAX_BYTES, size: buf.length });
    const content_hash = sha256(buf);
    // Dedup
    if (data.hashIndex[content_hash]) {
      const existing = data.assets[data.hashIndex[content_hash]];
      existing.ref_count = (existing.ref_count || 1) + 1;
      saveAll(data);
      return res.status(200).json({ ...existing, dedup: true });
    }
    const asset = {
      id: newId('ast'),
      content_hash,
      modality: req.body.modality,
      mime_type: req.body.mime_type || 'application/octet-stream',
      bytes: req.body.data, // base64
      byte_size: buf.length,
      source: req.body.source || 'unknown',
      tags: Array.isArray(req.body.tags) ? [...req.body.tags] : [],
      metadata: req.body.metadata || {},
      ref_count: 1,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.assets[asset.id] = asset;
    data.hashIndex[content_hash] = asset.id;
    saveAll(data);
    res.status(201).json(asset);
  });

  app.get('/assets', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.assets);
    if (req.query.modality) items = items.filter((a) => a.modality === req.query.modality);
    if (req.query.source) items = items.filter((a) => a.source === req.query.source);
    if (req.query.tag) items = items.filter((a) => a.tags.includes(req.query.tag));
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      items = items.filter((a) =>
        (a.metadata && JSON.stringify(a.metadata).toLowerCase().includes(q)) ||
        a.id.toLowerCase().includes(q) ||
        a.content_hash.includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    const limit = parseInt(req.query.limit || '100', 10);
    items = items.slice(0, limit);
    // Strip bytes from list to keep response small
    const lite = items.map((a) => ({ ...a, bytes: undefined }));
    res.json({ count: items.length, assets: lite });
  });

  app.get('/assets/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.assets[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    res.json(a);
  });

  app.get('/assets/:id/bytes', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.assets[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const buf = Buffer.from(a.bytes, 'base64');
    res.set('Content-Type', a.mime_type);
    res.set('Content-Length', buf.length);
    res.send(buf);
  });

  app.put('/assets/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.assets[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const { source, mime_type, metadata } = req.body || {};
    if (source !== undefined) a.source = source;
    if (mime_type !== undefined) a.mime_type = mime_type;
    if (metadata !== undefined) a.metadata = { ...a.metadata, ...metadata };
    a.updated_at = nowIso();
    saveAll(data);
    res.json(a);
  });

  app.post('/assets/:id/tags', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.assets[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const incoming = Array.isArray(req.body?.tags) ? req.body.tags : [req.body?.tag].filter(Boolean);
    for (const t of incoming) if (!a.tags.includes(t)) a.tags.push(t);
    a.updated_at = nowIso();
    saveAll(data);
    res.json({ id: a.id, tags: a.tags });
  });

  app.delete('/assets/:id/tags/:tag', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.assets[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const before = a.tags.length;
    a.tags = a.tags.filter((t) => t !== req.params.tag);
    a.updated_at = nowIso();
    saveAll(data);
    res.json({ id: a.id, tags: a.tags, removed: before - a.tags.length });
  });

  app.delete('/assets/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const a = data.assets[req.params.id];
    if (!a) return res.status(404).json({ error: 'not_found' });
    a.ref_count = Math.max(0, (a.ref_count || 1) - 1);
    if (a.ref_count === 0) {
      delete data.assets[req.params.id];
      delete data.hashIndex[a.content_hash];
    }
    saveAll(data);
    res.json({ deleted: a.ref_count === 0, id: req.params.id, ref_count: a.ref_count });
  });

  app.get('/hash/:contentHash', requireInternal, (req, res) => {
    const data = loadAll();
    const id = data.hashIndex[req.params.contentHash];
    if (!id) return res.status(404).json({ error: 'not_found' });
    res.json(data.assets[id]);
  });

  app.get('/stats', requireInternal, (_req, res) => {
    const data = loadAll();
    const byModality = {};
    const bySource = {};
    let totalBytes = 0;
    for (const a of Object.values(data.assets)) {
      byModality[a.modality] = (byModality[a.modality] || 0) + 1;
      bySource[a.source] = (bySource[a.source] || 0) + 1;
      totalBytes += a.byte_size || 0;
    }
    res.json({
      asset_count: Object.keys(data.assets).length,
      total_bytes: totalBytes,
      by_modality: byModality,
      by_source: bySource,
    });
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-asset-store listening on ${PORT}`));
}

module.exports = { createApp };