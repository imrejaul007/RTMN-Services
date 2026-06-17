/**
 * REZ SalesMind - SUTAR OS Routes
 * REST API endpoints for SUTAR OS integration
 */

import { Router, Request, Response } from 'express';
import { sutarOS } from '../services/sutarOSIntegration.js';

const router = Router();

// ==================== Goals ====================

/**
 * GET /api/sutar/goals
 * Get all goals or filter by status
 */
router.get('/goals', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as any;
    const goals = await sutarOS.getGoals(status);
    res.json({ success: true, data: goals });
  } catch (error: any) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: error.message || 'Failed to get goals' });
  }
});

/**
 * GET /api/sutar/goals/:id
 * Get a specific goal
 */
router.get('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await sutarOS.getGoal(id);

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.json({ success: true, data: goal });
  } catch (error: any) {
    console.error('Get goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to get goal' });
  }
});

/**
 * POST /api/sutar/goals
 * Create a new goal
 */
router.post('/goals', async (req: Request, res: Response) => {
  try {
    const goalData = req.body;

    if (!goalData.name) {
      return res.status(400).json({ error: 'Goal name is required' });
    }

    const goal = await sutarOS.createGoal(goalData);
    res.json({ success: true, data: goal });
  } catch (error: any) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to create goal' });
  }
});

/**
 * PUT /api/sutar/goals/:id
 * Update a goal
 */
router.put('/goals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentValue, status, name, description, targetValue } = req.body;

    const existing = await sutarOS.getGoal(id);
    if (!existing) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    // Update current value if provided
    if (currentValue !== undefined) {
      const updated = await sutarOS.updateGoal(id, currentValue);
      return res.json({ success: true, data: updated });
    }

    // For other updates, we'd need more methods in the service
    res.json({ success: true, data: existing });
  } catch (error: any) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to update goal' });
  }
});

/**
 * POST /api/sutar/goals/:id/progress
 * Update goal progress
 */
router.post('/goals/:id/progress', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Progress value is required' });
    }

    const goal = await sutarOS.updateGoal(id, value);
    res.json({ success: true, data: goal });
  } catch (error: any) {
    console.error('Update progress error:', error);
    res.status(500).json({ error: error.message || 'Failed to update progress' });
  }
});

/**
 * POST /api/sutar/goals/:id/complete
 * Complete a goal
 */
router.post('/goals/:id/complete', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await sutarOS.completeGoal(id);
    res.json({ success: true, data: goal });
  } catch (error: any) {
    console.error('Complete goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete goal' });
  }
});

/**
 * POST /api/sutar/goals/:id/pause
 * Pause a goal
 */
router.post('/goals/:id/pause', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await sutarOS.pauseGoal(id);
    res.json({ success: true, data: goal });
  } catch (error: any) {
    console.error('Pause goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to pause goal' });
  }
});

/**
 * POST /api/sutar/goals/:id/resume
 * Resume a goal
 */
router.post('/goals/:id/resume', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const goal = await sutarOS.resumeGoal(id);
    res.json({ success: true, data: goal });
  } catch (error: any) {
    console.error('Resume goal error:', error);
    res.status(500).json({ error: error.message || 'Failed to resume goal' });
  }
});

// ==================== Karma ====================

/**
 * GET /api/sutar/karma
 * Get karma score and account
 */
router.get('/karma', async (req: Request, res: Response) => {
  try {
    const accountId = req.query.accountId as string | undefined;
    const karma = await sutarOS.getKarmaScore(accountId);
    res.json({ success: true, data: karma });
  } catch (error: any) {
    console.error('Get karma error:', error);
    res.status(500).json({ error: error.message || 'Failed to get karma' });
  }
});

/**
 * POST /api/sutar/karma/earn
 * Earn karma points
 */
