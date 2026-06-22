import * as CryptoJS from 'crypto-js';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  Identity,
  IIdentity,
  IdentityType,
  IdentityStatus
} from '../models/identity.model';
import {
  Cluster,
  ICluster,
  ClusterStatus,
  ClusterConfidence
} from '../models/cluster.model';

export interface UnifiedProfile {
  clusterId: string;
  confidence: ClusterConfidence;
  primaryIdentity: {
    identityId: string;
    type: IdentityType;
    identifier: string;
  };
  identities: {
    identityId: string;
    type: IdentityType;
    identifier: string;
    status: IdentityStatus;
    lastSeenAt: Date | null;
    metadata: Record<string, unknown>;
  }[];
  activity: {
    totalSessions: number;
    firstActivityAt: Date | null;
    lastActivityAt: Date | null;
    channels: string[];
  };
  traits: Record<string, unknown>;
  privacySettings: {
    trackingEnabled: boolean;
    marketingConsent: boolean;
    analyticsConsent: boolean;
  };
}

export interface ResolveOptions {
  includeActivity?: boolean;
  activityDays?: number;
  privacyFilter?: boolean;
}

export interface ResolveBy {
  identityId?: string;
  type?: IdentityType;
  identifier?: string;
  clusterId?: string;
  email?: string;
  phone?: string;
  deviceId?: string;
}

export class ResolveService {
  private hashIdentifier(identifier: string): string {
    return CryptoJS.SHA256(identifier + config.identitySalt).toString();
  }

  async resolve(by: ResolveBy, options: ResolveOptions = {}): Promise<UnifiedProfile | null> {
    const { includeActivity = true, activityDays = 30, privacyFilter = true } = options;

    let clusterId: string | null = null;
    let identity: IIdentity | null = null;

    if (by.clusterId) {
      const cluster = await Cluster.findOne({ clusterId: by.clusterId });
      if (cluster && cluster.status !== ClusterStatus.ARCHIVED) {
        clusterId = cluster.clusterId;
      }
    } else if (by.identityId) {
      identity = await Identity.findOne({ identityId: by.identityId });
      if (identity && identity.status !== IdentityStatus.DELETED) {
        clusterId = identity.clusterId;
      }
    } else if (by.type && by.identifier) {
      identity = await Identity.findOne({
        type: by.type,
        hashIdentifier: this.hashIdentifier(by.identifier),
        status: { $ne: IdentityStatus.DELETED }
      });
      if (identity) {
        clusterId = identity.clusterId;
      }
    } else if (by.email) {
      identity = await Identity.findOne({
        type: IdentityType.EMAIL,
        hashIdentifier: this.hashIdentifier(by.email.toLowerCase()),
        status: { $ne: IdentityStatus.DELETED }
      });
      if (identity) {
        clusterId = identity.clusterId;
      }
    } else if (by.phone) {
      identity = await Identity.findOne({
        type: IdentityType.PHONE,
        hashIdentifier: by.phone,
        status: { $ne: IdentityStatus.DELETED }
      });
      if (identity) {
        clusterId = identity.clusterId;
      }
    }

    if (!clusterId) {
      logger.debug('Could not resolve identity', { by });
      return null;
    }

    return this.buildUnifiedProfile(clusterId, {
      includeActivity,
      activityDays,
      privacyFilter
    });
  }

