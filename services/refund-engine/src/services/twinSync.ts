import axios from 'axios';
import { RefundRequest } from '../models/Refund';
import { logger } from '../utils/logger';

const PAYMENT_TWIN_URL = process.env.PAYMENT_TWIN_URL || 'http://localhost:3018';
const AGENT_TWIN_URL = process.env.AGENT_TWIN_URL || 'http://localhost:3011';

interface SyncResult {
  success: boolean;
  syncedTo: string[];
  errors: Array<{ service: string; error: string }>;
}

export class TwinSync {
  /**
   * Sync refund request to all relevant twins
   */
  async syncRefundRequest(refund: RefundRequest): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedTo: [],
      errors: []
    };

    // Sync to Payment Twin
    try {
      await this.syncToPaymentTwin(refund);
      result.syncedTo.push('payment-twin');
    } catch (error) {
      result.success = false;
      result.errors.push({
        service: 'payment-twin',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Sync to Agent Twin (for agent-initiated refunds)
    if (refund.approvedBy && refund.approvedBy !== 'system') {
      try {
        await this.syncToAgentTwin(refund);
        result.syncedTo.push('agent-twin');
      } catch (error) {
        result.errors.push({
          service: 'agent-twin',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info(`Synced refund request ${refund.requestId} to twins`, {
      syncedTo: result.syncedTo,
      errors: result.errors.length
    });

    return result;
  }

  /**
   * Sync completed refund to twins
   */
  async syncRefundCompleted(refund: RefundRequest): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedTo: [],
      errors: []
    };

    // Sync completed status to Payment Twin
    try {
      await this.syncCompletedToPaymentTwin(refund);
      result.syncedTo.push('payment-twin');
    } catch (error) {
      result.success = false;
      result.errors.push({
        service: 'payment-twin',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Sync to Agent Twin for karma updates
    if (refund.approvedBy && refund.approvedBy !== 'system') {
      try {
        await this.syncKarmaToAgentTwin(refund);
        result.syncedTo.push('agent-twin');
      } catch (error) {
        result.errors.push({
          service: 'agent-twin',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info(`Synced completed refund ${refund.requestId} to twins`, {
      syncedTo: result.syncedTo,
      errors: result.errors.length
    });

    return result;
  }

  /**
   * Sync refund to Payment Twin
   */
  private async syncToPaymentTwin(refund: RefundRequest): Promise<void> {
    await axios.post(`${PAYMENT_TWIN_URL}/api/transactions/${refund.channelRefId}/refund-pending`, {
      refundId: refund.id,
      requestId: refund.requestId,
      amount: refund.refundAmount,
      currency: refund.currency,
      customerId: refund.customerId,
      channel: refund.channel,
      reason: refund.reason,
      estimatedProcessingTime: '2-5 business days',
      createdAt: refund.createdAt.toISOString()
    }, {
      timeout: 5000,
      headers: {
        'X-Source-Service': 'refund-engine',
        'X-Trace-Id': refund.requestId
      }
    });
  }

  /**
   * Sync completed refund to Payment Twin
   */
  private async syncCompletedToPaymentTwin(refund: RefundRequest): Promise<void> {
    await axios.patch(`${PAYMENT_TWIN_URL}/api/transactions/${refund.channelRefId}/refund-status`, {
      refundId: refund.id,
      status: 'completed',
      processedAmount: refund.netRefundAmount || refund.refundAmount,
      processingFee: refund.processingFee,
      completedAt: new Date().toISOString(),
      metadata: {
        autoApproved: refund.autoApproved,
        approvedBy: refund.approvedBy
      }
    }, {
      timeout: 5000,
      headers: {
        'X-Source-Service': 'refund-engine',
        'X-Trace-Id': refund.requestId
      }
    });
  }

  /**
   * Sync refund to Agent Twin
   */
  private async syncToAgentTwin(refund: RefundRequest): Promise<void> {
    await axios.post(`${AGENT_TWIN_URL}/api/agents/${refund.approvedBy}/refunds`, {
      refundId: refund.id,
      requestId: refund.requestId,
      amount: refund.refundAmount,
      customerId: refund.customerId,
      action: 'pending_approval',
      timestamp: new Date().toISOString()
    }, {
      timeout: 5000
    });
  }

  /**
   * Sync karma updates to Agent Twin
   */
  private async syncKarmaToAgentTwin(refund: RefundRequest): Promise<void> {
    // Calculate karma adjustment based on outcome
    const karmaAdjustment = this.calculateKarmaAdjustment(refund);

    await axios.post(`${AGENT_TWIN_URL}/api/agents/${refund.approvedBy}/karma`, {
      adjustment: karmaAdjustment,
      reason: refund.status === 'completed'
        ? 'Successful refund processed'
        : 'Refund request handled',
      relatedRefundId: refund.id,
      timestamp: new Date().toISOString()
    }, {
      timeout: 5000
    });
  }

  /**
   * Calculate karma adjustment for agent
   */
  private calculateKarmaAdjustment(refund: RefundRequest): number {
    if (refund.status === 'completed') {
      // Positive karma for successful refund processing
      return Math.min(10, refund.refundAmount * 0.01);
    }

    if (refund.status === 'rejected') {
      // Slight negative for rejection (if manually rejected)
      return -5;
    }

    return 0;
  }

  /**
   * Get sync status for a refund
   */
  async getSyncStatus(refundId: string): Promise<{
    paymentTwin: 'synced' | 'pending' | 'failed';
    agentTwin: 'synced' | 'pending' | 'failed' | 'not_applicable';
  }> {
    try {
      const response = await axios.get(
        `${PAYMENT_TWIN_URL}/api/refunds/${refundId}/sync-status`,
        { timeout: 3000 }
      );

      return response.data;
    } catch {
      return {
        paymentTwin: 'pending',
        agentTwin: 'not_applicable'
      };
    }
  }

  /**
   * Resync failed syncs
   */
  async resync(refund: RefundRequest): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedTo: [],
      errors: []
    };

    // Attempt to resync to Payment Twin
    try {
      await this.syncToPaymentTwin(refund);
      result.syncedTo.push('payment-twin');
    } catch (error) {
      result.success = false;
      result.errors.push({
        service: 'payment-twin',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return result;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ paymentTwin: boolean; agentTwin: boolean }> {
    const checks = {
      paymentTwin: false,
      agentTwin: false
    };

    try {
      await axios.get(`${PAYMENT_TWIN_URL}/health`, { timeout: 2000 });
      checks.paymentTwin = true;
    } catch {
      // Service unavailable
    }

    try {
      await axios.get(`${AGENT_TWIN_URL}/health`, { timeout: 2000 });
      checks.agentTwin = true;
    } catch {
      // Service unavailable
    }

    return checks;
  }
}

export const twinSync = new TwinSync();
