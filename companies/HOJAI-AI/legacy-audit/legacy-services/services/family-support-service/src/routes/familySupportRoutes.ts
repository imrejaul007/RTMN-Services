import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { linkageService } from '../services/linkageService';
import { delegationService } from '../services/delegationService';
import { notificationService } from '../services/notificationService';
import { careCircleIntegrationService } from '../services/careCircleIntegration';
import { supportSharingService } from '../services/supportSharingService';
import { EmergencyAccess, NotificationType } from '../models/familySupport';
import { logger } from '../utils/logger';
import { validationMiddleware } from '../middleware/validation';

const router = Router();

// ============== FAMILY LINK ROUTES ==============

/**
 * POST /family/link
 * Link a family member to support
 */
router.post('/family/link',
  validationMiddleware.validateBody(z.object({
    ownerId: z.string().min(1),
    familyMemberId: z.string().min(1),
    familyMemberName: z.string().min(1),
    relationship: z.string().min(1),
    permissions: z.object({
      permissions: z.array(z.string()),
      canManageBookings: z.boolean().optional(),
      canManagePrescriptions: z.boolean().optional(),
      canViewMedicalRecords: z.boolean().optional(),
      canAccessBilling: z.boolean().optional(),
      canCreateSupportTickets: z.boolean().optional(),
      canResolveIssues: z.boolean().optional(),
      emergencyAccess: z.boolean().optional(),
      customPermissions: z.record(z.boolean()).optional()
    }),
    expiresAt: z.string().datetime().optional(),
    notes: z.string().optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const link = await linkageService.linkFamilyToSupport({
        ...req.body,
        createdBy: req.body.ownerId,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined
      });

      res.status(201).json({
        success: true,
        data: link,
        message: 'Family member linked to support successfully'
      });
    } catch (error: any) {
      logger.error('Failed to link family member', { error: error.message, body: req.body });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /family/links/:customerId
 * Get all family links for a customer
 */
router.get('/family/links/:customerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const links = await linkageService.getFamilyLinks(req.params.customerId);

      res.json({
        success: true,
        data: links,
        count: links.length
      });
    } catch (error: any) {
      logger.error('Failed to get family links', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /family/link/:linkId
 * Remove a family support link
 */
router.delete('/family/link/:linkId',
  validationMiddleware.validateBody(z.object({
    removedBy: z.string().min(1)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await linkageService.unlinkFamilyFromSupport(
        req.params.linkId,
        req.body.removedBy
      );

      res.json({
        success: true,
        message: 'Family link removed successfully'
      });
    } catch (error: any) {
      logger.error('Failed to unlink family', { error: error.message, linkId: req.params.linkId });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * PUT /family/link/:linkId/permissions
 * Update permissions for a family link
 */
router.put('/family/link/:linkId/permissions',
  validationMiddleware.validateBody(z.object({
    permissions: z.object({
      permissions: z.array(z.string()),
      canManageBookings: z.boolean().optional(),
      canManagePrescriptions: z.boolean().optional(),
      canViewMedicalRecords: z.boolean().optional(),
      canAccessBilling: z.boolean().optional(),
      canCreateSupportTickets: z.boolean().optional(),
      canResolveIssues: z.boolean().optional(),
      emergencyAccess: z.boolean().optional(),
      customPermissions: z.record(z.boolean()).optional()
    })
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const link = await linkageService.updatePermissions({
        linkId: req.params.linkId,
        permissions: req.body.permissions
      });

      res.json({
        success: true,
        data: link,
        message: 'Permissions updated successfully'
      });
    } catch (error: any) {
      logger.error('Failed to update permissions', { error: error.message, linkId: req.params.linkId });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /family/link/:linkId/access
 * Get support access for a family member
 */
router.get('/family/link/:linkId/access',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const link = await linkageService.getLinkById(req.params.linkId);

      if (!link) {
        return res.status(404).json({ success: false, error: 'Link not found' });
      }

      const access = await linkageService.getSupportAccess(
        link.ownerId,
        link.familyMemberId
      );

      res.json({
        success: true,
        data: access
      });
    } catch (error: any) {
      logger.error('Failed to get access', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// ============== DELEGATION ROUTES ==============

/**
 * POST /family/delegation
 * Create a new delegation
 */
router.post('/family/delegation',
  validationMiddleware.validateBody(z.object({
    ownerId: z.string().min(1),
    delegateId: z.string().min(1),
    delegateName: z.string().min(1),
    scope: z.object({
      services: z.array(z.string()).min(1),
      actions: z.array(z.string()).min(1),
      resourceTypes: z.array(z.string()).min(1),
      timeBound: z.boolean().optional(),
      validFrom: z.string().datetime().optional(),
      validUntil: z.string().datetime().optional()
    }),
    expiresAt: z.string().datetime().optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const delegation = await delegationService.createDelegation({
        ...req.body,
        scope: {
          ...req.body.scope,
          validFrom: req.body.scope.validFrom ? new Date(req.body.scope.validFrom) : undefined,
          validUntil: req.body.scope.validUntil ? new Date(req.body.scope.validUntil) : undefined
        },
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined
      });

      res.status(201).json({
        success: true,
        data: delegation,
        message: 'Delegation created successfully'
      });
    } catch (error: any) {
      logger.error('Failed to create delegation', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /family/delegations/:customerId
 * Get all delegations for a customer (as owner)
 */
router.get('/family/delegations/:customerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const delegations = await delegationService.getDelegations(req.params.customerId);

      res.json({
        success: true,
        data: delegations,
        count: delegations.length
      });
    } catch (error: any) {
      logger.error('Failed to get delegations', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /family/delegation/:delegationId
 * Revoke a delegation
 */
router.delete('/family/delegation/:delegationId',
  validationMiddleware.validateBody(z.object({
    revokedBy: z.string().min(1),
    reason: z.string().optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await delegationService.revokeDelegation(
        req.params.delegationId,
        req.body.revokedBy,
        req.body.reason
      );

      res.json({
        success: true,
        message: 'Delegation revoked successfully'
      });
    } catch (error: any) {
      logger.error('Failed to revoke delegation', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * POST /family/delegation/:delegationId/accept
 * Accept a pending delegation
 */
router.post('/family/delegation/:delegationId/accept',
  validationMiddleware.validateBody(z.object({
    acceptedBy: z.string().min(1)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const delegation = await delegationService.acceptDelegation(
        req.params.delegationId,
        req.body.acceptedBy
      );

      res.json({
        success: true,
        data: delegation,
        message: 'Delegation accepted successfully'
      });
    } catch (error: any) {
      logger.error('Failed to accept delegation', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /family/delegation/for/:delegateId
 * Get delegations where someone is the delegate
 */
router.get('/family/delegation/for/:delegateId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const delegations = await delegationService.getDelegationsFor(req.params.delegateId);

      res.json({
        success: true,
        data: delegations,
        count: delegations.length
      });
    } catch (error: any) {
      logger.error('Failed to get delegations for delegate', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// ============== NOTIFICATION ROUTES ==============

/**
 * POST /family/notify
 * Send notification to family members
 */
router.post('/family/notify',
  validationMiddleware.validateBody(z.object({
    customerId: z.string().min(1),
    customerName: z.string().min(1),
    type: z.string(),
    title: z.string().min(1),
    message: z.string().min(1),
    data: z.record(z.unknown()).optional(),
    channels: z.array(z.string()).optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notificationIds = await notificationService.notifyFamily(
        req.body.customerId,
        req.body.customerName,
        {
          type: req.body.type as NotificationType,
          title: req.body.title,
          message: req.body.message,
          data: req.body.data || {},
          channels: req.body.channels
        }
      );

      res.json({
        success: true,
        data: { notificationIds },
        message: `Notifications sent to ${notificationIds.length} family members`
      });
    } catch (error: any) {
      logger.error('Failed to send notifications', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /family/notifications/:memberId
 * Get notifications for a family member
 */
router.get('/family/notifications/:memberId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { notifications, total, unreadCount } = await notificationService.getNotifications(
        req.params.memberId,
        {
          limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
          offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
          unreadOnly: req.query.unreadOnly === 'true',
          type: req.query.type as NotificationType
        }
      );

      res.json({
        success: true,
        data: { notifications, total, unreadCount }
      });
    } catch (error: any) {
      logger.error('Failed to get notifications', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * PUT /family/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/family/notifications/:notificationId/read',
  validationMiddleware.validateBody(z.object({
    memberId: z.string().min(1)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await notificationService.markAsRead(
        req.params.notificationId,
        req.body.memberId
      );

      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } catch (error: any) {
      logger.error('Failed to mark notification as read', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// ============== SHARING ROUTES ==============

/**
 * POST /family/share
 * Share support info with family
 */
router.post('/family/share',
  validationMiddleware.validateBody(z.object({
    customerId: z.string().min(1),
    customerName: z.string().min(1),
    shareType: z.enum(['support_issue', 'resolution', 'medical_info']),
    content: z.record(z.unknown()),
    sharedWithMemberIds: z.array(z.string()).optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let shareId: string;

      switch (req.body.shareType) {
        case 'support_issue':
          shareId = await supportSharingService.shareIssueWithFamily({
            ...req.body.content,
            customerId: req.body.customerId,
            customerName: req.body.customerName,
            sharedWithMemberIds: req.body.sharedWithMemberIds
          });
          break;
        case 'resolution':
          shareId = await supportSharingService.shareResolutionWithFamily({
            ...req.body.content,
            customerId: req.body.customerId,
            customerName: req.body.customerName,
            sharedWithMemberIds: req.body.sharedWithMemberIds
          });
          break;
        case 'medical_info':
          shareId = await supportSharingService.shareMedicalInfoWithFamily({
            ...req.body.content,
            customerId: req.body.customerId,
            customerName: req.body.customerName,
            sharedWithMemberIds: req.body.sharedWithMemberIds
          });
          break;
        default:
          throw new Error('Invalid share type');
      }

      res.status(201).json({
        success: true,
        data: { shareId },
        message: 'Shared with family successfully'
      });
    } catch (error: any) {
      logger.error('Failed to share', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /family/shared/:customerId
 * Get items shared with family
 */
router.get('/family/shared/:customerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { items, total } = await supportSharingService.getSharedWithFamily(
        req.params.customerId,
        {
          type: req.query.type as string,
          limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
          offset: req.query.offset ? parseInt(req.query.offset as string) : 0
        }
      );

      res.json({
        success: true,
        data: { items, total }
      });
    } catch (error: any) {
      logger.error('Failed to get shared items', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /family/share/:shareId
 * Revoke a share
 */
router.delete('/family/share/:shareId',
  validationMiddleware.validateBody(z.object({
    customerId: z.string().min(1)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await supportSharingService.revokeShare(
        req.params.shareId,
        req.body.customerId
      );

      res.json({
        success: true,
        message: 'Share revoked successfully'
      });
    } catch (error: any) {
      logger.error('Failed to revoke share', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// ============== CARE CIRCLE ROUTES ==============

/**
 * POST /family/carecircle/link
 * Link customer to a care circle
 */
router.post('/family/carecircle/link',
  validationMiddleware.validateBody(z.object({
    customerId: z.string().min(1),
    careCircleId: z.string().min(1),
    careCircleName: z.string().min(1),
    linkedBy: z.string().min(1),
    sharedServices: z.array(z.string()).optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const link = await careCircleIntegrationService.linkToCareCircle(
        req.body.customerId,
        req.body.careCircleId,
        req.body.careCircleName,
        req.body.linkedBy,
        req.body.sharedServices
      );

      res.status(201).json({
        success: true,
        data: link,
        message: 'Care circle linked successfully'
      });
    } catch (error: any) {
      logger.error('Failed to link care circle', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /family/carecircle/:customerId
 * Get care circle info for customer
 */
router.get('/family/carecircle/:customerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const circleInfo = await careCircleIntegrationService.getCircleSupportInfo(
        req.params.customerId
      );

      res.json({
        success: true,
        data: circleInfo
      });
    } catch (error: any) {
      logger.error('Failed to get care circle info', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /family/carecircle/:customerId/:careCircleId
 * Unlink from care circle
 */
router.delete('/family/carecircle/:customerId/:careCircleId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await careCircleIntegrationService.unlinkFromCareCircle(
        req.params.customerId,
        req.params.careCircleId
      );

      res.json({
        success: true,
        message: 'Care circle unlinked successfully'
      });
    } catch (error: any) {
      logger.error('Failed to unlink care circle', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// ============== EMERGENCY ACCESS ROUTES ==============

/**
 * POST /family/emergency/access
 * Grant emergency access
 */
router.post('/family/emergency/access',
  validationMiddleware.validateBody(z.object({
    customerId: z.string().min(1),
    grantedTo: z.array(z.string()).min(1),
    accessLevel: z.enum(['view_only', 'limited_manage', 'full_access']),
    reason: z.string().min(1),
    expiresAt: z.string().datetime().optional()
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const emergencyAccess = new EmergencyAccess({
        customerId: req.body.customerId,
        grantedTo: req.body.grantedTo,
        accessLevel: req.body.accessLevel,
        grantedAt: new Date(),
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        reason: req.body.reason,
        active: true,
        accessLog: []
      });

      await emergencyAccess.save();

      res.status(201).json({
        success: true,
        data: emergencyAccess,
        message: 'Emergency access granted'
      });
    } catch (error: any) {
      logger.error('Failed to grant emergency access', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * GET /family/emergency/:customerId
 * Get emergency access for customer
 */
router.get('/family/emergency/:customerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const access = await EmergencyAccess.findOne({
        customerId: req.params.customerId,
        active: true
      });

      res.json({
        success: true,
        data: access
      });
    } catch (error: any) {
      logger.error('Failed to get emergency access', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /family/emergency/:customerId
 * Revoke emergency access
 */
router.delete('/family/emergency/:customerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await EmergencyAccess.updateOne(
        { customerId: req.params.customerId, active: true },
        { $set: { active: false } }
      );

      res.json({
        success: true,
        message: 'Emergency access revoked'
      });
    } catch (error: any) {
      logger.error('Failed to revoke emergency access', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// ============== HISTORY ROUTES ==============

/**
 * GET /family/history/:customerId
 * Get family support history
 */
router.get('/family/history/:customerId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { FamilySupportHistory } = await import('../models/familySupport');

      const history = await FamilySupportHistory.find({
        customerId: req.params.customerId
      })
        .sort({ timestamp: -1 })
        .limit(req.query.limit ? parseInt(req.query.limit as string) : 100);

      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error: any) {
      logger.error('Failed to get history', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// ============== VALIDATION ROUTES ==============

/**
 * POST /family/validate/permission
 * Validate a family member's permission
 */
router.post('/family/validate/permission',
  validationMiddleware.validateBody(z.object({
    linkId: z.string().min(1),
    action: z.string().min(1)
  })),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await linkageService.validatePermission(
        req.body.linkId,
        req.body.action as any
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      logger.error('Failed to validate permission', { error: error.message });
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

export default router;
