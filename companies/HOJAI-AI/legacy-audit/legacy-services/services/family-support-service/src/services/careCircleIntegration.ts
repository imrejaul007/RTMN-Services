import {
  CareCircleLink,
  ICareCircleLinkDocument,
  SupportShare,
  ShareStatus,
  SupportPermission,
  SupportPermissionType,
  LinkStatus
} from '../models/familySupport';
import { linkageService, LinkFamilyToSupportParams } from './linkageService';
import { logger } from '../utils/logger';

export interface CareCircleMember {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface CircleSupportInfo {
  customerId: string;
  careCircleId: string;
  careCircleName: string;
  linkedAt: Date;
  linkedBy: string;
  members: CareCircleMember[];
  sharedServices: string[];
  supportLinks: Array<{
    memberId: string;
    memberName: string;
    permissions: SupportPermission;
  }>;
}

export interface SyncPermissionsResult {
  updated: number;
  added: number;
  removed: number;
  errors: string[];
}

export class CareCircleIntegrationService {
  /**
   * Link a customer's support to a care circle
   */
  async linkToCareCircle(
    customerId: string,
    careCircleId: string,
    careCircleName: string,
    linkedBy: string,
    sharedServices: string[] = []
  ): Promise<ICareCircleLinkDocument> {
    logger.info('Linking customer to care circle', {
      customerId,
      careCircleId,
      careCircleName
    });

    // Check for existing link
    const existingLink = await CareCircleLink.findOne({
      customerId,
      careCircleId
    });

    if (existingLink) {
      // Update existing link
      existingLink.sharedServices = sharedServices;
      existingLink.linkedAt = new Date();
      existingLink.linkedBy = linkedBy;
      await existingLink.save();

      logger.info('Care circle link updated', {
        linkId: existingLink._id,
        customerId,
        careCircleId
      });

      return existingLink;
    }

    // Create new link
    const link = new CareCircleLink({
      customerId,
      careCircleId,
      careCircleName,
      linkedAt: new Date(),
      linkedBy,
      autoSyncPermissions: false,
      sharedServices
    });

    await link.save();

    logger.info('Care circle link created', {
      linkId: link._id,
      customerId,
      careCircleId
    });

    return link;
  }

  /**
   * Unlink customer from a care circle
   */
  async unlinkFromCareCircle(
    customerId: string,
    careCircleId: string
  ): Promise<boolean> {
    const result = await CareCircleLink.deleteOne({
      customerId,
      careCircleId
    });

    if (result.deletedCount === 0) {
      throw new Error('Care circle link not found');
    }

    logger.info('Care circle unlinked', {
      customerId,
      careCircleId
    });

    return true;
  }

  /**
   * Sync permissions from care circle to family support links
   */
  async syncPermissionsFromCircle(
    customerId: string,
    circleId: string,
    circleMembers: CareCircleMember[]
  ): Promise<SyncPermissionsResult> {
    const result: SyncPermissionsResult = {
      updated: 0,
      added: 0,
      removed: 0,
      errors: []
    };

    // Get existing links
    const existingLinks = await linkageService.getFamilyLinks(customerId);
    const existingMemberIds = new Set(existingLinks.map(l => l.familyMemberId));

    // Get circle member IDs
    const circleMemberIds = new Set(circleMembers.map(m => m.id));

    // Remove links for members no longer in circle
    for (const link of existingLinks) {
      if (!circleMemberIds.has(link.familyMemberId)) {
        try {
          await linkageService.unlinkFamilyFromSupport(
            link._id.toString(),
            customerId
          );
          result.removed++;
        } catch (error) {
          result.errors.push(`Failed to remove link for ${link.familyMemberName}: ${error}`);
        }
      }
    }

    // Add or update links for circle members
    for (const member of circleMembers) {
      try {
        if (existingMemberIds.has(member.id)) {
          // Update existing link
          const existingLink = existingLinks.find(l => l.familyMemberId === member.id);
          if (existingLink) {
            // Sync relationship from circle
            await linkageService.updatePermissions({
              linkId: existingLink._id.toString(),
              permissions: {
                ...existingLink.permissions.toObject(),
                permissions: [SupportPermissionType.ALL_ACCESS],
                canManageBookings: true,
                canManagePrescriptions: true,
                canViewMedicalRecords: true,
                canAccessBilling: true,
                canCreateSupportTickets: true,
                canResolveIssues: true,
                emergencyAccess: true
              }
            });
            result.updated++;
          }
        } else {
          // Create new link with default permissions
          await linkageService.linkFamilyToSupport({
            ownerId: customerId,
            familyMemberId: member.id,
            familyMemberName: member.name,
            relationship: member.role || 'Care Circle Member',
            permissions: {
              permissions: [SupportPermissionType.ALL_ACCESS],
              canManageBookings: true,
              canManagePrescriptions: true,
              canViewMedicalRecords: true,
              canAccessBilling: true,
              canCreateSupportTickets: true,
              canResolveIssues: true,
              emergencyAccess: true
            },
            createdBy: customerId
          });
          result.added++;
        }
      } catch (error) {
        result.errors.push(`Failed to sync member ${member.name}: ${error}`);
      }
    }

    logger.info('Permissions synced from care circle', {
      customerId,
      circleId,
      result
    });

    return result;
  }

