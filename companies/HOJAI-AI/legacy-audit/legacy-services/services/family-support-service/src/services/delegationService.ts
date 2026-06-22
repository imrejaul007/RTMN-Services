import {
  SupportDelegation,
  IDelegationScope,
  ISupportDelegationDocument,
  DelegationStatus,
  FamilySupportHistory
} from '../models/familySupport';
import { logger } from '../utils/logger';

export interface CreateDelegationParams {
  ownerId: string;
  delegateId: string;
  delegateName: string;
  scope: IDelegationScope;
  expiresAt?: Date;
}

export interface DelegationActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export class DelegationService {
  /**
   * Create a new support delegation from owner to delegate
   */
  async createDelegation(params: CreateDelegationParams): Promise<ISupportDelegationDocument> {
    const { ownerId, delegateId, delegateName, scope, expiresAt } = params;

    logger.info('Creating support delegation', {
      ownerId,
      delegateId,
      delegateName
    });

    // Check for existing active delegation
    const existingDelegation = await SupportDelegation.findOne({
      ownerId,
      delegateId,
      status: { $in: [DelegationStatus.PENDING, DelegationStatus.ACCEPTED] }
    });

    if (existingDelegation) {
      throw new Error('Delegation already exists for this delegate. Please revoke existing delegation first.');
    }

    // Validate scope
    if (!scope.services || scope.services.length === 0) {
      throw new Error('Delegation scope must include at least one service');
    }

    if (!scope.actions || scope.actions.length === 0) {
      throw new Error('Delegation scope must include at least one action');
    }

    const delegation = new SupportDelegation({
      ownerId,
      delegateId,
      delegateName,
      scope: {
        ...scope,
        timeBound: scope.timeBound || !!expiresAt,
        validFrom: scope.validFrom || new Date(),
        validUntil: scope.validUntil || expiresAt
      },
      status: DelegationStatus.PENDING,
      createdAt: new Date(),
      expiresAt
    });

    await delegation.save();

    await this.recordHistory({
      customerId: ownerId,
      familyMemberId: delegateId,
      familyMemberName: delegateName,
      action: 'DELEGATION_CREATED',
      actionType: 'delegation',
      details: {
        delegationId: delegation._id,
        scope: delegation.scope
      }
    });

    logger.info('Support delegation created', {
      delegationId: delegation._id,
      ownerId,
      delegateId
    });

    return delegation;
  }

  /**
   * Revoke an existing delegation
   */
  async revokeDelegation(
    delegationId: string,
    revokedBy: string,
    reason?: string
  ): Promise<boolean> {
    const delegation = await SupportDelegation.findById(delegationId);

    if (!delegation) {
      throw new Error('Delegation not found');
    }

    if (delegation.status === DelegationStatus.REVOKED) {
      throw new Error('Delegation is already revoked');
    }

    const isOwner = delegation.ownerId === revokedBy;
    const isDelegate = delegation.delegateId === revokedBy;

    if (!isOwner && !isDelegate) {
      throw new Error('Only the owner or delegate can revoke this delegation');
    }

    logger.info('Revoking delegation', {
      delegationId,
      revokedBy,
      reason
    });

    delegation.status = DelegationStatus.REVOKED;
    delegation.revokedAt = new Date();
    delegation.revocationReason = reason || 'Manual revocation';
    await delegation.save();

    await this.recordHistory({
      customerId: delegation.ownerId,
      familyMemberId: delegation.delegateId,
      familyMemberName: delegation.delegateName,
      action: 'DELEGATION_REVOKED',
      actionType: 'delegation',
      details: {
        delegationId,
        revokedBy,
        reason: delegation.revocationReason
      }
    });

    logger.info('Delegation revoked', { delegationId });

    return true;
  }

  /**
   * Accept a pending delegation by the delegate
   */
  async acceptDelegation(
    delegationId: string,
    acceptedBy: string
  ): Promise<ISupportDelegationDocument> {
    const delegation = await SupportDelegation.findById(delegationId);

    if (!delegation) {
      throw new Error('Delegation not found');
    }

    if (delegation.delegateId !== acceptedBy) {
      throw new Error('Only the designated delegate can accept this delegation');
    }

    if (delegation.status !== DelegationStatus.PENDING) {
      throw new Error(`Cannot accept delegation with status: ${delegation.status}`);
    }

    // Check if delegation has expired
    if (delegation.expiresAt && new Date() > delegation.expiresAt) {
      delegation.status = DelegationStatus.EXPIRED;
      await delegation.save();
      throw new Error('Delegation has expired');
    }

    logger.info('Accepting delegation', {
      delegationId,
      acceptedBy
    });

    delegation.status = DelegationStatus.ACCEPTED;
    delegation.acceptedAt = new Date();
    await delegation.save();

    await this.recordHistory({
      customerId: delegation.ownerId,
      familyMemberId: delegation.delegateId,
      familyMemberName: delegation.delegateName,
      action: 'DELEGATION_ACCEPTED',
      actionType: 'delegation',
      details: {
        delegationId,
        acceptedAt: delegation.acceptedAt
      }
    });

    logger.info('Delegation accepted', { delegationId });

    return delegation;
  }

  /**
   * Get all delegations for a customer (as owner)
   */
  async getDelegations(customerId: string): Promise<ISupportDelegationDocument[]> {
    const delegations = await SupportDelegation.find({
      ownerId: customerId
    }).sort({ createdAt: -1 });

    logger.info('Retrieved delegations', {
      customerId,
      count: delegations.length
    });

    return delegations;
  }

