/**
 * HOJAI Marketing Intelligence - Marketing Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { campaignService } from '../services/campaignService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();
router.use(tenantMiddleware());

const CampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['email', 'sms', 'push', 'whatsapp', 'social', 'display']),
  targeting: z.object({
    segments: z.array(z.string()).optional(),
    userIds: z.array(z.string()).optional()
  }).optional(),
  content: z.object({
    subject: z.string().optional(),
    headline: z.string().optional(),
    body: z.string().optional(),
    cta: z.string().optional()
  }).optional()
});

/**
 * GET /api/campaigns
 */
router.get('/campaigns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { status, type } = req.query;
    const campaigns = await campaignService.listCampaigns(tenantId, { status: status as string, type: type as string });
    res.json(createResponse({ campaigns }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * POST /api/campaigns
 */
router.post('/campaigns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const validation = CampaignSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'Invalid data', { errors: validation.error.issues }));
    }
    const campaign = await campaignService.createCampaign(tenantId, validation.data);
    res.json(createResponse({ campaign }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * GET /api/campaigns/:campaignId
 */
router.get('/campaigns/:campaignId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const campaign = await campaignService.getCampaign(tenantId, req.params.campaignId);
    if (!campaign) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Campaign not found'));
    res.json(createResponse({ campaign }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * PATCH /api/campaigns/:campaignId
 */
router.patch('/campaigns/:campaignId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const campaign = await campaignService.updateCampaign(tenantId, req.params.campaignId, req.body);
    if (!campaign) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Campaign not found'));
    res.json(createResponse({ campaign }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * GET /api/campaigns/:campaignId/analytics
 */
router.get('/campaigns/:campaignId/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const analytics = await campaignService.getCampaignAnalytics(tenantId, req.params.campaignId);
    if (!analytics) return res.status(404).json(createErrorResponse('NOT_FOUND', 'Campaign not found'));
    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * POST /api/campaigns/:campaignId/events
 */
router.post('/campaigns/:campaignId/events', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId, type, metadata } = req.body;
    if (!userId || !type) return res.status(400).json(createErrorResponse('VALIDATION_ERROR', 'userId and type required'));
    await campaignService.recordEvent(tenantId, req.params.campaignId, userId, type, metadata);
    res.json(createResponse({ recorded: true }, { tenantId }));
  } catch (error) { next(error); }
});

/**
 * GET /api/analytics
 */
router.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const period = (req.query.period as string) || 'month';
    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'week') startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === 'day') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const analytics = await campaignService.getAnalytics(tenantId, period, startDate, now);
    res.json(createResponse({ analytics }, { tenantId }));
  } catch (error) { next(error); }
});

export default router;
