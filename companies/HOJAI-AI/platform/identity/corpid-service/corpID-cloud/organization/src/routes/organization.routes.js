/**
 * CorpID Cloud - Organization Routes
 * Express routes for organization management
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  requireAuth,
  requireAdmin,
  requireBusinessScope
} from '../../../../shared/middleware/auth.js';
import { asyncHandler } from '../../../../shared/middleware/error-handler.js';
import {
  organizationService,
  departmentService,
  teamService,
  membershipService,
  invitationService,
  linkedAccountService
} from '../services/organization.service.js';
import { getOrganizationHierarchy } from '../models/organization.model.js';

const router = express.Router();

// ============ ORGANIZATION ROUTES ============

/**
 * Create organization
 * POST /api/organizations
 */
router.post('/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const organization = await organizationService.create(req.body, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      organization
    });
  })
);

/**
 * List organizations (superadmin only)
 * GET /api/organizations
 */
router.get('/',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { status, plan, industry, page = 1, limit = 20 } = req.query;

    // Get all organizations (would be database query in production)
    const { organizations } = await import('../models/organization.model.js');
    let orgs = Array.from(organizations.values());

    if (status) orgs = orgs.filter(o => o.status === status);
    if (plan) orgs = orgs.filter(o => o.plan === plan);
    if (industry) orgs = orgs.filter(o => o.industry === industry);

    const start = (page - 1) * limit;
    const paginatedOrgs = orgs.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      count: orgs.length,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(orgs.length / limit),
      organizations: paginatedOrgs.map(o => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        type: o.type,
        industry: o.industry,
        size: o.size,
        status: o.status,
        plan: o.plan,
        memberCount: membershipService.getMembers(o.id).length,
        createdAt: o.createdAt
      }))
    });
  })
);

/**
 * Get organization by ID
 * GET /api/organizations/:id
 */
router.get('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    // Check business scope for non-admins
    if (req.user.role !== 'superadmin') {
      const membership = membershipService.getUserMembership(req.user.id, req.params.id);
      if (!membership) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: 'Not a member of this organization' }
        });
      }
    }

    const organization = organizationService.getById(req.params.id);

    res.json({
      success: true,
      organization
    });
  })
);

/**
 * Update organization
 * PUT /api/organizations/:id
 */
router.put('/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const organization = organizationService.update(req.params.id, req.body, req.user.id);

    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization
    });
  })
);

/**
 * Delete organization
 * DELETE /api/organizations/:id
 */
router.delete('/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    await organizationService.delete(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  })
);

/**
 * Get organization statistics
 * GET /api/organizations/:id/stats
 */
router.get('/:id/stats',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const stats = organizationService.getStats(req.params.id);

    res.json({
      success: true,
      stats
    });
  })
);

/**
 * Get organization hierarchy
 * GET /api/organizations/:id/hierarchy
 */
router.get('/:id/hierarchy',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const hierarchy = getOrganizationHierarchy(req.params.id);

    if (!hierarchy) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Organization not found' }
      });
    }

    res.json({
      success: true,
      hierarchy
    });
  })
);

// ============ DEPARTMENT ROUTES ============

/**
 * Create department
 * POST /api/organizations/:orgId/departments
 */
router.post('/:orgId/departments',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const department = departmentService.create({
      ...req.body,
      organizationId: req.params.orgId
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department
    });
  })
);

/**
 * List departments
 * GET /api/organizations/:orgId/departments
 */
router.get('/:orgId/departments',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { parentId } = req.query;
    const { getDepartments } = await import('../models/organization.model.js');
    const departments = getDepartments(req.params.orgId, parentId || null);

    res.json({
      success: true,
      count: departments.length,
      departments
    });
  })
);

/**
 * Get department
 * GET /api/organizations/:orgId/departments/:id
 */
router.get('/:orgId/departments/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const department = departmentService.getById(req.params.id);

    res.json({
      success: true,
      department
    });
  })
);

/**
 * Update department
 * PUT /api/organizations/:orgId/departments/:id
 */
router.put('/:orgId/departments/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const department = departmentService.update(req.params.id, req.body, req.user.id);

    res.json({
      success: true,
      message: 'Department updated successfully',
      department
    });
  })
);

/**
 * Delete department
 * DELETE /api/organizations/:orgId/departments/:id
 */
router.delete('/:orgId/departments/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    await departmentService.delete(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  })
);

/**
 * Get department members
 * GET /api/organizations/:orgId/departments/:id/members
 */
router.get('/:orgId/departments/:id/members',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const members = membershipService.getMembers(req.params.orgId, {
      departmentId: req.params.id
    });

    res.json({
      success: true,
      count: members.length,
      members
    });
  })
);

// ============ TEAM ROUTES ============

/**
 * Create team
 * POST /api/organizations/:orgId/teams
 */
router.post('/:orgId/teams',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const team = teamService.create({
      ...req.body,
      organizationId: req.params.orgId
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      team
    });
  })
);

/**
 * List teams
 * GET /api/organizations/:orgId/teams
 */
router.get('/:orgId/teams',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { departmentId } = req.query;
    const { getTeams } = await import('../models/organization.model.js');
    const teams = getTeams(req.params.orgId, departmentId || null);

    res.json({
      success: true,
      count: teams.length,
      teams
    });
  })
);

/**
 * Get team
 * GET /api/organizations/:orgId/teams/:id
 */
router.get('/:orgId/teams/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const team = teamService.getById(req.params.id);

    res.json({
      success: true,
      team
    });
  })
);

/**
 * Update team
 * PUT /api/organizations/:orgId/teams/:id
 */
