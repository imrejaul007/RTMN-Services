import { v4 as uuidv4 } from 'uuid';
import { TrustScoreModel, ITrustScore } from '../models/TrustScore';
import { VerificationModel } from '../models/Verification';
import { RiskFlagModel } from '../models/Flag';
import {
  EntityType,
  LinkedEntity,
} from '../types';
import logger from '../utils/logger';

interface EntityMatch {
  entityId: string;
  entityType: EntityType;
  matchScore: number;
  matchReasons: string[];
}

interface LinkRequest {
  sourceEntityId: string;
  sourceEntityType: EntityType;
  targetEntityId: string;
  targetEntityType: EntityType;
  relationship: 'parent' | 'child' | 'sibling' | 'related';
  trustInfluence?: number;
  reason?: string;
  tenantId?: string;
}

interface MergeRequest {
  primaryEntityId: string;
  primaryEntityType: EntityType;
  secondaryEntityId: string;
  secondaryEntityType: EntityType;
  tenantId?: string;
}

export class EntityResolver {
  // Match threshold for automatic linking
  private matchThreshold = 0.85;

  // Evidence types that suggest same entity
  private matchingCriteria = {
    email: 0.4,
    phone: 0.3,
    device: 0.25,
    address: 0.2,
    bankAccount: 0.35,
    ipAddress: 0.15,
  };

