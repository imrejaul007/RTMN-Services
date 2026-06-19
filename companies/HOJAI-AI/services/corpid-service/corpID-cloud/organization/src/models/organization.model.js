/**
 * CorpID Cloud - Organization Model
 * Data model for organizations, departments, teams, and memberships
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const organizations = new Map();
export const departments = new Map();
export const teams = new Map();
export const memberships = new Map();
export const invitations = new Map();
export const linkedAccounts = new Map();

// ============ MODEL FACTORIES ============

/**
 * Create a new organization
 */
export function createOrganization(data) {
  const now = new Date().toISOString();
  const organization = {
    id: `org-${uuidv4().slice(0, 8)}`,
    name: data.name,
    slug: data.slug || generateSlug(data.name),
    type: data.type || 'company',
    industry: data.industry || 'other',
    size: data.size || 'startup',
    status: 'active',

    // Branding
    logo: data.logo || null,
    primaryColor: data.primaryColor || '#0066FF',
    customDomain: data.customDomain || null,

    // Settings
    settings: {
      defaultRole: data.defaultRole || 'member',
      mfaRequired: data.mfaRequired || false,
      passwordPolicy: data.passwordPolicy || {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecial: true
      },
      sessionTimeout: data.sessionTimeout || 86400000,
      ipWhitelist: data.ipWhitelist || [],
      allowedAuthMethods: data.allowedAuthMethods || ['email_password'],
      ...data.settings
    },

    // Identity Provider
    identityProvider: {
      type: data.idpType || null,
      config: data.idpConfig || null,
      enabled: data.idpEnabled || false
    },

    // Billing
    plan: data.plan || 'free',
    billingEmail: data.billingEmail || data.ownerEmail || null,
    trialEndsAt: data.trialEndsAt || null,

    // Hierarchy
    parentId: data.parentId || null,

    // Metadata
    metadata: data.metadata || {},
    tags: data.tags || [],

    // Timestamps
    createdAt: now,
    updatedAt: now,
    createdBy: data.createdBy || null
  };

  organizations.set(organization.id, organization);
  return organization;
}

/**
 * Create a new department
 */
export function createDepartment(data) {
  const now = new Date().toISOString();
  const department = {
    id: `dept-${uuidv4().slice(0, 8)}`,
    organizationId: data.organizationId,
    name: data.name,
    code: data.code || null,
    headId: data.headId || null,
    parentId: data.parentId || null,
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now
  };

  departments.set(department.id, department);
  return department;
}

/**
 * Create a new team
 */
export function createTeam(data) {
  const now = new Date().toISOString();
  const team = {
    id: `team-${uuidv4().slice(0, 8)}`,
    organizationId: data.organizationId,
    departmentId: data.departmentId || null,
    name: data.name,
    description: data.description || null,
    type: data.type || 'functional',
    private: data.private || false,
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now
  };

  teams.set(team.id, team);
  return team;
}

/**
 * Create a membership
 */
export function createMembership(data) {
  const now = new Date().toISOString();
  const membership = {
    id: `mbr-${uuidv4().slice(0, 8)}`,
    userId: data.userId,
    organizationId: data.organizationId,
    departmentId: data.departmentId || null,
    teamIds: data.teamIds || [],
    role: data.role || 'member',
    status: 'active',

    // Employment details
    title: data.title || null,
    employeeId: data.employeeId || null,
    managerId: data.managerId || null,
    startDate: data.startDate || now,
    endDate: data.endDate || null,

    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now
  };

  memberships.set(membership.id, membership);
  return membership;
}

/**
 * Create an invitation
 */
export function createInvitation(data) {
  const now = new Date().toISOString();
  const invitation = {
    id: `inv-${uuidv4().slice(0, 8)}`,
    organizationId: data.organizationId,
    departmentId: data.departmentId || null,
    email: data.email.toLowerCase(),
    role: data.role || 'member',
    invitedBy: data.invitedBy,
    token: generateToken(),
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    acceptedAt: null,
    createdAt: now
  };

  invitations.set(invitation.id, invitation);
  return invitation;
}

/**
 * Create a linked account
 */
export function createLinkedAccount(data) {
  const now = new Date().toISOString();
  const linkedAccount = {
    id: `link-${uuidv4().slice(0, 8)}`,
    organizationId: data.organizationId,
    type: data.type,
    linkedEntityType: data.linkedEntityType,
    linkedEntityId: data.linkedEntityId,
    relationship: data.relationship || 'linked',
    metadata: data.metadata || {},
    createdAt: now
  };

  linkedAccounts.set(linkedAccount.id, linkedAccount);
  return linkedAccount;
}

// ============ HELPERS ============

function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function generateToken() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

// ============ QUERY HELPERS ============

/**
 * Get organization by ID
 */
