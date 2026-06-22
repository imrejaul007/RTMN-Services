// ============================================
// HOJAI AI - Marketing Agent Email Routes
// ============================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { campaignManager } from '../services/campaignManager';
import { EmailCampaign } from '../models';
import { validateBody, PaginationSchema, formatPaginatedResponse, getPaginationOptions } from '../utils/validation';
import { logger } from '../utils/logger';
import { EmailCampaignStatus } from '../types';

const router = Router();

// Validation schemas
const CreateEmailCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  subject: z.string().min(1).max(200),
  previewText: z.string().max(100).optional(),
  htmlContent: z.string().optional(),
  plainContent: z.string().optional(),
  templateId: z.string().optional(),
  recipientListId: z.string().optional(),
  segmentId: z.string().optional(),
  schedule: z.object({
    sendNow: z.boolean().default(true),
    scheduledFor: z.string().datetime().optional()
  }).optional()
});

const UpdateEmailCampaignSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  previewText: z.string().max(100).optional(),
  htmlContent: z.string().optional(),
  plainContent: z.string().optional()
});

const SendEmailCampaignSchema = z.object({
  sendNow: z.boolean().default(true),
  scheduledFor: z.string().datetime().optional()
});

const ListEmailCampaignsSchema = PaginationSchema.extend({
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed']).optional(),
  campaignId: z.string().uuid().optional()
}).omit({ sort: true, sortBy: true });

/**
 * POST /api/email/campaign
 * Create and optionally send an email campaign
 */
router.post('/campaign',
  validateBody(CreateEmailCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      // Create email campaign
      const emailCampaign = await EmailCampaign.create({
        tenantId,
        campaignId: req.body.campaignId,
        subject: req.body.subject,
        previewText: req.body.previewText,
        htmlContent: req.body.htmlContent,
        plainContent: req.body.plainContent,
        templateId: req.body.templateId,
        recipientListId: req.body.recipientListId,
        segmentId: req.body.segmentId,
        status: EmailCampaignStatus.DRAFT
      });

      // Send immediately if requested
      if (req.body.schedule?.sendNow) {
        await EmailCampaign.findByIdAndUpdate(emailCampaign._id, {
          status: EmailCampaignStatus.SENDING,
          scheduledFor: new Date()
        });

        // Simulate email sending
        setTimeout(async () => {
          await EmailCampaign.findByIdAndUpdate(emailCampaign._id, {
            status: EmailCampaignStatus.SENT,
            sentAt: new Date(),
            sentCount: Math.floor(Math.random() * 1000) + 100,
            deliveredCount: Math.floor(Math.random() * 900) + 90,
            openedCount: Math.floor(Math.random() * 300) + 30,
            clickedCount: Math.floor(Math.random() * 100) + 10
          });
        }, 2000);
      } else if (req.body.schedule?.scheduledFor) {
        await EmailCampaign.findByIdAndUpdate(emailCampaign._id, {
          status: EmailCampaignStatus.SCHEDULED,
          scheduledFor: new Date(req.body.schedule.scheduledFor)
        });
      }

      logger.info('Email campaign created', { tenantId, emailCampaignId: emailCampaign._id });

      res.json({
        success: true,
        data: {
          emailCampaign: {
            id: emailCampaign._id.toString(),
            campaignId: emailCampaign.campaignId,
            subject: emailCampaign.subject,
            status: emailCampaign.status,
            scheduledFor: emailCampaign.scheduledFor
          }
        }
      });
    } catch (error) {
      logger.error('Create email campaign failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create email campaign'
        }
      });
    }
  }
);

/**
 * GET /api/email/campaigns
 * List email campaigns
 */
router.get('/campaigns',
  validateBody(ListEmailCampaignsSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';
      const pagination = getPaginationOptions(req.body);

      const query: Record<string, unknown> = { tenantId };
      if (req.body.status) query.status = req.body.status;
      if (req.body.campaignId) query.campaignId = req.body.campaignId;

      const [docs, total] = await Promise.all([
        EmailCampaign.find(query)
          .sort({ createdAt: -1 })
          .skip(pagination.skip)
          .limit(pagination.limit)
          .lean(),
        EmailCampaign.countDocuments(query)
      ]);

      const items = docs.map(doc => ({
        id: doc._id.toString(),
        tenantId: doc.tenantId,
        campaignId: doc.campaignId.toString(),
        subject: doc.subject,
        previewText: doc.previewText,
        status: doc.status,
        sentCount: doc.sentCount,
        deliveredCount: doc.deliveredCount,
        openedCount: doc.openedCount,
        clickedCount: doc.clickedCount,
        scheduledFor: doc.scheduledFor,
        sentAt: doc.sentAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }));

      res.json(formatPaginatedResponse(
        items,
        total,
        (req.body.page || 1),
        (req.body.limit || 20)
      ));
    } catch (error) {
      logger.error('List email campaigns failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'LIST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list email campaigns'
        }
      });
    }
  }
);

/**
 * GET /api/email/campaigns/:id
 * Get email campaign by ID
 */
