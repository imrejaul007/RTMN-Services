/**
 * SADA - Risk Models
 *
 * Risk assessment, fraud detection, and anomaly tracking
 */

import mongoose, { Schema, model } from 'mongoose';

// Risk Assessment Schema
const riskAssessmentSchema = new Schema({
  assessmentId: { type: String, required: true, unique: true, index: true },
  entityId: { type: String, required: true, index: true },
  entityType: {
    type: String,
    enum: ['HUMAN', 'AGENT', 'BUSINESS', 'PRODUCT', 'TRANSACTION'],
    required: true,
  },

  // Assessment details
  assessmentType: {
    type: String,
    enum: ['INITIAL', 'PERIODIC', 'TRIGGERED', 'TRANSACTIONAL'],
    required: true,
  },

  // Risk score (0-100, higher = riskier)
  riskScore: { type: Number, default: 50, min: 0, max: 100 },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },

  // Risk dimensions
  dimensions: {
    financial: { type: Number, default: 50 },      // Financial risk
    operational: { type: Number, default: 50 },    // Operational risk
    compliance: { type: Number, default: 50 },     // Compliance risk
    reputational: { type: Number, default: 50 },   // Reputational risk
    technical: { type: Number, default: 50 },      // Technical risk
  },

  // Risk factors
  factors: [{
    category: String,            // 'behavioral', 'financial', 'historical', 'contextual'
    name: String,
    description: String,
    contribution: Number,        // How much this factor contributes to risk
    weight: Number,              // Importance of this factor
    value: mongoose.Schema.Types.Mixed,  // Actual value
    threshold: Number,           // Threshold that was crossed
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    indicators: [String],        // Specific indicators
  }],

  // ML model info
  model: {
    modelId: String,
    modelType: String,           // 'RANDOM_FOREST', 'NEURAL_NETWORK', 'RULE_BASED'
    version: String,
    confidence: Number,          // Model confidence in this assessment
  },

  // Recommendations
  recommendations: [{
    action: String,
    priority: Number,
    description: String,
    estimatedImpact: String,
  }],

  // Controls in place
  controls: [{
    controlId: String,
    controlName: String,
    type: String,
    effectiveness: Number,       // 0-1
    lastTested: Date,
  }],

  // Historical comparison
  historical: {
    previousScore: Number,
    scoreChange: Number,
    trend: { type: String, enum: ['IMPROVING', 'STABLE', 'DECLINING', 'VOLATILE'] },
    daysSinceLastAssessment: Number,
  },

  // Context
  context: {
    purpose: String,
    trigger: String,
    dataSources: [String],
    assessorId: String,
  },

  // Next assessment
  nextAssessmentDue: Date,

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'SUPERSEDED'],
    default: 'ACTIVE',
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
riskAssessmentSchema.index({ entityId: 1, createdAt: -1 });
riskAssessmentSchema.index({ riskScore: -1 });
riskAssessmentSchema.index({ riskLevel: 1 });
riskAssessmentSchema.index({ nextAssessmentDue: 1 });

export const RiskAssessment = model('RiskAssessment', riskAssessmentSchema);

