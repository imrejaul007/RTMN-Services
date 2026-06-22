import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app: Express = express();
const PORT = process.env.PORT || 4241;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());

// Health
app.get('/health', (_, res) => res.json({ status: 'healthy', service: 'simulation-engine', version: '1.0.0', timestamp: new Date().toISOString() }));
app.get('/health/ready', (_, res) => res.json({ status: 'ready' }));

app.get('/api/info', (_, res) => {
  res.json({
    service: 'simulation-engine',
    version: '1.0.0',
    description: 'What-if Analysis & Scenario Testing',
    capabilities: ['Monte Carlo', 'Scenario Testing', 'Risk Assessment', 'Confidence Scoring']
  });
});

// ============================================
// SIMULATION TYPES
// ============================================

interface Scenario {
  name: string;
  parameters: {
    quantity?: number;
    price?: number;
    supplier?: string;
    timing?: string;
  };
}

interface SimulationRequest {
  intentId?: string;
  title: string;
  scenarios: Scenario[];
  constraints?: {
    maxBudget?: number;
    maxStorageDays?: number;
    riskTolerance?: 'low' | 'medium' | 'high';
  };
}

interface SimulationResult {
  scenarioId: string;
  name: string;
  parameters: any;
  metrics: {
    cost: number;
    risk: 'low' | 'medium' | 'high';
    confidence: number;
    expectedOutcome: string;
  };
  comparison: {
    bestFor: 'cost' | 'risk' | 'reliability';
    recommendation: string;
  };
}

// In-memory storage
const simulations: Map<string, any> = new Map();

// ============================================
// SIMULATION ENDPOINTS
// ============================================

/**
 * Create simulation
 */
