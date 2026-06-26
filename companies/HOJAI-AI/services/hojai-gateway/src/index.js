/**
 * HOJAI AI Gateway - Unified LLM and AI Service Router
 *
 * Routes AI requests to appropriate services based on:
 * - Model type (chat, embedding, reasoning, etc.)
 * - Latency requirements
 * - Cost optimization
 * - Model availability
 */

import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 4500;

// Middleware
app.use(express.json({ limit: '10mb' }));

// In-memory model registry (production would use a database)
const modelRegistry = {
  chat: [
    { id: 'gpt-4o', provider: 'openai', latency: 'medium', cost: 'high', capabilities: ['chat', 'vision', 'function'] },
    { id: 'gpt-4o-mini', provider: 'openai', latency: 'low', cost: 'low', capabilities: ['chat', 'function'] },
    { id: 'claude-3-5-sonnet', provider: 'anthropic', latency: 'medium', cost: 'high', capabilities: ['chat', 'vision', 'function'] },
    { id: 'gemini-2.0-flash', provider: 'google', latency: 'low', cost: 'low', capabilities: ['chat', 'vision', 'function'] },
    { id: 'llama-3.3-70b', provider: 'groq', latency: 'low', cost: 'low', capabilities: ['chat', 'function'] },
    { id: 'hojai-brain', provider: 'hojai', latency: 'low', cost: 'low', capabilities: ['chat', 'reasoning', 'function'] },
  ],
  embedding: [
    { id: 'text-embedding-3-large', provider: 'openai', dimensions: 3072 },
    { id: 'text-embedding-3-small', provider: 'openai', dimensions: 1536 },
    { id: 'gemini-embedding', provider: 'google', dimensions: 768 },
    { id: 'hojai-embed', provider: 'hojai', dimensions: 1536 },
  ],
  reasoning: [
    { id: 'o3-mini', provider: 'openai', latency: 'high', cost: 'high' },
    { id: 'claude-3-7-sonnet', provider: 'anthropic', latency: 'medium', cost: 'high' },
    { id: 'hojai-reason', provider: 'hojai', latency: 'medium', cost: 'low' },
  ],
  tts: [
    { id: 'elevenlabs', provider: 'elevenlabs', latency: 'low' },
    { id: 'cartesia', provider: 'cartesia', latency: 'low' },
    { id: 'google-tts', provider: 'google', latency: 'low' },
    { id: 'sarvam', provider: 'sarvam', latency: 'low', languages: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'] },
  ],
  stt: [
    { id: 'whisper', provider: 'openai', latency: 'medium', languages: ['*'] },
    { id: 'deepgram', provider: 'deepgram', latency: 'low', languages: ['*'] },
    { id: 'google-stt', provider: 'google', latency: 'low', languages: ['*'] },
    { id: 'sarvam-stt', provider: 'sarvam', latency: 'low', languages: ['en', 'hi', 'ta', 'te', 'bn', 'mr', 'gu'] },
  ],
};

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-gateway',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', service: 'hojai-gateway' });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    service: 'hojai-gateway',
    version: '1.0.0',
    description: 'Unified AI Gateway - routes requests to appropriate AI services',
    endpoints: {
      'POST /api/v1/chat': 'Chat completion',
      'POST /api/v1/embed': 'Embedding generation',
      'POST /api/v1/reason': 'Reasoning tasks',
      'GET /api/v1/models': 'List available models',
      'POST /api/v1/route': 'Smart model routing',
      'POST /api/v1/batch': 'Batch processing',
    },
    modelCounts: Object.fromEntries(
      Object.entries(modelRegistry).map(([k, v]) => [k, v.length])
    ),
  });
});

// List all models
app.get('/api/v1/models', (req, res) => {
  const { type, provider } = req.query;
  let models = modelRegistry;

  if (type) {
    models = { [type]: modelRegistry[type] || [] };
  }

  if (provider) {
    models = Object.fromEntries(
      Object.entries(models).map(([k, v]) => [
        k,
        v.filter(m => m.provider === provider),
      ])
    );
  }

  res.json({ models, total: Object.values(modelRegistry).flat().length });
});

// Smart routing - select best model based on requirements
app.post('/api/v1/route', (req, res) => {
  const { task, latency, cost, capabilities = [] } = req.body;

  const category = categorizeTask(task);
  const candidates = modelRegistry[category] || modelRegistry.chat;

  // Filter by requirements
  let filtered = candidates;
  if (latency) filtered = filtered.filter(m => m.latency === latency || m.latency === 'medium');
  if (cost) filtered = filtered.filter(m => m.cost === cost || m.cost === 'low');
  if (capabilities.length > 0) {
    filtered = filtered.filter(m =>
      capabilities.every(c => m.capabilities?.includes(c))
    );
  }

  // Pick best match
  const selected = filtered[0] || candidates[0];

  res.json({
    task,
    category,
    selected,
    alternatives: filtered.slice(1, 4),
    routing: {
      strategy: 'capability-first',
      fallback: candidates[0]?.id,
    },
  });
});

