/**
 * HOJAI LLM Providers - API Routes
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: API endpoints for LLM provider service
 */

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type {
  LLMRouter,
  ChatRequest,
  ChatResponseDTO,
  EmbedRequest,
  EmbedResponseDTO,
  ClassifyRequest,
  ClassifyResponseDTO,
  ProvidersResponseDTO,
} from '../types/index.js';
import { LLMProviderError } from '../types/index.js';
import {
  ChatRequestSchema,
  EmbedRequestSchema,
  ClassifyRequestSchema,
  validateRequest,
  formatZodError,
} from '../middleware/validation.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('api-routes');

// ============================================================================
// Router Factory
// ============================================================================

export interface APIRouterDeps {
  router: LLMRouter;
}

/**
 * Create API routes
 */
export function createAPIRouter(deps: APIRouterDeps): Router {
  const { router: llmRouter } = deps;
  const apiRouter = Router();

  // ============================================================================
  // Chat Completion Endpoint
  // ============================================================================

  /**
   * POST /api/chat
   * Generate a chat completion
   */
  apiRouter.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = `req_${uuidv4()}`;
    const startTime = Date.now();

    logger.info('chat_request_received', { requestId });

    try {
      // Validate request
      const validation = validateRequest(ChatRequestSchema, req.body);
      if (!validation.success) {
        const response: ChatResponseDTO = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: formatZodError(validation.error),
            details: { errors: validation.error.errors },
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          },
        };
        res.status(400).json(response);
        return;
      }

      const chatRequest: ChatRequest = validation.data;

      // Route to provider
      const result = await llmRouter.chat(chatRequest.messages, {
        provider: chatRequest.provider,
        model: chatRequest.model,
        maxTokens: chatRequest.maxTokens,
        temperature: chatRequest.temperature,
        topP: chatRequest.topP,
        stop: chatRequest.stop,
        frequencyPenalty: chatRequest.frequencyPenalty,
        presencePenalty: chatRequest.presencePenalty,
        functions: chatRequest.functions,
        functionCall: chatRequest.functionCall,
        taskType: chatRequest.taskType,
      });

      const response: ChatResponseDTO = {
        success: true,
        data: {
          content: result.content,
          role: 'assistant',
          finishReason: result.finishReason,
          usage: result.usage,
          model: result.model,
          provider: result.provider,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      };

      logger.info('chat_request_success', {
        requestId,
        provider: result.provider,
        model: result.model,
        durationMs: Date.now() - startTime,
      });

      res.json(response);
    } catch (error) {
      logger.error('chat_request_error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof LLMProviderError) {
        const response: ChatResponseDTO = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: {
              provider: error.provider,
              model: error.model,
              retryable: error.retryable,
            },
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          },
        };
        res.status(error.statusCode).json(response);
        return;
      }

      next(error);
    }
  });

  // ============================================================================
  // Embeddings Endpoint
  // ============================================================================

  /**
   * POST /api/embed
   * Generate embeddings for text
   */
  apiRouter.post('/embed', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = `req_${uuidv4()}`;
    const startTime = Date.now();

    logger.info('embed_request_received', { requestId });

    try {
      // Handle both single text and batch
      const isBatch = Array.isArray(req.body.text);
      const validation = validateRequest(
        isBatch ? EmbedRequestSchema : EmbedRequestSchema,
        req.body
      );

      if (!validation.success) {
        const response: EmbedResponseDTO = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: formatZodError(validation.error),
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          },
        };
        res.status(400).json(response);
        return;
      }

      const embedRequest: EmbedRequest = validation.data;
      const texts = Array.isArray(embedRequest.text)
        ? embedRequest.text
        : [embedRequest.text];

      // Get embeddings
      const embeddings: number[][] = [];
      for (const text of texts) {
        const embedding = await llmRouter.embed(text, embedRequest.provider);
        embeddings.push(embedding);
      }

      const response: EmbedResponseDTO = {
        success: true,
        data: {
          embeddings,
          model: 'text-embedding-3-small',
          provider: embedRequest.provider || 'openai',
          dimensions: embeddings[0]?.length || 0,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      };

      logger.info('embed_request_success', {
        requestId,
        count: texts.length,
        dimensions: response.data?.dimensions,
        durationMs: Date.now() - startTime,
      });

      res.json(response);
    } catch (error) {
      logger.error('embed_request_error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof LLMProviderError) {
        const response: EmbedResponseDTO = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          },
        };
        res.status(error.statusCode).json(response);
        return;
      }

      next(error);
    }
  });

  // ============================================================================
  // Classification Endpoint
  // ============================================================================

  /**
   * POST /api/classify
   * Classify text into categories
   */
  apiRouter.post('/classify', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = `req_${uuidv4()}`;
    const startTime = Date.now();

    logger.info('classify_request_received', { requestId });

    try {
      // Validate request
      const validation = validateRequest(ClassifyRequestSchema, req.body);
      if (!validation.success) {
        const response: ClassifyResponseDTO = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: formatZodError(validation.error),
            details: { errors: validation.error.errors },
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          },
        };
        res.status(400).json(response);
        return;
      }

      const classifyRequest: ClassifyRequest = validation.data;

      // Classify
      const result = await llmRouter.classify(
        classifyRequest.text,
        classifyRequest.labels,
        classifyRequest.provider
      );

      const response: ClassifyResponseDTO = {
        success: true,
        data: {
          label: result,
          confidence: 1.0, // Would need to be calculated from the provider
          provider: classifyRequest.provider || 'openai',
          model: 'gpt-4o-mini',
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
          durationMs: Date.now() - startTime,
        },
      };

      logger.info('classify_request_success', {
        requestId,
        label: result,
        durationMs: Date.now() - startTime,
      });

      res.json(response);
    } catch (error) {
      logger.error('classify_request_error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof LLMProviderError) {
        const response: ClassifyResponseDTO = {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            durationMs: Date.now() - startTime,
          },
        };
        res.status(error.statusCode).json(response);
        return;
      }

      next(error);
    }
  });

  // ============================================================================
  // Providers List Endpoint
  // ============================================================================

  /**
   * GET /api/providers
   * List all configured providers
   */
  apiRouter.get('/providers', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = `req_${uuidv4()}`;
    const startTime = Date.now();

    logger.info('providers_request_received', { requestId });

    try {
      const providers = await llmRouter.getProviders();
      const config = llmRouter.getConfig();

      const response: ProvidersResponseDTO = {
        success: true,
        data: {
          providers,
          defaultProvider: config.defaultProvider,
          taskRouting: config.taskRouting,
        },
        meta: {
          requestId,
          timestamp: new Date().toISOString(),
        },
      };

      logger.info('providers_request_success', {
        requestId,
        count: providers.length,
        durationMs: Date.now() - startTime,
      });

      res.json(response);
    } catch (error) {
      logger.error('providers_request_error', {
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      next(error);
    }
  });

  // ============================================================================
  // Health Check Endpoint (within API router)
  // ============================================================================

  /**
   * GET /api/health
   * Health check with provider status
   */
  apiRouter.get('/health', async (req: Request, res: Response, next: NextFunction) => {
    const requestId = `req_${uuidv4()}`;

    try {
      const statuses = await llmRouter.getProviderStatuses();

      res.json({
        status: 'healthy',
        providers: statuses,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  });

  return apiRouter;
}
