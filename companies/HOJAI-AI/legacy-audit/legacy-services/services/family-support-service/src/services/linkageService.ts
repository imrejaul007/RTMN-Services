import {
  FamilySupportLink,
  SupportPermission,
  IFamilySupportLinkDocument,
  LinkStatus,
  SupportPermissionType,
  FamilySupportHistory
} from '../models/familySupport';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface LinkFamilyToSupportParams {
  ownerId: string;
  familyMemberId: string;
  familyMemberName: string;
  relationship: string;
  permissions: SupportPermission;
  createdBy: string;
  expiresAt?: Date;
  notes?: string;
}

export interface UpdatePermissionsParams {
  linkId: string;
  permissions: SupportPermission;
}

export interface SupportAccessResult {
  hasAccess: boolean;
  permissions: SupportPermission;
  linkId?: string;
  relationship?: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  link?: IFamilySupportLinkDocument;
}

export class LinkageService {
  /**
   * Create a link between a customer and a family member for support access
   */
  async linkFamilyToSupport(params: LinkFamilyToSupportParams): Promise<IFamilySupportLinkDocument> {
    const {
      ownerId,
      familyMemberId,
      familyMemberName,
      relationship,
      permissions,
      createdBy,
      expiresAt,
      notes
    } = params;

    logger.info('Creating family support link', {
      ownerId,
      familyMemberId,
      relationship
    });

    // Check if link already exists
    const existingLink = await FamilySupportLink.findOne({
      ownerId,
      familyMemberId
    });

    if (existingLink) {
      if (existingLink.status === LinkStatus.ACTIVE) {
        throw new Error('Family member is already linked to support');
      }
      // Reactivate existing link
      existingLink.status = LinkStatus.ACTIVE;
      existingLink.permissions = permissions;
      existingLink.linkedAt = new Date();
      existingLink.expiresAt = expiresAt;
      existingLink.notes = notes;
      await existingLink.save();

      await this.recordHistory({
        customerId: ownerId,
        familyMemberId,
        familyMemberName,
        action: 'LINK_REACTIVATED',
        actionType: 'link',
        details: { previousLinkId: existingLink._id }
      });

      return existingLink;
    }

    // Create new link
    const link = new FamilySupportLink({
      ownerId,
      familyMemberId,
      familyMemberName,
      relationship,
      permissions,
      status: LinkStatus.ACTIVE,
      linkedAt: new Date(),
      expiresAt,
      createdBy,
      notes
    });

    await link.save();

    await this.recordHistory({
      customerId: ownerId,
      familyMemberId,
      familyMemberName,
      action: 'FAMILY_LINKED',
      actionType: 'link',
      details: {
        linkId: link._id,
        relationship,
        permissions: permissions.permissions
      }
    });

    logger.info('Family support link created successfully', {
      linkId: link._id,
      ownerId,
      familyMemberId
    });

    return link;
  }

  /**
   * Remove a link between a customer and a family member
   */
  async unlinkFamilyFromSupport(linkId: string, removedBy: string): Promise<boolean> {
    const link = await FamilySupportLink.findById(linkId);

    if (!link) {
      throw new Error('Family support link not found');
    }

    logger.info('Unlinking family member from support', {
      linkId,
      ownerId: link.ownerId,
      familyMemberId: link.familyMemberId
    });

    link.status = LinkStatus.INACTIVE;
    await link.save();

    await this.recordHistory({
      customerId: link.ownerId,
      familyMemberId: link.familyMemberId,
      familyMemberName: link.familyMemberName,
      action: 'FAMILY_UNLINKED',
      actionType: 'unlink',
      details: {
        linkId,
        removedBy,
        reason: 'Manual unlink'
      }
    });

    logger.info('Family support link removed', { linkId });

    return true;
  }

  /**
   * Update permissions for an existing family support link
   */
  async updatePermissions(params: UpdatePermissionsParams): Promise<IFamilySupportLinkDocument> {
    const { linkId, permissions } = params;

    const link = await FamilySupportLink.findById(linkId);

    if (!link) {
      throw new Error('Family support link not found');
    }

    if (link.status !== LinkStatus.ACTIVE) {
      throw new Error('Cannot update permissions for inactive link');
    }

    const previousPermissions = { ...link.permissions.toObject() };

    link.permissions = permissions;
    await link.save();

    await this.recordHistory({
      customerId: link.ownerId,
      familyMemberId: link.familyMemberId,
      familyMemberName: link.familyMemberName,
      action: 'PERMISSIONS_UPDATED',
      actionType: 'update',
      details: {
        linkId,
        previousPermissions,
        newPermissions: permissions
      }
    });

    logger.info('Family support permissions updated', {
      linkId,
      ownerId: link.ownerId
    });

    return link;
  }

  /**
   * Get all family links for a customer
   */
  async getFamilyLinks(customerId: string): Promise<IFamilySupportLinkDocument[]> {
    const links = await FamilySupportLink.find({
      ownerId: customerId,
      status: LinkStatus.ACTIVE
    }).sort({ linkedAt: -1 });

    logger.info('Retrieved family links', {
      customerId,
      count: links.length
    });

    return links;
  }

