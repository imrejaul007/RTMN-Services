/**
 * Signal Routes
 *
 * REST API endpoints for signal management.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { signalIngestionService } from '../services/SignalIngestionService.js';
import { authenticateAny } from '../middleware/auth.js';
import { asyncHandler, ValidationError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { httpRequestDuration } from '../services/metrics.js';
import { IntentSignalModel } from '../models/index.js';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const SignalSchema = z.object({
  source: z.string().min(1),
  sourceService: z.string().min(1),
  userId: z.string().min(1),
  eventType: z.string().min(1),
  category: z.string().min(1),
  intentKey: z.string().min(1),
  intentQuery: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
});

const BatchSignalSchema = z.object({
  signals: z.array(SignalSchema).min(1).max(1000),
});

// Valid sources
const VALID_SOURCES = [
  'buzzlocal',
  'airzy',
  'rez-menu-qr',
  'rez-now',
  'risacare',
  'corpperks',
];

// Valid event types
const VALID_EVENT_TYPES = [
  'search',
  'view',
  'wishlist',
  'cart_add',
  'checkout_start',
  'fulfilled',
];

// Valid categories
const VALID_CATEGORIES = [
  'DINING',
  'TRAVEL',
  'RETAIL',
  'HEALTHCARE',
  'GENERAL',
];

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/signals/ingest
 * Ingest a single intent signal
 */
router.post('/ingest', authenticateAny, asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Validate request body
  const validationResult = SignalSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError('Invalid signal data', validationResult.error.errors);
  }

  const signal = validationResult.data;

  // Validate source
  if (!VALID_SOURCES.includes(signal.source.toLowerCase())) {
    logger.warn('Unknown signal source', { source: signal.source });
  }

  // Validate event type
  if (!VALID_EVENT_TYPES.includes(signal.eventType.toLowerCase())) {
    throw new ValidationError(
      `Invalid event type: ${signal.eventType}. Valid types: ${VALID_EVENT_TYPES.join(', ')}`
    );
  }

  // Validate category
  if (!VALID_CATEGORIES.includes(signal.category.toUpperCase())) {
    throw new ValidationError(
      `Invalid category: ${signal.category}. Valid categories: ${VALID_CATEGORIES.join(', ')}`
    );
  }

  // Ingest the signal
  const result = await signalIngestionService.ingestSignal(signal);

  // Record metrics
  const duration = (Date.now() - startTime) / 1000;
  httpRequestDuration.observe({ method: 'POST', route: '/api/signals/ingest' }, duration);

  if (result.duplicate) {
    res.status(200).json({
      success: true,
      signalId: result.signalId,
      message: 'Duplicate signal ignored',
      duplicate: true,
    });
  } else if (result.success) {
    res.status(201).json({
      success: true,
      signalId: result.signalId,
      message: 'Signal ingested successfully',
    });
  } else {
    res.status(400).json({
      success: false,
      error: result.error || 'Failed to ingest signal',
    });
  }
}));

/**
 * POST /api/signals/batch
 * Batch ingest multiple signals
 */
router.post('/batch', authenticateAny, asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();

  // Validate request body
  const validationResult = BatchSignalSchema.safeParse(req.body);
  if (!validationResult.success) {
    throw new ValidationError('Invalid batch data', validationResult.error.errors);
  }

  const { signals } = validationResult.data;
  logger.info('Batch signal ingestion request', { count: signals.length });

  // Ingest batch
  const result = await signalIngestionService.batchIngest(signals);

  // Record metrics
  const duration = (Date.now() - startTime) / 1000;
  httpRequestDuration.observe({ method: 'POST', route: '/api/signals/batch' }, duration);

  const statusCode = result.failed > 0 ? 207 : 201;
  res.status(statusCode).json({
    success: result.success,
    processed: result.processed,
    duplicates: result.duplicates,
    failed: result.failed,
    signalIds: result.signalIds,
    errors: result.errors,
  });
}));

/**
 * GET /api/signals/stats
 * Get aggregation statistics
 */
router.get('/stats', authenticateAny, asyncHandler(async (_req: Request, res: Response) => {
  const stats = await signalIngestionService.getStats();
  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * GET /api/signals/user/:userId
 * Get user signal history
 */
router.get('/user/:userId', authenticateAny, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const offset = parseInt(req.query.offset as string) || 0;

  if (!userId) {
    throw new ValidationError('User ID is required');
  }

  const signals = await signalIngestionService.getUserSignals(userId, limit, offset);

  res.json({
    success: true,
    data: {
      signals: signals.map((s) => ({
        signalId: s.signalId,
        source: s.source,
        sourceService: s.sourceService,
        eventType: s.eventType,
        category: s.category,
        intentKey: s.intentKey,
        intentQuery: s.intentQuery,
        confidence: s.confidence,
        enriched: s.enriched,
        timestamp: s.timestamp,
        metadata: s.metadata,
      })),
      pagination: {
        limit,
        offset,
        count: signals.length,
      },
    },
  });
}));

/**
 * GET /api/signals/source/:source
 * Get signals by source
 */
router.get('/source/:source', authenticateAny, asyncHandler(async (req: Request, res: Response) => {
  const { source } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
  const offset = parseInt(req.query.offset as string) || 0;

  const signals = await IntentSignalModel.find({ source: source.toLowerCase() })
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  res.json({
    success: true,
    data: {
      signals: signals.map((s) => ({
        signalId: s.signalId,
        userId: s.userId,
        eventType: s.eventType,
        category: s.category,
        intentKey: s.intentKey,
        timestamp: s.timestamp,
      })),
      pagination: {
        limit,
        offset,
        count: signals.length,
      },
    },
  });
}));

/**
 * GET /api/signals/:signalId
 * Get a specific signal by ID
 */
router.get('/:signalId', authenticateAny, asyncHandler(async (req: Request, res: Response) => {
  const { signalId } = req.params;

  const signal = await IntentSignalModel.findOne({ signalId }).lean();

  if (!signal) {
    res.status(404).json({
      success: false,
      error: 'Signal not found',
    });
    return;
  }

  res.json({
    success: true,
    data: signal,
  });
}));

export default router;