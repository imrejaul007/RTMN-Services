// ============================================================================
// SUTAR Contract OS - External Integrations Service
// Economy OS (port 4251) and Trust Engine (port 4180)
// ============================================================================

import { Contract, Party, PaymentRecord, TrustEngineVerification } from '../types/index';

// Configuration
const ECONOMY_OS_URL = process.env.ECONOMY_OS_URL || 'http://localhost:4251';
const TRUST_ENGINE_URL = process.env.TRUST_ENGINE_URL || 'http://localhost:4180';

// Integration status cache
const integrationStatus = new Map<string, {
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastChecked: string;
  latency?: number;
  error?: string;
}>();

// HTTP Helper
async function httpRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<{ ok: boolean; status: number; data?: any; error?: string }> {
  const startTime = Date.now();
  const timeout = options.timeout || 10000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);
    const latency = Date.now() - startTime;

    return {
      ok: response.ok,
      status: response.status,
      data,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return {
      ok: false,
      status: 0,
      error: error.message || 'Request failed',
    };
  }
}

// Integration Service
export const integrationService = {
  // =========================================================================
  // Economy OS Integration
  // =========================================================================

  economyOs: {
    // Create payment record for contract
    createPayment: async (
      contractId: string,
      amount: number,
      currency: string,
      type: 'invoice' | 'milestone' | 'recurring' | 'penalty' | 'bonus',
      description: string,
      dueDate: string
    ): Promise<PaymentRecord | null> => {
      const result = await httpRequest(`${ECONOMY_OS_URL}/api/v1/payments`, {
        method: 'POST',
        body: {
          reference: contractId,
          referenceType: 'contract',
          amount,
          currency,
          type,
          description,
          dueDate,
          metadata: {
            source: 'sutar-contract-os',
          },
        },
      });

      if (result.ok && result.data) {
        console.log(`[ECONOMY] Created payment: ${result.data.id} for contract ${contractId}`);
        return {
          id: result.data.id,
          contractId,
          amount,
          currency,
          type,
          status: 'pending',
          dueDate,
          description,
          createdAt: new Date().toISOString(),
          economyPaymentId: result.data.id,
        };
      }

      console.error(`[ECONOMY] Failed to create payment: ${result.error}`);
      return null;
    },

    // Create invoice for contract
    createInvoice: async (
      contract: Contract,
      description: string,
      dueDate?: string
    ): Promise<{ invoiceId: string; paymentId: string } | null> => {
      const result = await httpRequest(`${ECONOMY_OS_URL}/api/v1/invoices`, {
        method: 'POST',
        body: {
          customerName: contract.parties[0]?.name || 'Unknown',
          customerEmail: contract.parties[0]?.email || '',
          amount: contract.value || 0,
          currency: contract.currency || 'INR',
          description: description || `Invoice for contract ${contract.title}`,
          dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          lineItems: [
            {
              description: contract.title,
              quantity: 1,
              unitPrice: contract.value || 0,
              total: contract.value || 0,
            },
          ],
          metadata: {
            contractId: contract.id,
            source: 'sutar-contract-os',
          },
        },
      });

      if (result.ok && result.data) {
        console.log(`[ECONOMY] Created invoice: ${result.data.id} for contract ${contract.id}`);
        return {
          invoiceId: result.data.id,
          paymentId: result.data.paymentId,
        };
      }

      console.error(`[ECONOMY] Failed to create invoice: ${result.error}`);
      return null;
    },

    // Create milestone payment
    createMilestonePayment: async (
      contractId: string,
      milestoneName: string,
      amount: number,
      currency: string,
      dueDate: string
    ): Promise<PaymentRecord | null> => {
      return integrationService.economyOs.createPayment(
        contractId,
        amount,
        currency,
        'milestone',
        `Milestone: ${milestoneName}`,
        dueDate
      );
    },

    // Process penalty from SLA breach
    processPenalty: async (
      contractId: string,
      penaltyAmount: number,
      currency: string,
      reason: string
    ): Promise<PaymentRecord | null> => {
      return integrationService.economyOs.createPayment(
        contractId,
        penaltyAmount,
        currency,
        'penalty',
        `SLA Penalty: ${reason}`,
        new Date().toISOString()
      );
    },

    // Process bonus for exceeding SLA
    processBonus: async (
      contractId: string,
      bonusAmount: number,
      currency: string,
      reason: string
    ): Promise<PaymentRecord | null> => {
      return integrationService.economyOs.createPayment(
        contractId,
        bonusAmount,
        currency,
        'bonus',
        `SLA Bonus: ${reason}`,
        new Date().toISOString()
      );
    },

    // Get payment status
    getPaymentStatus: async (paymentId: string): Promise<{
      status: string;
      amount: number;
      paidAt?: string;
    } | null> => {
      const result = await httpRequest(`${ECONOMY_OS_URL}/api/v1/payments/${paymentId}`);

      if (result.ok && result.data) {
        return {
          status: result.data.status,
          amount: result.data.amount,
          paidAt: result.data.paidAt,
        };
      }

      return null;
    },

    // Setup recurring payment
    setupRecurringPayment: async (
      contract: Contract,
      frequency: 'monthly' | 'quarterly' | 'annually'
    ): Promise<{ subscriptionId: string } | null> => {
      const amount = contract.value || 0;
      const currency = contract.currency || 'INR';

      const result = await httpRequest(`${ECONOMY_OS_URL}/api/v1/subscriptions`, {
        method: 'POST',
        body: {
          customerName: contract.parties[0]?.name || 'Unknown',
          customerEmail: contract.parties[0]?.email || '',
          amount,
          currency,
          frequency,
          description: `Recurring payment for ${contract.title}`,
          startDate: contract.startDate,
          metadata: {
            contractId: contract.id,
            source: 'sutar-contract-os',
          },
        },
      });

      if (result.ok && result.data) {
        console.log(`[ECONOMY] Created subscription: ${result.data.id} for contract ${contract.id}`);
        return {
          subscriptionId: result.data.id,
        };
      }

      console.error(`[ECONOMY] Failed to create subscription: ${result.error}`);
      return null;
    },

    // Get contract payments
    getContractPayments: async (contractId: string): Promise<PaymentRecord[]> => {
      const result = await httpRequest(`${ECONOMY_OS_URL}/api/v1/payments?reference=${contractId}`);

      if (result.ok && result.data) {
        return (result.data.payments || []).map((p: any) => ({
          id: p.id,
          contractId,
          amount: p.amount,
          currency: p.currency,
          type: p.type,
          status: p.status,
          dueDate: p.dueDate,
          paidAt: p.paidAt,
          description: p.description,
          createdAt: p.createdAt,
          economyPaymentId: p.id,
        }));
      }

      return [];
    },

    // Check service health
    checkHealth: async (): Promise<{ healthy: boolean; latency?: number; error?: string }> => {
      const startTime = Date.now();
      const result = await httpRequest(`${ECONOMY_OS_URL}/health`, { timeout: 5000 });
      const latency = Date.now() - startTime;

      if (result.ok) {
        return { healthy: true, latency };
      }

      return { healthy: false, latency, error: result.error };
    },
  },

  // =========================================================================
  // Trust Engine Integration
  // =========================================================================

  trustEngine: {
    // Verify a party
    verifyParty: async (
      party: Party
    ): Promise<TrustEngineVerification | null> => {
      const result = await httpRequest(`${TRUST_ENGINE_URL}/api/v1/verifications`, {
        method: 'POST',
        body: {
          subjectType: 'party',
          subjectId: party.id,
          subjectName: party.name,
          subjectEmail: party.email,
          subjectPhone: party.phone,
          entityType: party.entityType || 'individual',
          taxId: party.taxId,
          address: party.address,
          checks: ['identity', 'address', 'sanctions', 'pep'],
          metadata: {
            source: 'sutar-contract-os',
            contractPartyId: party.id,
          },
        },
      });

      if (result.ok && result.data) {
        console.log(`[TRUST] Started verification: ${result.data.verificationId} for party ${party.id}`);
        return {
          partyId: party.id,
          verificationId: result.data.verificationId,
          status: 'pending',
          documents: [],
        };
      }

      console.error(`[TRUST] Failed to start verification: ${result.error}`);
      return null;
    },

    // Get verification status
    getVerificationStatus: async (verificationId: string): Promise<TrustEngineVerification | null> => {
      const result = await httpRequest(`${TRUST_ENGINE_URL}/api/v1/verifications/${verificationId}`);

      if (result.ok && result.data) {
        return {
          partyId: result.data.subjectId,
          verificationId: result.data.id,
          status: result.data.status,
          verifiedAt: result.data.verifiedAt,
          documents: (result.data.documents || []).map((d: any) => ({
            type: d.type,
            documentId: d.id,
            status: d.status,
            uploadedAt: d.uploadedAt,
            verifiedAt: d.verifiedAt,
          })),
          riskScore: result.data.riskScore,
          kycStatus: result.data.kycStatus,
        };
      }

      return null;
    },

    // Upload verification document
    uploadDocument: async (
      verificationId: string,
      documentType: string,
      documentData: string
    ): Promise<{ documentId: string } | null> => {
      const result = await httpRequest(
        `${TRUST_ENGINE_URL}/api/v1/verifications/${verificationId}/documents`,
        {
          method: 'POST',
          body: {
            type: documentType,
            data: documentData,
          },
        }
      );

      if (result.ok && result.data) {
        console.log(`[TRUST] Uploaded document: ${result.data.id} for verification ${verificationId}`);
        return {
          documentId: result.data.id,
        };
      }

      console.error(`[TRUST] Failed to upload document: ${result.error}`);
      return null;
    },

    // Get party risk score
    getRiskScore: async (partyId: string): Promise<{
      score: number;
      level: 'low' | 'medium' | 'high';
      factors: string[];
    } | null> => {
      const result = await httpRequest(`${TRUST_ENGINE_URL}/api/v1/parties/${partyId}/risk`);

      if (result.ok && result.data) {
        return {
          score: result.data.score,
          level: result.data.level,
          factors: result.data.factors || [],
        };
      }

      return null;
    },

    // Check sanctions
    checkSanctions: async (party: Party): Promise<{
      isClean: boolean;
      matches?: Array<{ list: string; entry: string }>;
    }> => {
      const result = await httpRequest(`${TRUST_ENGINE_URL}/api/v1/checks/sanctions`, {
        method: 'POST',
        body: {
          name: party.name,
          taxId: party.taxId,
          email: party.email,
        },
      });

      if (result.ok && result.data) {
        return {
          isClean: result.data.isClean,
          matches: result.data.matches,
        };
      }

      // Assume clean if check fails
      return { isClean: true };
    },

    // Verify company
    verifyCompany: async (
      companyName: string,
      registrationNumber: string,
      taxId: string
    ): Promise<{
      verified: boolean;
      companyDetails?: {
        name: string;
        registrationNumber: string;
        incorporationDate: string;
        status: string;
        registeredAddress: any;
      };
    }> => {
      const result = await httpRequest(`${TRUST_ENGINE_URL}/api/v1/checks/company`, {
        method: 'POST',
        body: {
          name: companyName,
          registrationNumber,
          taxId,
        },
      });

      if (result.ok && result.data) {
        return {
          verified: result.data.verified,
          companyDetails: result.data.details,
        };
      }

      return { verified: false };
    },

    // Create KYC check
    createKycCheck: async (
      party: Party,
      checkType: 'basic' | 'enhanced' | 'full'
    ): Promise<{ kycId: string; status: string } | null> => {
      const result = await httpRequest(`${TRUST_ENGINE_URL}/api/v1/kyc`, {
        method: 'POST',
        body: {
          subjectType: 'party',
          subjectId: party.id,
          subjectName: party.name,
          subjectEmail: party.email,
          checkType,
          metadata: {
            source: 'sutar-contract-os',
          },
        },
      });

      if (result.ok && result.data) {
        console.log(`[TRUST] Created KYC check: ${result.data.id} for party ${party.id}`);
        return {
          kycId: result.data.id,
          status: result.data.status,
        };
      }

      console.error(`[TRUST] Failed to create KYC check: ${result.error}`);
      return null;
    },

    // Get KYC status
    getKycStatus: async (kycId: string): Promise<{
      status: 'pending' | 'approved' | 'rejected';
      approvedAt?: string;
      rejectedAt?: string;
      rejectionReason?: string;
    } | null> => {
      const result = await httpRequest(`${TRUST_ENGINE_URL}/api/v1/kyc/${kycId}`);

      if (result.ok && result.data) {
        return {
          status: result.data.status,
          approvedAt: result.data.approvedAt,
          rejectedAt: result.data.rejectedAt,
          rejectionReason: result.data.rejectionReason,
        };
      }

      return null;
    },

    // Check service health
    checkHealth: async (): Promise<{ healthy: boolean; latency?: number; error?: string }> => {
      const startTime = Date.now();
      const result = await httpRequest(`${TRUST_ENGINE_URL}/health`, { timeout: 5000 });
      const latency = Date.now() - startTime;

      if (result.ok) {
        return { healthy: true, latency };
      }

      return { healthy: false, latency, error: result.error };
    },
  },

  // =========================================================================
  // General Integration Functions
  // =========================================================================

  // Get all integration statuses
  getIntegrationStatuses: async (): Promise<Record<string, {
    status: 'healthy' | 'unhealthy' | 'unknown';
    latency?: number;
    lastChecked: string;
    error?: string;
  }>> => {
    const [economyHealth, trustHealth] = await Promise.all([
      integrationService.economyOs.checkHealth(),
      integrationService.trustEngine.checkHealth(),
    ]);

    return {
      economyOs: {
        status: economyHealth.healthy ? 'healthy' : 'unhealthy',
        latency: economyHealth.latency,
        lastChecked: new Date().toISOString(),
        error: economyHealth.error,
      },
      trustEngine: {
        status: trustHealth.healthy ? 'healthy' : 'unhealthy',
        latency: trustHealth.latency,
        lastChecked: new Date().toISOString(),
        error: trustHealth.error,
      },
    };
  },

  // Sync contract to external systems
  syncContractToExternal: async (contract: Contract): Promise<{
    economySynced: boolean;
    trustVerified: boolean;
    errors: string[];
  }> => {
    const errors: string[] = [];

    // Create payment record in Economy OS
    if (contract.value && contract.value > 0) {
      const payment = await integrationService.economyOs.createPayment(
        contract.id,
        contract.value,
        contract.currency || 'INR',
        'invoice',
        `Payment for contract: ${contract.title}`,
        contract.endDate
      );

      if (!payment) {
        errors.push('Failed to create payment in Economy OS');
      }
    }

    // Verify parties with Trust Engine
    const partyVerifications: TrustEngineVerification[] = [];
    for (const party of contract.parties) {
      const verification = await integrationService.trustEngine.verifyParty(party);
      if (verification) {
        partyVerifications.push(verification);
      } else {
        errors.push(`Failed to verify party: ${party.name}`);
      }
    }

    return {
      economySynced: errors.filter(e => e.includes('Economy')).length === 0,
      trustVerified: errors.filter(e => e.includes('Trust')).length === 0,
      errors,
    };
  },

  // Get integration statistics
  getIntegrationStats: async (): Promise<{
    economyOsCalls: number;
    trustEngineCalls: number;
    successRate: number;
    averageLatency: number;
  }> => {
    // In a real implementation, this would track actual API calls
    return {
      economyOsCalls: 0,
      trustEngineCalls: 0,
      successRate: 0,
      averageLatency: 0,
    };
  },
};

export default integrationService;
