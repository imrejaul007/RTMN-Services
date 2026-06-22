// ============================================
// HOJAI AI - SDR Agent Outreach Routes
// ============================================

import { Router, Request, Response } from 'express';
import { outreachEngine } from '../services/outreachEngine';
import { requireInternalAuth, extractTenant } from '../middleware/auth';
import {
  validateBody,
  OutreachMessageSchema,
  successResponse,
  errorResponse
} from '../utils/validation';
import { logger } from '../utils/logger';
import { OutreachStatus, OutreachChannel } from '../types';

const router = Router();

// Apply middleware
router.use(extractTenant);
router.use(requireInternalAuth);

/**
 * POST /api/outreach/send
 * Send outreach message to a lead
 */
router.post('/send',
  async (req: Request, res: Response) => {
    try {
      const { tenantId, userId } = req;
      const { leadId, channel, message, scheduleFor } = req.body;

      if (!leadId) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'leadId is required'
        ));
      }

      if (!message || !message.body) {
        return res.status(400).json(errorResponse(
          'VALIDATION_ERROR',
          'message.body is required'
        ));
      }

      const channelEnum = channel as OutreachChannel;
      const result = await outreachEngine.sendOutreach(
        tenantId!,
        leadId,
        channelEnum,
        {
          body: message.body,
          subject: message.subject,
          templateId: message.templateId,
          personalization: message.personalization,
          attachments: message.attachments
        },
        scheduleFor,
        userId
      );

      if (!result.success) {
        return res.status(400).json(errorResponse(
          'OUTREACH_FAILED',
          result.error || 'Failed to send outreach'
        ));
      }

      res.status(201).json(successResponse({
        outreach: result.outreach
      }, 'Outreach sent successfully'));
    } catch (error) {
      logger.error('Failed to send outreach', { error, tenantId: req.tenantId });
      res.status(500).json(errorResponse(
        'OUTREACH_SEND_FAILED',
        'Failed to send outreach',
        error instanceof Error ? error.message : undefined
      ));
    }
  }
);

/**
 * GET /api/outreach/lead/:leadId
 * Get outreach history for a lead
 */
router.get('/lead/:leadId', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;
    const { leadId } = req.params;

    const history = await outreachEngine.getOutreachHistory(tenantId!, leadId);

    res.json(successResponse({
      outreach: history
    }));
  } catch (error) {
    logger.error('Failed to get outreach history', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'OUTREACH_HISTORY_FAILED',
      'Failed to get outreach history'
    ));
  }
});

/**
 * PUT /api/outreach/:id/status
 * Update outreach status (webhook handler)
 */
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;
    const { status, metadata } = req.body;

    if (!status) {
      return res.status(400).json(errorResponse(
        'VALIDATION_ERROR',
        'status is required'
      ));
    }

    const statusEnum = status as OutreachStatus;
    const validStatuses = Object.values(OutreachStatus);

    if (!validStatuses.includes(statusEnum)) {
      return res.status(400).json(errorResponse(
        'VALIDATION_ERROR',
        `Invalid status. Valid values: ${validStatuses.join(', ')}`
      ));
    }

    const updated = await outreachEngine.updateOutreachStatus(
      tenantId!,
      id,
      statusEnum,
      metadata
    );

    if (!updated) {
      return res.status(404).json(errorResponse('NOT_FOUND', 'Outreach not found'));
    }

    res.json(successResponse({
      outreach: updated
    }, 'Outreach status updated'));
  } catch (error) {
    logger.error('Failed to update outreach status', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'OUTREACH_STATUS_UPDATE_FAILED',
      'Failed to update outreach status'
    ));
  }
});

/**
 * GET /api/outreach/templates
 * Get available outreach templates
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    // Return default templates
    const templates = [
      {
        id: 'cold-email-intro',
        name: 'Cold Email Introduction',
        channel: 'email',
        subject: 'Quick question about {{company}}',
        variables: ['firstName', 'company', 'industry']
      },
      {
        id: 'linkedin-connection',
        name: 'LinkedIn Connection Request',
        channel: 'linkedin',
        variables: ['firstName', 'company']
      },
      {
        id: 'follow-up-email',
        name: 'Follow-up Email',
        channel: 'email',
        subject: 'Following up on my note',
        variables: ['firstName', 'company']
      }
    ];

    res.json(successResponse({ templates }));
  } catch (error) {
    logger.error('Failed to get templates', { error });
    res.status(500).json(errorResponse(
      'TEMPLATES_FAILED',
      'Failed to get templates'
    ));
  }
});

/**
 * GET /api/outreach/stats
 * Get outreach statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req;

    // This would query the Outreach model for stats
    // For now, return placeholder data
    res.json(successResponse({
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalReplied: 0,
      bounceRate: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      avgReplyRate: 0,
      byChannel: {
        email: { sent: 0, opened: 0, clicked: 0, replied: 0 },
        linkedin: { sent: 0, opened: 0, clicked: 0, replied: 0 },
        phone: { calls: 0, answered: 0 },
        sms: { sent: 0, delivered: 0, replied: 0 },
        whatsapp: { sent: 0, delivered: 0, replied: 0 }
      }
    }));
  } catch (error) {
    logger.error('Failed to get outreach stats', { error, tenantId: req.tenantId });
    res.status(500).json(errorResponse(
      'STATS_FAILED',
      'Failed to get outreach statistics'
    ));
  }
});

export { router as outreachRoutes };
