import logger from 'utils/logger.js';

/**
 * BullMQ Workers
 *
 * Async job processing
 */

import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';

// Redis connection for BullMQ
const connection = new Redis({
  host: config.BULLMQ_REDIS_HOST,
  port: config.BULLMQ_REDIS_PORT
});

// ============================================
// QUEUES
// ============================================

// Event processing queue
export const eventQueue = new Queue('event-processing', { connection });

// Karma calculation queue
export const karmaQueue = new Queue('karma-calculation', { connection });

// Coin credit queue
export const coinQueue = new Queue('coin-credit', { connection });

// Notification queue
export const notificationQueue = new Queue('notifications', { connection });

// ============================================
// EVENT PROCESSING WORKER
// ============================================

export function startEventWorker() {
  const worker = new Worker(
    'event-processing',
    async (job: Job) => {
      logger.info(`[EventWorker] Processing job ${job.id}`);

      const { eventId, eventType, userId, data } = job.data;

      // Process the event
      // In real implementation, this would:
      // 1. Fetch event from database
      // 2. Evaluate rules
      // 3. Trigger actions
      // 4. Update event status

      logger.info(`[EventWorker] Processed event ${eventId}`);

      return { success: true, eventId };
    },
    { connection, concurrency: 5 }
  );

  worker.on('completed', (job) => {
    logger.info(`[EventWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[EventWorker] Job ${job?.id} failed:`, { error: err instanceof Error ? err.message : String(err) });
  });

  return worker;
}

// ============================================
// KARMA CALCULATION WORKER
// ============================================

export function startKarmaWorker() {
  const worker = new Worker(
    'karma-calculation',
    async (job: Job) => {
      logger.info(`[KarmaWorker] Processing job ${job.id}`);

      const { userId, action } = job.data;

      // Calculate karma based on action
      // In real implementation, this would:
      // 1. Fetch user karma data
      // 2. Calculate new karma score
      // 3. Update karma profile
      // 4. Update percentile ranking

      logger.info(`[KarmaWorker] Calculated karma for user ${userId}`);

      return { success: true, userId };
    },
    { connection, concurrency: 3 }
  );

  worker.on('completed', (job) => {
    logger.info(`[KarmaWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[KarmaWorker] Job ${job?.id} failed:`, { error: err instanceof Error ? err.message : String(err) });
  });

  return worker;
}

// ============================================
// COIN CREDIT WORKER
// ============================================

export function startCoinWorker() {
  const worker = new Worker(
    'coin-credit',
    async (job: Job) => {
      logger.info(`[CoinWorker] Processing job ${job.id}`);

      const { userId, coinType, amount, source, metadata } = job.data;

      // Credit coins to wallet
      // In real implementation, this would:
      // 1. Call wallet service API
      // 2. Record transaction
      // 3. Send notification

      logger.info(`[CoinWorker] Credited ${amount} ${coinType} to user ${userId}`);

      return { success: true, userId, amount, coinType };
    },
    { connection, concurrency: 10 }
  );

  worker.on('completed', (job) => {
    logger.info(`[CoinWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[CoinWorker] Job ${job?.id} failed:`, { error: err instanceof Error ? err.message : String(err) });
  });

  return worker;
}

// ============================================
// NOTIFICATION WORKER
// ============================================

export function startNotificationWorker() {
  const worker = new Worker(
    'notifications',
    async (job: Job) => {
      logger.info(`[NotificationWorker] Processing job ${job.id}`);

      const { userId, type, title, body, data } = job.data;

      // Send notification
      // In real implementation, this would:
      // 1. Fetch user push tokens
      // 2. Send push notification
      // 3. Record notification sent

      logger.info(`[NotificationWorker] Sent ${type} to user ${userId}`);

      return { success: true, userId };
    },
    { connection, concurrency: 20 }
  );

  worker.on('completed', (job) => {
    logger.info(`[NotificationWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[NotificationWorker] Job ${job?.id} failed:`, { error: err instanceof Error ? err.message : String(err) });
  });

  return worker;
}

// ============================================
// START ALL WORKERS
// ============================================

export function startAllWorkers() {
  logger.info('[Workers] Starting all workers...');

  const workers = [
    startEventWorker(),
    startKarmaWorker(),
    startCoinWorker(),
    startNotificationWorker()
  ];

  logger.info('[Workers] All workers started');

  return workers;
}

// ============================================
// JOB HELPERS
// ============================================

/**
 * Add event to processing queue
 */
export async function queueEvent(eventId: string, eventType: string, userId: string, data) {
  return eventQueue.add(
    'process-event',
    { eventId, eventType, userId, data },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
}

/**
 * Add karma calculation to queue
 */
export async function queueKarmaCalculation(userId: string, action: string) {
  return karmaQueue.add(
    'calculate-karma',
    { userId, action },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
}

/**
 * Add coin credit to queue
 */
export async function queueCoinCredit(
  userId: string,
  coinType: string,
  amount: number,
  source: string,
  metadata?: unknown
) {
  return coinQueue.add(
    'credit-coins',
    { userId, coinType, amount, source, metadata },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
}

/**
 * Add notification to queue
 */
export async function queueNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  data?: unknown
) {
  return notificationQueue.add(
    'send-notification',
    { userId, type, title, body, data },
    { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
  );
}

// ============================================
// SHUTDOWN
// ============================================

export async function shutdownWorkers() {
  logger.info('[Workers] Shutting down...');

  await eventQueue.close();
  await karmaQueue.close();
  await coinQueue.close();
  await notificationQueue.close();
  await connection.quit();

  logger.info('[Workers] All workers shut down');
}
