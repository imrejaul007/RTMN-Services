import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

import { CONFIG } from './config';
import { logger, createChildLogger } from './utils/logger';
import { EventRouter } from './services/EventRouter';
import { SubscriptionManager } from './services/SubscriptionManager';
import { RedisConnection } from './services/RedisConnection';
import { EventPublisher, getEventPublisher } from './services/EventPublisher';
import { EventConsumer } from './services/EventConsumer';
import { DeadLetterQueue } from './services/DeadLetterQueue';
import { EventTypes, Channels } from './models/Event';

dotenv.config();

const log = createChildLogger('Main');
const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  log.debug(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip,
  });
  next();
});

// ==================== Health & Info Routes ====================

/**
 * Health check endpoint
 */
app.get('/health', async (req: Request, res: Response) => {
  const redis = await RedisConnection.getInstance();
  const router = EventRouter.getInstance();

  const response = {
    status: 'healthy',
    service: 'rez-event-bus',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    redis: redis.isHealthy(),
    uptime: redis.getUptime(),
    stats: router.getStats(),
  };

  res.json(response);
});

/**
 * Readiness probe
 */
app.get('/ready', (req: Request, res: Response) => {
  res.json({ ready: true });
});

/**
 * Liveness probe
 */
app.get('/live', (req: Request, res: Response) => {
  res.json({ alive: true });
});

// ==================== Event Publishing ====================

/**
 * Publish an event
 * POST /api/v1/events/publish
 */
app.post('/api/v1/events/publish', async (req: Request, res: Response) => {
  const { eventType, data, channel, correlationId, source } = req.body;

  if (!eventType || !data) {
    res.status(400).json({
      error: 'Missing required fields: eventType, data',
      code: 'INVALID_REQUEST',
    });
    return;
  }

  try {
    const publisher = await getEventPublisher();
    const targetChannel = channel || CONFIG.EVENT_STREAM;

    const messageId = await publisher.publish(targetChannel, eventType, data, {
      correlationId,
      source: source || 'api',
    });

    res.json({
      success: true,
      messageId,
      channel: targetChannel,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error('Failed to publish event:', error);
    res.status(500).json({
      error: error.message,
      code: 'PUBLISH_ERROR',
    });
  }
});

/**
 * Publish batch events
 * POST /api/v1/events/publish/batch
 */
app.post('/api/v1/events/publish/batch', async (req: Request, res: Response) => {
  const { events, channel } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({
      error: 'Invalid request: events must be a non-empty array',
      code: 'INVALID_REQUEST',
    });
    return;
  }

  try {
    const publisher = await getEventPublisher();
    const targetChannel = channel || CONFIG.EVENT_STREAM;

    const messageIds = await publisher.publishBatch(
      targetChannel,
      events.map((e: any) => ({
        eventType: e.eventType,
        data: e.data,
        options: {
          correlationId: e.correlationId,
          source: e.source || 'api',
        },
      }))
    );

    res.json({
      success: true,
      published: messageIds.length,
      messageIds,
      channel: targetChannel,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    log.error('Failed to publish batch events:', error);
    res.status(500).json({
      error: error.message,
      code: 'BATCH_PUBLISH_ERROR',
    });
  }
});

// ==================== Subscription Management ====================

/**
 * Create a subscription
 * POST /api/v1/events/subscribe
 */
app.post('/api/v1/events/subscribe', async (req: Request, res: Response) => {
  const { channel, pattern, callback } = req.body;

  if (!channel) {
    res.status(400).json({
      error: 'Missing required field: channel',
      code: 'INVALID_REQUEST',
    });
    return;
  }

  try {
    const subscriptionManager = SubscriptionManager.getInstance();
    const subscriptionId = await subscriptionManager.subscribe(channel, callback || '', pattern);

    res.json({
      success: true,
      subscriptionId,
      channel,
      pattern: pattern || '*',
    });
  } catch (error: any) {
    log.error('Failed to create subscription:', error);
    res.status(500).json({
      error: error.message,
      code: 'SUBSCRIBE_ERROR',
    });
  }
});

/**
 * Remove a subscription
 * DELETE /api/v1/events/subscribe/:id
 */
app.delete('/api/v1/events/subscribe/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const subscriptionManager = SubscriptionManager.getInstance();
    const deleted = await subscriptionManager.unsubscribe(id);

    if (deleted) {
      res.json({ success: true, message: `Subscription ${id} removed` });
    } else {
      res.status(404).json({
        error: 'Subscription not found',
        code: 'NOT_FOUND',
      });
    }
  } catch (error: any) {
    log.error('Failed to remove subscription:', error);
    res.status(500).json({
      error: error.message,
      code: 'UNSUBSCRIBE_ERROR',
    });
  }
});

/**
 * List subscriptions
 * GET /api/v1/events/subscriptions
 */
app.get('/api/v1/events/subscriptions', (req: Request, res: Response) => {
  const { channel } = req.query;
  const subscriptionManager = SubscriptionManager.getInstance();
  const subscriptions = subscriptionManager.getSubscriptions(channel as string);

  res.json({
    count: subscriptions.length,
    subscriptions,
  });
});

// ==================== Webhook Management ====================

/**
 * Create a webhook
 * POST /api/v1/webhooks
 */
app.post('/api/v1/webhooks', async (req: Request, res: Response) => {
  const { patterns, callbackUrl, headers } = req.body;

  if (!Array.isArray(patterns) || !callbackUrl) {
    res.status(400).json({
      error: 'Invalid request: patterns (array) and callbackUrl are required',
      code: 'INVALID_REQUEST',
    });
    return;
  }

  try {
    const subscriptionManager = SubscriptionManager.getInstance();
    const webhookId = await subscriptionManager.addWebhook(patterns, callbackUrl, headers);

    res.json({
      success: true,
      webhookId,
      patterns,
      callbackUrl,
    });
  } catch (error: any) {
    log.error('Failed to create webhook:', error);
    res.status(500).json({
      error: error.message,
      code: 'WEBHOOK_ERROR',
    });
  }
});

/**
 * Delete a webhook
 * DELETE /api/v1/webhooks/:id
 */
app.delete('/api/v1/webhooks/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const subscriptionManager = SubscriptionManager.getInstance();
  const deleted = subscriptionManager.removeWebhook(id);

  if (deleted) {
    res.json({ success: true, message: `Webhook ${id} removed` });
  } else {
    res.status(404).json({
      error: 'Webhook not found',
      code: 'NOT_FOUND',
    });
  }
});

