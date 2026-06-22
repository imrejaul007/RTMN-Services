import { z } from 'zod';

/**
 * Secret Types supported by the vault
 */
export enum SecretType {
  API_KEY = 'api_key',
  DATABASE_CREDENTIALS = 'database_credentials',
  SERVICE_TOKEN = 'service_token',
  TLS_CERTIFICATE = 'tls_certificate',
  OAUTH_CREDENTIALS = 'oauth_credentials',
  SSH_KEY = 'ssh_key',
  PASSWORD = 'password',
  ENCRYPTION_KEY = 'encryption_key',
  CUSTOM = 'custom'
}

/**
 * Secret lifecycle status
 */
export enum SecretStatus {
  ACTIVE = 'active',
  ROTATING = 'rotating',
  DEPRECATED = 'deprecated',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

/**
 * Rotation schedule types
 */
export enum RotationSchedule {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
  MANUAL = 'manual'
}

/**
 * Access levels for secret access
 */
export enum AccessLevel {
  NONE = 'none',
  READ = 'read',
  WRITE = 'write',
  ADMIN = 'admin',
  OWNER = 'owner'
}

/**
 * Audit event types
 */
export enum AuditEventType {
  SECRET_CREATED = 'secret_created',
  SECRET_READ = 'secret_read',
  SECRET_UPDATED = 'secret_updated',
  SECRET_DELETED = 'secret_deleted',
  SECRET_ROTATED = 'secret_rotated',
  SECRET_ACCESSED = 'secret_accessed',
  POLICY_CREATED = 'policy_created',
  POLICY_UPDATED = 'policy_updated',
  POLICY_DELETED = 'policy_deleted',
  ACCESS_GRANTED = 'access_granted',
  ACCESS_REVOKED = 'access_revoked',
  DYNAMIC_SECRET_CREATED = 'dynamic_secret_created',
  DYNAMIC_SECRET_REVOKED = 'dynamic_secret_revoked',
  AUTH_SUCCESS = 'auth_success',
  AUTH_FAILURE = 'auth_failure'
}

/**
 * Zod schema for creating a new secret
 */
export const CreateSecretSchema = z.object({
  name: z.string()
    .min(1, 'Secret name is required')
    .max(255, 'Secret name too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Name must contain only alphanumeric, underscore, and hyphen'),
  type: z.nativeEnum(SecretType),
  value: z.string().min(1, 'Secret value is required'),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  rotationSchedule: z.nativeEnum(RotationSchedule).optional(),
  rotationConfig: z.object({
    rotateAutomatically: z.boolean().optional(),
    customCronExpression: z.string().optional(),
    rotationWindow: z.number().optional(),
    notifyBeforeRotation: z.number().optional()
  }).optional(),
  allowedServices: z.array(z.string()).optional(),
  maxVersions: z.number().min(1).max(100).optional(),
  expiresAt: z.string().datetime().optional(),
  isDynamic: z.boolean().optional()
});

export type CreateSecretInput = z.infer<typeof CreateSecretSchema>;

/**
 * Zod schema for updating a secret
 */
export const UpdateSecretSchema = z.object({
  value: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
  rotationSchedule: z.nativeEnum(RotationSchedule).optional(),
  rotationConfig: z.object({
    rotateAutomatically: z.boolean().optional(),
    customCronExpression: z.string().optional(),
    rotationWindow: z.number().optional(),
    notifyBeforeRotation: z.number().optional()
  }).optional(),
  allowedServices: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional()
});

export type UpdateSecretInput = z.infer<typeof UpdateSecretSchema>;

/**
 * Zod schema for creating an access policy
 */
export const CreatePolicySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  rules: z.array(z.object({
    resource: z.string(),
    actions: z.array(z.enum(['create', 'read', 'update', 'delete', 'rotate', 'list', 'grant'])),
    conditions: z.record(z.unknown()).optional(),
    effect: z.enum(['allow', 'deny'])
  })),
  priority: z.number().min(0).max(1000).optional(),
  appliesTo: z.array(z.string()).optional()
});

export type CreatePolicyInput = z.infer<typeof CreatePolicySchema>;

/**
 * Zod schema for secret access request
 */
export const SecretAccessRequestSchema = z.object({
  serviceId: z.string().min(1, 'Service ID is required'),
  secretName: z.string().min(1),
  requestedAccess: z.nativeEnum(AccessLevel),
  reason: z.string().optional(),
  ttl: z.number().min(60).max(86400).optional()
});

export type SecretAccessRequestInput = z.infer<typeof SecretAccessRequestSchema>;

/**
 * Zod schema for dynamic secret request
 */
export const DynamicSecretRequestSchema = z.object({
  secretName: z.string().min(1),
  ttl: z.number().min(60).max(3600).optional(),
  database: z.string().optional(),
  username: z.string().optional()
});

export type DynamicSecretRequestInput = z.infer<typeof DynamicSecretRequestSchema>;

/**
 * Secret document interface
 */
export interface ISecret {
  _id: string;
  name: string;
  type: SecretType;
  currentValueHash: string;
  versions: ISecretVersion[];
  metadata: Record<string, unknown>;
  tags: string[];
  rotationSchedule: RotationSchedule;
  rotationConfig: {
    rotateAutomatically: boolean;
    customCronExpression?: string;
    rotationWindow?: number;
    notifyBeforeRotation?: number;
  };
  allowedServices: string[];
  maxVersions: number;
  status: SecretStatus;
  expiresAt?: Date;
  isDynamic: boolean;
  lastRotatedAt?: Date;
  nextRotationAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Secret version interface
 */
export interface ISecretVersion {
  version: number;
  valueHash: string;
  createdAt: Date;
  createdBy: string;
  reason?: string;
  expiresAt?: Date;
}

/**
 * Access policy interface
 */
export interface IAccessPolicy {
  _id: string;
  name: string;
  description?: string;
  rules: IPolicyRule[];
  priority: number;
  appliesTo: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Policy rule interface
 */
export interface IPolicyRule {
  resource: string;
  actions: string[];
  conditions?: Record<string, unknown>;
  effect: 'allow' | 'deny';
}

/**
 * Audit log interface
 */
export interface IAuditLog {
  _id: string;
  eventType: AuditEventType;
  serviceId?: string;
  secretName?: string;
  policyId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * Service identity interface
 */
export interface IServiceIdentity {
  serviceId: string;
  serviceName: string;
  apiKeyHash: string;
  permissions: string[];
  metadata: Record<string, unknown>;
  isActive: boolean;
  lastAccessedAt?: Date;
  createdAt: Date;
}

/**
 * API Response types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: {
    database: boolean;
    encryption: boolean;
  };
}

/**
 * Secret rotation result
 */
export interface RotationResult {
  success: boolean;
  previousVersion: number;
  newVersion: number;
  rotatedAt: Date;
  nextRotationAt: Date;
  errorMessage?: string;
}

/**
 * Dynamic secret result
 */
export interface DynamicSecretResult {
  success: boolean;
  secretName: string;
  accessKey: string;
  secretKey: string;
  expiresAt: Date;
  leaseId: string;
}

/**
 * Vault configuration
 */
export interface VaultConfig {
  masterKey: string;
  encryptionKey: string;
  databaseUri: string;
  port: number;
  environment: 'development' | 'staging' | 'production';
  logLevel: string;
  rotationEnabled: boolean;
  auditRetentionDays: number;
  maxSecretVersions: number;
  defaultRotationSchedule: RotationSchedule;
}
