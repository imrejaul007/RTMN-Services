/**
 * HOJAI Evaluations
 * Dataset and human evaluation framework - Vellum equivalent
 * Port: 4591
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4591;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface Dataset {
  id: string;
  name: string;
  description: string;
  category: 'support' | 'sales' | 'restaurant' | 'salon' | 'clinic' | 'hotel' | 'generic';
  rows: DatasetRow[];
  metadata: {
    avgScore?: number;
    evaluatorCount: number;
    lastEvaluation?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface DatasetRow {
  id: string;
  input: Record<string, unknown>;
  expectedOutput?: string;
  context?: Record<string, unknown>;
  difficulty?: 'easy' | 'medium' | 'hard';
}

interface Evaluation {
  id: string;
  name: string;
  datasetId: string;
  agentId?: string;
  promptId?: string;
  model: 'gpt-4' | 'gpt-3.5' | 'claude-3' | 'claude-3-haiku';
  results: EvaluationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    avgScore: number;
    avgLatency: number;
  };
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

interface EvaluationResult {
  rowId: string;
  input: Record<string, unknown>;
  expectedOutput?: string;
  actualOutput?: string;
  passed: boolean;
  score: number; // 0-100
  latency: number;
  tokens: number;
  feedback?: string;
  evaluatedAt: Date;
}

interface HumanEvaluation {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  rowId: string;
  evaluation: 'excellent' | 'good' | 'acceptable' | 'poor' | 'bad';
  feedback?: string;
  createdAt: Date;
}

interface RegressionTest {
  id: string;
  name: string;
  promptId: string;
  datasetId: string;
  baselineScore: number;
  threshold: number; // If score drops below, fail
  lastRun?: Date;
  status: 'pass' | 'fail' | 'warning';
  currentScore?: number;
}

const datasets = new Map();
const evaluations = new Map();
const humanEvaluations = new Map();
const regressionTests = new Map();

// Seed demo data
function seed() {
  // Demo dataset
  const supportDataset: Dataset = {
    id: 'ds-1',
    name: 'Support Agent Evaluation',
    description: 'Standard test cases for support agent',
    category: 'support',
    rows: [
      { id: 'r1', difficulty: 'easy', input: { query: 'Where is my order?' }, expectedOutput: 'Order status response' },
      { id: 'r2', difficulty: 'easy', input: { query: 'Cancel my booking' }, expectedOutput: 'Cancellation response' },
      { id: 'r3', difficulty: 'medium', input: { query: 'I want a refund for damaged item' }, expectedOutput: 'Refund handling' },
      { id: 'r4', difficulty: 'hard', input: { query: 'Your product caused allergic reaction!' }, expectedOutput: 'Escalation required' },
      { id: 'r5', difficulty: 'medium', input: { query: 'How do I track my delivery?' }, expectedOutput: 'Tracking instructions' },
    ],
    metadata: { avgScore: 78, evaluatorCount: 3, lastEvaluation: new Date() },
    createdAt: new Date('2026-01-15'),
    updatedAt: new Date('2026-05-01')
  };

  // Restaurant dataset
  const restaurantDataset: Dataset = {
    id: 'ds-2',
    name: 'Restaurant AI Evaluation',
    description: 'Test cases for restaurant AI',
    category: 'restaurant',
    rows: [
      { id: 'r1', difficulty: 'easy', input: { query: 'Show me menu' }, expectedOutput: 'Menu response' },
      { id: 'r2', difficulty: 'easy', input: { query: 'Book table for 4' }, expectedOutput: 'Booking confirmation' },
      { id: 'r3', difficulty: 'medium', input: { query: 'I have allergy to nuts' }, expectedOutput: 'Allergy handling' },
      { id: 'r4', difficulty: 'hard', input: { query: 'Food was cold and delayed 2 hours' }, expectedOutput: 'Compensation offer' },
    ],
    metadata: { avgScore: 85, evaluatorCount: 2 },
    createdAt: new Date('2026-02-01'),
    updatedAt: new Date('2026-04-15')
  };

  datasets.set(supportDataset.id, supportDataset);
  datasets.set(restaurantDataset.id, restaurantDataset);
  console.log(`HOJAI Evaluations seeded ${datasets.size} datasets`);
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-evaluations',
  status: 'healthy',
  port: PORT,
  tagline: 'Dataset and human evaluation framework'
}));

// ============================================
// DATASETS
// ============================================

app.get('/api/datasets', (req, res) => {
  const { category } = req.query;
  let result = Array.from(datasets.values());
  if (category) result = result.filter(d => d.category === category);
  res.json({ success: true, data: result });
});

app.get('/api/datasets/:id', (req, res) => {
  const dataset = datasets.get(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  res.json({ success: true, data: dataset });
});

app.post('/api/datasets', (req, res) => {
  const { name, description, category, rows } = req.body;

  const dataset: Dataset = {
    id: uuidv4().slice(0, 8),
    name,
    description,
    category,
    rows: rows || [],
    metadata: { evaluatorCount: 0 },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  datasets.set(dataset.id, dataset);
  res.status(201).json({ success: true, data: dataset });
});

app.post('/api/datasets/:id/rows', (req, res) => {
  const dataset = datasets.get(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });

  const { input, expectedOutput, difficulty } = req.body;

  const row: DatasetRow = {
    id: uuidv4().slice(0, 8),
    input,
    expectedOutput,
    difficulty: difficulty || 'medium'
  };

  dataset.rows.push(row);
  dataset.updatedAt = new Date();
  datasets.set(dataset.id, dataset);

  res.status(201).json({ success: true, data: row });
});

// ============================================
// EVALUATIONS
// ============================================

app.post('/api/evaluations', (req, res) => {
  const { name, datasetId, model, agentId, promptId } = req.body;

  const dataset = datasets.get(datasetId);
  if (!dataset) return res.status(400).json({ error: 'Dataset not found' });

  const evaluation: Evaluation = {
    id: uuidv4().slice(0, 8),
    name,
    datasetId,
    agentId,
    promptId,
    model: model || 'gpt-4',
    results: [],
    summary: { total: 0, passed: 0, failed: 0, avgScore: 0, avgLatency: 0 },
    status: 'pending',
    createdAt: new Date()
  };

  evaluations.set(evaluation.id, evaluation);
  res.status(201).json({ success: true, data: evaluation });
});

app.post('/api/evaluations/:id/run', (req, res) => {
  const evaluation = evaluations.get(req.params.id);
  if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });

  const dataset = datasets.get(evaluation.datasetId);
  if (!dataset) return res.status(400).json({ error: 'Dataset not found' });

  evaluation.status = 'running';
  evaluations.set(evaluation.id, evaluation);

  // Simulate evaluation
  setTimeout(() => {
    const results: EvaluationResult[] = dataset.rows.map(row => {
      const latency = Math.random() * 2 + 0.5;
      const tokens = Math.round(Math.random() * 200 + 50);
      const score = Math.round(60 + Math.random() * 40);
      const passed = score >= 70;

      return {
        rowId: row.id,
        input: row.input,
        expectedOutput: row.expectedOutput,
        actualOutput: `Generated response for: ${JSON.stringify(row.input)}`,
        passed,
        score,
        latency,
        tokens,
        evaluatedAt: new Date()
      };
    });

    const passed = results.filter(r => r.passed).length;
    const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
    const avgLatency = results.reduce((s, r) => s + r.latency, 0) / results.length;

    evaluation.results = results;
    evaluation.summary = {
      total: results.length,
      passed,
      failed: results.length - passed,
      avgScore: Math.round(avgScore),
      avgLatency: Math.round(avgLatency * 100) / 100
    };
    evaluation.status = 'completed';
    evaluation.completedAt = new Date();

    evaluations.set(evaluation.id, evaluation);
  }, 2000);

  res.json({ success: true, status: 'running', message: 'Evaluation started' });
});

app.get('/api/evaluations/:id', (req, res) => {
  const evaluation = evaluations.get(req.params.id);
  if (!evaluation) return res.status(404).json({ error: 'Evaluation not found' });
  res.json({ success: true, data: evaluation });
});

app.get('/api/evaluations', (req, res) => {
  const { datasetId, status } = req.query;
  let result = Array.from(evaluations.values());
  if (datasetId) result = result.filter(e => e.datasetId === datasetId);
  if (status) result = result.filter(e => e.status === status);
  res.json({ success: true, data: result });
});

// ============================================
// HUMAN EVALUATIONS
// ============================================

app.post('/api/human-evaluations', (req, res) => {
  const { evaluatorId, evaluatorName, rowId, evaluation, feedback } = req.body;

  const humanEval: HumanEvaluation = {
    id: uuidv4().slice(0, 8),
    evaluatorId,
    evaluatorName,
    rowId,
    evaluation,
    feedback,
    createdAt: new Date()
  };

  humanEvaluations.set(humanEval.id, humanEval);
  res.status(201).json({ success: true, data: humanEval });
});

app.get('/api/human-evaluations', (req, res) => {
  const { rowId, evaluatorId } = req.query;
  let result = Array.from(humanEvaluations.values());
  if (rowId) result = result.filter(e => e.rowId === rowId);
  if (evaluatorId) result = result.filter(e => e.evaluatorId === evaluatorId);
  res.json({ success: true, data: result });
});

// ============================================
// REGRESSION TESTS
// ============================================

app.post('/api/regression', (req, res) => {
  const { name, promptId, datasetId, baselineScore, threshold } = req.body;

  const test: RegressionTest = {
    id: uuidv4().slice(0, 8),
    name,
    promptId,
    datasetId,
    baselineScore,
    threshold,
    status: 'pass'
  };

  regressionTests.set(test.id, test);
  res.status(201).json({ success: true, data: test });
});

app.post('/api/regression/:id/run', (req, res) => {
  const test = regressionTests.get(req.params.id);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  // Simulate running regression
  const currentScore = Math.round(60 + Math.random() * 40);
  const scoreChange = currentScore - test.baselineScore;

  test.currentScore = currentScore;
  test.lastRun = new Date();
  test.status = currentScore < test.threshold ? 'fail' : currentScore < test.baselineScore ? 'warning' : 'pass';

  regressionTests.set(test.id, test);

  res.json({
    success: true,
    data: {
      testId: test.id,
      status: test.status,
      currentScore,
      baselineScore: test.baselineScore,
      change: scoreChange,
      threshold: test.threshold
    }
  });
});

app.get('/api/regression', (_, res) => {
  res.json({ success: true, data: Array.from(regressionTests.values()) });
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics', (_, res) => {
  const allEvaluations = Array.from(evaluations.values()).filter(e => e.status === 'completed');
  const allTests = Array.from(regressionTests.values());

  const avgScore = allEvaluations.length > 0
    ? allEvaluations.reduce((s, e) => s + e.summary.avgScore, 0) / allEvaluations.length
    : 0;

  const passRate = allEvaluations.length > 0
    ? (allEvaluations.reduce((s, e) => s + e.summary.passed, 0) / allEvaluations.reduce((s, e) => s + e.summary.total, 0)) * 100
    : 0;

  res.json({
    success: true,
    data: {
      totalEvaluations: allEvaluations.length,
      totalDatasets: datasets.size,
      totalRegressionTests: allTests.length,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate),
      regressionStatus: {
        pass: allTests.filter(t => t.status === 'pass').length,
        fail: allTests.filter(t => t.status === 'fail').length,
        warning: allTests.filter(t => t.status === 'warning').length
      }
    }
  });
});

seed();
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI EVALUATIONS                          ║
║   Dataset & Human Evaluation Framework         ║
║   Port: ${PORT}                                   ║
║                                                   ║
║   Features:                                     ║
║   • Dataset evaluation                          ║
║   • Human evaluation                            ║
║   • Regression testing                         ║
║   • Model comparison                           ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
