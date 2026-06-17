import mongoose, { Document, Schema } from 'mongoose';
import {
  DecisionType,
  DecisionOutcome,
  RiskLevel,
  CustomerTier,
  ApprovalRoute,
  PriorityLevel,
  DecisionResult,
  AuditEntry
} from '../types';

export interface IDecision extends Document {
  // Core identification
  requestId: string;
  tenantId: string;
  type: DecisionType;
  outcome: DecisionOutcome;

  // Decision details
  decision: 'approve' | 'deny' | 'partial' | 'escalate';
  amount?: number; // Approved amount in cents
  reason: string;

  // Customer information
  customerId: string;
  customerEmail?: string;
  customerTier: CustomerTier;

  // Transaction information
  transactionId?: string;
  transactionAmount?: number;

  // Risk assessment
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: Array<{
    factor: string;
    contribution: number;
    reason: string;
  }>;
  riskFlags: string[];

  // Value assessment
  valueScore: number;
  valueTier: CustomerTier;

  // Policy evaluations
  policyEvaluations: Array<{
    policyId: string;
    policyName: string;
    applicable: boolean;
    outcome: 'allow' | 'deny' | 'conditional' | 'escalate';
    reasoning: string;
  }>;

  // Approval routing
  approvalRequired: boolean;
  approvalRoute: ApprovalRoute;
  approvalLevel: number;
  approvalReason?: string;

  // Explanation
  explanation: {
    summary: string;
    reasoning: string[];
    recommendations?: string[];
  };

  // Alternatives considered
  alternatives: Array<{
    type: DecisionType;
    description: string;
    amount?: number;
    feasibility: 'high' | 'medium' | 'low';
  }>;

  // Processing metadata
  processingTime: number;
  priority: PriorityLevel;
  context: {
    ipAddress?: string;
    userAgent?: string;
    channel?: string;
    agentId?: string;
  };

  // Metadata
  metadata?: Record<string, unknown>;

  // Audit
  auditLog: AuditEntry[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const DecisionSchema = new Schema<IDecision>(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: ['refund', 'cancel', 'discount', 'escalate', 'policy_exception'],
      index: true
    },
    outcome: {
      type: String,
      required: true,
      enum: ['approved', 'denied', 'escalated', 'partial', 'requires_review'],
      index: true
    },
    decision: {
      type: String,
      required: true,
      enum: ['approve', 'deny', 'partial', 'escalate']
    },
    amount: {
      type: Number
    },
    reason: {
      type: String,
      required: true
    },
    customerId: {
      type: String,
      required: true,
      index: true
    },
    customerEmail: {
      type: String
    },
    customerTier: {
      type: String,
      required: true,
      enum: ['standard', 'silver', 'gold', 'platinum', 'vip'],
      default: 'standard'
    },
    transactionId: {
      type: String,
      index: true
    },
    transactionAmount: {
      type: Number
    },
    riskScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    riskLevel: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical']
    },
    riskFactors: [
      {
        factor: String,
        contribution: Number,
        reason: String
      }
    ],
    riskFlags: [String],
    valueScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    valueTier: {
      type: String,
      required: true,
      enum: ['standard', 'silver', 'gold', 'platinum', 'vip']
    },
    policyEvaluations: [
      {
        policyId: String,
        policyName: String,
        applicable: Boolean,
        outcome: String,
        reasoning: String
      }
    ],
    approvalRequired: {
      type: Boolean,
      default: false
    },
    approvalRoute: {
      type: String,
      enum: ['auto', 'supervisor', 'manager', 'director', 'vp', 'executive'],
      default: 'auto'
    },
    approvalLevel: {
      type: Number,
      default: 0
    },
    approvalReason: String,
    explanation: {
      summary: { type: String, required: true },
      reasoning: [String],
      recommendations: [String]
    },
    alternatives: [
      {
        type: String,
        description: String,
        amount: Number,
        feasibility: String
      }
    ],
    processingTime: {
      type: Number,
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent', 'critical'],
      default: 'normal'
    },
    context: {
      ipAddress: String,
      userAgent: String,
      channel: String,
      agentId: String
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    auditLog: [
      {
        id: String,
        action: String,
        previousState: Schema.Types.Mixed,
        newState: Schema.Types.Mixed,
        actor: {
          id: String,
          type: String,
          name: String
        },
        reason: String,
        timestamp: Date
      }
    ],
    expiresAt: Date
  },
  {
    timestamps: true,
    collection: 'decisions'
  }
);

// Indexes for common queries
DecisionSchema.index({ tenantId: 1, createdAt: -1 });
DecisionSchema.index({ tenantId: 1, customerId: 1, createdAt: -1 });
DecisionSchema.index({ tenantId: 1, type: 1, outcome: 1, createdAt: -1 });
DecisionSchema.index({ tenantId: 1, 'riskLevel': 1, createdAt: -1 });
DecisionSchema.index({ approvalRequired: 1, approvalRoute: 1, createdAt: -1 });

// Compound index for analytics
DecisionSchema.index({ tenantId: 1, createdAt: 1, type: 1, outcome: 1 });

// TTL index for automatic expiration
DecisionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static methods
DecisionSchema.statics.findByTenant = function(
  tenantId: string,
  page: number = 1,
  limit: number = 20
) {
  return this.find({ tenantId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

DecisionSchema.statics.findByCustomer = function(
  tenantId: string,
  customerId: string,
  page: number = 1,
  limit: number = 20
) {
  return this.find({ tenantId, customerId })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

DecisionSchema.statics.findPendingApprovals = function(
  tenantId: string,
  route?: ApprovalRoute
) {
  const query: Record<string, unknown> = {
    tenantId,
    approvalRequired: true,
    outcome: { $in: ['escalated', 'requires_review'] }
  };
  if (route) {
    query.approvalRoute = route;
  }
  return this.find(query).sort({ priority: -1, createdAt: 1 });
};

DecisionSchema.statics.getStats = async function(
  tenantId: string,
  startDate: Date,
  endDate: Date
) {
  return this.aggregate([
    {
      $match: {
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalDecisions: { $sum: 1 },
        approved: {
          $sum: { $cond: [{ $eq: ['$outcome', 'approved'] }, 1, 0] }
        },
        denied: {
          $sum: { $cond: [{ $eq: ['$outcome', 'denied'] }, 1, 0] }
        },
        escalated: {
          $sum: { $cond: [{ $eq: ['$outcome', 'escalated'] }, 1, 0] }
        },
        partial: {
          $sum: { $cond: [{ $eq: ['$outcome', 'partial'] }, 1, 0] }
        },
        avgProcessingTime: { $avg: '$processingTime' },
        totalAmount: { $sum: { $ifNull: ['$amount', 0] } }
      }
    }
  ]);
};

export const Decision = mongoose.model<IDecision>('Decision', DecisionSchema);
