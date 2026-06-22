/**
 * HOJAI AI GPU Cluster Manager (port 4778)
 *
 * Tracks GPU nodes (real or simulated), allocates them to training jobs,
 * monitors utilization, and provides a fair-share scheduler.
 *
 * In production this would talk to:
 *   - k8s + GPU operator
 *   - slurm
 *   - ray
 *   - AWS / GCP / Azure GPU instance APIs
 *
 * Here we model the cluster as a registry of nodes with capacity, allocated
 * memory, current job, and utilization metrics. The fine-tuning-pipeline
 * (4776) pulls allocations from here.
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4778;
const app = express();


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '5mb' })); app.use(morgan('combined'));

const nodes = new PersistentMap('nodes', { serviceName: 'gpu-cluster-manager' });
const allocations = new PersistentMap('allocations', { serviceName: 'gpu-cluster-manager' });
const stats = {
  totalNodes: 0, totalAllocations: 0, totalDeallocations: 0, errors: 0,
  startedAt: new Date().toISOString(),
};

function ok(res, d) { res.json({ success: true, ...d }); }
function err(res, c, m, s = 400) { res.status(s).json({ success: false, error: { code: c, message: m, errorId: uuidv4() } }); }

const GPU_MODELS = {
  'A100-40GB':   { vram: 40,  fp16TFlops: 312, bandwidth: 1555, recommended: ['lora-7B', 'lora-13B', 'qlora-70B-4bit'] },
  'A100-80GB':   { vram: 80,  fp16TFlops: 312, bandwidth: 2039, recommended: ['lora-13B', 'lora-33B', 'qlora-70B'] },
  'H100-80GB':   { vram: 80,  fp16TFlops: 989, bandwidth: 3350, recommended: ['lora-70B', 'full-7B', 'qlora-405B-4bit'] },
  'L40S-48GB':   { vram: 48,  fp16TFlops: 362, bandwidth: 864,  recommended: ['lora-13B', 'inference-70B'] },
  'RTX-4090':    { vram: 24,  fp16TFlops: 165, bandwidth: 1008, recommended: ['lora-7B', 'qlora-13B-4bit'] },
  'T4-16GB':     { vram: 16,  fp16TFlops: 65,  bandwidth: 320,  recommended: ['inference-7B', 'lora-3B'] },
  'V100-32GB':   { vram: 32,  fp16TFlops: 125, bandwidth: 900,  recommended: ['lora-7B', 'lora-13B'] },
};

function allocateMemory(node, vramNeeded) {
  return node.vram >= vramNeeded && (node.vram - node.usedVram) >= vramNeeded;
}

// ─── Health ─────────────────────────────────────────────────────
app.get('/health', (req, res) => ok(res, { status: 'healthy', service: 'gpu-cluster-manager', port: PORT, stats }));
app.get('/api/health', (req, res) => ok(res, { status: 'healthy', service: 'gpu-cluster-manager', port: PORT, stats }));

// ─── Node registry ──────────────────────────────────────────────
app.post('/api/nodes',requireAuth,  (req, res) => {
  const { name, gpuModel = 'A100-40GB', gpuCount = 1, region = 'us-east-1', labels = [] } = req.body || {};
  if (!name) return err(res, 'VALIDATION', 'name required');
  const spec = GPU_MODELS[gpuModel];
  if (!spec) return err(res, 'VALIDATION', `unknown gpuModel — choose from ${Object.keys(GPU_MODELS).join(', ')}`);

  const id = uuidv4();
  const node = {
    id, name, gpuModel, gpuCount, region, labels,
    vram: spec.vram * gpuCount,
    usedVram: 0,
    currentJob: null,
    status: 'idle',
    utilization: { gpu: 0, memory: 0, temperature: 35 },
    lastHeartbeat: new Date().toISOString(),
    registeredAt: new Date().toISOString(),
  };
  nodes.set(id, node);
  stats.totalNodes++;
  ok(res, { node });
});

app.get('/api/nodes', (req, res) => {
  const { status, region } = req.query;
  let list = Array.from(nodes.values());
  if (status) list = list.filter(n => n.status === status);
  if (region) list = list.filter(n => n.region === region);
  ok(res, { nodes: list, total: list.length, available: list.filter(n => n.status === 'idle').length });
});

app.get('/api/nodes/:id', (req, res) => {
  const n = nodes.get(req.params.id);
  if (!n) return err(res, 'NOT_FOUND', 'node not found', 404);
  ok(res, { node: n });
});

app.post('/api/nodes/:id/heartbeat',requireAuth,  (req, res) => {
  const n = nodes.get(req.params.id);
  if (!n) return err(res, 'NOT_FOUND', 'node not found', 404);
  const { gpu = 0, memory = 0, temperature = n.utilization.temperature, jobId = n.currentJob } = req.body || {};
  n.utilization = { gpu, memory, temperature };
  n.lastHeartbeat = new Date().toISOString();
  if (jobId !== n.currentJob) {
    if (jobId) n.status = 'busy';
    else n.status = 'idle';
  }
  n.currentJob = jobId;
  ok(res, { node: n });
});

app.delete('/api/nodes/:id',requireAuth,  (req, res) => {
  const n = nodes.get(req.params.id);
  if (!n) return err(res, 'NOT_FOUND', 'node not found', 404);
  if (n.currentJob) return err(res, 'BUSY', 'node has an active job — release first', 409);
  nodes.delete(req.params.id);
  ok(res, { deleted: req.params.id });
});

// ─── Allocations ────────────────────────────────────────────────
app.post('/api/allocate',requireAuth,  (req, res) => {
  const { jobId, vramNeeded, gpuModel, region, preferLabels = [] } = req.body || {};
  if (!jobId) return err(res, 'VALIDATION', 'jobId required');
  if (!vramNeeded || vramNeeded < 1) return err(res, 'VALIDATION', 'vramNeeded required (in GB)');

  // Find a candidate node
  const candidates = Array.from(nodes.values())
    .filter(n => n.status === 'idle')
    .filter(n => !gpuModel || n.gpuModel === gpuModel)
    .filter(n => !region || n.region === region)
    .filter(n => preferLabels.every(l => n.labels.includes(l)))
    .filter(n => allocateMemory(n, vramNeeded))
    .sort((a, b) => (b.vram - b.usedVram) - (a.vram - a.usedVram));

  if (!candidates.length) return err(res, 'NO_CAPACITY', 'no node matches requirements', 503);

  const node = candidates[0];
  node.usedVram += vramNeeded;
  node.currentJob = jobId;
  node.status = 'busy';

  const allocId = uuidv4();
  const alloc = {
    id: allocId, jobId, nodeId: node.id, vram: vramNeeded,
    allocatedAt: new Date().toISOString(),
  };
  allocations.set(allocId, alloc);
  stats.totalAllocations++;
  ok(res, { allocation: alloc, node: { id: node.id, name: node.name, gpuModel: node.gpuModel, region: node.region } });
});

app.post('/api/release/:allocationId',requireAuth,  (req, res) => {
  const a = allocations.get(req.params.allocId);
  if (!a) return err(res, 'NOT_FOUND', 'allocation not found', 404);
  const n = nodes.get(a.nodeId);
  if (n) {
    n.usedVram = Math.max(0, n.usedVram - a.vram);
    n.currentJob = null;
    n.status = 'idle';
  }
  allocations.delete(a.id);
  stats.totalDeallocations++;
  ok(res, { released: a });
});

// ─── Cluster stats ──────────────────────────────────────────────
app.get('/api/cluster/stats', (req, res) => {
  const list = Array.from(nodes.values());
  const totalVram = list.reduce((s, n) => s + n.vram, 0);
  const usedVram = list.reduce((s, n) => s + n.usedVram, 0);
  const busyNodes = list.filter(n => n.status === 'busy').length;
  const avgGpuUtil = list.length ? list.reduce((s, n) => s + n.utilization.gpu, 0) / list.length : 0;
  const avgMemUtil = list.length ? list.reduce((s, n) => s + n.utilization.memory, 0) / list.length : 0;
  ok(res, {
    totalNodes: list.length,
    busyNodes, idleNodes: list.length - busyNodes,
    totalVramGb: totalVram, usedVramGb: usedVram, freeVramGb: totalVram - usedVram,
    avgGpuUtilization: Math.round(avgGpuUtil * 100) / 100,
    avgMemoryUtilization: Math.round(avgMemUtil * 100) / 100,
    activeAllocations: allocations.size,
  });
});

// ─── GPU catalog ────────────────────────────────────────────────
app.get('/api/gpu-models', (req, res) => ok(res, { models: GPU_MODELS }));

// ─── Seed: 4 demo nodes ─────────────────────────────────────────
function seed() {
  const seeds = [
    { name: 'train-node-01', gpuModel: 'H100-80GB', gpuCount: 8, region: 'us-east-1', labels: ['training', 'priority'] },
    { name: 'train-node-02', gpuModel: 'A100-80GB', gpuCount: 8, region: 'us-east-1', labels: ['training'] },
    { name: 'infer-node-01', gpuModel: 'L40S-48GB', gpuCount: 4, region: 'us-west-2', labels: ['inference'] },
    { name: 'dev-node-01',  gpuModel: 'RTX-4090',  gpuCount: 1, region: 'eu-west-1', labels: ['dev', 'experimentation'] },
  ];
  for (const s of seeds) {
    const id = uuidv4();
    const spec = GPU_MODELS[s.gpuModel];
    nodes.set(id, {
      id, ...s, vram: spec.vram * s.gpuCount, usedVram: 0,
      currentJob: null, status: 'idle',
      utilization: { gpu: 0, memory: 0, temperature: 35 },
      lastHeartbeat: new Date().toISOString(), registeredAt: new Date().toISOString(),
    });
    stats.totalNodes++;
  }
  console.log(`[gpu-cluster-manager] seeded ${seeds.length} nodes (${seeds.reduce((s,n) => s + n.gpuCount, 0)} GPUs total)`);
}

// ─── Boot ────────────────────────────────────────────────────────
app.use((req, res) => err(res, 'NOT_FOUND', `route ${req.method} ${req.path} not found`, 404));
app.use((e, req, res, next) => { stats.errors++; console.error(e); err(res, 'INTERNAL', e.message, 500); });

seed();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`[gpu-cluster-manager] listening on port ${PORT}`);
  console.log(`[gpu-cluster-manager] health: http://localhost:${PORT}/api/health`);
  console.log(`[gpu-cluster-manager] catalog: http://localhost:${PORT}/api/gpu-models`);
});
installGracefulShutdown(server);
