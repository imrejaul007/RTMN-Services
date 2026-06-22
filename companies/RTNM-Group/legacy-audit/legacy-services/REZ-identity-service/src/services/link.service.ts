import { v4 as uuidv4 } from 'uuid';
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

export enum LinkType {
  EXPLICIT = 'explicit',
  IMPLICIT = 'implicit',
  INFERRED = 'inferred',
  MERGE = 'merge'
}

export interface LinkRequest {
  sourceIdentityId: string;
  targetIdentityId: string;
  linkType: LinkType;
  confidence: ClusterConfidence;
  reason?: string;
  verified?: boolean;
  metadata?: Record<string, unknown>;
}

export interface LinkResult {
  success: boolean;
  clusterId?: string;
  mergedClusterIds?: string[];
  confidence?: ClusterConfidence;
  error?: string;
}

export interface UnlinkRequest {
  identityId: string;
  reason?: string;
  cascade?: boolean;
}

export interface UnlinkResult {
  success: boolean;
  affectedClusters?: string[];
  newClusterId?: string;
  error?: string;
}

export class LinkService {
  async linkIdentities(request: LinkRequest): Promise<LinkResult> {
    const { sourceIdentityId, targetIdentityId, linkType, confidence, reason, verified } = request;

    if (sourceIdentityId === targetIdentityId) {
      return {
        success: false,
        error: 'Cannot link identity to itself'
      };
    }

    const [sourceIdentity, targetIdentity] = await Promise.all([
      Identity.findOne({ identityId: sourceIdentityId }),
      Identity.findOne({ identityId: targetIdentityId })
    ]);

    if (!sourceIdentity || !targetIdentity) {
      return {
        success: false,
        error: 'One or both identities not found'
      };
    }

    if (sourceIdentity.status === IdentityStatus.DELETED || targetIdentity.status === IdentityStatus.DELETED) {
      return {
        success: false,
        error: 'Cannot link deleted identities'
      };
    }

    const [sourceCluster, targetCluster] = await Promise.all([
      Cluster.findOne({ clusterId: sourceIdentity.clusterId }),
      Cluster.findOne({ clusterId: targetIdentity.clusterId })
    ]);

    if (!sourceCluster || !targetCluster) {
      return {
        success: false,
        error: 'Cluster not found for one or both identities'
      };
    }

    if (sourceIdentity.clusterId === targetIdentity.clusterId) {
      const existingLink = sourceCluster.identityLinks.find(
        (link) => link.identityId === targetIdentityId
      );
      if (existingLink) {
        return {
          success: true,
          clusterId: sourceIdentity.clusterId,
          confidence: sourceCluster.confidence
        };
      }
    }

    const dominantCluster =
      sourceCluster.identityCount >= targetCluster.identityCount
        ? sourceCluster
        : targetCluster;
    const subordinateCluster =
      sourceCluster.identityCount >= targetCluster.identityCount
        ? targetCluster
        : sourceCluster;

    const now = new Date();

    dominantCluster.identityLinks.push({
      identityId: targetIdentityId,
      linkType,
      confidence: verified ? ClusterConfidence.HIGH : confidence,
      linkedAt: now,
      linkedBy: reason || 'system'
    });
    dominantCluster.identityCount += 1;

    const higherConfidence = this.calculateHigherConfidence(
      dominantCluster.confidence,
      subordinateCluster.confidence,
      confidence
    );
    dominantCluster.confidence = higherConfidence;

    targetIdentity.clusterId = dominantCluster.clusterId;
    await targetIdentity.save();

    if (subordinateCluster.identityLinks.length > 0) {
      for (const link of subordinateCluster.identityLinks) {
        if (!dominantCluster.identityLinks.some((l) => l.identityId === link.identityId)) {
          dominantCluster.identityLinks.push({
            ...link,
            linkedAt: now,
            linkedBy: `merged_from_${subordinateCluster.clusterId}`
          });
        }
      }
    }

    subordinateCluster.mergedFromClusters.push(subordinateCluster.clusterId);
    subordinateCluster.mergedToClusterId = dominantCluster.clusterId;
    subordinateCluster.status = ClusterStatus.MERGED;
    subordinateCluster.mergeReason = reason || linkType;

    if (subordinateCluster.metadata) {
      if (!dominantCluster.metadata.firstActivityAt ||
          (subordinateCluster.metadata.firstActivityAt &&
           subordinateCluster.metadata.firstActivityAt < dominantCluster.metadata.firstActivityAt)) {
        dominantCluster.metadata.firstActivityAt = subordinateCluster.metadata.firstActivityAt;
      }
      if (subordinateCluster.metadata.lastActivityAt &&
          subordinateCluster.metadata.lastActivityAt > (dominantCluster.metadata.lastActivityAt || new Date(0))) {
        dominantCluster.metadata.lastActivityAt = subordinateCluster.metadata.lastActivityAt;
      }
      dominantCluster.metadata.totalSessions =
        (dominantCluster.metadata.totalSessions || 0) +
        (subordinateCluster.metadata.totalSessions || 0);
    }

    await Promise.all([dominantCluster.save(), subordinateCluster.save()]);

    await Identity.updateMany(
      { clusterId: subordinateCluster.clusterId },
      { clusterId: dominantCluster.clusterId }
    );

    logger.info('Identities linked', {
      sourceIdentityId,
      targetIdentityId,
      linkType,
      dominantClusterId: dominantCluster.clusterId,
      subordinateClusterId: subordinateCluster.clusterId
    });

    return {
      success: true,
      clusterId: dominantCluster.clusterId,
      mergedClusterIds: [subordinateCluster.clusterId],
      confidence: dominantCluster.confidence
    };
  }

