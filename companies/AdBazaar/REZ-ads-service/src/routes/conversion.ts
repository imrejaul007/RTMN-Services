/**
 * Conversion Routes
 *
 * Handles conversion tracking
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /conversion
 * Record a conversion
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId, adId, userId, orderId, value, currency } = req.body;

  if (!campaignId) {
    res.status(400).json({ success: false, error: 'campaignId required' });
    return;
  }

  const conversion = {
    conversionId: `conv_${Date.now()}`,
    campaignId,
    adId,
    userId,
    orderId,
    value: value || 0,
    currency: currency || 'INR',
    timestamp: new Date().toISOString(),
  };

  logger.info('[Conversion] Conversion recorded', { conversionId: conversion.conversionId, campaignId });

  res.json({ success: true, data: conversion });
}));

/**
 * GET /conversions/:campaignId
 * Get conversions for a campaign
 */
router.get('/:campaignId', asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const { startDate, endDate } = req.query;

  const conversions = {
    campaignId,
    total: 125,
    value: 62500,
    avgValue: 500,
    conversions: [
      { conversionId: 'conv_001', value: 450, timestamp: new Date().toISOString() },
    ],
  };

  res.json({ success: true, data: conversions });
}));

export default router;
