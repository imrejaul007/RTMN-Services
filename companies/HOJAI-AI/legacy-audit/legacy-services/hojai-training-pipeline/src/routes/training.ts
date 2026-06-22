/**
 * HOJAI Training Pipeline - Training Routes
 * API endpoints for continuous learning
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import {
  LearningSource,
  LearningType,
  LearningStage,
  LearningStatus,
  ChatMessageSchema,
  SignalEventSchema,
  CorrectionSchema,
  FeedbackSchema,
  LearningPayloadSchema,
  QueryLearningSchema,
  ChatMessage,
  Correction,
  Feedback,
  LearningPayload,
  QueryLearning
} from '../types/index.js';
import { learner } from '../services/learner.js';
import { signalProcessor } from '../services/signalProcessor.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const CaptureSchema = z.object({
  source: z.nativeEnum(LearningSource),
  sourceId: z.string().min(1),
  type: z.nativeEnum(LearningType),
  content: z.record(z.unknown()),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  tenantId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional()
});

const ConversationSchema = z.object({
  conversationId: z.string().min(1),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string().min(1),
    metadata: z.record(z.unknown()).optional()
  })),
  tenantId: z.string().optional(),
  userId: z.string().optional()
});

const ActionSchema = z.object({
  type: z.enum(['click', 'view', 'search', 'purchase', 'cancel', 'error']),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  tenantId: z.string().optional(),
  userId: z.string().optional()
});

const CorrectionPayloadSchema = z.object({
  originalContent: z.string().min(1),
  correctedContent: z.string().min(1),
  reason: z.string().optional(),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  context: z.record(z.unknown()).optional()
});

const FeedbackPayloadSchema = z.object({
  type: z.enum(['positive', 'negative', 'rating', 'correction']),
  score: z.number().min(1).max(5).optional(),
  content: z.string().optional(),
  itemType: z.string().optional(),
  itemId: z.string().optional(),
  userId: z.string().optional(),
  tenantId: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const BatchProcessSchema = z.object({
  signals: z.array(z.unknown())
});

const BatchTrainingSchema = z.object({
  tenantId: z.string().optional(),
  batchSize: z.number().min(1).max(10000).optional().default(1000),
  minConfidence: z.number().min(0).max(1).optional()
});

// ============================================================================
// CAPTURE ENDPOINTS
// ============================================================================

/**
 * POST /api/training/capture
 * Capture learning from any source
 */
