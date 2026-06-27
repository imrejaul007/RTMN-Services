/**
 * Simulation OS - Production Implementation
 * Company, market, pricing, and risk simulation engine
 * Port: 4874
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4874;
const START_TIME = Date.now();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Types
type SimulationType = 'company' | 'market' | 'pricing' | 'risk' | 'whatif';
type SimulationStatus = 'pending' | 'running' | 'completed' | 'failed';

interface Simulation {
  id: string;
  type: SimulationType;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  status: SimulationStatus;
  results?: SimulationResult;
  createdAt: string;
  completedAt?: string;
  createdBy: string;
}

interface SimulationResult {
  summary: {
    outcome: string;
    confidence: number;
    keyMetrics: Record<string, number>;
  };
  scenarios: ScenarioResult[];
  recommendations: string[];
  risks: string[];
  charts: ChartData[];
}

interface ScenarioResult {
  name: string;
  probability: number;
  impact: Record<string, number>;
  timeline: { time: number; value: number }[];
}

interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: unknown[];
}

// Monte Carlo simulation helper
function monteCarloSimulation(
  iterations: number,
  params: { mean: number; stdDev: number; min: number; max: number }[]
): { values: number[]; mean: number; stdDev: number; percentile5: number; percentile95: number } {
  const values: number[] = [];

  for (let i = 0; i < iterations; i++) {
    let total = 0;
    for (const param of params) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      let value = param.mean + z * param.stdDev;
      value = Math.max(param.min, Math.min(param.max, value));
      total += value;
    }
    values.push(total / params.length);
  }

  values.sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    values,
    mean,
    stdDev,
    percentile5: values[Math.floor(iterations * 0.05)],
    percentile95: values[Math.floor(iterations * 0.95)],
  };
}

// In-memory store
const simulations = new Map<string, Simulation>();

// Validation schemas
const CompanySimulationSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  parameters: z.object({
    scenarioType: z.enum(['revenue_growth', 'cost_reduction', 'expansion', 'acquisition']),
    employees: z.number().int().positive(),
    currentRevenue: z.number().positive(),
    growthRate: z.number().min(-1).max(1),
    costStructure: z.object({
      fixed: z.number().positive(),
      variable: z.number().positive(),
    }),
    years: z.number().int().min(1).max(10).default(5),
  }),
});

const MarketSimulationSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  parameters: z.object({
    marketSize: z.number().positive(),
    marketGrowthRate: z.number().min(-0.5).max(0.5),
    competitors: z.array(z.object({
      name: z.string(),
      marketShare: z.number().min(0).max(1),
      growthRate: z.number(),
    })),
    marketShareTarget: z.number().min(0).max(1),
    iterations: z.number().int().min(100).max(10000).default(1000),
  }),
});

const PricingSimulationSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  parameters: z.object({
    currentPrice: z.number().positive(),
    costPerUnit: z.number().positive(),
    priceRange: z.object({
      min: z.number().positive(),
      max: z.number().positive(),
    }),
    elasticity: z.number().min(-5).max(0),
    demandBase: z.number().positive(),
    competitorsPrices: z.array(z.number().positive()),
  }),
});

const RiskSimulationSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  parameters: z.object({
    initialValue: z.number().positive(),
    riskFactors: z.array(z.object({
      name: z.string(),
      probability: z.number().min(0).max(1),
      impact: z.number(), // positive or negative percentage
    })),
    timeHorizon: z.number().int().positive(), // years
    simulations: z.number().int().min(100).max(100000).default(10000),
  }),
});

// API Endpoints

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'simulation-os',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    simulations: simulations.size,
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Company Simulation
app.post('/api/simulate/company', async (req: Request, res: Response) => {
  try {
    const data = CompanySimulationSchema.parse(req.body);
    const id = uuidv4();

    const simulation: Simulation = {
      id,
      type: 'company',
      name: data.name,
      description: data.description,
      parameters: data.parameters,
      status: 'running',
      createdAt: new Date().toISOString(),
      createdBy: req.get('x-user-email') || 'unknown',
    };

    simulations.set(id, simulation);

    // Run simulation asynchronously
    setTimeout(() => {
      try {
        const { employees, currentRevenue, growthRate, costStructure, years } = data.parameters;

        const yearlyProjections = [];
        let revenue = currentRevenue;
        let costs = costStructure.fixed + costStructure.variable * employees;

        for (let year = 1; year <= years; year++) {
          revenue *= (1 + growthRate + (Math.random() - 0.5) * 0.02);
          costs *= 1 + (Math.random() * 0.05);

          yearlyProjections.push({
            year,
            revenue: Math.round(revenue),
            costs: Math.round(costs),
            profit: Math.round(revenue - costs),
            margin: Math.round(((revenue - costs) / revenue) * 100),
          });
        }

        const finalProjection = yearlyProjections[yearlyProjections.length - 1];
        simulation.results = {
          summary: {
            outcome: finalProjection.margin > 10 ? 'Profitable' : 'Break-even',
            confidence: 0.85,
            keyMetrics: {
              finalRevenue: finalProjection.revenue,
              finalMargin: finalProjection.margin,
              totalProfit: yearlyProjections.reduce((sum, y) => sum + y.profit, 0),
            },
          },
          scenarios: [
            {
              name: 'Base Case',
              probability: 0.6,
              impact: { revenue: finalProjection.revenue, margin: finalProjection.margin },
              timeline: yearlyProjections.map(y => ({ time: y.year, value: y.revenue })),
            },
            {
              name: 'Optimistic',
              probability: 0.25,
              impact: { revenue: finalProjection.revenue * 1.2, margin: finalProjection.margin * 1.3 },
              timeline: yearlyProjections.map((y, i) => ({ time: y.year, value: y.revenue * 1.2 })),
            },
            {
              name: 'Pessimistic',
              probability: 0.15,
              impact: { revenue: finalProjection.revenue * 0.8, margin: finalProjection.margin * 0.6 },
              timeline: yearlyProjections.map((y, i) => ({ time: y.year, value: y.revenue * 0.8 })),
            },
          ],
          recommendations: [
            `Target ${Math.round(finalProjection.margin + 5)}% margin by year ${years}`,
            'Consider phased hiring to match revenue growth',
            'Review fixed cost structure annually',
          ],
          risks: [
            'Market conditions may differ from projections',
            'Competitor actions not modeled',
            'Economic downturn could impact growth',
          ],
          charts: [
            { type: 'line' as const, title: 'Revenue Projection', data: yearlyProjections },
            { type: 'bar' as const, title: 'Profit by Year', data: yearlyProjections },
          ],
        };
        simulation.status = 'completed';
        simulation.completedAt = new Date().toISOString();
      } catch (err) {
        simulation.status = 'failed';
        console.error(`[simulation-os] company sim ${id} failed:`, err);
      }
    }, 100);

    res.status(202).json({ id, status: 'running', message: 'Simulation started' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});

// Market Simulation
app.post('/api/simulate/market', async (req: Request, res: Response) => {
  try {
    const data = MarketSimulationSchema.parse(req.body);
    const id = uuidv4();

    const simulation: Simulation = {
      id,
      type: 'market',
      name: data.name,
      description: data.description,
      parameters: data.parameters,
      status: 'running',
      createdAt: new Date().toISOString(),
      createdBy: req.get('x-user-email') || 'unknown',
    };

    simulations.set(id, simulation);

    setTimeout(() => {
      try {
        const { marketSize, marketGrowthRate, competitors, marketShareTarget, iterations } = data.parameters;

        // Monte Carlo simulation
        const mcResult = monteCarloSimulation(
          iterations,
          competitors.map(c => ({
            mean: c.marketShare,
            stdDev: 0.02,
            min: 0,
            max: 1,
          }))
        );

        const scenarios = [];
        const ourShares = [];

        for (let i = 0; i < 10; i++) {
          const trialShares = competitors.map(c => {
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return Math.max(0.01, Math.min(0.5, c.marketShare + z * 0.02));
          });

          const totalShared = trialShares.reduce((a, b) => a + b, 0);
          const ourShare = 1 - totalShared;

          if (ourShare > 0) {
            ourShares.push(ourShare);
            scenarios.push({
              name: `Scenario ${i + 1}`,
              probability: 0.1,
              impact: {
                ourMarketShare: Math.round(ourShare * 100),
                marketSize: Math.round(marketSize * Math.pow(1 + marketGrowthRate, 3)),
                revenue: Math.round(marketSize * ourShare * 0.3), // assume 30% capture rate
              },
              timeline: [1, 2, 3].map(year => ({
                time: year,
                value: marketSize * Math.pow(1 + marketGrowthRate, year) * ourShare,
              })),
            });
          }
        }

        const avgShare = ourShares.reduce((a, b) => a + b, 0) / ourShares.length;

        simulation.results = {
          summary: {
            outcome: avgShare >= marketShareTarget ? 'Target Achievable' : 'Below Target',
            confidence: 0.78,
            keyMetrics: {
              averageMarketShare: Math.round(avgShare * 100),
              targetMarketShare: Math.round(marketShareTarget * 100),
              marketSizeYear3: Math.round(marketSize * Math.pow(1 + marketGrowthRate, 3)),
              percentile5: Math.round(mcResult.percentile5 * 100),
              percentile95: Math.round(mcResult.percentile95 * 100),
            },
          },
          scenarios,
          recommendations: [
            avgShare < marketShareTarget ? `Need to gain ${Math.round((marketShareTarget - avgShare) * 100)}% more share` : 'Target market share is achievable',
            'Invest in differentiation to compete with established players',
            'Consider partnership or acquisition strategy',
          ],
          risks: [
            'Established competitors may retaliate',
            'Market growth assumptions may not hold',
            'Regulatory changes could impact market',
          ],
          charts: [
            { type: 'pie' as const, title: 'Market Share Distribution', data: competitors },
            { type: 'line' as const, title: 'Market Size Projection', data: [1, 2, 3, 4, 5].map(y => ({ year: y, size: marketSize * Math.pow(1 + marketGrowthRate, y) })) },
          ],
        };
        simulation.status = 'completed';
        simulation.completedAt = new Date().toISOString();
      } catch (err) {
        simulation.status = 'failed';
        console.error(`[simulation-os] market sim ${id} failed:`, err);
      }
    }, 100);

    res.status(202).json({ id, status: 'running', message: 'Simulation started' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});

// Pricing Simulation
app.post('/api/simulate/pricing', async (req: Request, res: Response) => {
  try {
    const data = PricingSimulationSchema.parse(req.body);
    const id = uuidv4();

    const simulation: Simulation = {
      id,
      type: 'pricing',
      name: data.name,
      description: data.description,
      parameters: data.parameters,
      status: 'running',
      createdAt: new Date().toISOString(),
      createdBy: req.get('x-user-email') || 'unknown',
    };

    simulations.set(id, simulation);

    setTimeout(() => {
      try {
        const { currentPrice, costPerUnit, priceRange, elasticity, demandBase, competitorsPrices } = data.parameters;

        const pricePoints = [];
        const step = (priceRange.max - priceRange.min) / 20;

        for (let price = priceRange.min; price <= priceRange.max; price += step) {
          // Demand with elasticity
          const demandChange = 1 + elasticity * ((price - currentPrice) / currentPrice);
          const demand = demandBase * demandChange;

          // Add competitor price effect
          const avgCompetitorPrice = competitorsPrices.reduce((a, b) => a + b, 0) / competitorsPrices.length;
          const competitorEffect = price < avgCompetitorPrice ? 1.2 : 0.9;
          const finalDemand = demand * competitorEffect;

          const revenue = price * finalDemand;
          const profit = (price - costPerUnit) * finalDemand;
          const margin = ((price - costPerUnit) / price) * 100;

          pricePoints.push({
            price: Math.round(price * 100) / 100,
            demand: Math.round(finalDemand),
            revenue: Math.round(revenue),
            profit: Math.round(profit),
            margin: Math.round(margin * 10) / 10,
          });
        }

        const optimal = pricePoints.reduce((best, p) => p.profit > best.profit ? p : best);

        simulation.results = {
          summary: {
            outcome: 'Optimal price found',
            confidence: 0.82,
            keyMetrics: {
              currentPrice,
              optimalPrice: optimal.price,
              currentProfit: pricePoints.find(p => Math.abs(p.price - currentPrice) < step)?.profit || 0,
              optimalProfit: optimal.profit,
              profitLift: Math.round((optimal.profit / (pricePoints.find(p => Math.abs(p.price - currentPrice) < step)?.profit || 1) - 1) * 100),
            },
          },
          scenarios: pricePoints.filter((_, i) => i % 5 === 0).map((p, i) => ({
            name: `Price $${p.price}`,
            probability: 0.2,
            impact: { revenue: p.revenue, profit: p.profit, margin: p.margin },
            timeline: [],
          })),
          recommendations: [
            `Optimal price is $${optimal.price} ($${Math.abs(Math.round((optimal.price - currentPrice) * 100) / 100)} ${optimal.price > currentPrice ? 'increase' : 'decrease'})`,
            `This would yield $${Math.round(optimal.profit)} profit vs $${Math.round(pricePoints.find(p => Math.abs(p.price - currentPrice) < step)?.profit || 0)} at current price`,
            'Consider A/B testing the new price with a subset of customers',
          ],
          risks: [
            'Price elasticity may change over time',
            'Competitor pricing strategy not fully modeled',
            'Customer price sensitivity may differ from historical data',
          ],
          charts: [
            { type: 'line' as const, title: 'Profit vs Price', data: pricePoints },
            { type: 'bar' as const, title: 'Demand vs Price', data: pricePoints },
          ],
        };
        simulation.status = 'completed';
        simulation.completedAt = new Date().toISOString();
      } catch (err) {
        simulation.status = 'failed';
        console.error(`[simulation-os] pricing sim ${id} failed:`, err);
      }
    }, 100);

    res.status(202).json({ id, status: 'running', message: 'Simulation started' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});

// Risk Simulation
app.post('/api/simulate/risk', async (req: Request, res: Response) => {
  try {
    const data = RiskSimulationSchema.parse(req.body);
    const id = uuidv4();

    const simulation: Simulation = {
      id,
      type: 'risk',
      name: data.name,
      description: data.description,
      parameters: data.parameters,
      status: 'running',
      createdAt: new Date().toISOString(),
      createdBy: req.get('x-user-email') || 'unknown',
    };

    simulations.set(id, simulation);

    setTimeout(() => {
      try {
        const { initialValue, riskFactors, timeHorizon, simulations: numSimulations } = data.parameters;

        const finalValues: number[] = [];
        const yearlyValues: { year: number; values: number[] }[] = [];

        for (let year = 1; year <= timeHorizon; year++) {
          yearlyValues.push({ year, values: [] });
        }

        for (let i = 0; i < numSimulations; i++) {
          let value = initialValue;

          for (let year = 1; year <= timeHorizon; year++) {
            for (const risk of riskFactors) {
              if (Math.random() < risk.probability) {
                value *= (1 + risk.impact);
              }
            }
            // Add some random growth
            value *= 1 + (Math.random() - 0.3) * 0.1;
            yearlyValues[year - 1].values.push(value);
          }

          finalValues.push(value);
        }

        finalValues.sort((a, b) => a - b);
        const mean = finalValues.reduce((a, b) => a + b, 0) / finalValues.length;
        const variance = finalValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / finalValues.length;
        const stdDev = Math.sqrt(variance);

        const percentile5 = finalValues[Math.floor(numSimulations * 0.05)];
        const percentile95 = finalValues[Math.floor(numSimulations * 0.95)];
        const var95 = initialValue - percentile5; // Value at Risk

        const losses = finalValues.filter(v => v < initialValue).length;
        const probabilityOfLoss = losses / numSimulations;

        simulation.results = {
          summary: {
            outcome: mean > initialValue ? 'Positive Expected Value' : 'Negative Expected Value',
            confidence: 0.95,
            keyMetrics: {
              initialValue,
              expectedFinalValue: Math.round(mean),
              stdDev: Math.round(stdDev),
              percentile5: Math.round(percentile5),
              percentile95: Math.round(percentile95),
              var95: Math.round(var95),
              probabilityOfLoss: Math.round(probabilityOfLoss * 100),
            },
          },
          scenarios: [
            {
              name: 'Worst Case (5th percentile)',
              probability: 0.05,
              impact: { finalValue: Math.round(percentile5), loss: Math.round(initialValue - percentile5) },
              timeline: [],
            },
            {
              name: 'Base Case (Mean)',
              probability: 0.5,
              impact: { finalValue: Math.round(mean), gain: Math.round(mean - initialValue) },
              timeline: [],
            },
            {
              name: 'Best Case (95th percentile)',
              probability: 0.05,
              impact: { finalValue: Math.round(percentile95), gain: Math.round(percentile95 - initialValue) },
              timeline: [],
            },
          ],
          recommendations: [
            `Value at Risk (95%): $${Math.round(var95)} - consider hedging strategies`,
            `Probability of loss: ${Math.round(probabilityOfLoss * 100)}%`,
            'Diversify risk factors to reduce concentration',
            'Consider insurance for high-probability risks',
          ],
          risks: riskFactors.filter(r => r.probability > 0.1).map(r => ({
            name: r.name,
            expectedImpact: `${r.probability * 100}% chance of ${r.impact > 0 ? '+' : ''}${Math.round(r.impact * 100)}%`,
          })),
          charts: [
            {
              type: 'area' as const,
              title: 'Value Distribution',
              data: [{ percentile5, mean, percentile95, initialValue }],
            },
          ],
        };
        simulation.status = 'completed';
        simulation.completedAt = new Date().toISOString();
      } catch (err) {
        simulation.status = 'failed';
        console.error(`[simulation-os] risk sim ${id} failed:`, err);
      }
    }, 100);

    res.status(202).json({ id, status: 'running', message: 'Simulation started' });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: err.issues });
    }
    res.status(500).json({ error: err.message });
  }
});

// Get simulation results
app.get('/api/simulate/:id', (req: Request, res: Response) => {
  const simulation = simulations.get(req.params.id);
  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }
  res.json(simulation);
});

// List simulations
app.get('/api/simulate', (req: Request, res: Response) => {
  const { type, status } = req.query;
  let result = Array.from(simulations.values());

  if (type) result = result.filter(s => s.type === type);
  if (status) result = result.filter(s => s.status === status);

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    total: result.length,
    simulations: result,
  });
});

// Cancel simulation
app.delete('/api/simulate/:id', (req: Request, res: Response) => {
  const simulation = simulations.get(req.params.id);
  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  if (simulation.status === 'completed' || simulation.status === 'failed') {
    simulations.delete(req.params.id);
  } else {
    simulation.status = 'failed';
  }

  res.json({ success: true });
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: unknown) => {
  console.error('[simulation-os] error:', err);
  res.status(500).json({ error: 'Internal error', message: err.message });
});

app.listen(PORT, () => {
  console.log(`[simulation-os] listening on :${PORT}`);
  console.log(`[simulation-os] types: company, market, pricing, risk`);
});

export default app;
