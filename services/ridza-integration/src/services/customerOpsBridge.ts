import axios, { AxiosInstance } from 'axios';
import winston from 'winston';
import { TransferRequest, InsurancePolicy, Claim } from '../models/FinanceProfile';

/**
 * CustomerOpsBridge Service
 * Connects RidZa Financial Services to Customer Operations
 * - Trust Intelligence
 * - Payment Twin
 * - Industry Twin
 */
export class CustomerOpsBridge {
  private logger: winston.Logger;
  private eventBusUrl: string;
  private trustIntelligenceUrl: string;
  private paymentTwinUrl: string;
  private industryTwinUrl: string;
  private serviceRegistryUrl: string;

  constructor(logger: winston.Logger) {
    this.logger = logger;

    this.eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';
    this.trustIntelligenceUrl = process.env.TRUST_INTELLIGENCE_URL || 'http://localhost:4240';
    this.paymentTwinUrl = process.env.PAYMENT_TWIN_URL || 'http://localhost:3012';
    this.industryTwinUrl = process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705';
    this.serviceRegistryUrl = process.env.SERVICE_REGISTRY_URL || 'http://localhost:4399';
  }

  /**
   * Check trust score via Trust Intelligence
   */
  async checkTrustScore(customerId: string): Promise<{ score: number; compliant: boolean; details: any }> {
    try {
      // In production, this would call the Trust Intelligence service
      // For now, simulate with a trust score based on customer ID
      const trustScore = this.calculateTrustScore(customerId);

      return {
        score: trustScore,
        compliant: trustScore >= 60,
        details: {
          identityVerified: trustScore >= 70,
          kycPassed: trustScore >= 60,
          riskLevel: trustScore >= 80 ? 'low' : trustScore >= 60 ? 'medium' : 'high',
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error: any) {
      this.logger.error({
        action: 'trust_check_failed',
        customerId,
        error: error.message
      });

      // Default to fail-safe (compliance check fails)
      return {
        score: 0,
        compliant: false,
        details: { error: error.message }
      };
    }
  }

  /**
   * Process transfer through Customer Operations
   */
  async processTransfer(transfer: TransferRequest): Promise<TransferRequest> {
    try {
      // 1. Compliance check
      const complianceResult = await this.runComplianceCheck(transfer);

      if (!complianceResult.passed) {
        transfer.status = 'failed';
        transfer.failureReason = complianceResult.reason;
        return transfer;
      }

      // 2. Update Payment Twin
      await this.syncPaymentToTwin(transfer);

      // 3. Update Industry Twin (finance)
      await this.syncIndustryTwin(transfer);

      // 4. Mark as processing
      transfer.status = 'processing';

      // 5. Simulate processing completion
      // In production, this would be handled by async workers
      setTimeout(() => {
        transfer.status = 'completed';
        transfer.completedAt = new Date();
        this.publishTransferEvent(transfer, 'completed').catch(console.error);
      }, 1000);

      this.logger.info({
        action: 'transfer_processing',
        transferId: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency
      });

      return transfer;
    } catch (error: any) {
      this.logger.error({
        action: 'process_transfer_failed',
        transferId: transfer.id,
        error: error.message
      });

      transfer.status = 'failed';
      transfer.failureReason = error.message;
      return transfer;
    }
  }

  /**
   * Run compliance check via Trust Intelligence
   */
  async runComplianceCheck(transfer: TransferRequest): Promise<{ passed: boolean; reason?: string }> {
    try {
      // Simulate AML/KYC checks
      const trustCheck = await this.checkTrustScore(transfer.senderId);

      if (!trustCheck.compliant) {
        return {
          passed: false,
          reason: `Trust score ${trustCheck.score} below threshold`
        };
      }

      // Check transaction limits
      if (transfer.amount > 50000) {
        // Flag for additional review for large transactions
        await this.flagForReview(transfer, 'large_transaction');
      }

      // Check sanctioned countries (simplified)
      const sanctionedCountries = ['XX', 'YY']; // Placeholder
      if (transfer.recipientBank && sanctionedCountries.includes(transfer.recipientBank)) {
        return {
          passed: false,
          reason: 'Recipient bank in sanctioned country'
        };
      }

      return { passed: true };
    } catch (error: any) {
      return {
        passed: false,
        reason: error.message
      };
    }
  }

  /**
   * Sync transfer to Payment Twin
   */
  async syncPaymentToTwin(transfer: TransferRequest): Promise<void> {
    try {
      // In production, this would call the Payment Twin API
      // POST http://localhost:3012/api/payments
      this.logger.info({
        action: 'syncing_to_payment_twin',
        transferId: transfer.id,
        endpoint: `${this.paymentTwinUrl}/api/payments`
      });

      // Simulated sync - in production use axios:
      // await axios.post(`${this.paymentTwinUrl}/api/payments`, {
      //   referenceId: transfer.id,
      //   amount: transfer.amount,
      //   currency: transfer.currency,
      //   type: 'transfer',
      //   status: transfer.status
      // });
    } catch (error: any) {
      this.logger.error({
        action: 'payment_twin_sync_failed',
        transferId: transfer.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sync transfer to Industry Twin (finance vertical)
   */
  async syncIndustryTwin(transfer: TransferRequest): Promise<void> {
    try {
      // In production, this would call the Industry Twin API
      this.logger.info({
        action: 'syncing_to_industry_twin',
        transferId: transfer.id,
        industry: 'finance',
        endpoint: `${this.industryTwinUrl}/api/twins/finance`
      });

      // Simulated sync - in production use axios:
      // await axios.post(`${this.industryTwinUrl}/api/twins/finance/transactions`, {
      //   transactionId: transfer.id,
      //   type: 'remittance',
      //   volume: transfer.amount,
      //   currency: transfer.currency,
      //   senderId: transfer.senderId,
      //   recipientId: transfer.recipientId,
      //   timestamp: transfer.createdAt
      // });
    } catch (error: any) {
      this.logger.error({
        action: 'industry_twin_sync_failed',
        transferId: transfer.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Flag transaction for review
   */
  async flagForReview(transfer: TransferRequest, reason: string): Promise<void> {
    try {
      this.logger.warn({
        action: 'transaction_flagged',
        transferId: transfer.id,
        reason,
        senderId: transfer.senderId,
        amount: transfer.amount
      });

      // Publish flag event to Event Bus
      await this.publishEvent('finance.transaction.flagged', {
        transferId: transfer.id,
        reason,
        amount: transfer.amount,
        currency: transfer.currency,
        senderId: transfer.senderId,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      this.logger.error({
        action: 'flag_review_failed',
        transferId: transfer.id,
        error: error.message
      });
    }
  }

  /**
   * Publish transfer event to Event Bus
   */
  async publishTransferEvent(
    transfer: TransferRequest,
    eventType: 'initiated' | 'processing' | 'completed' | 'cancelled' | 'failed'
  ): Promise<void> {
    const event = {
      type: `finance.transfer.${eventType}`,
      transferId: transfer.id,
      senderId: transfer.senderId,
      recipientId: transfer.recipientId,
      amount: transfer.amount,
      currency: transfer.currency,
      status: transfer.status,
      timestamp: new Date().toISOString()
    };

    await this.publishEvent(`finance.transfer.${eventType}`, event);
  }

  /**
   * Publish policy event to Event Bus
   */
  async publishPolicyEvent(policy: InsurancePolicy, eventType: 'created' | 'updated' | 'cancelled'): Promise<void> {
    const event = {
      type: `finance.insurance.policy.${eventType}`,
      policyId: policy.id,
      policyNumber: policy.policyNumber,
      customerId: policy.customerId,
      policyType: policy.policyType,
      coverageAmount: policy.coverageAmount,
      premium: policy.premium,
      status: policy.status,
      timestamp: new Date().toISOString()
    };

    await this.publishEvent(`finance.insurance.policy.${eventType}`, event);
  }

  /**
   * Publish claim event to Event Bus
   */
  async publishClaimEvent(claim: Claim, policy: InsurancePolicy): Promise<void> {
    const event = {
      type: 'finance.insurance.claim.submitted',
      claimId: claim.id,
      claimNumber: claim.claimNumber,
      policyId: claim.policyId,
      policyNumber: policy.policyNumber,
      customerId: policy.customerId,
      claimType: claim.claimType,
      claimedAmount: claim.claimedAmount,
      status: claim.status,
      timestamp: new Date().toISOString()
    };

    await this.publishEvent('finance.insurance.claim.submitted', event);
  }

  /**
   * Publish event to Event Bus
   */
  private async publishEvent(eventType: string, data: any): Promise<void> {
    try {
      // In production, this would call the Event Bus API
      // await axios.post(`${this.eventBusUrl}/api/events`, {
      //   type: eventType,
      //   data,
      //   source: 'ridza-integration',
      //   timestamp: new Date().toISOString()
      // });

      this.logger.info({
        action: 'event_published',
        eventType,
        source: 'ridza-integration'
      });
    } catch (error: any) {
      this.logger.error({
        action: 'event_publish_failed',
        eventType,
        error: error.message
      });
    }
  }

  /**
   * Register service with Service Registry
   */
  async registerService(): Promise<void> {
    try {
      // In production:
      // await axios.post(`${this.serviceRegistryUrl}/api/services`, {
      //   name: 'ridza-integration',
      //   port: process.env.PORT || 4972,
      //   type: 'financial-services',
      //   capabilities: ['remittance', 'insurance', 'cfo-dashboard'],
      //   twins: ['payment-twin', 'industry-twin-finance', 'trust-intelligence']
      // });

      this.logger.info({
        action: 'service_registered',
        service: 'ridza-integration',
        port: process.env.PORT || 4972
      });
    } catch (error: any) {
      this.logger.error({
        action: 'service_registration_failed',
        error: error.message
      });
    }
  }

  /**
   * Calculate trust score (simplified simulation)
   */
  private calculateTrustScore(customerId: string): number {
    // Simulate trust score based on customer ID hash
    // In production, this would come from Trust Intelligence service
    const hash = customerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 60 + (hash % 40); // Returns 60-99
  }

  /**
   * Health check for connected services
   */
  async healthCheck(): Promise<{
    trustIntelligence: boolean;
    paymentTwin: boolean;
    industryTwin: boolean;
    eventBus: boolean;
  }> {
    const status = {
      trustIntelligence: false,
      paymentTwin: false,
      industryTwin: false,
      eventBus: false
    };

    try {
      // In production, ping each service
      // status.trustIntelligence = (await axios.get(`${this.trustIntelligenceUrl}/health`)).status === 200;
      // status.paymentTwin = (await axios.get(`${this.paymentTwinUrl}/health`)).status === 200;
      // status.industryTwin = (await axios.get(`${this.industryTwinUrl}/health`)).status === 200;
      // status.eventBus = (await axios.get(`${this.eventBusUrl}/health`)).status === 200;

      // For demo, assume all services are healthy
      status.trustIntelligence = true;
      status.paymentTwin = true;
      status.industryTwin = true;
      status.eventBus = true;
    } catch (error) {
      this.logger.error({
        action: 'health_check_failed',
        error: (error as Error).message
      });
    }

    return status;
  }
}
