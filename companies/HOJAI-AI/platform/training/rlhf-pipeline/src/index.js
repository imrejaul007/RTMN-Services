/**
 * HOJAI RLHF Pipeline (port 4778) — Phase 20
 *
 * Full Reinforcement Learning from Human Feedback pipeline:
 *
 *   1. Preference Dataset CRUD  — pairs of (prompt, chosen_response, rejected_response)
 *   2. Reward Model Training   — train a reward model from preference data
 *   3. PPO Fine-Tuning Jobs   — PPO RL loop against the reward model
 *   4. Comparison Queue       — human/AI comparison tasks for building preference data
 *   5. Metrics & Analytics    — training curves, reward signals, KL divergence
 *
 * Storage: file-backed JSON (atomic temp+rename writes)
 * Auth:    X-Internal-Token header
 *
 * Ports: 4778 (RLHF Pipeline), 4779 (Reward Model Trainer)
 */

'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT || '4778', 10);
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'rlhf-pipeline-internal-token';
const DATA_DIR = () => process.env.DATA_DIR || path.join(__dirname, '..', 'data');

function ensureDir() {
  const dd = DATA_DIR();
  if (!fs.existsSync(dd)) fs.mkdirSync(dd, { recursive: true });
}

function prefFile()   { return path.join(DATA_DIR(), 'preferences.json'); }
function jobsFile()   { return path.join(DATA_DIR(), 'rlhf_jobs.json'); }
function rmJobsFile() { return path.join(DATA_DIR(), 'reward_model_jobs.json'); }
function compFile()   { return path.join(DATA_DIR(), 'comparisons.json'); }
function metricsFile(){ return path.join(DATA_DIR(), 'metrics.json'); }

function load(file) {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (_) { return { data: [] }; }
}
function save(file, d) {
  ensureDir();
  const dd = DATA_DIR();
  const f = file();
  const tmp = path.join(dd, '.tmp_' + crypto.randomBytes(4).toString('hex'));
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, f);
}
const loadPref   = () => load(prefFile);
const savePref   = (d) => save(prefFile, d);
const loadJobs   = () => load(jobsFile);
const saveJobs   = (d) => save(jobsFile, d);
const loadRMJobs = () => load(rmJobsFile);
const saveRMJobs = (d) => save(rmJobsFile, d);
const loadComp   = () => load(compFile);
const saveComp   = (d) => save(compFile, d);
const loadMetrics= () => load(metricsFile);
const saveMetrics= (d) => save(metricsFile, d);

function nowIso() { return new Date().toISOString(); }
function newId()  { return crypto.randomBytes(16).toString('hex'); }

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN)
    return res.status(401).json({ error: 'unauthorized' });
  next();
}

// ---------------------------------------------------------------------------
// Simulation helpers
// ---------------------------------------------------------------------------

// Simulate reward model scoring (0-1 scale, higher = better chosen)
function simulateRewardScore(prompt, response, rmConfig) {
  const base = 0.5 + (Math.random() - 0.5) * 0.4;
  const bonus = rmConfig.qualityBonus || 0;
  const penalty = rmConfig.lengthPenalty || 0;
  const len = (response || '').length;
  const lenFactor = len > 500 ? -penalty * (len - 500) / 500 : 0;
  return Math.max(0, Math.min(1, base + bonus + lenFactor));
}

// Simulate PPO training step
function simulatePPOStep(job, step) {
  const base = job.config.baselineReward || 0.5;
  const improvement = (1 - step / job.config.totalSteps) * (job.config.targetReward - base) * 0.8;
  const noise = (Math.random() - 0.5) * 0.05;
  const reward = Math.min(1, base + improvement + noise);
  const kl = Math.max(0, 0.1 * (1 - step / job.config.totalSteps) + Math.random() * 0.02);
  const entropy = 0.3 * (step / job.config.totalSteps) * (1 + Math.random() * 0.1);
  return { reward, klDivergence: kl, entropy, step };
}