router.get('/campaigns/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const doc = await EmailCampaign.findOne({
      _id: req.params.id,
      tenantId
    }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Email campaign not found'
        }
      });
      return;
    }

    res.json({
      success: true,
      data: {
        id: doc._id.toString(),
        tenantId: doc.tenantId,
        campaignId: doc.campaignId.toString(),
        subject: doc.subject,
        previewText: doc.previewText,
        htmlContent: doc.htmlContent,
        plainContent: doc.plainContent,
        templateId: doc.templateId,
        recipientListId: doc.recipientListId,
        segmentId: doc.segmentId,
        status: doc.status,
        sentCount: doc.sentCount,
        deliveredCount: doc.deliveredCount,
        openedCount: doc.openedCount,
        clickedCount: doc.clickedCount,
        bouncedCount: doc.bouncedCount,
        unsubscribedCount: doc.unsubscribedCount,
        scheduledFor: doc.scheduledFor,
        sentAt: doc.sentAt,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt
      }
    });
  } catch (error) {
    logger.error('Get email campaign failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'GET_FAILED',
        message: error instanceof Error ? error.message : 'Failed to get email campaign'
      }
    });
  }
});

/**
 * PATCH /api/email/campaigns/:id
 * Update email campaign
 */
router.patch('/campaigns/:id',
  validateBody(UpdateEmailCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const doc = await EmailCampaign.findOneAndUpdate(
        {
          _id: req.params.id,
          tenantId,
          status: EmailCampaignStatus.DRAFT
        },
        {
          subject: req.body.subject,
          previewText: req.body.previewText,
          htmlContent: req.body.htmlContent,
          plainContent: req.body.plainContent
        },
        { new: true }
      );

      if (!doc) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Email campaign not found or cannot be modified'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: doc._id.toString(),
          subject: doc.subject,
          status: doc.status
        }
      });
    } catch (error) {
      logger.error('Update email campaign failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update email campaign'
        }
      });
    }
  }
);

/**
 * POST /api/email/campaigns/:id/send
 * Send email campaign
 */
router.post('/campaigns/:id/send',
  validateBody(SendEmailCampaignSchema),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.tenantId || 'default';

      const doc = await EmailCampaign.findOne({
        _id: req.params.id,
        tenantId
      });

      if (!doc) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Email campaign not found'
          }
        });
        return;
      }

      if (doc.status !== EmailCampaignStatus.DRAFT && doc.status !== EmailCampaignStatus.SCHEDULED) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Email campaign cannot be sent from current status'
          }
        });
        return;
      }

      // Update status to sending
      doc.status = EmailCampaignStatus.SENDING;
      if (req.body.scheduledFor) {
        doc.scheduledFor = new Date(req.body.scheduledFor);
      } else if (req.body.sendNow) {
        doc.scheduledFor = new Date();
      }
      await doc.save();

      // Simulate email sending (in production, this would call email provider)
      const sentCount = Math.floor(Math.random() * 1000) + 100;
      const deliveredCount = Math.floor(sentCount * 0.95);

      setTimeout(async () => {
        await EmailCampaign.findByIdAndUpdate(req.params.id, {
          status: EmailCampaignStatus.SENT,
          sentAt: new Date(),
          sentCount,
          deliveredCount,
          openedCount: Math.floor(deliveredCount * 0.25),
          clickedCount: Math.floor(deliveredCount * 0.05),
          bouncedCount: sentCount - deliveredCount
        });
      }, 2000);

      logger.info('Email campaign sending', { tenantId, emailCampaignId: req.params.id });

      res.json({
        success: true,
        data: {
          id: doc._id.toString(),
          status: EmailCampaignStatus.SENDING,
          message: 'Email campaign is being sent'
        }
      });
    } catch (error) {
      logger.error('Send email campaign failed', { error });
      res.status(500).json({
        success: false,
        error: {
          code: 'SEND_FAILED',
          message: error instanceof Error ? error.message : 'Failed to send email campaign'
        }
      });
    }
  }
);

/**
 * POST /api/email/campaigns/:id/cancel
 * Cancel email campaign
 */
router.post('/campaigns/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.tenantId || 'default';

    const doc = await EmailCampaign.findOneAndUpdate(
      {
        _id: req.params.id,
        tenantId,
        status: { $in: [EmailCampaignStatus.DRAFT, EmailCampaignStatus.SCHEDULED] }
      },
      { status: EmailCampaignStatus.FAILED },
      { new: true }
    );

    if (!doc) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CANCEL_FAILED',
          message: 'Email campaign cannot be cancelled'
        }
      });
      return;
    }

    logger.info('Email campaign cancelled', { tenantId, emailCampaignId: req.params.id });

    res.json({
      success: true,
      data: {
        id: doc._id.toString(),
        status: doc.status
      }
    });
  } catch (error) {
    logger.error('Cancel email campaign failed', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CANCEL_FAILED',
        message: error instanceof Error ? error.message : 'Failed to cancel email campaign'
      }
    });
  }
});

export { router as emailRoutes };
