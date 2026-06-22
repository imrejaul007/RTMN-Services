import {
  SupportShare,
  ShareStatus,
  ISupportShareDocument,
  FamilySupportHistory,
  NotificationType
} from '../models/familySupport';
import { linkageService } from './linkageService';
import { notificationService } from './notificationService';
import { logger } from '../utils/logger';

export interface ShareIssueParams {
  customerId: string;
  customerName: string;
  issueId: string;
  issueType: string;
  subject: string;
  description?: string;
  status: string;
  priority?: string;
  sharedWithMemberIds?: string[];
}

export interface ShareResolutionParams {
  customerId: string;
  customerName: string;
  issueId: string;
  subject: string;
  resolution: string;
  resolvedAt: Date;
  sharedWithMemberIds?: string[];
}

export interface ShareMedicalInfoParams {
  customerId: string;
  customerName: string;
  infoType: string;
  content: Record<string, unknown>;
  sharedWithMemberIds?: string[];
}

export interface SharedItem {
  shareId: string;
  shareType: string;
  content: Record<string, unknown>;
  sharedAt: Date;
  expiresAt?: Date;
  sharedWith: string[];
  status: ShareStatus;
}

export class SupportSharingService {
  /**
   * Share a support issue with family members
   */
  async shareIssueWithFamily(params: ShareIssueParams): Promise<string> {
    const {
      customerId,
      customerName,
      issueId,
      issueType,
      subject,
      description,
      status,
      priority,
      sharedWithMemberIds
    } = params;

    logger.info('Sharing support issue with family', {
      customerId,
      issueId
    });

    // Get family members to share with if not specified
    const membersToShareWith = sharedWithMemberIds ||
      await linkageService.getFamilyMembersWithAccess(customerId);

    if (membersToShareWith.length === 0) {
      throw new Error('No family members to share with');
    }

    const share = new SupportShare({
      ownerId: customerId,
      shareType: 'support_issue',
      sharedWith: membersToShareWith,
      content: {
        issueId,
        issueType,
        subject,
        description,
        status,
        priority,
        sharedAt: new Date()
      },
      status: ShareStatus.ACTIVE,
      sharedAt: new Date()
    });

    await share.save();

    // Notify family members
    await notificationService.notifyFamily(customerId, customerName, {
      type: NotificationType.SUPPORT_ISSUE_CREATED,
      title: `Support Issue Shared: ${subject}`,
      message: `${customerName} has shared a support issue with you: ${subject}`,
      data: {
        shareId: share._id,
        issueId,
        issueType,
        subject,
        status
      },
      channels: ['in_app', 'push']
    });

    await this.recordHistory({
      customerId,
      familyMemberId: membersToShareWith.join(','),
      familyMemberName: 'Family Members',
      action: 'ISSUE_SHARED',
      actionType: 'share',
      details: {
        shareId: share._id,
        issueId,
        sharedWithCount: membersToShareWith.length
      },
      relatedResourceId: issueId,
      relatedResourceType: 'support_issue'
    });

    logger.info('Support issue shared', {
      shareId: share._id,
      customerId,
      sharedWithCount: membersToShareWith.length
    });

    return share._id.toString();
  }

  /**
   * Share a support resolution with family
   */
  async shareResolutionWithFamily(params: ShareResolutionParams): Promise<string> {
    const {
      customerId,
      customerName,
      issueId,
      subject,
      resolution,
      resolvedAt,
      sharedWithMemberIds
    } = params;

    logger.info('Sharing resolution with family', {
      customerId,
      issueId
    });

    const membersToShareWith = sharedWithMemberIds ||
      await linkageService.getFamilyMembersWithAccess(customerId);

    const share = new SupportShare({
      ownerId: customerId,
      shareType: 'resolution',
      sharedWith: membersToShareWith,
      content: {
        issueId,
        subject,
        resolution,
        resolvedAt,
        sharedAt: new Date()
      },
      status: ShareStatus.ACTIVE,
      sharedAt: new Date()
    });

    await share.save();

    // Notify family
    await notificationService.notifyFamily(customerId, customerName, {
      type: NotificationType.SUPPORT_RESOLVED,
      title: `Issue Resolved: ${subject}`,
      message: `${customerName}'s support issue "${subject}" has been resolved. ${resolution}`,
      data: {
        shareId: share._id,
        issueId,
        subject,
        resolution
      },
      channels: ['in_app', 'push']
    });

    await this.recordHistory({
      customerId,
      familyMemberId: membersToShareWith.join(','),
      familyMemberName: 'Family Members',
      action: 'RESOLUTION_SHARED',
      actionType: 'share',
      details: {
        shareId: share._id,
        issueId,
        sharedWithCount: membersToShareWith.length
      },
      relatedResourceId: issueId,
      relatedResourceType: 'resolution'
    });

    return share._id.toString();
  }

