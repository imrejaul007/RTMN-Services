/**
 * Prompt Twin OS - Digital Twin of every AI interaction
 * Port: 5266
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5266;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory stores
const promptDefinitions = new Map();
const promptExecutions = new Map();
const promptVariants = new Map();
const promptAnalytics = new Map();

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'prompt-twin-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['prompt_versioning', 'prompt_lineage', 'prompt_registry', 'prompt_analytics', 'ab_testing']
}));

// Prompt Definition Routes (prompt.definition)
app.post('/api/prompts', (req, res) => {
  const { name, prompt, description, tags } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const promptId = `prompt-${uuidv4().slice(0, 8)}`;
  const definition = {
    promptId,
    name: name || `Prompt ${promptId}`,
    prompt,
    description: description || '',
    hash: Buffer.from(prompt).toString('base64').slice(0, 12),
    tags: tags || [],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lineage: []
  };

  promptDefinitions.set(promptId, definition);
  res.status(201).json(definition);
});

app.get('/api/prompts', (req, res) => {
  let prompts = Array.from(promptDefinitions.values());
  if (req.query.tag) {
    prompts = prompts.filter(p => p.tags.includes(req.query.tag));
  }
  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    prompts = prompts.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.prompt.toLowerCase().includes(search)
    );
  }
  res.json({ count: prompts.length, prompts });
});

app.get('/api/prompts/:promptId', (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) return res.status(404).json({ error: 'Not found' });
  res.json(prompt);
});

app.put('/api/prompts/:promptId', (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) return res.status(404).json({ error: 'Not found' });

  const { prompt: newPrompt, name, description, tags } = req.body;

  if (newPrompt && newPrompt !== prompt.prompt) {
    prompt.lineage.push({
      version: prompt.version,
      prompt: prompt.prompt,
      hash: prompt.hash,
      changedAt: new Date().toISOString()
    });
    prompt.prompt = newPrompt;
    prompt.hash = Buffer.from(newPrompt).toString('base64').slice(0, 12);
    prompt.version++;
  }

  if (name) prompt.name = name;
  if (description !== undefined) prompt.description = description;
  if (tags) prompt.tags = tags;
  prompt.updatedAt = new Date().toISOString();

  promptDefinitions.set(req.params.promptId, prompt);
  res.json(prompt);
});

app.get('/api/prompts/:promptId/lineage', (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) return res.status(404).json({ error: 'Not found' });
  res.json({ promptId: req.params.promptId, lineage: prompt.lineage });
});

// Prompt Execution Routes (prompt.execution)
app.post('/api/executions', (req, res) => {
  const { promptId, output, model, parameters, duration } = req.body;
  if (!output) return res.status(400).json({ error: 'output required' });

  const executionId = `exec-${uuidv4().slice(0, 8)}`;
  const execution = {
    executionId,
    promptId: promptId || 'ad-hoc',
    output,
    model: model || 'unknown',
    parameters: parameters || {},
    duration: duration || null,
    executedAt: new Date().toISOString()
  };

  promptExecutions.set(executionId, execution);
  res.status(201).json(execution);
});

app.get('/api/executions/:executionId', (req, res) => {
  const execution = promptExecutions.get(req.params.executionId);
  if (!execution) return res.status(404).json({ error: 'Not found' });
  res.json(execution);
});

app.get('/api/prompts/:promptId/executions', (req, res) => {
  const executions = Array.from(promptExecutions.values())
    .filter(e => e.promptId === req.params.promptId);
  res.json({ count: executions.length, executions });
});

app.post('/api/executions/:executionId/feedback', (req, res) => {
  const execution = promptExecutions.get(req.params.executionId);
  if (!execution) return res.status(404).json({ error: 'Not found' });

  const { rating, feedback, approved } = req.body;
  execution.rating = rating;
  execution.feedback = feedback;
  execution.approved = approved;
  execution.feedbackAt = new Date().toISOString();

  promptExecutions.set(req.params.executionId, execution);
  res.json(execution);
});

// Prompt Variant Routes (A/B Testing)
app.post('/api/variants', (req, res) => {
  const { name, promptId, variants } = req.body;
  if (!name || !variants || variants.length < 2) {
    return res.status(400).json({ error: 'name and at least 2 variants required' });
  }

  const variantSetId = `vset-${uuidv4().slice(0, 8)}`;
  const variantSet = {
    variantSetId,
    name,
    promptId: promptId || null,
    variants: variants.map((v, i) => ({
      variantId: `var-${uuidv4().slice(0, 8)}`,
      name: v.name || `Variant ${String.fromCharCode(65 + i)}`,
      prompt: v.prompt,
      weight: v.weight || (100 / variants.length),
      stats: { impressions: 0, successes: 0 }
    })),
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  promptVariants.set(variantSetId, variantSet);
  res.status(201).json(variantSet);
});

app.get('/api/variants/:variantSetId', (req, res) => {
  const variantSet = promptVariants.get(req.params.variantSetId);
  if (!variantSet) return res.status(404).json({ error: 'Not found' });
  res.json(variantSet);
});

app.post('/api/variants/:variantSetId/start', (req, res) => {
  const variantSet = promptVariants.get(req.params.variantSetId);
  if (!variantSet) return res.status(404).json({ error: 'Not found' });
  variantSet.status = 'running';
  variantSet.startedAt = new Date().toISOString();
  promptVariants.set(req.params.variantSetId, variantSet);
  res.json(variantSet);
});

app.get('/api/variants/:variantSetId/recommend', (req, res) => {
  const variantSet = promptVariants.get(req.params.variantSetId);
  if (!variantSet) return res.status(404).json({ error: 'Not found' });
  if (variantSet.status !== 'running') {
    return res.json({ variantId: null, message: 'Test not running' });
  }

  // Weighted random selection
  const totalWeight = variantSet.variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;
  for (const variant of variantSet.variants) {
    random -= variant.weight;
    if (random <= 0) {
      return res.json({ variantId: variant.variantId, name: variant.name, prompt: variant.prompt });
    }
  }
  res.json({ variantId: variantSet.variants[0].variantId, name: variantSet.variants[0].name });
});

// Analytics
app.get('/api/prompts/:promptId/analytics', (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) return res.status(404).json({ error: 'Not found' });

  const executions = Array.from(promptExecutions.values())
    .filter(e => e.promptId === req.params.promptId);

  const ratings = executions.filter(e => e.rating).map(e => e.rating);
  res.json({
    promptId: req.params.promptId,
    totalExecutions: executions.length,
    version: prompt.version,
    avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
  });
});

app.get('/api/analytics/summary', (_, res) => {
  res.json({
    totalPrompts: promptDefinitions.size,
    totalExecutions: promptExecutions.size,
    totalVariants: promptVariants.size
  });
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    prompts: promptDefinitions.size,
    executions: promptExecutions.size,
    variants: promptVariants.size
  });
});

app.listen(PORT, () => {
  console.log(`[PromptTwinOS] Prompt Twin OS running on port ${PORT}`);
  console.log('Capabilities: Prompt Versioning, Lineage, Registry, Analytics, A/B Testing');
});
