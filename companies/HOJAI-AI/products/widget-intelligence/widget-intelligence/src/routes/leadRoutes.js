/**
 * Widget Intelligence - Lead Routes
 *
 * Endpoints:
 * - POST /api/intelligence/lead-score
 * - POST /api/intelligence/signal
 * - GET /api/intelligence/lead/:visitorId
 */

import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { calculateLeadScore, storeSignal, SIGNAL_WEIGHTS } from '../index.js';
import { logger } from '../logger.js';

const router = Router();

// Validation schemas
const signalSchema = z.object({
  visitorId: z.string().min(1).max(255),
  type: z.enum([
    'pricing_visit', 'product_view', 'add_to_cart', 'checkout_start',
    'repeat_visit', 'email_subscribe', 'whatsapp_click',
    'compare_products', 'download_pdf', 'exit_intent',
  ]),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

const leadScoreRequestSchema = z.object({
  visitorId: z.string().min(1).max(255),
  recalculate: z.boolean().optional().default(false),
});

/**
 * POST /api/intelligence/lead-score
 * Get or recalculate lead score for a visitor
 */
router.post('/lead-score', async (req, res, next) => {
  try {
    const validation = leadScoreRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { visitorId, recalculate } = validation.data;

    // Always calculate fresh for accurate recency
    const leadScore = calculateLeadScore(visitorId);

    logger.info({
      event: 'lead_score_calculated',
      visitorId,
      score: leadScore.score,
      tier: leadScore.tier,
    });

    res.json({
      success: true,
      data: leadScore,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/intelligence/signal
 * Record a visitor signal
 */
router.post('/signal', async (req, res, next) => {
  try {
    const validation = signalSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { visitorId, type, sessionId, metadata } = validation.data;

    // Store the signal
    const signal = storeSignal(visitorId, { type, sessionId, metadata });

    // Calculate updated lead score
    const leadScore = calculateLeadScore(visitorId);

    logger.info({
      event: 'signal_recorded',
      visitorId,
      signalType: type,
      signalId: signal.id,
      newScore: leadScore.score,
    });

    res.status(201).json({
      success: true,
      data: {
        signal,
        leadScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/intelligence/signals/batch
 * Record multiple signals at once
 */
router.post('/signals/batch', async (req, res, next) => {
  try {
    const batchSchema = z.object({
      visitorId: z.string().min(1).max(255),
      signals: z.array(
        z.object({
          type: signalSchema.shape.type,
          sessionId: z.string().optional(),
          metadata: z.record(z.any()).optional(),
        })
      ).min(1).max(50),
    });

    const validation = batchSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const { visitorId, signals } = validation.data;
    const storedSignals = [];

    for (const signalData of signals) {
      const signal = storeSignal(visitorId, signalData);
      storedSignals.push(signal);
    }

    const leadScore = calculateLeadScore(visitorId);

    logger.info({
      event: 'signals_batch_recorded',
      visitorId,
      count: signals.length,
      newScore: leadScore.score,
    });

    res.status(201).json({
      success: true,
      data: {
        signals: storedSignals,
        leadScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/intelligence/lead/:visitorId
 * Get complete lead profile for a visitor
 */
router.get('/lead/:visitorId', async (req, res, next) => {
  try {
    const { visitorId } = req.params;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({
        error: 'Invalid visitor ID',
      });
    }

    const leadScore = calculateLeadScore(visitorId);

    // Get available signals
    const signals = leadScore.signals;

    res.json({
      success: true,
      data: {
        visitorId,
        score: leadScore.score,
        tier: leadScore.tier,
        velocity: leadScore.velocity,
        recency: leadScore.recency,
        breakdown: leadScore.breakdown,
        lastSignal: leadScore.lastSignal,
        signalCount: signals.length,
        recentSignals: signals.slice(-10), // Last 10 signals
        signalWeights: SIGNAL_WEIGHTS,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/intelligence/signals/:visitorId
 * Get all signals for a visitor
 */
router.get('/signals/:visitorId', async (req, res, next) => {
  try {
    const { visitorId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({
        error: 'Invalid visitor ID',
      });
    }

    const leadScore = calculateLeadScore(visitorId);
    const signals = leadScore.signals;

    const paginatedSignals = signals.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    );

    res.json({
      success: true,
      data: {
        visitorId,
        total: signals.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        signals: paginatedSignals,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/intelligence/weights
 * Get current signal weights configuration
 */
router.get('/weights', (req, res) => {
  res.json({
    success: true,
    data: {
      weights: SIGNAL_WEIGHTS,
      velocityRules: {
        '3+ signals in 1 hour': 1.5,
        '5+ signals in 1 day': 1.3,
      },
      recencyRules: {
        '< 1 hour': 1.2,
        '< 24 hours': 1.0,
        '< 7 days': 0.8,
        '> 7 days': 0.5,
      },
    },
  });
});

export default router;