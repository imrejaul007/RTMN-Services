/**
 * SUTAR Agent ID Service - Type Definitions
 * Comprehensive type definitions for agent identity and registration
 */

import { z } from "zod";

// ============================================================================
// Enums and Constants
// ============================================================================

export enum AgentStatus {
  PENDING = "pending",
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
  BANNED = "banned",
  DELETED = "deleted",
}

export enum AgentType {
  SYSTEM = "system",
  USER = "user",
  BOT = "bot",
  SERVICE = "service",
  ORCHESTRATOR = "orchestrator",
  WORKER = "worker",
  GATEWAY = "gateway",
}

export enum PermissionLevel {
  NONE = 0,
  READ = 1,
  WRITE = 2,
  ADMIN = 3,
  SUPER_ADMIN = 4,
}

export enum VerificationStatus {
  UNVERIFIED = "unverified",
  PENDING = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
  EXPIRED = "expired",
}

export enum AuthTokenType {
  ACCESS = "access",
  REFRESH = "refresh",
  API_KEY = "api_key",
  SESSION = "session",
}

export enum IdentityEventType {
  AGENT_CREATED = "agent.created",
  AGENT_UPDATED = "agent.updated",
  AGENT_DELETED = "agent.deleted",
  AGENT_ACTIVATED = "agent.activated",
  AGENT_SUSPENDED = "agent.suspended",
  AGENT_VERIFIED = "agent.verified",
  AGENT_AUTHENTICATED = "agent.authenticated",
  PERMISSION_CHANGED = "agent.permission_changed",
  STATUS_CHANGED = "agent.status_changed",
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const AgentMetadataSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  avatar: z.string().url().optional(),
  website: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  custom: z.record(z.unknown()).optional(),
});

export const AgentRegistrationSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.nativeEnum(AgentType).default(AgentType.SERVICE),
  metadata: AgentMetadataSchema.optional(),
  capabilities: z.array(z.string()).default([]),
  permissions: z.record(z.string(), z.number()).optional(),
  parentAgentId: z.string().uuid().optional(),
  apiKey: z.string().optional(),
});

export const AgentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  metadata: AgentMetadataSchema.partial().optional(),
  capabilities: z.array(z.string()).optional(),
  status: z.nativeEnum(AgentStatus).optional(),
});

export const AgentVerifySchema = z.object({
  verificationMethod: z.enum(["email", "phone", "api_key", "oauth", "manual"]),
  verificationToken: z.string().optional(),
  proof: z.string().optional(),
});

export const AgentAuthSchema = z.object({
  method: z.enum(["api_key", "password", "oauth", "token"]),
  credentials: z.object({
    apiKey: z.string().optional(),
    password: z.string().optional(),
    oauthToken: z.string().optional(),
    refreshToken: z.string().optional(),
  }),
  scope: z.array(z.string()).optional(),
});

export const PermissionSchema = z.object({
  resource: z.string(),
  actions: z.array(z.enum(["create", "read", "update", "delete", "execute"])),
  level: z.nativeEnum(PermissionLevel),
  conditions: z.record(z.unknown()).optional(),
});

export const PermissionUpdateSchema = z.object({
  permissions: z.array(PermissionSchema),
  replace: z.boolean().default(false),
});

export const AgentSearchSchema = z.object({
  query: z.string().optional(),
  type: z.nativeEnum(AgentType).optional(),
  status: z.nativeEnum(AgentStatus).optional(),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// ============================================================================
// Core Interfaces
// ============================================================================

export interface AgentMetadata {
  name: string;
  description?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  website?: string;
  tags: string[];
  custom?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Agent {
  id: string;
  agentId: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  metadata: AgentMetadata;
  capabilities: string[];
  permissions: Record<string, number>;
  verification: AgentVerification;
  parentAgentId?: string;
  apiKeyHash?: string;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentVerification {
  status: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  expiresAt?: string;
  verificationMethods: string[];
}

export interface AuthToken {
  id: string;
  agentId: string;
  type: AuthTokenType;
  token: string;
  tokenHash: string;
  scope: string[];
  expiresAt: string;
  createdAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export interface Permission {
  id: string;
  agentId: string;
  resource: string;
  actions: string[];
  level: PermissionLevel;
  conditions?: Record<string, unknown>;
  grantedBy?: string;
  grantedAt: string;
  expiresAt?: string;
}

export interface PermissionRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityEvent {
  id: string;
  type: IdentityEventType;
  agentId: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface IdentityIntegration {
  serviceName: string;
  serviceUrl: string;
  enabled: boolean;
  lastSync?: string;
  status: "connected" | "disconnected" | "error";
  error?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AgentRegistrationRequest {
  name: string;
  type?: AgentType;
  metadata?: Partial<AgentMetadata>;
  capabilities?: string[];
  permissions?: Record<string, number>;
  parentAgentId?: string;
}

export interface AgentRegistrationResponse {
  agent: Agent;
  apiKey: string;
  message: string;
}

export interface AgentVerificationRequest {
  verificationMethod: "email" | "phone" | "api_key" | "oauth" | "manual";
  verificationToken?: string;
  proof?: string;
}

export interface AgentVerificationResponse {
  verified: boolean;
  verificationStatus: VerificationStatus;
  message: string;
}

export interface AgentAuthRequest {
  method: "api_key" | "password" | "oauth" | "token";
  credentials: {
    apiKey?: string;
    password?: string;
    oauthToken?: string;
    refreshToken?: string;
  };
  scope?: string[];
}

export interface AgentAuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string[];
}

export interface AgentSearchRequest {
  query?: string;
  type?: AgentType;
  status?: AgentStatus;
  tags?: string[];
  capabilities?: string[];
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
  sortBy?: "name" | "createdAt" | "updatedAt" | "status";
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Service Types
// ============================================================================

export interface StorageOptions {
  ttl?: number;
  namespace?: string;
}

export interface SearchOptions {
  fuzzy?: boolean;
  highlight?: boolean;
  filters?: Record<string, unknown>;
}

export interface MetricsSnapshot {
  totalAgents: number;
  activeAgents: number;
  pendingVerifications: number;
  verifiedAgents: number;
  suspendedAgents: number;
  registrationsToday: number;
  authenticationsToday: number;
  verificationsToday: number;
  avgResponseTime: number;
  uptime: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ServiceConfig {
  port: number;
  environment: string;
  logLevel: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
  identityOS: {
    url: string;
    apiKey?: string;
    syncInterval: number;
  };
  storage: {
    type: "memory" | "redis" | "database";
    connectionString?: string;
  };
}

// ============================================================================
// Event Bus Types
// ============================================================================

export interface EventBusMessage {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
  source: string;
}

export interface EventSubscription {
  id: string;
  eventTypes: string[];
  callback: (event: IdentityEvent) => void;
  filter?: Record<string, unknown>;
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    storage: HealthCheckResult;
    identityOS: HealthCheckResult;
    dependencies: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: "pass" | "fail" | "warn";
  latency?: number;
  message?: string;
  error?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PickRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

export type AgentStatusHistory = {
  status: AgentStatus;
  changedAt: string;
  changedBy?: string;
  reason?: string;
};

export interface AgentActivity {
  agentId: string;
  type: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}
