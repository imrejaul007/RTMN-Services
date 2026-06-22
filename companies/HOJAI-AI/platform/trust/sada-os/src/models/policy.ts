/**
 * SADA - Policy & Governance Models
 *
 * Policy definitions, compliance rules, and governance controls
 */

import mongoose, { Schema, model } from 'mongoose';

// Policy Schema
const policySchema = new Schema({
  policyId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,

  // Policy type
  type: {
    type: String,
    enum: [
      'ACCESS_CONTROL',      // Who can access what
      'TRANSACTION_LIMIT',   // Limits on transactions
      'COMPLIANCE',          // Regulatory compliance
      'DATA_PRIVACY',        // Data handling rules
      'RISK_THRESHOLD',      // Risk-based controls
      'VERIFICATION_REQUIRED', // KYC/KYB requirements
      'AUDIT_REQUIRED',       // Audit trail requirements
      'ESCALATION',          // When to escalate
      'CUSTOM'               // Custom policy
    ],
    required: true,
  },

  // Policy scope
  scope: {
    level: {
      type: String,
      enum: ['GLOBAL', 'ORGANIZATION', 'TEAM', 'PRODUCT', 'ENTITY'],
      required: true,
    },
    organizationId: String,
    productId: String,
    entityType: String,
  },

  // Rules
  rules: [{
    ruleId: { type: String, required: true },
    name: String,
    type: { type: String, enum: ['ALLOW', 'DENY', 'CONDITIONAL', 'REVIEW'], required: true },
    priority: { type: Number, default: 0 },  // Higher = evaluated first

    // Conditions
    conditions: {
      // Entity conditions
      entityTypes: [String],
      trustScoreMin: Number,
      trustScoreMax: Number,
      verificationLevelMin: Number,
      riskLevelMax: String,

      // Transaction conditions
      amountMin: Number,
      amountMax: Number,
      currency: [String],
      transactionTypes: [String],

      // Time conditions
      timeWindows: [{
        days: [Number],      // 0-6, Sunday-Saturday
        startHour: Number,
        endHour: Number,
        timezone: String,
      }],

      // Geographic conditions
      countries: [String],
      regions: [String],

      // Custom conditions (JSON logic)
      customConditions: mongoose.Schema.Types.Mixed,
    },

    // Actions
    action: {
      type: String,
      enum: ['ALLOW', 'DENY', 'REVIEW', 'ESCALATE', 'LOG', 'NOTIFY', 'CHALLENGE'],
      required: true,
    },
    actionData: mongoose.Schema.Types.Mixed,  // Additional data for action

    // Effects
    effects: {
      delay: Number,         // Delay in milliseconds
      additionalChecks: [String],
      requiresApproval: Boolean,
      approverRoles: [String],
    },
  }],

  // Policy status
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'SUSPENDED', 'DEPRECATED'],
    default: 'DRAFT',
  },

  // Versioning
  version: { type: Number, default: 1 },
  parentPolicyId: String,
  changeReason: String,

  // Metadata
  metadata: {
    createdBy: String,
    approvedBy: String,
    approvedAt: Date,
    tags: [String],
    category: String,
    complianceFramework: [String],  // SOC2, GDPR, etc.
  },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  activatedAt: Date,
});

// Indexes
policySchema.index({ 'scope.level': 1, 'scope.organizationId': 1 });
policySchema.index({ type: 1, status: 1 });
policySchema.index({ 'metadata.tags': 1 });
policySchema.index({ 'metadata.complianceFramework': 1 });

export const Policy = model('Policy', policySchema);

