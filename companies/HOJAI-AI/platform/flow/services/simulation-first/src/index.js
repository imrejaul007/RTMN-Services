/**
 * FlowOS Simulation-First Execution
 *
 * Extends simulation with pre-execution gates:
 * - Pre-execution simulation
 * - Risk scoring
 * - Human approval gates
 * - Auto-rollback on failure
 *
 * Port: 5371
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5371;

app.use(cors());
app.use(express.json());

// Storage
const storage = {
  simulations: new Map(),
  approvals: new Map(),
  executions: new Map()
};

// Risk thresholds
const RISK_THRESHOLDS = {
  CRITICAL: 80,
  HIGH: 60,
  MEDIUM: 40,
  LOW: 20
};

// Amount thresholds (trigger simulation gate)
const SIMULATION_THRESHOLDS = {
  amount: 10000,        // $10K+
  risk: 60,             // Risk score 60+
  critical: true         // Any critical workflow
};

// Monte Carlo simulation
function runMonteCarloSimulation(workflow, iterations = 1000) {
  const outcomes = [];
  const costs = [];

  for (let i = 0; i < iterations; i++) {
    const outcome = simulateWorkflowPath(workflow);
    outcomes.push(outcome);
    costs.push(outcome.cost || 0);
  }

  const successRate = outcomes.filter(o => o.success).length / iterations;
  const avgCost = costs.reduce((a, b) => a + b, 0) / iterations;

  // Calculate percentiles
  const sortedCosts = [...costs].sort((a, b) => a - b);
  const p5 = sortedCosts[Math.floor(iterations * 0.05)];
  const p95 = sortedCosts[Math.floor(iterations * 0.95)];

  return {
    successRate: Math.round(successRate * 100),
    avgCost: Math.round(avgCost * 100) / 100,
    minCost: Math.round(Math.min(...costs) * 100) / 100,
    maxCost: Math.round(Math.max(...costs) * 100) / 100,
    p5Cost: Math.round(p5 * 100) / 100,
    p95Cost: Math.round(p95 * 100) / 100,
    iterations
  };
}

function simulateWorkflowPath(workflow) {
  let success = true;
  let cost = 0;
  let riskScore = 0;

  for (const node of workflow.nodes || []) {
    // Simulate node execution
    const nodeRisk = Math.random() * 30; // 0-30 risk per node
    const nodeCost = Math.random() * 100; // 0-100 cost per node

    riskScore += nodeRisk;
    cost += nodeCost;

    // 5% chance of failure per node
    if (Math.random() < 0.05) {
      success = false;
      cost += Math.random() * 500; // Failure penalty
    }
  }

  return {
    success,
    cost: Math.round(cost * 100) / 100,
    riskScore: Math.min(100, riskScore)
  };
}

// Calculate risk score for workflow
function calculateRiskScore(workflow, context = {}) {
  let score = 0;

  // Amount-based risk
  if (context.amount > 100000) score += 30;
  else if (context.amount > 50000) score += 20;
  else if (context.amount > 10000) score += 10;

  // Complexity-based risk
  const nodeCount = workflow.nodes?.length || 0;
  if (nodeCount > 20) score += 25;
  else if (nodeCount > 10) score += 15;
  else if (nodeCount > 5) score += 5;

  // Connector-based risk
  const connectorNodes = workflow.nodes?.filter(n => n.type === 'connector') || [];
  score += connectorNodes.length * 5;

  // Human task risk
  const humanTasks = workflow.nodes?.filter(n => n.type === 'human_task') || [];
  score += humanTasks.length * 10;

  // External API risk
  const httpNodes = workflow.nodes?.filter(n => n.type === 'http') || [];
  score += httpNodes.length * 3;

  return Math.min(100, score);
}

// Determine risk level
function getRiskLevel(score) {
  if (score >= RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (score >= RISK_THRESHOLDS.HIGH) return 'high';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'medium';
  return 'low';
}

// Check if simulation gate is required
function requiresSimulationGate(workflow, context = {}) {
  return (
    context.amount >= SIMULATION_THRESHOLDS.amount ||
    context.risk >= SIMULATION_THRESHOLDS.risk ||
    context.critical === SIMULATION_THRESHOLDS.critical
  );
}

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'simulation-first',
    version: '1.0.0',
    port: PORT,
    simulations: storage.simulations.size,
    pendingApprovals: storage.approvals.size,
    timestamp: new Date().toISOString()
  });
});

// Pre-execution simulation
app.post('/api/simulate/pre-execute', (req, res) => {
  const { workflow, context = {}, iterations = 1000 } = req.body || {};

  if (!workflow) {
    return res.status(400).json({ error: 'workflow is required' });
  }

  const simulationId = 'sim_' + crypto.randomUUID();
  const riskScore = calculateRiskScore(workflow, context);
  const riskLevel = getRiskLevel(riskScore);
  const simulationGate = requiresSimulationGate(workflow, context);
  const simulation = runMonteCarloSimulation(workflow, iterations);

  const result = {
    simulationId,
    workflowName: workflow.name || 'Unnamed',
    riskScore,
    riskLevel,
    simulationGate,
    requiresApproval: simulationGate && riskLevel === 'critical',
    simulation,
    thresholds: SIMULATION_THRESHOLDS,
    triggeredBy: [],
    createdAt: new Date().toISOString()
  };

  // Determine what triggered the gate
  if (context.amount >= SIMULATION_THRESHOLDS.amount) {
    result.triggeredBy.push('amount');
  }
  if (context.risk >= SIMULATION_THRESHOLDS.risk) {
    result.triggeredBy.push('risk');
  }
  if (context.critical) {
    result.triggeredBy.push('critical');
  }

  storage.simulations.set(simulationId, result);

  res.json(result);
});

// Get simulation result
app.get('/api/simulate/:id', (req, res) => {
  const simulation = storage.simulations.get(req.params.id);
  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }
  res.json(simulation);
});

// Risk scoring
app.post('/api/simulate/risk-score', (req, res) => {
  const { workflow, context = {} } = req.body || {};

  if (!workflow) {
    return res.status(400).json({ error: 'workflow is required' });
  }

  const riskScore = calculateRiskScore(workflow, context);
  const riskLevel = getRiskLevel(riskScore);
  const simulationGate = requiresSimulationGate(workflow, context);

  res.json({
    riskScore,
    riskLevel,
    simulationGate,
    requiresApproval: simulationGate && riskLevel === 'critical',
    breakdown: {
      amountRisk: context.amount > 10000 ? Math.min(30, context.amount / 5000) : 0,
      complexityRisk: Math.min(25, (workflow.nodes?.length || 0) * 2),
      connectorRisk: (workflow.nodes?.filter(n => n.type === 'connector')?.length || 0) * 5,
      humanTaskRisk: (workflow.nodes?.filter(n => n.type === 'human_task')?.length || 0) * 10
    },
    thresholds: RISK_THRESHOLDS
  });
});

// Create approval request for simulation
app.post('/api/simulate/:id/approve', (req, res) => {
  const { simulationId } = req.params;
  const { approverId, comment, context = {} } = req.body || {};

  const simulation = storage.simulations.get(simulationId);
  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  if (!simulation.requiresApproval) {
    return res.status(400).json({ error: 'Simulation does not require approval' });
  }

  const approvalId = 'approval_' + crypto.randomUUID();
  const approval = {
    id: approvalId,
    simulationId,
    workflow: simulation.workflowName,
    riskScore: simulation.riskScore,
    riskLevel: simulation.riskLevel,
    simulationResult: simulation.simulation,
    status: 'pending',
    approverId,
    approvers: [],
    comments: comment ? [{ author: approverId, text: comment, at: new Date().toISOString() }] : [],
    context,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h
  };

  storage.approvals.set(approvalId, approval);
  simulation.pendingApproval = approvalId;

  res.status(201).json(approval);
});

// Get pending approvals
app.get('/api/approvals', (req, res) => {
  const { status = 'pending' } = req.query;
  const approvals = Array.from(storage.approvals.values())
    .filter(a => a.status === status)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ approvals, count: approvals.length });
});

// Approve simulation
app.post('/api/approvals/:id/approve', (req, res) => {
  const { id } = req.params;
  const { approverId, comment } = req.body || {};

  const approval = storage.approvals.get(id);
  if (!approval) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  approval.status = 'approved';
  approval.approvedAt = new Date().toISOString();
  approval.approvedBy = approverId;
  if (comment) {
    approval.comments.push({ author: approverId, text: comment, at: approval.approvedAt });
  }

  // Update simulation
  const simulation = storage.simulations.get(approval.simulationId);
  if (simulation) {
    simulation.approved = true;
    simulation.approvedAt = approval.approvedAt;
    simulation.approvedBy = approverId;
  }

  res.json(approval);
});

// Reject simulation
app.post('/api/approvals/:id/reject', (req, res) => {
  const { id } = req.params;
  const { rejectorId, reason } = req.body || {};

  const approval = storage.approvals.get(id);
  if (!approval) {
    return res.status(404).json({ error: 'Approval not found' });
  }

  approval.status = 'rejected';
  approval.rejectedAt = new Date().toISOString();
  approval.rejectedBy = rejectorId;
  approval.rejectionReason = reason;

  res.json(approval);
});

// Execute with simulation gate
app.post('/api/simulate/execute', async (req, res) => {
  const { simulationId, workflow, context = {}, rollbackOnFailure = true } = req.body || {};

  const simulation = storage.simulations.get(simulationId);
  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  // Check approval if required
  if (simulation.requiresApproval && !simulation.approved) {
    return res.status(403).json({
      error: 'Simulation requires approval before execution',
      approvalRequired: true,
      approvalId: simulation.pendingApproval
    });
  }

  const executionId = 'exec_' + crypto.randomUUID();
  const startTime = Date.now();

  // Simulate execution
  const outcome = simulateWorkflowPath(workflow);

  const execution = {
    id: executionId,
    simulationId,
    workflowName: workflow.name || 'Unnamed',
    context,
    status: outcome.success ? 'completed' : (rollbackOnFailure ? 'rolled_back' : 'failed'),
    outcome,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    duration: Date.now() - startTime,
    rollbackTriggered: !outcome.success && rollbackOnFailure
  };

  storage.executions.set(executionId, execution);
  simulation.executionId = executionId;

  res.status(201).json(execution);
});

// Get execution
app.get('/api/executions/:id', (req, res) => {
  const execution = storage.executions.get(req.params.id);
  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }
  res.json(execution);
});

// Dashboard
app.get('/api/dashboard', (req, res) => {
  const simulations = Array.from(storage.simulations.values());
  const approvals = Array.from(storage.approvals.values());
  const executions = Array.from(storage.executions.values());

  const pendingApprovals = approvals.filter(a => a.status === 'pending').length;
  const recentSimulations = simulations.slice(-10);

  // Risk distribution
  const riskDistribution = {
    critical: simulations.filter(s => s.riskLevel === 'critical').length,
    high: simulations.filter(s => s.riskLevel === 'high').length,
    medium: simulations.filter(s => s.riskLevel === 'medium').length,
    low: simulations.filter(s => s.riskLevel === 'low').length
  };

  // Success rate
  const completedExecutions = executions.filter(e => e.status === 'completed');
  const successRate = completedExecutions.length > 0
    ? Math.round((completedExecutions.length / executions.length) * 100)
    : 0;

  res.json({
    totalSimulations: simulations.length,
    pendingApprovals,
    totalExecutions: executions.length,
    successRate,
    riskDistribution,
    recentSimulations
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`[simulation-first] listening on :${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[simulation-first] Shutting down...');
  server.close();
});

export { app };