  private calculateHigherConfidence(
    current: ClusterConfidence,
    incoming: ClusterConfidence,
    requested: ClusterConfidence
  ): ClusterConfidence {
    const priority: Record<ClusterConfidence, number> = {
      [ClusterConfidence.HIGH]: 3,
      [ClusterConfidence.MEDIUM]: 2,
      [ClusterConfidence.LOW]: 1,
      [ClusterConfidence.INFERRED]: 0
    };

    const maxPriority = Math.max(
      priority[current],
      priority[incoming],
      priority[requested]
    );

    const entries = Object.entries(ClusterConfidence) as [ClusterConfidence, string][];
    for (const [key, value] of entries) {
      if (priority[key as ClusterConfidence] === maxPriority) {
        return key as ClusterConfidence;
      }
    }

    return ClusterConfidence.MEDIUM;
  }

  async linkByEmail(
    identityId: string,
    email: string,
    confidence: ClusterConfidence = ClusterConfidence.MEDIUM
  ): Promise<LinkResult> {
    const existingEmailIdentity = await Identity.findOne({
      type: IdentityType.EMAIL,
      hashIdentifier: email.toLowerCase(),
      status: { $ne: IdentityStatus.DELETED }
    });

    if (existingEmailIdentity) {
      return this.linkIdentities({
        sourceIdentityId: identityId,
        targetIdentityId: existingEmailIdentity.identityId,
        linkType: LinkType.IMPLICIT,
        confidence,
        reason: 'email_match'
      });
    }

    const identity = await Identity.findOne({ identityId });
    if (!identity) {
      return { success: false, error: 'Source identity not found' };
    }

    const clusterId = identity.clusterId;
    const newIdentityId = uuidv4();
    const now = new Date();

    const newEmailIdentity = new Identity({
      identityId: newIdentityId,
      type: IdentityType.EMAIL,
      identifier: email,
      hashIdentifier: email.toLowerCase(),
      clusterId,
      status: IdentityStatus.ACTIVE,
      metadata: {
        source: 'link_service',
        firstSeenAt: now,
        lastSeenAt: now,
        sessionCount: 1
      }
    });
    await newEmailIdentity.save();

    const cluster = await Cluster.findOne({ clusterId });
    if (cluster) {
      cluster.identityCount += 1;
      cluster.identityLinks.push({
        identityId: newIdentityId,
        linkType: LinkType.IMPLICIT,
        confidence,
        linkedAt: now,
        linkedBy: 'email_link'
      });
      await cluster.save();
    }

    return {
      success: true,
      clusterId,
      confidence
    };
  }

  async linkByPhone(
    identityId: string,
    phone: string,
    confidence: ClusterConfidence = ClusterConfidence.MEDIUM
  ): Promise<LinkResult> {
    const existingPhoneIdentity = await Identity.findOne({
      type: IdentityType.PHONE,
      hashIdentifier: phone,
      status: { $ne: IdentityStatus.DELETED }
    });

    if (existingPhoneIdentity) {
      return this.linkIdentities({
        sourceIdentityId: identityId,
        targetIdentityId: existingPhoneIdentity.identityId,
        linkType: LinkType.IMPLICIT,
        confidence,
        reason: 'phone_match'
      });
    }

    const identity = await Identity.findOne({ identityId });
    if (!identity) {
      return { success: false, error: 'Source identity not found' };
    }

    const clusterId = identity.clusterId;
    const newIdentityId = uuidv4();
    const now = new Date();

    const newPhoneIdentity = new Identity({
      identityId: newIdentityId,
      type: IdentityType.PHONE,
      identifier: phone,
      hashIdentifier: phone,
      clusterId,
      status: IdentityStatus.ACTIVE,
      metadata: {
        source: 'link_service',
        firstSeenAt: now,
        lastSeenAt: now,
        sessionCount: 1
      }
    });
    await newPhoneIdentity.save();

    const cluster = await Cluster.findOne({ clusterId });
    if (cluster) {
      cluster.identityCount += 1;
      cluster.identityLinks.push({
        identityId: newIdentityId,
        linkType: LinkType.IMPLICIT,
        confidence,
        linkedAt: now,
        linkedBy: 'phone_link'
      });
      await cluster.save();
    }

    return {
      success: true,
      clusterId,
      confidence
    };
  }

