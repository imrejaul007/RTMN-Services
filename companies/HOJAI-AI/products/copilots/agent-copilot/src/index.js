const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require("uuid");
const rezIntel = require("./rez-intel-client");

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


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = 4920;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage
const agents = new PersistentMap('agents', { serviceName: 'agent-copilot' });
const tasks = new PersistentMap('tasks', { serviceName: 'agent-copilot' });
const workflows = new PersistentMap('workflows', { serviceName: 'agent-copilot' });
const executions = new PersistentMap('executions', { serviceName: 'agent-copilot' });
const skills = new PersistentMap('skills', { serviceName: 'agent-copilot' });
const metrics = new PersistentMap('metrics', { serviceName: 'agent-copilot' });

// Initialize with sample AI agents
const sampleAgents = [
  {
    id: 'agent-1',
    name: 'Sales Lead Scorer',
    type: 'ai_agent',
    category: 'sales',
    description: 'Scores and prioritizes sales leads based on engagement, fit, and intent signals',
    capabilities: ['lead_scoring', 'prioritization', 'intent_detection'],
    status: 'active',
    performance: { tasksCompleted: 156, avgResponseTime: '1.2s', accuracy: 94.5 },
    costPerTask: 0.05,
    createdAt: new Date('2025-01-15').toISOString()
  },
  {
    id: 'agent-2',
    name: 'Content Generator',
    type: 'ai_agent',
    category: 'marketing',
    description: 'Generates marketing content including emails, social posts, and ad copy',
    capabilities: ['content_generation', 'copywriting', 'localization'],
    status: 'active',
    performance: { tasksCompleted: 423, avgResponseTime: '2.8s', accuracy: 91.2 },
    costPerTask: 0.08,
    createdAt: new Date('2025-02-01').toISOString()
  },
  {
    id: 'agent-3',
    name: 'Customer Support Bot',
    type: 'ai_agent',
    category: 'support',
    description: 'Handles customer inquiries with natural language understanding',
    capabilities: ['nlu', 'faq_answering', 'ticket_creation', 'escalation'],
    status: 'active',
    performance: { tasksCompleted: 2891, avgResponseTime: '0.8s', accuracy: 89.7 },
    costPerTask: 0.03,
    createdAt: new Date('2025-01-01').toISOString()
  },
  {
    id: 'agent-4',
    name: 'Finance Analyzer',
    type: 'ai_agent',
    category: 'finance',
    description: 'Analyzes financial data, detects anomalies, and provides insights',
    capabilities: ['financial_analysis', 'anomaly_detection', 'reporting'],
    status: 'active',
    performance: { tasksCompleted: 234, avgResponseTime: '3.5s', accuracy: 97.1 },
    costPerTask: 0.12,
    createdAt: new Date('2025-03-01').toISOString()
  },
  {
    id: 'agent-5',
    name: 'HR Recruiter',
    type: 'ai_agent',
    category: 'hr',
    description: 'Screens resumes, schedules interviews, and coordinates recruitment',
    capabilities: ['resume_screening', 'interview_scheduling', 'candidate_matching'],
    status: 'active',
    performance: { tasksCompleted: 178, avgResponseTime: '1.5s', accuracy: 88.3 },
    costPerTask: 0.06,
    createdAt: new Date('2025-02-15').toISOString()
  },
  {
    id: 'agent-6',
    name: 'Operations Optimizer',
    type: 'ai_agent',
    category: 'operations',
    description: 'Optimizes operational workflows and resource allocation',
    capabilities: ['workflow_optimization', 'resource_planning', 'efficiency_analysis'],
    status: 'active',
    performance: { tasksCompleted: 89, avgResponseTime: '4.2s', accuracy: 93.8 },
    costPerTask: 0.15,
    createdAt: new Date('2025-04-01').toISOString()
  }
];

sampleAgents.forEach(a => agents.set(a.id, a));

// Initialize with sample skills
const sampleSkills = [
  { id: 'skill-1', name: 'Natural Language Processing', category: 'ai', version: '2.0', agents: ['agent-3'], status: 'active' },
  { id: 'skill-2', name: 'Lead Qualification', category: 'sales', version: '1.5', agents: ['agent-1'], status: 'active' },
  { id: 'skill-3', name: 'Content Writing', category: 'marketing', version: '1.2', agents: ['agent-2'], status: 'active' },
  { id: 'skill-4', name: 'Financial Modeling', category: 'finance', version: '3.1', agents: ['agent-4'], status: 'active' },
  { id: 'skill-5', name: 'Resume Parsing', category: 'hr', version: '1.0', agents: ['agent-5'], status: 'active' }
];