router.post('/capture', async (req: Request, res: Response) => {
  try {
    const validated = CaptureSchema.parse(req.body);

    const payload: LearningPayload = {
      source: validated.source,
      sourceId: validated.sourceId,
      type: validated.type,
      content: validated.content,
      confidence: validated.confidence,
      tenantId: validated.tenantId,
      userId: validated.userId,
      sessionId: validated.sessionId
    };

    const result = await learner.capture(payload);

    res.status(201).json({
      success: true,
      data: {
        patternId: result.patternId,
        status: result.status
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        tenantId: validated.tenantId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    logger.error('Capture failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to capture learning'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

// ============================================================================
// CONVERSATION LEARNING
// ============================================================================

/**
 * POST /api/training/conversation
 * Learn from chat conversations
 */
router.post('/conversation', async (req: Request, res: Response) => {
  try {
    const validated = ConversationSchema.parse(req.body);

    const result = await learner.learnFromConversation(
      validated.conversationId,
      validated.messages,
      {
        tenantId: validated.tenantId,
        userId: validated.userId
      }
    );

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        tenantId: validated.tenantId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    logger.error('Conversation learning failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to learn from conversation'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

// ============================================================================
// ACTION LEARNING
// ============================================================================

/**
 * POST /api/training/action
 * Learn from user actions (clicks, views, searches, etc.)
 */
router.post('/action', async (req: Request, res: Response) => {
  try {
    const validated = ActionSchema.parse(req.body);

    const result = await learner.learnFromAction(
      {
        type: validated.type,
        entityType: validated.entityType,
        entityId: validated.entityId,
        properties: validated.properties
      },
      {
        tenantId: validated.tenantId,
        userId: validated.userId
      }
    );

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        tenantId: validated.tenantId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    logger.error('Action learning failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to learn from action'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

// ============================================================================
// CORRECTION LEARNING
// ============================================================================

/**
 * POST /api/training/correction
 * Learn from corrections (AI mistakes that were fixed)
 */
router.post('/correction', async (req: Request, res: Response) => {
  try {
    const validated = CorrectionPayloadSchema.parse(req.body);

    const result = await learner.learnFromCorrection(
      validated.originalContent,
      validated.correctedContent,
      validated.reason,
      {
        tenantId: validated.tenantId,
        userId: validated.userId,
        context: validated.context
      }
    );

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        tenantId: validated.tenantId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    logger.error('Correction learning failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to learn from correction'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

// ============================================================================
// FEEDBACK LEARNING
// ============================================================================

/**
 * POST /api/training/feedback
 * Learn from user feedback
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const validated = FeedbackPayloadSchema.parse(req.body);

    const result = await learner.learnFromFeedback(
      {
        type: validated.type,
        score: validated.score,
        content: validated.content,
        itemType: validated.itemType,
        itemId: validated.itemId
      },
      {
        tenantId: validated.tenantId,
        userId: validated.userId
      }
    );

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        tenantId: validated.tenantId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    logger.error('Feedback learning failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to learn from feedback'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

// ============================================================================
// SIGNAL PROCESSING
// ============================================================================

/**
 * POST /api/training/signal
 * Process a single signal event
 */
router.post('/signal', async (req: Request, res: Response) => {
  try {
    const validated = SignalEventSchema.parse(req.body);

    const result = await signalProcessor.processSignal(validated);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: result.error || 'Signal processing failed'
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        signalId: validated.signalId,
        patternId: result.patternId
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid signal data',
          details: error.errors
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    logger.error('Signal processing failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process signal'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

/**
 * POST /api/training/signal/batch
 * Process multiple signals in batch
 */
router.post('/signal/batch', async (req: Request, res: Response) => {
  try {
    const validated = BatchProcessSchema.parse(req.body);

    const result = await signalProcessor.processBatch(validated.signals);

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid batch data',
          details: error.errors
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    logger.error('Batch signal processing failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process signal batch'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

// ============================================================================
// QUERY ENDPOINTS
// ============================================================================

/**
 * GET /api/training/patterns
 * Query learned patterns
 */
router.get('/patterns', async (req: Request, res: Response) => {
  try {
    const query: QueryLearning = {
      tenantId: req.query.tenantId as string | undefined,
      userId: req.query.userId as string | undefined,
      type: req.query.type as QueryLearning['type'],
      source: req.query.source as QueryLearning['source'],
      stage: req.query.stage as QueryLearning['stage'],
      status: req.query.status as QueryLearning['status'],
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    };

    const result = await learner.getPatterns(query);

    res.status(200).json({
      success: true,
      data: result.patterns,
      pagination: {
        total: result.total,
        limit: query.limit,
        offset: query.offset,
        hasMore: result.hasMore
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        tenantId: query.tenantId
      }
    });
  } catch (error) {
    logger.error('Pattern query failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to query patterns'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

/**
 * GET /api/training/insights
 * Get learning insights
 */
router.get('/insights', async (req: Request, res: Response) => {
  try {
    const options = {
      tenantId: req.query.tenantId as string | undefined,
      userId: req.query.userId as string | undefined
    };

    const insights = await learner.getInsights(options);

    res.status(200).json({
      success: true,
      data: insights,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        tenantId: options.tenantId
      }
    });
  } catch (error) {
    logger.error('Insights query failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get insights'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

// ============================================================================
// BATCH TRAINING
// ============================================================================

/**
 * POST /api/training/batch
 * Run a training batch process
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const validated = BatchTrainingSchema.parse(req.body);

    const result = await learner.runTrainingBatch({
      tenantId: validated.tenantId,
      batchSize: validated.batchSize,
      minConfidence: validated.minConfidence
    });

    res.status(200).json({
      success: true,
      data: result,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4(),
        tenantId: validated.tenantId
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid batch configuration',
          details: error.errors
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || uuidv4()
        }
      });
      return;
    }

    logger.error('Batch training failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to run training batch'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

// ============================================================================
// MAINTENANCE
// ============================================================================

/**
 * POST /api/training/archive
 * Archive old patterns
 */
router.post('/archive', async (req: Request, res: Response) => {
  try {
    const olderThanDays = req.body.olderThanDays || 90;
    const count = await learner.archiveOldPatterns(olderThanDays);

    res.status(200).json({
      success: true,
      data: { archivedCount: count },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  } catch (error) {
    logger.error('Archive failed', { error: error instanceof Error ? error.message : 'Unknown' });
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to archive patterns'
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || uuidv4()
      }
    });
  }
});

export default router;
