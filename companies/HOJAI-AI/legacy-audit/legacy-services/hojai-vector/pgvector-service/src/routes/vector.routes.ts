/**
 * HOJAI pgvector Service - Vector Routes
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: REST API routes for vector operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Logger } from '../utils/logger.js';
import { getStorage } from '../services/storage.service.js';
import type {
  ApiResponse,
  VectorRecord,
  SearchResponse,
  NamespaceListResponse,
  BatchInsertResponse,
} from '../types/index.js';

// ============================================================================
// Validation Schemas
// ============================================================================

const vectorInsertSchema = z.object({
  id: z.string().uuid().optional(),
  namespace: z.string().min(1).max(255),
  embedding: z.array(z.number()).min(1).max(16384),
  metadata: z.record(z.unknown()).optional(),
});

const batchInsertSchema = z.object({
  vectors: z.array(
    z.object({
      id: z.string().uuid().optional(),
      namespace: z.string().min(1).max(255),
      embedding: z.array(z.number()).min(1).max(16384),
      metadata: z.record(z.unknown()).optional(),
    })
  ).min(1).max(1000),
  namespace: z.string().min(1).max(255).optional(),
});

const searchSchema = z.object({
  embedding: z.array(z.number()).min(1).max(16384),
  limit: z.number().int().min(1).max(1000).optional().default(10),
  threshold: z.number().min(0).max(1).optional(),
  namespace: z.string().min(1).max(255).optional(),
  includeMetadata: z.boolean().optional().default(true),
});

const namespaceQuerySchema = z.object({
  namespace: z.string().min(1).max(255),
  limit: z.number().int().min(1).max(1000).optional().default(100),
  offset: z.number().int().min(0).optional().default(0),
});

// ============================================================================
// Route Factory
// ============================================================================

export function createVectorRouter(logger: Logger): Router {
  const router = Router();
  const storage = getStorage();

  // Helper to create API response
  const createResponse = <T>(data: T, requestId: string): ApiResponse<T> => ({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });

  // Helper to create error response
  const createErrorResponse = (
    code: string,
    message: string,
    requestId: string,
    details?: Record<string, unknown>
  ): ApiResponse => ({
    success: false,
    error: {
      code,
      message,
      details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });

  // ==========================================================================
  // POST /api/vectors - Insert vectors
  // ==========================================================================

  router.post('/vectors', async (req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;

    try {
      // Validate request body
      const validationResult = vectorInsertSchema.safeParse(req.body);

      if (!validationResult.success) {
        logger.warn('vector_insert_validation_failed', {
          requestId,
          errors: validationResult.error.errors,
        });

        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid request body',
            requestId,
            { errors: validationResult.error.errors }
          )
        );
        return;
      }

      const { id, namespace, embedding, metadata } = validationResult.data;

      // Insert vector
      const startTime = Date.now();
      const vector = await storage.insert({
        id,
        namespace,
        embedding,
        metadata,
      });

      const duration = Date.now() - startTime;

      logger.info('vector_inserted', {
        requestId,
        id: vector.id,
        namespace,
        dimensions: embedding.length,
        duration_ms: duration,
      });

      res.status(201).json(createResponse(vector, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('vector_insert_failed', {
        requestId,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  // ==========================================================================
  // POST /api/vectors/batch - Batch insert vectors
  // ==========================================================================

  router.post('/vectors/batch', async (req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;

    try {
      // Validate request body
      const validationResult = batchInsertSchema.safeParse(req.body);

      if (!validationResult.success) {
        logger.warn('batch_insert_validation_failed', {
          requestId,
          errors: validationResult.error.errors,
        });

        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid request body',
            requestId,
            { errors: validationResult.error.errors }
          )
        );
        return;
      }

      const { vectors, namespace } = validationResult.data;

      // Process vectors with optional namespace override
      const processedVectors = vectors.map((v) => ({
        ...v,
        namespace: namespace || v.namespace,
      }));

      // Batch insert
      const startTime = Date.now();
      const { ids, errors } = await storage.insertBatch(processedVectors);
      const duration = Date.now() - startTime;

      const response: BatchInsertResponse = {
        inserted: ids.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        ids,
      };

      logger.info('batch_insert_completed', {
        requestId,
        inserted: ids.length,
        failed: errors.length,
        duration_ms: duration,
      });

      res.status(201).json(createResponse(response, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('batch_insert_failed', {
        requestId,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  // ==========================================================================
  // POST /api/vectors/search - Search similar vectors
  // ==========================================================================

  router.post('/vectors/search', async (req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;

    try {
      // Validate request body
      const validationResult = searchSchema.safeParse(req.body);

      if (!validationResult.success) {
        logger.warn('search_validation_failed', {
          requestId,
          errors: validationResult.error.errors,
        });

        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid request body',
            requestId,
            { errors: validationResult.error.errors }
          )
        );
        return;
      }

      const { embedding, limit, threshold, namespace, includeMetadata } = validationResult.data;

      // Search
      const startTime = Date.now();
      const results = await storage.search({
        embedding,
        limit,
        threshold,
        namespace,
      });
      const tookMs = Date.now() - startTime;

      // Filter metadata if not requested
      const filteredResults = results.map((r) => ({
        ...r,
        metadata: includeMetadata ? r.metadata : undefined,
      }));

      const response: SearchResponse = {
        results: filteredResults,
        query: embedding,
        total: filteredResults.length,
        took_ms: tookMs,
      };

      logger.info('vector_search_completed', {
        requestId,
        namespace: namespace || 'all',
        resultsCount: filteredResults.length,
        took_ms: tookMs,
      });

      res.json(createResponse(response, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('vector_search_failed', {
        requestId,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  // ==========================================================================
  // GET /api/vectors/:id - Get vector by ID
  // ==========================================================================

  router.get('/vectors/:id', async (req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;
    const { id } = req.params;

    try {
      // Validate ID format
      if (!id || !z.string().uuid().safeParse(id).success) {
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'Invalid vector ID format', requestId)
        );
        return;
      }

      const vector = await storage.getById(id);

      if (!vector) {
        logger.warn('vector_not_found', {
          requestId,
          id,
        });

        res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Vector not found', requestId)
        );
        return;
      }

      logger.info('vector_fetched', {
        requestId,
        id,
        namespace: vector.namespace,
      });

      res.json(createResponse(vector, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('vector_fetch_failed', {
        requestId,
        id,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  // ==========================================================================
  // DELETE /api/vectors/:id - Delete vector
  // ==========================================================================

  router.delete('/vectors/:id', async (req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;
    const { id } = req.params;

    try {
      // Validate ID format
      if (!id || !z.string().uuid().safeParse(id).success) {
        res.status(400).json(
          createErrorResponse('VALIDATION_ERROR', 'Invalid vector ID format', requestId)
        );
        return;
      }

      const deleted = await storage.delete(id);

      if (!deleted) {
        logger.warn('vector_delete_not_found', {
          requestId,
          id,
        });

        res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Vector not found', requestId)
        );
        return;
      }

      logger.info('vector_deleted', {
        requestId,
        id,
      });

      res.json(createResponse({ deleted: true, id }, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('vector_delete_failed', {
        requestId,
        id,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  // ==========================================================================
  // GET /api/namespaces - List all namespaces
  // ==========================================================================

  router.get('/namespaces', async (_req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;

    try {
      const namespaces = await storage.listNamespaces();

      const response: NamespaceListResponse = {
        namespaces,
        total: namespaces.length,
      };

      logger.info('namespaces_listed', {
        requestId,
        count: namespaces.length,
      });

      res.json(createResponse(response, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('namespaces_list_failed', {
        requestId,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  // ==========================================================================
  // GET /api/namespaces/:namespace/vectors - List vectors in namespace
  // ==========================================================================

  router.get('/namespaces/:namespace/vectors', async (req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;
    const namespace = req.params['namespace'] as string;

    if (!namespace) {
      res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Namespace is required', requestId)
      );
      return;
    }

    try {
      // Validate query params
      const queryValidation = namespaceQuerySchema.safeParse({
        ...req.query,
        namespace,
      });

      if (!queryValidation.success) {
        res.status(400).json(
          createErrorResponse(
            'VALIDATION_ERROR',
            'Invalid query parameters',
            requestId,
            { errors: queryValidation.error.errors }
          )
        );
        return;
      }

      const { limit, offset } = queryValidation.data;
      const vectors = await storage.listByNamespace(namespace, limit, offset);

      logger.info('namespace_vectors_listed', {
        requestId,
        namespace,
        count: vectors.length,
        limit,
        offset,
      });

      res.json(createResponse({
        vectors,
        total: vectors.length,
        limit,
        offset,
      }, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('namespace_vectors_list_failed', {
        requestId,
        namespace,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  // ==========================================================================
  // GET /api/namespaces/:namespace/stats - Get namespace statistics
  // ==========================================================================

  router.get('/namespaces/:namespace/stats', async (req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;
    const namespace = req.params['namespace'] as string;

    if (!namespace) {
      res.status(400).json(
        createErrorResponse('VALIDATION_ERROR', 'Namespace is required', requestId)
      );
      return;
    }

    try {
      const stats = await storage.getNamespaceStats(namespace);

      if (!stats) {
        res.status(404).json(
          createErrorResponse('NOT_FOUND', 'Namespace not found', requestId)
        );
        return;
      }

      logger.info('namespace_stats_fetched', {
        requestId,
        namespace,
        count: stats.count,
      });

      res.json(createResponse(stats, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('namespace_stats_fetch_failed', {
        requestId,
        namespace,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  // ==========================================================================
  // GET /api/stats - Get overall storage statistics
  // ==========================================================================

  router.get('/stats', async (_req: Request, res: Response) => {
    const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;

    try {
      const namespaces = await storage.listNamespaces();
      const totalVectors = await storage.count();

      logger.info('storage_stats_fetched', {
        requestId,
        totalVectors,
        namespaceCount: namespaces.length,
      });

      res.json(createResponse({
        total_vectors: totalVectors,
        namespace_count: namespaces.length,
        namespaces: namespaces.map((ns) => ({
          namespace: ns.namespace,
          count: ns.count,
          dimensions: ns.dimensions,
        })),
      }, requestId));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('storage_stats_fetch_failed', {
        requestId,
        error: message,
      });

      res.status(500).json(
        createErrorResponse('INTERNAL_ERROR', message, requestId)
      );
    }
  });

  return router;
}