/**
 * List webhooks
 * GET /api/v1/webhooks
 */
app.get('/api/v1/webhooks', (req: Request, res: Response) => {
  const subscriptionManager = SubscriptionManager.getInstance();
  const webhooks = subscriptionManager.getAllWebhooks();

  res.json({
    count: webhooks.length,
    webhooks,
  });
});

// ==================== Statistics & Monitoring ====================

/**
 * Get event bus statistics
 * GET /api/v1/events/stats
 */
app.get('/api/v1/events/stats', async (req: Request, res: Response) => {
  const router = EventRouter.getInstance();
  const subscriptionManager = SubscriptionManager.getInstance();

  const redis = await RedisConnection.getInstance();

  const [eventStreamLength, dlqLength] = await Promise.all([
    redis.getStreamLength(CONFIG.EVENT_STREAM),
    redis.getStreamLength(CONFIG.DLQ_STREAM),
  ]);

  res.json({
    router: router.getStats(),
    subscriptions: subscriptionManager.getStats(),
    streams: {
      eventStream: {
        name: CONFIG.EVENT_STREAM,
        length: eventStreamLength,
      },
      dlqStream: {
        name: CONFIG.DLQ_STREAM,
        length: dlqLength,
      },
    },
    config: {
      port: CONFIG.PORT,
      redisUrl: CONFIG.REDIS_URL,
      nodeEnv: CONFIG.NODE_ENV,
    },
  });
});

/**
 * Reset statistics
 * POST /api/v1/events/stats/reset
 */
app.post('/api/v1/events/stats/reset', (req: Request, res: Response) => {
  const router = EventRouter.getInstance();
  router.resetStats();
  res.json({ success: true, message: 'Statistics reset' });
});

// ==================== Dead Letter Queue ====================

/**
 * Get DLQ messages
 * GET /api/v1/dlq
 */
app.get('/api/v1/dlq', async (req: Request, res: Response) => {
  const { limit } = req.query;

  try {
    const dlq = new DeadLetterQueue();
    await dlq.initialize();
    const messages = await dlq.getMessages(parseInt(limit as string, 10) || 10);

    res.json({
      count: messages.length,
      messages,
    });
  } catch (error: any) {
    log.error('Failed to get DLQ messages:', error);
    res.status(500).json({
      error: error.message,
      code: 'DLQ_ERROR',
    });
  }
});

/**
 * Retry a DLQ message
 * POST /api/v1/dlq/:messageId/retry
 */
app.post('/api/v1/dlq/:messageId/retry', async (req: Request, res: Response) => {
  const { messageId } = req.params;
  const { channel } = req.body;

  try {
    const dlq = new DeadLetterQueue();
    await dlq.initialize();
    const success = await dlq.retry(messageId, channel);

    if (success) {
      res.json({ success: true, message: `Message ${messageId} retried` });
    } else {
      res.status(400).json({
        error: 'Retry failed - message not found or max retries exceeded',
        code: 'RETRY_FAILED',
      });
    }
  } catch (error: any) {
    log.error('Failed to retry DLQ message:', error);
    res.status(500).json({
      error: error.message,
      code: 'DLQ_RETRY_ERROR',
    });
  }
});

