import { requireAuth } from '@rtmn/shared/auth';
/**
 * Decision Twin Service
 * Port: 4742
 *
 * Captures and learns decision patterns:
 * - Decision context and choices
 * - Reasoning chains
 * - Prediction based on patterns
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4742', 10);
const VERSION = '1.0.0';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// Types
interface ReasoningFactor {
  name: string;
  weight: number;
  direction: 'positive' | 'negative' | 'neutral';
  source: 'explicit' | 'implied' | 'learned';
}

interface ReasoningChain {
  steps: string[];
  factors: ReasoningFactor[];
  constraints: string[];
  model: 'rule-based' | 'experience' | 'data-driven' | 'intuition';
}

interface Decision {
  id: string;
  employeeId: string;
  timestamp: string;
  type: string;
  domain: string;
  description: string;
  choice: string;
  alternatives: string[];
  reasoning: ReasoningChain;
  outcome?: string;
  confidence: number;
  learnable: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DecisionPattern {
  id: string;
  employeeId: string;
  type: string;
  domain: string;
  commonFactors: ReasoningFactor[];
  typicalReasoning: string;
  successRate: number;
  avgDecisionTime: number;
  confidence: number;
  sampleDecisions: string[];
  lastUpdated: string;
}

// Storage
const decisions = new Map<string, Decision>();
const patterns = new Map<string, DecisionPattern>();

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'decision-twin', version: VERSION, timestamp: new Date().toISOString(), stats: { decisions: decisions.size, patterns: patterns.size } });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'decision-twin', timestamp: new Date().toISOString() });
});

/**
 * Capture a decision
 */
app.post('/api/twin/:employeeId/decision/capture',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { type, domain, description, choice, alternatives, reasoning, outcome } = req.body;

    if (!choice) {
      const err: ApiError = new Error('choice is required'); err.statusCode = 400; throw err;
    }

    const decision: Decision = {
      id: generateId('decision'),
      employeeId,
      timestamp: new Date().toISOString(),
      type: type || 'general',
      domain: domain || 'general',
      description,
      choice,
      alternatives: alternatives || [],
      reasoning: reasoning || { steps: [], factors: [], constraints: [], model: 'intuition' },
      outcome,
      confidence: 70,
      learnable: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    decisions.set(decision.id, decision);

    // Update patterns
    updatePatterns(employeeId, decision);

    res.status(201).json({ success: true, data: decision });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'CAPTURE_ERROR', message: error.message } });
  }
});

function updatePatterns(employeeId: string, decision: Decision) {
  const existingPattern = Array.from(patterns.values()).find(
    p => p.employeeId === employeeId && p.type === decision.type && p.domain === decision.domain
  );

  if (existingPattern) {
    existingPattern.sampleDecisions.push(decision.id);
    existingPattern.avgDecisionTime = (existingPattern.avgDecisionTime + 30) / 2;
    if (decision.outcome) {
      existingPattern.successRate = (existingPattern.successRate + (decision.outcome.includes('success') ? 1 : 0.5)) / 2;
    }
    existingPattern.confidence = Math.min(100, existingPattern.sampleDecisions.length * 10);
    existingPattern.lastUpdated = new Date().toISOString();
  } else {
    patterns.set(generateId('pattern'), {
      id: generateId('pattern'),
      employeeId,
      type: decision.type,
      domain: decision.domain,
      commonFactors: decision.reasoning.factors,
      typicalReasoning: decision.reasoning.steps.join(' -> '),
      successRate: 0.7,
      avgDecisionTime: 30,
      confidence: 30,
      sampleDecisions: [decision.id],
      lastUpdated: new Date().toISOString()
    });
  }
}

/**
 * Get decision history
 */
app.get('/api/twin/:employeeId/decision/history', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { type, domain, limit = 50 } = req.query;

  let employeeDecisions = Array.from(decisions.values())
    .filter(d => d.employeeId === employeeId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (type) employeeDecisions = employeeDecisions.filter(d => d.type === type);
  if (domain) employeeDecisions = employeeDecisions.filter(d => d.domain === domain);

  res.json({ success: true, data: { decisions: employeeDecisions.slice(0, Number(limit)), total: employeeDecisions.length } });
});

/**
 * Predict a decision
 */
app.post('/api/twin/:employeeId/decision/predict',requireAuth,  (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { context, options } = req.body;

    const employeePatterns = Array.from(patterns.values())
      .filter(p => p.employeeId === employeeId)
      .sort((a, b) => b.confidence - a.confidence);

    if (employeePatterns.length === 0) {
      return res.json({
        success: true,
        data: {
          predictedChoice: null,
          confidence: 0,
          message: 'Not enough decision history for prediction',
          recommendations: ['Start capturing decisions to build prediction model']
        }
      });
    }

    const topPattern = employeePatterns[0];

    // Simple prediction based on pattern
    const predictedChoice = options?.[0] || topPattern.typicalReasoning.split(' -> ')[0] || 'default';

    res.json({
      success: true,
      data: {
        predictedChoice,
        confidence: topPattern.confidence,
        reasoning: `Based on ${topPattern.sampleDecisions.length} similar decisions`,
        similarPastDecisions: topPattern.sampleDecisions.slice(0, 3),
        warnings: topPattern.confidence < 50 ? ['Low confidence - verify this prediction'] : []
      }
    });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'PREDICT_ERROR', message: error.message } });
  }
});

/**
 * Add reasoning to a decision
 */
app.post('/api/twin/:employeeId/decision/:decisionId/reasoning',requireAuth,  (req: Request, res: Response) => {
  try {
    const { decisionId } = req.params;
    const { reasoning } = req.body;

    const decision = decisions.get(decisionId);
    if (!decision) {
      const err: ApiError = new Error('Decision not found'); err.statusCode = 404; throw err;
    }

    decision.reasoning = { ...decision.reasoning, ...reasoning };
    decision.updatedAt = new Date().toISOString();
    decision.confidence = Math.min(100, decision.confidence + 10);

    res.json({ success: true, data: decision });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'REASONING_ERROR', message: error.message } });
  }
});

/**
 * Get decision patterns
 */
app.get('/api/twin/:employeeId/decision/patterns', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const employeePatterns = Array.from(patterns.values())
    .filter(p => p.employeeId === employeeId)
    .sort((a, b) => b.confidence - a.confidence);

  res.json({ success: true, data: { patterns: employeePatterns, total: employeePatterns.length } });
});

/**
 * Get decision by ID
 */
app.get('/api/twin/:employeeId/decision/:decisionId', (req: Request, res: Response) => {
  const { decisionId } = req.params;
  const decision = decisions.get(decisionId);

  if (!decision) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Decision not found' } });
  }

  res.json({ success: true, data: decision });
});

/**
 * Stats
 */
app.get('/api/twin/:employeeId/decision/stats', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const employeeDecisions = Array.from(decisions.values()).filter(d => d.employeeId === employeeId);
  const employeePatterns = Array.from(patterns.values()).filter(p => p.employeeId === employeeId);

  const byType: Record<string, number> = {};
  employeeDecisions.forEach(d => { byType[d.type] = (byType[d.type] || 0) + 1; });

  res.json({
    success: true,
    data: {
      employeeId,
      totalDecisions: employeeDecisions.length,
      totalPatterns: employeePatterns.length,
      avgConfidence: employeeDecisions.length > 0 ? employeeDecisions.reduce((sum, d) => sum + d.confidence, 0) / employeeDecisions.length : 0,
      byType,
      topPattern: employeePatterns[0] || null
    }
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Decision Twin Service - Started                     ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Decision Capture, Reasoning, Prediction           ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
