/**
 * HOJAI Trace Explorer
 * Visual trace debugging
 * Port: 4596
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4596;

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

interface Trace {
  id: string;
  agentId: string;
  promptId: string;
  input: Record<string, unknown>;
  output?: string;
  steps: TraceStep[];
  tokens: { input: number; output: number; total: number };
  latency: number;
  cost: number;
  status: 'success' | 'failed' | 'partial';
  error?: string;
  metadata: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
}

interface TraceStep {
  id: string;
  name: string;
  type: 'prompt' | 'tool' | 'retriever' | 'llm' | 'decision' | 'action';
  input: Record<string, unknown>;
  output?: string;
  latency: number;
  tokens?: number;
  status: 'running' | 'success' | 'failed' | 'skipped';
  error?: string;
  children?: string[];
  parentId?: string;
}

interface Filter {
  agentId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  minLatency?: number;
  maxLatency?: number;
}

interface AggregatedMetrics {
  totalTraces: number;
  successRate: number;
  avgLatency: number;
  avgCost: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  errorBreakdown: Record<string, number>;
  topErrors: { error: string; count: number }[];
}

const traces = new Map();
const stepIndex = new Map(); // For fast step lookup

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-trace-explorer',
  status: 'healthy',
  port: PORT,
  tagline: 'Visual trace debugging'
}));

// Record trace
app.post('/api/traces', (req, res) => {
  const { agentId, promptId, input, steps, status, error, metadata } = req.body;

  const totalTokens = (steps || []).reduce((sum: number, s: TraceStep) => sum + (s.tokens || 0), 0);
  const totalLatency = (steps || []).reduce((sum: number, s: TraceStep) => sum + s.latency, 0);
  const totalCost = totalTokens * 0.00001; // Simulated cost

  const trace: Trace = {
    id: uuidv4().slice(0, 8),
    agentId,
    promptId,
    input,
    steps: steps || [],
    tokens: { input: Math.round(totalTokens * 0.3), output: Math.round(totalTokens * 0.7), total: totalTokens },
    latency: totalLatency,
    cost: totalCost,
    status: status || 'success',
    error,
    metadata: metadata || {},
    startedAt: new Date(),
    completedAt: new Date()
  };

  traces.set(trace.id, trace);

  // Index steps for fast lookup
  trace.steps.forEach((step: TraceStep) => {
    stepIndex.set(`${trace.id}-${step.id}`, step);
  });

  res.status(201).json({ success: true, data: trace });
});

// Get trace
app.get('/api/traces/:id', (req, res) => {
  const trace = traces.get(req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });

  // Enrich steps with children relationships
  const enrichedSteps = trace.steps.map((step: TraceStep, index: number) => ({
    ...step,
    children: trace.steps
      .filter((s: TraceStep, i: number) => i > index && s.parentId === step.id)
      .map((s: TraceStep) => s.id)
  }));

  res.json({
    success: true,
    data: { ...trace, steps: enrichedSteps }
  });
});

// List traces with filters
app.get('/api/traces', (req, res) => {
  const { agentId, status, minLatency, maxLatency, limit = 50 } = req.query;

  let result = Array.from(traces.values());

  if (agentId) result = result.filter(t => t.agentId === agentId);
  if (status) result = result.filter(t => t.status === status);
  if (minLatency) result = result.filter(t => t.latency >= Number(minLatency));
  if (maxLatency) result = result.filter(t => t.latency <= Number(maxLatency));

  result.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  res.json({ success: true, data: result.slice(0, Number(limit)) });
});

// Search traces
app.post('/api/traces/search', (req, res) => {
  const { query, filters } = req.body;

  let result = Array.from(traces.values());

  // Text search
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(t =>
      t.agentId.toLowerCase().includes(q) ||
      t.promptId.toLowerCase().includes(q) ||
      t.output?.toLowerCase().includes(q) ||
      t.error?.toLowerCase().includes(q) ||
      t.steps.some((s: TraceStep) =>
        s.name.toLowerCase().includes(q) || s.output?.toLowerCase().includes(q)
      )
    );
  }

  // Apply filters
  if (filters) {
    if (filters.status) result = result.filter(t => t.status === filters.status);
    if (filters.minLatency) result = result.filter(t => t.latency >= filters.minLatency);
    if (filters.maxLatency) result = result.filter(t => t.latency <= filters.maxLatency);
  }

  res.json({ success: true, data: result.slice(0, 50) });
});

// Get step details
app.get('/api/traces/:traceId/steps/:stepId', (req, res) => {
  const step = stepIndex.get(`${req.params.traceId}-${req.params.stepId}`);
  if (!step) return res.status(404).json({ error: 'Step not found' });

  res.json({ success: true, data: step });
});

// Get aggregated metrics
app.get('/api/metrics', (req, res) => {
  const { agentId, startDate, endDate } = req.query;

  let result = Array.from(traces.values());

  if (agentId) result = result.filter(t => t.agentId === agentId);
  if (startDate) result = result.filter(t => t.startedAt >= new Date(startDate as string));
  if (endDate) result = result.filter(t => t.startedAt <= new Date(endDate as string));

  const metrics: AggregatedMetrics = {
    totalTraces: result.length,
    successRate: result.filter(t => t.status === 'success').length / result.length * 100,
    avgLatency: result.reduce((s, t) => s + t.latency, 0) / result.length,
    avgCost: result.reduce((s, t) => s + t.cost, 0) / result.length,
    p50Latency: percentile(result.map(t => t.latency), 50),
    p95Latency: percentile(result.map(t => t.latency), 95),
    p99Latency: percentile(result.map(t => t.latency), 99),
    errorBreakdown: {},
    topErrors: []
  };

  // Error breakdown
  result.forEach(t => {
    if (t.error) {
      const key = t.error.substring(0, 50);
      metrics.errorBreakdown[key] = (metrics.errorBreakdown[key] || 0) + 1;
    }
  });

  // Top errors
  metrics.topErrors = Object.entries(metrics.errorBreakdown)
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  res.json({ success: true, data: metrics });
});

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = arr.sort((a, b) => a - b);
  const index = Math.ceil(p / 100 * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

// Get flame graph data
app.get('/api/traces/:id/flamegraph', (req, res) => {
  const trace = traces.get(req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });

  const flamegraph = buildFlamegraph(trace);
  res.json({ success: true, data: flamegraph });
});

function buildFlamegraph(trace: Trace) {
  const root = {
    id: 'root',
    name: trace.agentId,
    duration: trace.latency,
    children: [] as { id: string; name: string; duration: number; children: unknown[] }[]
  };

  let currentLevel = root.children!;

  trace.steps.forEach((step: TraceStep) => {
    const node = {
      id: step.id,
      name: step.name,
      duration: step.latency,
      children: []
    };
    currentLevel.push(node);

    if (step.type === 'llm' || step.type === 'tool') {
      currentLevel = node.children;
    }
  });

  return root;
}

// Get timeline
app.get('/api/traces/:id/timeline', (req, res) => {
  const trace = traces.get(req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });

  const timeline = trace.steps.map((step: TraceStep, index: number) => {
    const prevStep = index > 0 ? trace.steps[index - 1] : null;
    const startTime = prevStep ? prevStep.latency : 0;
    const endTime = startTime + step.latency;

    return {
      id: step.id,
      name: step.name,
      type: step.type,
      startTime,
      endTime,
      duration: step.latency,
      status: step.status,
      parentId: step.parentId
    };
  });

  res.json({ success: true, data: { totalDuration: trace.latency, steps: timeline } });
});

// Get spans for distributed tracing
app.get('/api/traces/:id/spans', (req, res) => {
  const trace = traces.get(req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });

  const spans = trace.steps.map((step: TraceStep) => ({
    traceId: trace.id,
    spanId: step.id,
    parentSpanId: step.parentId,
    name: step.name,
    type: step.type,
    startTime: step.startedAt,
    endTime: new Date(step.startedAt.getTime() + step.latency * 1000),
    duration: step.latency * 1000,
    status: step.status,
    attributes: {
      input: step.input,
      output: step.output,
      tokens: step.tokens,
      error: step.error
    }
  }));

  res.json({ success: true, data: spans });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI TRACE EXPLORER                         ║
║   Visual trace debugging                      ║
║   Port: ${PORT}                                   ║
╚═══════════════════════════════════════════╝
  `);
});

export default app;