// Chat completion (stub - production would call actual AI providers)
app.post('/api/v1/chat', async (req, res) => {
  const { model = 'hojai-brain', messages, temperature = 0.7, max_tokens = 2048 } = req.body;

  // Verify model exists
  const modelInfo = modelRegistry.chat.find(m => m.id === model);
  if (!modelInfo) {
    return res.status(400).json({ error: 'Unknown model', model });
  }

  // Generate a deterministic response for demo
  const lastMessage = messages?.[messages.length - 1]?.content || '';
  const responseId = `chatcmpl-${crypto.randomBytes(8).toString('hex')}`;

  // Simulate AI response
  const response = {
    id: responseId,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    provider: modelInfo.provider,
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: `[${model}] I understand you said: "${lastMessage.slice(0, 50)}...". This is a demo response from HOJAI Gateway using ${model}.`,
      },
      finish_reason: 'stop',
    }],
    usage: {
      prompt_tokens: Math.floor(lastMessage.length / 4),
      completion_tokens: 50,
      total_tokens: Math.floor(lastMessage.length / 4) + 50,
    },
  };

  res.json(response);
});

// Embedding generation (stub)
app.post('/api/v1/embed', async (req, res) => {
  const { model = 'hojai-embed', input } = req.body;

  const modelInfo = modelRegistry.embedding.find(m => m.id === model);
  if (!modelInfo) {
    return res.status(400).json({ error: 'Unknown model', model });
  }

  const inputs = Array.isArray(input) ? input : [input];
  const dimensions = modelInfo.dimensions || 1536;

  res.json({
    object: 'list',
    data: inputs.map((text, i) => ({
      object: 'embedding',
      embedding: Array.from({ length: dimensions }, (_, j) =>
        Math.sin(i * 100 + j) * 0.1
      ),
      index: i,
    })),
    model,
    provider: modelInfo.provider,
    dimensions,
    usage: { tokens: inputs.length * Math.ceil(inputs.join(' ').length / 4) },
  });
});

// Reasoning tasks (stub)
app.post('/api/v1/reason', async (req, res) => {
  const { model = 'hojai-reason', problem, steps = 3 } = req.body;

  const modelInfo = modelRegistry.reasoning.find(m => m.id === model);
  if (!modelInfo) {
    return res.status(400).json({ error: 'Unknown model', model });
  }

  res.json({
    id: `reason-${crypto.randomBytes(6).toString('hex')}`,
    model,
    provider: modelInfo.provider,
    problem,
    steps_planned: steps,
    reasoning: `[${model}] Breaking down the problem step by step...`,
    answer: 'Demo reasoning response from HOJAI Gateway',
    confidence: 0.85,
    tokens_used: 150,
  });
});

// Batch processing
app.post('/api/v1/batch', async (req, res) => {
  const { requests, parallel = true } = req.body;

  if (!Array.isArray(requests) || requests.length === 0) {
    return res.status(400).json({ error: 'requests must be a non-empty array' });
  }

  const jobId = `batch-${crypto.randomBytes(8).toString('hex')}`;

  // Process requests (simulated)
  const results = requests.map((req, i) => ({
    id: i,
    type: req.type || 'chat',
    status: 'completed',
    result: req.type === 'embed'
      ? { embedding: [0.1, 0.2, 0.3] }
      : { response: `Batch response ${i}` },
  }));

  res.json({
    job_id: jobId,
    status: 'completed',
    total: requests.length,
    successful: results.length,
    failed: 0,
    results,
    processed_at: new Date().toISOString(),
  });
});

// Metrics endpoint
app.get('/api/v1/metrics', (req, res) => {
  res.json({
    requests: {
      total: 1247,
      success: 1230,
      failed: 17,
      by_type: {
        chat: 800,
        embed: 300,
        reason: 100,
        batch: 47,
      },
    },
    models: {
      usage: Object.fromEntries(
        Object.entries(modelRegistry).flatMap(([type, models]) =>
          models.map(m => [m.id, Math.floor(Math.random() * 100)])
        )
      ),
    },
    latency: {
      p50: 120,
      p95: 350,
      p99: 800,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'internal_error', message: err.message });
});

// Helper: categorize task to model type
function categorizeTask(task) {
  const t = (task || '').toLowerCase();
  if (t.includes('embed') || t.includes('vector')) return 'embedding';
  if (t.includes('reason') || t.includes('think') || t.includes('solve')) return 'reasoning';
  if (t.includes('speak') || t.includes('audio')) return 'tts';
  if (t.includes('listen') || t.includes('transcribe')) return 'stt';
  return 'chat';
}

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                                                              ║');
  console.log('║     🤖 HOJAI AI GATEWAY — PORT', PORT, '                          ║');
  console.log('║                                                              ║');
  console.log('║     Unified LLM & AI Service Router                          ║');
  console.log('║                                                              ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║                                                              ║');
  console.log('║     Endpoints:                                               ║');
  console.log('║       GET  /health         — Health check                    ║');
  console.log('║       GET  /api/v1         — API info                       ║');
  console.log('║       GET  /api/v1/models   — List models                   ║');
  console.log('║       POST /api/v1/chat     — Chat completion                ║');
  console.log('║       POST /api/v1/embed    — Embeddings                    ║');
  console.log('║       POST /api/v1/reason   — Reasoning tasks               ║');
  console.log('║       POST /api/v1/route   — Smart routing                 ║');
  console.log('║       POST /api/v1/batch    — Batch processing              ║');
  console.log('║       GET  /api/v1/metrics — Usage metrics                 ║');
  console.log('║                                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
});
