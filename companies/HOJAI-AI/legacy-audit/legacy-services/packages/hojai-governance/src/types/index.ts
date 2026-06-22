import { z } from 'zod';

// ============================================================================
// TENANT TYPES
// ============================================================================

export enum TenantType {
  REZ_ECOSYSTEM = 'rez_ecosystem',
  RABTUL_SAAS = 'rabtul_saas',
  EXTERNAL = 'external',
  INTERNAL = 'internal'
}

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  PENDING = 'pending'
}

export enum TenantTier {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  PRIVILEGED = 'privileged' // REZ internal
}

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  type: z.nativeEnum(TenantType),
  tier: z.nativeEnum(TenantTier),
  status: z.nativeEnum(TenantStatus),

  // Namespace isolation
  namespace: z.string().regex(/^[a-z0-9-]+$/),

  // Feature flags
  features: z.object({
    eventIngestion: z.boolean().default(true),
    memoryStorage: z.boolean().default(true),
    vectorSearch: z.boolean().default(true),
    workflowRuntime: z.boolean().default(true),
    agentRuntime: z.boolean().default(false),
    whatsappAI: z.boolean().default(false),
    hyperlocal: z.boolean().default(false),
    privilegedGraph: z.boolean().default(false) // REZ-only
  }),

  // Quotas
  quotas: z.object({
    eventsPerMonth: z.number().default(10000),
    memoryStorageMB: z.number().default(100),
    apiCallsPerDay: z.number().default(1000),
    workflows: z.number().default(5),
    agents: z.number().default(0),
    users: z.number().default(3)
  }),

  // Isolation settings
  isolation: z.object({
    databaseNamespace: z.string(),
    redisNamespace: z.string(),
    vectorNamespace: z.string(),
    eventNamespace: z.string(),
    encryptAtRest: z.boolean().default(true),
    encryptInTransit: z.boolean().default(true)
  }),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  activatedAt: z.date().optional(),
  suspendedAt: z.date().optional()
});

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export enum OrgRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export const OrganizationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().optional(),

  // Business info
  businessType: z.string().optional(),
  website: z.string().url().optional(),
  address: z.string().optional(),

  // RBAC
  ownerId: z.string().uuid(),
  defaultRole: z.nativeEnum(OrgRole).default(OrgRole.MEMBER),

  createdAt: z.date(),
  updatedAt: z.date()
});

// ============================================================================
// USER TYPES
// ============================================================================

export enum UserStatus {
  ACTIVE = 'active',
  INVITED = 'invited',
  SUSPENDED = 'suspended',
  DELETED = 'deleted'
}

export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),

  email: z.string().email(),
  phone: z.string().optional(),
  passwordHash: z.string(),

  // Profile
  name: z.string().min(2).max(100),
  avatar: z.string().url().optional(),
  timezone: z.string().default('Asia/Kolkata'),
  locale: z.string().default('en-IN'),

  // Status
  status: z.nativeEnum(UserStatus).default(UserStatus.INVITED),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  mfaEnabled: z.boolean().default(false),

  // Auth
  lastLoginAt: z.date().optional(),
  lastLoginIP: z.string().optional(),
  failedLoginAttempts: z.number().default(0),
  lockedUntil: z.date().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

// ============================================================================
// API KEY TYPES
// ============================================================================

export enum ApiKeyType {
  SECRET = 'secret',
  PUBLISHABLE = 'publishable',
  SERVICE = 'service'
}

export enum ApiKeyStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

export const ApiKeySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),

  name: z.string().min(2).max(100),
  type: z.nativeEnum(ApiKeyType),
  status: z.nativeEnum(ApiKeyStatus).default(ApiKeyStatus.ACTIVE),

  // Key hash (never store raw)
  keyHash: z.string(),
  keyPrefix: z.string().max(8), // First 8 chars shown to user

  // Permissions
  permissions: z.array(z.string()).default([]),
  allowedIPs: z.array(z.string()).default([]).optional(),
  allowedOrigins: z.array(z.string()).default([]).optional(),

  // Rate limiting
  rateLimitPerMinute: z.number().default(60),
  quotaPerDay: z.number().optional(),
  usedToday: z.number().default(0),

  // Expiration
  expiresAt: z.date().optional(),
  lastUsedAt: z.date().optional(),
  lastUsedIP: z.string().optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

// ============================================================================
// RBAC TYPES
// ============================================================================

export enum Permission {
  // Events
  EVENTS_READ = 'events:read',
  EVENTS_WRITE = 'events:write',
  EVENTS_ADMIN = 'events:admin',

  // Memory
  MEMORY_READ = 'memory:read',
  MEMORY_WRITE = 'memory:write',
  MEMORY_DELETE = 'memory:delete',
  MEMORY_ADMIN = 'memory:admin',

  // Workflows
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_WRITE = 'workflow:write',
  WORKFLOW_EXECUTE = 'workflow:execute',
  WORKFLOW_ADMIN = 'workflow:admin',

  // Agents
  AGENT_READ = 'agent:read',
  AGENT_WRITE = 'agent:write',
  AGENT_EXECUTE = 'agent:execute',
  AGENT_ADMIN = 'agent:admin',

