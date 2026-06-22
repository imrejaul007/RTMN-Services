import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { createResponse, createErrorResponse, AgentExecution, AgentTask } from '../types/index.js';

const logger = createLogger('hojai-business-copilot:agent');
const router = Router();

const EXPERT_OS_URL = process.env.EXPERT_OS_URL || 'http://localhost:4550';

// Execute agent task
router.post('/execute', async (req, res) => {
  try {
    const { agentId, agentName, task, parameters, userId, tenantId } = req.body;

    if (!agentId || !task) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'agentId and task are required'));
      return;
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    logger.info('agent_execution_started', { executionId, agentId, task });

    const response = await axios.post(`${EXPERT_OS_URL}/api/execute`, {
      executionId,
      agentId,
      agentName,
      task,
      parameters,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': userId || req.headers['x-user-id'] as string || '',
      },
      timeout: 60000,
    });

    const duration = Date.now() - startTime;
    const execution: AgentExecution = {
      agentId,
      agentName: agentName || agentId,
      task,
      result: response.data,
      status: 'completed',
      duration,
    };

    logger.info('agent_execution_completed', { executionId, duration });
    res.status(201).json(createResponse(execution));
  } catch (error: any) {
    logger.error('agent_execution_error', { error: error.message, agentId: req.body.agentId });
    res.status(error.response?.status || 500).json(
      createErrorResponse('AGENT_SERVICE_ERROR', error.message || 'Failed to execute agent')
    );
  }
});

// Get agent status
router.get('/status/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    const response = await axios.get(`${EXPERT_OS_URL}/api/execution/${executionId}/status`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('agent_status_error', { error: error.message, executionId: req.params.executionId });
    res.status(error.response?.status || 500).json(
      createErrorResponse('AGENT_SERVICE_ERROR', error.message || 'Failed to get agent status')
    );
  }
});

// List available agents
router.get('/list', async (req, res) => {
  try {
    const { category, tenantId } = req.query;

    const params = new URLSearchParams();
    if (category) params.append('category', category as string);

    const response = await axios.get(`${EXPERT_OS_URL}/api/agents?${params}`, {
      headers: {
        'X-Tenant-Id': tenantId as string || req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('agent_list_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('AGENT_SERVICE_ERROR', error.message || 'Failed to list agents')
    );
  }
});

// Get agent capabilities
router.get('/capabilities/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const response = await axios.get(`${EXPERT_OS_URL}/api/agents/${agentId}/capabilities`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('agent_capabilities_error', { error: error.message, agentId: req.params.agentId });
    res.status(error.response?.status || 500).json(
      createErrorResponse('AGENT_SERVICE_ERROR', error.message || 'Failed to get agent capabilities')
    );
  }
});

// Cancel agent execution
router.post('/cancel/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;

    const response = await axios.post(`${EXPERT_OS_URL}/api/execution/${executionId}/cancel`, {}, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    logger.info('agent_execution_cancelled', { executionId });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('agent_cancel_error', { error: error.message, executionId: req.params.executionId });
    res.status(error.response?.status || 500).json(
      createErrorResponse('AGENT_SERVICE_ERROR', error.message || 'Failed to cancel agent execution')
    );
  }
});

// Get execution history
router.get('/history', async (req, res) => {
  try {
    const { userId, agentId, status, page = '1', limit = '20' } = req.query;

    const params = new URLSearchParams();
    if (userId) params.append('userId', userId as string);
    if (agentId) params.append('agentId', agentId as string);
    if (status) params.append('status', status as string);
    params.append('page', page as string);
    params.append('limit', limit as string);

    const response = await axios.get(`${EXPERT_OS_URL}/api/executions?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || userId as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('agent_history_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('AGENT_SERVICE_ERROR', error.message || 'Failed to get execution history')
    );
  }
});

export default router;