  /**
   * Find potential matches for an entity
   */
  async findPotentialMatches(
    entityId: string,
    entityType: EntityType,
    tenantId: string = 'default'
  ): Promise<EntityMatch[]> {
    const matches: EntityMatch[] = [];

    // Get current entity's verification data
    const verifications = await VerificationModel.find({
      entityId,
      entityType,
      tenantId,
      status: 'verified',
    });

    // Extract matching criteria
    const criteria = this.extractMatchingCriteria(verifications);

    if (Object.keys(criteria).length === 0) {
      return matches;
    }

    // Find potential matches across all entity types
    const otherTypes: EntityType[] = ['customer', 'merchant', 'agent', 'vendor', 'partner', 'device'];

    for (const otherType of otherTypes) {
      if (otherType === entityType) continue;

      const potentialMatches = await TrustScoreModel.find({
        entityId: { $ne: entityId },
        entityType: otherType,
        tenantId,
      }).limit(50);

      for (const candidate of potentialMatches) {
        const matchResult = await this.calculateMatchScore(
          entityId,
          entityType,
          candidate.entityId,
          candidate.entityType,
          criteria,
          tenantId
        );

        if (matchResult.score >= this.matchThreshold) {
          matches.push({
            entityId: candidate.entityId,
            entityType: candidate.entityType,
            matchScore: matchResult.score,
            matchReasons: matchResult.reasons,
          });
        }
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);

    return matches;
  }

  /**
   * Calculate match score between two entities
   */
  private async calculateMatchScore(
    entity1Id: string,
    entity1Type: EntityType,
    entity2Id: string,
    entity2Type: EntityType,
    criteria: Record<string, string>,
    tenantId: string
  ): Promise<{ score: number; reasons: string[] }> {
    let totalScore = 0;
    const reasons: string[] = [];

    // Get verifications for both entities
    const verifications1 = await VerificationModel.find({
      entityId: entity1Id,
      entityType: entity1Type,
      tenantId,
      status: 'verified',
    });

    const verifications2 = await VerificationModel.find({
      entityId: entity2Id,
      entityType: entity2Type,
      tenantId,
      status: 'verified',
    });

    // Check each criterion
    for (const [criterion, value1] of Object.entries(criteria)) {
      const weight = this.matchingCriteria[criterion as keyof typeof this.matchingCriteria] || 0.1;

      for (const v2 of verifications2) {
        const value2 = this.getCriterionValue(v2.data, criterion);

        if (value1 && value2 && this.compareValues(value1, value2, criterion)) {
          totalScore += weight;
          reasons.push(`Matching ${criterion}`);
          break;
        }
      }
    }

    // Normalize score
    const maxPossibleScore = Object.values(this.matchingCriteria).reduce((a, b) => a + b, 0);
    const normalizedScore = Math.min(1, totalScore / maxPossibleScore);

    return {
      score: normalizedScore,
      reasons: [...new Set(reasons)], // Remove duplicates
    };
  }

  /**
   * Extract matching criteria from verifications
   */
  private extractMatchingCriteria(
    verifications: any[]
  ): Record<string, string> {
    const criteria: Record<string, string> = {};

    for (const v of verifications) {
      const data = v.data;

      if (data?.email) criteria.email = data.email;
      if (data?.phone) criteria.phone = data.phone;
      if (data?.deviceId) criteria.device = data.deviceId;
      if (data?.address) criteria.address = data.address;
      if (data?.bankAccount) criteria.bankAccount = data.bankAccount;
      if (data?.ipAddress) criteria.ipAddress = data.ipAddress;
    }

    return criteria;
  }

  /**
   * Get criterion value from verification data
   */
  private getCriterionValue(data: any, criterion: string): string | null {
    const mappings: Record<string, string[]> = {
      email: ['email', 'emailAddress', 'email_address'],
      phone: ['phone', 'phoneNumber', 'phone_number', 'mobile'],
      device: ['deviceId', 'device_id', 'deviceFingerprint'],
      address: ['address', 'streetAddress', 'street_address'],
      bankAccount: ['bankAccount', 'bank_account', 'accountNumber'],
      ipAddress: ['ipAddress', 'ip_address', 'ip'],
    };

    const fields = mappings[criterion] || [criterion];

    for (const field of fields) {
      if (data[field]) return data[field];
    }

    return null;
  }

  /**
   * Compare values for matching
   */
  private compareValues(value1: string, value2: string, criterion: string): boolean {
    // Normalize values
    const normalized1 = this.normalizeValue(value1, criterion);
    const normalized2 = this.normalizeValue(value2, criterion);

    return normalized1 === normalized2;
  }

  /**
   * Normalize values for comparison
   */
  private normalizeValue(value: string, criterion: string): string {
    switch (criterion) {
      case 'email':
        return value.toLowerCase().trim();
      case 'phone':
        return value.replace(/[\s\-\(\)]/g, '').replace(/^\+?91/, '');
      case 'bankAccount':
        return value.replace(/\s/g, '');
      default:
        return value.toLowerCase().trim();
    }
  }

  /**
   * Link two entities
   */
  async linkEntities(request: LinkRequest): Promise<LinkedEntity | null> {
    const {
      sourceEntityId,
      sourceEntityType,
      targetEntityId,
      targetEntityType,
      relationship,
      trustInfluence = 0.5,
      reason,
      tenantId = 'default',
    } = request;

    // Validate entities exist
    const sourceTrust = await TrustScoreModel.findOne({
      entityId: sourceEntityId,
      entityType: sourceEntityType,
      tenantId,
    });

    if (!sourceTrust) {
      logger.warn(`Source entity not found: ${sourceEntityType}:${sourceEntityId}`);
      return null;
    }

    const targetTrust = await TrustScoreModel.findOne({
      entityId: targetEntityId,
      entityType: targetEntityType,
      tenantId,
    });

    if (!targetTrust) {
      logger.warn(`Target entity not found: ${targetEntityType}:${targetEntityId}`);
      return null;
    }

    // Check if link already exists
    const existingLink = sourceTrust.linkedEntities.find(
      (l) => l.entityId === targetEntityId && l.entityType === targetEntityType
    );

    if (existingLink) {
      logger.info(`Entities already linked: ${sourceEntityType}:${sourceEntityId} -> ${targetEntityType}:${targetEntityId}`);
      return existingLink;
    }

    // Create link
    const link: LinkedEntity = {
      entityId: targetEntityId,
      entityType: targetEntityType,
      relationship,
      trustInfluence,
      linkedAt: new Date(),
    };

    sourceTrust.linkedEntities.push(link);
    await sourceTrust.save();

    // Also link in reverse (for sibling/related)
    if (relationship === 'sibling' || relationship === 'related') {
      const reverseLink: LinkedEntity = {
        entityId: sourceEntityId,
        entityType: sourceEntityType,
        relationship: 'sibling',
        trustInfluence,
        linkedAt: new Date(),
      };

      targetTrust.linkedEntities.push(reverseLink);
      await targetTrust.save();
    }

    // Update network trust score
    await this.updateNetworkTrustScore(sourceEntityId, sourceEntityType, tenantId);

    logger.info(`Entities linked: ${sourceEntityType}:${sourceEntityId} -> ${targetEntityType}:${targetEntityId}`, {
      relationship,
      trustInfluence,
      reason,
    });

    return link;
  }

  /**
   * Unlink two entities
   */
  async unlinkEntities(
    sourceEntityId: string,
    sourceEntityType: EntityType,
    targetEntityId: string,
    targetEntityType: EntityType,
    tenantId: string = 'default'
  ): Promise<boolean> {
    const sourceTrust = await TrustScoreModel.findOne({
      entityId: sourceEntityId,
      entityType: sourceEntityType,
      tenantId,
    });

    if (!sourceTrust) return false;

    const linkIndex = sourceTrust.linkedEntities.findIndex(
      (l) => l.entityId === targetEntityId && l.entityType === targetEntityType
    );

    if (linkIndex === -1) return false;

    sourceTrust.linkedEntities.splice(linkIndex, 1);
    await sourceTrust.save();

    // Also remove reverse link
    const targetTrust = await TrustScoreModel.findOne({
      entityId: targetEntityId,
      entityType: targetEntityType,
      tenantId,
    });

    if (targetTrust) {
      const reverseIndex = targetTrust.linkedEntities.findIndex(
        (l) => l.entityId === sourceEntityId && l.entityType === sourceEntityType
      );

      if (reverseIndex !== -1) {
        targetTrust.linkedEntities.splice(reverseIndex, 1);
        await targetTrust.save();
      }
    }

    // Update network trust score
    await this.updateNetworkTrustScore(sourceEntityId, sourceEntityType, tenantId);

    logger.info(`Entities unlinked: ${sourceEntityType}:${sourceEntityId} - ${targetEntityType}:${targetEntityId}`);

    return true;
  }

  /**
   * Get linked entities for an entity
   */
  async getLinkedEntities(
    entityId: string,
    entityType: EntityType,
    tenantId: string = 'default'
  ): Promise<LinkedEntity[]> {
    const trustScore = await TrustScoreModel.findOne({
      entityId,
      entityType,
      tenantId,
    });

    if (!trustScore) return [];

    // Fetch details for each linked entity
    const linkedDetails: LinkedEntity[] = [];

    for (const link of trustScore.linkedEntities) {
      const linkedTrust = await TrustScoreModel.findOne({
        entityId: link.entityId,
        entityType: link.entityType,
        tenantId,
      });

      if (linkedTrust) {
        linkedDetails.push({
          ...link.toObject(),
          trustInfluence: linkedTrust.score * link.trustInfluence,
        });
      }
    }

    return linkedDetails;
  }

  /**
   * Merge two entities (secondary into primary)
   */
  async mergeEntities(request: MergeRequest): Promise<ITrustScore | null> {
    const {
      primaryEntityId,
      primaryEntityType,
      secondaryEntityId,
      secondaryEntityType,
      tenantId = 'default',
    } = request;

    // Get both entities
    const primaryTrust = await TrustScoreModel.findOne({
      entityId: primaryEntityId,
      entityType: primaryEntityType,
      tenantId,
    });

    const secondaryTrust = await TrustScoreModel.findOne({
      entityId: secondaryEntityId,
      entityType: secondaryEntityType,
      tenantId,
    });

    if (!primaryTrust || !secondaryTrust) {
      logger.warn(`Cannot merge: one or both entities not found`);
      return null;
    }

    // Get all verifications for secondary entity
    const secondaryVerifications = await VerificationModel.find({
      entityId: secondaryEntityId,
      entityType: secondaryEntityType,
      tenantId,
    });

    // Transfer verifications to primary
    for (const verification of secondaryVerifications) {
      verification.entityId = primaryEntityId;
      verification.entityType = primaryEntityType;
      await verification.save();
    }

    // Get all flags for secondary entity
    const secondaryFlags = await RiskFlagModel.find({
      entityId: secondaryEntityId,
      entityType: secondaryEntityType,
      tenantId,
    });

    // Link secondary to primary before deleting
    if (!primaryTrust.linkedEntities.find((l) => l.entityId === secondaryEntityId)) {
      primaryTrust.linkedEntities.push({
        entityId: secondaryEntityId,
        entityType: secondaryEntityType,
        relationship: 'related',
        trustInfluence: 1.0,
        linkedAt: new Date(),
      });
    }

    // Merge risk flags (keep highest severity)
    for (const flag of secondaryFlags) {
      const existingFlag = await RiskFlagModel.findOne({
        entityId: primaryEntityId,
        entityType: primaryEntityType,
        tenantId,
        type: flag.type,
        status: 'active',
      });

      if (!existingFlag) {
        // Transfer flag to primary
        flag.entityId = primaryEntityId;
        flag.entityType = primaryEntityType;
        await flag.save();
      } else if (this.severityCompare(flag.severity, existingFlag.severity) > 0) {
        // Upgrade severity
        existingFlag.severity = flag.severity;
        existingFlag.score = flag.score;
        existingFlag.addEvidence({
          type: 'merged_flag',
          data: { mergedFrom: secondaryEntityId },
          timestamp: new Date(),
          source: 'entity_merger',
        });
        await existingFlag.save();
      }

      // Mark secondary flag as merged (resolved)
      await flag.resolve('system', `Merged into ${primaryEntityId}`);
    }

    // Transfer linked entities
    for (const link of secondaryTrust.linkedEntities) {
      if (
        !primaryTrust.linkedEntities.find(
          (l) => l.entityId === link.entityId && l.entityType === link.entityType
        )
      ) {
        primaryTrust.linkedEntities.push({
          ...link.toObject(),
          trustInfluence: link.trustInfluence * 0.8, // Reduce influence for transferred links
        });
      }
    }

    // Recalculate trust score for primary
    await this.recalculateMergedScore(primaryTrust);

    // Delete secondary entity
    await TrustScoreModel.deleteOne({
      entityId: secondaryEntityId,
      entityType: secondaryEntityType,
      tenantId,
    });

    await primaryTrust.save();

    logger.info(`Entities merged: ${secondaryEntityType}:${secondaryEntityId} -> ${primaryEntityType}:${primaryEntityId}`);

    return primaryTrust;
  }

  /**
   * Update network trust score based on linked entities
   */
  private async updateNetworkTrustScore(
    entityId: string,
    entityType: EntityType,
    tenantId: string
  ): Promise<void> {
    const trustScore = await TrustScoreModel.findOne({
      entityId,
      entityType,
      tenantId,
    });

    if (!trustScore) return;

    if (trustScore.linkedEntities.length === 0) {
      trustScore.factors.networkTrust = 50;
      trustScore.breakdown.networkBonus = 0;
    } else {
      let totalInfluence = 0;
      let count = 0;

      for (const linked of trustScore.linkedEntities) {
        const linkedScore = await TrustScoreModel.findOne({
          entityId: linked.entityId,
          entityType: linked.entityType,
          tenantId,
        });

        if (linkedScore) {
          totalInfluence += linkedScore.score * linked.trustInfluence;
          count++;
        }
      }

      if (count > 0) {
        trustScore.factors.networkTrust = totalInfluence / count;
        trustScore.breakdown.networkBonus = ((totalInfluence / count) - 50) * 0.1;
      }
    }

    await trustScore.save();
  }

  /**
   * Recalculate trust score after merge
   */
  private async recalculateMergedScore(trustScore: ITrustScore): Promise<void> {
    // Simple weighted average
    const weights = {
      transactionReliability: 0.30,
      verificationStatus: 0.25,
      behavioralPattern: 0.20,
      historicalBehavior: 0.15,
      networkTrust: 0.10,
    };

    const factors = trustScore.factors;
    const newScore = Math.round(
      factors.transactionReliability * weights.transactionReliability +
      factors.verificationStatus * weights.verificationStatus +
      factors.behavioralPattern * weights.behavioralPattern +
      factors.historicalBehavior * weights.historicalBehavior +
      factors.networkTrust * weights.networkTrust
    );

    trustScore.score = Math.max(0, Math.min(100, newScore));

    if (trustScore.score >= 90) trustScore.level = 'excellent';
    else if (trustScore.score >= 70) trustScore.level = 'high';
    else if (trustScore.score >= 50) trustScore.level = 'medium';
    else if (trustScore.score >= 25) trustScore.level = 'low';
    else trustScore.level = 'critical';

    trustScore.lastUpdated = new Date();
  }

  /**
   * Compare severity levels
   */
  private severityCompare(a: string, b: string): number {
    const order = { critical: 4, high: 3, medium: 2, low: 1 };
    return (order[a as keyof typeof order] || 0) - (order[b as keyof typeof order] || 0);
  }
}

export const entityResolver = new EntityResolver();
export default entityResolver;