  async buildUnifiedProfile(
    clusterId: string,
    options: Partial<ResolveOptions> = {}
  ): Promise<UnifiedProfile | null> {
    const { includeActivity = true, activityDays = 30, privacyFilter = true } = options;

    const cluster = await Cluster.findOne({ clusterId });
    if (!cluster || cluster.status === ClusterStatus.ARCHIVED) {
      return null;
    }

    const identities = await Identity.find({
      clusterId,
      status: { $ne: IdentityStatus.DELETED }
    });

    if (identities.length === 0) {
      return null;
    }

    let primaryIdentity = identities.find((i) => i.identityId === cluster.primaryIdentityId);
    if (!primaryIdentity) {
      primaryIdentity = identities[0];
    }

    const privacyEnabled = privacyFilter && !primaryIdentity.privacySettings.trackingEnabled;
    if (privacyEnabled) {
      logger.debug('Privacy mode enabled for cluster', { clusterId });
    }

    const activityData = {
      totalSessions: cluster.metadata.totalSessions || 0,
      firstActivityAt: cluster.metadata.firstActivityAt || null,
      lastActivityAt: cluster.metadata.lastActivityAt || null,
      channels: this.extractChannels(identities)
    };

    const traits: Record<string, unknown> = {};
    for (const id of identities) {
      if (id.metadata.traits) {
        Object.assign(traits, id.metadata.traits);
      }
    }

    const preferredChannel = this.determinePreferredChannel(identities);

    return {
      clusterId,
      confidence: cluster.confidence,
      primaryIdentity: {
        identityId: primaryIdentity.identityId,
        type: primaryIdentity.type,
        identifier: privacyEnabled
          ? this.maskIdentifier(primaryIdentity.identifier, primaryIdentity.type)
          : primaryIdentity.identifier
      },
      identities: identities.map((i) => ({
        identityId: i.identityId,
        type: i.type,
        identifier: privacyEnabled
          ? this.maskIdentifier(i.identifier, i.type)
          : i.identifier,
        status: i.status,
        lastSeenAt: i.metadata.lastSeenAt || null,
        metadata: privacyEnabled ? {} : {
          source: i.metadata.source,
          platform: i.metadata.platform,
          appVersion: i.metadata.appVersion,
          sessionCount: i.metadata.sessionCount
        }
      })),
      activity: activityData,
      traits: privacyEnabled ? {} : traits,
      privacySettings: {
        trackingEnabled: primaryIdentity.privacySettings.trackingEnabled,
        marketingConsent: primaryIdentity.privacySettings.marketingConsent,
        analyticsConsent: primaryIdentity.privacySettings.analyticsConsent
      }
    };
  }

  private maskIdentifier(identifier: string, type: IdentityType): string {
    if (type === IdentityType.EMAIL) {
      const [local, domain] = identifier.split('@');
      if (local.length <= 2) {
        return `**@${domain}`;
      }
      return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
    }

    if (type === IdentityType.PHONE) {
      if (identifier.length <= 4) {
        return '*'.repeat(identifier.length);
      }
      return '*'.repeat(identifier.length - 4) + identifier.slice(-4);
    }

    if (identifier.length <= 4) {
      return '*'.repeat(identifier.length);
    }
    return identifier.slice(0, 2) + '*'.repeat(identifier.length - 4) + identifier.slice(-2);
  }

  private extractChannels(identities: IIdentity[]): string[] {
    const channels = new Set<string>();

    for (const identity of identities) {
      switch (identity.type) {
        case IdentityType.APP_USER:
          channels.add('app');
          break;
        case IdentityType.WHATSAPP_USER:
          channels.add('whatsapp');
          break;
        case IdentityType.WEB_USER:
          channels.add('web');
          break;
        case IdentityType.QR_USER:
          channels.add('qr');
          break;
      }
    }

    return Array.from(channels);
  }

  private determinePreferredChannel(identities: IIdentity[]): string | null {
    const channelCounts: Record<string, number> = {};

    for (const identity of identities) {
      const type = identity.type;
      if (type === IdentityType.APP_USER) {
        channelCounts['app'] = (channelCounts['app'] || 0) + 3;
      } else if (type === IdentityType.WHATSAPP_USER) {
        channelCounts['whatsapp'] = (channelCounts['whatsapp'] || 0) + 2;
      } else if (type === IdentityType.WEB_USER) {
        channelCounts['web'] = (channelCounts['web'] || 0) + 1;
      } else if (type === IdentityType.QR_USER) {
        channelCounts['qr'] = (channelCounts['qr'] || 0) + 1;
      }
    }

    let preferred: string | null = null;
    let maxCount = 0;

    for (const [channel, count] of Object.entries(channelCounts)) {
      if (count > maxCount) {
        maxCount = count;
        preferred = channel;
      }
    }

    return preferred;
  }

  async mergeClusters(
    sourceClusterId: string,
    targetClusterId: string,
    reason: string
  ): Promise<{ success: boolean; newClusterId?: string; error?: string }> {
    const [sourceCluster, targetCluster] = await Promise.all([
      Cluster.findOne({ clusterId: sourceClusterId }),
      Cluster.findOne({ clusterId: targetClusterId })
    ]);

    if (!sourceCluster || !targetCluster) {
      return { success: false, error: 'One or both clusters not found' };
    }

    const dominantCluster =
      sourceCluster.identityCount >= targetCluster.identityCount
        ? sourceCluster
        : targetCluster;

    const sourceIdentity = await Identity.findOne({ identityId: sourceCluster.primaryIdentityId });
    const targetIdentity = await Identity.findOne({ identityId: targetCluster.primaryIdentityId });

    if (!sourceIdentity || !targetIdentity) {
      return { success: false, error: 'Primary identity not found' };
    }

    const { linkService } = require('./link.service');

    const result = await linkService.linkIdentities({
      sourceIdentityId: sourceIdentity.identityId,
      targetIdentityId: targetIdentity.identityId,
      linkType: 'merge',
      confidence: ClusterConfidence.HIGH,
      reason,
      verified: true
    });

    return {
      success: result.success,
      newClusterId: dominantCluster.clusterId,
      error: result.error
    };
  }

