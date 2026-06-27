/**
 * Economic Intelligence - Workflow cost tracking, ROI analysis, and optimization
 * Provides insights into workflow economics and suggests optimizations
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = process.env.PORT || 5379;

app.use(cors());
app.use(express.json());

// In-memory storage
const workflows = new Map(); // workflowId -> workflow economics
const executions = new Map(); // executionId -> execution record
const stepCosts = new Map(); // stepType -> cost model

// Default cost model (per millisecond in USD)
const DEFAULT_COST_MODEL = {
  compute: 0.0000001, // $0.0000001 per ms
  memory: 0.000005, // $0.000005 per MB
  api: 0.001, // $0.001 per API call
  storage: 0.0001, // $0.0001 per GB-second
};

// Initialize cost model
function initializeCostModel(workflowId, costModel) {
  workflows.set(workflowId, {
    id: workflowId,
    name: costModel.name || 'Unnamed Workflow',
    costModel: { ...DEFAULT_COST_MODEL, ...costModel.costModel },
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalCost: 0,
    totalRevenue: 0,
    avgExecutionCost: 0,
    avgExecutionTime: 0,
    lastExecutionAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

// Calculate step cost
function calculateStepCost(stepType, duration, inputs) {
  const model = stepCosts.get(stepType) || {
    compute: duration,
    memory: inputs?.memoryMB || 10,
    api: inputs?.apiCalls || 1,
    storage: inputs?.storageGB || 0,
  };

  const costModel = DEFAULT_COST_MODEL;

  return {
    computeCost: model.compute * costModel.compute,
    memoryCost: model.memory * costModel.memory,
    apiCost: model.api * costModel.api,
    storageCost: model.storage * costModel.storage,
    totalCost: 0, // Will be calculated below
  };
}

function calculateStepCostTotal(stepType, duration, inputs) {
  const costs = calculateStepCost(stepType, duration, inputs);
  costs.totalCost = costs.computeCost + costs.memoryCost + costs.apiCost + costs.storageCost;
  return costs;
}

// Record execution
function recordExecution(workflowId, execution) {
  const workflow = workflows.get(workflowId);
  if (!workflow) {
    initializeCostModel(workflowId, {});
  }

  const execRecord = {
    id: execution.id || crypto.randomUUID(),
    workflowId,
    status: execution.status || 'running',
    startedAt: execution.startedAt || Date.now(),
    completedAt: null,
    duration: 0,
    steps: execution.steps || [],
    costs: {
      compute: 0,
      memory: 0,
      api: 0,
      storage: 0,
      total: 0,
    },
    revenue: execution.revenue || 0,
    roi: 0,
    metadata: execution.metadata || {},
  };

  if (execution.completedAt) {
    execRecord.completedAt = execution.completedAt;
    execRecord.duration = execRecord.completedAt - execRecord.startedAt;

    // Calculate costs for each step
    for (const step of execRecord.steps) {
      const stepCosts = calculateStepCostTotal(
        step.type,
        step.duration || 0,
        step.inputs
      );
      execRecord.costs.compute += stepCosts.computeCost;
      execRecord.costs.memory += stepCosts.memoryCost;
      execRecord.costs.api += stepCosts.apiCost;
      execRecord.costs.storage += stepCosts.storageCost;
      execRecord.costs.total += stepCosts.totalCost;
    }

    // Calculate ROI
    if (execRecord.costs.total > 0) {
      execRecord.roi = ((execRecord.revenue - execRecord.costs.total) / execRecord.costs.total) * 100;
    }

    // Update workflow aggregates
    const wf = workflows.get(workflowId);
    wf.totalExecutions++;
    if (execRecord.status === 'completed') {
      wf.successfulExecutions++;
    } else {
      wf.failedExecutions++;
    }
    wf.totalCost += execRecord.costs.total;
    wf.totalRevenue += execRecord.revenue;
    wf.avgExecutionCost = wf.totalCost / wf.totalExecutions;
    wf.avgExecutionTime = (wf.avgExecutionTime * (wf.totalExecutions - 1) + execRecord.duration) / wf.totalExecutions;
    wf.lastExecutionAt = execRecord.completedAt;
    wf.updatedAt = Date.now();

    workflows.set(workflowId, wf);
  }

  executions.set(execRecord.id, execRecord);
  return execRecord;
}

// Get workflow economics
function getWorkflowEconomics(workflowId) {
  return workflows.get(workflowId) || null;
}

// Get execution details
function getExecution(executionId) {
  return executions.get(executionId) || null;
}

// Get all executions for workflow
function getWorkflowExecutions(workflowId, options = {}) {
  let results = Array.from(executions.values())
    .filter(e => e.workflowId === workflowId);

  if (options.status) {
    results = results.filter(e => e.status === options.status);
  }

  if (options.since) {
    results = results.filter(e => e.startedAt >= options.since);
  }

  if (options.limit) {
    results = results.slice(-options.limit);
  }

  return results;
}

// Get cost breakdown
function getCostBreakdown(workflowId, period = 'all') {
  const executions = getWorkflowExecutions(workflowId);
  const now = Date.now();
  const periodMs = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'all': Infinity,
  };

  const cutoff = now - (periodMs[period] || Infinity);
  const filtered = executions.filter(e => e.startedAt >= cutoff);

  const breakdown = {
    compute: 0,
    memory: 0,
    api: 0,
    storage: 0,
    total: 0,
    count: filtered.length,
  };

  for (const exec of filtered) {
    breakdown.compute += exec.costs.compute;
    breakdown.memory += exec.costs.memory;
    breakdown.api += exec.costs.api;
    breakdown.storage += exec.costs.storage;
    breakdown.total += exec.costs.total;
  }

  return breakdown;
}

// Get ROI analysis
function getROIAnalysis(workflowId, period = 'all') {
  const executions = getWorkflowExecutions(workflowId, { status: 'completed' });
  const now = Date.now();
  const periodMs = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'all': Infinity,
  };

  const cutoff = now - (periodMs[period] || Infinity);
  const filtered = executions.filter(e => e.startedAt >= cutoff);

  const totalCost = filtered.reduce((sum, e) => sum + e.costs.total, 0);
  const totalRevenue = filtered.reduce((sum, e) => sum + e.revenue, 0);
  const avgROI = filtered.length > 0
    ? filtered.reduce((sum, e) => sum + e.roi, 0) / filtered.length
    : 0;

  return {
    workflowId,
    period,
    totalCost,
    totalRevenue,
    netProfit: totalRevenue - totalCost,
    roi: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
    avgROI,
    executionCount: filtered.length,
    avgCostPerExecution: filtered.length > 0 ? totalCost / filtered.length : 0,
    avgRevenuePerExecution: filtered.length > 0 ? totalRevenue / filtered.length : 0,
  };
}

// Get optimization suggestions
function getOptimizationSuggestions(workflowId) {
  const workflow = workflows.get(workflowId);
  if (!workflow) return [];

  const suggestions = [];
  const recentExecutions = getWorkflowExecutions(workflowId, { limit: 10 });

  // High cost analysis
  if (recentExecutions.length > 0) {
    const avgCost = recentExecutions.reduce((sum, e) => sum + e.costs.total, 0) / recentExecutions.length;

    if (avgCost > 0.10) {
      suggestions.push({
        type: 'cost_reduction',
        priority: 'high',
        title: 'High average execution cost',
        description: `Average execution cost is $${avgCost.toFixed(4)}, consider optimizing expensive steps`,
        potentialSavings: avgCost * 0.2,
      });
    }

    // Check for high API costs
    const avgApiCost = recentExecutions.reduce((sum, e) => sum + e.costs.api, 0) / recentExecutions.length;
    if (avgApiCost > avgCost * 0.5) {
      suggestions.push({
        type: 'api_optimization',
        priority: 'medium',
        title: 'High API call costs',
        description: 'API calls contribute significantly to costs. Consider caching or batching.',
        potentialSavings: avgApiCost * 0.3,
      });
    }

    // Check for slow executions
    const avgDuration = recentExecutions.reduce((sum, e) => sum + e.duration, 0) / recentExecutions.length;
    if (avgDuration > 5000) {
      suggestions.push({
        type: 'performance',
        priority: 'medium',
        title: 'Slow execution times',
        description: `Average execution time is ${(avgDuration / 1000).toFixed(1)}s. Consider parallelization.`,
        potentialSavings: avgDuration * 0.0000001 * 0.3, // Compute savings
      });
    }
  }

  // Low ROI analysis
  const roiAnalysis = getROIAnalysis(workflowId);
  if (roiAnalysis.roi < 0) {
    suggestions.push({
      type: 'roi_improvement',
      priority: 'high',
      title: 'Negative ROI detected',
      description: `Current ROI is ${roiAnalysis.roi.toFixed(1)}%. Workflow needs cost reduction or revenue increase.`,
      potentialSavings: Math.abs(roiAnalysis.netProfit),
    });
  }

  return suggestions;
}

// Get overall statistics
function getStats() {
  let totalCost = 0;
  let totalRevenue = 0;
  let totalExecutions = 0;
  let successfulExecutions = 0;

  for (const workflow of workflows.values()) {
    totalCost += workflow.totalCost;
    totalRevenue += workflow.totalRevenue;
    totalExecutions += workflow.totalExecutions;
    successfulExecutions += workflow.successfulExecutions;
  }

  return {
    totalWorkflows: workflows.size,
    totalExecutions,
    successfulExecutions,
    successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
    totalCost,
    totalRevenue,
    netProfit: totalRevenue - totalCost,
    overallROI: totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0,
  };
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'economic-intelligence', port: PORT });
});

app.post('/api/workflows', requireInternal, (req, res) => {
  try {
    initializeCostModel(req.body.workflowId, req.body);
    const workflow = workflows.get(req.body.workflowId);
    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId', (req, res) => {
  try {
    const workflow = getWorkflowEconomics(req.params.workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/executions', requireInternal, (req, res) => {
  try {
    const execution = recordExecution(req.body.workflowId, req.body);
    res.status(201).json(execution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/executions/:executionId', (req, res) => {
  try {
    const execution = getExecution(req.params.executionId);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId/executions', (req, res) => {
  try {
    const options = {
      status: req.query.status,
      since: req.query.since ? parseInt(req.query.since) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
    };
    const executions = getWorkflowExecutions(req.params.workflowId, options);
    res.json(executions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId/costs', (req, res) => {
  try {
    const period = req.query.period || 'all';
    const breakdown = getCostBreakdown(req.params.workflowId, period);
    res.json(breakdown);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId/roi', (req, res) => {
  try {
    const period = req.query.period || 'all';
    const analysis = getROIAnalysis(req.params.workflowId, period);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId/suggestions', (req, res) => {
  try {
    const suggestions = getOptimizationSuggestions(req.params.workflowId);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json(getStats());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Economic Intelligence service running on port ${PORT}`);
});

export { app, initializeCostModel, recordExecution, getWorkflowEconomics, getExecution, getWorkflowExecutions, getCostBreakdown, getROIAnalysis, getOptimizationSuggestions, getStats };