  /**
   * Get all delegations where a customer is the delegate
   */
  async getDelegationsFor(delegateId: string): Promise<ISupportDelegationDocument[]> {
    const delegations = await SupportDelegation.find({
      delegateId,
      status: { $in: [DelegationStatus.PENDING, DelegationStatus.ACCEPTED] }
    }).sort({ createdAt: -1 });

    logger.info('Retrieved delegations for delegate', {
      delegateId,
      count: delegations.length
    });

    return delegations;
  }

  /**
   * Execute an action as a delegator
   */
  async executeAsDelegator(
    delegationId: string,
    executorId: string,
    action: string,
    service: string,
    resourceType: string,
    resourceId?: string
  ): Promise<DelegationActionResult> {
    const delegation = await SupportDelegation.findById(delegationId);

    if (!delegation) {
      return {
        success: false,
        error: 'Delegation not found'
      };
    }

    if (delegation.delegateId !== executorId) {
      return {
        success: false,
        error: 'You are not the delegate for this delegation'
      };
    }

    if (delegation.status !== DelegationStatus.ACCEPTED) {
      return {
        success: false,
        error: `Delegation is not active. Status: ${delegation.status}`
      };
    }

    // Check expiration
    if (delegation.expiresAt && new Date() > delegation.expiresAt) {
      delegation.status = DelegationStatus.EXPIRED;
      await delegation.save();
      return {
        success: false,
        error: 'Delegation has expired'
      };
    }

    // Check time bounds
    const scope = delegation.scope;
    if (scope.timeBound) {
      const now = new Date();
      if (scope.validFrom && now < scope.validFrom) {
        return {
          success: false,
          error: 'Delegation is not yet valid'
        };
      }
      if (scope.validUntil && now > scope.validUntil) {
        return {
          success: false,
          error: 'Delegation has expired'
        };
      }
    }

    // Validate service
    if (!scope.services.includes(service) && !scope.services.includes('*')) {
      return {
        success: false,
        error: `Service '${service}' is not in delegation scope`
      };
    }

    // Validate action
    if (!scope.actions.includes(action) && !scope.actions.includes('*')) {
      return {
        success: false,
        error: `Action '${action}' is not in delegation scope`
      };
    }

    // Validate resource type
    if (!scope.resourceTypes.includes(resourceType) && !scope.resourceTypes.includes('*')) {
      return {
        success: false,
        error: `Resource type '${resourceType}' is not in delegation scope`
      };
    }

    // Record the action in history
    await this.recordHistory({
      customerId: delegation.ownerId,
      familyMemberId: delegation.delegateId,
      familyMemberName: delegation.delegateName,
      action: `DELEGATED_ACTION:${action}`,
      actionType: 'delegated_action',
      details: {
        delegationId,
        action,
        service,
        resourceType,
        resourceId,
        executedAt: new Date()
      },
      relatedResourceId: resourceId,
      relatedResourceType: resourceType
    });

    logger.info('Delegated action executed', {
      delegationId,
      executorId,
      action,
      service,
      resourceType
    });

    return {
      success: true,
      data: {
        delegationId,
        ownerId: delegation.ownerId,
        delegateId: delegation.delegateId,
        action,
        service,
        executedAt: new Date()
      }
    };
  }

  /**
   * Get delegation by ID
   */
  async getDelegationById(delegationId: string): Promise<ISupportDelegationDocument | null> {
    return SupportDelegation.findById(delegationId);
  }

  /**
   * Get active delegation for owner and delegate pair
   */
  async getActiveDelegation(
    ownerId: string,
    delegateId: string
  ): Promise<ISupportDelegationDocument | null> {
    return SupportDelegation.findOne({
      ownerId,
      delegateId,
      status: DelegationStatus.ACCEPTED,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gt: new Date() } }
      ]
    });
  }

  /**
   * Expire old delegations
   */
  async expireOldDelegations(): Promise<number> {
    const result = await SupportDelegation.updateMany(
      {
        status: DelegationStatus.ACCEPTED,
        expiresAt: { $lt: new Date() }
      },
      {
        $set: { status: DelegationStatus.EXPIRED }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info('Expired old delegations', {
        count: result.modifiedCount
      });
    }

    return result.modifiedCount;
  }

  /**
   * Check if a delegate has access to perform action
   */
  async hasDelegationAccess(
    delegateId: string,
    ownerId: string,
    service: string,
    action: string
  ): Promise<boolean> {
    const delegation = await this.getActiveDelegation(ownerId, delegateId);

    if (!delegation) {
      return false;
    }

    const scope = delegation.scope;

    const serviceMatch = scope.services.includes('*') || scope.services.includes(service);
    const actionMatch = scope.actions.includes('*') || scope.actions.includes(action);

    return serviceMatch && actionMatch;
  }

  /**
   * Record action in history
   */
  private async recordHistory(params: {
    customerId: string;
    familyMemberId: string;
    familyMemberName: string;
    action: string;
    actionType: string;
    details: Record<string, unknown>;
    relatedResourceId?: string;
    relatedResourceType?: string;
  }): Promise<void> {
    try {
      const history = new FamilySupportHistory({
        customerId: params.customerId,
        familyMemberId: params.familyMemberId,
        familyMemberName: params.familyMemberName,
        action: params.action,
        actionType: params.actionType,
        details: params.details,
        timestamp: new Date(),
        relatedResourceId: params.relatedResourceId,
        relatedResourceType: params.relatedResourceType
      });

      await history.save();
    } catch (error) {
      logger.error('Failed to record delegation history', {
        error,
        params
      });
    }
  }
}

export const delegationService = new DelegationService();
