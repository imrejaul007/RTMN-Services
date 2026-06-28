/**
 * AI Optimizer Service - Workflow optimization and auto-healing
 * Analyzes workflows, suggests improvements, and auto-heals failures
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
const PORT = process.env.PORT || 5383;

app.use(cors());
app.use(express.json());

// Storage
const workflows = new Map();
const patterns = new Map();
const suggestions = new Map();
const learnings = new Map();

// Suggestion types
const SUGGESTION_TYPES = {
  PERFORMANCE: 'performance',
  COST: 'cost',
  RELIABILITY: 'reliability',
  SECURITY: 'security',
  SIMPLICITY: 'simplicity',
};

const PRIORITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' };

// Analyze workflow
function analyzeWorkflow(workflowId, workflowDefinition) {
  const analysis = {
    workflowId,
    score: 100,
    issues: [],
    suggestions: [],
    metrics: {},
    timestamp: Date.now(),
  };

  const nodes = workflowDefinition?.nodes || [];
  const connections = workflowDefinition?.connections || [];

  // Check complexity
  if (nodes.length > 20) {
    analysis.issues.push({ type: 'complexity', message: 'Workflow has many steps, consider breaking into sub-workflows' });
    analysis.score -= 10;
    analysis.suggestions.push({ type: SUGGESTION_TYPES.SIMPLICITY, priority: PRIORITY.MEDIUM, title: 'Reduce complexity', description: 'Consider splitting into smaller sub-workflows', potential_improvement: 'Maintainability +40%, Testability +30%' });
  }

  // Check for missing error handling
  const nodesWithoutError = nodes.filter(n => !n.errorHandling && n.type === 'task');
  if (nodesWithoutError.length > 0) {
    analysis.issues.push({ type: 'error_handling', message: `${nodesWithoutError.length} steps lack error handling` });
    analysis.score -= 15;
    analysis.suggestions.push({ type: SUGGESTION_TYPES.RELIABILITY, priority: PRIORITY.HIGH, title: 'Add error handling', description: 'Add try-catch and retry logic to vulnerable steps', potential_improvement: 'Reliability +50%' });
  }

  // Check for sequential steps that could be parallel
  const sequentialSteps = findSequentialSteps(nodes, connections);
  if (sequentialSteps.length > 3) {
    analysis.suggestions.push({ type: SUGGESTION_TYPES.PERFORMANCE, priority: PRIORITY.MEDIUM, title: 'Parallelize steps', description: `${sequentialSteps.length} steps can run in parallel`, potential_improvement: 'Speed +60%' });
    analysis.score -= 5;
  }

  // Check for long-running steps
  const longSteps = nodes.filter(n => n.estimatedDuration > 5000);
  if (longSteps.length > 0) {
    analysis.suggestions.push({ type: SUGGESTION_TYPES.PERFORMANCE, priority: PRIORITY.LOW, title: 'Optimize long steps', description: `${longSteps.length} steps take >5s`, potential_improvement: 'Speed +20%' });
  }

  // Check for expensive API calls
  const apiSteps = nodes.filter(n => n.type === 'http' || n.type === 'api');
  if (apiSteps.length > 5) {
    analysis.suggestions.push({ type: SUGGESTION_TYPES.COST, priority: PRIORITY.MEDIUM, title: 'Reduce API calls', description: 'Batch or cache API responses', potential_improvement: 'Cost -30%' });
  }

  // Check for hardcoded values
  const hardcodedSteps = nodes.filter(n => n.config?.hardcoded);
  if (hardcodedSteps.length > 0) {
    analysis.suggestions.push({ type: SUGGESTION_TYPES.CONFIGURABILITY, priority: PRIORITY.LOW, title: 'Externalize configuration', description: 'Move hardcoded values to parameters', potential_improvement: 'Flexibility +50%' });
  }

  analysis.metrics = {
    nodeCount: nodes.length,
    connectionCount: connections.length,
    estimatedDuration: nodes.reduce((sum, n) => sum + (n.estimatedDuration || 100), 0),
    estimatedCost: nodes.reduce((sum, n) => sum + (n.estimatedCost || 0.001), 0),
  };

  return analysis;
}

function findSequentialSteps(nodes, connections) {
  // Simplified: find nodes with no incoming edges that could be parallel
  const incoming = new Set();
  for (const conn of connections) {
    incoming.add(conn.target);
  }
  return nodes.filter(n => !incoming.has(n.id) && n.type !== 'condition');
}

// Generate optimization suggestions
function generateSuggestions(workflowId, analysis) {
  const suggestions = [];

  for (const issue of analysis.issues || []) {
    switch (issue.type) {
      case 'complexity':
        suggestions.push({ id: crypto.randomUUID(), workflowId, type: SUGGESTION_TYPES.SIMPLICITY, priority: PRIORITY.MEDIUM, title: 'Break down workflow', description: issue.message, autoApplicable: false, estimatedImpact: '40%' });
        break;
      case 'error_handling':
        suggestions.push({ id: crypto.randomUUID(), workflowId, type: SUGGESTION_TYPES.RELIABILITY, priority: PRIORITY.HIGH, title: 'Add error handling', description: issue.message, autoApplicable: true, estimatedImpact: '50%' });
        break;
    }
  }

  for (const sug of analysis.suggestions || []) {
    suggestions.push({ id: crypto.randomUUID(), workflowId, ...sug, autoApplicable: sug.priority === PRIORITY.LOW });
  }

  return suggestions;
}

// Auto-heal workflow
function autoHeal(workflowId, error) {
  const heals = [];

  if (error.type === 'timeout') {
    heals.push({ action: 'add_timeout', description: 'Add timeout handling to the failing step', confidence: 0.9 });
    heals.push({ action: 'increase_retry', description: 'Add retry with exponential backoff', confidence: 0.85 });
  }

  if (error.type === 'api_error') {
    heals.push({ action: 'add_circuit_breaker', description: 'Implement circuit breaker pattern', confidence: 0.8 });
    heals.push({ action: 'add_fallback', description: 'Add fallback API endpoint', confidence: 0.75 });
  }

  if (error.type === 'validation_error') {
    heals.push({ action: 'add_validation', description: 'Add input validation step', confidence: 0.95 });
  }

  if (error.type === 'dependency_error') {
    heals.push({ action: 'add_dependency_check', description: 'Add dependency health check', confidence: 0.85 });
  }

  return { workflowId, error: error.message, heals, timestamp: Date.now() };
}

// Learn from execution
function learnFromExecution(execution) {
  const patternId = `${execution.workflowId}_${execution.status}`;

  if (!patterns.has(patternId)) {
    patterns.set(patternId, {
      id: patternId,
      workflowId: execution.workflowId,
      status: execution.status,
      occurrences: 0,
      avgDuration: 0,
      conditions: [],
    });
  }

  const pattern = patterns.get(patternId);
  pattern.occurrences++;
  pattern.avgDuration = (pattern.avgDuration * (pattern.occurrences - 1) + execution.duration) / pattern.occurrences;

  if (execution.success && execution.duration < 1000) {
    pattern.conditions.push({ type: 'fast_success', duration: execution.duration });
  }

  return pattern;
}

// Optimize for performance
function optimizeForPerformance(workflowDefinition) {
  const optimized = JSON.parse(JSON.stringify(workflowDefinition));
  const changes = [];

  // Identify parallelization opportunities
  const parallelizable = optimized.nodes?.filter(n =>
    !n.dependencies?.length && n.type === 'task'
  );

  if (parallelizable?.length > 1) {
    changes.push({ type: 'parallelization', description: `Can parallelize ${parallelizable.length} steps`, impact: '60% faster' });
  }

  // Add caching where appropriate
  const cacheableTypes = ['api', 'http', 'database'];
  const cacheable = optimized.nodes?.filter(n => cacheableTypes.includes(n.type));

  if (cacheable?.length > 0) {
    changes.push({ type: 'caching', description: `Add cache to ${cacheable.length} steps`, impact: '40% faster' });
  }

  // Suggest timeout configuration
  const missingTimeouts = optimized.nodes?.filter(n => n.type === 'http' && !n.timeout);
  if (missingTimeouts?.length > 0) {
    changes.push({ type: 'timeouts', description: 'Add timeouts to prevent hanging', impact: 'Reliability +30%' });
  }

  return { optimized, changes };
}

// Optimize for cost
function optimizeForCost(workflowDefinition) {
  const changes = [];

  // Identify expensive API calls
  const apiCalls = workflowDefinition.nodes?.filter(n => n.type === 'api') || [];
  if (apiCalls.length > 5) {
    changes.push({ type: 'batch_apis', description: 'Batch multiple API calls into single request', impact: '50% cost reduction' });
  }

  // Identify unnecessary storage
  const storageOps = workflowDefinition.nodes?.filter(n => n.type === 'storage') || [];
  if (storageOps.length > 3) {
    changes.push({ type: 'reduce_storage', description: 'Cache instead of repeated writes', impact: '30% cost reduction' });
  }

  return { changes, estimatedSavings: changes.length * 0.1 };
}

// Get learned patterns
function getPatterns(workflowId) {
  const result = [];
  for (const pattern of patterns.values()) {
    if (!workflowId || pattern.workflowId === workflowId) {
      result.push(pattern);
    }
  }
  return result;
}

// Get suggestions for workflow
function getSuggestions(workflowId) {
  return Array.from(suggestions.values()).filter(s => s.workflowId === workflowId);
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'ai-optimizer', port: PORT });
});

app.post('/api/analyze/workflow', requireInternal, (req, res) => {
  try {
    const { workflowId, definition } = req.body;
    const analysis = analyzeWorkflow(workflowId, definition);
    const sugs = generateSuggestions(workflowId, analysis);
    suggestions.set(workflowId, sugs);
    res.json({ analysis, suggestions: sugs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/heal/workflow', requireInternal, (req, res) => {
  try {
    const { workflowId, error } = req.body;
    const heal = autoHeal(workflowId, error);
    res.json(heal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/optimize/workflow', requireInternal, (req, res) => {
  try {
    const { workflowId, definition, goal } = req.body;
    let result;

    if (goal === 'performance') {
      result = optimizeForPerformance(definition);
    } else if (goal === 'cost') {
      result = optimizeForCost(definition);
    } else {
      result = { ...optimizeForPerformance(definition), ...optimizeForCost(definition) };
    }

    res.json({ workflowId, goal, ...result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patterns/learn', requireInternal, (req, res) => {
  try {
    const pattern = learnFromExecution(req.body);
    res.json(pattern);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patterns', (req, res) => {
  try {
    const patternsList = getPatterns(req.query.workflowId);
    res.json(patternsList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/suggestions/:workflowId', (req, res) => {
  try {
    const sugs = getSuggestions(req.params.workflowId);
    res.json(sugs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`AI Optimizer Service running on port ${PORT}`);
});

export { app, analyzeWorkflow, autoHeal, optimizeForPerformance, optimizeForCost, learnFromExecution, getPatterns };