sampleSkills.forEach(s => skills.set(s.id, s));

// ==================== AGENTS API ====================

// Get all agents
app.get('/api/agents', (req, res) => {
  const { category, status, type, search } = req.query;

  let result = Array.from(agents.values());

  if (category) result = result.filter(a => a.category === category);
  if (status) result = result.filter(a => a.status === status);
  if (type) result = result.filter(a => a.type === type);
  if (search) {
    const searchLower = search.toLowerCase();
    result = result.filter(a =>
      a.name.toLowerCase().includes(searchLower) ||
      a.description.toLowerCase().includes(searchLower)
    );
  }

  res.json({ agents: result, total: result.length });
});

// Get single agent
app.get('/api/agents/:id', (req, res) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json(agent);
});

// Create agent
app.post('/api/agents',requireAuth,  (req, res) => {
  const { name, type, category, description, capabilities } = req.body;

  if (!name || !type || !category) {
    return res.status(400).json({ error: 'Name, type, and category are required' });
  }

  const agent = {
    id: `agent-${uuidv4().slice(0, 8)}`,
    name,
    type,
    category,
    description: description || '',
    capabilities: capabilities || [],
    status: 'inactive',
    performance: { tasksCompleted: 0, avgResponseTime: '0s', accuracy: 0 },
    costPerTask: 0,
    createdAt: new Date().toISOString()
  };

  agents.set(agent.id, agent);

  res.status(201).json(agent);
});

// Update agent
app.put('/api/agents/:id',requireAuth,  (req, res) => {
  const agent = agents.get(req.params.id);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const { name, description, capabilities, status } = req.body;

  if (name) agent.name = name;
  if (description) agent.description = description;
  if (capabilities) agent.capabilities = capabilities;
  if (status) agent.status = status;

  res.json(agent);
});

// Delete agent
app.delete('/api/agents/:id',requireAuth,  (req, res) => {
  if (!agents.has(req.params.id)) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  agents.delete(req.params.id);

  res.json({ message: 'Agent deleted successfully' });
});

// ==================== TASK EXECUTION API ====================