  async unlinkIdentity(request: UnlinkRequest): Promise<UnlinkResult> {
    const { identityId, reason, cascade } = request;

    const identity = await Identity.findOne({ identityId });
    if (!identity) {
      return { success: false, error: 'Identity not found' };
    }

    const cluster = await Cluster.findOne({ clusterId: identity.clusterId });
    if (!cluster) {
      return { success: false, error: 'Cluster not found' };
    }

    if (cluster.identityCount <= 1) {
      return {
        success: false,
        error: 'Cannot unlink the last identity from a cluster'
      };
    }

    const newClusterId = uuidv4();
    const now = new Date();

    const newCluster = new Cluster({
      clusterId: newClusterId,
      primaryIdentityId: identityId,
      status: ClusterStatus.ACTIVE,
      identityCount: 1,
      identityLinks: [{
        identityId,
        linkType: 'primary',
        confidence: ClusterConfidence.HIGH,
        linkedAt: now,
        linkedBy: reason || 'unlink'
      }],
      confidence: ClusterConfidence.HIGH,
      metadata: {
        ...cluster.metadata
      }
    });
    await newCluster.save();

    identity.clusterId = newClusterId;
    await identity.save();

    cluster.identityLinks = cluster.identityLinks.filter(
      (link) => link.identityId !== identityId
    );
    cluster.identityCount -= 1;

    if (cluster.primaryIdentityId === identityId && cluster.identityLinks.length > 0) {
      cluster.primaryIdentityId = cluster.identityLinks[0].identityId;
    }

    await cluster.save();

    if (cascade) {
      const identitiesToMove = await Identity.find({
        clusterId: cluster.clusterId,
        status: { $ne: IdentityStatus.DELETED }
      });

      for (const id of identitiesToMove) {
        newCluster.identityLinks.push({
          identityId: id.identityId,
          linkType: LinkType.INFERRED,
          confidence: ClusterConfidence.LOW,
          linkedAt: now,
          linkedBy: 'cascade_unlink'
        });
        id.clusterId = newClusterId;
        await id.save();
      }

      newCluster.identityCount = identitiesToMove.length + 1;
      await newCluster.save();

      cluster.status = ClusterStatus.ARCHIVED;
      await cluster.save();
    }

    logger.info('Identity unlinked', {
      identityId,
      reason,
      cascade,
      newClusterId
    });

    return {
      success: true,
      affectedClusters: [cluster.clusterId, newClusterId],
      newClusterId
    };
  }

  async getClusterDetails(clusterId: string): Promise<ICluster | null> {
    return Cluster.findOne({ clusterId });
  }

  async getIdentityLinks(identityId: string): Promise<{
    identity: IIdentity;
    cluster: ICluster;
    linkedIdentities: IIdentity[];
  } | null> {
    const identity = await Identity.findOne({ identityId });
    if (!identity) {
      return null;
    }

    const cluster = await Cluster.findOne({ clusterId: identity.clusterId });
    if (!cluster) {
      return null;
    }

    const linkedIdentities = await Identity.find({
      clusterId: identity.clusterId,
      identityId: { $ne: identityId },
      status: { $ne: IdentityStatus.DELETED }
    });

    return {
      identity,
      cluster,
      linkedIdentities
    };
  }

  async mergeClusters(
    sourceClusterId: string,
    targetClusterId: string,
    reason: string
  ): Promise<LinkResult> {
    const [sourceCluster, targetCluster] = await Promise.all([
      Cluster.findOne({ clusterId: sourceClusterId }),
      Cluster.findOne({ clusterId: targetClusterId })
    ]);

    if (!sourceCluster || !targetCluster) {
      return { success: false, error: 'One or both clusters not found' };
    }

    const sourceIdentity = await Identity.findOne({ identityId: sourceCluster.primaryIdentityId });
    const targetIdentity = await Identity.findOne({ identityId: targetCluster.primaryIdentityId });

    if (!sourceIdentity || !targetIdentity) {
      return { success: false, error: 'Primary identity not found for one or both clusters' };
    }

    return this.linkIdentities({
      sourceIdentityId: sourceIdentity.identityId,
      targetIdentityId: targetIdentity.identityId,
      linkType: LinkType.MERGE,
      confidence: ClusterConfidence.HIGH,
      reason,
      verified: true
    });
  }

  async getLinkStats(): Promise<{
    totalLinks: number;
    explicitLinks: number;
    implicitLinks: number;
    inferredLinks: number;
    mergeLinks: number;
  }> {
    const clusters = await Cluster.find({});

    let explicitLinks = 0;
    let implicitLinks = 0;
    let inferredLinks = 0;
    let mergeLinks = 0;

    for (const cluster of clusters) {
      for (const link of cluster.identityLinks) {
        switch (link.linkType) {
          case LinkType.EXPLICIT:
            explicitLinks++;
            break;
          case LinkType.IMPLICIT:
            implicitLinks++;
            break;
          case LinkType.INFERRED:
            inferredLinks++;
            break;
          case LinkType.MERGE:
            mergeLinks++;
            break;
        }
      }
    }

    return {
      totalLinks: explicitLinks + implicitLinks + inferredLinks + mergeLinks,
      explicitLinks,
      implicitLinks,
      inferredLinks,
      mergeLinks
    };
  }
}

export const linkService = new LinkService();
