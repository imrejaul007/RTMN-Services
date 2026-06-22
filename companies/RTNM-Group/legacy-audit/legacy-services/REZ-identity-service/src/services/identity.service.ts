import { v4 as uuidv4 } from 'uuid';
import * as CryptoJS from 'crypto-js';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  Identity,
  IIdentity,
  IdentityType,
  IdentityStatus,
  IIdentityMetadata,
  IIdentityPrivacySettings
} from '../models/identity.model';
import {
  Cluster,
  ICluster,
  ClusterStatus,
  ClusterConfidence
} from '../models/cluster.model';

export interface CreateIdentityOptions {
  type: IdentityType;
  identifier: string;
  metadata?: Partial<IIdentityMetadata>;
  privacySettings?: Partial<IIdentityPrivacySettings>;
}

export interface UpdateIdentityOptions {
  metadata?: Partial<IIdentityMetadata>;
  privacySettings?: Partial<IIdentityPrivacySettings>;
}

export interface IdentityWithCluster {
  identity: IIdentity;
  cluster: {
    clusterId: string;
    identityCount: number;
    confidence: ClusterConfidence;
  };
}

export class IdentityService {
  private hashIdentifier(identifier: string): string {
    return CryptoJS.SHA256(identifier + config.identitySalt).toString();
  }

  async createIdentity(options: CreateIdentityOptions): Promise<IIdentity> {
    const { type, identifier, metadata, privacySettings } = options;

    const hashedIdentifier = this.hashIdentifier(identifier);
    const existingIdentity = await Identity.findOne({
      type,
      hashIdentifier: hashedIdentifier
    });

    if (existingIdentity) {
      logger.info('Identity already exists', { identityId: existingIdentity.identityId });
      return existingIdentity;
    }

    const clusterId = uuidv4();
    const identityId = uuidv4();
    const now = new Date();

    const cluster = new Cluster({
      clusterId,
      primaryIdentityId: identityId,
      status: ClusterStatus.ACTIVE,
      identityCount: 1,
      identityLinks: [{
        identityId,
        linkType: 'primary',
        confidence: ClusterConfidence.HIGH,
        linkedAt: now,
        linkedBy: 'system'
      }],
      confidence: ClusterConfidence.HIGH,
      metadata: {
        firstActivityAt: now,
        lastActivityAt: now,
        totalSessions: 1
      }
    });
    await cluster.save();

    const identity = new Identity({
      identityId,
      type,
      identifier,
      hashIdentifier: hashedIdentifier,
      clusterId,
      status: IdentityStatus.ACTIVE,
      metadata: {
        source: metadata?.source || 'api',
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress,
        platform: metadata?.platform,
        appVersion: metadata?.appVersion,
        firstSeenAt: now,
        lastSeenAt: now,
        sessionCount: 1,
        traits: metadata?.traits || {},
        location: metadata?.location
      },
      privacySettings: {
        trackingEnabled: privacySettings?.trackingEnabled ?? true,
        dataRetentionDays: privacySettings?.dataRetentionDays ?? 365,
        marketingConsent: privacySettings?.marketingConsent ?? false,
        analyticsConsent: privacySettings?.analyticsConsent ?? true,
        thirdPartySharing: privacySettings?.thirdPartySharing ?? false
      }
    });

    await identity.save();

    logger.info('Identity created', { identityId, type, clusterId });

    return identity;
  }

  async getIdentity(identityId: string): Promise<IdentityWithCluster | null> {
    const identity = await Identity.findOne({ identityId });
    if (!identity) {
      return null;
    }

    const cluster = await Cluster.findOne({ clusterId: identity.clusterId });
    if (!cluster) {
      return null;
    }

    return {
      identity,
      cluster: {
        clusterId: cluster.clusterId,
        identityCount: cluster.identityCount,
        confidence: cluster.confidence
      }
    };
  }

  async getIdentityByTypeAndIdentifier(
    type: IdentityType,
    identifier: string
  ): Promise<IdentityWithCluster | null> {
    const identity = await Identity.findOne({
      type,
      hashIdentifier: this.hashIdentifier(identifier)
    });

    if (!identity) {
      return null;
    }

    return this.getIdentity(identity.identityId);
  }