  // Admin
  TENANT_READ = 'tenant:read',
  TENANT_WRITE = 'tenant:write',
  TENANT_ADMIN = 'tenant:admin',

  ORG_READ = 'org:read',
  ORG_WRITE = 'org:write',
  ORG_ADMIN = 'org:admin',

  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_ADMIN = 'user:admin',

  API_KEY_READ = 'api_key:read',
  API_KEY_WRITE = 'api_key:write',
  API_KEY_ADMIN = 'api_key:admin',

  AUDIT_READ = 'audit:read',
  AUDIT_EXPORT = 'audit:export',

  // Privileged (REZ-only)
  PRIVILEGED_GRAPH = 'privileged:graph',
  PRIVILEGED_IDENTITY = 'privileged:identity',
  PRIVILEGED_ECOSYSTEM = 'privileged:ecosystem'
}

export const RolePermissionsSchema = z.object({
  roleId: z.string().uuid(),
  roleName: z.string(),
  tenantId: z.string().uuid(),

  permissions: z.array(z.nativeEnum(Permission)),

  // Constraints
  resourceRestrictions: z.record(z.string(), z.any()).optional(),
  timeRestrictions: z.object({
    allowedHours: z.array(z.number()).optional(), // 0-23
    allowedDays: z.array(z.number()).optional() // 0-6
  }).optional(),

  createdAt: z.date(),
  updatedAt: z.date()
});

// ============================================================================
// POLICY TYPES
// ============================================================================

export enum PolicyEffect {
  ALLOW = 'allow',
  DENY = 'deny'
}

export const PolicySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(100),
  description: z.string().optional(),

  effect: z.nativeEnum(PolicyEffect),

  // Actions this policy applies to
  actions: z.array(z.string()),

  // Resources this policy applies to
  resources: z.array(z.string()), // e.g., "events:*", "memory:customer:*"

  // Conditions
  conditions: z.record(z.any()).optional(),

  // Priority (higher = evaluated first)
  priority: z.number().default(0),

  enabled: z.boolean().default(true),

  createdAt: z.date(),
  updatedAt: z.date()
});

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export enum AuditAction {
  // Auth
  AUTH_LOGIN = 'auth:login',
  AUTH_LOGOUT = 'auth:logout',
  AUTH_LOGIN_FAILED = 'auth:login_failed',
  AUTH_PASSWORD_RESET = 'auth:password_reset',
  AUTH_MFA_ENABLED = 'auth:mfa_enabled',

  // Tenant
  TENANT_CREATED = 'tenant:created',
  TENANT_UPDATED = 'tenant:updated',
  TENANT_SUSPENDED = 'tenant:suspended',
  TENANT_QUOTA_EXCEEDED = 'tenant:quota_exceeded',

  // Org
  ORG_CREATED = 'org:created',
  ORG_UPDATED = 'org:updated',
  ORG_MEMBER_ADDED = 'org:member_added',
  ORG_MEMBER_REMOVED = 'org:member_removed',

  // User
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
  USER_DELETED = 'user:deleted',
  USER_ROLE_CHANGED = 'user:role_changed',

  // API Key
  API_KEY_CREATED = 'api_key:created',
  API_KEY_REVOKED = 'api_key:revoked',
  API_KEY_EXCEEDED = 'api_key:exceeded',

  // Resource
  RESOURCE_ACCESSED = 'resource:accessed',
  RESOURCE_CREATED = 'resource:created',
  RESOURCE_UPDATED = 'resource:updated',
  RESOURCE_DELETED = 'resource:deleted',

  // Policy
  POLICY_CREATED = 'policy:created',
  POLICY_UPDATED = 'policy:updated',
  POLICY_DELETED = 'policy:deleted',
  POLICY_VIOLATED = 'policy:violated'
}

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),

  // Who
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  apiKeyId: z.string().uuid().optional(),

  // What
  action: z.nativeEnum(AuditAction),
  resource: z.string(),
  resourceId: z.string().optional(),

  // Details
  details: z.record(z.any()).optional(),

  // Context
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  requestId: z.string().optional(),

  // Result
  success: z.boolean().default(true),
  error: z.string().optional(),

  createdAt: z.date()
});

// ============================================================================
// USAGE & METERING TYPES
// ============================================================================

export const UsageRecordSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),

  metric: z.string(), // events, api_calls, storage_mb, etc.
  value: z.number(),
  unit: z.string(),

  period: z.object({
    start: z.date(),
    end: z.date()
  }),

  metadata: z.record(z.any()).optional(),

  createdAt: z.date()
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Tenant = z.infer<typeof TenantSchema>;
export type Organization = z.infer<typeof OrganizationSchema>;
export type User = z.infer<typeof UserSchema>;
export type ApiKey = z.infer<typeof ApiKeySchema>;
export type RolePermissions = z.infer<typeof RolePermissionsSchema>;
export type Policy = z.infer<typeof PolicySchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type UsageRecord = z.infer<typeof UsageRecordSchema>;
