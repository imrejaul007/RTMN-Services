import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const logger = createLogger('hojai-business-copilot:intelligence');
const router = Router();

const GRAPH_SERVICE_URL = process.env.GRAPH_SERVICE_URL || 'http://localhost:4810';
const INTELLIGENCE_SERVICE_URL = process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:4530';

router.get('/entity/:entityType/:entityId', async (req, res) => {
  const { entityType, entityId } = req.params;
  try {
    const response = await axios.get(`${GRAPH_SERVICE_URL}/api/entity/${entityType}/${entityId}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('entity_fetch_error', { error: error.message, entityType, entityId });
    res.status(error.response?.status || 500).json(
      createErrorResponse('GRAPH_SERVICE_ERROR', error.message || 'Failed to fetch entity')
    );
  }
});

router.post('/query', async (req, res) => {
  const { query, filters, depth = 2 } = req.body;
  try {
    if (!query) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Query is required'));
      return;
    }
    const response = await axios.post(`${GRAPH_SERVICE_URL}/api/query`, { query, filters, depth }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 15000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('graph_query_error', { error: error.message, query });
    res.status(error.response?.status || 500).json(
      createErrorResponse('GRAPH_SERVICE_ERROR', error.message || 'Failed to query graph')
    );
  }
});

router.get('/insights', async (req, res) => {
  const { entityId, entityType, type, limit = '20' } = req.query;
  try {
    const params = new URLSearchParams();
    if (entityId) params.append('entityId', entityId as string);
    if (entityType) params.append('entityType', entityType as string);
    if (type) params.append('type', type as string);
    params.append('limit', limit as string);
    const response = await axios.get(`${INTELLIGENCE_SERVICE_URL}/api/insights?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('insights_fetch_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('INTELLIGENCE_SERVICE_ERROR', error.message || 'Failed to fetch insights')
    );
  }
});

router.get('/paths/:sourceType/:sourceId/:targetType/:targetId', async (req, res) => {
  const { sourceType, sourceId, targetType, targetId } = req.params;
  const { maxDepth = '5' } = req.query;
  try {
    const params = new URLSearchParams({ maxDepth: maxDepth as string });
    const response = await axios.get(
      `${GRAPH_SERVICE_URL}/api/paths/${sourceType}/${sourceId}/${targetType}/${targetId}?${params}`,
      {
        headers: {
          'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
          'X-User-Id': req.headers['x-user-id'] as string || '',
        },
        timeout: 15000,
      }
    );
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('paths_fetch_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('GRAPH_SERVICE_ERROR', error.message || 'Failed to fetch paths')
    );
  }
});

router.post('/entity', async (req, res) => {
  const { entityType, entityId, properties, relationships } = req.body;
  try {
    if (!entityType || !entityId) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'entityType and entityId are required'));
      return;
    }
    const response = await axios.post(`${GRAPH_SERVICE_URL}/api/entity`, { entityType, entityId, properties, relationships }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    logger.info('entity_created', { entityType, entityId });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('entity_create_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('GRAPH_SERVICE_ERROR', error.message || 'Failed to create entity')
    );
  }
});

router.post('/relationship', async (req, res) => {
  const { sourceType, sourceId, targetType, targetId, relationshipType, properties } = req.body;
  try {
    if (!sourceType || !sourceId || !targetType || !targetId || !relationshipType) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'All relationship fields are required'));
      return;
    }
    const response = await axios.post(`${GRAPH_SERVICE_URL}/api/relationship`, { sourceType, sourceId, targetType, targetId, relationshipType, properties }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });
    logger.info('relationship_created', { sourceType, sourceId, targetType, targetId, relationshipType });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('relationship_create_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('GRAPH_SERVICE_ERROR', error.message || 'Failed to create relationship')
    );
  }
});

router.post('/analyze', async (req, res) => {
  const { entityIds, entityType, timeRange, analysisType } = req.body;
  try {
    if (!entityIds || !entityType) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'entityIds and entityType are required'));
      return;
    }
    const response = await axios.post(`${INTELLIGENCE_SERVICE_URL}/api/analyze`, { entityIds, entityType, timeRange, analysisType }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 30000,
    });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('analysis_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('INTELLIGENCE_SERVICE_ERROR', error.message || 'Failed to analyze patterns')
    );
  }
});

export default router;
