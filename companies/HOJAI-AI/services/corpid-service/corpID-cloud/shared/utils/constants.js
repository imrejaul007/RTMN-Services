/**
 * CorpID Cloud - Shared Constants
 * Common constants used across all services
 */

// ============ STATUSES ============

export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  DELETED: 'deleted',
  ARCHIVED: 'archived',
  LOCKED: 'locked',
  EXPIRED: 'expired'
};

export const VERIFICATION_STATUS = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// ============ ROLES ============

export const SYSTEM_ROLES = {
  SUPERADMIN: 'superadmin',
  ORG_OWNER: 'org-owner',
  ORG_ADMIN: 'org-admin',
  DEPT_MANAGER: 'department-manager',
  TEAM_LEAD: 'team-lead',
  MEMBER: 'member',
  VIEWER: 'viewer',
  GUEST: 'guest'
};

export const ROLE_SCOPE = {
  GLOBAL: 'global',
  ORGANIZATION: 'organization',
  DEPARTMENT: 'department',
  TEAM: 'team'
};

export const ROLE_HIERARCHY = [
  SYSTEM_ROLES.SUPERADMIN,
  SYSTEM_ROLES.ORG_OWNER,
  SYSTEM_ROLES.ORG_ADMIN,
  SYSTEM_ROLES.DEPT_MANAGER,
  SYSTEM_ROLES.TEAM_LEAD,
  SYSTEM_ROLES.MEMBER,
  SYSTEM_ROLES.VIEWER,
  SYSTEM_ROLES.GUEST
];

// ============ ORGANIZATION ============

export const ORG_TYPES = {
  COMPANY: 'company',
  NONPROFIT: 'nonprofit',
  GOVERNMENT: 'government',
  INDIVIDUAL: 'individual',
  EDUCATIONAL: 'educational'
};

export const ORG_SIZE = {
  STARTUP: 'startup',           // 1-10
  SMALL: 'small',               // 11-50
  MEDIUM: 'medium',             // 51-200
  LARGE: 'large',               // 201-1000
  ENTERPRISE: 'enterprise'      // 1000+
};

export const ORG_INDUSTRIES = [
  'technology',
  'healthcare',
  'finance',
  'retail',
  'manufacturing',
  'education',
  'hospitality',
  'real_estate',
  'transportation',
  'media',
  'telecommunications',
  'energy',
  'agriculture',
  'construction',
  'legal',
  'consulting',
  'marketing',
  'hr',
  'other'
];

export const PLANS = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

// ============ AUTH ============

export const AUTH_METHODS = {
  EMAIL_PASSWORD: 'email_password',
  PHONE_OTP: 'phone_otp',
  GOOGLE: 'google',
  APPLE: 'apple',
  MICROSOFT: 'microsoft',
  FACEBOOK: 'facebook',
  GITHUB: 'github',
  MAGIC_LINK: 'magic_link',
  PASSKEY: 'passkey',
  BIOMETRIC: 'biometric',
  QR_CODE: 'qr_code'
};

export const MFA_TYPES = {
  TOTP: 'totp',
  SMS: 'sms',
  EMAIL: 'email',
  BACKUP_CODES: 'backup_codes'
};

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  ID: 'id',
  VERIFICATION: 'verification',
  PASSWORD_RESET: 'password_reset',
  INVITATION: 'invitation',
  API_KEY: 'api_key'
};

// ============ DEVICE ============

export const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  TABLET: 'tablet',
  IOT: 'iot',
  TV: 'tv',
  CAR: 'car',
  WATCH: 'watch',
  SPEAKER: 'speaker'
};

export const DEVICE_TRUST_LEVELS = {
  TRUSTED: 'trusted',
  UNVERIFIED: 'unverified',
  BLOCKED: 'blocked'
};

// ============ PERMISSION CATEGORIES ============

export const PERMISSION_CATEGORIES = {
  ORGANIZATION: 'organization',
  DEPARTMENT: 'department',
  TEAM: 'team',
  USER: 'user',
  RESOURCE: 'resource',
  SYSTEM: 'system',
  BILLING: 'billing',
  SECURITY: 'security',
  AUDIT: 'audit'
};

export const PERMISSION_TYPES = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',
  EXECUTE: 'execute'
};

// ============ RESOURCE TYPES ============

export const RESOURCE_TYPES = {
  USER: 'user',
  ORGANIZATION: 'organization',
  DEPARTMENT: 'department',
  TEAM: 'team',
  ROLE: 'role',
  PERMISSION: 'permission',
  POLICY: 'policy',
  API_KEY: 'api_key',
  SESSION: 'session',
  DEVICE: 'device',
  AUDIT_LOG: 'audit_log',
  REPORT: 'report',
  NOTIFICATION: 'notification',
  TEMPLATE: 'template',
  WEBHOOK: 'webhook',
  MERCHANT: 'merchant',
  CONSUMER: 'consumer',
  EMPLOYEE: 'employee',
  AGENT: 'agent',
  KYC: 'kyc'
};