  async getClusterStats(): Promise<{
    totalClusters: number;
    activeClusters: number;
    mergedClusters: number;
    archivedClusters: number;
    averageIdentitiesPerCluster: number;
    clustersByConfidence: Record<ClusterConfidence, number>;
  }> {
    const [clusters, activeClusters, mergedClusters, archivedClusters] = await Promise.all([
      Cluster.find(),
      Cluster.countDocuments({ status: ClusterStatus.ACTIVE }),
      Cluster.countDocuments({ status: ClusterStatus.MERGED }),
      Cluster.countDocuments({ status: ClusterStatus.ARCHIVED })
    ]);

    const totalIdentities = clusters.reduce((sum, c) => sum + c.identityCount, 0);
    const totalClusters = clusters.length;
    const averageIdentitiesPerCluster = totalClusters > 0 ? totalIdentities / totalClusters : 0;

    const clustersByConfidence: Record<string, number> = {};
    for (const confidence of Object.values(ClusterConfidence)) {
      clustersByConfidence[confidence] = 0;
    }
    clusters.forEach((c) => {
      clustersByConfidence[c.confidence]++;
    });

    return {
      totalClusters,
      activeClusters,
      mergedClusters,
      archivedClusters,
      averageIdentitiesPerCluster,
      clustersByConfidence: clustersByConfidence as Record<ClusterConfidence, number>
    };
  }

  async getIdentityCount(): Promise<{
    total: number;
    byType: Record<IdentityType, number>;
    byStatus: Record<IdentityStatus, number>;
  }> {
    const identities = await Identity.find({});

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const type of Object.values(IdentityType)) {
      byType[type] = 0;
    }
    for (const status of Object.values(IdentityStatus)) {
      byStatus[status] = 0;
    }

    for (const identity of identities) {
      byType[identity.type] = (byType[identity.type] || 0) + 1;
      byStatus[identity.status] = (byStatus[identity.status] || 0) + 1;
    }

    return {
      total: identities.length,
      byType: byType as Record<IdentityType, number>,
      byStatus: byStatus as Record<IdentityStatus, number>
    };
  }

  async predictUserTraits(clusterId: string): Promise<{
    predictedTraits: Record<string, unknown>;
    confidence: number;
    sources: string[];
  }> {
    const cluster = await Cluster.findOne({ clusterId });
    if (!cluster) {
      return { predictedTraits: {}, confidence: 0, sources: [] };
    }

    const identities = await Identity.find({
      clusterId,
      status: { $ne: IdentityStatus.DELETED }
    });

    const predictedTraits: Record<string, unknown> = {};
    const sources: string[] = [];

    for (const identity of identities) {
      if (identity.metadata.traits) {
        for (const [key, value] of Object.entries(identity.metadata.traits)) {
          if (value !== undefined && value !== null) {
            predictedTraits[key] = value;
            sources.push(identity.type);
          }
        }
      }
    }

    const confidence = this.calculateTraitConfidence(cluster, identities);

    return {
      predictedTraits,
      confidence,
      sources: [...new Set(sources)]
    };
  }

  private calculateTraitConfidence(cluster: ICluster, identities: IIdentity[]): number {
    let confidence = 0;

    if (cluster.identityCount >= 3) {
      confidence += 30;
    } else if (cluster.identityCount >= 2) {
      confidence += 20;
    } else {
      confidence += 10;
    }

    if (cluster.metadata.totalSessions && cluster.metadata.totalSessions >= 10) {
      confidence += 30;
    } else if (cluster.metadata.totalSessions && cluster.metadata.totalSessions >= 5) {
      confidence += 20;
    } else {
      confidence += 10;
    }

    if (cluster.confidence === ClusterConfidence.HIGH) {
      confidence += 40;
    } else if (cluster.confidence === ClusterConfidence.MEDIUM) {
      confidence += 25;
    } else {
      confidence += 10;
    }

    return Math.min(confidence, 100);
  }
}

export const resolveService = new ResolveService();