  /**
   * Get support access details for a specific family member
   */
  async getSupportAccess(
    customerId: string,
    familyMemberId: string
  ): Promise<SupportAccessResult | null> {
    const link = await FamilySupportLink.findOne({
      ownerId: customerId,
      familyMemberId,
      status: LinkStatus.ACTIVE
    });

    if (!link) {
      logger.info('No support access found', { customerId, familyMemberId });
      return null;
    }

    // Check if link has expired
    if (link.expiresAt && new Date() > link.expiresAt) {
      link.status = LinkStatus.INACTIVE;
      await link.save();
      return null;
    }

    return {
      hasAccess: true,
      permissions: link.permissions.toObject() as SupportPermission,
      linkId: link._id.toString(),
      relationship: link.relationship
    };
  }

  /**
   * Validate if a family member can perform a specific action
   */
  async validatePermission(
    linkId: string,
    action: SupportPermissionType
  ): Promise<ValidationResult> {
    const link = await FamilySupportLink.findById(linkId);

    if (!link) {
      return {
        valid: false,
        message: 'Family support link not found'
      };
    }

    if (link.status !== LinkStatus.ACTIVE) {
      return {
        valid: false,
        message: 'Family support link is not active'
      };
    }

    // Check if link has expired
    if (link.expiresAt && new Date() > link.expiresAt) {
      link.status = LinkStatus.INACTIVE;
      await link.save();
      return {
        valid: false,
        message: 'Family support link has expired'
      };
    }

    const permissions = link.permissions;

    // Check for ALL_ACCESS permission
    if (permissions.permissions.includes(SupportPermissionType.ALL_ACCESS)) {
      return { valid: true, link };
    }

    // Check specific permission
    if (permissions.permissions.includes(action)) {
      return { valid: true, link };
    }

    // Check action-specific boolean flags
    const actionPermissionMap: Record<SupportPermissionType, keyof SupportPermission> = {
      [SupportPermissionType.VIEW_BOOKINGS]: 'canManageBookings',
      [SupportPermissionType.MANAGE_BOOKINGS]: 'canManageBookings',
      [SupportPermissionType.VIEW_PRESCRIPTIONS]: 'canManagePrescriptions',
      [SupportPermissionType.MANAGE_PRESCRIPTIONS]: 'canManagePrescriptions',
      [SupportPermissionType.VIEW_MEDICAL_RECORDS]: 'canViewMedicalRecords',
      [SupportPermissionType.VIEW_APPOINTMENTS]: 'canManageBookings',
      [SupportPermissionType.MANAGE_APPOINTMENTS]: 'canManageBookings',
      [SupportPermissionType.VIEW_SUPPORT_ISSUES]: 'canCreateSupportTickets',
      [SupportPermissionType.CREATE_SUPPORT_ISSUES]: 'canCreateSupportTickets',
      [SupportPermissionType.RESOLVE_SUPPORT_ISSUES]: 'canResolveIssues',
      [SupportPermissionType.VIEW_BILLING]: 'canAccessBilling',
      [SupportPermissionType.MANAGE_BILLING]: 'canAccessBilling',
      [SupportPermissionType.VIEW_NOTIFICATIONS]: 'canCreateSupportTickets',
      [SupportPermissionType.EMERGENCY_ACCESS]: 'emergencyAccess',
      [SupportPermissionType.ALL_ACCESS]: 'emergencyAccess'
    };

    const permissionKey = actionPermissionMap[action];
    if (permissionKey && (permissions as any)[permissionKey]) {
      return { valid: true, link };
    }

    logger.warn('Permission validation failed', {
      linkId,
      action,
      ownerId: link.ownerId,
      familyMemberId: link.familyMemberId
    });

    return {
      valid: false,
      message: `Family member does not have permission: ${action}`
    };
  }

  /**
   * Get all family members who have support access to a customer
   */
  async getFamilyMembersWithAccess(customerId: string): Promise<string[]> {
    const links = await FamilySupportLink.find({
      ownerId: customerId,
      status: LinkStatus.ACTIVE
    });

    // Filter out expired links
    const validLinks = links.filter(link => {
      if (link.expiresAt && new Date() > link.expiresAt) {
        return false;
      }
      return true;
    });

    return validLinks.map(link => link.familyMemberId);
  }

  /**
   * Get link details by ID
   */
  async getLinkById(linkId: string): Promise<IFamilySupportLinkDocument | null> {
    return FamilySupportLink.findById(linkId);
  }

  /**
   * Deactivate expired links
   */
  async deactivateExpiredLinks(): Promise<number> {
    const result = await FamilySupportLink.updateMany(
      {
        status: LinkStatus.ACTIVE,
        expiresAt: { $lt: new Date() }
      },
      {
        $set: { status: LinkStatus.INACTIVE }
      }
    );

    if (result.modifiedCount > 0) {
      logger.info('Deactivated expired family links', {
        count: result.modifiedCount
      });
    }

    return result.modifiedCount;
  }

  /**
   * Record action in family support history
   */
  private async recordHistory(params: {
    customerId: string;
    familyMemberId: string;
    familyMemberName: string;
    action: string;
    actionType: string;
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
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
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        relatedResourceId: params.relatedResourceId,
        relatedResourceType: params.relatedResourceType
      });

      await history.save();
    } catch (error) {
      logger.error('Failed to record family support history', {
        error,
        params
      });
    }
  }
}

export const linkageService = new LinkageService();
