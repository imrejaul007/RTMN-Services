/**
 * REZ Central Permissions System - Core Types
 * RBAC + ABAC Hybrid Authorization Engine
 */

// User Types
export type UserType = 'merchant' | 'consumer' | 'staff' | 'system';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'execute';
export type ResourceType =
  | 'order' | 'product' | 'wallet' | 'user' | 'merchant'
  | 'store' | 'inventory' | 'report' | 'webhook' | 'api_key'
  | 'staff' | 'customer' | 'category' | 'coupon' | 'payment'
  | 'shipping' | 'notification' | 'audit_log' | 'settings'
  | '*';

// Permission Check Interface
export interface PermissionCheck {
  // Who
  user_id: string;
  user_type: UserType;
  roles: string[];
  attributes: Record<string, unknown>;

  // What resource
  resource: string;
  resource_id: string;

  // What action
  action: Action;

  // Context
  context: PermissionContext;

  // Decision
  granted: boolean;
  reason: string;
  policy_matched: string;
  evaluated_at: string;
  evaluation_time_ms: number;
}

export interface PermissionContext {
  ip_address?: string;
  device_trusted?: boolean;
  device_id?: string;
  location?: string;
  country?: string;
  time_range?: TimeRange;
  amount_threshold?: number;
  merchant_id?: string;
  store_id?: string;
  session_age?: number;
  request_origin?: 'web' | 'mobile' | 'api' | 'internal';
}

export interface TimeRange {
  start: string;
  end: string;
}

// RBAC Types
export interface Role {
  id: string;
  name: string;
  description: string;
  type: UserType;
  permissions: RolePermission[];
  parent_role?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RolePermission {
  resource: string;
  actions: Action[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'exists';
  value: unknown;
}

// ABAC Types
export interface Attribute {
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
}

export interface AttributePolicy {
  id: string;
  name: string;
  description: string;
  resource: string;
  actions: Action[];
  subject_attributes?: AttributeMatcher[];
  resource_attributes?: AttributeMatcher[];
  context_attributes?: AttributeMatcher[];
  effect: 'permit' | 'deny';
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttributeMatcher {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  value: unknown;
  source?: 'subject' | 'resource' | 'context';
}

// Policy Engine Types
export interface Policy {
  id: string;
  name: string;
  type: 'rbac' | 'abac' | 'hybrid';
  effect: 'permit' | 'deny';
  target: PolicyTarget;
  conditions?: PolicyCondition[];
  obligations?: Obligation[];
  advice?: Advice[];
  priority: number;
  enabled: boolean;
}

export interface PolicyTarget {
  subjects?: AttributeMatcher[];
  resources?: string[];
  actions?: Action[];
  contexts?: AttributeMatcher[];
}

export interface Obligation {
  type: 'log' | 'notify' | 'encrypt' | 'anonymize' | 'restrict';
  parameters: Record<string, unknown>;
}

export interface Advice {
  type: 'warn' | 'info' | 'recommend';
  message: string;
}

export interface PolicyCondition {
  type: 'time' | 'location' | 'device' | 'amount' | 'custom';
  conditions: AttributeMatcher[];
  combinator: 'and' | 'or';
}

// API Key Types
export interface APIKey {
  id: string;
  key_hash: string;
  name: string;
  merchant_id?: string;
  permissions: string[];
  rate_limit?: number;
  expires_at?: string;
  is_active: boolean;
  last_used_at?: string;
  created_at: string;
  created_by: string;
}

// Webhook Types
export interface WebhookPermission {
  id: string;
  webhook_id: string;
  merchant_id: string;
  allowed_events: string[];
  allowed_resources: string[];
  source_ips?: string[];
  is_active: boolean;
  created_at: string;
}

// Audit Types
export interface AuditEntry {
  id: string;
  timestamp: string;
  request_id: string;
  user_id: string;
  user_type: UserType;
  action: Action;
  resource: string;
  resource_id: string;
  decision: 'granted' | 'denied';
  reason: string;
  policies_evaluated: string[];
  matched_policy?: string;
  context: PermissionContext;
  evaluation_time_ms: number;
  ip_address?: string;
  user_agent?: string;
}

// Cache Types
export interface CacheEntry<T> {
  key: string;
  value: T;
  expires_at: number;
  created_at: number;
}

// Permission Result
export interface PermissionResult {
  granted: boolean;
  reason: string;
  matched_policy?: string;
  evaluated_policies: string[];
  evaluation_time_ms: number;
  obligations?: Obligation[];
  advice?: Advice[];
}

// Permission Request
export interface PermissionRequest {
  user_id: string;
  user_type: UserType;
  roles: string[];
  attributes: Record<string, unknown>;
  resource: string;
  resource_id?: string;
  action: Action;
  context?: Partial<PermissionContext>;
}

// Config
export interface PermissionConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  auditEnabled: boolean;
  defaultDeny: boolean;
  policyCombineAlgorithm: 'first-applicable' | 'deny-overrides' | 'permit-overrides' | 'priority-order';
}