  /**
   * Get care circle support information for a customer
   */
  async getCircleSupportInfo(customerId: string): Promise<CircleSupportInfo | null> {
    const circleLinks = await CareCircleLink.find({
      customerId
    });

    if (circleLinks.length === 0) {
      return null;
    }

    // Get support links for the customer
    const supportLinks = await linkageService.getFamilyLinks(customerId);

    // For now, we return info for the first linked circle
    // In production, this could aggregate all circles
    const circleLink = circleLinks[0];

    return {
      customerId,
      careCircleId: circleLink.careCircleId,
      careCircleName: circleLink.careCircleName,
      linkedAt: circleLink.linkedAt,
      linkedBy: circleLink.linkedBy,
      members: [], // Would be fetched from care circle service
      sharedServices: circleLink.sharedServices,
      supportLinks: supportLinks.map(link => ({
        memberId: link.familyMemberId,
        memberName: link.familyMemberName,
        permissions: link.permissions.toObject() as SupportPermission
      }))
    };
  }

  /**
   * Share support information with a care circle
   */
  async shareSupportWithCircle(
    customerId: string,
    supportInfo: Record<string, unknown>,
    sharedWithMemberIds: string[]
  ): Promise<string> {
    const share = new SupportShare({
      ownerId: customerId,
      shareType: 'care_circle',
      sharedWith: sharedWithMemberIds,
      content: supportInfo,
      status: ShareStatus.ACTIVE,
      sharedAt: new Date()
    });

    await share.save();

    logger.info('Support info shared with care circle', {
      shareId: share._id,
      customerId,
      sharedWithCount: sharedWithMemberIds.length
    });

    return share._id.toString();
  }

  /**
   * Get all care circle links for a customer
   */
  async getCareCircleLinks(customerId: string): Promise<ICareCircleLinkDocument[]> {
    return CareCircleLink.find({ customerId }).sort({ linkedAt: -1 });
  }

  /**
   * Update shared services for a care circle link
   */
  async updateSharedServices(
    customerId: string,
    careCircleId: string,
    sharedServices: string[]
  ): Promise<ICareCircleLinkDocument> {
    const link = await CareCircleLink.findOne({
      customerId,
      careCircleId
    });

    if (!link) {
      throw new Error('Care circle link not found');
    }

    link.sharedServices = sharedServices;
    await link.save();

    logger.info('Shared services updated', {
      linkId: link._id,
      sharedServices
    });

    return link;
  }

  /**
   * Enable/disable auto-sync for care circle
   */
  async setAutoSync(
    customerId: string,
    careCircleId: string,
    autoSync: boolean
  ): Promise<ICareCircleLinkDocument> {
    const link = await CareCircleLink.findOne({
      customerId,
      careCircleId
    });

    if (!link) {
      throw new Error('Care circle link not found');
    }

    link.autoSyncPermissions = autoSync;
    await link.save();

    logger.info('Auto-sync setting updated', {
      linkId: link._id,
      autoSync
    });

    return link;
  }

  /**
   * Get all customers linked to a specific care circle
   */
  async getCustomersInCircle(careCircleId: string): Promise<string[]> {
    const links = await CareCircleLink.find({
      careCircleId
    });

    return links.map(link => link.customerId);
  }

  /**
   * Handle care circle member updates (webhook/event handler)
   */
  async handleCircleMemberUpdate(
    careCircleId: string,
    action: 'added' | 'removed' | 'updated',
    member: CareCircleMember
  ): Promise<void> {
    const links = await CareCircleLink.find({
      careCircleId,
      autoSyncPermissions: true
    });

    for (const link of links) {
      try {
        switch (action) {
          case 'added':
            await linkageService.linkFamilyToSupport({
              ownerId: link.customerId,
              familyMemberId: member.id,
              familyMemberName: member.name,
              relationship: member.role || 'Care Circle Member',
              permissions: {
                permissions: [SupportPermissionType.ALL_ACCESS],
                canManageBookings: true,
                canManagePrescriptions: true,
                canViewMedicalRecords: true,
                canAccessBilling: true,
                canCreateSupportTickets: true,
                canResolveIssues: true,
                emergencyAccess: true
              },
              createdBy: link.linkedBy
            });
            break;

          case 'removed':
            const links = await linkageService.getFamilyLinks(link.customerId);
            const linkToRemove = links.find(l => l.familyMemberId === member.id);
            if (linkToRemove) {
              await linkageService.unlinkFamilyFromSupport(
                linkToRemove._id.toString(),
                link.customerId
              );
            }
            break;

          case 'updated':
            // Re-sync permissions
            // Implementation would update existing link
            break;
        }
      } catch (error) {
        logger.error('Failed to handle circle member update', {
          error,
          careCircleId,
          memberId: member.id,
          action
        });
      }
    }
  }
}

export const careCircleIntegrationService = new CareCircleIntegrationService();
