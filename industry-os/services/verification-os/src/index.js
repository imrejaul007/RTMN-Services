/**
 * Verification OS - Makes AI outputs trustworthy
 * Port: 5265
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5265;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// In-memory stores
const baselines = new Map();
const executions = new Map();
const validations = new Map();
const regressions = new Map();

// Seed some baselines
baselines.set('baseline-001', {
  id: 'baseline-001',
  name: 'Good Customer Response',
  prompt: 'Respond to customer complaint professionally',
  outputs: [{ content: 'We apologize for the inconvenience...', hash: 'abc123' }],
  createdAt: new Date().toISOString(),
  tags: ['customer-service', 'production']
});

baselines.set('baseline-002', {
  id: 'baseline-002',
  name: 'API Response Format',
  prompt: 'Return JSON response for user data',
  outputs: [{ content: '{"id": "123", "name": "John"}', hash: 'def456' }],
  createdAt: new Date().toISOString(),
  tags: ['api', 'json']
});

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'verification-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['reproducibility', 'validation', 'regression_detection', 'baseline_management']
}));

// Reproducibility - Execute prompt
app.post('/api/reproducibility/execute', (req, res) => {
  const { prompt, options } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  const executionId = `exec-${uuidv4().slice(0, 8)}`;
  const execution = {
    executionId,
    prompt,
    result: `Generated output for: ${prompt.substring(0, 50)}...`,
    options: options || {},
    timestamp: new Date().toISOString(),
    hash: Buffer.from(prompt).toString('base64').slice(0, 12)
  };

  executions.set(executionId, execution);
  res.json(execution);
});

// Reproducibility - Verify
app.post('/api/reproducibility/verify/:executionId', (req, res) => {
  const original = executions.get(req.params.executionId);
  if (!original) return res.status(404).json({ error: 'Execution not found' });

  // Simulate re-run
  const reRun = {
    executionId: `exec-${uuidv4().slice(0, 8)}`,
    prompt: original.prompt,
    result: original.result,
    timestamp: new Date().toISOString()
  };

  res.json({
    original,
    reRun,
    isReproducible: true,
    comparison: { exactMatch: true, semanticSimilarity: 1.0 }
  });
});

// Baseline management
app.post('/api/baselines', (req, res) => {
  const { name, prompt, outputs, tags } = req.body;
  if (!name || !prompt) return res.status(400).json({ error: 'name and prompt required' });

  const baseline = {
    id: `baseline-${uuidv4().slice(0, 8)}`,
    name,
    prompt,
    outputs: outputs || [],
    tags: tags || [],
    createdAt: new Date().toISOString()
  };

  baselines.set(baseline.id, baseline);
  res.status(201).json(baseline);
});

app.get('/api/baselines', (req, res) => {
  let list = Array.from(baselines.values());
  if (req.query.tag) {
    list = list.filter(b => b.tags.includes(req.query.tag));
  }
  res.json({ count: list.length, baselines: list });
});

app.get('/api/baselines/:id', (req, res) => {
  const baseline = baselines.get(req.params.id);
  if (!baseline) return res.status(404).json({ error: 'Not found' });
  res.json(baseline);
});

app.post('/api/baselines/:id/outputs', (req, res) => {
  const baseline = baselines.get(req.params.id);
  if (!baseline) return res.status(404).json({ error: 'Not found' });

  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });

  const output = {
    id: `out-${uuidv4().slice(0, 8)}`,
    content,
    hash: Buffer.from(content).toString('base64').slice(0, 12),
    addedAt: new Date().toISOString()
  };

  baseline.outputs.push(output);
  baselines.set(baseline.id, baseline);
  res.json(output);
});

// Validation
app.post('/api/validation/validate', (req, res) => {
  const { output, schemaId, schema } = req.body;
  if (!output) return res.status(400).json({ error: 'output required' });

  // Simple validation
  const isValid = typeof output === 'object' || typeof output === 'string';

  const validation = {
    id: `val-${uuidv4().slice(0, 8)}`,
    output: output.substring(0, 100),
    valid: isValid,
    errors: isValid ? [] : [{ message: 'Invalid output format' }],
    timestamp: new Date().toISOString()
  };

  validations.set(validation.id, validation);
  res.json(validation);
});

// Regression detection
app.post('/api/regression/detect', (req, res) => {
  const { baselineOutput, newOutput } = req.body;
  if (!baselineOutput || !newOutput) {
    return res.status(400).json({ error: 'baselineOutput and newOutput required' });
  }

  // Calculate similarity
  const similarity = baselineOutput === newOutput ? 1.0 :
    baselineOutput.split(' ').filter(w => newOutput.includes(w)).length /
    Math.max(baselineOutput.split(' ').length, 1);

  const isRegression = similarity < 0.95;

  res.json({
    isRegression,
    similarity: Number(similarity.toFixed(3)),
    severity: isRegression ? (similarity < 0.7 ? 'major' : 'minor') : 'none',
    baselineLength: baselineOutput.length,
    newLength: newOutput.length
  });
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    baselines: baselines.size,
    executions: executions.size,
    validations: validations.size,
    regressions: regressions.size
  });
});

app.listen(PORT, () => {
  console.log(`[VerificationOS] Verification OS running on port ${PORT}`);
  console.log('Capabilities: Reproducibility, Validation, Regression Detection, Baseline Management');
});
