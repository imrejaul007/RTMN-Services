/**
 * FlowOS Economic Runtime
 * Dynamic cost optimization for workflows
 * Port: 5365
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5365;
app.use(cors());
app.use(express.json());

const storage = { costs: new Map(), budgets: new Map(), optimizations: new Map() };

app.get('/health', (_, res) => res.json({
  status: 'ok', service: 'economic-runtime', port: PORT,
  costs: storage.costs.size, budgets: storage.budgets.size
}));

// Track cost
app.post('/api/costs', (req, res) => {
  const { workflowId, agentId, amount, currency = 'USD' } = req.body || {};
  if (!workflowId) return res.status(400).json({ error: 'workflowId required' });

  const cost = {
    id: 'cost_' + crypto.randomUUID().slice(0, 8),
    workflowId, agentId, amount, currency,
    createdAt: new Date().toISOString()
  };
  storage.costs.set(cost.id, cost);
  res.status(201).json(cost);
});

// Get costs
app.get('/api/costs/:workflowId', (req, res) => {
  const costs = Array.from(storage.costs.values())
    .filter(c => c.workflowId === req.params.workflowId);
  const total = costs.reduce((sum, c) => sum + (c.amount || 0), 0);
  res.json({ count: costs.length, total, costs });
});

// Set budget
app.post('/api/budgets', (req, res) => {
  const { workflowId, limit, period = 'monthly' } = req.body || {};
  if (!workflowId || !limit) return res.status(400).json({ error: 'workflowId and limit required' });

  const budget = {
    id: 'budget_' + crypto.randomUUID().slice(0, 8),
    workflowId, limit, period, spent: 0,
    createdAt: new Date().toISOString()
  };
  storage.budgets.set(budget.id, budget);
  res.status(201).json(budget);
});

// Get budget
app.get('/api/budgets/:workflowId', (req, res) => {
  const budget = Array.from(storage.budgets.values())
    .find(b => b.workflowId === req.params.workflowId);
  if (!budget) return res.status(404).json({ error: 'Budget not found' });
  res.json(budget);
});

// Optimize route
app.post('/api/optimize', (req, res) => {
  const { agents = [], strategy = 'balanced' } = req.body || {};
  if (agents.length === 0) return res.status(400).json({ error: 'agents required' });

  const optimized = strategy === 'cheapest'
    ? agents.sort((a, b) => (a.cost || 0) - (b.cost || 0))
    : strategy === 'fastest'
    ? agents.sort((a, b) => (a.latency || 0) - (b.latency || 0))
    : agents.sort((a, b) => (b.trust || 0) / (a.cost || 1) - (a.trust || 0) / (b.cost || 1));

  res.json({ strategy, recommended: optimized[0], all: optimized });
});

app.get('/ready', (_, res) => res.json({ ready: true }));
app.listen(PORT, () => console.log(`[economic-runtime] :${PORT}`));
export { app };
