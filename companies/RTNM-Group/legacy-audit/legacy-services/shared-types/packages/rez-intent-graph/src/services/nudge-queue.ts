// ── Nudge Queue Service ─────────────────────────────────────────────────────────
// MongoDB-backed priority queue for dormant intent revival nudges
// Replaces fake Redis/in-memory queue with proper MongoDB TTL-based storage

import crypto from 'crypto';
import mongoose from 'mongoose';

// ── Logger ────────────────────────────────────────────────────────────────────

const logger = {
  info: (msg: string, meta?: unknown) => logger.info([NudgeQueue] ${msg}`, meta || ''),
  warn: (msg: string, meta?: unknown) => console.warn(`[NudgeQueue] ${msg}`, meta || ''),
  error: (msg: string, meta?: unknown) => logger.error([NudgeQueue] ${msg}`, meta || ''),
};

// ── Queue Job Types ────────────────────────────────────────────────────────────

export interface NudgeJob {
  id: string;
  type: 'intent_revival_nudge' | 'price_drop_nudge' | 'seasonality_nudge' | 'manual_nudge';
  payload: {
    dormantIntentId: string;
    userId: string;
    intentKey: string;
    category: string;
    appType: string;
    message: string;
    revivalScore: number;
    channel: 'push' | 'email' | 'sms' | 'in_app';
    scheduledFor?: string;
  };
  metadata: {
    createdAt: string;
    retries: number;
    maxRetries: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}

// Internal nudge job used by the service
interface InternalNudgeJob {
  dormantIntentId: string;
  userId: string;
  intentKey: string;
  category: string;
  appType: string;
  message: string;
  channel: string;
  triggerType: string;
}

// ── MongoDB Schema ─────────────────────────────────────────────────────────────

const nudgeQueueSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true },
  queue: { type: String, required: true }, // 'revival' | 'priority' | 'bulk' | 'dead_letter'
  priority: { type: Number, default: 0 },
  job: {
    dormantIntentId: String,
    userId: String,
    intentKey: String,
    category: String,
    appType: String,
    message: String,
    channel: String,
    triggerType: String,
  },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
  attempts: { type: Number, default: 0 },
  maxAttempts: { type: Number, default: 3 },
  error: String,
  scheduledFor: { type: Date, default: Date.now },
}, { timestamps: true });

// TTL index: auto-expire dead letter jobs after 7 days
nudgeQueueSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
// Priority queue index: find next job by queue + status + priority + schedule time
nudgeQueueSchema.index({ queue: 1, status: 1, priority: -1, scheduledFor: 1 });

// ── Model (singleton-safe) ─────────────────────────────────────────────────────

let NudgeQueueModel: mongoose.Model<any>;
try {
  NudgeQueueModel = mongoose.models.NudgeQueue || mongoose.model('NudgeQueue', nudgeQueueSchema);
} catch {
  NudgeQueueModel = mongoose.model('NudgeQueue', nudgeQueueSchema);
}

// ── Queue Service ─────────────────────────────────────────────────────────────

export class NudgeQueueService {
  /**
   * Enqueue a nudge job
   */
  async enqueue(job: NudgeJob, queueType: string = 'revival'): Promise<{ success: boolean; queuePosition?: number }> {
    const jobId = job.id || `nudge_${crypto.randomUUID()}`;
    const priority = this.priorityToNumber(job.metadata.priority);

    await NudgeQueueModel.create({
      jobId,
      queue: queueType,
      priority,
      job: {
        dormantIntentId: job.payload.dormantIntentId,
        userId: job.payload.userId,
        intentKey: job.payload.intentKey,
        category: job.payload.category,
        appType: job.payload.appType,
        message: job.payload.message,
        channel: job.payload.channel,
        triggerType: job.type,
      },
      scheduledFor: new Date(),
    });

    const position = await NudgeQueueModel.countDocuments({
      queue: queueType,
      status: 'pending',
      priority: { $gte: priority },
      scheduledFor: { $lte: new Date() },
      jobId: { $ne: jobId },
    });

    logger.info('Nudge job enqueued', { jobId, queue: queueType, position: position + 1 });
    return { success: true, queuePosition: position + 1 };
  }

  /**
   * Dequeue the next pending job from a queue.
   * Accepts queue types ('revival', 'priority', 'bulk') or legacy priorities
   * ('low', 'medium', 'high', 'critical') for backward compatibility.
   */
  async dequeue(queueTypeOrPriority: string = 'revival'): Promise<NudgeJob | null> {
    // Normalize legacy priority to queue type
    const priorityMap: Record<string, string> = {
      'low': 'revival',
      'medium': 'revival',
      'high': 'priority',
      'critical': 'priority',
    };
    const queueType = priorityMap[queueTypeOrPriority] || queueTypeOrPriority;
    const now = new Date();
    const job = await NudgeQueueModel.findOneAndUpdate(
      {
        queue: queueType,
        status: 'pending',
        scheduledFor: { $lte: now },
      },
      { $set: { status: 'processing', updatedAt: new Date() } },
      { sort: { priority: -1, createdAt: 1 }, new: true }
    );

    if (!job) return null;

    return {
      id: job.jobId,
      type: (job.job.triggerType as NudgeJob['type']) || 'intent_revival_nudge',
      payload: {
        dormantIntentId: job.job.dormantIntentId,
        userId: job.job.userId,
        intentKey: job.job.intentKey,
        category: job.job.category,
        appType: job.job.appType,
        message: job.job.message,
        revivalScore: 0,
        channel: (job.job.channel as NudgeJob['payload']['channel']) || 'push',
        scheduledFor: job.scheduledFor?.toISOString(),
      },
      metadata: {
        createdAt: job.createdAt.toISOString(),
        retries: job.attempts,
        maxRetries: job.maxAttempts,
        priority: 'medium',
      },
    };
  }

