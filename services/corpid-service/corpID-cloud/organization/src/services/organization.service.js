/**
 * CorpID Cloud - Organization Service
 * Business logic for organization management
 */

import {
  createOrganization,
  createDepartment,
  createTeam,
  createMembership,
  createInvitation,
  createLinkedAccount,
  getOrganizationById,
  getOrganizationBySlug,
  getOrganizationByDomain,
  getDepartments,
  getTeams,
  getMemberships,
  getMembershipByUser,
  getInvitations,
  getInvitationByToken,
  getLinkedAccounts,
  getOrganizationHierarchy,
  organizations,
  departments,
  teams,
  memberships
} from '../models/organization.model.js';

import { dataAudit } from '../../../shared/utils/logger.js';
import { Errors } from '../../../shared/middleware/error-handler.js';
import { generateSlug } from '../../../shared/utils/security.js';

/**
 * Organization Service
 */
class OrganizationService {
  /**
   * Create a new organization
   */
  async create(data, createdBy = null) {
    // Check for existing organization with same slug
    const existingBySlug = getOrganizationBySlug(data.slug || generateSlug(data.name));
    if (existingBySlug) {
      throw Errors.conflict('Organization with this name/slug already exists');
    }

    // Check for existing custom domain
    if (data.customDomain) {
      const existingByDomain = getOrganizationByDomain(data.customDomain);
      if (existingByDomain) {
        throw Errors.conflict('Organization with this domain already exists');
      }
    }

    // Create organization
    const organization = createOrganization({
      ...data,
      createdBy
    });

    // Create membership for the creator
    if (createdBy) {
      createMembership({
        userId: createdBy,
        organizationId: organization.id,
        role: 'org-owner',
        title: 'Owner'
      });
    }

    return organization;
  }

  /**
   * Get organization by ID
   */
  getById(id) {
    const organization = getOrganizationById(id);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }
    return organization;
  }

  /**
   * Get organization by slug
   */
  getBySlug(slug) {
    const organization = getOrganizationBySlug(slug);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }
    return organization;
  }

  /**
   * Update organization
   */
  update(id, data, userId) {
    const organization = getOrganizationById(id);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }

    const changes = {};
    const allowedFields = [
      'name', 'logo', 'primaryColor', 'customDomain', 'settings',
      'billingEmail', 'plan', 'metadata', 'tags'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const oldValue = organization[field];
        organization[field] = data[field];
        changes[field] = { old: oldValue, new: data[field] };
      }
    }

    organization.updatedAt = new Date().toISOString();
    organizations.set(id, organization);

    dataAudit('organization.updated', { user: { id: userId } }, 'organization', id, changes);

    return organization;
  }

  /**
   * Delete organization (soft delete)
   */
  delete(id, userId) {
    const organization = getOrganizationById(id);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }

    organization.status = 'deleted';
    organization.deletedAt = new Date().toISOString();
    organization.deletedBy = userId;
    organizations.set(id, organization);

    dataAudit('organization.deleted', { user: { id: userId } }, 'organization', id);

    return { success: true, message: 'Organization deleted' };
  }

  /**
   * Get organization statistics
   */
  getStats(id) {
    const organization = getOrganizationById(id);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }

    const orgDepartments = getDepartments(id);
    const orgTeams = getTeams(id);
    const orgMemberships = getMemberships(id, { status: 'active' });

    return {
      organizationId: id,
      status: organization.status,
      plan: organization.plan,
      departments: orgDepartments.length,
      teams: orgTeams.length,
      members: orgMemberships.length,
      byRole: this.countByRole(orgMemberships),
      byDepartment: this.countByDepartment(orgMemberships)
    };
  }

  countByRole(memberships) {
    const counts = {};
    for (const m of memberships) {
      counts[m.role] = (counts[m.role] || 0) + 1;
    }
    return counts;
  }

  countByDepartment(memberships) {
    const counts = {};
    for (const m of memberships) {
      const deptId = m.departmentId || 'unassigned';
      counts[deptId] = (counts[deptId] || 0) + 1;
    }
    return counts;
  }
}

/**
 * Department Service
 */
class DepartmentService {
  /**
   * Create a department
   */
  create(data, userId) {
    const organization = getOrganizationById(data.organizationId);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }

    // Check for existing department with same code
    const existing = getDepartments(data.organizationId)
      .find(d => d.code === data.code);
    if (existing) {
      throw Errors.conflict('Department with this code already exists');
    }

    const department = createDepartment(data);

    dataAudit('department.created', { user: { id: userId } }, 'department', department.id);