/**
 * Retry all DLQ messages
 * POST /api/v1/dlq/retry-all
 */
app.post('/api/v1/dlq/retry-all', async (req: Request, res: Response) => {
  const { channel } = req.body;

  try {
    const dlq = new DeadLetterQueue();
    await dlq.initialize();
    const result = await dlq.retryAll(channel);

    res.json({
      success: true,
      retried: result.success,
      failed: result.failed,
    });
  } catch (error: any) {
    log.error('Failed to retry all DLQ messages:', error);
    res.status(500).json({
      error: error.message,
      code: 'DLQ_RETRY_ALL_ERROR',
    });
  }
});

/**
 * Clear DLQ
 * DELETE /api/v1/dlq
 */
app.delete('/api/v1/dlq', async (req: Request, res: Response) => {
  try {
    const dlq = new DeadLetterQueue();
    await dlq.initialize();
    const count = await dlq.clear();

    res.json({
      success: true,
      cleared: count,
    });
  } catch (error: any) {
    log.error('Failed to clear DLQ:', error);
    res.status(500).json({
      error: error.message,
      code: 'DLQ_CLEAR_ERROR',
    });
  }
});

/**
 * Get DLQ stats
 * GET /api/v1/dlq/stats
 */
app.get('/api/v1/dlq/stats', async (req: Request, res: Response) => {
  try {
    const dlq = new DeadLetterQueue();
    await dlq.initialize();
    const stats = await dlq.getStats();

    res.json(stats);
  } catch (error: any) {
    log.error('Failed to get DLQ stats:', error);
    res.status(500).json({
      error: error.message,
      code: 'DLQ_STATS_ERROR',
    });
  }
});

// ==================== Event Types Reference ====================

/**
 * Get available event types
 * GET /api/v1/events/types
 */
app.get('/api/v1/events/types', (req: Request, res: Response) => {
  res.json({
    eventTypes: EventTypes,
    channels: Channels,
  });
});

// ==================== WebSocket Events ====================

io.on('connection', (socket) => {
  log.info(`Socket connected: ${socket.id}`);

  /**
   * Subscribe to a channel
   * socket.emit('subscribe', 'channel_name')
   */
  socket.on('subscribe', (channel: string) => {
    socket.join(channel);
    log.info(`Socket ${socket.id} subscribed to ${channel}`);
    socket.emit('subscribed', { channel });
  });

  /**
   * Unsubscribe from a channel
   * socket.emit('unsubscribe', 'channel_name')
   */
  socket.on('unsubscribe', (channel: string) => {
    socket.leave(channel);
    log.info(`Socket ${socket.id} unsubscribed from ${channel}`);
    socket.emit('unsubscribed', { channel });
  });

  /**
   * Publish an event
   * socket.emit('publish', { channel, eventType, data })
   */
  socket.on('publish', async (payload: { channel?: string; eventType: string; data: any }) => {
    try {
      const publisher = await getEventPublisher();
      const channel = payload.channel || CONFIG.EVENT_STREAM;
      const messageId = await publisher.publish(channel, payload.eventType, payload.data);

      socket.emit('published', { messageId, channel, eventType: payload.eventType });
    } catch (error: any) {
      socket.emit('error', { message: error.message });
    }
  });

  /**
   * Request stats
   * socket.emit('stats')
   */
  socket.on('stats', () => {
    const router = EventRouter.getInstance();
    socket.emit('stats', router.getStats());
  });

  socket.on('disconnect', (reason) => {
    log.info(`Socket disconnected: ${socket.id}`, { reason });
  });
});

// ==================== Error Handling ====================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    code: 'NOT_FOUND',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  log.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    message: CONFIG.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ==================== Server Startup ====================

async function start(): Promise<void> {
  try {
    log.info('Starting REZ Event Bus...');

    // Initialize Redis connection
    const redis = await RedisConnection.getInstance();
    log.info('Redis connected');

    // Initialize SubscriptionManager
    const subscriptionManager = SubscriptionManager.getInstance();
    await subscriptionManager.initialize();

    // Initialize EventPublisher
    await getEventPublisher();

    // Setup EventRouter with Socket.IO
    const eventRouter = EventRouter.getInstance();
    eventRouter.setIO(io);

    // Start the HTTP server
    httpServer.listen(CONFIG.PORT, () => {
      log.info(`REZ Event Bus started on port ${CONFIG.PORT}`);
      log.info(`Health check: http://localhost:${CONFIG.PORT}/health`);
      log.info(`API docs: http://localhost:${CONFIG.PORT}/api/v1/events/types`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      log.info(`Received ${signal}, shutting down gracefully...`);

      httpServer.close(() => {
        log.info('HTTP server closed');
      });

      await subscriptionManager.shutdown();
      await redis.disconnect();

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    log.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, httpServer, io };