  async updateIdentity(
    identityId: string,
    options: UpdateIdentityOptions
  ): Promise<IIdentity | null> {
    const identity = await Identity.findOne({ identityId });
    if (!identity) {
      return null;
    }

    if (options.metadata) {
      identity.metadata = {
        ...identity.metadata,
        ...options.metadata,
        lastSeenAt: new Date()
      };
      identity.metadata.sessionCount = (identity.metadata.sessionCount || 0) + 1;
    }

    if (options.privacySettings) {
      identity.privacySettings = {
        ...identity.privacySettings,
        ...options.privacySettings
      };
    }

    await identity.save();

    if (identity.metadata.lastSeenAt) {
      await Cluster.updateOne(
        { clusterId: identity.clusterId },
        { 'metadata.lastActivityAt': new Date() }
      );
    }

    logger.info('Identity updated', { identityId });

    return identity;
  }

  async getIdentitiesByCluster(clusterId: string): Promise<IIdentity[]> {
    return Identity.find({
      clusterId,
      status: { $ne: IdentityStatus.DELETED }
    }).sort({ createdAt: 1 });
  }

  async getIdentitiesByType(type: IdentityType, limit = 100): Promise<IIdentity[]> {
    return Identity.find({
      type,
      status: { $ne: IdentityStatus.DELETED }
    })
      .sort({ 'metadata.lastSeenAt': -1 })
      .limit(limit);
  }

  async softDeleteIdentity(identityId: string): Promise<boolean> {
    const identity = await Identity.findOne({ identityId });
    if (!identity) {
      return false;
    }

    identity.status = IdentityStatus.DELETED;
    await identity.save();

    await Cluster.updateOne(
      { clusterId: identity.clusterId },
      { $inc: { identityCount: -1 } }
    );

    logger.info('Identity soft deleted', { identityId });

    return true;
  }

  async recordActivity(
    identityId: string,
    activityType: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const identity = await Identity.findOne({ identityId });
    if (!identity) {
      logger.warn('Activity record failed: identity not found', { identityId });
      return;
    }

    identity.metadata.sessionCount = (identity.metadata.sessionCount || 0) + 1;
    identity.metadata.lastSeenAt = new Date();
    await identity.save();

    logger.debug('Activity recorded', { identityId, activityType });
  }

  async searchIdentities(
    query: string,
    limit = 50
  ): Promise<IIdentity[]> {
    // Escape special regex characters to prevent ReDoS attacks
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedQuery, 'i');

    return Identity.find({
      $and: [
        { status: { $ne: IdentityStatus.DELETED } },
        {
          $or: [
            { identityId: searchRegex },
            { identifier: searchRegex },
            { 'metadata.traits.name': searchRegex }
          ]
        }
      ]
    })
      .limit(limit)
      .sort({ 'metadata.lastSeenAt': -1 });
  }

  async getIdentitiesByClusterWithDetails(clusterId: string): Promise<ICluster | IIdentity[]> {
    const [cluster, identities] = await Promise.all([
      Cluster.findOne({ clusterId }),
      Identity.find({
        clusterId,
        status: { $ne: IdentityStatus.DELETED }
      }).sort({ createdAt: 1 })
    ]);

    return identities;
  }

  async updateClusterConfidence(
    clusterId: string,
    confidence: ClusterConfidence
  ): Promise<void> {
    await Cluster.updateOne({ clusterId }, { confidence });
    logger.info('Cluster confidence updated', { clusterId, confidence });
  }

  async addTagToCluster(clusterId: string, tag: string): Promise<void> {
    await Cluster.updateOne(
      { clusterId },
      { $addToSet: { 'metadata.tags': tag } }
    );
  }

  async addSegmentToCluster(clusterId: string, segment: string): Promise<void> {
    await Cluster.updateOne(
      { clusterId },
      { $addToSet: { 'metadata.segments': segment } }
    );
  }
}

export const identityService = new IdentityService();
