import { v4 as uuidv4 } from 'uuid';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../config/logger';
import { config } from '../config';
import { ApprovalRequest, ActionStatus } from '../types/action-levels';
import { getAction } from '../rules/action-registry';
import { executeNextaBiZAction } from '../integrations/nextabizz';

/**
 * Redis connection for BullMQ
 */
const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
});

/**
 * In-memory store for approval requests
 * In production, use MongoDB for persistence
 */
const approvalStore: Map<string, ApprovalRequest> = new Map();

/**
 * Approval Queue for human-in-loop processing
 */
export class ApprovalQueue {
  private queue: Queue;
  private worker: Worker | null = null;
  private static instance: ApprovalQueue;

  private constructor() {
    this.queue = new Queue('approval-requests', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
      },
    });

    this.initializeWorker();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ApprovalQueue {
    if (!ApprovalQueue.instance) {
      ApprovalQueue.instance = new ApprovalQueue();
    }
    return ApprovalQueue.instance;
  }

  private initializeWorker(): void {
    this.worker = new Worker(
      'approval-requests',
      async (job: Job) => {
        logger.info(`Processing approval job ${job.id}`);
        // Worker handles timeout monitoring
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Approval job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Approval job ${job?.id} failed`, { error: err.message });
    });
  }

  /**
   * Create a new approval request
   */
  async createApprovalRequest(
    actionId: string,
    eventId: string,
    payload: Record<string, unknown>,
    userId?: string
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: uuidv4(),
      actionId,
      eventId,
      payload,
      status: ActionStatus.PENDING,
      requestedAt: new Date(),
      requestedBy: userId,
    };

    approvalStore.set(request.id, request);

    // Add to queue for monitoring
    await this.queue.add('approval', {
      approvalId: request.id,
      actionId,
      eventId,
    });

    logger.info('Approval request created', {
      approvalId: request.id,
      actionId,
      eventId,
    });

    return request;
  }

  /**
   * Get all pending approval requests
   */
  async getPendingApprovals(): Promise<ApprovalRequest[]> {
    return Array.from(approvalStore.values()).filter(
      (req) => req.status === ActionStatus.PENDING
    );
  }

  /**
   * Get approval by ID
   */
  async getApprovalById(id: string): Promise<ApprovalRequest | undefined> {
    return approvalStore.get(id);
  }

  /**
   * Get approvals by status
   */
  async getApprovalsByStatus(status: ActionStatus): Promise<ApprovalRequest[]> {
    return Array.from(approvalStore.values()).filter(
      (req) => req.status === status
    );
  }

  /**
   * Get all approvals
   */
  async getAllApprovals(): Promise<ApprovalRequest[]> {
    return Array.from(approvalStore.values());
  }

  /**
   * Approve an action request
   */
  async approve(
    approvalId: string,
    approverId: string
  ): Promise<{ success: boolean; request?: ApprovalRequest; error?: string }> {
    const request = approvalStore.get(approvalId);
    if (!request) {
      logger.warn(`Approval request not found: ${approvalId}`);
      return { success: false, error: 'Approval request not found' };
    }

    if (request.status !== ActionStatus.PENDING) {
      logger.warn(`Approval request already processed: ${approvalId}`);
      return { success: false, error: 'Approval request already processed' };
    }

    // Update request
    request.status = ActionStatus.APPROVED;
    request.approvedAt = new Date();
    request.approvedBy = approverId;

    approvalStore.set(approvalId, request);

    logger.info('Approval granted', {
      approvalId,
      approverId,
      actionId: request.actionId,
    });

    // Execute the approved action
    try {
      await executeNextaBiZAction(request.actionId, request.payload);
      logger.info('Approved action executed', { approvalId, actionId: request.actionId });
    } catch (error) {
      logger.error('Failed to execute approved action', {
        approvalId,
        actionId: request.actionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return { success: true, request };
  }

  /**
   * Reject an action request
   */
  async reject(
    approvalId: string,
    rejectorId: string,
    reason?: string
  ): Promise<{ success: boolean; request?: ApprovalRequest; error?: string }> {
    const request = approvalStore.get(approvalId);
    if (!request) {
      logger.warn(`Approval request not found: ${approvalId}`);
      return { success: false, error: 'Approval request not found' };
    }

    if (request.status !== ActionStatus.PENDING) {
      logger.warn(`Approval request already processed: ${approvalId}`);
      return { success: false, error: 'Approval request already processed' };
    }

    request.status = ActionStatus.REJECTED;
    request.rejectedAt = new Date();
    request.rejectedBy = rejectorId;
    request.rejectionReason = reason;

    approvalStore.set(approvalId, request);

    logger.info('Approval rejected', {
      approvalId,
      rejectorId,
      reason,
    });

    return { success: true, request };
  }

  /**
   * Cancel a pending approval
   */
  async cancel(
    approvalId: string,
    cancelledBy: string
  ): Promise<{ success: boolean; request?: ApprovalRequest; error?: string }> {
    const request = approvalStore.get(approvalId);
    if (!request) {
      return { success: false, error: 'Approval request not found' };
    }

    if (request.status !== ActionStatus.PENDING) {
      return { success: false, error: 'Can only cancel pending requests' };
    }

    request.status = ActionStatus.CANCELLED;
    request.rejectedAt = new Date();
    request.rejectedBy = cancelledBy;
    request.rejectionReason = 'Cancelled by requester';

    approvalStore.set(approvalId, request);

    return { success: true, request };
  }

  /**
   * Get approval statistics
   */
  async getStats(): Promise<{
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    total: number;
  }> {
    const requests = Array.from(approvalStore.values());
    return {
      pending: requests.filter((r) => r.status === ActionStatus.PENDING).length,
      approved: requests.filter((r) => r.status === ActionStatus.APPROVED).length,
      rejected: requests.filter((r) => r.status === ActionStatus.REJECTED).length,
      cancelled: requests.filter((r) => r.status === ActionStatus.CANCELLED).length,
      total: requests.length,
    };
  }

  /**
   * Get pending count
   */
  async getPendingCount(): Promise<number> {
    return Array.from(approvalStore.values()).filter(
      (r) => r.status === ActionStatus.PENDING
    ).length;
  }

  /**
   * Cleanup old entries (call periodically)
   */
  async cleanup(keepDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);

    let cleaned = 0;
    for (const [id, request] of approvalStore.entries()) {
      if (
        request.status !== ActionStatus.PENDING &&
        request.requestedAt < cutoff
      ) {
        approvalStore.delete(id);
        cleaned++;
      }
    }

    logger.info(`Cleaned up ${cleaned} old approval requests`);
    return cleaned;
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    if (this.worker) {
      await this.worker.close();
    }
    await redisConnection.quit();
  }
}

export { approvalStore };
