/**
 * HOJAI Evaluation Studio
 * Visual benchmark comparison, A/B testing
 * Port: 4597
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4597;

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

interface Benchmark {
  id: string;
  name: string;
  description: string;
  category: 'support' | 'sales' | 'restaurant' | 'salon' | 'clinic' | 'hotel' | 'generic';
  metrics: BenchmarkMetric[];
  createdAt: Date;
}

interface BenchmarkMetric {
  name: string;
  type: 'accuracy' | 'latency' | 'cost' | 'relevance' | 'hallucination';
  target: number;
  weight: number;
}

interface Comparison {
  id: string;
  name: string;
  agentA: string;
  agentB: string;
  datasetId: string;
  resultsA: ResultSet;
  resultsB: ResultSet;
  winner: 'A' | 'B' | 'tie';
  improvement: number;
  createdAt: Date;
}

interface ResultSet {
  total: number;
  passed: number;
  failed: number;
  avgScore: number;
  avgLatency: number;
  avgCost: number;
}

interface ABTest {
  id: string;
  name: string;
  promptA: string;
  promptB: string;
  datasetId: string;
  trafficSplit: number; // % to variant A
  status: 'draft' | 'running' | 'completed';
  results?: {
    visits: { A: number; B: number };
    conversions: { A: number; B: number };
    winner: 'A' | 'B';
    lift: number;
  };
  createdAt: Date;
}

interface IndustryBenchmark {
  industry: string;
  benchmarks: {
    accuracy: number;
    latency: number;
    cost: number;
    satisfaction: number;
  };
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentile90: number;
}

const benchmarks = new Map();
const comparisons = new Map();
const abTests = new Map();
const industryBenchmarks = new Map();

// Seed industry benchmarks
function seed() {
  const benchmarks: IndustryBenchmark[] = [
    { industry: 'restaurant', benchmarks: { accuracy: 85, latency: 2.5, cost: 0.02, satisfaction: 88 }, percentile25: 72, percentile50: 82, percentile75: 90, percentile90: 95 },
    { industry: 'salon', benchmarks: { accuracy: 88, latency: 2.0, cost: 0.015, satisfaction: 90 }, percentile25: 75, percentile50: 85, percentile75: 92, percentile90: 97 },
    { industry: 'clinic', benchmarks: { accuracy: 92, latency: 3.0, cost: 0.03, satisfaction: 85 }, percentile25: 80, percentile50: 88, percentile75: 94, percentile90: 98 },
    { industry: 'support', benchmarks: { accuracy: 85, latency: 4.0, cost: 0.025, satisfaction: 82 }, percentile25: 70, percentile50: 82, percentile75: 90, percentile90: 95 },
    { industry: 'sales', benchmarks: { accuracy: 78, latency: 3.5, cost: 0.028, satisfaction: 80 }, percentile25: 65, percentile50: 78, percentile75: 85, percentile90: 92 }
  ];

  benchmarks.forEach(b => industryBenchmarks.set(b.industry, b));
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-evaluation-studio',
  status: 'healthy',
  port: PORT,
  tagline: 'Visual benchmark comparison, A/B testing'
}));

// Industry benchmarks
app.get('/api/benchmarks/:industry', (req, res) => {
  const benchmark = industryBenchmarks.get(req.params.industry);
  if (!benchmark) return res.status(404).json({ error: 'Industry not found' });
  res.json({ success: true, data: benchmark });
});

app.get('/api/benchmarks', (_, res) => {
  res.json({ success: true, data: Array.from(industryBenchmarks.values()) });
});

// Compare agents
app.post('/api/compare', (req, res) => {
  const { name, agentA, agentB, datasetId, resultsA, resultsB } = req.body;

  const scoreA = calculateScore(resultsA);
  const scoreB = calculateScore(resultsB);

  const comparison: Comparison = {
    id: uuidv4().slice(0, 8),
    name,
    agentA,
    agentB,
    datasetId,
    resultsA,
    resultsB,
    winner: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie',
    improvement: Math.round(Math.abs(scoreA - scoreB) * 10) / 10,
    createdAt: new Date()
  };

  comparisons.set(comparison.id, comparison);

  res.status(201).json({ success: true, data: comparison });
});

function calculateScore(results: ResultSet): number {
  const accuracyScore = (results.passed / results.total) * 40;
  const latencyScore = Math.max(0, 30 - results.avgLatency * 3);
  const costScore = Math.max(0, 30 - results.avgCost * 100);
  return accuracyScore + latencyScore + costScore;
}

// Get comparisons
app.get('/api/comparisons', (req, res) => {
  const { agentA, agentB } = req.query;
  let result = Array.from(comparisons.values());
  if (agentA) result = result.filter(c => c.agentA === agentA || c.agentB === agentA);
  if (agentB) result = result.filter(c => c.agentA === agentB || c.agentB === agentB);
  res.json({ success: true, data: result });
});

// A/B Testing
app.post('/api/ab-test', (req, res) => {
  const { name, promptA, promptB, datasetId, trafficSplit = 50 } = req.body;

  const test: ABTest = {
    id: uuidv4().slice(0, 8),
    name,
    promptA,
    promptB,
    datasetId,
    trafficSplit,
    status: 'draft',
    createdAt: new Date()
  };

  abTests.set(test.id, test);

  res.status(201).json({ success: true, data: test });
});

app.post('/api/ab-test/:id/run', (req, res) => {
  const test = abTests.get(req.params.id);
  if (!test) return res.status(404).json({ error: 'Test not found' });

  test.status = 'running';
  abTests.set(test.id, test);

  // Simulate test
  setTimeout(() => {
    const visitsA = Math.round(1000 + Math.random() * 500);
    const visitsB = Math.round(1000 + Math.random() * 500);
    const convA = Math.round(visitsA * (0.05 + Math.random() * 0.1));
    const convB = Math.round(visitsB * (0.05 + Math.random() * 0.1));

    test.results = {
      visits: { A: visitsA, B: visitsB },
      conversions: { A: convA, B: convB },
      winner: (convA / visitsA) > (convB / visitsB) ? 'A' : 'B',
      lift: Math.round(Math.abs((convA / visitsA - convB / visitsB) / ((convA / visitsA + convB / visitsB) / 2) * 100)
    };
    test.status = 'completed';
    abTests.set(test.id, test);
  }, 2000);

  res.json({ success: true, status: 'running' });
});

app.get('/api/ab-tests', (_, res) => {
  res.json({ success: true, data: Array.from(abTests.values()) });
});

// Visual dashboard
app.get('/api/dashboard', (req, res) => {
  const { industry } = req.query;
  const benchmark = industryBenchmarks.get(industry as string);

  res.json({
    success: true,
    data: {
      industry: industry || 'all',
      benchmark: benchmark || null,
      comparisons: Array.from(comparisons.values()).slice(0, 10),
      abTests: Array.from(abTests.values()).slice(0, 5),
      summary: {
        totalComparisons: comparisons.size,
        totalABTests: abTests.size,
        avgImprovement: Array.from(comparisons.values()).reduce((s, c) => s + c.improvement, 0) / comparisons.size || 0
      }
    }
  });
});

seed();
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI EVALUATION STUDIO                       ║
║   Visual benchmark comparison, A/B testing         ║
║   Port: ${PORT}                                   ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
