/**
 * HOJAI AI Fine-Tuning Pipeline (port 4776)
 *
 * LoRA/PEFT orchestration, dataset preparation, training job lifecycle,
 * checkpoint management, evaluation hooks, and a simulated GPU queue.
 *
 * In production this would shell out to:
 *   - peft/transformers (Python, via subprocess)
 *   - trl (RLHF)
 *   - bitsandbytes (quantized training)
 *   - vLLM / TGI for serving the result
 * For now we provide the full lifecycle, validation, and a queue so that
 * everything else in the platform (model-registry, prompt-manager,
 * evaluation-harness) can integrate.
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

const PORT = process.env.PORT || 4776;
const app = express();


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// ─── In-memory state ──────────────────────────────────────────────
const datasets = new PersistentMap('datasets', { serviceName: 'fine-tuning-pipeline' });   // datasetId -> {id, name, rows, format, ...}
const jobs = new PersistentMap('jobs', { serviceName: 'fine-tuning-pipeline' });       // jobId -> {id, datasetId, baseModel, config, status, ...}
const checkpoints = new PersistentMap('checkpoints', { serviceName: 'fine-tuning-pipeline' });// checkpointId -> {id, jobId, step, metrics, ...}
const gpuQueue = [];          // [{jobId, requestedAt, priority}]
const stats = {
  totalDatasets: 0,
  totalJobs: 0,
  totalCheckpoints: 0,
  completedJobs: 0,
  failedJobs: 0,
  errors: 0,
  startedAt: new Date().toISOString(),
};

// ─── Helpers ──────────────────────────────────────────────────────
function ok(res, data) { res.json({ success: true, ...data }); }
function err(res, code, message, status = 400) {
  res.status(status).json({ success: false, error: { code, message, errorId: uuidv4() } });
}

function validateDataset(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 'rows must be a non-empty array';
  for (let i = 0; i < Math.min(rows.length, 5); i++) {
    const r = rows[i];
    if (!r || typeof r !== 'object') return `row ${i} is not an object`;
    if (typeof r.prompt !== 'string' || typeof r.completion !== 'string') {
      return `row ${i} missing required "prompt" + "completion" strings`;
    }
  }
  return null;
}

function simulateTrainingStep(job, stepNum) {
  // Pretend training is making progress. Each step improves the loss.
  const baseLoss = job.config.targetLoss || 0.5;
  const startLoss = job.config.startLoss || 2.5;
  const decay = Math.exp(-stepNum / (job.config.lrDecaySteps || 100));
  const loss = startLoss * decay + baseLoss * (1 - decay) + (Math.random() - 0.5) * 0.05;
  return {
    step: stepNum,
    loss: Math.max(0.01, loss),
    learningRate: (job.config.learningRate || 2e-4) * decay,
    gradNorm: Math.random() * 1.5,
    tokensPerSec: 1000 + Math.random() * 2000,
    timestamp: new Date().toISOString(),
  };
}

// ─── Health ───────────────────────────────────────────────────────
app.get('/health', (req, res) => ok(res, { status: 'healthy', service: 'fine-tuning-pipeline', port: PORT, stats }));
app.get('/api/health', (req, res) => ok(res, { status: 'healthy', service: 'fine-tuning-pipeline', port: PORT, stats }));

// ─── Datasets ─────────────────────────────────────────────────────
app.post('/api/datasets',requireAuth,  (req, res) => {
  const { name, rows, format = 'prompt-completion', source = 'manual', description } = req.body || {};
  if (!name) return err(res, 'VALIDATION', 'name required');
  const v = validateDataset(rows);
  if (v) return err(res, 'VALIDATION', v);

  const id = uuidv4();
  const dataset = {
    id,
    name,
    format,
    source,
    description: description || '',
    rows: rows.length,
    sampleRow: rows[0],
    createdAt: new Date().toISOString(),
  };
  datasets.set(id, dataset);
  stats.totalDatasets++;
  ok(res, { dataset });
});

app.get('/api/datasets', (req, res) => ok(res, { datasets: Array.from(datasets.values()), total: datasets.size }));

app.get('/api/datasets/:id', (req, res) => {
  const ds = datasets.get(req.params.id);
  if (!ds) return err(res, 'NOT_FOUND', 'dataset not found', 404);
  ok(res, { dataset: ds });
});

app.delete('/api/datasets/:id',requireAuth,  (req, res) => {
  const ds = datasets.get(req.params.id);
  if (!ds) return err(res, 'NOT_FOUND', 'dataset not found', 404);
  datasets.delete(req.params.id);
  ok(res, { deleted: ds.id });
});

// ─── Training Jobs ────────────────────────────────────────────────
app.post('/api/jobs',requireAuth,  (req, res) => {
  const {
    datasetId, baseModel, name,
    method = 'lora',           // lora | qlora | full | prefix
    learningRate = 2e-4,
    epochs = 3,
    batchSize = 4,
    maxSteps,
    loraRank = 16,
    loraAlpha = 32,
    loraDropout = 0.05,
    targetModules = ['q_proj', 'v_proj'],
    targetLoss,
    startLoss,
    lrDecaySteps,
    gpuType = 'A100',
    priority = 5,
  } = req.body || {};

  if (!datasetId) return err(res, 'VALIDATION', 'datasetId required');
  if (!baseModel) return err(res, 'VALIDATION', 'baseModel required');
  if (!name) return err(res, 'VALIDATION', 'name required');
  if (!datasets.has(datasetId)) return err(res, 'NOT_FOUND', 'dataset not found', 404);

  const id = uuidv4();
  const job = {
    id,
    name,
    datasetId,
    baseModel,
    method,
    status: 'queued',
    config: {
      learningRate, epochs, batchSize, maxSteps,
      loraRank, loraAlpha, loraDropout, targetModules,
      targetLoss, startLoss, lrDecaySteps,
      gpuType, priority,
    },
    progress: { currentStep: 0, totalSteps: maxSteps || epochs * 100, percent: 0 },
    metrics: { losses: [], bestLoss: null, bestStep: null },
    checkpoints: [],
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    error: null,
  };
  jobs.set(id, job);
  stats.totalJobs++;
  gpuQueue.push({ jobId: id, priority, requestedAt: new Date().toISOString() });
  gpuQueue.sort((a, b) => b.priority - a.priority);

  // Simulate async training start
  setTimeout(() => startJob(id), 500);

  ok(res, { job });
});

app.get('/api/jobs', (req, res) => {
  const { status } = req.query;
  let list = Array.from(jobs.values());
  if (status) list = list.filter(j => j.status === status);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  ok(res, { jobs: list, total: list.length });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return err(res, 'NOT_FOUND', 'job not found', 404);
  ok(res, { job });
});

app.post('/api/jobs/:id/cancel',requireAuth,  (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return err(res, 'NOT_FOUND', 'job not found', 404);
  if (job.status === 'completed' || job.status === 'cancelled') {
    return err(res, 'INVALID_STATE', `job already ${job.status}`);
  }
  job.status = 'cancelled';
  job.completedAt = new Date().toISOString();
  ok(res, { job });
});

app.get('/api/queue', (req, res) => ok(res, { queue: gpuQueue, total: gpuQueue.length }));

// ─── Training simulation ──────────────────────────────────────────
function startJob(id) {
  const job = jobs.get(id);
  if (!job || job.status === 'cancelled') return;
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  // Remove from queue
  const idx = gpuQueue.findIndex(q => q.jobId === id);
  if (idx >= 0) gpuQueue.splice(idx, 1);

  // Step through training
  const totalSteps = job.progress.totalSteps;
  const stepDelay = Math.max(20, 2000 / totalSteps); // 2s total, smaller for big jobs
  let step = 0;
  const tick = () => {
    if (job.status === 'cancelled') return;
    if (step >= totalSteps) {
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      job.progress.percent = 100;
      stats.completedJobs++;
      return;
    }
    const m = simulateTrainingStep(job, step);
    job.metrics.losses.push({ step: m.step, loss: m.loss });
    if (job.metrics.bestLoss === null || m.loss < job.metrics.bestLoss) {
      job.metrics.bestLoss = m.loss;
      job.metrics.bestStep = m.step;
      // Save checkpoint at best loss
      const cpId = uuidv4();
      checkpoints.set(cpId, {
        id: cpId, jobId: id, step: m.step, loss: m.loss, loraRank: job.config.loraRank,
        createdAt: new Date().toISOString(),
        size: `${(Math.random() * 50 + 10).toFixed(1)}MB`,
        artifactUrl: `s3://hojai-models/${id}/checkpoint-${m.step}`,
      });
      job.checkpoints.push(cpId);
      stats.totalCheckpoints++;
    }
    job.progress.currentStep = step + 1;
    job.progress.percent = Math.round((step + 1) / totalSteps * 100);
    step++;
    setTimeout(tick, stepDelay);
  };
  setTimeout(tick, 100);
}

// ─── Checkpoints ──────────────────────────────────────────────────
app.get('/api/checkpoints', (req, res) => {
  const { jobId } = req.query;
  let list = Array.from(checkpoints.values());
  if (jobId) list = list.filter(c => c.jobId === jobId);
  ok(res, { checkpoints: list, total: list.length });
});

app.get('/api/checkpoints/:id', (req, res) => {
  const cp = checkpoints.get(req.params.id);
  if (!cp) return err(res, 'NOT_FOUND', 'checkpoint not found', 404);
  ok(res, { checkpoint: cp });
});

// ─── Methods catalog (the LoRA/PEFT zoo) ─────────────────────────
app.get('/api/methods', (req, res) => ok(res, {
  methods: [
    { id: 'lora',     name: 'LoRA',                   description: 'Low-Rank Adaptation, default for most fine-tunes', params: ['rank', 'alpha', 'dropout', 'target_modules'] },
    { id: 'qlora',    name: 'QLoRA',                  description: 'Quantized LoRA — 4-bit base + LoRA adapters, fits larger models on smaller GPUs', params: ['rank', 'alpha', 'bits', 'target_modules'] },
    { id: 'prefix',   name: 'Prefix Tuning',          description: 'Prepends trainable prefix tokens, no weight changes', params: ['prefix_length', 'prefix_dropout'] },
    { id: 'ia3',      name: 'IA³',                    description: 'Learned scaling vectors — fewer params than LoRA', params: ['target_modules'] },
    { id: 'full',     name: 'Full Fine-Tune',         description: 'All weights trainable, requires significant GPU memory', params: ['learning_rate'] },
  ],
}));

app.get('/api/base-models', (req, res) => ok(res, {
  models: [
    { id: 'llama-3-8b',       family: 'llama',    size: '8B',  recommended: true,  defaultLoraRank: 16 },
    { id: 'llama-3-70b',      family: 'llama',    size: '70B', recommended: false, defaultLoraRank: 32, requiresQLoRA: true },
    { id: 'mistral-7b',       family: 'mistral',  size: '7B',  recommended: true,  defaultLoraRank: 16 },
    { id: 'mixtral-8x7b',     family: 'mistral',  size: '47B', recommended: false, defaultLoraRank: 32, requiresQLoRA: true },
    { id: 'qwen-2-7b',        family: 'qwen',     size: '7B',  recommended: true,  defaultLoraRank: 16 },
    { id: 'phi-3-mini',       family: 'phi',      size: '3.8B',recommended: true,  defaultLoraRank: 8 },
    { id: 'gemma-2-9b',       family: 'gemma',    size: '9B',  recommended: true,  defaultLoraRank: 16 },
  ],
}));

// ─── Seed a demo dataset + job so the service isn't empty ─────────
function seed() {
  const dsId = uuidv4();
  const sampleRows = [
    { prompt: 'What is the capital of France?', completion: 'Paris.' },
    { prompt: 'Translate "hello" to Spanish.', completion: 'Hola.' },
    { prompt: 'Write a haiku about coding.', completion: 'Lines of logic flow /\nCompiler sings silently /\nBug fixes bring the dawn' },
    { prompt: 'Summarize: AI agents are software that use LLMs to take actions.', completion: 'AI agents use LLMs to act.' },
    { prompt: 'Classify sentiment: "I love this!"', completion: 'positive' },
    { prompt: 'What is 2+2?', completion: '4' },
    { prompt: 'Name a primary color.', completion: 'Red, blue, or yellow.' },
    { prompt: 'Define "open source".', completion: 'Software with source code that anyone can inspect, modify, and enhance.' },
  ];
  const ds = {
    id: dsId,
    name: 'demo-qa',
    format: 'prompt-completion',
    source: 'seed',
    description: 'Seed dataset for demo / smoke tests',
    rows: sampleRows.length,
    sampleRow: sampleRows[0],
    createdAt: new Date().toISOString(),
  };
  datasets.set(dsId, ds);
  stats.totalDatasets++;
  console.log(`[fine-tuning-pipeline] seeded dataset ${dsId} (${sampleRows.length} rows)`);
}

// ─── 404 + error handlers ─────────────────────────────────────────
app.use((req, res) => err(res, 'NOT_FOUND', `route ${req.method} ${req.path} not found`, 404));
app.use((e, req, res, next) => {
  stats.errors++;
  console.error(e);
  err(res, 'INTERNAL', e.message, 500);
});

// ─── Boot ─────────────────────────────────────────────────────────
seed();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`[fine-tuning-pipeline] listening on port ${PORT}`);
  console.log(`[fine-tuning-pipeline] health: http://localhost:${PORT}/api/health`);
  console.log(`[fine-tuning-pipeline] methods: http://localhost:${PORT}/api/methods`);
});
installGracefulShutdown(server);