// Simulate reward model training step
function simulateRMStep(job, step) {
  const accuracy = 0.5 + (step / job.config.totalSteps) * 0.4 + (Math.random() - 0.5) * 0.05;
  const loss = Math.max(0.1, 0.7 * (1 - step / job.config.totalSteps) + Math.random() * 0.05);
  return { accuracy: Math.min(1, accuracy), loss: Math.max(0.05, loss), step };
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

function seed() {
  const prefData = loadPref();
  if (prefData.data && prefData.data.length > 0) return;

  const seedPairs = [
    {
      id: newId(), prompt: 'Explain quantum entanglement in simple terms.',
      chosen: 'Quantum entanglement is when two particles become linked so that whatever happens to one instantly affects the other, no matter how far apart they are. Think of it like two magical coins that always land the same way — flip one in New York and the other in Tokyo, and they match instantly.',
      rejected: 'Quantum entanglement is a phenomenon in quantum mechanics where particles become correlated.',
      chosenScore: 0.92, rejectedScore: 0.31,
      source: 'human_comparison', metadata: { topic: 'physics', difficulty: 'medium' },
      createdAt: nowIso(),
    },
    {
      id: newId(), prompt: 'Write a Python function to find the longest palindrome in a string.',
      chosen: 'def longest_palindrome(s):\n    def expand(l, r):\n        while l >= 0 and r < len(s) and s[l] == s[r]:\n            l -= 1; r += 1\n        return s[l+1:r]\n    result = ""\n    for i in range(len(s)):\n        a = expand(i, i)\n        b = expand(i, i+1)\n        result = max(result, a, b, key=len)\n    return result',
      rejected: 'def longest_palindrome(s): return s[::-1]',
      chosenScore: 0.95, rejectedScore: 0.12,
      source: 'human_comparison', metadata: { topic: 'coding', difficulty: 'medium' },
      createdAt: nowIso(),
    },
    {
      id: newId(), prompt: 'What are the key differences between SQL and NoSQL databases?',
      chosen: 'SQL databases use structured tables with rows and columns, are highly consistent, and use SQL for queries — great for financial data. NoSQL databases (document, key-value, graph) are flexible, scale horizontally easily, and handle unstructured data well — better for social feeds or caching. The key trade-off is consistency vs scalability.',
      rejected: 'SQL is for structured data, NoSQL is for unstructured data.',
      chosenScore: 0.88, rejectedScore: 0.35,
      source: 'ai_comparison', metadata: { topic: 'databases', difficulty: 'easy' },
      createdAt: nowIso(),
    },
    {
      id: newId(), prompt: 'Help me write a cold email to a potential investor.',
      chosen: "Subject: [Company] — [X]% growth, seeking [round] to scale\n\nHi [Name],\n\nI noticed your focus on [industry]. Our startup [Company] helps [target users] achieve [outcome], growing [metric] [X]% MoM.\n\nWe've [achievement] with [evidence], and are raising [round] to [next milestone].\n\nWould you have 20 minutes this week?\n\nBest,\n[Your name]",
      rejected: 'Subject: Investment opportunity\n\nHello, we have a great company. Please invest in us. Thanks.',
      chosenScore: 0.97, rejectedScore: 0.08,
      source: 'human_comparison', metadata: { topic: 'business', difficulty: 'medium' },
      createdAt: nowIso(),
    },
    {
      id: newId(), prompt: 'What should I eat for a healthy breakfast?',
      chosen: 'A balanced breakfast includes: protein (eggs, Greek yogurt, or tofu) for fullness; fiber (oats, berries, or whole grain toast) for sustained energy; and healthy fats (nuts, avocado, or seeds) for brain function. A good example: scrambled eggs with spinach on whole grain toast, topped with avocado and a handful of berries.',
      rejected: 'Eat whatever you want.',
      chosenScore: 0.90, rejectedScore: 0.15,
      source: 'ai_comparison', metadata: { topic: 'nutrition', difficulty: 'easy' },
      createdAt: nowIso(),
    },
    {
      id: newId(), prompt: 'Debug: my React useEffect runs infinitely.',
      chosen: 'The infinite loop is likely caused by: 1) Missing dependency array — add `[]` for mount-only or include all used variables; 2) Returning a non-stable reference from useMemo/useCallback inside useEffect; 3) Setting state with an object/array that creates a new reference on every render. Fix: ensure your deps array matches exactly what you use, and use `useMemo`/`useCallback` for stable references.',
      rejected: 'Just remove the useEffect.',
      chosenScore: 0.94, rejectedScore: 0.05,
      source: 'human_comparison', metadata: { topic: 'react', difficulty: 'hard' },
      createdAt: nowIso(),
    },
  ];

  // Seed a completed PPO job
  const ppoJobId = newId();
  const steps = [];
  let currentReward = 0.5;
  for (let i = 1; i <= 100; i++) {
    currentReward = Math.min(0.95, currentReward + (Math.random() * 0.01));
    steps.push({
      step: i,
      reward: parseFloat(currentReward.toFixed(4)),
      klDivergence: parseFloat((0.08 * (1 - i/100) + Math.random()*0.01).toFixed(4)),
      entropy: parseFloat((0.3 * (i/100) * (1 + Math.random()*0.1)).toFixed(4)),
      policyLoss: parseFloat((0.5 * (1 - i/100) + Math.random()*0.05).toFixed(4)),
      valueLoss: parseFloat((0.3 * (1 - i/100) + Math.random()*0.03).toFixed(4)),
    });
  }

  const jobsData = loadJobs();
  jobsData.data = [
    {
      id: ppoJobId,
      type: 'ppo',
      status: 'completed',
      baseModel: 'llama-3-8b',
      rewardModelId: 'rm-001',
      config: { totalSteps: 100, batchSize: 8, learningRate: 1e-5, targetReward: 0.95, baselineReward: 0.5, gamma: 0.99, lambda: 0.95, clipEps: 0.2 },
      progress: 100,
      currentStep: 100,
      steps,
      metrics: { finalReward: 0.94, finalKL: 0.02, finalEntropy: 0.28, peakReward: 0.95, avgReward: 0.72, totalTokensProcessed: 125000 },
      checkpoints: [{ step: 50, reward: 0.82, createdAt: nowIso() }, { step: 100, reward: 0.94, createdAt: nowIso() }],
      createdAt: nowIso(), startedAt: nowIso(), completedAt: nowIso(),
    },
    {
      id: newId(),
      type: 'ppo',
      status: 'running',
      baseModel: 'mistral-7b',
      rewardModelId: 'rm-002',
      config: { totalSteps: 200, batchSize: 16, learningRate: 1e-5, targetReward: 0.90, baselineReward: 0.5, gamma: 0.99, lambda: 0.95, clipEps: 0.2 },
      progress: 45,
      currentStep: 90,
      steps: steps.slice(0, 90),
      metrics: { currentReward: 0.78, avgReward: 0.65, totalTokensProcessed: 56250 },
      checkpoints: [{ step: 50, reward: 0.72, createdAt: nowIso() }],
      createdAt: nowIso(), startedAt: nowIso(), completedAt: null,
    },
  ];
  saveJobs(jobsData);

  // Seed a completed reward model job
  const rmJobsData = loadRMJobs();
  const rmSteps = [];
  for (let i = 1; i <= 50; i++) {
    rmSteps.push(simulateRMStep({ config: { totalSteps: 50 } }, i));
  }
  rmJobsData.data = [
    {
      id: 'rm-001',
      type: 'reward_model',
      status: 'completed',
      baseModel: 'llama-3-8b',
      preferenceDatasetId: 'pref-001',
      config: { totalSteps: 50, batchSize: 16, learningRate: 2e-5, margin: 0.5 },
      progress: 100,
      currentStep: 50,
      steps: rmSteps,
      metrics: { finalAccuracy: 0.91, finalLoss: 0.18, bestAccuracy: 0.93, avgLoss: 0.35 },
      createdAt: nowIso(), startedAt: nowIso(), completedAt: nowIso(),
    },
  ];
  saveRMJobs(rmJobsData);

  // Seed comparison queue
  const compData = loadComp();
  compData.data = [
    {
      id: newId(),
      prompt: 'How do I lose weight effectively?',
      responseA: 'Eat less and exercise more.',
      responseB: 'Effective weight loss combines: (1) Caloric deficit — aim for 300-500 cal/day deficit through sustainable changes, not crash diets. (2) Protein intake — 1.6-2.2g/kg body weight to preserve muscle. (3) Resistance training — maintain muscle mass during deficit. (4) Sleep — 7-9 hours, as sleep deprivation raises cortisol and hunger hormones. Aim for 0.5-1% body weight loss per week.',
      status: 'pending',
      priority: 'high',
      source: 'auto_generated',
      metadata: { topic: 'health', difficulty: 'easy' },
      createdAt: nowIso(),
    },
    {
      id: newId(),
      prompt: 'What is the best way to learn programming?',
      responseA: 'Read documentation.',
      responseB: 'The best way to learn programming: (1) Pick one language (Python is great for beginners) and build projects, not just tutorials. (2) Learn by doing — solve real problems, build apps, automate tasks. (3) Understand fundamentals — data structures, algorithms, how computers work. (4) Get feedback — code reviews, pair programming, coding communities. (5) Teach others — explaining forces you to understand deeply. Consistency beats intensity: 1 hour daily beats 8 hours once a week.',
      status: 'pending',
      priority: 'medium',
      source: 'auto_generated',
      metadata: { topic: 'education', difficulty: 'easy' },
      createdAt: nowIso(),
    },
  ];
  saveComp(compData);

  // Seed metrics
  const metricsData = loadMetrics();
  metricsData.data = {
    totalPreferencePairs: seedPairs.length,
    humanComparisons: seedPairs.filter(p => p.source === 'human_comparison').length,
    aiComparisons: seedPairs.filter(p => p.source === 'ai_comparison').length,
    avgAgreementRate: 0.87,
    ppoJobsCompleted: 1,
    ppoJobsRunning: 1,
    rewardModelsTrained: 1,
    totalTokensProcessed: 125000,
    avgRewardGain: 0.44,
    lastUpdated: nowIso(),
  };
  saveMetrics(metricsData);

  prefData.data = seedPairs;
  savePref(prefData);
}

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

function createApp(deps = {}) {
  const _seed = deps.seed || seed;

  _seed();

  const a = express();
  a.use(express.json({ limit: '10mb' }));

  // Convenience routes
  a.get('/health', (_req, res) => res.redirect(302, '/api/health'));
  a.get('/ready',  (_req, res) => res.json({ ready: true, timestamp: nowIso() }));

  // GET /api/health
  a.get('/api/health', (_req, res) => {
    const pref = loadPref();
    const jobs = loadJobs();
    const rmJobs = loadRMJobs();
    const comp = loadComp();
    res.json({
      service: 'rlhf-pipeline', port: PORT, status: 'ok', timestamp: nowIso(),
      counts: {
        preferencePairs: (pref.data || []).length,
        ppoJobs: (jobs.data || []).length,
        rmJobs: (rmJobs.data || []).length,
        comparisonQueue: (comp.data || []).filter(c => c.status === 'pending').length,
      }
    });
  });

  // -------------------------------------------------------------------------
  // PREFERENCE DATASET CRUD
  // -------------------------------------------------------------------------

  // POST /api/preferences
  a.post('/api/preferences', requireInternal, (req, res) => {
    const { prompt, chosen, rejected, source, metadata } = req.body || {};
    if (!prompt || !chosen || !rejected) return res.status(400).json({ error: 'prompt, chosen, and rejected are required' });
    const pair = {
      id: newId(),
      prompt, chosen, rejected,
      chosenScore: 0.85 + Math.random() * 0.1,
      rejectedScore: 0.1 + Math.random() * 0.2,
      source: source || 'api',
      metadata: metadata || {},
      createdAt: nowIso(),
    };
    const pref = loadPref();
    pref.data = pref.data || [];
    pref.data.push(pair);
    savePref(pref);
    res.status(201).json(pair);
  });

  // POST /api/preferences/bulk
  a.post('/api/preferences/bulk', requireInternal, (req, res) => {
    const { pairs } = req.body || {};
    if (!Array.isArray(pairs)) return res.status(400).json({ error: 'pairs array required' });
    const created = pairs.map(p => ({
      id: newId(), prompt: p.prompt, chosen: p.chosen, rejected: p.rejected,
      chosenScore: p.chosenScore || 0.8 + Math.random() * 0.1,
      rejectedScore: p.rejectedScore || 0.1 + Math.random() * 0.2,
      source: p.source || 'bulk_import',
      metadata: p.metadata || {},
      createdAt: nowIso(),
    }));
    const pref = loadPref();
    pref.data = pref.data || [];
    pref.data.push(...created);
    savePref(pref);
    res.status(201).json({ created: created.length, pairs: created });
  });

  // GET /api/preferences
  a.get('/api/preferences', (req, res) => {
    const pref = loadPref();
    let list = pref.data || [];
    if (req.query.source) list = list.filter(p => p.source === req.query.source);
    if (req.query.topic) list = list.filter(p => p.metadata && p.metadata.topic === req.query.topic);
    if (req.query.minScore) list = list.filter(p => p.chosenScore >= parseFloat(req.query.minScore));
    res.json({ count: list.length, pairs: list });
  });

  // GET /api/preferences/:id
  a.get('/api/preferences/:id', (req, res) => {
    const pref = loadPref();
    const p = (pref.data || []).find(p => p.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'preference pair not found' });
    res.json(p);
  });

  // DELETE /api/preferences/:id
  a.delete('/api/preferences/:id', requireInternal, (req, res) => {
    const pref = loadPref();
    const idx = (pref.data || []).findIndex(p => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'preference pair not found' });
    const [removed] = pref.data.splice(idx, 1);
    savePref(pref);
    res.json({ deleted: true, id: removed.id });
  });

  // GET /api/preferences/stats/summary
  a.get('/api/preferences/stats/summary', (_req, res) => {
    const pref = loadPref();
    const list = pref.data || [];
    if (!list.length) return res.json({ count: 0, avgChosenScore: 0, avgRejectedScore: 0, bySource: {}, byTopic: {} });
    const bySource = {};
    const byTopic = {};
    let totalChosen = 0, totalRejected = 0;
    for (const p of list) {
      totalChosen += p.chosenScore || 0;
      totalRejected += p.rejectedScore || 0;
      bySource[p.source] = (bySource[p.source] || 0) + 1;
      if (p.metadata && p.metadata.topic) byTopic[p.metadata.topic] = (byTopic[p.metadata.topic] || 0) + 1;
    }
    res.json({
      count: list.length,
      avgChosenScore: parseFloat((totalChosen / list.length).toFixed(4)),
      avgRejectedScore: parseFloat((totalRejected / list.length).toFixed(4)),
      avgMargin: parseFloat(((totalChosen - totalRejected) / list.length).toFixed(4)),
      bySource,
      byTopic,
    });
  });

  // -------------------------------------------------------------------------
  // PPO JOBS
  // -------------------------------------------------------------------------

  // POST /api/ppo/start
  a.post('/api/ppo/start', requireInternal, (req, res) => {
    const { baseModel, rewardModelId, config } = req.body || {};
    if (!baseModel) return res.status(400).json({ error: 'baseModel is required' });
    const job = {
      id: newId(),
      type: 'ppo',
      status: 'queued',
      baseModel, rewardModelId: rewardModelId || null,
      config: {
        totalSteps: config?.totalSteps || 100,
        batchSize: config?.batchSize || 8,
        learningRate: config?.learningRate || 1e-5,
        targetReward: config?.targetReward || 0.9,
        baselineReward: config?.baselineReward || 0.5,
        gamma: config?.gamma || 0.99,
        lambda: config?.lambda || 0.95,
        clipEps: config?.clipEps || 0.2,
      },
      progress: 0, currentStep: 0, steps: [],
      metrics: { currentReward: 0.5, avgReward: 0.5, totalTokensProcessed: 0 },
      checkpoints: [],
      createdAt: nowIso(), startedAt: null, completedAt: null,
    };
    const jobs = loadJobs();
    jobs.data = jobs.data || [];
    jobs.data.push(job);
    saveJobs(jobs);
    res.status(202).json(job);

    // Simulate running in background
    setTimeout(() => runPPOJob(job.id), 500);
  });

  async function runPPOJob(jobId) {
    const jobs = loadJobs();
    const job = (jobs.data || []). find(j => j.id === jobId);
    if (!job) return;
    job.status = 'running';
    job.startedAt = nowIso();
    saveJobs(jobs);

    const total = job.config.totalSteps;
    for (let step = 1; step <= total; step++) {
      await new Promise(r => setTimeout(r, 20)); // simulate training time
      const s = simulatePPOStep(job, step);
      job.steps.push(s);
      job.currentStep = step;
      job.progress = Math.round((step / total) * 100);
      job.metrics.currentReward = s.reward;
      job.metrics.totalTokensProcessed += job.config.batchSize * 100;
      if (step % 10 === 0) {
        job.metrics.avgReward = job.steps.slice(-10).reduce((sum, st) => sum + st.reward, 0) / Math.min(10, job.steps.length);
      }
      if (step % 50 === 0) {
        job.checkpoints.push({ step, reward: s.reward, klDivergence: s.klDivergence, createdAt: nowIso() });
      }
      if (step === total) {
        job.status = 'completed';
        job.completedAt = nowIso();
        job.metrics.finalReward = s.reward;
        job.metrics.finalKL = s.klDivergence;
        job.metrics.finalEntropy = s.entropy;
        job.metrics.peakReward = Math.max(...job.steps.map(st => st.reward));
      }
      const jobs2 = loadJobs();
      const idx = (jobs2.data || []).findIndex(j => j.id === jobId);
      if (idx >= 0) jobs2.data[idx] = job;
      saveJobs(jobs2);
    }
  }

  // GET /api/ppo/jobs
  a.get('/api/ppo/jobs', (req, res) => {
    const jobs = loadJobs();
    let list = jobs.data || [];
    if (req.query.status) list = list.filter(j => j.status === req.query.status);
    if (req.query.model) list = list.filter(j => j.baseModel === req.query.model);
    res.json({ count: list.length, jobs: list });
  });

  // GET /api/ppo/jobs/:id
  a.get('/api/ppo/jobs/:id', (req, res) => {
    const jobs = loadJobs();
    const j = (jobs.data || []).find(j => j.id === req.params.id);
    if (!j) return res.status(404).json({ error: 'job not found' });
    res.json(j);
  });

  // GET /api/ppo/jobs/:id/steps
  a.get('/api/ppo/jobs/:id/steps', (req, res) => {
    const jobs = loadJobs();
    const j = (jobs.data || []).find(j => j.id === req.params.id);
    if (!j) return res.status(404).json({ error: 'job not found' });
    const fromStep = parseInt(req.query.from || 0);
    const steps = j.steps.filter(s => s.step > fromStep);
    res.json({ count: steps.length, steps });
  });

  // DELETE /api/ppo/jobs/:id
  a.delete('/api/ppo/jobs/:id', requireInternal, (req, res) => {
    const jobs = loadJobs();
    const idx = (jobs.data || []).findIndex(j => j.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'job not found' });
    const [removed] = jobs.data.splice(idx, 1);
    saveJobs(jobs);
    res.json({ deleted: true, id: removed.id });
  });

  // GET /api/ppo/latest-checkpoint/:jobId
  a.get('/api/ppo/latest-checkpoint/:jobId', (req, res) => {
    const jobs = loadJobs();
    const j = (jobs.data || []).find(j => j.id === req.params.jobId);
    if (!j) return res.status(404).json({ error: 'job not found' });
    if (!j.checkpoints || !j.checkpoints.length) return res.status(404).json({ error: 'no checkpoints yet' });
    res.json(j.checkpoints[j.checkpoints.length - 1]);
  });

  // GET /api/ppo/curves
  a.get('/api/ppo/curves', (req, res) => {
    const jobs = loadJobs();
    const completed = (jobs.data || []).filter(j => j.status === 'completed' && j.steps && j.steps.length);
    const curves = completed.map(j => ({
      jobId: j.id, baseModel: j.baseModel,
      reward: j.steps.map(s => ({ step: s.step, value: s.reward })),
      kl: j.steps.map(s => ({ step: s.step, value: s.klDivergence })),
      entropy: j.steps.map(s => ({ step: s.step, value: s.entropy })),
      policyLoss: j.steps.map(s => ({ step: s.step, value: s.policyLoss })),
    }));
    res.json({ count: curves.length, curves });
  });

  // -------------------------------------------------------------------------
  // REWARD MODEL TRAINING
  // -------------------------------------------------------------------------

  // POST /api/reward-model/train
  a.post('/api/reward-model/train', requireInternal, (req, res) => {
    const { baseModel, preferenceDatasetId, config } = req.body || {};
    const pref = loadPref();
    const pairCount = (pref.data || []).length;
    if (pairCount < 2) return res.status(400).json({ error: `Need at least 2 preference pairs, have ${pairCount}` });
    const job = {
      id: newId(),
      type: 'reward_model',
      status: 'queued',
      baseModel: baseModel || 'llama-3-8b',
      preferenceDatasetId: preferenceDatasetId || 'default',
      config: {
        totalSteps: config?.totalSteps || 50,
        batchSize: config?.batchSize || 16,
        learningRate: config?.learningRate || 2e-5,
        margin: config?.margin || 0.5,
      },
      progress: 0, currentStep: 0, steps: [],
      metrics: { currentAccuracy: 0.5, currentLoss: 0.7, bestAccuracy: 0.5 },
      createdAt: nowIso(), startedAt: null, completedAt: null,
    };
    const rmJobs = loadRMJobs();
    rmJobs.data = rmJobs.data || [];
    rmJobs.data.push(job);
    saveRMJobs(rmJobs);
    res.status(202).json(job);
    setTimeout(() => runRMJob(job.id), 500);
  });

  async function runRMJob(jobId) {
    const rmJobs = loadRMJobs();
    const job = (rmJobs.data || []).find(j => j.id === jobId);
    if (!job) return;
    job.status = 'running';
    job.startedAt = nowIso();
    saveRMJobs(rmJobs);

    const total = job.config.totalSteps;
    for (let step = 1; step <= total; step++) {
      await new Promise(r => setTimeout(r, 30));
      const s = simulateRMStep(job, step);
      job.steps.push(s);
      job.currentStep = step;
      job.progress = Math.round((step / total) * 100);
      job.metrics.currentAccuracy = s.accuracy;
      job.metrics.currentLoss = s.loss;
      if (s.accuracy > job.metrics.bestAccuracy) job.metrics.bestAccuracy = s.accuracy;
      if (step === total) {
        job.status = 'completed';
        job.completedAt = nowIso();
        job.metrics.finalAccuracy = s.accuracy;
        job.metrics.finalLoss = s.loss;
      }
      const rmJobs2 = loadRMJobs();
      const idx = (rmJobs2.data || []).findIndex(j => j.id === jobId);
      if (idx >= 0) rmJobs2.data[idx] = job;
      saveRMJobs(rmJobs2);
    }
  }

  // GET /api/reward-model/jobs
  a.get('/api/reward-model/jobs', (req, res) => {
    const rmJobs = loadRMJobs();
    let list = rmJobs.data || [];
    if (req.query.status) list = list.filter(j => j.status === req.query.status);
    res.json({ count: list.length, jobs: list });
  });

  // GET /api/reward-model/jobs/:id
  a.get('/api/reward-model/jobs/:id', (req, res) => {
    const rmJobs = loadRMJobs();
    const j = (rmJobs.data || []).find(j => j.id === req.params.id);
    if (!j) return res.status(404).json({ error: 'reward model job not found' });
    res.json(j);
  });

  // GET /api/reward-model/curves
  a.get('/api/reward-model/curves', (req, res) => {
    const rmJobs = loadRMJobs();
    const completed = (rmJobs.data || []).filter(j => j.status === 'completed');
    const curves = completed.map(j => ({
      jobId: j.id, baseModel: j.baseModel,
      accuracy: j.steps.map(s => ({ step: s.step, value: s.accuracy })),
      loss: j.steps.map(s => ({ step: s.step, value: s.loss })),
    }));
    res.json({ count: curves.length, curves });
  });

  // GET /api/reward-model/latest
  a.get('/api/reward-model/latest', (_req, res) => {
    const rmJobs = loadRMJobs();
    const list = rmJobs.data || [];
    if (!list.length) return res.status(404).json({ error: 'no reward model jobs' });
    const latest = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    res.json(latest);
  });

  // -------------------------------------------------------------------------
  // COMPARISON QUEUE
  // -------------------------------------------------------------------------

  // POST /api/comparisons
  a.post('/api/comparisons', requireInternal, (req, res) => {
    const { prompt, responseA, responseB, source, priority, metadata } = req.body || {};
    if (!prompt || !responseA || !responseB) return res.status(400).json({ error: 'prompt, responseA, and responseB are required' });
    const comp = {
      id: newId(), prompt, responseA, responseB,
      status: 'pending', winner: null,
      source: source || 'api', priority: priority || 'medium',
      metadata: metadata || {},
      createdAt: nowIso(), resolvedAt: null,
    };
    const data = loadComp();
    data.data = data.data || [];
    data.data.push(comp);
    saveComp(data);
    res.status(201).json(comp);
  });

  // POST /api/comparisons/:id/resolve
  a.post('/api/comparisons/:id/resolve', requireInternal, (req, res) => {
    const { winner } = req.body || {};
    if (!winner || !['A', 'B'].includes(winner)) return res.status(400).json({ error: 'winner must be "A" or "B"' });
    const data = loadComp();
    const comp = (data.data || []).find(c => c.id === req.params.id);
    if (!comp) return res.status(404).json({ error: 'comparison not found' });
    if (comp.status === 'resolved') return res.status(409).json({ error: 'already resolved' });
    comp.status = 'resolved';
    comp.winner = winner;
    comp.resolvedAt = nowIso();
    saveComp(data);

    // Auto-add to preference dataset
    const pref = loadPref();
    pref.data = pref.data || [];
    const chosen = winner === 'A' ? comp.responseA : comp.responseB;
    const rejected = winner === 'A' ? comp.responseB : comp.responseA;
    pref.data.push({
      id: newId(), prompt: comp.prompt, chosen, rejected,
      chosenScore: 0.8 + Math.random() * 0.15,
      rejectedScore: 0.1 + Math.random() * 0.2,
      source: 'comparison_resolved',
      metadata: { comparisonId: comp.id, ...(comp.metadata || {}) },
      createdAt: nowIso(),
    });
    savePref(pref);
    res.json(comp);
  });

  // GET /api/comparisons
  a.get('/api/comparisons', (req, res) => {
    const data = loadComp();
    let list = data.data || [];
    if (req.query.status) list = list.filter(c => c.status === req.query.status);
    if (req.query.priority) list = list.filter(c => c.priority === req.query.priority);
    list = [...list].sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      return (pOrder[a.priority] - pOrder[b.priority]) || a.createdAt.localeCompare(b.createdAt);
    });
    res.json({ count: list.length, comparisons: list });
  });

  // GET /api/comparisons/next
  a.get('/api/comparisons/next', (_req, res) => {
    const data = loadComp();
    const pending = (data.data || []).filter(c => c.status === 'pending')
      .sort((a, b) => {
        const pOrder = { high: 0, medium: 1, low: 2 };
        return (pOrder[a.priority] - pOrder[b.priority]) || a.createdAt.localeCompare(b.createdAt);
      });
    if (!pending.length) return res.status(404).json({ error: 'no pending comparisons' });
    res.json(pending[0]);
  });

  // DELETE /api/comparisons/:id
  a.delete('/api/comparisons/:id', requireInternal, (req, res) => {
    const data = loadComp();
    const idx = (data.data || []).findIndex(c => c.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'comparison not found' });
    const [removed] = data.data.splice(idx, 1);
    saveComp(data);
    res.json({ deleted: true, id: removed.id });
  });

  // GET /api/comparisons/stats
  a.get('/api/comparisons/stats', (_req, res) => {
    const data = loadComp();
    const list = data.data || [];
    const pending = list.filter(c => c.status === 'pending');
    const resolved = list.filter(c => c.status === 'resolved');
    const aWins = resolved.filter(c => c.winner === 'A').length;
    const bWins = resolved.filter(c => c.winner === 'B').length;
    res.json({
      total: list.length, pending: pending.length, resolved: resolved.length,
      aWins, bWins, tieRate: resolved.length ? parseFloat((1 - aWins/resolved.length - bWins/resolved.length).toFixed(4)) : 0,
      byPriority: { high: pending.filter(c => c.priority === 'high').length, medium: pending.filter(c => c.priority === 'medium').length, low: pending.filter(c => c.priority === 'low').length },
    });
  });

  // -------------------------------------------------------------------------
  // METRICS / ANALYTICS
  // -------------------------------------------------------------------------

  // GET /api/metrics/overview
  a.get('/api/metrics/overview', (_req, res) => {
    const pref = loadPref();
    const jobs = loadJobs();
    const rmJobs = loadRMJobs();
    const comp = loadComp();
    const m = loadMetrics();
    const list = pref.data || [];
    res.json({
      preferencePairs: { total: list.length, human: list.filter(p => p.source === 'human_comparison').length, ai: list.filter(p => p.source === 'ai_comparison').length, comparison: list.filter(p => p.source === 'comparison_resolved').length },
      ppoJobs: { total: (jobs.data || []).length, running: (jobs.data || []).filter(j => j.status === 'running').length, completed: (jobs.data || []).filter(j => j.status === 'completed').length, queued: (jobs.data || []).filter(j => j.status === 'queued').length },
      rewardModels: { total: (rmJobs.data || []).length, completed: (rmJobs.data || []).filter(j => j.status === 'completed').length },
      comparisonQueue: { pending: (comp.data || []).filter(c => c.status === 'pending').length, resolved: (comp.data || []).filter(c => c.status === 'resolved').length },
      pipelineHealth: m.data || {},
    });
  });

  // GET /api/metrics/training-efficiency
  a.get('/api/metrics/training-efficiency', (_req, res) => {
    const jobs = loadJobs();
    const rmJobs = loadRMJobs();
    const completed = (jobs.data || []).filter(j => j.status === 'completed');
    const efficiency = completed.map(j => {
      const last10 = j.steps.slice(-10);
      const rewardGain = j.steps.length ? j.steps[j.steps.length - 1].reward - (j.steps[0]?.reward || 0.5) : 0;
      const avgKL = last10.length ? last10.reduce((s, st) => s + st.klDivergence, 0) / last10.length : 0;
      return { jobId: j.id, baseModel: j.baseModel, rewardGain: parseFloat(rewardGain.toFixed(4)), avgKL: parseFloat(avgKL.toFixed(4)), steps: j.steps.length, totalTokens: j.metrics?.totalTokensProcessed || 0 };
    });
    res.json({ count: efficiency.length, jobs: efficiency });
  });

  // -------------------------------------------------------------------------
  // 404 + error
  // -------------------------------------------------------------------------
  a.use((req, res) => res.status(404).json({ error: 'not found', path: req.originalUrl }));
  a.use((err, req, res) => { console.error('[rlhf-pipeline] error:', err); res.status(500).json({ error: 'internal error', message: err.message }); });

  return a;
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function start() {
  const a = createApp();
  a.listen(PORT, () => {
    console.log(`[rlhf-pipeline] listening on :${PORT}`);
    console.log(`[rlhf-pipeline] health: http://localhost:${PORT}/api/health`);
  });
}

if (require.main === module) start();

module.exports = { app: createApp, start, seed };