// Policy Violation
const policyViolationSchema = new Schema({
  violationId: { type: String, required: true, unique: true, index: true },
  policyId: { type: String, required: true, index: true },
  policyName: String,

  // Who violated
  entityId: { type: String, required: true, index: true },
  entityType: String,

  // What triggered violation
  trigger: {
    action: String,
    transactionId: String,
    amount: Number,
    context: mongoose.Schema.Types.Mixed,
  },

  // Violation details
  details: {
    ruleId: String,
    ruleName: String,
    violatedCondition: String,
    actualValue: mongoose.Schema.Types.Mixed,
    expectedValue: mongoose.Schema.Types.Mixed,
  },

  // Resolution
  resolution: {
    status: {
      type: String,
      enum: ['PENDING', 'REVIEWED', 'APPROVED', 'REJECTED', 'ESCALATED'],
      default: 'PENDING',
    },
    reviewedBy: String,
    reviewedAt: Date,
    comment: String,
    exceptionGranted: Boolean,
    exceptionReason: String,
  },

  // Impact
  impact: {
    transactionBlocked: Boolean,
    penaltyApplied: Boolean,
    notificationSent: Boolean,
  },

  createdAt: { type: Date, default: Date.now },
});

policyViolationSchema.index({ policyId: 1, createdAt: -1 });
policyViolationSchema.index({ entityId: 1, createdAt: -1 });
policyViolationSchema.index({ 'resolution.status': 1 });

export const PolicyViolation = model('PolicyViolation', policyViolationSchema);

// Compliance Check
const complianceCheckSchema = new Schema({
  checkId: { type: String, required: true, unique: true, index: true },
  entityId: { type: String, required: true, index: true },
  entityType: String,

  // Check details
  checkType: {
    type: String,
    enum: ['KYC', 'KYB', 'AML', 'SANCTIONS', 'PEP', 'ADVERSE_MEDIA', 'CUSTOM'],
    required: true,
  },
  checkProvider: String,  // Internal or external provider

  // Results
  result: {
    status: {
      type: String,
      enum: ['PASS', 'FAIL', 'PENDING', 'REVIEW', 'ERROR'],
      required: true,
    },
    score: Number,
    riskLevel: String,
    findings: [{
      type: String,
      severity: String,
      description: String,
      data: mongoose.Schema.Types.Mixed,
    }],
 },

  // Documentation
  documentation: {
    documentsVerified: [String],
    verificationDate: Date,
    verificationMethod: String,
    certExpiry: Date,
  },

  // Next check
  nextCheckDue: Date,
  checkFrequency: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

complianceCheckSchema.index({ entityId: 1, checkType: 1 });
complianceCheckSchema.index({ nextCheckDue: 1 });

export const ComplianceCheck = model('ComplianceCheck', complianceCheckSchema);

// Audit Log Entry
const auditLogSchema = new Schema({
  auditId: { type: String, required: true, unique: true, index: true },
  entityId: String,
  entityType: String,

  // Action details
  action: {
    type: {
      type: String,
      enum: [
        'CREATE', 'UPDATE', 'DELETE', 'ACCESS',
        'TRANSACTION', 'VERIFICATION', 'POLICY_CHANGE',
        'TRUST_CHANGE', 'RISK_ASSESSMENT', 'COMPLIANCE_CHECK'
      ],
      required: true,
    },
    resource: String,
    resourceId: String,
    previousValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
  },

  // Actor
  actor: {
    type: String,  // 'SYSTEM', 'USER', 'ADMIN', 'SERVICE'
    id: String,
    name: String,
    role: String,
  },

  // Context
  context: {
    ip: String,
    userAgent: String,
    requestId: String,
    sessionId: String,
    source: String,
  },

  // Result
  result: {
    status: { type: String, enum: ['SUCCESS', 'FAILURE', 'PARTIAL'] },
    error: String,
    duration: Number,  // milliseconds
  },

  // Compliance
  compliance: {
    policyId: String,
    policyName: String,
    compliant: Boolean,
    waived: Boolean,
    waiverReason: String,
  },

  createdAt: { type: Date, default: Date.now },
});

// Compound index for common queries
auditLogSchema.index({ entityId: 1, createdAt: -1 });
auditLogSchema.index({ 'actor.id': 1, createdAt: -1 });
auditLogSchema.index({ 'action.type': 1, createdAt: -1 });
auditLogSchema.index({ 'compliance.policyId': 1 });

// TTL index - auto-delete after 2 years
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

export const AuditLog = model('AuditLog', auditLogSchema);

export default {
  Policy,
  PolicyViolation,
  ComplianceCheck,
  AuditLog,
};