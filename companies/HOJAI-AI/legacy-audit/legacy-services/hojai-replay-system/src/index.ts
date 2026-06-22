/**
 * HOJAI Replay System
 * Save failure → Replay locally → Fix → Redeploy
 * Port: 4593
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4593;

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

interface ExecutionTrace {
  id: string;
  agentId: string;
  promptId: string;
  input: Record<string, unknown>;
  output?: string;
  steps: ExecutionStep[];
  status: 'success' | 'failed' | 'partial';
  error?: string;
  metadata: Record<string, unknown>;
  replayable: boolean;
  snapshot: string; // Full state snapshot
  createdAt: Date;
}

interface ExecutionStep {
  id: string;
  type: 'prompt' | 'tool' | 'retriever' | 'decision' | 'action';
  name: string;
  input: Record<string, unknown>;
  output?: string;
  latency: number;
  tokens?: number;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
}

interface ReplaySession {
  id: string;
  traceId: string;
  environment: 'local' | 'staging' | 'production';
  modifiedSteps: string[];
  inputOverrides: Record<string, unknown>;
  output: string;
  fixed: boolean;
  createdAt: Date;
}

interface DebugSession {
  id: string;
  traceId: string;
  userId: string;
  steps: DebugStep[];
  variables: Record<string, unknown>;
  breakpoints: string[];
  currentStep: string;
  status: 'paused' | 'running' | 'completed';
  createdAt: Date;
}

interface DebugStep {
  id: string;
  stepId: string;
  before: Record<string, unknown>;
  after?: Record<string, unknown>;
  modified: boolean;
  notes?: string;
}

const traces = new Map();
const replaySessions = new Map();
const debugSessions = new Map();

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-replay-system',
  status: 'healthy',
  port: PORT,
  tagline: 'Save → Replay → Fix → Redeploy'
}));

// Save execution trace
app.post('/api/traces', (req, res) => {
  const { agentId, promptId, input, output, steps, status, error, metadata } = req.body;

  const trace: ExecutionTrace = {
    id: uuidv4().slice(0, 8),
    agentId,
    promptId,
    input,
    output,
    steps: steps || [],
    status: status || 'success',
    error,
    metadata: metadata || {},
    replayable: true,
    snapshot: JSON.stringify({ input, steps, metadata }),
    createdAt: new Date()
  };

  traces.set(trace.id, trace);

  res.status(201).json({ success: true, data: trace });
});

// Get trace
app.get('/api/traces/:id', (req, res) => {
  const trace = traces.get(req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });
  res.json({ success: true, data: trace });
});

// List failed traces
app.get('/api/traces', (req, res) => {
  const { agentId, status } = req.query;
  let result = Array.from(traces.values());

  if (agentId) result = result.filter(t => t.agentId === agentId);
  if (status) result = result.filter(t => t.status === status);
  result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  res.json({ success: true, data: result });
});

// Start replay session
app.post('/api/replay', (req, res) => {
  const { traceId, environment = 'local' } = req.body;

  const trace = traces.get(traceId);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });

  const session: ReplaySession = {
    id: uuidv4().slice(0, 8),
    traceId,
    environment,
    modifiedSteps: [],
    inputOverrides: {},
    output: '',
    fixed: false,
    createdAt: new Date()
  };

  replaySessions.set(session.id, session);

  res.status(201).json({
    success: true,
    data: {
      sessionId: session.id,
      trace,
      environment,
      message: 'Replay session started. Modify steps and run.'
    }
  });
});

// Run replay with modifications
app.post('/api/replay/:id/run', (req, res) => {
  const session = replaySessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { inputOverrides, modifiedSteps } = req.body;

  if (inputOverrides) session.inputOverrides = inputOverrides;
  if (modifiedSteps) session.modifiedSteps = modifiedSteps;

  // Simulate replay with modifications
  const trace = traces.get(session.traceId);
  const modifiedOutput = simulateReplay(trace, session);

  session.output = modifiedOutput;
  session.fixed = true;
  replaySessions.set(session.id, session);

  res.json({
    success: true,
    data: {
      sessionId: session.id,
      originalOutput: trace?.output,
      newOutput: modifiedOutput,
      fixed: true,
      changes: session.modifiedSteps
    }
  });
});

// Simulate replay
function simulateReplay(trace: ExecutionTrace | undefined, session: ReplaySession): string {
  if (!trace) return 'Error: trace not found';

  let output = trace.output || '';

  session.modifiedSteps.forEach(stepId => {
    output = `[MODIFIED] ${output}`;
  });

  Object.entries(session.inputOverrides).forEach(([key, value]) => {
    output = output.replace(new RegExp(`{${key}}`, 'g'), String(value));
  });

  return output;
}

// Create debug session
app.post('/api/debug', (req, res) => {
  const { traceId, userId, breakpoints = [] } = req.body;

  const trace = traces.get(traceId);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });

  const session: DebugSession = {
    id: uuidv4().slice(0, 8),
    traceId,
    userId: userId || 'system',
    steps: trace.steps.map(s => ({
      id: uuidv4().slice(0, 8),
      stepId: s.id,
      before: { input: s.input, output: s.output },
      modified: false
    })),
    variables: { ...trace.input },
    breakpoints,
    currentStep: trace.steps[0]?.id || '',
    status: 'paused',
    createdAt: new Date()
  };

  debugSessions.set(session.id, session);

  res.status(201).json({
    success: true,
    data: {
      sessionId: session.id,
      totalSteps: trace.steps.length,
      breakpoints: session.breakpoints,
      firstStep: session.currentStep
    }
  });
});

// Step through debug
app.post('/api/debug/:id/step', (req, res) => {
  const session = debugSessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  const { action, stepId, modifications, notes } = req.body;

  if (action === 'continue') {
    const currentIndex = session.steps.findIndex(s => s.stepId === session.currentStep);
    if (currentIndex < session.steps.length - 1) {
      session.currentStep = session.steps[currentIndex + 1].stepId;
    } else {
      session.status = 'completed';
    }
  } else if (action === 'breakpoint' && stepId) {
    session.breakpoints.push(stepId);
  } else if (action === 'modify' && stepId) {
    const step = session.steps.find(s => s.stepId === stepId);
    if (step) {
      step.modified = true;
      step.after = modifications;
      if (notes) step.notes = notes;
    }
  }

  debugSessions.set(session.id, session);

  const currentStep = session.steps.find(s => s.stepId === session.currentStep);

  res.json({
    success: true,
    data: {
      sessionId: session.id,
      status: session.status,
      currentStep: currentStep?.before,
      isBreakpoint: session.breakpoints.includes(session.currentStep),
      progress: `${session.steps.findIndex(s => s.stepId === session.currentStep) + 1}/${session.steps.length}`
    }
  });
});

// Export trace for local debugging
app.get('/api/traces/:id/export', (req, res) => {
  const trace = traces.get(req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });

  res.json({
    success: true,
    data: {
      trace,
      reproductionScript: generateReproductionScript(trace)
    }
  });
});

function generateReproductionScript(trace: ExecutionTrace): string {
  return `// Reproduction Script for Trace ${trace.id}
const { AgentRunner } = require('@hojai/agents');

const agent = new AgentRunner({
  agentId: '${trace.agentId}',
  promptId: '${trace.promptId}'
});

// Input
const input = ${JSON.stringify(trace.input, null, 2)};

// Run agent
const result = await agent.run(input);
console.log('Output:', result);

// Debug steps
${trace.steps.map((s, i) => `
// Step ${i + 1}: ${s.name}
await agent.step(${i}); // ${s.type}`).join('\n')}`;
}

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI REPLAY SYSTEM                       ║
║   Save → Replay → Fix → Redeploy           ║
║   Port: ${PORT}                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
