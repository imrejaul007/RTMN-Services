import { refundStore, RefundRequest, RefundStatus } from '../models/Refund';
import { customerOpsBridge } from './customerOpsBridge';
import { twinSync } from './twinSync';
import { eventBus } from './eventBus';
import { logger } from '../utils/logger';

interface ProcessingResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  processingTime: number;
}

export class RefundProcessor {
  private processingQueue: Map<string, Promise<ProcessingResult>> = new Map();

  /**
   * Process a refund request
   */
  async process(refundId: string): Promise<ProcessingResult> {
    // Check if already processing
    const existing = this.processingQueue.get(refundId);
    if (existing) {
      logger.info(`Refund ${refundId} already being processed`);
      return existing;
    }

    const processingPromise = this.executeProcessing(refundId);
    this.processingQueue.set(refundId, processingPromise);

    try {
      const result = await processingPromise;
      return result;
    } finally {
      this.processingQueue.delete(refundId);
    }
  }

  /**
   * Execute the actual processing logic
   */
  private async executeProcessing(refundId: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    const refund = refundStore.findById(refundId);

    if (!refund) {
      return {
        success: false,
        error: 'Refund request not found',
        processingTime: Date.now() - startTime
      };
    }

    // Update status to processing
    refundStore.update(refundId, {
      status: 'processing',
      processedAt: new Date(),
      auditTrail: [
        ...refund.auditTrail,
        {
          action: 'processing_started',
          actor: 'refund-processor',
          timestamp: new Date()
        }
      ]
    });

    try {
      // Process based on channel
      let transactionId: string;

      switch (refund.channel) {
        case 'order':
          transactionId = await this.processOrderRefund(refund);
          break;
        case 'payment':
          transactionId = await this.processPaymentRefund(refund);
          break;
        case 'subscription':
          transactionId = await this.processSubscriptionRefund(refund);
          break;
        case 'wallet':
          transactionId = await this.processWalletRefund(refund);
          break;
        case 'loyalty':
          transactionId = await this.processLoyaltyRefund(refund);
          break;
        default:
          throw new Error(`Unknown channel: ${refund.channel}`);
      }

      // Mark as completed
      const completedRefund = refundStore.update(refundId, {
        status: 'completed',
        completedAt: new Date(),
        auditTrail: [
          ...refund.auditTrail,
          {
            action: 'processing_completed',
            actor: 'refund-processor',
            timestamp: new Date(),
            details: { transactionId }
          }
        ]
      });

      // Update customer twin
      await customerOpsBridge.notifyRefundCompleted(completedRefund!);

      // Sync to payment twin
      await twinSync.syncRefundCompleted(completedRefund!);

      // Publish event
      await eventBus.publish('refund.completed', {
        refundId: refund.id,
        requestId: refund.requestId,
        customerId: refund.customerId,
        amount: completedRefund!.netRefundAmount || completedRefund!.refundAmount,
        channel: refund.channel,
        transactionId,
        timestamp: new Date().toISOString()
      });

      logger.info(`Refund processed successfully: ${refund.requestId}`, {
        transactionId,
        amount: completedRefund!.refundAmount
      });

      return {
        success: true,
        transactionId,
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark as failed
      refundStore.update(refundId, {
        status: 'failed',
        auditTrail: [
          ...refund.auditTrail,
          {
            action: 'processing_failed',
            actor: 'refund-processor',
            timestamp: new Date(),
            details: { error: errorMessage }
          }
        ]
      });

      // Publish failure event
      await eventBus.publish('refund.failed', {
        refundId: refund.id,
        requestId: refund.requestId,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      logger.error(`Refund processing failed: ${refund.requestId}`, { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Process order refund
   */
  private async processOrderRefund(refund: RefundRequest): Promise<string> {
    // Simulate order refund API call
    await this.simulateApiCall('order-service', `/refunds/${refund.channelRefId}`, {
      amount: refund.netRefundAmount || refund.refundAmount,
      reason: refund.reason
    });

    return `ORD-REF-${Date.now()}-${refund.id.slice(0, 8)}`;
  }

  /**
   * Process payment refund
   */
  private async processPaymentRefund(refund: RefundRequest): Promise<string> {
    // Simulate payment gateway refund
    await this.simulateApiCall('payment-gateway', `/refunds`, {
      transactionId: refund.channelRefId,
      amount: refund.netRefundAmount || refund.refundAmount,
      currency: refund.currency
    });

    return `PAY-REF-${Date.now()}-${refund.id.slice(0, 8)}`;
  }

  /**
   * Process subscription refund
   */
  private async processSubscriptionRefund(refund: RefundRequest): Promise<string> {
    // Simulate subscription service refund
    await this.simulateApiCall('subscription-service', `/subscriptions/${refund.channelRefId}/refund`, {
      amount: refund.netRefundAmount || refund.refundAmount
    });

    return `SUB-REF-${Date.now()}-${refund.id.slice(0, 8)}`;
  }

  /**
   * Process wallet refund
   */
  private async processWalletRefund(refund: RefundRequest): Promise<string> {
    // Simulate wallet service credit
    await this.simulateApiCall('wallet-service', `/wallets/${refund.customerId}/credit`, {
      amount: refund.netRefundAmount || refund.refundAmount,
      source: 'refund',
      referenceId: refund.channelRefId
    });

    return `WAL-REF-${Date.now()}-${refund.id.slice(0, 8)}`;
  }

  /**
   * Process loyalty points refund
   */
  private async processLoyaltyRefund(refund: RefundRequest): Promise<string> {
    // Simulate loyalty service credit
    await this.simulateApiCall('loyalty-service', `/points/${refund.customerId}/credit`, {
      points: Math.round(refund.refundAmount * 10), // 10 points per dollar
      reason: refund.reason
    });

    return `LOY-REF-${Date.now()}-${refund.id.slice(0, 8)}`;
  }

  /**
   * Simulate API call (replace with actual implementation)
   */
  private async simulateApiCall(service: string, endpoint: string, data: unknown): Promise<void> {
    logger.debug(`Simulating ${service}${endpoint} call`, { data });
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error(`${service} temporarily unavailable`);
    }
  }

  /**
   * Process multiple refunds in batch
   */
  async processBatch(refundIds: string[]): Promise<{
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    const results = {
      successful: [] as string[],
      failed: [] as Array<{ id: string; error: string }>
    };

    const promises = refundIds.map(async (id) => {
      const result = await this.process(id);
      if (result.success) {
        results.successful.push(id);
      } else {
        results.failed.push({ id, error: result.error || 'Unknown error' });
      }
    });

    await Promise.all(promises);

    return results;
  }

  /**
   * Get processing status
   */
  isProcessing(refundId: string): boolean {
    return this.processingQueue.has(refundId);
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.processingQueue.size;
  }
}

export const refundProcessor = new RefundProcessor();
