import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const logger = createLogger('hojai-business-copilot:workflow');
const router = Router();

const FLOW_OS_URL = process.env.FLOW_OS_URL || 'http://localhost:4244';

router.get('/list', async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  try {
    const params = new URLSearchParams({ page: page as string, limit: limit as string });
    if (status) params.append('status', status as string);
    const response = await axios.get(`${FLOW_OS_URL}/api/workflows?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('workflow_list_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('WORKFLOW_SERVICE_ERROR', error.message || 'Failed to list workflows')
    );
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`${FLOW_OS_URL}/api/workflows/${id}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('workflow_fetch_error', { error: error.message, workflowId: id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('WORKFLOW_SERVICE_ERROR', error.message || 'Failed to fetch workflow')
    );
  }
});

router.post('/', async (req, res) => {
  const { name, description, steps } = req.body;
  try {
    if (!name || !steps || !Array.isArray(steps)) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'name and steps array are required'));
      return;
    }
    const response = await axios.post(`${FLOW_OS_URL}/api/workflows`, { name, description, steps }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    logger.info('workflow_created', { workflowId: response.data.id, name });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('workflow_create_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('WORKFLOW_SERVICE_ERROR', error.message || 'Failed to create workflow')
    );
  }
});

router.post('/:id/run', async (req, res) => {
  const { id } = req.params;
  const { parameters } = req.body;
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  try {
    logger.info('workflow_run_started', { workflowId: id, runId });
    const response = await axios.post(`${FLOW_OS_URL}/api/workflows/${id}/run`, { runId, parameters }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 120000,
    });
    logger.info('workflow_run_completed', { workflowId: id, runId });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('workflow_run_error', { error: error.message, workflowId: id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('WORKFLOW_SERVICE_ERROR', error.message || 'Failed to run workflow')
    );
  }
});

router.get('/:id/run/:runId', async (req, res) => {
  const { id, runId } = req.params;
  try {
    const response = await axios.get(`${FLOW_OS_URL}/api/workflows/${id}/run/${runId}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('workflow_run_status_error', { error: error.message, workflowId: id, runId });
    res.status(error.response?.status || 500).json(
      createErrorResponse('WORKFLOW_SERVICE_ERROR', error.message || 'Failed to get workflow run status')
    );
  }
});

router.get('/:id/runs', async (req, res) => {
  const { id } = req.params;
  const { page = '1', limit = '20', status } = req.query;
  try {
    const params = new URLSearchParams({ page: page as string, limit: limit as string });
    if (status) params.append('status', status as string);
    const response = await axios.get(`${FLOW_OS_URL}/api/workflows/${id}/runs?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('workflow_runs_error', { error: error.message, workflowId: id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('WORKFLOW_SERVICE_ERROR', error.message || 'Failed to get workflow runs')
    );
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, steps } = req.body;
  try {
    const response = await axios.put(`${FLOW_OS_URL}/api/workflows/${id}`, { name, description, steps }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    logger.info('workflow_updated', { workflowId: id });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('workflow_update_error', { error: error.message, workflowId: id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('WORKFLOW_SERVICE_ERROR', error.message || 'Failed to update workflow')
    );
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await axios.delete(`${FLOW_OS_URL}/api/workflows/${id}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    logger.info('workflow_deleted', { workflowId: id });
    res.json(createResponse({ deleted: true }));
  } catch (error: any) {
    logger.error('workflow_delete_error', { error: error.message, workflowId: id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('WORKFLOW_SERVICE_ERROR', error.message || 'Failed to delete workflow')
    );
  }
});

export default router;
