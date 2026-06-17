import axios from 'axios';
import { RefundRequest } from '../models/Refund';
import { logger } from '../utils/logger';

const CUSTOMER_TWIN_URL = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

interface TrustScoreContext {
  customerId: string;
  trustScore: number;
  totalOrders: number;
  previousRefunds: number;
  accountAge: number;
}

interface CustomerProfile {
  customerId: string;
  email: string;
  name: string;
  trustScore: number;
  tier: 'standard' | 'premium' | 'vip';
  accountCreated: string;
  totalOrders: number;
  totalSpent: number;
}

export class CustomerOpsBridge {
  /**
   * Get trust score context for a customer
   */
  async getTrustScoreContext(customerId: string): Promise<TrustScoreContext> {
    try {
      const response = await axios.get(`${CUSTOMER_TWIN_URL}/api/customers/${customerId}/trust`, {
        timeout: 3000
      });

      return {
        customerId,
        trustScore: response.data.trustScore || 500,
        totalOrders: response.data.totalOrders || 0,
        previousRefunds: response.data.previousRefunds || 0,
        accountAge: response.data.accountAge || 0
      };
    } catch (error) {
      logger.warn(`Failed to fetch trust score for ${customerId}, using defaults:`, error);

      // Return default values
      return {
        customerId,
        trustScore: 500,
        totalOrders: 0,
        previousRefunds: 0,
        accountAge: 0
      };
    }
  }

  /**
   * Get customer profile
   */
  async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    try {
      const response = await axios.get(`${CUSTOMER_TWIN_URL}/api/customers/${customerId}`, {
        timeout: 3000
      });

      return response.data;
    } catch (error) {
      logger.warn(`Failed to fetch customer profile for ${customerId}:`, error);
      return null;
    }
  }

  /**
   * Notify customer twin of refund request
   */
  async notifyRefundRequest(refund: RefundRequest): Promise<void> {
    try {
      await axios.post(`${CUSTOMER_TWIN_URL}/api/customers/${refund.customerId}/refunds`, {
        refundId: refund.id,
        requestId: refund.requestId,
        amount: refund.refundAmount,
        channel: refund.channel,
        reason: refund.reason,
        status: refund.status,
        createdAt: refund.createdAt.toISOString()
      }, {
        timeout: 5000
      });

      logger.debug(`Notified customer twin of refund request: ${refund.requestId}`);
    } catch (error) {
      logger.error(`Failed to notify customer twin of refund request:`, error);
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Notify customer twin of completed refund
   */
  async notifyRefundCompleted(refund: RefundRequest): Promise<void> {
    try {
      await axios.patch(
        `${CUSTOMER_TWIN_URL}/api/customers/${refund.customerId}/refunds/${refund.id}`,
        {
          status: 'completed',
          completedAt: new Date().toISOString(),
          netAmount: refund.netRefundAmount || refund.refundAmount
        },
        { timeout: 5000 }
      );

      logger.debug(`Notified customer twin of completed refund: ${refund.requestId}`);
    } catch (error) {
      logger.error(`Failed to notify customer twin of completed refund:`, error);
    }
  }

  /**
   * Notify customer of rejected refund
   */
  async notifyRefundRejected(refund: RefundRequest, reason: string): Promise<void> {
    try {
      // Send notification via customer twin
      await axios.post(`${CUSTOMER_TWIN_URL}/api/customers/${refund.customerId}/notifications`, {
        type: 'refund_rejected',
        title: 'Refund Request Rejected',
        message: `Your refund request ${refund.requestId} has been rejected. Reason: ${reason}`,
        refundId: refund.id,
        requestId: refund.requestId,
        amount: refund.refundAmount,
        timestamp: new Date().toISOString()
      }, {
        timeout: 5000
      });

      logger.debug(`Sent rejection notification for refund: ${refund.requestId}`);
    } catch (error) {
      logger.error(`Failed to send rejection notification:`, error);
    }
  }

  /**
   * Store refund memory in Memory OS
   */
  async storeRefundMemory(refund: RefundRequest): Promise<void> {
    try {
      await axios.post(`${MEMORY_OS_URL}/api/memory`, {
        type: 'refund_interaction',
        customerId: refund.customerId,
        data: {
          refundId: refund.id,
          requestId: refund.requestId,
          channel: refund.channel,
          amount: refund.refundAmount,
          reason: refund.reason,
          status: refund.status,
          outcome: refund.autoApproved ? 'auto_approved' : 'manual_required',
          processedAt: refund.processedAt?.toISOString(),
          completedAt: refund.completedAt?.toISOString()
        },
        timestamp: new Date().toISOString()
      }, {
        timeout: 5000
      });

      logger.debug(`Stored refund memory for customer: ${refund.customerId}`);
    } catch (error) {
      logger.error(`Failed to store refund memory:`, error);
    }
  }

  /**
   * Get refund history for customer
   */
  async getRefundHistory(customerId: string): Promise<RefundRequest[]> {
    try {
      const response = await axios.get(
        `${CUSTOMER_TWIN_URL}/api/customers/${customerId}/refunds`,
        { timeout: 5000 }
      );

      return response.data.refunds || [];
    } catch (error) {
      logger.warn(`Failed to fetch refund history for ${customerId}:`, error);
      return [];
    }
  }

  /**
   * Update trust score based on refund behavior
   */
  async updateTrustScore(customerId: string, adjustment: number, reason: string): Promise<void> {
    try {
      await axios.post(
        `${CUSTOMER_TWIN_URL}/api/customers/${customerId}/trust/adjust`,
        { adjustment, reason },
        { timeout: 5000 }
      );

      logger.info(`Adjusted trust score for ${customerId}: ${adjustment} (${reason})`);
    } catch (error) {
      logger.error(`Failed to adjust trust score:`, error);
    }
  }

  /**
   * Check if customer is eligible for auto-approve
   */
  async checkAutoApproveEligibility(customerId: string): Promise<{
    eligible: boolean;
    maxAmount: number;
    reason?: string;
  }> {
    try {
      const response = await axios.get(
        `${CUSTOMER_TWIN_URL}/api/customers/${customerId}/auto-approve-eligibility`,
        { timeout: 3000 }
      );

      return response.data;
    } catch (error) {
      // Default to conservative limits
      return {
        eligible: true,
        maxAmount: 100
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${CUSTOMER_TWIN_URL}/health`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const customerOpsBridge = new CustomerOpsBridge();