router.post('/karma/earn', async (req: Request, res: Response) => {
  try {
    const { action, points, reason } = req.body;

    if (!action || points === undefined) {
      return res.status(400).json({ error: 'Action and points are required' });
    }

    const karma = await sutarOS.earnKarma(action, points, reason || '');
    res.json({ success: true, data: karma });
  } catch (error: any) {
    console.error('Earn karma error:', error);
    res.status(500).json({ error: error.message || 'Failed to earn karma' });
  }
});

/**
 * POST /api/sutar/karma/spend
 * Spend karma points
 */
router.post('/karma/spend', async (req: Request, res: Response) => {
  try {
    const { rewardId } = req.body;

    if (!rewardId) {
      return res.status(400).json({ error: 'Reward ID is required' });
    }

    const result = await sutarOS.spendKarma(rewardId);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Spend karma error:', error);
    res.status(500).json({ error: error.message || 'Failed to spend karma' });
  }
});

/**
 * GET /api/sutar/karma/rewards
 * Get available karma rewards
 */
router.get('/karma/rewards', async (req: Request, res: Response) => {
  try {
    const rewards = sutarOS.getAvailableRewards();
    res.json({ success: true, data: rewards });
  } catch (error: any) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: error.message || 'Failed to get rewards' });
  }
});

// ==================== Agents ====================

/**
 * GET /api/sutar/agents
 * Get all agents
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const agents = await sutarOS.getAllAgents();
    res.json({ success: true, data: agents });
  } catch (error: any) {
    console.error('Get agents error:', error);
    res.status(500).json({ error: error.message || 'Failed to get agents' });
  }
});

/**
 * GET /api/sutar/agents/:id
 * Get a specific agent
 */
router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agent = await sutarOS.getAgentStatus(id);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json({ success: true, data: agent });
  } catch (error: any) {
    console.error('Get agent error:', error);
    res.status(500).json({ error: error.message || 'Failed to get agent' });
  }
});

/**
 * POST /api/sutar/agents
 * Create a new agent
 */
router.post('/agents', async (req: Request, res: Response) => {
  try {
    const { name, role, capabilities } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: 'Name and role are required' });
    }

    const agent = await sutarOS.createAgent(name, role, capabilities || []);
    res.json({ success: true, data: agent });
  } catch (error: any) {
    console.error('Create agent error:', error);
    res.status(500).json({ error: error.message || 'Failed to create agent' });
  }
});

/**
 * POST /api/sutar/agents/deploy
 * Deploy an agent to perform a task
 */
router.post('/agents/deploy', async (req: Request, res: Response) => {
  try {
    const { agentId, task } = req.body;

    if (!agentId || !task) {
      return res.status(400).json({ error: 'Agent ID and task are required' });
    }

    const taskResult = await sutarOS.deployAgent(agentId, task);
    res.json({ success: true, data: taskResult });
  } catch (error: any) {
    console.error('Deploy agent error:', error);
    res.status(500).json({ error: error.message || 'Failed to deploy agent' });
  }
});

/**
 * GET /api/sutar/agents/:id/results
 * Get agent task results
 */
router.get('/agents/:id/results', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const results = await sutarOS.getAgentResults(id);
    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Get agent results error:', error);
    res.status(500).json({ error: error.message || 'Failed to get results' });
  }
});

/**
 * POST /api/sutar/agents/:id/stop
 * Stop an agent
 */
router.post('/agents/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const agent = await sutarOS.stopAgent(id);
    res.json({ success: true, data: agent });
  } catch (error: any) {
    console.error('Stop agent error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop agent' });
  }
});

// ==================== Decisions ====================

/**
 * POST /api/sutar/decisions/request
 * Request a decision
 */
router.post('/decisions/request', async (req: Request, res: Response) => {
  try {
    const { context, options } = req.body;

    if (!context || !options || !Array.isArray(options)) {
      return res.status(400).json({ error: 'Context and options (array) are required' });
    }

    const decision = await sutarOS.requestDecision(context, options);
    res.json({ success: true, data: decision });
  } catch (error: any) {
    console.error('Request decision error:', error);
    res.status(500).json({ error: error.message || 'Failed to request decision' });
  }
});