export function getOrganizationById(id) {
  return organizations.get(id) || null;
}

/**
 * Get organization by slug
 */
export function getOrganizationBySlug(slug) {
  for (const org of organizations.values()) {
    if (org.slug === slug) return org;
  }
  return null;
}

/**
 * Get organization by custom domain
 */
export function getOrganizationByDomain(domain) {
  for (const org of organizations.values()) {
    if (org.customDomain === domain) return org;
  }
  return null;
}

/**
 * Get departments for an organization
 */
export function getDepartments(organizationId, parentId = null) {
  return Array.from(departments.values()).filter(d =>
    d.organizationId === organizationId &&
    (parentId === null ? d.parentId === null : d.parentId === parentId)
  );
}

/**
 * Get teams for an organization or department
 */
export function getTeams(organizationId, departmentId = null) {
  return Array.from(teams.values()).filter(t =>
    t.organizationId === organizationId &&
    (departmentId === null ? !t.departmentId : t.departmentId === departmentId)
  );
}

/**
 * Get memberships for an organization
 */
export function getMemberships(organizationId, options = {}) {
  let results = Array.from(memberships.values()).filter(m =>
    m.organizationId === organizationId
  );

  if (options.departmentId) {
    results = results.filter(m => m.departmentId === options.departmentId);
  }
  if (options.teamId) {
    results = results.filter(m => m.teamIds.includes(options.teamId));
  }
  if (options.role) {
    results = results.filter(m => m.role === options.role);
  }
  if (options.status) {
    results = results.filter(m => m.status === options.status);
  }

  return results;
}

/**
 * Get membership by user and organization
 */
export function getMembershipByUser(userId, organizationId) {
  for (const membership of memberships.values()) {
    if (membership.userId === userId && membership.organizationId === organizationId) {
      return membership;
    }
  }
  return null;
}

/**
 * Get pending invitations for an organization
 */
export function getInvitations(organizationId, status = null) {
  let results = Array.from(invitations.values()).filter(i =>
    i.organizationId === organizationId
  );

  if (status) {
    results = results.filter(i => i.status === status);
  }

  return results;
}

/**
 * Get invitation by token
 */
export function getInvitationByToken(token) {
  for (const invitation of invitations.values()) {
    if (invitation.token === token) return invitation;
  }
  return null;
}

/**
 * Get linked accounts for an organization
 */
export function getLinkedAccounts(organizationId, type = null) {
  let results = Array.from(linkedAccounts.values()).filter(l =>
    l.organizationId === organizationId
  );

  if (type) {
    results = results.filter(l => l.type === type);
  }

  return results;
}

/**
 * Get organization hierarchy (tree structure)
 */
export function getOrganizationHierarchy(organizationId) {
  const org = organizations.get(organizationId);
  if (!org) return null;

  const orgDepartments = getDepartments(organizationId);
  const orgTeams = getTeams(organizationId);

  const buildDepartmentTree = (parentId = null) => {
    return orgDepartments
      .filter(d => d.parentId === parentId)
      .map(d => ({
        ...d,
        teams: orgTeams
          .filter(t => t.departmentId === d.id)
          .map(t => ({
            ...t,
            memberCount: getMemberships(organizationId, { teamId: t.id }).length
          })),
        memberCount: getMemberships(organizationId, { departmentId: d.id }).length,
        children: buildDepartmentTree(d.id)
      }));
  };

  return {
    ...org,
    departments: buildDepartmentTree(null),
    totalDepartments: orgDepartments.length,
    totalTeams: orgTeams.length
  };
}

// ============ DEFAULT DATA ============

// Create RTMN HQ organization
export function initializeDefaultOrganization() {
  if (organizations.has('RTMN-HQ')) return;

  const org = createOrganization({
    id: 'RTMN-HQ',
    name: 'RTMN Headquarters',
    slug: 'rtmn-hq',
    type: 'company',
    industry: 'technology',
    size: 'enterprise',
    plan: 'enterprise',
    ownerEmail: 'admin@rtmn.com',
    createdBy: 'system'
  });

  // Create default departments
  const engDept = createDepartment({
    organizationId: org.id,
    name: 'Engineering',
    code: 'ENG'
  });

  const salesDept = createDepartment({
    organizationId: org.id,
    name: 'Sales',
    code: 'SALES'
  });

  const hrDept = createDepartment({
    organizationId: org.id,
    name: 'Human Resources',
    code: 'HR'
  });

  // Create default teams
  createTeam({
    organizationId: org.id,
    departmentId: engDept.id,
    name: 'Platform',
    description: 'Core platform development'
  });

  createTeam({
    organizationId: org.id,
    departmentId: engDept.id,
    name: 'AI',
    description: 'AI and machine learning'
  });

  return org;
}

// Initialize on module load
initializeDefaultOrganization();
