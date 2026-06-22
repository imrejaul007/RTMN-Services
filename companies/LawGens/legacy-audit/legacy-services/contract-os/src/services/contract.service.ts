import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Contract, ContractSignature, ContractExecution } from '../models/contract.model';
import { logger } from '../utils/logger';
import config from '../config';

export interface CreateContractInput {
  type: string;
  version?: string;
  parties: {
    buyer: { entityId: string; name: string; walletAddress?: string };
    seller: { entityId: string; name: string; walletAddress?: string };
  };
  terms: {
    items: any[];
    delivery: any;
    payment: any;
    quality: any;
  };
  machineReadable?: {
    executeOn?: any[];
    escalateOn?: any[];
    autoRenew?: boolean;
    renewalTerms?: any;
  };
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface UpdateContractInput {
  terms?: any;
  machineReadable?: any;
  status?: string;
  expiresAt?: Date;
  metadata?: any;
}

export interface ExecuteContractInput {
  action: string;
  params?: Record<string, any>;
  triggeredBy?: string;
}

class ContractService {
  /**
   * Generate a unique contract ID
   */
  private generateContractId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `CTR-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate a unique execution ID
   */
  private generateExecutionId(): string {
    return `EXEC-${uuidv4()}`;
  }

  /**
   * Generate a unique signature ID
   */
  private generateSignatureId(): string {
    return `SIG-${uuidv4()}`;
  }

  /**
   * Generate signature hash
   */
  private generateSignatureHash(contractId: string, party: string, timestamp: Date): string {
    const data = `${contractId}:${party}:${timestamp.toISOString()}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Create a new contract
   */
  async createContract(input: CreateContractInput): Promise<any> {
    try {
      const contractId = this.generateContractId();

      const contract = new Contract({
        contractId,
        type: input.type,
        version: input.version || '1.0.0',
        parties: input.parties,
        terms: input.terms,
        machineReadable: {
          executeOn: input.machineReadable?.executeOn || [],
          escalateOn: input.machineReadable?.escalateOn || [],
          autoRenew: input.machineReadable?.autoRenew || false,
          renewalTerms: input.machineReadable?.renewalTerms,
        },
        status: 'draft',
        expiresAt: input.expiresAt || new Date(Date.now() + config.contract.defaultExpiryDays * 24 * 60 * 60 * 1000),
        metadata: input.metadata,
      });

      await contract.save();

      logger.info(`Contract created: ${contractId}`, {
        contractId,
        type: input.type,
        buyer: input.parties.buyer.entityId,
        seller: input.parties.seller.entityId,
      });

      return contract;
    } catch (error: any) {
      logger.error('Failed to create contract', { error: error.message });
      throw error;
    }
  }

  /**
   * Get contract by ID
   */
  async getContract(contractId: string): Promise<any> {
    try {
      const contract = await Contract.findOne({ contractId });

      if (!contract) {
        throw new Error(`Contract not found: ${contractId}`);
      }

      return contract;
    } catch (error: any) {
      logger.error('Failed to get contract', { contractId, error: error.message });
      throw error;
    }
  }

  /**
   * Get contracts for an entity (as buyer or seller)
   */
  async getContracts(entityId: string, options?: { status?: string; type?: string; limit?: number; offset?: number }): Promise<any[]> {
    try {
      const query: any = {
        $or: [
          { 'parties.buyer.entityId': entityId },
          { 'parties.seller.entityId': entityId },
        ],
      };

      if (options?.status) {
        query.status = options.status;
      }

      if (options?.type) {
        query.type = options.type;
      }

      const contracts = await Contract.find(query)
        .sort({ createdAt: -1 })
        .skip(options?.offset || 0)
        .limit(options?.limit || 50);

      return contracts;
    } catch (error: any) {
      logger.error('Failed to get contracts', { entityId, error: error.message });
      throw error;
    }
  }

  /**
   * Update contract
   */
  async updateContract(contractId: string, updates: UpdateContractInput): Promise<any> {
    try {
      const contract = await Contract.findOne({ contractId });

      if (!contract) {
        throw new Error(`Contract not found: ${contractId}`);
      }

      if (!['draft', 'pending_signature'].includes(contract.status)) {
        throw new Error(`Cannot update contract with status: ${contract.status}`);
      }

      // Apply updates
      if (updates.terms) {
        contract.terms = { ...contract.terms, ...updates.terms };
      }
      if (updates.machineReadable) {
        contract.machineReadable = { ...contract.machineReadable, ...updates.machineReadable };
      }
      if (updates.status) {
        contract.status = updates.status as any;
      }
      if (updates.expiresAt) {
        contract.expiresAt = updates.expiresAt;
      }
      if (updates.metadata) {
        contract.metadata = { ...contract.metadata, ...updates.metadata };
      }

      // Increment version for updates
      const versionParts = contract.version.split('.');
      versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
      contract.version = versionParts.join('.');

      await contract.save();

      logger.info(`Contract updated: ${contractId}`, { version: contract.version });

      return contract;
    } catch (error: any) {
      logger.error('Failed to update contract', { contractId, error: error.message });
      throw error;
    }
  }

