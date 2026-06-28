/**
 * TwinOS Reasoning Engine v1.0
 * Port: 4716
 *
 * Active cross-twin reasoning and explanation service.
 * Provides:
 * - Why reasoning (explain events)
 * - What-if reasoning (scenario analysis)
 * - Trace reasoning (relationship paths)
 * - Recommend reasoning (suggestions)
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4716', 10);

// Types
interface ReasoningChain {
  id: string;
  twins: string[];
  query: string;
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  timestamp: string;
}

interface ReasoningStep {
  step: number;
  twin: string;
  insight: string;
  data?: Record<string, any>;
}

interface Explanation {
  event: string;
  causes: Cause[];
  confidence: number;
  summary: string;
}

interface Cause {
  twin: string;
  factor: string;
  contribution: number;
  explanation: string;
}

// Storage
const chains = new Map<string, ReasoningChain>();
const explanations = new Map<string, Explanation[]>();
const twins = new Map<string, Record<string, any>>();

// Helper
function generateId(prefix: string): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

function analyzeWhy(twinId: string, event: string): Explanation {
  const twin = twins.get(twinId) || {};

  // Simple causal analysis based on twin data
  const causes: Cause[] = [];

  if (twin.orderCount > 5) {
    causes.push({
      twin: twinId,
      factor: 'high_activity',
      contribution: 0.7,
      explanation: 'High activity indicates engagement'
    });
  }

  if (twin.lastInteraction) {
    const daysSince = Math.floor((Date.now() - new Date(twin.lastInteraction).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 30) {
      causes.push({
        twin: twinId,
        factor: 'inactivity',
        contribution: 0.8,
        explanation: `${daysSince} days since last interaction`
      });
    }
  }

  if (twin.churnRisk) {
    causes.push({
      twin: twinId,
      factor: 'churn_risk',
      contribution: twin.churnRisk,
      explanation: 'Elevated churn risk detected'
    });
  }

  const avgContribution = causes.length > 0
    ? causes.reduce((sum, c) => sum + c.contribution, 0) / causes.length
    : 0.5;

  return {
    event,
    causes,
    confidence: Math.min(avgContribution + 0.2, 0.95),
    summary: causes.length > 0
      ? `Event ${event} likely caused by ${causes.map(c => c.factor).join(', ')}`
      : `Insufficient data to determine causes for ${event}`
  };
}

function analyzeWhatIf(twinId: string, action: string): { outcomes: string[]; confidence: number } {
  // Simple what-if analysis
  const outcomes: string[] = [];

  if (action.includes('discount')) {
    outcomes.push('Increased conversion likelihood (15-25%)');
    outcomes.push('Reduced margin per transaction');
    outcomes.push('Potential increased loyalty');
  }

  if (action.includes('email')) {
    outcomes.push('Higher engagement probability');
    outcomes.push('Risk of unsubscribes if too frequent');
    outcomes.push('Brand awareness increase');
  }

  if (action.includes('support')) {
    outcomes.push('Improved satisfaction score');
    outcomes.push('Increased retention chance');
    outcomes.push('Higher customer lifetime value');
  }

  if (outcomes.length === 0) {
    outcomes.push('Outcome depends on execution quality');
    outcomes.push('Monitor metrics closely');
  }

  return {
    outcomes,
    confidence: outcomes.length > 0 ? 0.75 : 0.5
  };
}

function traceRelationships(twinId: string, depth: number = 3): string[] {
  const path: string[] = [twinId];
  const twin = twins.get(twinId) || {};

  // Simple relationship tracing
  if (twin.relatedTwins) {
    twin.relatedTwins.slice(0, depth).forEach(related => {
      path.push(related);
    });
  }

  // Add standard relationships
  if (twin.type === 'customer') {
    path.push('order-twin');
    path.push('wallet-twin');
  }

  if (twin.type === 'employee') {
    path.push('department');
    path.push('manager');
  }

  return path;
}

function generateRecommendations(twinId: string): { recommendations: string[]; priority: string[] } {
  const twin = twins.get(twinId) || {};
  const recommendations: string[] = [];
  const priority: string[] = [];

  if (twin.churnRisk && twin.churnRisk > 0.6) {
    recommendations.push('Send retention offer immediately');
    recommendations.push('Schedule check-in call');
    priority.push('critical');
  }

  if (twin.orderCount < 3) {
    recommendations.push('Nurture with educational content');
    recommendations.push('Offer first-purchase incentive');
  }

  if (twin.lastInteraction && Date.now() - new Date(twin.lastInteraction).getTime() > 14 * 24 * 60 * 60 * 1000) {
    recommendations.push('Re-engagement campaign');
    recommendations.push('Personal outreach');
    priority.push('high');
  }

  if (recommendations.length === 0) {
    recommendations.push('Continue current engagement strategy');
  }

  return { recommendations, priority };
}

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'twin-reasoning-engine',
    version: '1.0.0',
    stats: {
      chains: chains.size,
      explanations: explanations.size
    }
  });
});

// Why reasoning
app.post('/api/reasoning/why', (req, res) => {
  const { twinId, event } = req.body;

  if (!twinId || !event) {
    return res.status(400).json({ error: 'twinId and event required' });
  }

  const explanation = analyzeWhy(twinId, event);

  // Store explanation
  const twinExplanations = explanations.get(twinId) || [];
  twinExplanations.push(explanation);
  explanations.set(twinId, twinExplanations.slice(-100));

  res.json({
    success: true,
    explanation,
    twinId,
    event
  });
});

// What-if reasoning
app.post('/api/reasoning/whatif', (req, res) => {
  const { twinId, action } = req.body;

  if (!twinId || !action) {
    return res.status(400).json({ error: 'twinId and action required' });
  }

  const result = analyzeWhatIf(twinId, action);

  res.json({
    success: true,
    twinId,
    action,
    outcomes: result.outcomes,
    confidence: result.confidence
  });
});

// Trace relationships
app.post('/api/reasoning/trace', (req, res) => {
  const { twinId, depth = 3 } = req.body;

  if (!twinId) {
    return res.status(400).json({ error: 'twinId required' });
  }

  const path = traceRelationships(twinId, depth);

  res.json({
    success: true,
    twinId,
    path,
    depth: path.length
  });
});

// Recommendations
app.post('/api/reasoning/recommend', (req, res) => {
  const { twinId } = req.body;

  if (!twinId) {
    return res.status(400).json({ error: 'twinId required' });
  }

  const { recommendations, priority } = generateRecommendations(twinId);

  res.json({
    success: true,
    twinId,
    recommendations,
    priority
  });
});

// Create reasoning chain
app.post('/api/reasoning/chain', (req, res) => {
  const { twins, query } = req.body;

  if (!twins || !Array.isArray(twins) || twins.length === 0) {
    return res.status(400).json({ error: 'twins array required' });
  }

  if (!query) {
    return res.status(400).json({ error: 'query required' });
  }

  const chain: ReasoningChain = {
    id: generateId('chain'),
    twins,
    query,
    steps: twins.map((twin, i) => ({
      step: i + 1,
      twin,
      insight: `Analyzed ${twin}`,
      data: twins.get(twin) || {}
    })),
    conclusion: `Reasoned across ${twins.length} twins for: ${query}`,
    confidence: Math.min(0.6 + twins.length * 0.1, 0.95),
    timestamp: new Date().toISOString()
  };

  chains.set(chain.id, chain);

  res.json({
    success: true,
    chain
  });
});

// Get chain
app.get('/api/reasoning/chain/:chainId', (req, res) => {
  const { chainId } = req.params;
  const chain = chains.get(chainId);

  if (!chain) {
    return res.status(404).json({ error: 'Chain not found' });
  }

  res.json({
    success: true,
    chain
  });
});

// Get history for twin
app.get('/api/reasoning/history/:twinId', (req, res) => {
  const { twinId } = req.params;

  const twinExplanations = explanations.get(twinId) || [];
  const twinChains = Array.from(chains.values()).filter(c => c.twins.includes(twinId));

  res.json({
    success: true,
    twinId,
    explanations: twinExplanations,
    chains: twinChains,
    insights: twinChains.map(c => c.conclusion)
  });
});

// Register twin data
app.post('/api/reasoning/twin', (req, res) => {
  const { twinId, data } = req.body;

  if (!twinId) {
    return res.status(400).json({ error: 'twinId required' });
  }

  twins.set(twinId, { ...twins.get(twinId), ...data, updatedAt: new Date().toISOString() });

  res.json({
    success: true,
    twinId,
    registered: true
  });
});

// Get twin data
app.get('/api/reasoning/twin/:twinId', (req, res) => {
  const { twinId } = req.params;
  const twin = twins.get(twinId);

  if (!twin) {
    return res.status(404).json({ error: 'Twin not found' });
  }

  res.json({
    success: true,
    twin: twin
  });
});

// Error handling
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[Reasoning Engine] Error:', err);
  res.status(500).json({ error: err.message || 'Internal error' });
});

app.listen(PORT, () => {
  console.log(`🧠 Twin Reasoning Engine v1.0.0 running on port ${PORT}`);
});

export default app;