app.post('/api/simulations', async (req: Request, res: Response) => {
  try {
    const { intentId, title, scenarios, constraints } = req.body as SimulationRequest;
    const simulationId = `SIM-${uuidv4().substring(0, 8).toUpperCase()}`;

    const results: SimulationResult[] = [];

    // Run each scenario
    for (const scenario of scenarios) {
      const result = runScenario(scenario, constraints);
      results.push({
        scenarioId: `SCN-${uuidv4().substring(0, 6).toUpperCase()}`,
        ...result
      });
    }

    // Find best scenario
    const bestCost = results.reduce((a, b) => a.metrics.cost < b.metrics.cost ? a : b);
    const bestRisk = results.reduce((a, b) => {
      const riskOrder = { low: 1, medium: 2, high: 3 };
      return riskOrder[a.metrics.risk] < riskOrder[b.metrics.risk] ? a : b;
    });

    // Mark best-for in each
    results.forEach(r => {
      r.comparison.bestFor = r === bestCost ? 'cost' : r === bestRisk ? 'risk' : 'reliability';
    });

    const simulation = {
      simulationId,
      intentId,
      title,
      scenarios: results,
      constraints,
      bestScenario: results[0],
      createdAt: new Date().toISOString()
    };

    simulations.set(simulationId, simulation);

    res.status(201).json({ success: true, data: simulation });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * Get simulation
 */
app.get('/api/simulations/:id', async (req: Request, res: Response) => {
  const simulation = simulations.get(req.params.id);
  if (!simulation) {
    return res.status(404).json({ success: false, error: 'Simulation not found' });
  }
  res.json({ success: true, data: simulation });
});

/**
 * List simulations
 */
app.get('/api/simulations', async (req: Request, res: Response) => {
  const { intentId } = req.query;
  let list = Array.from(simulations.values());

  if (intentId) {
    list = list.filter(s => s.intentId === intentId);
  }

  res.json({ success: true, data: list.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )});
});

/**
 * Monte Carlo simulation
 */
app.post('/api/monte-carlo', async (req: Request, res: Response) => {
  try {
    const { baseValue, iterations = 1000, minFactor = 0.8, maxFactor = 1.2 } = req.body;

    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const random = minFactor + Math.random() * (maxFactor - minFactor);
      results.push(baseValue * random);
    }

    results.sort((a, b) => a - b);

    const p10 = results[Math.floor(iterations * 0.1)];
    const p50 = results[Math.floor(iterations * 0.5)];
    const p90 = results[Math.floor(iterations * 0.9)];
    const mean = results.reduce((a, b) => a + b, 0) / results.length;

    res.json({
      success: true,
      data: {
        baseValue,
        iterations,
        results: {
          pessimistic: p10,
          median: p50,
          optimistic: p90,
          mean
        },
        confidence: 0.95
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/**
 * What-if analysis
 */
app.post('/api/what-if', async (req: Request, res: Response) => {
  try {
    const { currentState, changes } = req.body;

    const analysis = {
      current: currentState,
      changes: changes.map((change: any) => {
        const impact = calculateImpact(currentState, change);
        return {
          ...change,
          impact,
          riskLevel: impact.cost > (currentState.budget || 100000) * 0.1 ? 'high' : impact.cost > (currentState.budget || 100000) * 0.05 ? 'medium' : 'low'
        };
      }),
      recommendations: generateRecommendations(currentState)
    };

    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// ============================================
// HELPERS
// ============================================

function runScenario(scenario: Scenario, constraints?: any): Omit<SimulationResult, 'scenarioId'> {
  const baseCost = 50000;
  const quantity = scenario.parameters.quantity || 100;
  const price = scenario.parameters.price || 500;

  let cost = quantity * price;
  let risk: 'low' | 'medium' | 'high' = 'medium';
  let expectedOutcome = 'Viable option';

  // Calculate based on parameters
  if (scenario.parameters.supplier === 'premium') {
    cost *= 1.3;
    risk = 'low';
    expectedOutcome = 'Higher quality, lower risk';
  } else if (scenario.parameters.supplier === 'budget') {
    cost *= 0.7;
    risk = 'high';
    expectedOutcome = 'Lower cost, higher risk';
  }

  // Early delivery bonus
  if (scenario.parameters.timing === 'rush') {
    cost *= 1.5;
    expectedOutcome = 'Fast delivery, premium cost';
  }

  // Constraints check
  if (constraints?.maxBudget && cost > constraints.maxBudget) {
    risk = 'high';
    expectedOutcome += ' - Exceeds budget';
  }

  if (constraints?.riskTolerance === 'low' && risk === 'high') {
    expectedOutcome += ' - Not recommended for low-risk tolerance';
  }

  const confidence = risk === 'low' ? 0.9 : risk === 'medium' ? 0.75 : 0.5;

  return {
    name: scenario.name,
    parameters: scenario.parameters,
    metrics: {
      cost: Math.round(cost * 100) / 100,
      risk,
      confidence,
      expectedOutcome
    },
    comparison: {
      bestFor: 'cost' as const,
      recommendation: expectedOutcome
    }
  };
}

function calculateImpact(currentState: any, change: any): any {
  const costImpact = (change.quantity || 0) * (change.price || currentState.price || 500);
  const timeImpact = (change.deliveryDays || 0) * (currentState.dailyCost || 1000);

  return {
    costChange: costImpact + timeImpact,
    percentageChange: ((costImpact + timeImpact) / (currentState.budget || 100000)) * 100
  };
}

function generateRecommendations(state: any): string[] {
  const recs: string[] = [];

  if (state.quantity > 1000) {
    recs.push('Consider bulk discount from suppliers');
  }

  if (state.deliveryDays > 7) {
    recs.push('Negotiate faster delivery for premium pricing');
  }

  recs.push('Run Monte Carlo simulation for risk assessment');

  return recs;
}

// Error handling
app.use((_, res) => res.status(404).json({ success: false, error: 'Not found' }));
app.use((err: Error, _, res: Response, _next: any) => {
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`Simulation Engine running on port ${PORT}`);
});

export default app;