  /**
   * Mark a job as completed and remove it
   */
  async complete(jobId: string): Promise<void> {
    await NudgeQueueModel.deleteOne({ jobId, queue: { $ne: 'dead_letter' } });
    logger.info('Nudge job completed', { jobId });
  }

  /**
   * Handle a failed job: retry with backoff or move to DLQ
   */
  async fail(jobId: string, error: string): Promise<void> {
    const job = await NudgeQueueModel.findOne({ jobId });
    if (!job) return;

    if (job.attempts + 1 >= job.maxAttempts) {
      await NudgeQueueModel.findByIdAndUpdate(job._id, {
        queue: 'dead_letter',
        status: 'failed',
        error,
        updatedAt: new Date(),
      });
      logger.warn('Nudge job moved to DLQ after max retries', { jobId, attempts: job.attempts, error });
    } else {
      const backoffMs = 60000 * Math.pow(2, job.attempts);
      await NudgeQueueModel.findByIdAndUpdate(job._id, {
        $inc: { attempts: 1 },
        status: 'pending',
        error,
        updatedAt: new Date(),
        scheduledFor: new Date(Date.now() + backoffMs),
      });
      logger.warn('Nudge job scheduled for retry', { jobId, attempts: job.attempts + 1, backoffMs, error });
    }
  }

  /**
   * Get count of pending jobs in a queue
   */
  async getQueueLength(queueType?: string): Promise<number> {
    if (queueType) {
      return NudgeQueueModel.countDocuments({ queue: queueType, status: 'pending' });
    }

    // Sum all non-DLQ queues
    const counts = await Promise.all([
      NudgeQueueModel.countDocuments({ queue: 'revival', status: 'pending' }),
      NudgeQueueModel.countDocuments({ queue: 'priority', status: 'pending' }),
      NudgeQueueModel.countDocuments({ queue: 'bulk', status: 'pending' }),
    ]);
    return counts.reduce((a, b) => a + b, 0);
  }

  /**
   * Move failed job to dead letter queue (legacy API compatibility)
   */
  async moveToDeadLetter(job: NudgeJob, reason: string): Promise<void> {
    await NudgeQueueModel.findOneAndUpdate(
      { jobId: job.id },
      {
        $set: {
          queue: 'dead_letter',
          status: 'failed',
          error: reason,
          updatedAt: new Date(),
        },
      }
    );
    logger.warn('Job moved to dead letter queue', { jobId: job.id, reason });
  }

  /**
   * Bulk enqueue multiple jobs
   */
  async bulkEnqueue(jobs: NudgeJob[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const job of jobs) {
      const result = await this.enqueue(job);
      if (result.success) {
        success++;
      } else {
        failed++;
      }
    }

    logger.info('Bulk enqueue complete', { success, failed, total: jobs.length });
    return { success, failed };
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number;
    byPriority: Record<string, number>;
    deadLetter: number;
  }> {
    const [revival, priority, bulk, dlq] = await Promise.all([
      NudgeQueueModel.countDocuments({ queue: 'revival', status: 'pending' }),
      NudgeQueueModel.countDocuments({ queue: 'priority', status: 'pending' }),
      NudgeQueueModel.countDocuments({ queue: 'bulk', status: 'pending' }),
      NudgeQueueModel.countDocuments({ queue: 'dead_letter' }),
    ]);

    return {
      total: revival + priority + bulk,
      byPriority: { low: revival, medium: revival, high: priority, critical: priority },
      deadLetter: dlq,
    };
  }

  private priorityToNumber(priority: NudgeJob['metadata']['priority']): number {
    switch (priority) {
      case 'critical': return 100;
      case 'high': return 50;
      case 'medium': return 10;
      case 'low': return 1;
      default: return 10;
    }
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────────

export const nudgeQueue = new NudgeQueueService();
export { NudgeQueueModel };

// ── Helper to create nudge job ────────────────────────────────────────────────

export function createNudgeJob(params: {
  dormantIntentId: string;
  userId: string;
  intentKey: string;
  category: string;
  appType: string;
  message: string;
  revivalScore: number;
  channel?: 'push' | 'email' | 'sms' | 'in_app';
  triggerType?: 'intent_revival_nudge' | 'price_drop_nudge' | 'seasonality_nudge' | 'manual_nudge';
  priority?: 'low' | 'medium' | 'high' | 'critical';
}): NudgeJob {
  const priority = params.priority || (params.revivalScore > 0.7 ? 'high' : 'medium');

  return {
    id: `nudge_${params.dormantIntentId}_${Date.now()}`,
    type: params.triggerType || 'intent_revival_nudge',
    payload: {
      dormantIntentId: params.dormantIntentId,
      userId: params.userId,
      intentKey: params.intentKey,
      category: params.category,
      appType: params.appType,
      message: params.message,
      revivalScore: params.revivalScore,
      channel: params.channel || 'push',
    },
    metadata: {
      createdAt: new Date().toISOString(),
      retries: 0,
      maxRetries: 3,
      priority,
    },
  };
}