// Fraud Alert Schema
const fraudAlertSchema = new Schema({
  alertId: { type: String, required: true, unique: true, index: true },
  entityId: { type: String, required: true, index: true },
  entityType: String,

  // Alert details
  alertType: {
    type: String,
    enum: [
      'UNUSUAL_PATTERN',      // Behavioral anomaly
      'VELOCITY_EXCEEDED',    // Too many transactions
      'AMOUNT_ANOMALY',       // Unusual amount
      'GEOGRAPHIC_ANOMALY',   // Unusual location
      'DEVICE_ANOMALY',       // New device
      'TIME_ANOMALY',         // Unusual time
      'NETWORK_RISK',         // Connected to risky entities
      'DOCUMENT_ANOMALY',     // Document issues
      'ENTITY_ANOMALY',       // Entity changes
    ],
    required: true,
  },

  // Severity
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
  },

  // Detection
  detection: {
    modelId: String,
    modelType: String,
    confidence: Number,
    signals: [{
      signalType: String,
      value: mongoose.Schema.Types.Mixed,
      threshold: Number,
      weight: Number,
    }],
  },

  // Related entities/transactions
  related: {
    transactionIds: [String],
    entityIds: [String],
    alertIds: [String],         // Related alerts
  },

  // Investigation
  investigation: {
    status: {
      type: String,
      enum: ['OPEN', 'INVESTIGATING', 'ESCALATED', 'RESOLVED', 'FALSE_POSITIVE'],
      default: 'OPEN',
    },
    assignedTo: String,
    assignedAt: Date,
    priority: Number,
    notes: [{
      noteId: String,
      author: String,
      content: String,
      createdAt: { type: Date, default: Date.now },
    }],
    resolution: {
      action: String,
      resolvedBy: String,
      resolvedAt: Date,
      comment: String,
    },
  },

  // Actions taken
  actions: [{
    actionType: String,
    timestamp: { type: Date, default: Date.now },
    actor: String,
    result: String,
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Indexes
fraudAlertSchema.index({ entityId: 1, createdAt: -1 });
fraudAlertSchema.index({ 'investigation.status': 1, severity: 1 });
fraudAlertSchema.index({ alertType: 1, severity: 1 });

export const FraudAlert = model('FraudAlert', fraudAlertSchema);

// Risk Limit Schema
const riskLimitSchema = new Schema({
  limitId: { type: String, required: true, unique: true, index: true },
  entityId: { type: String, required: true, index: true },
  entityType: String,

  // Limit type
  limitType: {
    type: String,
    enum: [
      'TRANSACTION_AMOUNT',     // Max per transaction
      'DAILY_VOLUME',           // Max daily volume
      'MONTHLY_VOLUME',         // Max monthly volume
      'TRANSACTION_COUNT',      // Max transactions
      'EXPOSURE',               // Max exposure
      'CREDIT',                 // Credit limit
      'WITHDRAWAL',             // Withdrawal limit
    ],
    required: true,
  },

  // Limits
  limits: {
    soft: Number,              // Warning threshold
    hard: Number,              // Hard block
    current: Number,           // Current usage
    remaining: Number,         // Remaining capacity
  },

  // Time window
  window: {
    type: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'LIFETIME'] },
    start: String,             // Cron expression
    resetAt: Date,
  },

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'EXCEEDED', 'CANCELLED'],
    default: 'ACTIVE',
  },

  // Override
  override: {
    allowed: Boolean,
    requiresApproval: Boolean,
    approvers: [String],
    maxOverrideAmount: Number,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

riskLimitSchema.index({ entityId: 1, limitType: 1 }, { unique: true });
riskLimitSchema.index({ 'status': 1, 'window.resetAt': 1 });

export const RiskLimit = model('RiskLimit', riskLimitSchema);

// Anomaly Detection Model
const anomalyModelSchema = new Schema({
  modelId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  description: String,

  // Model type
  type: {
    type: String,
    enum: ['ISOLATION_FOREST', 'LOF', 'AUTOENCODER', 'ONE_CLASS_SVM', 'ENSEMBLE', 'RULE_BASED'],
    required: true,
  },

  // Configuration
  config: {
    threshold: Number,
    contamination: Number,      // Expected % of anomalies
    features: [String],
    hyperparameters: mongoose.Schema.Types.Mixed,
  },

  // Training
  training: {
    status: { type: String, enum: ['TRAINING', 'READY', 'DEPRECATED'] },
    trainedAt: Date,
    trainingDataSize: Number,
    featuresUsed: [String],
    performance: {
      precision: Number,
      recall: Number,
      f1Score: Number,
      auc: Number,
    },
  },

  // Versioning
  version: { type: Number, default: 1 },
  parentModelId: String,

  // Status
  status: {
    type: String,
    enum: ['ACTIVE', 'STAGING', 'DEPRECATED'],
    default: 'STAGING',
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

anomalyModelSchema.index({ type: 1, 'training.status': 1 });

export const AnomalyModel = model('AnomalyModel', anomalyModelSchema);

export default {
  RiskAssessment,
  FraudAlert,
  RiskLimit,
  AnomalyModel,
};