  /**
   * Sign contract
   */
  async signContract(contractId: string, party: 'buyer' | 'seller', signedBy: string, signature?: string): Promise<any> {
    try {
      const contract = await Contract.findOne({ contractId });

      if (!contract) {
        throw new Error(`Contract not found: ${contractId}`);
      }

      // Verify party is part of contract
      if (party === 'buyer' && contract.parties.buyer.entityId !== signedBy) {
        throw new Error('Unauthorized: Buyer signature mismatch');
      }
      if (party === 'seller' && contract.parties.seller.entityId !== signedBy) {
        throw new Error('Unauthorized: Seller signature mismatch');
      }

      // Check if already signed by this party
      const existingSignature = await ContractSignature.findOne({ contractId, party });
      if (existingSignature) {
        throw new Error(`Contract already signed by ${party}`);
      }

      // Create signature record
      const signedAt = new Date();
      const signatureId = this.generateSignatureId();
      const signatureHash = signature || this.generateSignatureHash(contractId, party, signedAt);

      const signatureRecord = new ContractSignature({
        signatureId,
        contractId,
        party,
        signedBy,
        signedAt,
        signatureHash,
      });

      await signatureRecord.save();

      // Check if both parties have signed
      const signatures = await ContractSignature.find({ contractId });

      if (signatures.length === 2) {
        contract.status = 'active';
        await contract.save();

        logger.info(`Contract activated: ${contractId}`, { signatures: signatures.length });
      } else {
        contract.status = 'pending_signature';
        await contract.save();

        logger.info(`Contract partially signed: ${contractId}`, { party, signatures: signatures.length });
      }

      return {
        contract,
        signature: signatureRecord,
      };
    } catch (error: any) {
      logger.error('Failed to sign contract', { contractId, party, error: error.message });
      throw error;
    }
  }

  /**
   * Execute contract action
   */
  async executeContract(contractId: string, input: ExecuteContractInput): Promise<any> {
    try {
      const contract = await Contract.findOne({ contractId });

      if (!contract) {
        throw new Error(`Contract not found: ${contractId}`);
      }

      if (contract.status !== 'active') {
        throw new Error(`Cannot execute contract with status: ${contract.status}`);
      }

      // Check expiry
      if (contract.expiresAt && contract.expiresAt < new Date()) {
        contract.status = 'expired';
        await contract.save();
        throw new Error('Contract has expired');
      }

      const executionId = this.generateExecutionId();
      const triggeredAt = new Date();

      let result: any = {
        success: false,
        message: '',
      };

      try {
        // Find matching execution rule
        const executeRule = contract.machineReadable.executeOn.find(
          (rule) => rule.action === input.action
        );

        if (!executeRule) {
          throw new Error(`No execution rule found for action: ${input.action}`);
        }

        // Execute the action
        switch (input.action) {
          case 'release_payment':
            result = await this.executePaymentRelease(contract, input.params);
            break;
          case 'deliver_service':
            result = await this.executeServiceDelivery(contract, input.params);
            break;
          case 'terminate_contract':
            result = await this.executeTermination(contract, input.params);
            break;
          case 'renew_contract':
            result = await this.executeRenewal(contract, input.params);
            break;
          case 'apply_penalty':
            result = await this.executePenalty(contract, input.params);
            break;
          default:
            result = {
              success: true,
              data: { action: input.action, params: input.params },
              message: `Action ${input.action} executed successfully`,
            };
        }

        // Create execution record
        const execution = new ContractExecution({
          executionId,
          contractId,
          action: input.action,
          triggeredAt,
          result: {
            success: true,
            data: result.data || result,
            message: result.message,
          },
          metadata: {
            triggeredBy: input.triggeredBy,
            params: input.params,
          },
        });

        await execution.save();

        // Check if contract is fully executed
        const executedActions = await ContractExecution.countDocuments({ contractId });
        if (executedActions >= contract.machineReadable.executeOn.length) {
          contract.status = 'executed';
          await contract.save();
        }

        logger.info(`Contract executed: ${contractId}`, { action: input.action, executionId });

        return {
          execution,
          contract,
          result,
        };
      } catch (actionError: any) {
        // Record failed execution
        const execution = new ContractExecution({
          executionId,
          contractId,
          action: input.action,
          triggeredAt,
          error: actionError.message,
          retryCount: 0,
          metadata: {
            triggeredBy: input.triggeredBy,
            params: input.params,
          },
        });

        await execution.save();

        // Check for escalation
        const escalateRule = contract.machineReadable.escalateOn.find(
          (rule) => rule.condition === actionError.message
        );

        if (escalateRule) {
          logger.warn(`Contract escalation triggered: ${contractId}`, {
            action: escalateRule.action,
            notify: escalateRule.notify,
          });
        }

        throw actionError;
      }
    } catch (error: any) {
      logger.error('Failed to execute contract', { contractId, error: error.message });
      throw error;
    }
  }

