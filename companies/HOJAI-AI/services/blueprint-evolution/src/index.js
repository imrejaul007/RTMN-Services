/**
 * Blueprint Evolution Engine — Continuous self-improvement for AI-native companies
 *
 * This service runs scheduled improvements on company blueprints based on:
 * - Performance metrics (agent efficiency, task completion rates)
 * - Feedback signals (user ratings, support tickets)
 * - Market intelligence (competitor capabilities, industry trends)
 * - Best practices (new agent types, updated workflows)
 *
 * Evolution runs on a weekly schedule and generates recommended improvements
 * that companies can review and apply.
 */

import { deepEqual } from './diff.js';
// Note: For full diff integration, use @hojai/blueprint-diff-engine

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} EvolutionJob
 * @property {string} id - Unique job ID
 * @property {string} blueprintId - Target blueprint
 * @property {string} status - 'pending' | 'running' | 'done' | 'failed'
 * @property {Improvement[]} improvements - Generated improvements
 * @property {string} createdAt - ISO timestamp
 * @property {string} completedAt - ISO timestamp
 */

/**
 * @typedef {Object} Improvement
 * @property {string} id - Unique improvement ID
 * @property {string} type - 'agent' | 'workflow' | 'integration' | 'capability'
 * @property {string} priority - 'high' | 'medium' | 'low'
 * @property {string} title - Human-readable title
 * @property {string} description - Explanation
 * @property {Object} currentState - Current blueprint section
 * @property {Object} suggestedState - Suggested improvement
 * @property {number} confidence - 0-1 confidence score
 * @property {string[]} reasons - Why this improvement is recommended
 */

/**
 * @typedef {Object} EvolutionConfig
 * @property {string} schedule - Cron expression (default: '0 2 * * 1' - Monday 2am)
 * @property {boolean} autoApply - Auto-apply low-risk improvements
 * @property {number} minConfidence - Minimum confidence threshold
 */

// ---------------------------------------------------------------------------
// Evolution Engine
// ---------------------------------------------------------------------------

const jobs = new Map();
const IMPROVEMENT_TEMPLATES = loadImprovementTemplates();

/**
 * Run evolution analysis on a blueprint
 * @param {Object} blueprint
 * @param {Object} metrics - Performance metrics from the company
 * @param {EvolutionConfig} config
 * @returns {EvolutionJob}
 */
export function runEvolution(blueprint, metrics = {}, config = {}) {
  const jobId = 'evo_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  const job = {
    id: jobId,
    blueprintId: blueprint.config?.name || 'unknown',
    status: 'running',
    improvements: [],
    metrics,
    config: {
      schedule: config.schedule || '0 2 * * 1',
      autoApply: config.autoApply || false,
      minConfidence: config.minConfidence || 0.7,
    },
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  jobs.set(jobId, job);

  try {
    // Analyze and generate improvements
    job.improvements = analyzeBlueprint(blueprint, metrics, job.config);
    job.status = 'done';
    job.completedAt = new Date().toISOString();
  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
    job.completedAt = new Date().toISOString();
  }

  return job;
}

/**
 * Analyze blueprint and generate improvements
 */
function analyzeBlueprint(blueprint, metrics, config) {
  const improvements = [];

  // Agent improvements
  const agentImprovements = analyzeAgents(blueprint, metrics);
  improvements.push(...agentImprovements);

  // Workflow improvements
  const workflowImprovements = analyzeWorkflows(blueprint, metrics);
  improvements.push(...workflowImprovements);

  // Integration improvements
  const integrationImprovements = analyzeIntegrations(blueprint, metrics);
  improvements.push(...integrationImprovements);

  // Capability recommendations
  const capabilityImprovements = analyzeCapabilities(blueprint, metrics);
  improvements.push(...capabilityImprovements);

  // Filter by confidence
  return improvements.filter(i => i.confidence >= config.minConfidence);
}

/**
 * Analyze agents and suggest improvements
 */
function analyzeAgents(blueprint, metrics) {
  const improvements = [];
  const agents = blueprint.agents || [];
  const agentMetrics = metrics.agents || {};

  for (const agent of agents) {
    const metric = agentMetrics[agent.name] || {};

    // Check if agent is underperforming
    if (metric.efficiency && metric.efficiency < 0.7) {
      improvements.push({
        id: generateId(),
        type: 'agent',
        priority: 'high',
        title: `Improve ${agent.name} efficiency`,
        description: `Agent ${agent.name} has ${metric.efficiency * 100}% efficiency. Consider adding capabilities.`,
        currentState: { capabilities: agent.capabilities },
        suggestedState: { capabilities: [...(agent.capabilities || []), suggestCapability(agent.role)] },
        confidence: 0.85,
        reasons: [
          `Current efficiency: ${(metric.efficiency * 100).toFixed(0)}%`,
          `Role: ${agent.role}`,
          'Adding capabilities can improve task completion'
        ]
      });
    }

    // Suggest role-specific improvements
    const roleImprovement = suggestRoleImprovements(agent);
    if (roleImprovement) {
      improvements.push(roleImprovement);
    }
  }

  // Suggest missing agent roles
  const missingRoles = findMissingRoles(agents);
  for (const role of missingRoles) {
    improvements.push({
      id: generateId(),
      type: 'agent',
      priority: 'medium',
      title: `Add ${role} agent`,
      description: `Your company type (${blueprint.config?.type}) would benefit from a ${role} agent.`,
      currentState: { agents: agents.map(a => a.name) },
      suggestedState: { agents: [...agents.map(a => a.name), role] },
      confidence: 0.75,
      reasons: [
        'Industry best practice',
        'Complementary to existing agents',
        'Improves coverage'
      ]
    });
  }

  return improvements;
}