// Execute task with agent
app.post('/api/execute',requireAuth,  (req, res) => {
  const { agentId, task, input, priority } = req.body;

  if (!agentId || !task) {
    return res.status(400).json({ error: 'Agent ID and task are required' });
  }

  const agent = agents.get(agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const execution = {
    id: `exec-${uuidv4().slice(0, 8)}`,
    agentId,
    agentName: agent.name,
    task,
    input: input || {},
    priority: priority || 'normal',
    status: 'running',
    result: null,
    error: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    duration: null
  };

  executions.set(execution.id, execution);

  // Simulate task execution
  const duration = Math.random() * 3000 + 500; // 0.5-3.5 seconds
  setTimeout(() => {
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.duration = duration;

    // Generate simulated result based on task type
    execution.result = generateTaskResult(agent, task, input);

    // Update agent metrics
    agent.performance.tasksCompleted++;
  }, duration);

  res.status(201).json(execution);
});

// Get execution status
app.get('/api/execute/:id', (req, res) => {
  const execution = executions.get(req.params.id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  res.json(execution);
});

// Get execution history
app.get('/api/executions', (req, res) => {
  const { agentId, status, limit = 50 } = req.query;

  let result = Array.from(executions.values());

  if (agentId) result = result.filter(e => e.agentId === agentId);
  if (status) result = result.filter(e => e.status === status);

  // Sort by startedAt (newest first)
  result.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  result = result.slice(0, Number(limit));

  res.json({ executions: result, total: result.length });
});

// Cancel execution
app.post('/api/execute/:id/cancel',requireAuth,  (req, res) => {
  const execution = executions.get(req.params.id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  if (execution.status === 'completed') {
    return res.status(400).json({ error: 'Cannot cancel completed execution' });
  }

  execution.status = 'cancelled';
  execution.completedAt = new Date().toISOString();

  res.json(execution);
});

// ==================== ORCHESTRATION API ====================

// Create workflow
app.post('/api/workflows',requireAuth,  (req, res) => {
  const { name, description, steps } = req.body;

  if (!name || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ error: 'Name and steps array are required' });
  }

  const workflow = {
    id: `wf-${uuidv4().slice(0, 8)}`,
    name,
    description: description || '',
    steps,
    status: 'active',
    executions: 0,
    avgDuration: 0,
    createdAt: new Date().toISOString()
  };

  workflows.set(workflow.id, workflow);

  res.status(201).json(workflow);
});

// Get all workflows
app.get('/api/workflows', (req, res) => {
  const result = Array.from(workflows.values());
  res.json({ workflows: result, total: result.length });
});

// Get workflow
app.get('/api/workflows/:id', (req, res) => {
  const workflow = workflows.get(req.params.id);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.json(workflow);
});

// Execute workflow
app.post('/api/workflows/:id/execute',requireAuth,  (req, res) => {
  const { input } = req.body;
  const workflow = workflows.get(req.params.id);

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  const execution = {
    id: `wfexec-${uuidv4().slice(0, 8)}`,
    workflowId: workflow.id,
    workflowName: workflow.name,
    input: input || {},
    status: 'running',
    stepResults: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    duration: null
  };

  executions.set(execution.id, execution);
  workflow.executions++;

  // Execute workflow steps sequentially
  let delay = 0;
  workflow.steps.forEach((step, index) => {
    delay += Math.random() * 1000 + 500;
    setTimeout(() => {
      step.completedAt = new Date().toISOString();
      execution.stepResults.push({
        stepIndex: index,
        stepName: step.name,
        agentId: step.agentId,
        status: 'completed',
        result: { message: `Step ${index + 1} completed` }
      });

      // Check if all steps completed
      if (execution.stepResults.length === workflow.steps.length) {
        execution.status = 'completed';
        execution.completedAt = new Date().toISOString();
        execution.duration = new Date(execution.completedAt) - new Date(execution.startedAt);
      }
    }, delay);
  });

  res.status(201).json(execution);
});

// ==================== SKILLS API ====================

// Get all skills
app.get('/api/skills', (req, res) => {
  const { category, status } = req.query;

  let result = Array.from(skills.values());

  if (category) result = result.filter(s => s.category === category);
  if (status) result = result.filter(s => s.status === status);

  res.json({ skills: result, total: result.length });
});

// Get skill
app.get('/api/skills/:id', (req, res) => {
  const skill = skills.get(req.params.id);

  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  res.json(skill);
});

// Create skill
app.post('/api/skills',requireAuth,  (req, res) => {
  const { name, category, version, agents } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required' });
  }

  const skill = {
    id: `skill-${uuidv4().slice(0, 8)}`,
    name,
    category,
    version: version || '1.0',
    agents: agents || [],
    status: 'active',
    createdAt: new Date().toISOString()
  };

  skills.set(skill.id, skill);

  res.status(201).json(skill);
});

// Update skill
app.put('/api/skills/:id',requireAuth,  (req, res) => {
  const skill = skills.get(req.params.id);

  if (!skill) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  const { name, version, agents, status } = req.body;

  if (name) skill.name = name;
  if (version) skill.version = version;
  if (agents) skill.agents = agents;
  if (status) skill.status = status;

  res.json(skill);
});

// Delete skill
app.delete('/api/skills/:id',requireAuth,  (req, res) => {
  if (!skills.has(req.params.id)) {
    return res.status(404).json({ error: 'Skill not found' });
  }

  skills.delete(req.params.id);

  res.json({ message: 'Skill deleted successfully' });
});

// ==================== METRICS API ====================

