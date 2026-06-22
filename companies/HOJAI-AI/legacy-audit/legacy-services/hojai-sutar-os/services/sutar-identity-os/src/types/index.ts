// ============================================================================
// SUTAR Identity OS - Type Definitions
// ============================================================================

import { z } from "zod";

// Entity Types
export type EntityType = "user" | "merchant" | "agent" | "company";

// Verification Status
export type VerificationStatus = "pending" | "in_progress" | "verified" | "rejected" | "expired" | "suspended";

// Identity Status
export type IdentityStatus = "active" | "inactive" | "locked" | "deleted";

// KYC Level
export type KYCLevel = "basic" | "standard" | "enhanced" | "premium";

// Credential Type
export type CredentialType = "identity" | "address" | "business" | "compliance" | "verification" | "authorization";

// MFA Type
export type MFAType = "sms" | "email" | "totp" | "biometric";

// Document Types
export type DocumentType = "passport" | "national_id" | "drivers_license" | "utility_bill" | "bank_statement" | "business_registration" | "tax_certificate";

// Verification Badge
export type BadgeLevel = "unverified" | "basic" | "standard" | "premium" | "trusted" | "verified_merchant" | "verified_agent";

// Enum values for Zod
const ENTITY_TYPES = ["user", "merchant", "agent", "company"] as const;
const VERIFICATION_STATUSES = ["pending", "in_progress", "verified", "rejected", "expired", "suspended"] as const;
const IDENTITY_STATUSES = ["active", "inactive", "locked", "deleted"] as const;
const KYC_LEVELS = ["basic", "standard", "enhanced", "premium"] as const;
const CREDENTIAL_TYPES = ["identity", "address", "business", "compliance", "verification", "authorization"] as const;
const MFA_TYPES = ["sms", "email", "totp", "biometric"] as const;
const DOCUMENT_TYPES = ["passport", "national_id", "drivers_license", "utility_bill", "bank_statement", "business_registration", "tax_certificate"] as const;
const BADGE_LEVELS = ["unverified", "basic", "standard", "premium", "trusted", "verified_merchant", "verified_agent"] as const;

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

// Address Schema
export const AddressSchema = z.object({
  street: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().min(2).max(3),
});

// Contact Info Schema
export const ContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(5).max(20).optional(),
  alternatePhone: z.string().min(5).max(20).optional(),
});

// Identity Creation Schema
export const CreateIdentitySchema = z.object({
  entityType: z.enum(ENTITY_TYPES),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(20).optional(),
  address: AddressSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  mfaEnabled: z.boolean().optional(),
  mfaTypes: z.array(z.enum(MFA_TYPES)).optional(),
});

// Identity Update Schema
export const UpdateIdentitySchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).max(20).optional(),
  address: AddressSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  mfaEnabled: z.boolean().optional(),
  mfaTypes: z.array(z.enum(MFA_TYPES)).optional(),
  status: z.enum(IDENTITY_STATUSES).optional(),
});

// KYC Submission Schema
export const KYCSumbitSchema = z.object({
  level: z.enum(KYC_LEVELS),
  documents: z.array(z.object({
    type: z.enum(DOCUMENT_TYPES),
    documentNumber: z.string().min(1).max(50),
    issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    fileUrl: z.string().url().optional(),
    fileHash: z.string().optional(),
    verified: z.boolean().optional(),
  })),
  faceMatchRequired: z.boolean().optional(),
  biometricData: z.string().optional(),
  verificationMethod: z.enum(["manual", "automated", "hybrid"]).optional(),
});

// Verification Request Schema
export const VerificationRequestSchema = z.object({
  verificationType: z.enum(["identity", "address", "document", "background", "business"]),
  level: z.enum(KYC_LEVELS).optional(),
  reason: z.string().min(1).max(500).optional(),
  force: z.boolean().optional(),
});

// Credential Creation Schema
export const CreateCredentialSchema = z.object({
  identityId: z.string().uuid(),
  type: z.enum(CREDENTIAL_TYPES),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  issuer: z.string().min(1).max(200),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  claims: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// MFA Setup Schema
export const MFASetupSchema = z.object({
  type: z.enum(MFA_TYPES),
  value: z.string().min(1),
  verified: z.boolean().optional(),
});

// ============================================================================
// Interfaces
// ============================================================================

// Address
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

// Contact Information
export interface ContactInfo {
  email?: string;
  phone?: string;
  alternatePhone?: string;
  verified: boolean;
}

// Document
export interface Document {
  id: string;
  type: DocumentType;
  documentNumber: string;
  issuedDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  fileHash?: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

// Verification Record
export interface VerificationRecord {
  id: string;
  identityId: string;
  type: string;
  status: VerificationStatus;
  level: KYCLevel;
  initiatedAt: string;
  completedAt?: string;
  expiresAt?: string;
  verifiedBy?: string;
  notes?: string;
  checks: VerificationCheck[];
}

// Verification Check
export interface VerificationCheck {
  name: string;
  status: VerificationStatus;
  result?: Record<string, unknown>;
  completedAt?: string;
}

// MFA Configuration
export interface MFAConfig {
  enabled: boolean;
  types: MFAType[];
  verified: boolean;
  lastVerified?: string;
  backupCodes?: string[];
}

// Identity
export interface Identity {
  id: string;
  entityType: EntityType;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth?: string;
  contact: ContactInfo;
  address?: Address;
  status: IdentityStatus;
  verificationStatus: VerificationStatus;
  kycLevel: KYCLevel;
  badge: BadgeLevel;
  documents: Document[];
  credentials: string[];
  mfa: MFAConfig;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  lastLoginAt?: string;
}

// Credential
export interface Credential {
  id: string;
  identityId: string;
  type: CredentialType;
  title: string;
  description?: string;
  issuer: string;
  status: "active" | "revoked" | "expired" | "suspended";
  validFrom?: string;
  validUntil?: string;
  claims: Record<string, unknown>;
  metadata: Record<string, unknown>;
  issuedAt: string;
  updatedAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revocationReason?: string;
}

// KYC Record
export interface KYCRecord {
  id: string;
  identityId: string;
  level: KYCLevel;
  status: VerificationStatus;
  documents: Document[];
  faceMatchVerified: boolean;
  biometricVerified: boolean;
  verificationMethod: "manual" | "automated" | "hybrid";
  submittedAt: string;
  processedAt?: string;
  expiresAt?: string;
  riskScore?: number;
  reviewNotes?: string;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
}

// Trust Engine Response
export interface TrustEngineResponse {
  trustScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  factors: Record<string, unknown>;
  recommendations: string[];
  timestamp: string;
}

// API Response
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Audit Log Entry
export interface AuditLogEntry {
  id: string;
  identityId?: string;
  action: string;
  actor: string;
  actorType: "user" | "system" | "admin";
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}
