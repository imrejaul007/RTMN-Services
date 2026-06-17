import { Router, Request, Response } from 'express';
import {
  getDeliveryById,
  getAllDeliveries,
  getDeliveriesByWebhook,
  getDeliveriesByEvent,
  getDeliveryStats,
  DeliveryStatus,
  DeliveryLog,
} from '../services/delivery';

const router = Router();

// GET /api/deliveries - List all delivery logs
router.get('/', (req: Request, res: Response) => {
  try {
    const webhookId = req.query.webhookId as string | undefined;
    const eventId = req.query.eventId as string | undefined;
    const status = req.query.status as DeliveryStatus | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    let deliveries: DeliveryLog[];

    if (webhookId) {
      deliveries = getDeliveriesByWebhook(webhookId);
    } else if (eventId) {
      deliveries = getDeliveriesByEvent(eventId);
    } else {
      deliveries = getAllDeliveries({ status, limit, offset });
    }

    res.json({
      success: true,
      count: deliveries.length,
      data: deliveries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch deliveries',
    });
  }
});

// GET /api/deliveries/:id - Get delivery by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const delivery = getDeliveryById(req.params.id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: 'Delivery not found',
      });
    }
    res.json({
      success: true,
      data: delivery,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery',
    });
  }
});

// POST /api/deliveries/:id/retry - Retry a failed delivery
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const delivery = getDeliveryById(req.params.id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        error: 'Delivery not found',
      });
    }

    if (delivery.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Only failed deliveries can be retried',
      });
    }

    const { deliveryService } = await import('../services/delivery');
    const result = await deliveryService.retryDelivery(req.params.id);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retry delivery',
    });
  }
});

// GET /api/deliveries/stats - Get delivery statistics
router.get('/stats/overview', (req: Request, res: Response) => {
  try {
    const stats = getDeliveryStats();

    // Calculate success rate
    const total = stats.totalDeliveries;
    const successRate = total > 0
      ? ((stats.successfulDeliveries / total) * 100).toFixed(2)
      : '0.00';

    // Average delivery time
    const avgDeliveryTime = stats.totalDeliveryTime > 0 && stats.successfulDeliveries > 0
      ? (stats.totalDeliveryTime / stats.successfulDeliveries).toFixed(2)
      : '0.00';

    res.json({
      success: true,
      data: {
        totalDeliveries: stats.totalDeliveries,
        successfulDeliveries: stats.successfulDeliveries,
        failedDeliveries: stats.failedDeliveries,
        pendingDeliveries: stats.pendingDeliveries,
        successRate: `${successRate}%`,
        averageDeliveryTimeMs: avgDeliveryTime,
        totalRetries: stats.totalRetries,
        byStatus: stats.byStatus,
        byWebhook: stats.byWebhook,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch delivery statistics',
    });
  }
});

// GET /api/deliveries/webhook/:webhookId - Get all deliveries for a webhook
router.get('/webhook/:webhookId', (req: Request, res: Response) => {
  try {
    const deliveries = getDeliveriesByWebhook(req.params.webhookId);
    res.json({
      success: true,
      count: deliveries.length,
      data: deliveries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook deliveries',
    });
  }
});

// GET /api/deliveries/event/:eventId - Get all deliveries for an event
router.get('/event/:eventId', (req: Request, res: Response) => {
  try {
    const deliveries = getDeliveriesByEvent(req.params.eventId);
    res.json({
      success: true,
      count: deliveries.length,
      data: deliveries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event deliveries',
    });
  }
});

// DELETE /api/deliveries/cleanup - Cleanup old delivery logs
router.delete('/cleanup', (req: Request, res: Response) => {
  try {
    const maxAge = req.query.maxAge
      ? parseInt(req.query.maxAge as string)
      : 7 * 24 * 60 * 60 * 1000; // Default: 7 days

    const { deliveryStore } = require('../services/delivery');
    const cutoffTime = Date.now() - maxAge;
    let deletedCount = 0;

    for (const [id, delivery] of deliveryStore.entries()) {
      if (delivery.completedAt && delivery.completedAt.getTime() < cutoffTime) {
        deliveryStore.delete(id);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old delivery logs`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup delivery logs',
    });
  }
});

export default router;
