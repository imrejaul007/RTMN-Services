/**
 * Widget Customer Twin - Routes
 *
 * Endpoints:
 * - POST /api/twin/:visitorId/signal
 * - POST /api/twin/:visitorId/identify
 * - GET /api/twin/:visitorId
 * - PATCH /api/twin/:visitorId/consent
 * - GET /api/twin/:visitorId/signals
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  getTwin,
  identifyVisitor,
  recordSignal,
  updateConsent,
  getSignalHistory,
} from '../index.js';
import { logger } from '../logger.js';

const router = Router();

// Validation schemas
const identitySchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().max(255).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  company: z.string().max(255).optional().nullable(),
  location: z.string().max(255).optional().nullable(),
  device: z.enum(['desktop', 'mobile', 'tablet']).optional().nullable(),
  browser: z.string().max(100).optional().nullable(),
  language: z.string().max(10).optional().nullable(),
});

const signalSchema = z.object({
  type: z.enum([
    'page_view',
    'product_view',
    'pricing_visit',
    'add_to_cart',
    'remove_from_cart',
    'checkout_start',
    'checkout_complete',
    'purchase',
    'email_subscribe',
    'whatsapp_click',
    'compare_products',
    'download_pdf',
    'exit_intent',
    'session_start',
    'session_end',
  ]),
  pageId: z.string().optional(),
  productId: z.string().optional(),
  categoryId: z.string().optional(),
  orderId: z.string().optional(),
  amount: z.number().optional(),
  items: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const consentSchema = z.object({
  marketing: z.boolean().optional(),
  whatsapp: z.boolean().optional(),
  dataRetention: z.number().min(30).max(3650).optional(),
  gdprConsent: z.boolean().optional(),
});

/**
 * POST /api/twin/:visitorId/identify
 * Identify a visitor with personal information
 */
router.post('/:visitorId/identify', async (req, res, next) => {
  try {
    const { visitorId } = req.params;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({ error: 'Invalid visitor ID' });
    }

    const validation = identitySchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const twin = identifyVisitor(visitorId, validation.data);

    logger.info({
      event: 'visitor_identified',
      visitorId,
      identified: twin.identity.identified,
    });

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/twin/:visitorId/signal
 * Record a behavioral signal
 */
router.post('/:visitorId/signal', async (req, res, next) => {
  try {
    const { visitorId } = req.params;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({ error: 'Invalid visitor ID' });
    }

    const validation = signalSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const twin = recordSignal(visitorId, validation.data);

    logger.info({
      event: 'signal_recorded',
      visitorId,
      signalType: validation.data.type,
      newScore: twin.signals.leadScore,
    });

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/twin/:visitorId/signals/batch
 * Record multiple signals at once
 */
router.post('/:visitorId/signals/batch', async (req, res, next) => {
  try {
    const { visitorId } = req.params;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({ error: 'Invalid visitor ID' });
    }

    const batchSchema = z.object({
      signals: z.array(signalSchema).min(1).max(50),
    });

    const validation = batchSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    for (const signal of validation.data.signals) {
      recordSignal(visitorId, signal);
    }

    const twin = getTwin(visitorId);

    res.json({
      success: true,
      data: {
        twin,
        signalsRecorded: validation.data.signals.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/twin/:visitorId
 * Get complete customer twin
 */
router.get('/:visitorId', async (req, res, next) => {
  try {
    const { visitorId } = req.params;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({ error: 'Invalid visitor ID' });
    }

    const twin = getTwin(visitorId);

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/twin/:visitorId/consent
 * Update consent preferences
 */
router.patch('/:visitorId/consent', async (req, res, next) => {
  try {
    const { visitorId } = req.params;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({ error: 'Invalid visitor ID' });
    }

    const validation = consentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const twin = updateConsent(visitorId, validation.data);

    logger.info({
      event: 'consent_updated',
      visitorId,
      consent: validation.data,
    });

    res.json({
      success: true,
      data: twin,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/twin/:visitorId/signals
 * Get signal history
 */
router.get('/:visitorId/signals', async (req, res, next) => {
  try {
    const { visitorId } = req.params;
    const { limit = 50, offset = 0, type } = req.query;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({ error: 'Invalid visitor ID' });
    }

    const history = getSignalHistory(visitorId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      type,
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/twin/:visitorId/summary
 * Get a summary view of the twin
 */
router.get('/:visitorId/summary', async (req, res, next) => {
  try {
    const { visitorId } = req.params;

    if (!visitorId || visitorId.length > 255) {
      return res.status(400).json({ error: 'Invalid visitor ID' });
    }

    const twin = getTwin(visitorId);

    // Return a summary view
    res.json({
      success: true,
      data: {
        visitorId: twin.visitorId,
        identified: twin.identity.identified,
        email: twin.identity.email,
        name: twin.identity.name,
        intentLevel: twin.signals.intentLevel,
        leadScore: twin.signals.leadScore,
        ltv: twin.signals.ltv,
        churnRisk: twin.signals.churnRisk,
        visitCount: twin.behavior.visitCount,
        totalSpent: twin.behavior.totalSpent,
        purchaseCount: twin.behavior.purchases.length,
        nextBestAction: twin.predictive.nextBestAction,
        engagementScore: twin.signals.engagementScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;