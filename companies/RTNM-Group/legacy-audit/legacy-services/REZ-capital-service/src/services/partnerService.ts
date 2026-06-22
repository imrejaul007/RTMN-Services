import axios, { AxiosInstance } from 'axios';
import { ILoan } from '../models/Loan';
import { nbfcPartners, NBFCPartnerConfig } from '../config/nbfcPartners';
import logger from '../utils/logger';

export type DisbursementStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface DisbursementResult {
  partnerRef: string;
  status: DisbursementStatus;
  message?: string;
}

export interface PartnerStatus {
  ref: string;
  status: DisbursementStatus;
  amount?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class PartnerService {
  private clients: Map<string, AxiosInstance> = new Map();

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize HTTP clients for each NBFC partner
   */
  private initializeClients(): void {
    for (const [partnerId, config] of Object.entries(nbfcPartners)) {
      const client = axios.create({
        baseURL: config.apiUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      });

      // Add auth interceptor
      client.interceptors.request.use((config) => {
        if (config.headers) {
          config.headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        return config;
      });

      // Add response interceptor for error handling
      client.interceptors.response.use(
        (response) => response,
        (error) => {
          logger.error(`NBFC Partner ${partnerId} API error:`, error.message);
          return Promise.reject(error);
        }
      );

      this.clients.set(partnerId, client);
    }
  }

  /**
   * Initiate disbursement via NBFC partner
   */
  async initiateDisbursement(
    loan: ILoan,
    partnerId: string
  ): Promise<string> {
    const config = nbfcPartners[partnerId];

    if (!config) {
      throw new Error(`Unknown NBFC partner: ${partnerId}`);
    }

    const client = this.clients.get(partnerId);
    if (!client) {
      throw new Error(`Client not initialized for partner: ${partnerId}`);
    }

    try {
      logger.info(`Initiating disbursement via ${partnerId} for loan ${loan._id}`);

      // Map our loan type to partner's loan type
      const partnerLoanType = this.mapLoanType(loan.type, config);

      const payload = {
        loan_id: loan._id.toString(),
        merchant_id: loan.merchantId,
        amount: loan.amount,
        currency: 'INR',
        loan_type: partnerLoanType,
        tenure_days: loan.tenure,
        interest_rate: loan.interestRate,
        purpose: loan.purpose || 'business_financing',
        repayment_schedule: loan.repaymentSchedule.map((entry) => ({
          due_date: entry.dueDate.toISOString(),
          amount: entry.amount,
        })),
        callback_url: `${process.env.CALLBACK_BASE_URL}/api/webhooks/partner/${partnerId}`,
      };

      const response = await client.post(config.endpoints.disbursement, payload);

      const partnerRef = response.data?.reference_id || response.data?.disbursement_id;

      if (!partnerRef) {
        throw new Error(`No reference ID in partner response`);
      }

      logger.info(`Disbursement initiated: ${partnerRef} via ${partnerId}`);
      return partnerRef;
    } catch (error: any) {
      logger.error(`Failed to initiate disbursement via ${partnerId}:`, error.message);
      throw new Error(`Partner disbursement failed: ${error.message}`);
    }
  }

  /**
   * Check disbursement status with partner
   */
  async checkDisbursementStatus(
    partnerId: string,
    ref: string
  ): Promise<PartnerStatus> {
    const config = nbfcPartners[partnerId];

    if (!config) {
      throw new Error(`Unknown NBFC partner: ${partnerId}`);
    }

    const client = this.clients.get(partnerId);
    if (!client) {
      throw new Error(`Client not initialized for partner: ${partnerId}`);
    }

    try {
      const endpoint = config.endpoints.status.replace('{ref}', ref);
      const response = await client.get(endpoint);

      return {
        ref,
        status: this.mapStatus(response.data?.status),
        amount: response.data?.amount,
        timestamp: new Date(response.data?.timestamp || Date.now()),
        metadata: response.data,
      };
    } catch (error: any) {
      logger.error(`Failed to check status via ${partnerId}:`, error.message);
      throw new Error(`Partner status check failed: ${error.message}`);
    }
  }

  /**
   * Process repayment via partner
   */
  async processRepaymentViaPartner(
    loanId: string,
    amount: number
  ): Promise<void> {
    // In production, this would notify the partner about the repayment
    // For now, we log it
    logger.info(`Repayment processed for loan ${loanId}: ${amount}`);

    // This could be extended to:
    // 1. Notify partner about repayment
    // 2. Reconcile with partner records
    // 3. Handle partial repayments
  }

  /**
   * Get partner health/availability status
   */
  async getPartnerHealth(partnerId: string): Promise<{
    available: boolean;
    latency: number;
    lastCheck: Date;
  }> {
    const config = nbfcPartners[partnerId];

    if (!config) {
      throw new Error(`Unknown NBFC partner: ${partnerId}`);
    }

    const client = this.clients.get(partnerId);
    if (!client) {
      return { available: false, latency: -1, lastCheck: new Date() };
    }

    const start = Date.now();

    try {
      await client.get(config.endpoints.health || '/health');
      const latency = Date.now() - start;

      return {
        available: true,
        latency,
        lastCheck: new Date(),
      };
    } catch {
      return {
        available: false,
        latency: -1,
        lastCheck: new Date(),
      };
    }
  }

  /**
   * Get all available partners
   */
  getAvailablePartners(): string[] {
    return Object.keys(nbfcPartners).filter(
      (id) => nbfcPartners[id as keyof typeof nbfcPartners].enabled
    );
  }

  /**
   * Map our loan types to partner-specific types
   */
  private mapLoanType(
    loanType: string,
    config: NBFCPartnerConfig
  ): string {
    // Capital Float style types
    const typeMap: Record<string, Record<string, string>> = {
      capital_float: {
        revenue_advance: 'daily_revenue_advance',
        term_loan: 'business_loan',
        credit_line: 'working_capital',
      },
      pinelabs: {
        revenue_advance: 'merchant_advance',
        term_loan: 'term_loan',
        credit_line: 'credit_facility',
      },
    };

    const partnerMap = typeMap[config.name.toLowerCase().replace(' ', '_')] || {
      revenue_advance: 'advance',
      term_loan: 'loan',
      credit_line: 'credit',
    };

    return partnerMap[loanType] || loanType;
  }

  /**
   * Map partner status to our internal status
   */
  private mapStatus(partnerStatus: string): DisbursementStatus {
    const statusMap: Record<string, DisbursementStatus> = {
      pending: 'pending',
      processing: 'processing',
      in_progress: 'processing',
      completed: 'completed',
      success: 'completed',
      failed: 'failed',
      rejected: 'failed',
      cancelled: 'failed',
    };

    return statusMap[partnerStatus?.toLowerCase()] || 'pending';
  }

  /**
   * Verify partner webhook signature using HMAC-SHA256
   */
  verifyWebhookSignature(
    partnerId: string,
    payload: string,
    signature: string
  ): boolean {
    const config = nbfcPartners[partnerId];

    if (!config || !config.webhookSecret) {
      logger.warn(`Webhook verification failed: missing config or secret for partner ${partnerId}`);
      return false;
    }

    // Compute expected signature using HMAC-SHA256
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(payload, 'utf8')
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch {
      return false;
    }
  }
}

export const partnerService = new PartnerService();
