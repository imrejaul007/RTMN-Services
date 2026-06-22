/**
 * HOJAI Embedding Service - Embed Routes
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: API routes for embedding operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger.js';
import { createOpenAIService, getOpenAIService } from '../services/openai.service.js';
import { EMBED_MODEL_IDS, type EmbedModelId } from '../types/index.js';

// ============================================================================
// Types
// ============================================================================

interface EmbedRequestBody {
  text: string;
  model?: string;
}

interface BatchEmbedRequestBody {
  texts: string[];
  model?: string;
}

// ============================================================================
// Router Setup
// ============================================================================

export function createEmbedRouter(
  logger: Logger,
  openAiApiKey: string
): Router {
  const router = Router();

  // Initialize OpenAI service
  const openaiService = createOpenAIService(openAiApiKey, logger);

  // ============================================================================
  // POST /api/embed - Generate single embedding
  // ============================================================================

  router.post(
    '/embed',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;
      const startTime = Date.now();

      try {
        const { text, model } = req.body as EmbedRequestBody;

        // Validate request
        if (!text || typeof text !== 'string') {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing or invalid "text" field',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        const trimmedText = text.trim();
        if (trimmedText.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Text cannot be empty',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        if (trimmedText.length > 8192) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Text exceeds maximum length of 8192 characters',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        // Validate model
        const modelId = (model as EmbedModelId) || 'text-embedding-3-small';
        if (!EMBED_MODEL_IDS.includes(modelId)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid model. Must be one of: ${EMBED_MODEL_IDS.join(', ')}`,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        logger.info('embed_request', {
          requestId,
          model: modelId,
          textLength: trimmedText.length,
        });

        // Generate embedding
        const result = await openaiService.embed(trimmedText, modelId);

        const duration = Date.now() - startTime;

        res.status(200).json({
          success: true,
          data: {
            embedding: result.embedding,
            model: result.model,
            tokens: result.tokens,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            duration,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error('embed_request_failed', {
          requestId,
          error: errorMessage,
        });

        // Handle OpenAI-specific errors
        if (errorMessage.includes('Incorrect API key') || errorMessage.includes('invalid_api_key')) {
          res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_ERROR',
              message: 'Invalid OpenAI API key',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        if (errorMessage.includes('rate limit')) {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_ERROR',
              message: 'OpenAI rate limit exceeded',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        next(error);
      }
    }
  );

  // ============================================================================
  // POST /api/embed/batch - Generate batch embeddings
  // ============================================================================

  router.post(
    '/embed/batch',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;
      const startTime = Date.now();

      try {
        const { texts, model } = req.body as BatchEmbedRequestBody;

        // Validate request
        if (!texts || !Array.isArray(texts)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing or invalid "texts" field (must be an array)',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        if (texts.length === 0) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Texts array cannot be empty',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        if (texts.length > 100) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Maximum 100 texts per batch',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        // Validate model
        const modelId = (model as EmbedModelId) || 'text-embedding-3-small';
        if (!EMBED_MODEL_IDS.includes(modelId)) {
          res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid model. Must be one of: ${EMBED_MODEL_IDS.join(', ')}`,
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        logger.info('batch_embed_request', {
          requestId,
          model: modelId,
          textCount: texts.length,
        });

        // Generate batch embeddings
        const result = await openaiService.embedBatch(texts, modelId);

        const duration = Date.now() - startTime;

        res.status(200).json({
          success: true,
          data: {
            embeddings: result.embeddings,
            model: result.model,
            totalTokens: result.totalTokens,
          },
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
            duration,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        logger.error('batch_embed_request_failed', {
          requestId,
          error: errorMessage,
        });

        // Handle OpenAI-specific errors
        if (errorMessage.includes('Incorrect API key') || errorMessage.includes('invalid_api_key')) {
          res.status(401).json({
            success: false,
            error: {
              code: 'AUTHENTICATION_ERROR',
              message: 'Invalid OpenAI API key',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        if (errorMessage.includes('rate limit')) {
          res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_ERROR',
              message: 'OpenAI rate limit exceeded',
            },
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
            },
          });
          return;
        }

        next(error);
      }
    }
  );

  // ============================================================================
  // GET /api/models - List available embedding models
  // ============================================================================

  router.get(
    '/models',
    (_req: Request, res: Response): void => {
      const requestId = res.getHeader('X-Request-Id') as string || `req_${Date.now()}`;

      const models = openaiService.getAvailableModels();

      res.status(200).json({
        success: true,
        data: {
          models,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId,
        },
      });
    }
  );

  return router;
}
