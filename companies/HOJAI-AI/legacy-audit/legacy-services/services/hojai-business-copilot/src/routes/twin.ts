import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const logger = createLogger('hojai-business-copilot:twin');
const router = Router();

const TWIN_SERVICE_URL = process.env.TWIN_SERVICE_URL || 'http://localhost:4860';

router.get('/summary/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  try {
    const validTypes = ['employee', 'customer', 'company', 'merchant'];
    if (!validTypes.includes(type)) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', `Invalid twin type. Must be one of: ${validTypes.join(', ')}`));
      return;
    }
    const response = await axios.get(`${TWIN_SERVICE_URL}/api/twin/${type}/${id}/summary`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('twin_summary_error', { error: error.message, type, id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('TWIN_SERVICE_ERROR', error.message || 'Failed to fetch twin summary')
    );
  }
});

router.get('/profile/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  try {
    const response = await axios.get(`${TWIN_SERVICE_URL}/api/twin/${type}/${id}/profile`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('twin_profile_error', { error: error.message, type, id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('TWIN_SERVICE_ERROR', error.message || 'Failed to fetch twin profile')
    );
  }
});

router.get('/predictions/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const { horizon, metric } = req.query;
  try {
    const params = new URLSearchParams();
    if (horizon) params.append('horizon', horizon as string);
    if (metric) params.append('metric', metric as string);
    const response = await axios.get(`${TWIN_SERVICE_URL}/api/twin/${type}/${id}/predictions?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('twin_predictions_error', { error: error.message, type, id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('TWIN_SERVICE_ERROR', error.message || 'Failed to fetch predictions')
    );
  }
});

router.get('/insights/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  try {
    const response = await axios.get(`${TWIN_SERVICE_URL}/api/twin/${type}/${id}/insights`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('twin_insights_error', { error: error.message, type, id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('TWIN_SERVICE_ERROR', error.message || 'Failed to fetch insights')
    );
  }
});

router.post('/:type', async (req, res) => {
  const { type } = req.params;
  const { twinId, data } = req.body;
  try {
    const validTypes = ['employee', 'customer', 'company', 'merchant'];
    if (!validTypes.includes(type)) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', `Invalid twin type. Must be one of: ${validTypes.join(', ')}`));
      return;
    }
    const response = await axios.post(`${TWIN_SERVICE_URL}/api/twin/${type}`, { twinId, data }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    logger.info('twin_created', { type, twinId });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('twin_create_error', { error: error.message, type });
    res.status(error.response?.status || 500).json(
      createErrorResponse('TWIN_SERVICE_ERROR', error.message || 'Failed to create twin')
    );
  }
});

router.get('/list/:type', async (req, res) => {
  const { type } = req.params;
  const { page = '1', limit = '20' } = req.query;
  try {
    const validTypes = ['employee', 'customer', 'company', 'merchant'];
    if (!validTypes.includes(type)) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', `Invalid twin type. Must be one of: ${validTypes.join(', ')}`));
      return;
    }
    const params = new URLSearchParams({ page: page as string, limit: limit as string });
    const response = await axios.get(`${TWIN_SERVICE_URL}/api/twin/${type}/list?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('twin_list_error', { error: error.message, type });
    res.status(error.response?.status || 500).json(
      createErrorResponse('TWIN_SERVICE_ERROR', error.message || 'Failed to list twins')
    );
  }
});

export default router;
