/**
 * Execution Routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AgentExecution, executionStore, agentStore } from '../index.js';

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
 * GET /executions
 * List executions
 */
router.get('/', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { agentId, status, limit = 50 } = req.query;

  let executions = executionStore.get(ctx.tenant_id) || [];

  if (agentId) {
    executions = executions.filter(e => e.agentId === agentId);
  }

  if (status) {
    executions = executions.filter(e => e.status === status);
  }

  executions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  res.json(createResponse({
    executions: executions.slice(0, Number(limit)),
    total: executions.length
  }, ctx.tenant_id));
});

/**
 * GET /executions/:id
 * Get execution by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const executions = executionStore.get(ctx.tenant_id) || [];
  const execution = executions.find(e => e.id === id);

  if (!execution) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Execution ${id} not found`));
  }

  res.json(createResponse({ execution }, ctx.tenant_id));
});

/**
 * POST /executions/:id/cancel
 * Cancel execution
 */
router.post('/:id/cancel', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const executions = executionStore.get(ctx.tenant_id) || [];
  const execution = executions.find(e => e.id === id);

  if (!execution) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Execution ${id} not found`));
  }

  if (execution.status !== 'pending' && execution.status !== 'running') {
    return res.status(400).json(createErrorResponse('INVALID_STATE', 'Cannot cancel completed execution'));
  }

  execution.status = 'cancelled';
  execution.completedAt = new Date().toISOString();

  res.json(createResponse({ execution }, ctx.tenant_id));
});

/**
 * POST /executions/:id/retry
 * Retry failed execution
 */
router.post('/:id/retry', async (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { id } = req.params;

  const executions = executionStore.get(ctx.tenant_id) || [];
  const originalExecution = executions.find(e => e.id === id);

  if (!originalExecution) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', `Execution ${id} not found`));
  }

  if (originalExecution.status !== 'failed') {
    return res.status(400).json(createErrorResponse('INVALID_STATE', 'Can only retry failed executions'));
  }

  const agents = agentStore.get(ctx.tenant_id) || [];
  const agent = agents.find(a => a.id === originalExecution.agentId);

  if (!agent) {
    return res.status(404).json(createErrorResponse('NOT_FOUND', 'Agent not found'));
  }

  const execution: AgentExecution = {
    id: uuidv4(),
    agentId: originalExecution.agentId,
    tenantId: ctx.tenant_id,
    userId: ctx.user_id,
    input: originalExecution.input,
    status: 'running',
    startedAt: new Date().toISOString()
  };

  executions.push(execution);
  executionStore.set(ctx.tenant_id, executions);

  res.status(201).json(createResponse({ execution, originalExecution }, ctx.tenant_id));
});

/**
 * GET /executions/stats
 * Get execution statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;
  const { period = '24h' } = req.query;

  const executions = executionStore.get(ctx.tenant_id) || [];

  // Calculate stats
  const stats = {
    total: executions.length,
    pending: executions.filter(e => e.status === 'pending').length,
    running: executions.filter(e => e.status === 'running').length,
    completed: executions.filter(e => e.status === 'completed').length,
    failed: executions.filter(e => e.status === 'failed').length,
    cancelled: executions.filter(e => e.status === 'cancelled').length
  };

  // Success rate
  const completedOrFailed = stats.completed + stats.failed;
  stats.successRate = completedOrFailed > 0
    ? ((stats.completed / completedOrFailed) * 100).toFixed(2) + '%'
    : '0%';

  // Average duration
  const completedWithDuration = executions.filter(e => e.duration);
  stats.avgDurationMs = completedWithDuration.length > 0
    ? Math.round(completedWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / completedWithDuration.length)
    : 0;

  res.json(createResponse({ stats, period }, ctx.tenant_id));
});

/**
 * GET /executions/by-agent
 * Get executions grouped by agent
 */
router.get('/stats/by-agent', (req: Request, res: Response) => {
  const ctx = req.tenantContext!;

  const executions = executionStore.get(ctx.tenant_id) || [];
  const agents = agentStore.get(ctx.tenant_id) || [];

  const byAgent: Record<string, {
    agentId: string;
    agentName: string;
    total: number;
    completed: number;
    failed: number;
    avgDuration: number;
  }> = {};

  for (const agent of agents) {
    const agentExecutions = executions.filter(e => e.agentId === agent.id);
    const completed = agentExecutions.filter(e => e.status === 'completed');
    const completedWithDuration = completed.filter(e => e.duration);

    byAgent[agent.id] = {
      agentId: agent.id,
      agentName: agent.name,
      total: agentExecutions.length,
      completed: completed.length,
      failed: agentExecutions.filter(e => e.status === 'failed').length,
      avgDuration: completedWithDuration.length > 0
        ? Math.round(completedWithDuration.reduce((sum, e) => sum + (e.duration || 0), 0) / completedWithDuration.length)
        : 0
    };
  }

  res.json(createResponse({ byAgent }, ctx.tenant_id));
});

export { router as executionRoutes };