/**
 * Analyze workflows and suggest improvements
 */
function analyzeWorkflows(blueprint, metrics) {
  const improvements = [];
  const workflows = blueprint.workflows || [];
  const workflowMetrics = metrics.workflows || {};

  for (const [workflowName, workflowData] of Object.entries(workflowMetrics)) {
    if (workflowData.bottleneck) {
      improvements.push({
        id: generateId(),
        type: 'workflow',
        priority: 'high',
        title: `Optimize ${workflowName} workflow`,
        description: `Detected bottleneck in ${workflowName} workflow.`,
        currentState: workflowData,
        suggestedState: { ...workflowData, optimized: true },
        confidence: 0.9,
        reasons: [
          'Performance bottleneck detected',
          'Optimization can reduce latency',
          'Improves user experience'
        ]
      });
    }
  }

  // Suggest missing essential workflows
  const type = blueprint.config?.type || 'default';
  const essentialWorkflows = getEssentialWorkflows(type);
  for (const wf of essentialWorkflows) {
    if (!workflows.find(w => w.name === wf.name)) {
      improvements.push({
        id: generateId(),
        type: 'workflow',
        priority: 'medium',
        title: `Add ${wf.name} workflow`,
        description: wf.description,
        currentState: { workflows: workflows.map(w => w.name) },
        suggestedState: { workflows: [...workflows.map(w => w.name), wf.name] },
        confidence: 0.8,
        reasons: ['Essential for ' + type, 'Best practice']
      });
    }
  }

  return improvements;
}

/**
 * Analyze integrations and suggest improvements
 */
function analyzeIntegrations(blueprint, metrics) {
  const improvements = [];
  const integrations = blueprint.integrations || [];
  const type = blueprint.config?.type || 'default';

  const recommended = getRecommendedIntegrations(type);
  const currentNames = integrations.map(i => i.name || i);

  for (const rec of recommended) {
    if (!currentNames.includes(rec.name)) {
      improvements.push({
        id: generateId(),
        type: 'integration',
        priority: rec.priority,
        title: `Add ${rec.name} integration`,
        description: rec.description,
        currentState: { integrations: currentNames },
        suggestedState: { integrations: [...currentNames, rec.name] },
        confidence: rec.confidence,
        reasons: rec.reasons
      });
    }
  }

  return improvements;
}

/**
 * Analyze capabilities and suggest additions
 */
