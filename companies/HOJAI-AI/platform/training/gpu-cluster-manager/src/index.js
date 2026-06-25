/**
 * HOJAI AI GPU Cluster Manager (port 4778) — SELF-CONTAINED
 *
 * Tracks GPU nodes, allocates them to training jobs, monitors utilization,
 * and provides a fair-share scheduler.
 *
 * Storage: file-backed JSON (atomic temp+rename writes)
 * Auth:    X-Internal-Token header
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4778', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'gpu-cluster-manager-internal-token';

const NODES_FILE = path.join(DATA_DIR, 'nodes.json');
const ALLOC_FILE = path.join(DATA_DIR, 'allocations.json');

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(NODES_FILE)) fs.writeFileSync(NODES_FILE, JSON.stringify({ data: {} }));
  if (!fs.existsSync(ALLOC_FILE)) fs.writeFileSync(ALLOC_FILE, JSON.stringify({ data: {} }));
}
function load(file) { ensureDir(); try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return { data: {} }; } }
function save(file, d) { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, file); }
const loadNodes = () => load(NODES_FILE);
const saveNodes = (d) => save(NODES_FILE, d);
const loadAllocs = () => load(ALLOC_FILE);
const saveAllocs = (d) => save(ALLOC_FILE, d);

const GPU_MODELS = {
  'A100-40GB':  { vram: 40,  fp16TFlops: 312, bandwidth: 1555, recommended: ['lora-7B', 'lora-13B', 'qlora-70B-4bit'] },
  'A100-80GB':  { vram: 80,  fp16TFlops: 312, bandwidth: 2039, recommended: ['lora-13B', 'lora-33B', 'qlora-70B'] },
  'H100-80GB':  { vram: 80,  fp16TFlops: 989, bandwidth: 3350, recommended: ['lora-70B', 'full-7B', 'qlora-405B-4bit'] },
  'L40S-48GB':  { vram: 48,  fp16TFlops: 362, bandwidth: 864,  recommended: ['lora-13B', 'inference-70B'] },
  'RTX-4090':   { vram: 24,  fp16TFlops: 165, bandwidth: 1008, recommended: ['lora-7B', 'qlora-13B-4bit'] },
  'T4-16GB':    { vram: 16,  fp16TFlops: 65,  bandwidth: 320,  recommended: ['inference-7B', 'lora-3B'] },
  'V100-32GB':  { vram: 32,  fp16TFlops: 125, bandwidth: 900,  recommended: ['lora-7B', 'lora-13B'] },
};

function canAllocate(node, vramNeeded) {
  return node.vram >= vramNeeded && (node.vram - node.usedVram) >= vramNeeded;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'gpu-cluster-manager', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ── Node registry ────────────────────────────────────────────────
  app.post('/api/nodes', requireInternal, (req, res) => {
    const { name, gpuModel = 'A100-40GB', gpuCount = 1, region = 'us-east-1', labels = [] } = req.body || {};
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });
    const spec = GPU_MODELS[gpuModel];
    if (!spec) return res.status(400).json({ error: 'validation', message: `unknown gpuModel — choose from ${Object.keys(GPU_MODELS).join(', ')}` });
    const data = loadNodes();
    const id = newId('node');
    data.data[id] = {
      id, name, gpuModel, gpuCount, region, labels,
      vram: spec.vram * gpuCount,
      usedVram: 0, currentJob: null, status: 'idle',
      utilization: { gpu: 0, memory: 0, temperature: 35 },
      lastHeartbeat: nowIso(), registeredAt: nowIso(),
    };
    saveNodes(data);
    res.status(201).json(data.data[id]);
  });

  app.get('/api/nodes', (req, res) => {
    const { status, region } = req.query;
    const data = loadNodes();
    let list = Object.values(data.data);
    if (status) list = list.filter((n) => n.status === status);
    if (region) list = list.filter((n) => n.region === region);
    res.json({ nodes: list, total: list.length, available: list.filter((n) => n.status === 'idle').length });
  });

  app.get('/api/nodes/:id', (req, res) => {
    const data = loadNodes();
    const n = data.data[req.params.id];
    if (!n) return res.status(404).json({ error: 'not_found' });
    res.json({ node: n });
  });

  app.post('/api/nodes/:id/heartbeat', requireInternal, (req, res) => {
    const data = loadNodes();
    const n = data.data[req.params.id];
    if (!n) return res.status(404).json({ error: 'not_found' });
    const { gpu = 0, memory = 0, temperature = n.utilization.temperature, jobId = n.currentJob } = req.body || {};
    n.utilization = { gpu, memory, temperature };
    n.lastHeartbeat = nowIso();
    if (jobId !== n.currentJob) n.status = jobId ? 'busy' : 'idle';
    n.currentJob = jobId;
    saveNodes(data);
    res.json({ node: n });
  });

  app.delete('/api/nodes/:id', requireInternal, (req, res) => {
    const data = loadNodes();
    const n = data.data[req.params.id];
    if (!n) return res.status(404).json({ error: 'not_found' });
    if (n.currentJob) return res.status(409).json({ error: 'busy', message: 'node has active job — release first' });
    delete data.data[req.params.id];
    saveNodes(data);
    res.json({ deleted: req.params.id });
  });

  // ── Allocations ───────────────────────────────────────────────────
  app.post('/api/allocate', requireInternal, (req, res) => {
    const { jobId, vramNeeded, gpuModel, region, preferLabels = [] } = req.body || {};
    if (!jobId) return res.status(400).json({ error: 'validation', message: 'jobId required' });
    if (!vramNeeded || vramNeeded < 1) return res.status(400).json({ error: 'validation', message: 'vramNeeded required (GB)' });

    const data = loadNodes();
    const candidates = Object.values(data.data)
      .filter((n) => n.status === 'idle')
      .filter((n) => !gpuModel || n.gpuModel === gpuModel)
      .filter((n) => !region || n.region === region)
      .filter((n) => preferLabels.every((l) => n.labels.includes(l)))
      .filter((n) => canAllocate(n, vramNeeded))
      .sort((a, b) => (b.vram - b.usedVram) - (a.vram - a.usedVram));

    if (!candidates.length) return res.status(503).json({ error: 'no_capacity', message: 'no node matches requirements' });

    const node = candidates[0];
    node.usedVram += vramNeeded;
    node.currentJob = jobId;
    node.status = 'busy';
    saveNodes(data);

    const allocData = loadAllocs();
    const allocId = newId('alloc');
    allocData.data[allocId] = { id: allocId, jobId, nodeId: node.id, vram: vramNeeded, allocatedAt: nowIso() };
    saveAllocs(allocData);
    res.status(201).json({ allocation: allocData.data[allocId], node: { id: node.id, name: node.name, gpuModel: node.gpuModel, region: node.region } });
  });

  app.post('/api/release/:allocId', requireInternal, (req, res) => {
    const allocData = loadAllocs();
    const a = allocData.data[req.params.allocId];
    if (!a) return res.status(404).json({ error: 'not_found' });
    const nodesData = loadNodes();
    const n = nodesData.data[a.nodeId];
    if (n) {
      n.usedVram = Math.max(0, n.usedVram - a.vram);
      n.currentJob = null;
      n.status = 'idle';
      saveNodes(nodesData);
    }
    delete allocData.data[a.id];
    saveAllocs(allocData);
    res.json({ released: a });
  });

  // ── Cluster stats ─────────────────────────────────────────────────
  app.get('/api/cluster/stats', (req, res) => {
    const data = loadNodes();
    const list = Object.values(data.data);
    const totalVram = list.reduce((s, n) => s + n.vram, 0);
    const usedVram = list.reduce((s, n) => s + n.usedVram, 0);
    const busyNodes = list.filter((n) => n.status === 'busy').length;
    const avgGpuUtil = list.length ? list.reduce((s, n) => s + n.utilization.gpu, 0) / list.length : 0;
    const avgMemUtil = list.length ? list.reduce((s, n) => s + n.utilization.memory, 0) / list.length : 0;
    const allocs = loadAllocs();
    res.json({
      totalNodes: list.length, busyNodes, idleNodes: list.length - busyNodes,
      totalVramGb: totalVram, usedVramGb: usedVram, freeVramGb: totalVram - usedVram,
      avgGpuUtilization: Math.round(avgGpuUtil * 100) / 100,
      avgMemoryUtilization: Math.round(avgMemUtil * 100) / 100,
      activeAllocations: Object.keys(allocs.data).length,
    });
  });

  app.get('/api/gpu-models', (_req, res) => res.json({ models: GPU_MODELS }));

  // ── Seed demo nodes ───────────────────────────────────────────────
  function seed() {
    ensureDir();
    const data = loadNodes();
    if (Object.keys(data.data).length > 0) return;
    const seeds = [
      { name: 'train-node-01', gpuModel: 'H100-80GB', gpuCount: 8, region: 'us-east-1', labels: ['training', 'priority'] },
      { name: 'train-node-02', gpuModel: 'A100-80GB', gpuCount: 8, region: 'us-east-1', labels: ['training'] },
      { name: 'infer-node-01', gpuModel: 'L40S-48GB', gpuCount: 4, region: 'us-west-2', labels: ['inference'] },
      { name: 'dev-node-01',  gpuModel: 'RTX-4090',  gpuCount: 1, region: 'eu-west-1', labels: ['dev', 'experimentation'] },
    ];
    for (const s of seeds) {
      const spec = GPU_MODELS[s.gpuModel];
      const id = newId('node');
      data.data[id] = {
        id, ...s, vram: spec.vram * s.gpuCount, usedVram: 0,
        currentJob: null, status: 'idle',
        utilization: { gpu: 0, memory: 0, temperature: 35 },
        lastHeartbeat: nowIso(), registeredAt: nowIso(),
      };
    }
    saveNodes(data);
    console.log(`[gpu-cluster-manager] seeded ${seeds.length} nodes (${seeds.reduce((s, n) => s + n.gpuCount, 0)} GPUs)`);
  }
  seed();

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`gpu-cluster-manager listening on ${PORT}`));
}

module.exports = { createApp };