app.get('/api/metrics', (req, res) => {
  const allAgents = Array.from(agents.values());
  const allExecutions = Array.from(executions.values());

  const stats = {
    totalAgents: allAgents.length,
    activeAgents: allAgents.filter(a => a.status === 'active').length,
    totalExecutions: allExecutions.length,
    completedExecutions: allExecutions.filter(e => e.status === 'completed').length,
    failedExecutions: allExecutions.filter(e => e.status === 'failed').length,
    totalTasksCompleted: allAgents.reduce((sum, a) => sum + a.performance.tasksCompleted, 0),
    byCategory: {},
    topAgents: []
  };

  // Stats by category
  allAgents.forEach(agent => {
    stats.byCategory[agent.category] = stats.byCategory[agent.category] || { count: 0, tasks: 0 };
    stats.byCategory[agent.category].count++;
    stats.byCategory[agent.category].tasks += agent.performance.tasksCompleted;
  });

  // Top performing agents
  stats.topAgents = allAgents
    .filter(a => a.performance.tasksCompleted > 0)
    .sort((a, b) => b.performance.tasksCompleted - a.performance.tasksCompleted)
    .slice(0, 5)
    .map(a => ({
      id: a.id,
      name: a.name,
      tasksCompleted: a.performance.tasksCompleted,
      accuracy: a.performance.accuracy
    }));

  res.json(stats);
});

// ==================== HELPER FUNCTIONS ====================

function generateTaskResult(agent, task, input) {
  const taskType = task.toLowerCase();

  if (taskType.includes('score') || taskType.includes('lead')) {
    return {
      score: Math.round(Math.random() * 40 + 60),
      priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      reasoning: 'Based on engagement patterns and fit indicators'
    };
  }

  if (taskType.includes('content') || taskType.includes('generate')) {
    return {
      content: `Generated content for: ${input.subject || 'Custom Topic'}`,
      variants: 3,
      tone: 'professional'
    };
  }

  if (taskType.includes('support') || taskType.includes('help')) {
    return {
      response: 'I understand your concern. Let me help you with that.',
      suggestions: ['View KB Article', 'Create Ticket', 'Escalate']
    };
  }

  if (taskType.includes('analyze') || taskType.includes('financial')) {
    return {
      insights: ['Revenue up 15%', 'Cost optimization opportunity detected'],
      anomalies: 2,
      confidence: 0.92
    };
  }

  if (taskType.includes('screen') || taskType.includes('resume')) {
    return {
      score: Math.round(Math.random() * 30 + 70),
      matchedSkills: ['JavaScript', 'React', 'Node.js'],
      recommendation: 'Proceed to interview'
    };
  }

  return {
    message: 'Task completed successfully',
    confidence: 0.95
  };
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'agent-copilot',
    port: PORT,
    agents: agents.size,
    activeAgents: Array.from(agents.values()).filter(a => a.status === 'active').length,
    executions: executions.size
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = 
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// ============================================================
// REZ INTELLIGENCE — DEEP INTEGRATION (3 endpoints)
// ============================================================
//
// 1) POST /api/agent/classify-intent    — intent classification for a prompt
// 2) GET  /api/agent/next-best-action   — AI-recommended next step
// 3) GET  /api/agent/merchant-insights  — merchant intel (for merchant agents)
//
// Each endpoint gracefully degrades to null on failure.

// 1) Intent classification for an inbound prompt/message
app.post('/api/agent/classify-intent', requireAuth, async (req, res) => {
  const { message, agentId, context } = req.body;
  const intent = await rezIntel.classifyIntent({ message, agentId, context });
  res.json({
    success: true,
    intent,
    source: intent ? 'rez-intel' : 'unavailable',
    fallback: !intent
  });
});

// 2) Next-best-action for an agent orchestration
app.get('/api/agent/next-best-action', requireAuth, async (req, res) => {
  const { agentId, task, stage, context } = req.query;
  const action = await rezIntel.getNextBestAction({
    agentId,
    task,
    stage,
    context,
    copilot: 'agent'
  });
  res.json({
    success: true,
    action,
    source: action ? 'rez-intel' : 'unavailable',
    fallback: !action
  });
});

// 3) Merchant insights for merchant-oriented agents
app.get('/api/agent/merchant-insights', requireAuth, async (req, res) => {
  const { merchantId, industry, category } = req.query;
  const insights = await rezIntel.getMerchantInsights({ merchantId, industry, category });
  res.json({
    success: true,
    insights,
    source: insights ? 'rez-intel' : 'unavailable',
    fallback: !insights
  });
});

app.listen(PORT, () => {
  console.log('🤖 Agent Copilot Service running on port ' + PORT);
  console.log('   AI Agents: ' + agents.size);
  console.log('   Skills: ' + skills.size);
});
installGracefulShutdown(server);
