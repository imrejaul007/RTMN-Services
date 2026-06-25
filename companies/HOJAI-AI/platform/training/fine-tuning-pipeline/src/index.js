/**
 * HOJAI AI Fine-Tuning Pipeline (port 4776) — SELF-CONTAINED
 *
 * LoRA/PEFT orchestration, dataset preparation, training job lifecycle,
 * checkpoint management, and simulated GPU queue.
 *
 * Storage: file-backed JSON (atomic temp+rename writes)
 * Auth:    X-Internal-Token header
 *
 * Ports per CANONICAL-PORT-REGISTRY.md (Phase 30).
 * In production would call: peft/transformers/trl/bitsandbytes via subprocess.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4776', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'fine-tuning-pipeline-internal-token';

const DS_FILE = path.join(DATA_DIR, 'datasets.json');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const CHECKPOINT_FILE = path.join(DATA_DIR, 'checkpoints.json');

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DS_FILE)) fs.writeFileSync(DS_FILE, JSON.stringify({ data: {} }));
  if (!fs.existsSync(JOBS_FILE)) fs.writeFileSync(JOBS_FILE, JSON.stringify({ data: {} }));
  if (!fs.existsSync(CHECKPOINT_FILE)) fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ data: {} }));
}
function load(file) { ensureDir(); try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return { data: {} }; } }
function save(file, d) { const tmp = file + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, file); }
const loadDS = () => load(DS_FILE);
const saveDS = (d) => save(DS_FILE, d);
const loadJobs = () => load(JOBS_FILE);
const saveJobs = (d) => save(JOBS_FILE, d);
const loadCP = () => load(CHECKPOINT_FILE);
const saveCP = (d) => save(CHECKPOINT_FILE, d);

// In-memory GPU queue (ephemeral)
const gpuQueue = [];

// ─── Training step simulation ──────────────────────────────────────
function simulateStep(job, step) {
  const baseLoss = job.config.targetLoss || 0.5;
  const startLoss = job.config.startLoss || 2.5;
  const decay = Math.exp(-step / (job.config.lrDecaySteps || 100));
  const loss = startLoss * decay + baseLoss * (1 - decay) + (Math.random() - 0.5) * 0.05;
  return {
    step,
    loss: Math.max(0.01, loss),
    learningRate: (job.config.learningRate || 2e-4) * decay,
    gradNorm: Math.random() * 1.5,
    tokensPerSec: 1000 + Math.random() * 2000,
    timestamp: nowIso(),
  };
}

// ─── Training lifecycle ─────────────────────────────────────────────
function startJob(id) {
  const data = loadJobs();
  const job = data.data[id];
  if (!job || job.status === 'cancelled') return;

  job.status = 'running';
  job.startedAt = nowIso();

  // Remove from queue
  const qIdx = gpuQueue.findIndex((q) => q.jobId === id);
  if (qIdx >= 0) gpuQueue.splice(qIdx, 1);

  const totalSteps = job.progress.totalSteps;
  const stepDelay = Math.max(20, 2000 / totalSteps); // ~2s total
  let step = 0;

  function tick() {
    const jobsData = loadJobs();
    const j = jobsData.data[id];
    if (!j || j.status === 'cancelled') return;
    if (step >= totalSteps) {
      j.status = 'completed';
      j.completedAt = nowIso();
      j.progress.percent = 100;
      saveJobs(jobsData);
      return;
    }
    const m = simulateStep(j, step);
    j.metrics.losses.push({ step: m.step, loss: m.loss });
    if (j.metrics.bestLoss === null || m.loss < j.metrics.bestLoss) {
      j.metrics.bestLoss = m.loss;
      j.metrics.bestStep = m.step;
      // Save checkpoint
      const cpId = newId('cp');
      const cpData = loadCP();
      cpData.data[cpId] = {
        id: cpId, jobId: id, step: m.step, loss: m.loss,
        loraRank: j.config.loraRank,
        createdAt: nowIso(),
        size: `${(Math.random() * 50 + 10).toFixed(1)}MB`,
        artifactUrl: `s3://hojai-models/${id}/checkpoint-${m.step}`,
      };
      saveCP(cpData);
      j.checkpoints.push(cpId);
    }
    j.progress.currentStep = step + 1;
    j.progress.percent = Math.round((step + 1) / totalSteps * 100);
    saveJobs(jobsData);
    step++;
    setTimeout(tick, stepDelay);
  }
  setTimeout(tick, 100);
}

// ─── Middleware ─────────────────────────────────────────────────────
function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ─── App ────────────────────────────────────────────────────────────
function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'fine-tuning-pipeline', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ── Datasets ──────────────────────────────────────────────────────
  app.post('/api/datasets', requireInternal, (req, res) => {
    const { name, rows, format = 'prompt-completion', source = 'manual', description } = req.body || {};
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });
    if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'validation', message: 'rows must be a non-empty array' });
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      const r = rows[i];
      if (!r || typeof r !== 'object') return res.status(400).json({ error: 'validation', message: `row ${i} is not an object` });
      if (typeof r.prompt !== 'string' || typeof r.completion !== 'string') {
        return res.status(400).json({ error: 'validation', message: `row ${i} missing "prompt" and "completion" strings` });
      }
    }
    const data = loadDS();
    const id = newId('ds');
    data.data[id] = { id, name, format, source, description: description || '', rows: rows.length, sampleRow: rows[0], createdAt: nowIso() };
    saveDS(data);
    res.status(201).json(data.data[id]);
  });

  app.get('/api/datasets', (_req, res) => {
    const data = loadDS();
    res.json({ datasets: Object.values(data.data), total: Object.keys(data.data).length });
  });

  app.get('/api/datasets/:id', (req, res) => {
    const data = loadDS();
    const ds = data.data[req.params.id];
    if (!ds) return res.status(404).json({ error: 'not_found' });
    res.json({ dataset: ds });
  });

  app.delete('/api/datasets/:id', requireInternal, (req, res) => {
    const data = loadDS();
    if (!data.data[req.params.id]) return res.status(404).json({ error: 'not_found' });
    delete data.data[req.params.id];
    saveDS(data);
    res.json({ deleted: req.params.id });
  });

  // ── Jobs ─────────────────────────────────────────────────────────
  app.post('/api/jobs', requireInternal, (req, res) => {
    const {
      datasetId, baseModel, name,
      method = 'lora',
      learningRate = 2e-4, epochs = 3, batchSize = 4, maxSteps,
      loraRank = 16, loraAlpha = 32, loraDropout = 0.05,
      targetModules = ['q_proj', 'v_proj'],
      targetLoss, startLoss, lrDecaySteps,
      gpuType = 'A100', priority = 5,
    } = req.body || {};

    if (!datasetId) return res.status(400).json({ error: 'validation', message: 'datasetId required' });
    if (!baseModel) return res.status(400).json({ error: 'validation', message: 'baseModel required' });
    if (!name) return res.status(400).json({ error: 'validation', message: 'name required' });

    const dsData = loadDS();
    if (!dsData.data[datasetId]) return res.status(404).json({ error: 'not_found', message: 'dataset not found' });

    const data = loadJobs();
    const id = newId('job');
    data.data[id] = {
      id, name, datasetId, baseModel, method,
      status: 'queued',
      config: { learningRate, epochs, batchSize, maxSteps, loraRank, loraAlpha, loraDropout, targetModules, targetLoss, startLoss, lrDecaySteps, gpuType, priority },
      progress: { currentStep: 0, totalSteps: maxSteps || epochs * 100, percent: 0 },
      metrics: { losses: [], bestLoss: null, bestStep: null },
      checkpoints: [],
      createdAt: nowIso(), startedAt: null, completedAt: null, error: null,
    };
    saveJobs(data);
    gpuQueue.push({ jobId: id, priority, requestedAt: nowIso() });
    gpuQueue.sort((a, b) => b.priority - a.priority);

    // Kick off async training
    setTimeout(() => startJob(id), 500);
    res.status(201).json(data.data[id]);
  });

  app.get('/api/jobs', (req, res) => {
    const data = loadJobs();
    let list = Object.values(data.data);
    if (req.query.status) list = list.filter((j) => j.status === req.query.status);
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ jobs: list, total: list.length });
  });

  app.get('/api/jobs/:id', (req, res) => {
    const data = loadJobs();
    const job = data.data[req.params.id];
    if (!job) return res.status(404).json({ error: 'not_found' });
    res.json({ job });
  });

  app.post('/api/jobs/:id/cancel', requireInternal, (req, res) => {
    const data = loadJobs();
    const job = data.data[req.params.id];
    if (!job) return res.status(404).json({ error: 'not_found' });
    if (job.status === 'completed' || job.status === 'cancelled') {
      return res.status(409).json({ error: 'invalid_state', message: `job already ${job.status}` });
    }
    job.status = 'cancelled';
    job.completedAt = nowIso();
    saveJobs(data);
    res.json({ job });
  });

  app.get('/api/queue', (_req, res) => res.json({ queue: gpuQueue, total: gpuQueue.length }));

  // ── Checkpoints ───────────────────────────────────────────────────
  app.get('/api/checkpoints', (req, res) => {
    const data = loadCP();
    let list = Object.values(data.data);
    if (req.query.jobId) list = list.filter((c) => c.jobId === req.query.jobId);
    res.json({ checkpoints: list, total: list.length });
  });

  app.get('/api/checkpoints/:id', (req, res) => {
    const data = loadCP();
    const cp = data.data[req.params.id];
    if (!cp) return res.status(404).json({ error: 'not_found' });
    res.json({ checkpoint: cp });
  });

  // ── Catalogs ──────────────────────────────────────────────────────
  app.get('/api/methods', (_req, res) => res.json({
    methods: [
      { id: 'lora',    name: 'LoRA',          description: 'Low-Rank Adaptation, default for most fine-tunes', params: ['rank', 'alpha', 'dropout', 'target_modules'] },
      { id: 'qlora',   name: 'QLoRA',          description: '4-bit base + LoRA adapters, fits larger models on smaller GPUs', params: ['rank', 'alpha', 'bits', 'target_modules'] },
      { id: 'prefix',  name: 'Prefix Tuning',  description: 'Prepends trainable prefix tokens, no weight changes', params: ['prefix_length', 'prefix_dropout'] },
      { id: 'ia3',     name: 'IA3',           description: 'Learned scaling vectors — fewer params than LoRA', params: ['target_modules'] },
      { id: 'full',    name: 'Full Fine-Tune',description: 'All weights trainable, significant GPU memory required', params: ['learning_rate'] },
    ],
  }));

  app.get('/api/base-models', (_req, res) => res.json({
    models: [
      { id: 'llama-3-8b',    family: 'llama',    size: '8B',   recommended: true,  defaultLoraRank: 16 },
      { id: 'llama-3-70b',   family: 'llama',    size: '70B',  recommended: false, requiresQLoRA: true },
      { id: 'mistral-7b',    family: 'mistral',  size: '7B',   recommended: true,  defaultLoraRank: 16 },
      { id: 'mixtral-8x7b',  family: 'mistral',  size: '47B',  recommended: false, requiresQLoRA: true },
      { id: 'qwen-2-7b',     family: 'qwen',     size: '7B',   recommended: true,  defaultLoraRank: 16 },
      { id: 'phi-3-mini',    family: 'phi',      size: '3.8B', recommended: true,  defaultLoraRank: 8 },
      { id: 'gemma-2-9b',    family: 'gemma',    size: '9B',   recommended: true,  defaultLoraRank: 16 },
    ],
  }));

  // ── Seed demo dataset ─────────────────────────────────────────────
  function seed() {
    ensureDir();
    const data = loadDS();
    if (Object.keys(data.data).length > 0) return; // already seeded
    const rows = [
      { prompt: 'What is the capital of France?', completion: 'Paris.' },
      { prompt: 'Translate "hello" to Spanish.', completion: 'Hola.' },
      { prompt: 'Write a haiku about coding.', completion: 'Lines of logic flow /\nCompiler sings silently /\nBug fixes bring the dawn' },
      { prompt: 'Summarize: AI agents use LLMs to take actions.', completion: 'AI agents use LLMs to act.' },
      { prompt: 'Classify sentiment: "I love this!"', completion: 'positive' },
    ];
    const id = newId('ds');
    data.data[id] = { id, name: 'demo-qa', format: 'prompt-completion', source: 'seed', description: 'Seed dataset for demo', rows: rows.length, sampleRow: rows[0], createdAt: nowIso() };
    saveDS(data);
    console.log(`[fine-tuning-pipeline] seeded dataset ${id} (${rows.length} rows)`);
  }
  seed();

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`fine-tuning-pipeline listening on ${PORT}`));
}

module.exports = { createApp };
