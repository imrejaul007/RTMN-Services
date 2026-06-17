import { Router, Request, Response } from 'express';
import {
  getWebhookById,
  getAllWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  CreateWebhookRequest,
  UpdateWebhookRequest,
} from '../models/Webhook';
import { signatureService } from '../services/signature';

const router = Router();

// GET /api/webhooks - List all webhooks
router.get('/', (req: Request, res: Response) => {
  try {
    const webhooks = getAllWebhooks();
    res.json({
      success: true,
      count: webhooks.length,
      data: webhooks.map(w => w.toJSON()),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhooks',
    });
  }
});

// GET /api/webhooks/:id - Get webhook by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const webhook = getWebhookById(req.params.id);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }
    res.json({
      success: true,
      data: webhook.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook',
    });
  }
});

// POST /api/webhooks - Create a new webhook
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateWebhookRequest = req.body;

    // Validate required fields
    if (!data.name || !data.url || !data.events || !Array.isArray(data.events)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, url, events (array)',
      });
    }

    // Validate URL format
    try {
      new URL(data.url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
      });
    }

    const webhook = createWebhook(data);
    res.status(201).json({
      success: true,
      data: webhook.toJSON(),
      message: 'Webhook created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create webhook',
    });
  }
});

// PUT /api/webhooks/:id - Update a webhook
router.put('/:id', (req: Request, res: Response) => {
  try {
    const data: UpdateWebhookRequest = req.body;

    // Validate URL format if provided
    if (data.url) {
      try {
        new URL(data.url);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format',
        });
      }
    }

    const webhook = updateWebhook(req.params.id, data);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }
    res.json({
      success: true,
      data: webhook.toJSON(),
      message: 'Webhook updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update webhook',
    });
  }
});

// PATCH /api/webhooks/:id/toggle - Enable/disable a webhook
router.patch('/:id/toggle', (req: Request, res: Response) => {
  try {
    const webhook = getWebhookById(req.params.id);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    webhook.update({ enabled: !webhook.enabled });
    res.json({
      success: true,
      data: webhook.toJSON(),
      message: `Webhook ${webhook.enabled ? 'enabled' : 'disabled'} successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to toggle webhook',
    });
  }
});

// DELETE /api/webhooks/:id - Delete a webhook
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteWebhook(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }
    res.json({
      success: true,
      message: 'Webhook deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
    });
  }
});

// POST /api/webhooks/:id/regenerate-secret - Regenerate webhook secret
router.post('/:id/regenerate-secret', (req: Request, res: Response) => {
  try {
    const webhook = getWebhookById(req.params.id);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    const newSecret = signatureService.generateSecret();
    webhook.update({ secret: newSecret });

    res.json({
      success: true,
      data: {
        secret: newSecret,
      },
      message: 'Webhook secret regenerated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate secret',
    });
  }
});

// POST /api/webhooks/:id/test - Test webhook delivery
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const webhook = getWebhookById(req.params.id);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    const { orchestrator } = await import('../services/orchestrator');
    const result = await orchestrator.deliverToWebhook(webhook, {
      type: 'webhook.test',
      payload: {
        message: 'This is a test webhook delivery',
        timestamp: new Date().toISOString(),
      },
      source: 'webhook-manager',
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send test webhook',
    });
  }
});

// GET /api/webhooks/:id/stats - Get webhook statistics
router.get('/:id/stats', (req: Request, res: Response) => {
  try {
    const webhook = getWebhookById(req.params.id);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    const totalAttempts = webhook.successCount + webhook.failureCount;
    const successRate = totalAttempts > 0
      ? ((webhook.successCount / totalAttempts) * 100).toFixed(2)
      : '0.00';

    res.json({
      success: true,
      data: {
        webhookId: webhook.id,
        successCount: webhook.successCount,
        failureCount: webhook.failureCount,
        totalAttempts,
        successRate: `${successRate}%`,
        lastTriggeredAt: webhook.lastTriggeredAt,
        enabled: webhook.enabled,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook stats',
    });
  }
});

export default router;