  /**
   * Share medical information with family
   */
  async shareMedicalInfoWithFamily(params: ShareMedicalInfoParams): Promise<string> {
    const {
      customerId,
      customerName,
      infoType,
      content,
      sharedWithMemberIds
    } = params;

    logger.info('Sharing medical info with family', {
      customerId,
      infoType
    });

    const membersToShareWith = sharedWithMemberIds ||
      await linkageService.getFamilyMembersWithAccess(customerId);

    // Check permissions for medical info sharing
    for (const memberId of membersToShareWith) {
      const access = await linkageService.getSupportAccess(customerId, memberId);
      if (!access || !access.permissions.canViewMedicalRecords) {
        logger.warn('Member lacks permission for medical info', {
          customerId,
          memberId
        });
        // Remove from list or throw error based on policy
      }
    }

    const share = new SupportShare({
      ownerId: customerId,
      shareType: 'medical_info',
      sharedWith: membersToShareWith,
      content: {
        infoType,
        content,
        sharedAt: new Date()
      },
      status: ShareStatus.ACTIVE,
      sharedAt: new Date()
    });

    await share.save();

    await this.recordHistory({
      customerId,
      familyMemberId: membersToShareWith.join(','),
      familyMemberName: 'Family Members',
      action: 'MEDICAL_INFO_SHARED',
      actionType: 'share',
      details: {
        shareId: share._id,
        infoType,
        sharedWithCount: membersToShareWith.length
      }
    });

    logger.info('Medical info shared', {
      shareId: share._id,
      customerId,
      infoType
    });

    return share._id.toString();
  }