  /**
   * Execute payment release
   */
  private async executePaymentRelease(contract: any, params?: any): Promise<any> {
    logger.info(`Payment release triggered for contract: ${contract.contractId}`, params);

    return {
      success: true,
      data: {
        action: 'release_payment',
        amount: contract.terms.payment.amount,
        currency: contract.terms.payment.currency || 'USD',
        recipient: contract.parties.seller.walletAddress,
      },
      message: 'Payment released successfully',
    };
  }

  /**
   * Execute service delivery
   */
  private async executeServiceDelivery(contract: any, params?: any): Promise<any> {
    logger.info(`Service delivery triggered for contract: ${contract.contractId}`, params);

    return {
      success: true,
      data: {
        action: 'deliver_service',
        items: contract.terms.items,
        deliveredAt: new Date().toISOString(),
      },
      message: 'Service delivered successfully',
    };
  }

  /**
   * Execute contract termination
   */
  private async executeTermination(contract: any, params?: any): Promise<any> {
    contract.status = 'terminated';
    await contract.save();

    return {
      success: true,
      data: {
        action: 'terminate_contract',
        terminatedAt: new Date().toISOString(),
        reason: params?.reason || 'Manual termination',
      },
      message: 'Contract terminated successfully',
    };
  }

  /**
   * Execute contract renewal
   */
  private async executeRenewal(contract: any, params?: any): Promise<any> {
    const renewalDays = contract.machineReadable.renewalTerms?.periodDays || 365;
    contract.expiresAt = new Date(Date.now() + renewalDays * 24 * 60 * 60 * 1000);

    if (contract.machineReadable.renewalTerms?.priceAdjustment) {
      contract.terms.payment.amount = contract.terms.payment.amount *
        (1 + contract.machineReadable.renewalTerms.priceAdjustment / 100);
    }

    await contract.save();

    return {
      success: true,
      data: {
        action: 'renew_contract',
        newExpiry: contract.expiresAt.toISOString(),
        priceAdjusted: contract.machineReadable.renewalTerms?.priceAdjustment || 0,
      },
      message: 'Contract renewed successfully',
    };
  }

  /**
   * Execute penalty
   */
  private async executePenalty(contract: any, params?: any): Promise<any> {
    const penaltyAmount = params?.penaltyAmount || contract.terms.delivery?.penaltyAmount || 0;

    return {
      success: true,
      data: {
        action: 'apply_penalty',
        penaltyAmount,
        reason: params?.reason || 'Delivery penalty',
      },
      message: `Penalty of ${penaltyAmount} applied`,
    };
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(contractId: string, limit?: number): Promise<any[]> {
    try {
      const executions = await ContractExecution.find({ contractId })
        .sort({ triggeredAt: -1 })
        .limit(limit || 100);

      return executions;
    } catch (error: any) {
      logger.error('Failed to get execution history', { contractId, error: error.message });
      throw error;
    }
  }

  /**
   * Validate contract
   */
  async validateContract(contractId: string): Promise<any> {
    try {
      const contract = await Contract.findOne({ contractId });

      if (!contract) {
        return {
          valid: false,
          errors: ['Contract not found'],
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      if (!contract.parties?.buyer?.entityId) {
        errors.push('Missing buyer information');
      }
      if (!contract.parties?.seller?.entityId) {
        errors.push('Missing seller information');
      }
      if (!contract.terms?.items?.length) {
        errors.push('No items defined in contract terms');
      }

      // Check status
      if (contract.status === 'expired') {
        errors.push('Contract has expired');
      }
      if (contract.status === 'terminated') {
        errors.push('Contract has been terminated');
      }

      // Check signatures
      const signatures = await ContractSignature.find({ contractId });
      if (signatures.length < 2) {
        warnings.push(`Contract requires 2 signatures, currently has ${signatures.length}`);
      }

      // Check expiry
      if (contract.expiresAt && contract.expiresAt < new Date()) {
        warnings.push('Contract is approaching expiration');
      }

      // Validate machine readable rules
      if (!contract.machineReadable?.executeOn?.length) {
        warnings.push('No automatic execution rules defined');
      }

      return {
        valid: errors.length === 0,
        contractId,
        status: contract.status,
        errors,
        warnings,
        signatureCount: signatures.length,
        executionCount: await ContractExecution.countDocuments({ contractId }),
      };
    } catch (error: any) {
      logger.error('Failed to validate contract', { contractId, error: error.message });
      throw error;
    }
  }

  /**
   * Get contract statistics
   */
  async getContractStats(): Promise<any> {
    try {
      const total = await Contract.countDocuments();
      const byStatus = await Contract.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      const byType = await Contract.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]);

      return {
        total,
        byStatus: byStatus.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
        byType: byType.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
      };
    } catch (error: any) {
      logger.error('Failed to get contract stats', { error: error.message });
      throw error;
    }
  }
}

export const contractService = new ContractService();
export default contractService;