function analyzeCapabilities(blueprint, metrics) {
  const improvements = [];
  const type = blueprint.config?.type || 'default';

  const recommendedCapabilities = getRecommendedCapabilities(type);
  const allCurrentCapabilities = (blueprint.agents || [])
    .flatMap(a => a.capabilities || []);

  for (const cap of recommendedCapabilities) {
    if (!allCurrentCapabilities.includes(cap.name)) {
      improvements.push({
        id: generateId(),
        type: 'capability',
        priority: cap.priority,
        title: `Add ${cap.name} capability`,
        description: cap.description,
        currentState: { capabilities: allCurrentCapabilities },
        suggestedState: { capabilities: [...allCurrentCapabilities, cap.name] },
        confidence: cap.confidence,
        reasons: cap.reasons
      });
    }
  }

  return improvements;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function suggestCapability(role) {
  const capabilityMap = {
    sales: 'predictive-analytics',
    support: 'sentiment-analysis',
    marketing: 'content-generation',
    operations: 'process-automation',
    finance: 'fraud-detection',
    hr: 'candidate-screening'
  };
  return capabilityMap[role] || 'decision-support';
}

function suggestRoleImprovements(agent) {
  const suggestions = {
    sales: {
      title: 'Enhance Sales agent with negotiation skills',
      capabilities: ['contract-review', 'pricing-optimization'],
      confidence: 0.85
    },
    support: {
      title: 'Enhance Support agent with proactive capabilities',
      capabilities: ['sentiment-analysis', 'ticket-routing'],
      confidence: 0.8
    }
  };

  const suggestion = suggestions[agent.role];
  if (!suggestion) return null;

  const missingCaps = suggestion.capabilities.filter(
    c => !(agent.capabilities || []).includes(c)
  );

  if (missingCaps.length === 0) return null;

  return {
    id: generateId(),
    type: 'agent',
    priority: 'medium',
    title: suggestion.title,
    description: `Add ${missingCaps.join(', ')} to ${agent.name}`,
    currentState: { capabilities: agent.capabilities },
    suggestedState: { capabilities: [...(agent.capabilities || []), ...missingCaps] },
    confidence: suggestion.confidence,
    reasons: ['Role enhancement', 'Best practice for ' + agent.role]
  };
}

function findMissingRoles(agents, type) {
  const essentialRoles = {
    b2b: ['Sales', 'Procurement'],
    saas: ['Sales', 'Support', 'Engineering'],
    marketplace: ['Sales', 'Operations', 'Compliance'],
    default: ['Sales', 'Support']
  };

  const required = essentialRoles[type] || essentialRoles.default;
  const currentRoles = new Set(agents.map(a => a.role));

  return required.filter(r => !currentRoles.has(r.toLowerCase()));
}

function getEssentialWorkflows(type) {
  const workflows = {
    b2b: [
      { name: 'Lead Qualification', description: 'Automated lead scoring and routing' },
      { name: 'Contract Review', description: 'AI-powered contract analysis' }
    ],
    saas: [
      { name: 'User Onboarding', description: 'Guided onboarding flow' },
      { name: 'Churn Prevention', description: 'Proactive retention workflow' }
    ],
    marketplace: [
      { name: 'KYB Verification', description: 'Know Your Business compliance' },
      { name: 'Dispute Resolution', description: 'Automated dispute handling' }
    ]
  };

  return workflows[type] || [];
}

function getRecommendedIntegrations(type) {
  const integrations = {
    b2b: [
      { name: 'payment-gateway', priority: 'high', confidence: 0.95, description: 'Enable online payments', reasons: ['Essential for transactions'] },
      { name: 'crm', priority: 'high', confidence: 0.9, description: 'Customer relationship management', reasons: ['Sales optimization'] },
      { name: 'analytics', priority: 'medium', confidence: 0.8, description: 'Business intelligence', reasons: ['Data-driven decisions'] }
    ],
    saas: [
      { name: 'analytics', priority: 'high', confidence: 0.95, description: 'Product analytics', reasons: ['User behavior insights'] },
      { name: 'billing', priority: 'high', confidence: 0.9, description: 'Subscription billing', reasons: ['Revenue management'] },
      { name: 'support-desk', priority: 'medium', confidence: 0.85, description: 'Customer support', reasons: ['User retention'] }
    ]
  };

  return integrations[type] || [];
}

function getRecommendedCapabilities(type) {
  const capabilities = {
    b2b: [
      { name: 'rfq-automation', priority: 'high', confidence: 0.9, description: 'Automated request for quotes', reasons: ['B2B essential'] },
      { name: 'contract-analysis', priority: 'medium', confidence: 0.85, description: 'AI contract review', reasons: ['Risk reduction'] }
    ],
    saas: [
      { name: 'usage-analytics', priority: 'high', confidence: 0.95, description: 'Track feature usage', reasons: ['Product improvement'] },
      { name: 'churn-prediction', priority: 'high', confidence: 0.9, description: 'Predict customer churn', reasons: ['Retention'] }
    ]
  };

  return capabilities[type] || [];
}

function loadImprovementTemplates() {
  return {
    agent: [
      { pattern: 'low-efficiency', template: 'Add capabilities to improve efficiency' },
      { pattern: 'missing-skills', template: 'Enhance with missing skills' }
    ],
    workflow: [
      { pattern: 'bottleneck', template: 'Optimize workflow performance' },
      { pattern: 'missing-step', template: 'Add missing workflow step' }
    ]
  };
}

function generateId() {
  return 'imp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

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

const PORT = parseInt(process.env.PORT || '4148', 10);

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/health', (_req, res) => {
  res.json({
    service: 'blueprint-evolution',
    version: '1.0.0',
    port: PORT,
    status: 'ok'
  });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// Info
app.get('/api/v1/info', (_req, res) => {
  res.json({
    service: 'blueprint-evolution',
    version: '1.0.0',
    description: 'Continuous self-improvement for AI-native companies',
    endpoints: [
      'POST /api/v1/evolve - Run evolution analysis',
      'GET /api/v1/jobs/:id - Get evolution job',
      'GET /api/v1/jobs - List all jobs',
      'POST /api/v1/apply - Apply improvements'
    ]
  });
});

// Run evolution
app.post('/api/v1/evolve', requireInternal, (req, res) => {
  try {
    const { blueprint, metrics, config } = req.body;

    if (!blueprint) {
      return res.status(400).json({
        error: 'validation',
        details: ['blueprint is required']
      });
    }

    const job = runEvolution(blueprint, metrics || {}, config || {});
    res.json(job);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get job
app.get('/api/v1/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json(job);
});

// List jobs
app.get('/api/v1/jobs', (_req, res) => {
  const allJobs = Array.from(jobs.values());
  res.json({
    count: allJobs.length,
    jobs: allJobs
  });
});

// Stats
app.get('/api/v1/stats', (_req, res) => {
  res.json({
    service: 'blueprint-evolution',
    version: '1.0.0',
    capabilities: [
      'Agent performance analysis',
      'Workflow optimization',
      'Integration recommendations',
      'Capability gap analysis',
      'Weekly scheduled improvements'
    ]
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`blueprint-evolution listening on :${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

export { app };
