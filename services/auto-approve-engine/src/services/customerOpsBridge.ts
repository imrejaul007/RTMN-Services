import { TrustScoreData, VIPTier } from '../models/Approval';

export class CustomerOpsBridge {
  private twinOsUrl: string;
  private customerOpsUrl: string;

  constructor() {
    this.twinOsUrl = process.env.TRUST_SCORE_SERVICE_URL || 'http://localhost:4705';
    this.customerOpsUrl = process.env.CUSTOMER_OPS_URL || 'http://localhost:3016';
  }

  /**
   * Get trust score and VIP tier for a customer
   */
  async getTrustScore(customerId: string): Promise<TrustScoreData | null> {
    try {
      // Try TwinOS Hub first
      const twinResponse = await fetch(`${this.twinOsUrl}/api/twins/customer/${customerId}`);
      if (twinResponse.ok) {
        const twinData = await twinResponse.json();
        return this.parseTwinData(twinData);
      }

      // Fallback to customer ops bridge
      const opsResponse = await fetch(`${this.customerOpsUrl}/api/customer/${customerId}/score`);
      if (opsResponse.ok) {
        const opsData = await opsResponse.json();
        return this.parseOpsData(opsData);
      }

      // Return default data if services unavailable
      return this.getDefaultTrustScore(customerId);
    } catch (error) {
      console.error('Failed to get trust score:', error);
      return this.getDefaultTrustScore(customerId);
    }
  }

  /**
   * Update trust score
   */
  async updateTrustScore(
    customerId: string,
    delta: number,
    reason: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.twinOsUrl}/api/twins/customer/${customerId}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, reason })
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to update trust score:', error);
      return false;
    }
  }

  /**
   * Get customer profile including VIP tier
   */
  async getCustomerProfile(customerId: string): Promise<{
    id: string;
    name: string;
    vipTier: VIPTier;
    trustScore: number;
    accountAge: number;
    totalTransactions: number;
  } | null> {
    try {
      const response = await fetch(`${this.customerOpsUrl}/api/customer/${customerId}/profile`);
      if (response.ok) {
        return response.json();
      }
      return null;
    } catch (error) {
      console.error('Failed to get customer profile:', error);
      return null;
    }
  }

  /**
   * Notify manager about escalation
   */
  async notifyManager(managerId: string, data: {
    approvalId: string;
    requestId: string;
    applicantId?: string;
    amount?: number;
    reason: string;
  }): Promise<boolean> {
    try {
      const response = await fetch(`${this.customerOpsUrl}/api/notifications/manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: managerId,
          type: 'ESCALATION',
          data,
          timestamp: new Date().toISOString()
        })
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to notify manager:', error);
      // Don't throw - notification failure shouldn't block approval
      return false;
    }
  }

  /**
   * Get customer transaction history
   */
  async getTransactionHistory(
    customerId: string,
    limit: number = 10
  ): Promise<Array<{
    id: string;
    amount: number;
    date: Date;
    status: string;
  }>> {
    try {
      const response = await fetch(
        `${this.customerOpsUrl}/api/customer/${customerId}/transactions?limit=${limit}`
      );
      if (response.ok) {
        return response.json();
      }
      return [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Get customer dispute history
   */
  async getDisputeHistory(customerId: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.customerOpsUrl}/api/customer/${customerId}/disputes/count`
      );
      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
      return 0;
    } catch (error) {
      console.error('Failed to get dispute history:', error);
      return 0;
    }
  }

  /**
   * Calculate VIP tier from trust score
   */
  calculateVIPTier(trustScore: number): VIPTier {
    if (trustScore >= 95) return 'DIAMOND';
    if (trustScore >= 85) return 'PLATINUM';
    if (trustScore >= 70) return 'GOLD';
    if (trustScore >= 50) return 'SILVER';
    if (trustScore >= 30) return 'BRONZE';
    return 'NONE';
  }

  /**
   * Parse trust data from TwinOS
   */
  private parseTwinData(data: any): TrustScoreData {
    const score = data.trustScore || data.score || 50;
    return {
      score,
      tier: this.calculateVIPTier(score),
      factors: data.factors || {
        paymentHistory: score * 0.4,
        accountAge: score * 0.2,
        transactionVolume: score * 0.25,
        disputeRate: score * 0.15
      },
      lastUpdated: new Date(data.lastUpdated || Date.now())
    };
  }

  /**
   * Parse trust data from Customer Ops
   */
  private parseOpsData(data: any): TrustScoreData {
    return {
      score: data.trustScore || data.score || 50,
      tier: data.vipTier || this.calculateVIPTier(data.trustScore || 50),
      factors: data.factors || {},
      lastUpdated: new Date(data.lastUpdated || Date.now())
    };
  }

  /**
   * Get default trust score when services are unavailable
   */
  private getDefaultTrustScore(customerId: string): TrustScoreData {
    // Generate consistent score based on customer ID hash
    const hash = this.hashCode(customerId);
    const score = (Math.abs(hash) % 100);

    return {
      score,
      tier: this.calculateVIPTier(score),
      factors: {
        paymentHistory: 50,
        accountAge: 50,
        transactionVolume: 50,
        disputeRate: 50
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Simple hash function for consistent default scores
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Sync customer data with TwinOS
   */
  async syncCustomerData(customerId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.twinOsUrl}/api/sync/customer/${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to sync customer data:', error);
      return false;
    }
  }

  /**
   * Get VIP benefits for a tier
   */
  getVIPBenefits(tier: VIPTier): {
    autoApproveLimit: number;
    refundLimit: number;
    prioritySupport: boolean;
    dedicatedManager: boolean;
  } {
    const benefits: Record<VIPTier, any> = {
      'DIAMOND': {
        autoApproveLimit: 1000000,
        refundLimit: 500000,
        prioritySupport: true,
        dedicatedManager: true
      },
      'PLATINUM': {
        autoApproveLimit: 500000,
        refundLimit: 250000,
        prioritySupport: true,
        dedicatedManager: false
      },
      'GOLD': {
        autoApproveLimit: 100000,
        refundLimit: 50000,
        prioritySupport: true,
        dedicatedManager: false
      },
      'SILVER': {
        autoApproveLimit: 50000,
        refundLimit: 10000,
        prioritySupport: false,
        dedicatedManager: false
      },
      'BRONZE': {
        autoApproveLimit: 10000,
        refundLimit: 5000,
        prioritySupport: false,
        dedicatedManager: false
      },
      'NONE': {
        autoApproveLimit: 0,
        refundLimit: 0,
        prioritySupport: false,
        dedicatedManager: false
      }
    };

    return benefits[tier];
  }
}