  /**
   * Get all items shared with family for a customer
   */
  async getSharedWithFamily(
    customerId: string,
    options: {
      type?: string;
      status?: ShareStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    items: SharedItem[];
    total: number;
  }> {
    const { type, status = ShareStatus.ACTIVE, limit = 50, offset = 0 } = options;

    const query: Record<string, unknown> = {
      ownerId: customerId,
      status
    };

    if (type) {
      query.shareType = type;
    }

    const [items, total] = await Promise.all([
      SupportShare.find(query)
        .sort({ sharedAt: -1 })
        .skip(offset)
        .limit(limit),
      SupportShare.countDocuments(query)
    ]);

    return {
      items: items.map(item => ({
        shareId: item._id.toString(),
        shareType: item.shareType,
        content: item.content,
        sharedAt: item.sharedAt,
        expiresAt: item.expiresAt,
        sharedWith: item.sharedWith,
        status: item.status
      })),
      total
    };
  }

  /**
   * Get items shared with a specific family member
   */
  async getSharedWithMember(
    memberId: string,
    options: {
      type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{
    items: SharedItem[];
    total: number;
  }> {
    const { type, limit = 50, offset = 0 } = options;

    const query: Record<string, unknown> = {
      sharedWith: memberId,
      status: ShareStatus.ACTIVE
    };

    if (type) {
      query.shareType = type;
    }

    const [items, total] = await Promise.all([
      SupportShare.find(query)
        .sort({ sharedAt: -1 })
        .skip(offset)
        .limit(limit),
      SupportShare.countDocuments(query)
    ]);

    return {
      items: items.map(item => ({
        shareId: item._id.toString(),
        shareType: item.shareType,
        content: item.content,
        sharedAt: item.sharedAt,
        expiresAt: item.expiresAt,
        sharedWith: item.sharedWith,
        status: item.status
      })),
      total
    };
  }

  /**
   * Revoke a share
   */
  async revokeShare(
    shareId: string,
    customerId: string
  ): Promise<boolean> {
    const share = await SupportShare.findOne({
      _id: shareId,
      ownerId: customerId
    });

    if (!share) {
      throw new Error('Share not found or unauthorized');
    }

    if (share.status === ShareStatus.REVOKED) {
      throw new Error('Share is already revoked');
    }

    share.status = ShareStatus.REVOKED;
    share.revokedAt = new Date();
    await share.save();

    await this.recordHistory({
      customerId,
      familyMemberId: share.sharedWith.join(','),
      familyMemberName: 'Family Members',
      action: 'SHARE_REVOKED',
      actionType: 'revoke',
      details: {
        shareId,
        shareType: share.shareType
      },
      relatedResourceId: shareId,
      relatedResourceType: 'share'
    });

    logger.info('Share revoked', { shareId, customerId });

    return true;
  }

  /**
   * Revoke all shares of a specific type
   */
  async revokeAllSharesOfType(
    customerId: string,
    shareType: string
  ): Promise<number> {
    const result = await SupportShare.updateMany(
      {
        ownerId: customerId,
        shareType,
        status: ShareStatus.ACTIVE
      },
      {
        $set: {
          status: ShareStatus.REVOKED,
          revokedAt: new Date()
        }
      }
    );

    logger.info('Revoked all shares of type', {
      customerId,
      shareType,
      count: result.modifiedCount
    });

    return result.modifiedCount;
  }

  /**
   * Get a specific share by ID
   */
  async getShareById(
    shareId: string,
    memberId?: string
  ): Promise<ISupportShareDocument | null> {
    const query: Record<string, unknown> = { _id: shareId };

    if (memberId) {
      query.sharedWith = memberId;
    }

    return SupportShare.findOne(query);
  }

  /**
   * Check if content has been shared with member
   */
  async isSharedWithMember(
    customerId: string,
    memberId: string,
    resourceType: string,
    resourceId: string
  ): Promise<boolean> {
    const share = await SupportShare.findOne({
      ownerId: customerId,
      sharedWith: memberId,
      status: ShareStatus.ACTIVE,
      [`content.${resourceType}Id`]: resourceId
    });

    return !!share;
  }

  /**
   * Update share expiration
   */
  async updateShareExpiration(
    shareId: string,
    customerId: string,
    expiresAt: Date
  ): Promise<ISupportShareDocument> {
    const share = await SupportShare.findOne({
      _id: shareId,
      ownerId: customerId
    });

    if (!share) {
      throw new Error('Share not found or unauthorized');
    }

    share.expiresAt = expiresAt;
    await share.save();

    return share;
  }

  /**
   * Add a member to an existing share
   */
  async addMemberToShare(
    shareId: string,
    customerId: string,
    memberId: string
  ): Promise<ISupportShareDocument> {
    const share = await SupportShare.findOne({
      _id: shareId,
      ownerId: customerId,
      status: ShareStatus.ACTIVE
    });

    if (!share) {
      throw new Error('Share not found or unauthorized');
    }

    if (!share.sharedWith.includes(memberId)) {
      share.sharedWith.push(memberId);
      await share.save();
    }

    return share;
  }

  /**
   * Remove a member from a share
   */
  async removeMemberFromShare(
    shareId: string,
    customerId: string,
    memberId: string
  ): Promise<ISupportShareDocument> {
    const share = await SupportShare.findOne({
      _id: shareId,
      ownerId: customerId
    });

    if (!share) {
      throw new Error('Share not found or unauthorized');
    }

    share.sharedWith = share.sharedWith.filter(id => id !== memberId);
    await share.save();

    return share;
  }

  /**
   * Record history action
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
      logger.error('Failed to record share history', { error, params });
    }
  }
}

export const supportSharingService = new SupportSharingService();