router.put('/:orgId/teams/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const team = teamService.update(req.params.id, req.body, req.user.id);

    res.json({
      success: true,
      message: 'Team updated successfully',
      team
    });
  })
);

/**
 * Delete team
 * DELETE /api/organizations/:orgId/teams/:id
 */
router.delete('/:orgId/teams/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    await teamService.delete(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Team deleted successfully'
    });
  })
);

/**
 * Add team member
 * POST /api/organizations/:orgId/teams/:id/members
 */
router.post('/:orgId/teams/:id/members',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { userId } = req.body;
    const membership = teamService.addMember(req.params.id, userId, req.user.id);

    res.json({
      success: true,
      message: 'Member added to team',
      membership
    });
  })
);

/**
 * Remove team member
 * DELETE /api/organizations/:orgId/teams/:id/members/:userId
 */
router.delete('/:orgId/teams/:id/members/:userId',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    await teamService.removeMember(req.params.id, req.params.userId, req.user.id);

    res.json({
      success: true,
      message: 'Member removed from team'
    });
  })
);

// ============ MEMBERSHIP ROUTES ============

/**
 * List organization members
 * GET /api/organizations/:orgId/members
 */
router.get('/:orgId/members',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { role, status, departmentId, teamId, page = 1, limit = 20 } = req.query;

    const members = membershipService.getMembers(req.params.orgId, {
      role, status, departmentId, teamId
    });

    const start = (page - 1) * limit;
    const paginatedMembers = members.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      count: members.length,
      page: parseInt(page),
      limit: parseInt(limit),
      members: paginatedMembers
    });
  })
);

/**
 * Get member details
 * GET /api/organizations/:orgId/members/:userId
 */
router.get('/:orgId/members/:userId',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { getMembershipByUser, users } = await import('../../core/src/models/user.model.js');
    const membership = getMembershipByUser(req.params.userId, req.params.orgId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found' }
      });
    }

    res.json({
      success: true,
      membership
    });
  })
);

/**
 * Update member
 * PUT /api/organizations/:orgId/members/:userId
 */
router.put('/:orgId/members/:userId',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const membership = membershipService.getUserMembership(req.params.userId, req.params.orgId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found' }
      });
    }

    const updated = membershipService.update(membership.id, req.body, req.user.id);

    res.json({
      success: true,
      message: 'Member updated successfully',
      membership: updated
    });
  })
);

/**
 * Suspend member
 * POST /api/organizations/:orgId/members/:userId/suspend
 */
router.post('/:orgId/members/:userId/suspend',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const membership = membershipService.getUserMembership(req.params.userId, req.params.orgId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found' }
      });
    }

    const suspended = membershipService.suspend(membership.id, req.user.id);

    res.json({
      success: true,
      message: 'Member suspended',
      membership: suspended
    });
  })
);

/**
 * Reactivate member
 * POST /api/organizations/:orgId/members/:userId/reactivate
 */
router.post('/:orgId/members/:userId/reactivate',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const membership = membershipService.getUserMembership(req.params.userId, req.params.orgId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found' }
      });
    }

    const reactivated = membershipService.reactivate(membership.id, req.user.id);

    res.json({
      success: true,
      message: 'Member reactivated',
      membership: reactivated
    });
  })
);

/**
 * Remove member
 * DELETE /api/organizations/:orgId/members/:userId
 */
router.delete('/:orgId/members/:userId',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const membership = membershipService.getUserMembership(req.params.userId, req.params.orgId);

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Member not found' }
      });
    }

    await membershipService.remove(membership.id, req.user.id);

    res.json({
      success: true,
      message: 'Member removed from organization'
    });
  })
);

// ============ INVITATION ROUTES ============

/**
 * Create invitation
 * POST /api/organizations/:orgId/invitations
 */
router.post('/:orgId/invitations',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const invitation = invitationService.create({
      ...req.body,
      organizationId: req.params.orgId
    }, req.user.id);

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt
      }
    });
  })
);

/**
 * List invitations
 * GET /api/organizations/:orgId/invitations
 */
router.get('/:orgId/invitations',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const { getInvitations } = await import('../models/organization.model.js');
    const invitations = getInvitations(req.params.orgId, status || null);

    res.json({
      success: true,
      count: invitations.length,
      invitations
    });
  })
);

/**
 * Resend invitation
 * POST /api/organizations/:orgId/invitations/:id/resend
 */
router.post('/:orgId/invitations/:id/resend',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { invitations } = await import('../models/organization.model.js');
    const invitation = invitationService.resend(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Invitation resent',
      invitation
    });
  })
);

/**
 * Cancel invitation
 * DELETE /api/organizations/:orgId/invitations/:id
 */
router.delete('/:orgId/invitations/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    await invitationService.cancel(req.params.id, req.user.id);

    res.json({
      success: true,
      message: 'Invitation cancelled'
    });
  })
);

// ============ PUBLIC ROUTES ============

/**
 * Accept invitation
 * POST /api/invitations/:token/accept
 */
router.post('/invitations/:token/accept',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const result = invitationService.accept(req.params.token, req.user.id);

    res.json({
      success: true,
      message: 'Invitation accepted successfully',
      membership: result.membership
    });
  })
);

/**
 * Get invitation details (public)
 * GET /api/invitations/:token
 */
router.get('/invitations/:token',
  asyncHandler(async (req, res) => {
    const { getInvitationByToken, organizations } = await import('../models/organization.model.js');
    const invitation = invitationService.getByToken(req.params.token);
    const organization = organizations.get(invitation.organizationId);

    res.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        organization: {
          id: organization.id,
          name: organization.name,
          logo: organization.logo
        }
      }
    });
  })
);

export default router;