/**
 * GET /api/sutar/decisions/:id
 * Get a decision
 */
router.get('/decisions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const decision = await sutarOS.getDecision(id);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json({ success: true, data: decision });
  } catch (error: any) {
    console.error('Get decision error:', error);
    res.status(500).json({ error: error.message || 'Failed to get decision' });
  }
});

/**
 * POST /api/sutar/decisions/:id/approve
 * Approve a decision
 */
router.post('/decisions/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { optionId } = req.body;
    const decision = await sutarOS.approveDecision(id, optionId);
    res.json({ success: true, data: decision });
  } catch (error: any) {
    console.error('Approve decision error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve decision' });
  }
});

/**
 * POST /api/sutar/decisions/:id/reject
 * Reject a decision
 */
router.post('/decisions/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const decision = await sutarOS.rejectDecision(id, reason || '');
    res.json({ success: true, data: decision });
  } catch (error: any) {
    console.error('Reject decision error:', error);
    res.status(500).json({ error: error.message || 'Failed to reject decision' });
  }
});

// ==================== Workflows ====================

/**
 * GET /api/sutar/workflows
 * Get all workflows
 */
router.get('/workflows', async (req: Request, res: Response) => {
  try {
    const workflows = await sutarOS.getAllWorkflows();
    res.json({ success: true, data: workflows });
  } catch (error: any) {
    console.error('Get workflows error:', error);
    res.status(500).json({ error: error.message || 'Failed to get workflows' });
  }
});

/**
 * POST /api/sutar/workflows
 * Create a new workflow
 */
router.post('/workflows', async (req: Request, res: Response) => {
  try {
    const workflowData = req.body;

    if (!workflowData.name) {
      return res.status(400).json({ error: 'Workflow name is required' });
    }

    const workflow = await sutarOS.createAutonomousWorkflow(workflowData);
    res.json({ success: true, data: workflow });
  } catch (error: any) {
    console.error('Create workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to create workflow' });
  }
});

/**
 * GET /api/sutar/workflows/:id
 * Get a specific workflow
 */
router.get('/workflows/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await sutarOS.monitorWorkflow(id);

    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({ success: true, data: workflow });
  } catch (error: any) {
    console.error('Get workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to get workflow' });
  }
});

/**
 * POST /api/sutar/workflow/deploy
 * Deploy a workflow
 */
router.post('/workflow/deploy', async (req: Request, res: Response) => {
  try {
    const { workflowId, params } = req.body;

    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }

    const run = await sutarOS.deployWorkflow(workflowId, params);
    res.json({ success: true, data: run });
  } catch (error: any) {
    console.error('Deploy workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to deploy workflow' });
  }
});

/**
 * GET /api/sutar/workflow/run
 * Get workflow run status (alias for monitoring)
 */
router.get('/workflow/run', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.query;

    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }

    const workflow = await sutarOS.monitorWorkflow(workflowId as string);
    res.json({ success: true, data: workflow });
  } catch (error: any) {
    console.error('Get workflow run error:', error);
    res.status(500).json({ error: error.message || 'Failed to get workflow run' });
  }
});

/**
 * POST /api/sutar/workflow/:id/stop
 * Stop a workflow
 */
router.post('/workflow/:id/stop', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workflow = await sutarOS.stopWorkflow(id);
    res.json({ success: true, data: workflow });
  } catch (error: any) {
    console.error('Stop workflow error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop workflow' });
  }
});

// ==================== Dashboard ====================

/**
 * GET /api/sutar/dashboard
 * Get SUTAR OS dashboard data
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const dashboard = await sutarOS.getDashboard();
    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: error.message || 'Failed to get dashboard' });
  }
});

export { router as sutarOSRoutes };
export default router;