    return department;
  }

  /**
   * Get department by ID
   */
  getById(id) {
    const department = departments.get(id);
    if (!department) {
      throw Errors.notFound('Department not found');
    }
    return department;
  }

  /**
   * Update department
   */
  update(id, data, userId) {
    const department = departments.get(id);
    if (!department) {
      throw Errors.notFound('Department not found');
    }

    const changes = {};
    const allowedFields = ['name', 'code', 'headId', 'parentId', 'metadata'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        changes[field] = { old: department[field], new: data[field] };
        department[field] = data[field];
      }
    }

    department.updatedAt = new Date().toISOString();
    departments.set(id, department);

    dataAudit('department.updated', { user: { id: userId } }, 'department', id, changes);

    return department;
  }

  /**
   * Delete department
   */
  delete(id, userId) {
    const department = departments.get(id);
    if (!department) {
      throw Errors.notFound('Department not found');
    }

    // Check for nested departments
    const children = getDepartments(department.organizationId, id);
    if (children.length > 0) {
      throw Errors.badRequest('Cannot delete department with sub-departments');
    }

    // Check for members
    const members = getMemberships(department.organizationId, { departmentId: id });
    if (members.length > 0) {
      throw Errors.badRequest('Cannot delete department with members');
    }

    departments.delete(id);

    dataAudit('department.deleted', { user: { id: userId } }, 'department', id);

    return { success: true, message: 'Department deleted' };
  }
}

/**
 * Team Service
 */
class TeamService {
  /**
   * Create a team
   */
  create(data, userId) {
    const organization = getOrganizationById(data.organizationId);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }

    const team = createTeam(data);

    dataAudit('team.created', { user: { id: userId } }, 'team', team.id);

    return team;
  }

  /**
   * Get team by ID
   */
  getById(id) {
    const team = teams.get(id);
    if (!team) {
      throw Errors.notFound('Team not found');
    }
    return team;
  }

  /**
   * Update team
   */
  update(id, data, userId) {
    const team = teams.get(id);
    if (!team) {
      throw Errors.notFound('Team not found');
    }

    const changes = {};
    const allowedFields = ['name', 'description', 'departmentId', 'private', 'metadata'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        changes[field] = { old: team[field], new: data[field] };
        team[field] = data[field];
      }
    }

    team.updatedAt = new Date().toISOString();
    teams.set(id, team);

    dataAudit('team.updated', { user: { id: userId } }, 'team', id, changes);

    return team;
  }

  /**
   * Delete team
   */
  delete(id, userId) {
    const team = teams.get(id);
    if (!team) {
      throw Errors.notFound('Team not found');
    }

    teams.delete(id);

    dataAudit('team.deleted', { user: { id: userId } }, 'team', id);

    return { success: true, message: 'Team deleted' };
  }

  /**
   * Add member to team
   */
  addMember(teamId, userId, addedBy) {
    const team = teams.get(teamId);
    if (!team) {
      throw Errors.notFound('Team not found');
    }

    const membership = getMembershipByUser(userId, team.organizationId);
    if (!membership) {
      throw Errors.notFound('User is not a member of this organization');
    }

    if (!membership.teamIds.includes(teamId)) {
      membership.teamIds.push(teamId);
      memberships.set(membership.id, membership);
    }

    dataAudit('team.member_added', { user: { id: addedBy } }, 'team', teamId, { userId });

    return membership;
  }

  /**
   * Remove member from team
   */
  removeMember(teamId, userId, removedBy) {
    const team = teams.get(teamId);
    if (!team) {
      throw Errors.notFound('Team not found');
    }

    const membership = getMembershipByUser(userId, team.organizationId);
    if (!membership) {
      throw Errors.notFound('User is not a member of this organization');
    }

    membership.teamIds = membership.teamIds.filter(id => id !== teamId);
    memberships.set(membership.id, membership);

    dataAudit('team.member_removed', { user: { id: removedBy } }, 'team', teamId, { userId });

    return membership;
  }
}

/**
 * Membership Service
 */
class MembershipService {
  /**
   * Get user's membership in an organization
   */
  getUserMembership(userId, organizationId) {
    return getMembershipByUser(userId, organizationId);
  }

  /**
   * Get all members of an organization
   */
  getMembers(organizationId, options = {}) {
    return getMemberships(organizationId, options);
  }

  /**
   * Update membership
   */
  update(membershipId, data, userId) {
    const membership = memberships.get(membershipId);
    if (!membership) {
      throw Errors.notFound('Membership not found');
    }

    const changes = {};
    const allowedFields = ['role', 'departmentId', 'title', 'managerId', 'metadata'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        changes[field] = { old: membership[field], new: data[field] };
        membership[field] = data[field];
      }
    }

    membership.updatedAt = new Date().toISOString();
    memberships.set(membershipId, membership);

    dataAudit('membership.updated', { user: { id: userId } }, 'membership', membershipId, changes);

