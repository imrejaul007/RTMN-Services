import { Router } from 'express';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { createResponse, createErrorResponse, MemoryContext, MemoryEntry } from '../types/index.js';

const logger = createLogger('hojai-business-copilot:memory');
const router = Router();

const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:4520';

// Get memory context for a user/entity
router.get('/context', async (req, res) => {
  try {
    const { userId, entityId, entityType, tier, type } = req.query;

    if (!userId && !entityId) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'userId or entityId is required'));
      return;
    }

    const params = new URLSearchParams();
    if (userId) params.append('userId', userId as string);
    if (entityId) params.append('entityId', entityId as string);
    if (entityType) params.append('entityType', entityType as string);
    if (tier) params.append('tier', tier as string);
    if (type) params.append('type', type as string);

    const response = await axios.get(`${MEMORY_SERVICE_URL}/api/context?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || userId as string,
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('memory_context_error', { error: error.message, query: req.query });
    res.status(error.response?.status || 500).json(
      createErrorResponse('MEMORY_SERVICE_ERROR', error.message || 'Failed to fetch memory context')
    );
  }
});

// Store new memory context
router.post('/context', async (req, res) => {
  try {
    const { userId, tenantId, context } = req.body as {
      userId: string;
      tenantId: string;
      context: MemoryContext;
    };

    if (!userId || !tenantId || !context) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'userId, tenantId, and context are required'));
      return;
    }

    const response = await axios.post(`${MEMORY_SERVICE_URL}/api/context`, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': tenantId,
        'X-User-Id': userId,
      },
      timeout: 10000,
    });

    logger.info('memory_stored', { userId, tenantId, tier: context.tier, type: context.type });
    res.status(201).json(createResponse(response.data));
  } catch (error: any) {
    logger.error('memory_store_error', { error: error.message });
    res.status(error.response?.status || 500).json(
      createErrorResponse('MEMORY_SERVICE_ERROR', error.message || 'Failed to store memory context')
    );
  }
});

// Search memory
router.get('/search', async (req, res) => {
  try {
    const { q, userId, tenantId, limit = '20' } = req.query;

    if (!q) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Search query (q) is required'));
      return;
    }

    const params = new URLSearchParams();
    params.append('q', q as string);
    if (userId) params.append('userId', userId as string);
    if (tenantId) params.append('tenantId', tenantId as string);
    params.append('limit', limit as string);

    const response = await axios.get(`${MEMORY_SERVICE_URL}/api/search?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || tenantId as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || userId as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('memory_search_error', { error: error.message, query: req.query.q });
    res.status(error.response?.status || 500).json(
      createErrorResponse('MEMORY_SERVICE_ERROR', error.message || 'Failed to search memory')
    );
  }
});

// Get memory tier summary
router.get('/tiers/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const { userId, entityId } = req.query;

    const validTiers = ['l1', 'l2', 'l3', 'l4', 'l5'];
    if (!validTiers.includes(tier)) {
      res.status(400).json(createErrorResponse('VALIDATION_ERROR', `Invalid tier. Must be one of: ${validTiers.join(', ')}`));
      return;
    }

    const params = new URLSearchParams();
    if (userId) params.append('userId', userId as string);
    if (entityId) params.append('entityId', entityId as string);

    const response = await axios.get(`${MEMORY_SERVICE_URL}/api/tiers/${tier}?${params}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || userId as string || '',
      },
      timeout: 10000,
    });

    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('memory_tier_error', { error: error.message, tier: req.params.tier });
    res.status(error.response?.status || 500).json(
      createErrorResponse('MEMORY_SERVICE_ERROR', error.message || 'Failed to fetch tier memory')
    );
  }
});

// Delete memory entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.delete(`${MEMORY_SERVICE_URL}/api/context/${id}`, {
      headers: {
        'X-Tenant-Id': req.headers['x-tenant-id'] as string || '',
        'X-User-Id': req.headers['x-user-id'] as string || '',
      },
      timeout: 10000,
    });

    logger.info('memory_deleted', { id });
    res.json(createResponse(response.data));
  } catch (error: any) {
    logger.error('memory_delete_error', { error: error.message, id: req.params.id });
    res.status(error.response?.status || 500).json(
      createErrorResponse('MEMORY_SERVICE_ERROR', error.message || 'Failed to delete memory')
    );
  }
});

export default router;
