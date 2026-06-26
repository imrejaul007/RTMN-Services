/**
 * Prompt Twin OS - Digital Twin of every AI interaction
 *
 * Digital Twin for every AI prompt-execution lineage:
 * - Prompt Versioning: Track prompt evolution
 * - Prompt Lineage: Trace prompt to output relationship
 * - Prompt Registry: Centralized prompt management
 * - Prompt Analytics: Usage, cost, effectiveness
 * - Prompt A/B Testing: Compare prompt variations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Diff from 'diff';

const app = express();
const PORT = process.env.PORT || 5266;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) }),
    new winston.transports.File({ filename: 'prompt-twin-os.log' })
  ]
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);

// Auth middleware (simplified)
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Authorization required' });
  }
  req.agentId = token.replace('Bearer ', '');
  next();
};

// ========================
// Data Stores
// ========================
const promptDefinitions = new Map();    // prompt.definition
const promptExecutions = new Map();     // prompt.execution
const promptVariants = new Map();       // prompt.variant (A/B tests)
const promptFeedback = new Map();       // prompt.feedback
const promptAnalytics = new Map();       // Usage statistics

// ========================
// Helper Functions
// ========================
function hashPrompt(prompt) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

function extractMetrics(prompt) {
  const words = prompt.split(/\s+/);
  return {
    tokenEstimate: Math.ceil(prompt.length / 4), // rough estimate
    wordCount: words.length,
    charCount: prompt.length,
    lineCount: prompt.split('\n').length
  };
}

function calculateSimilarity(prompt1, prompt2) {
  const words1 = new Set(prompt1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(prompt2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// ========================
// Routes
// ========================

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'prompt-twin-os',
    status: 'healthy',
    version: '1.0.0',
    capabilities: [
      'prompt_versioning',
      'prompt_lineage',
      'prompt_registry',
      'prompt_analytics',
      'prompt_ab_testing'
    ],
    stats: {
      definitions: promptDefinitions.size,
      executions: promptExecutions.size,
      variants: promptVariants.size,
      feedback: promptFeedback.size
    }
  });
});

// ========================
// Prompt Definition Routes (prompt.definition)
// ========================

// Create prompt definition
app.post('/api/prompts', requireAuth, (req, res) => {
  const { name, prompt, description, tags, metadata } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'prompt required' });
  }

  const promptId = `prompt-${uuidv4().slice(0, 8)}`;
  const metrics = extractMetrics(prompt);

  const definition = {
    promptId,
    name: name || `Prompt ${promptId}`,
    prompt,
    description: description || '',
    hash: hashPrompt(prompt),
    tags: tags || [],
    metadata: metadata || {},
    version: 1,
    createdBy: req.agentId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    metrics,
    lineage: []
  };

  promptDefinitions.set(promptId, definition);
  logger.info(`Created prompt definition: ${promptId}`);

  res.status(201).json(definition);
});

// List prompt definitions
app.get('/api/prompts', requireAuth, (req, res) => {
  let prompts = Array.from(promptDefinitions.values());

  // Filter by tag
  if (req.query.tag) {
    prompts = prompts.filter(p => p.tags.includes(req.query.tag));
  }

  // Filter by search
  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    prompts = prompts.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.prompt.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search)
    );
  }

  // Sort
  const sortBy = req.query.sort || 'updatedAt';
  prompts.sort((a, b) => new Date(b[sortBy]) - new Date(a[sortBy]));

  res.json({
    count: prompts.length,
    prompts: prompts.slice(0, parseInt(req.query.limit) || 100)
  });
});

// Get prompt definition
app.get('/api/prompts/:promptId', requireAuth, (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  res.json(prompt);
});

// Update prompt definition (creates new version)
app.put('/api/prompts/:promptId', requireAuth, (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  const { prompt: newPromptText, name, description, tags, metadata } = req.body;

  if (newPromptText) {
    // Check if actually changed
    if (hashPrompt(newPromptText) === prompt.hash) {
      return res.status(400).json({ error: 'No changes detected' });
    }

    // Create lineage entry
    prompt.lineage.push({
      version: prompt.version,
      prompt: prompt.prompt,
      hash: prompt.hash,
      changedAt: new Date().toISOString(),
      changedBy: req.agentId
    });

    // Update with new version
    prompt.prompt = newPromptText;
    prompt.hash = hashPrompt(newPromptText);
    prompt.version++;
    prompt.metrics = extractMetrics(newPromptText);
  }

  if (name) prompt.name = name;
  if (description !== undefined) prompt.description = description;
  if (tags) prompt.tags = tags;
  if (metadata) prompt.metadata = { ...prompt.metadata, ...metadata };
  prompt.updatedAt = new Date().toISOString();
  prompt.updatedBy = req.agentId;

  promptDefinitions.set(req.params.promptId, prompt);
  logger.info(`Updated prompt: ${req.params.promptId} to version ${prompt.version}`);

  res.json(prompt);
});

// Get prompt lineage
app.get('/api/prompts/:promptId/lineage', requireAuth, (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }
  res.json({
    promptId: req.params.promptId,
    currentVersion: prompt.version,
    currentHash: prompt.hash,
    lineage: prompt.lineage
  });
});

// ========================
// Prompt Execution Routes (prompt.execution)
// ========================

// Record execution
app.post('/api/executions', requireAuth, (req, res) => {
  const { promptId, output, model, parameters, duration } = req.body;

  if (!promptId && !output) {
    return res.status(400).json({ error: 'promptId or output required' });
  }

  const executionId = `exec-${uuidv4().slice(0, 8)}`;

  const execution = {
    executionId,
    promptId: promptId || 'ad-hoc',
    output,
    model: model || 'unknown',
    parameters: parameters || {},
    duration: duration || null,
    outputHash: hashPrompt(output || ''),
    executedBy: req.agentId,
    executedAt: new Date().toISOString(),
    feedback: null,
    rating: null
  };

  promptExecutions.set(executionId, execution);

  // Update analytics
  updateAnalytics('execution', promptId, model);

  logger.info(`Recorded execution: ${executionId}`);
  res.status(201).json(execution);
});

// Get executions for prompt
app.get('/api/prompts/:promptId/executions', requireAuth, (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  let executions = Array.from(promptExecutions.values())
    .filter(e => e.promptId === req.params.promptId);

  // Sort by date
  executions.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt));

  res.json({
    promptId: req.params.promptId,
    count: executions.length,
    executions: executions.slice(0, parseInt(req.query.limit) || 50)
  });
});

// Get execution
app.get('/api/executions/:executionId', requireAuth, (req, res) => {
  const execution = promptExecutions.get(req.params.executionId);
  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }
  res.json(execution);
});

// Add feedback to execution
app.post('/api/executions/:executionId/feedback', requireAuth, (req, res) => {
  const execution = promptExecutions.get(req.params.executionId);
  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  const { rating, feedback, approved } = req.body;

  execution.rating = rating;
  execution.feedback = feedback;
  execution.approved = approved;
  execution.feedbackAt = new Date().toISOString();
  execution.feedbackBy = req.agentId;

  promptExecutions.set(req.params.executionId, execution);

  // Store feedback
  const feedbackEntry = {
    feedbackId: `fb-${uuidv4().slice(0, 8)}`,
    executionId: req.params.executionId,
    rating,
    feedback,
    approved,
    createdBy: req.agentId,
    createdAt: new Date().toISOString()
  };
  promptFeedback.set(feedbackEntry.feedbackId, feedbackEntry);

  res.json(execution);
});

// ========================
// Prompt Variant Routes (prompt.variant - A/B Testing)
// ========================

// Create variant set (A/B test)
app.post('/api/variants', requireAuth, (req, res) => {
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
      name: v.name || `Variant ${String.fromCharCode(65 + i)}`, // A, B, C...
      prompt: v.prompt,
      description: v.description || '',
      hash: hashPrompt(v.prompt),
      isControl: i === 0,
      weight: v.weight || (100 / variants.length), // Equal weight by default
      stats: {
        impressions: 0,
        successes: 0,
        failures: 0,
        avgRating: null
      }
    })),
    status: 'draft',
    createdBy: req.agentId,
    createdAt: new Date().toISOString(),
    startedAt: null,
    endedAt: null
  };

  promptVariants.set(variantSetId, variantSet);
  logger.info(`Created variant set: ${variantSetId}`);

  res.status(201).json(variantSet);
});

// Get variant set
app.get('/api/variants/:variantSetId', requireAuth, (req, res) => {
  const variantSet = promptVariants.get(req.params.variantSetId);
  if (!variantSet) {
    return res.status(404).json({ error: 'Variant set not found' });
  }
  res.json(variantSet);
});

// List variant sets
app.get('/api/variants', requireAuth, (req, res) => {
  let sets = Array.from(promptVariants.values());

  if (req.query.status) {
    sets = sets.filter(s => s.status === req.query.status);
  }

  res.json({
    count: sets.length,
    sets
  });
});

// Start variant test
app.post('/api/variants/:variantSetId/start', requireAuth, (req, res) => {
  const variantSet = promptVariants.get(req.params.variantSetId);
  if (!variantSet) {
    return res.status(404).json({ error: 'Variant set not found' });
  }

  variantSet.status = 'running';
  variantSet.startedAt = new Date().toISOString();
  promptVariants.set(req.params.variantSetId, variantSet);

  res.json(variantSet);
});

// Record variant result
app.post('/api/variants/:variantSetId/results', requireAuth, (req, res) => {
  const variantSet = promptVariants.get(req.params.variantSetId);
  if (!variantSet) {
    return res.status(404).json({ error: 'Variant set not found' });
  }

  const { variantId, success, rating } = req.body;

  const variant = variantSet.variants.find(v => v.variantId === variantId);
  if (!variant) {
    return res.status(404).json({ error: 'Variant not found' });
  }

  variant.stats.impressions++;
  if (success) {
    variant.stats.successes++;
  } else {
    variant.stats.failures++;
  }

  // Update average rating
  if (rating) {
    const prev = variant.stats.avgRating || rating;
    const count = variant.stats.successes + variant.stats.failures;
    variant.stats.avgRating = ((prev * (count - 1)) + rating) / count;
  }

  promptVariants.set(req.params.variantSetId, variantSet);
  res.json(variantSet);
});

// End variant test
app.post('/api/variants/:variantSetId/end', requireAuth, (req, res) => {
  const variantSet = promptVariants.get(req.params.variantSetId);
  if (!variantSet) {
    return res.status(404).json({ error: 'Variant set not found' });
  }

  variantSet.status = 'completed';
  variantSet.endedAt = new Date().toISOString();

  // Calculate winner
  const sorted = [...variantSet.variants].sort((a, b) => {
    const aRate = a.stats.successes / (a.stats.impressions || 1);
    const bRate = b.stats.successes / (b.stats.impressions || 1);
    return bRate - aRate;
  });

  variantSet.winner = sorted[0];
  variantSet.stats = {
    totalImpressions: variantSet.variants.reduce((sum, v) => sum + v.stats.impressions, 0),
    totalSuccesses: variantSet.variants.reduce((sum, v) => sum + v.stats.successes, 0)
  };

  promptVariants.set(req.params.variantSetId, variantSet);
  res.json(variantSet);
});

// Get recommended variant for execution
app.get('/api/variants/:variantSetId/recommend', requireAuth, (req, res) => {
  const variantSet = promptVariants.get(req.params.variantSetId);
  if (!variantSet) {
    return res.status(404).json({ error: 'Variant set not found' });
  }

  if (variantSet.status !== 'running') {
    return res.json({ variantId: null, message: 'Test not running' });
  }

  // Weighted random selection
  const totalWeight = variantSet.variants.reduce((sum, v) => sum + v.weight, 0);
  let random = Math.random() * totalWeight;

  for (const variant of variantSet.variants) {
    random -= variant.weight;
    if (random <= 0) {
      return res.json({
        variantId: variant.variantId,
        name: variant.name,
        prompt: variant.prompt
      });
    }
  }

  // Fallback to first
  res.json({
    variantId: variantSet.variants[0].variantId,
    name: variantSet.variants[0].name,
    prompt: variantSet.variants[0].prompt
  });
});

// ========================
// Prompt Analytics Routes
// ========================

function updateAnalytics(type, promptId, model) {
  const key = `${promptId}:${model || 'unknown'}`;
  const analytics = promptAnalytics.get(key) || {
    promptId,
    model: model || 'unknown',
    executions: 0,
    totalDuration: 0,
    avgDuration: 0,
    ratings: [],
    approvals: 0,
    rejections: 0
  };

  analytics.executions++;
  promptAnalytics.set(key, analytics);
}

// Get prompt analytics
app.get('/api/prompts/:promptId/analytics', requireAuth, (req, res) => {
  const prompt = promptDefinitions.get(req.params.promptId);
  if (!prompt) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  const executions = Array.from(promptExecutions.values())
    .filter(e => e.promptId === req.params.promptId);

  const analytics = {
    promptId: req.params.promptId,
    totalExecutions: executions.length,
    version: prompt.version,
    lastExecuted: executions.length > 0
      ? executions.sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))[0].executedAt
      : null,
    avgDuration: executions.reduce((sum, e) => sum + (e.duration || 0), 0) / (executions.length || 1),
    ratings: {
      avg: executions.filter(e => e.rating).reduce((sum, e) => sum + e.rating, 0) / (executions.filter(e => e.rating).length || 1),
      distribution: {
        1: executions.filter(e => e.rating === 1).length,
        2: executions.filter(e => e.rating === 2).length,
        3: executions.filter(e => e.rating === 3).length,
        4: executions.filter(e => e.rating === 4).length,
        5: executions.filter(e => e.rating === 5).length
      }
    },
    approvalRate: executions.length > 0
      ? (executions.filter(e => e.approved === true).length / executions.length * 100).toFixed(2) + '%'
      : 'N/A'
  };

  res.json(analytics);
});

// Get all analytics summary
app.get('/api/analytics/summary', requireAuth, (req, res) => {
  const prompts = Array.from(promptDefinitions.values());
  const executions = Array.from(promptExecutions.values());
  const variants = Array.from(promptVariants.values());

  res.json({
    totalPrompts: prompts.length,
    totalExecutions: executions.length,
    totalVariants: variants.length,
    runningTests: variants.filter(v => v.status === 'running').length,
    completedTests: variants.filter(v => v.status === 'completed').length,
    avgExecutionsPerPrompt: (executions.length / (prompts.length || 1)).toFixed(2),
    totalFeedback: promptFeedback.size
  });
});

// Find similar prompts
app.get('/api/prompts/similar', requireAuth, (req, res) => {
  const { prompt, threshold } = req.query;
  if (!prompt) {
    return res.status(400).json({ error: 'prompt query parameter required' });
  }

  const similarityThreshold = parseFloat(threshold) || 0.7;
  const similar = [];

  for (const [id, def] of promptDefinitions.entries()) {
    const similarity = calculateSimilarity(prompt, def.prompt);
    if (similarity >= similarityThreshold) {
      similar.push({
        promptId: id,
        name: def.name,
        similarity: (similarity * 100).toFixed(2) + '%',
        version: def.version
      });
    }
  }

  similar.sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity));

  res.json({
    query: prompt.substring(0, 100),
    threshold: similarityThreshold,
    matches: similar.slice(0, 10)
  });
});

// ========================
// Error Handler
// ========================
app.use((err, req, res, next) => {
  logger.error('Prompt Twin OS error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal prompt twin error',
    code: err.code || 'PROMPT_TWIN_ERROR'
  });
});

app.listen(PORT, () => {
  logger.info(`Prompt Twin OS running on port ${PORT}`);
  logger.info('Capabilities: Prompt Versioning, Lineage, Registry, Analytics, A/B Testing');
});

export default app;