// ============ KYC ============

export const KYC_LEVELS = {
  LEVEL_1: 1,  // Email/phone verified
  LEVEL_2: 2,  // ID document verified
  LEVEL_3: 3   // Full verification + biometric
};

export const KYC_DOCUMENT_TYPES = {
  AADHAAR: 'aadhaar',
  PASSPORT: 'passport',
  DRIVING_LICENSE: 'driving_license',
  VOTER_ID: 'voter_id',
  PAN: 'pan',
  GST_CERTIFICATE: 'gst_certificate',
  BUSINESS_REGISTRATION: 'business_registration',
  UTILITY_BILL: 'utility_bill',
  BANK_STATEMENT: 'bank_statement'
};

export const AML_STATUS = {
  CLEAR: 'clear',
  REVIEW: 'review',
  FLAGGED: 'flagged',
  BLOCKED: 'blocked'
};

// ============ CONSENT ============

export const CONSENT_TYPES = {
  PRIVACY: 'privacy',
  MARKETING: 'marketing',
  COOKIES: 'cookies',
  DATA_PROCESSING: 'data_processing',
  AI_USAGE: 'ai_usage',
  LOCATION: 'location',
  BIOMETRIC: 'biometric'
};

export const LEGAL_BASIS = {
  CONSENT: 'consent',
  CONTRACT: 'contract',
  LEGAL_OBLIGATION: 'legal_obligation',
  LEGITIMATE_INTEREST: 'legitimate_interest',
  VITAL_INTEREST: 'vital_interest',
  PUBLIC_TASK: 'public_task'
};

// ============ TRUST ============

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const TRUST_GRADES = {
  VERY_LOW: 'very_low',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

// ============ AUDIT ============

export const AUDIT_ACTIONS = {
  // Auth
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  PASSWORD_CHANGED: 'auth.password_changed',
  MFA_ENABLED: 'auth.mfa_enabled',
  MFA_DISABLED: 'auth.mfa_disabled',

  // User
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_SUSPENDED: 'user.suspended',

  // Organization
  ORG_CREATED: 'organization.created',
  ORG_UPDATED: 'organization.updated',
  ORG_DELETED: 'organization.deleted',

  // Role/Permission
  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',
  PERMISSION_GRANTED: 'permission.granted',
  PERMISSION_REVOKED: 'permission.revoked',

  // API Key
  API_KEY_CREATED: 'api_key.created',
  API_KEY_REVOKED: 'api_key.revoked',
  API_KEY_ROTATED: 'api_key.rotated'
};

export const AUDIT_CATEGORIES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  USER_MANAGEMENT: 'user_management',
  ORG_MANAGEMENT: 'org_management',
  SECURITY: 'security',
  SYSTEM: 'system',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification'
};

// ============ PAGINATION ============

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// ============ RATE LIMITS ============

export const RATE_LIMITS = {
  AUTH_WINDOW_MS: 15 * 60 * 1000,      // 15 minutes
  AUTH_MAX: 5,
  API_WINDOW_MS: 60 * 1000,             // 1 minute
  API_MAX: 100,
  STRICT_WINDOW_MS: 60 * 1000,          // 1 minute
  STRICT_MAX: 20
};

// ============ TIME ============

export const TOKEN_EXPIRY = {
  ACCESS: '1h',
  REFRESH: '7d',
  VERIFICATION: '24h',
  PASSWORD_RESET: '1h',
  INVITATION: '7d',
  API_KEY: '365d'
};

export const SESSION_TIMEOUT = {
  DEFAULT: 24 * 60 * 60 * 1000,         // 24 hours
  REMEMBER_ME: 30 * 24 * 60 * 60 * 1000 // 30 days
};

export default {
  STATUS,
  VERIFICATION_STATUS,
  SYSTEM_ROLES,
  ROLE_SCOPE,
  ROLE_HIERARCHY,
  ORG_TYPES,
  ORG_SIZE,
  ORG_INDUSTRIES,
  PLANS,
  AUTH_METHODS,
  MFA_TYPES,
  TOKEN_TYPES,
  DEVICE_TYPES,
  DEVICE_TRUST_LEVELS,
  PERMISSION_CATEGORIES,
  PERMISSION_TYPES,
  RESOURCE_TYPES,
  KYC_LEVELS,
  KYC_DOCUMENT_TYPES,
  AML_STATUS,
  CONSENT_TYPES,
  LEGAL_BASIS,
  RISK_LEVELS,
  TRUST_GRADES,
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  RATE_LIMITS,
  TOKEN_EXPIRY,
  SESSION_TIMEOUT
};
