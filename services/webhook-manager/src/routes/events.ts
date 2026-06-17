import { Router, Request, Response } from 'express';
import {
  getEventById,
  getAllEvents,
  createEvent,
  createSubscription,
  getSubscriptionById,
  getSubscriptionsByWebhook,
  deleteSubscription,
  getAllEventTypes,
  registerEventType,
  WebhookEventModel,
  EventStatus,
  CreateEventRequest,
  CreateSubscriptionRequest,
} from '../models/Event';
import { getWebhookById, getWebhooksByEvent } from '../models/Webhook';
import { orchestrator } from '../services/orchestrator';

const router = Router();

// GET /api/events - List all events
router.get('/', (req: Request, res: Response) => {
  try {
    const type = req.query.type as string | undefined;
    const status = req.query.status as EventStatus | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

    const events = getAllEvents({ type, status, limit, offset });
    res.json({
      success: true,
      count: events.length,
      data: events.map(e => e.toJSON()),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch events',
    });
  }
});

// GET /api/events/types - List registered event types
router.get('/types', (req: Request, res: Response) => {
  try {
    const eventTypes = getAllEventTypes();
    res.json({
      success: true,
      count: eventTypes.length,
      data: eventTypes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event types',
    });
  }
});

// POST /api/events/types - Register a new event type
router.post('/types', (req: Request, res: Response) => {
  try {
    const { eventType } = req.body;
    if (!eventType) {
      return res.status(400).json({
        success: false,
        error: 'eventType is required',
      });
    }

    registerEventType(eventType);
    res.status(201).json({
      success: true,
      message: `Event type '${eventType}' registered successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to register event type',
    });
  }
});

// GET /api/events/:id - Get event by ID
router.get('/:id', (req: Request, res: Response) => {
  try {
    const event = getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }
    res.json({
      success: true,
      data: event.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event',
    });
  }
});

// POST /api/events - Create and dispatch an event
router.post('/', async (req: Request, res: Response) => {
  try {
    const data: CreateEventRequest = req.body;

    if (!data.type || !data.payload) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: type, payload',
      });
    }

    // Register the event type if not already registered
    registerEventType(data.type);

    // Create the event
    const event = createEvent(data);

    // Find matching webhooks and dispatch
    const matchingWebhooks = getWebhooksByEvent(data.type);
    const deliveryResults = await orchestrator.dispatchEvent(event, matchingWebhooks);

    res.status(201).json({
      success: true,
      data: {
        event: event.toJSON(),
        deliveries: deliveryResults,
      },
      message: `Event dispatched to ${deliveryResults.length} webhook(s)`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create/dispatch event',
    });
  }
});

// POST /api/events/:id/retry - Retry failed event delivery
router.post('/:id/retry', async (req: Request, res: Response) => {
  try {
    const event = getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Event not found',
      });
    }

    if (event.status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Only failed events can be retried',
      });
    }

    const result = await orchestrator.retryEvent(event);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retry event',
    });
  }
});

// Subscriptions management

// GET /api/events/subscriptions - List all subscriptions
router.get('/subscriptions/list', (req: Request, res: Response) => {
  try {
    const webhookId = req.query.webhookId as string | undefined;
    let subscriptions;

    if (webhookId) {
      subscriptions = getSubscriptionsByWebhook(webhookId);
    } else {
      // Import getAllSubscriptions helper - need to add to model
      subscriptions = Array.from(
        (await import('../models/Event')).then(m => m.subscriptionStore.values())
      );
    }

    res.json({
      success: true,
      count: subscriptions.length,
      data: subscriptions.map((s: any) => s.toJSON()),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions',
    });
  }
});

// POST /api/events/subscriptions - Create a subscription
router.post('/subscriptions', (req: Request, res: Response) => {
  try {
    const data: CreateSubscriptionRequest = req.body;

    if (!data.webhookId || !data.eventTypes || !Array.isArray(data.eventTypes)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: webhookId, eventTypes (array)',
      });
    }

    // Verify webhook exists
    const webhook = getWebhookById(data.webhookId);
    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: 'Webhook not found',
      });
    }

    const subscription = createSubscription(data);
    res.status(201).json({
      success: true,
      data: subscription.toJSON(),
      message: 'Subscription created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
    });
  }
});

// GET /api/events/subscriptions/:id - Get subscription by ID
router.get('/subscriptions/:id', (req: Request, res: Response) => {
  try {
    const subscription = getSubscriptionById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }
    res.json({
      success: true,
      data: subscription.toJSON(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
    });
  }
});

// DELETE /api/events/subscriptions/:id - Delete a subscription
router.delete('/subscriptions/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteSubscription(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }
    res.json({
      success: true,
      message: 'Subscription deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete subscription',
    });
  }
});

// GET /api/events/stats - Get event statistics
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const events = getAllEvents();

    const stats = {
      total: events.length,
      pending: events.filter(e => e.status === 'pending').length,
      processing: events.filter(e => e.status === 'processing').length,
      delivered: events.filter(e => e.status === 'delivered').length,
      failed: events.filter(e => e.status === 'failed').length,
      retrying: events.filter(e => e.status === 'retrying').length,
    };

    // Event type breakdown
    const typeBreakdown: Record<string, number> = {};
    events.forEach(e => {
      typeBreakdown[e.type] = (typeBreakdown[e.type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        ...stats,
        typeBreakdown,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch event statistics',
    });
  }
});

export default router;
