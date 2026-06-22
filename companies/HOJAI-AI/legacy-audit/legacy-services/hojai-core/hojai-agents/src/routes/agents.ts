/**
 * Agent Routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Agent, AgentExecution, agentStore, executionStore, executeAgent } from '../index.js';

const router = Router();

// ============================================
// HELPERS
// ============================================

function createResponse<T>(data: T, tenantId?: string) {
  return {
    success: true,
    data,
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}`, tenantId }
  };
}

function createErrorResponse(code: string, message: string) {
  return {
    success: false,
    error: { code, message },
    meta: { timestamp: new Date().toISOString(), requestId: `req_${Date.now()}` }
  };
}

/**
 * POST /agents
 * Create a new agent
 */
router.post('/', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { name, type, description, capabilities, skills, config } = req.body;

  if (!name || !type) {
    return res.status(400).json(createErrorResponse('INVALID_REQUEST', 'name and type are required'));
  }

  const agent: Agent = {
    id: uuidv4(),
    tenantId: ctx.tenant_id,
    name,
    type,
    description,
    capabilities: capabilities || [],
    config: config || {},
    status: 'active',
    skills: skills || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const agents = agentStore.get(ctx.tenant_id) || [];
  agents.push(agent);
  agentStore.set(ctx.tenant_id, agents);

  res.status(201).json(createResponse({ agent }, ctx.tenant_id));
});

/**
 * GET /agents
 * List agents
 */
router.get('/', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { type, status, limit = 50 } = req.query;

  let agents = agentStore.get(ctx.tenant_id) || [];

  if (type) {
    agents = agents.filter(a => a.type === type);
  }

  if (status) {
    agents = agents.filter(a => a.status === status);
  }

  agents.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(createResponse({
    agents: agents.slice(0, Number(limit)),
    total: agents.length
  }, ctx.tenant_id));
});

/**
 * GET /agents/:id
 * Get agent by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const agents = agentStore.get(ctx.tenant_id) || [];
  const agent = agents.find(a => a.id === id);

  if (!agent) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Agent ${id} not found`));
  }

  res.json(createResponse({ agent }, ctx.tenant_id));
});

/**
 * PUT /agents/:id
 * Update agent
 */
router.put('/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;
  const { name, description, capabilities, skills, config, status } = req.body;

  const agents = agentStore.get(ctx.tenant_id) || [];
  const agent = agents.find(a => a.id === id);

  if (!agent) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Agent ${id} not found`));
  }

  if (name !== undefined) agent.name = name;
  if (description !== undefined) agent.description = description;
  if (capabilities) agent.capabilities = capabilities;
  if (skills) agent.skills = skills;
  if (config) agent.config = { ...agent.config, ...config };
  if (status) agent.status = status;
  agent.updatedAt = new Date().toISOString();

  res.json(createResponse({ agent }, ctx.tenant_id));
});

/**
 * DELETE /agents/:id
 * Delete agent
 */
router.delete('/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const agents = agentStore.get(ctx.tenant_id) || [];
  const index = agents.findIndex(a => a.id === id);

  if (index === -1) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Agent ${id} not found`));
  }

  agents.splice(index, 1);
  agentStore.set(ctx.tenant_id, agents);

  res.json(createResponse({ deleted: true }));
});

/**
 * POST /agents/:id/execute
 * Execute an agent
 */
router.post('/:id/execute', async (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;
  const { input } = req.body;

  const agents = agentStore.get(ctx.tenant_id) || [];
  const agent = agents.find(a => a.id === id);

  if (!agent) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Agent ${id} not found`));
  }

  if (agent.status !== 'active') {
    return res.status(400).json(createErrorResponse('INVALID_STATE', 'Agent is not active'));
  }

  const execution: AgentExecution = {
    id: uuidv4(),
    agentId: id,
    tenantId: ctx.tenant_id,
    userId: ctx.user_id,
    input: input || {},
    status: 'running',
    startedAt: new Date().toISOString()
  };

  const executions = executionStore.get(ctx.tenant_id) || [];
  executions.push(execution);
  executionStore.set(ctx.tenant_id, executions);

  // Execute agent asynchronously
  executeAgent(agent, input || {}).then(output => {
    execution.output = output;
    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.duration = new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime();
  }).catch(error => {
    execution.error = error.message;
    execution.status = 'failed';
    execution.completedAt = new Date().toISOString();
    execution.duration = new Date(execution.completedAt).getTime() - new Date(execution.startedAt).getTime();
  });

  res.status(201).json(createResponse({ execution }, ctx.tenant_id));
});

/**
 * POST /agents/:id/clone
 * Clone an agent from template
 */
router.post('/:id/clone', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;
  const { name } = req.body;

  const agents = agentStore.get(ctx.tenant_id) || [];
  const sourceAgent = agents.find(a => a.id === id);

  if (!sourceAgent) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Agent ${id} not found`));
  }

  const clonedAgent: Agent = {
    ...sourceAgent,
    id: uuidv4(),
    tenantId: ctx.tenant_id,
    name: name || `${sourceAgent.name} (Copy)`,
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  agents.push(clonedAgent);
  agentStore.set(ctx.tenant_id, agents);

  res.status(201).json(createResponse({ agent: clonedAgent }, ctx.tenant_id));
});

/**
 * GET /agents/:id/executions
 * Get agent execution history
 */
router.get('/:id/executions', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;
  const { limit = 20 } = req.query;

  const executions = executionStore.get(ctx.tenant_id) || [];
  const agentExecutions = executions
    .filter(e => e.agentId === id)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, Number(limit));

  res.json(createResponse({
    executions: agentExecutions,
    total: agentExecutions.length
  }, ctx.tenant_id));
});

/**
 * GET /agents/types
 * Get available agent types
 */
router.get('/meta/types', (req: Request, res: Response) => {
  const types = [
    { type: 'support', name: 'Support Agent', description: 'Customer support and ticket handling' },
    { type: 'sales', name: 'Sales Agent', description: 'Sales assistance and recommendations' },
    { type: 'orchestrator', name: 'Orchestrator', description: 'Coordinates multiple agents' },
    { type: 'data', name: 'Data Agent', description: 'Data analysis and insights' },
    { type: 'communication', name: 'Communication Agent', description: 'Multi-channel messaging' },
    { type: 'workflow', name: 'Workflow Agent', description: 'Workflow automation' },
    { type: 'custom', name: 'Custom Agent', description: 'Custom agent configuration' }
  ];

  res.json(createResponse({ types }));
});

export { router as agentRoutes };