    return membership;
  }

  /**
   * Suspend member
   */
  suspend(membershipId, userId) {
    const membership = memberships.get(membershipId);
    if (!membership) {
      throw Errors.notFound('Membership not found');
    }

    membership.status = 'suspended';
    membership.suspendedAt = new Date().toISOString();
    memberships.set(membershipId, membership);

    dataAudit('membership.suspended', { user: { id: userId } }, 'membership', membershipId);

    return membership;
  }

  /**
   * Reactivate member
   */
  reactivate(membershipId, userId) {
    const membership = memberships.get(membershipId);
    if (!membership) {
      throw Errors.notFound('Membership not found');
    }

    membership.status = 'active';
    membership.reactivatedAt = new Date().toISOString();
    memberships.set(membershipId, membership);

    dataAudit('membership.reactivated', { user: { id: userId } }, 'membership', membershipId);

    return membership;
  }

  /**
   * Remove member from organization
   */
  remove(membershipId, userId) {
    const membership = memberships.get(membershipId);
    if (!membership) {
      throw Errors.notFound('Membership not found');
    }

    membership.status = 'removed';
    membership.removedAt = new Date().toISOString();
    memberships.set(membershipId, membership);

    dataAudit('membership.removed', { user: { id: userId } }, 'membership', membershipId);

    return { success: true, message: 'Member removed' };
  }
}

/**
 * Invitation Service
 */
class InvitationService {
  /**
   * Create invitation
   */
  create(data, invitedBy) {
    const organization = getOrganizationById(data.organizationId);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }

    // Check for existing pending invitation
    const existing = getInvitations(data.organizationId, 'pending')
      .find(i => i.email === data.email.toLowerCase());
    if (existing) {
      throw Errors.conflict('Pending invitation already exists for this email');
    }

    const invitation = createInvitation({
      ...data,
      invitedBy
    });

    dataAudit('invitation.created', { user: { id: invitedBy } }, 'invitation', invitation.id);

    return invitation;
  }

  /**
   * Get invitation by token
   */
  getByToken(token) {
    const invitation = getInvitationByToken(token);
    if (!invitation) {
      throw Errors.notFound('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw Errors.badRequest('Invitation has already been used or expired');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      invitation.status = 'expired';
      invitations.set(invitation.id, invitation);
      throw Errors.badRequest('Invitation has expired');
    }

    return invitation;
  }

  /**
   * Accept invitation
   */
  accept(token, userId) {
    const invitation = this.getByToken(token);

    // Create membership
    const membership = createMembership({
      userId,
      organizationId: invitation.organizationId,
      departmentId: invitation.departmentId,
      role: invitation.role
    });

    // Update invitation
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();
    invitation.acceptedBy = userId;
    invitations.set(invitation.id, invitation);

    dataAudit('invitation.accepted', { user: { id: userId } }, 'invitation', invitation.id);

    return { membership, invitation };
  }

  /**
   * Cancel invitation
   */
  cancel(invitationId, userId) {
    const invitation = invitations.get(invitationId);
    if (!invitation) {
      throw Errors.notFound('Invitation not found');
    }

    invitation.status = 'cancelled';
    invitations.set(invitationId, invitation);

    dataAudit('invitation.cancelled', { user: { id: userId } }, 'invitation', invitationId);

    return { success: true, message: 'Invitation cancelled' };
  }

  /**
   * Resend invitation
   */
  resend(invitationId, userId) {
    const invitation = invitations.get(invitationId);
    if (!invitation) {
      throw Errors.notFound('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw Errors.badRequest('Cannot resend non-pending invitation');
    }

    // Generate new token and extend expiry
    const crypto = require('crypto');
    invitation.token = crypto.randomBytes(32).toString('hex');
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    invitation.resentAt = new Date().toISOString();
    invitation.resentBy = userId;
    invitations.set(invitationId, invitation);

    dataAudit('invitation.resent', { user: { id: userId } }, 'invitation', invitationId);

    return invitation;
  }
}

/**
 * Linked Account Service
 */
class LinkedAccountService {
  /**
   * Link external account
   */
  create(data, userId) {
    const organization = getOrganizationById(data.organizationId);
    if (!organization) {
      throw Errors.notFound('Organization not found');
    }

    const linkedAccount = createLinkedAccount(data);

    dataAudit('linked_account.created', { user: { id: userId } }, 'linked_account', linkedAccount.id);

    return linkedAccount;
  }

  /**
   * Get linked accounts
   */
  getAll(organizationId, type = null) {
    return getLinkedAccounts(organizationId, type);
  }

  /**
   * Remove linked account
   */
  remove(linkedAccountId, userId) {
    const linkedAccount = linkedAccounts.get(linkedAccountId);
    if (!linkedAccount) {
      throw Errors.notFound('Linked account not found');
    }

    linkedAccounts.delete(linkedAccountId);

    dataAudit('linked_account.removed', { user: { id: userId } }, 'linked_account', linkedAccountId);

    return { success: true, message: 'Linked account removed' };
  }
}

export const organizationService = new OrganizationService();
export const departmentService = new DepartmentService();
export const teamService = new TeamService();
export const membershipService = new MembershipService();
export const invitationService = new InvitationService();
export const linkedAccountService = new LinkedAccountService();

export default {
  organizationService,
  departmentService,
  teamService,
  membershipService,
  invitationService,
  linkedAccountService
};
