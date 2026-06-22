/**
 * SADA - Verification Models
 *
 * KYC, KYB, Agent verification, and identity validation
 */

import mongoose, { Schema, model } from 'mongoose';

// Verification Request Schema
const verificationSchema = new Schema({
  verificationId: { type: String, required: true, unique: true, index: true },
  entityId: { type: String, required: true, index: true },
  entityType: {
    type: String,
    enum: ['HUMAN', 'AGENT', 'BUSINESS', 'PRODUCT'],
    required: true,
  },

  // Verification type
  type: {
    type: String,
    enum: [
      'KYC',                   // Know Your Customer (individuals)
      'KYB',                   // Know Your Business
      'AGENT_VERIFICATION',    // AI agent verification
      'PRODUCT_VERIFICATION', // Product/service verification
      'VENDOR_VERIFICATION',   // Vendor/supplier verification
      'PARTNER_VERIFICATION',  // Business partner verification
    ],
    required: true,
  },

  // Verification level
  level: {
    type: Number,
    enum: [1, 2, 3],
    default: 1,
  },

  // Status
  status: {
    type: String,
    enum: [
      'INITIATED',            // Just started
      'DOCUMENTS_PENDING', // Waiting for documents
      'UNDER_REVIEW',         // Being reviewed
      'PENDING_APPROVAL',     // Awaiting approval
      'VERIFIED',             // Successfully verified
      'REJECTED',             // Verification failed
      'EXPIRED',              // Verification expired
      'SUSPENDED',            // Verification suspended
    ],
    default: 'INITIATED',
  },

  // Required checks
  checks: [{
    checkId: String,
    checkType: {
      type: String,
      enum: [
        'IDENTITY_DOCUMENT', // Government ID
        'ADDRESS_VERIFICATION', // Proof of address
        'SANCTIONS_SCREENING',  // Sanctions list check
        'PEP_SCREENING', // Politically Exposed Person
        'ADVERSE_MEDIA',        // Negative news check
        'DOCUMENT_AUTHENTICATION', // Document authenticity
        'LIVENESS_CHECK',       // Real person check
        'EMPLOYMENT_VERIFICATION', // Employment status
        'BUSINESS_REGISTRATION', // Company registration
        'OWNERSHIP_VERIFICATION', // Beneficial ownership
        'FINANCIAL_STATEMENTS', // Business financials
        'LICENSE_VERIFICATION', // Professional licenses
      ],
    },
    status: {
      type: String,
      enum: ['PENDING', 'PASSED', 'FAILED', 'SKIPPED', 'REVIEW'],
    },
    provider: String,           // Provider used for check
    result: mongoose.Schema.Types.Mixed,
    completedAt: Date,
    retryCount: { type: Number, default: 0 },
  }],

  // Documents submitted
  documents: [{
    documentId: String,
    type: {
      type: String,
      enum: [
        'PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID',
        'UTILITY_BILL', 'BANK_STATEMENT', 'TAX_RETURN',
        'BUSINESS_REGISTRATION', 'INCORPORATION_DOCS',
        'FINANCIAL_STATEMENT', 'LICENSE', 'CERTIFICATE',
 'SELFIE', 'VIDEO'
      ],
    },
    status: {
      type: String,
      enum: ['UPLOADED', 'VERIFIED', 'REJECTED', 'EXPIRED'],
    },
    url: String,
    hash: String,              // For integrity verification
    verifiedAt: Date,
    rejectionReason: String,
  }],

  // Verification provider
  provider: {
    primary: String,          // Primary provider
    secondary: String,        // Backup provider
    internal: Boolean,        // Internal verification
  },

  // Results
  result: {
    score: Number,            // Overall verification score
    riskLevel: String,
    findings: [{
      type: String,
      severity: String,
      description: String,
 }],
    overallDecision: {
      type: String,
      enum: ['APPROVED', 'REJECTED', 'REVIEW_REQUIRED', 'MANUAL_REVIEW'],
    },
    decisionMaker: String, // 'SYSTEM', 'ADMIN', 'MANUAL'
    decisionReason: String,
  },

  // Review/Approval
  review: {
    assignedTo: String,
    assignedAt: Date,
    decision: String,
    decisionAt: Date,
    notes: String,
  },

  // Expiration
  expiresAt: Date,
  renewalDue: Date,

  // Metadata
  metadata: {
    initiatedBy: String,
    initiatedAt: Date,
    completedAt: Date,
    duration: Number,         // Time taken in ms
    attempts: Number,
    ip: String,
    userAgent: String,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
verificationSchema.index({ entityId: 1, type: 1 });
verificationSchema.index({ status: 1, 'checks.checkType': 1 });
verificationSchema.index({ expiresAt: 1 });
verificationSchema.index({ 'result.overallDecision': 1 });

export const Verification = model('Verification', verificationSchema);

// Verification Provider Schema
const verificationProviderSchema = new Schema({
  providerId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },

  // Provider type
  type: {
    type: String,
    enum: [
      'IDENTITY_VERIFICATION',  // Jumio, Onfido, etc.
      'DOCUMENT_VERIFICATION',   // Document analysis
      'SANCTIONS_SCREENING',     // AML/compliance screening
      'BACKGROUND_CHECK',        // Employment, criminal, etc.
      'FINANCIAL_CHECK',         // Credit, financials
      'BUSINESS_VERIFICATION',   // Company verification
      'REPUTATION_CHECK',        // Media, reviews
    ],
 required: true,
  },

  // Configuration
  config: {
    apiKey: String,
    apiSecret: String,
    webhookUrl: String,
    callbackUrl: String,
    enabledChecks: [String],
    customSettings: mongoose.Schema.Types.Mixed,
  },

  // Capabilities
  capabilities: [{
    checkType: String,
    supportedDocuments: [String],
    countries: [String],
    maxFileSize: Number,
    avgProcessingTime: Number,  // milliseconds
  }],

  // Performance
  performance: {
    accuracy: Number,
    avgLatency: Number,
    successRate: Number,
    falsePositiveRate: Number,
  },

  // Cost
  cost: {
    perCheck: Number,
    currency: String,
    volumeDiscount: mongoose.Schema.Types.Mixed,
  },

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE', 'DEGRADED', 'SUSPENDED'],
    default: 'ACTIVE',
  },

  // Health
  health: {
    lastCheck: Date,
    uptime: Number,
    avgResponseTime: Number,
    errorRate: Number,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

verificationProviderSchema.index({ type: 1, 'status': 1 });

export const VerificationProvider = model('VerificationProvider', verificationProviderSchema);

// Verification Audit Trail
const verificationAuditSchema = new Schema({
  auditId: { type: String, required: true, unique: true, index: true },
  verificationId: { type: String, required: true, index: true },
  entityId: String,

  // Event
  event: {
    type: String,
    enum: [
      'INITIATED', 'DOCUMENT_UPLOADED', 'CHECK_STARTED',
      'CHECK_COMPLETED', 'CHECK_FAILED', 'DOCUMENT_REJECTED',
      'REVIEW_ASSIGNED', 'REVIEW_DECISION', 'VERIFICATION_APPROVED',
      'VERIFICATION_REJECTED', 'VERIFICATION_EXPIRED', 'RENEWAL_INITIATED'
    ],
    required: true,
  },

  // Details
  details: {
    checkType: String,
    provider: String,
    result: mongoose.Schema.Types.Mixed,
    actor: String,
    reason: String,
  },

  // Previous/New state
  state: {
    previousStatus: String,
    newStatus: String,
    previousLevel: Number,
    newLevel: Number,
  },

  createdAt: { type: Date, default: Date.now },
});

verificationAuditSchema.index({ verificationId: 1, createdAt: -1 });

export const VerificationAudit = model('VerificationAudit', verificationAuditSchema);

export default {
  Verification,
  VerificationProvider,
  VerificationAudit,
};