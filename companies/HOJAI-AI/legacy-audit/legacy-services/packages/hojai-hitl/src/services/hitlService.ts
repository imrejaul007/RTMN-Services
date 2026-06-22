import mongoose, { Schema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { ReviewType, ReviewStatus, ReviewPriority, ReviewRequest, EscalationRule, ConfidenceThreshold } from '../types/index.js';

const ReviewRequestSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: Object.values(ReviewType), required: true },
  status: { type: String, enum: Object.values(ReviewStatus), default: ReviewStatus.PENDING },
  priority: { type: String, enum: Object.values(ReviewPriority), default: ReviewPriority.MEDIUM },
  title: { type: String, required: true },
  description: String,
  context: { type: Map, of: Schema.Types.Mixed },
  originalAction: {
    type: String,
    params: { type: Map, of: Schema.Types.Mixed },
    result: Schema.Types.Mixed,
    confidence: Number
  },
  aiRecommendation: {
    action: String,
    confidence: Number,
    reasoning: String
  },
  assignedTo: String,
  reviewerRole: String,
  escalatedTo: String,
  slaDeadline: Date,
  slaHours: { type: Number, default: 24 },
  decision: String,
  decisionNote: String,
  decidedBy: String,
  decidedAt: Date,
  overriddenBy: String,
  overrideReason: String
}, { timestamps: true });

ReviewRequestSchema.index({ tenantId: 1, status: 1, priority: -1 });
ReviewRequestSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });

const EscalationRuleSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  conditions: [{
    field: String,
    operator: String,
    value: Schema.Types.Mixed
  }],
  action: { type: String, enum: ['escalate', 'block', 'require_review', 'notify'], required: true },
  escalateTo: String,
  reason: String,
  priorityBoost: Number,
  active: { type: Boolean, default: true }
}, { timestamps: true });

const ConfidenceThresholdSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  category: String,
  autoApproveBelow: { type: Number, default: 0.3 },
  reviewRequired: {
    min: { type: Number, default: 0.3 },
    max: { type: Number, default: 0.7 }
  },
  autoApproveAbove: { type: Number, default: 0.7 },
  canOverride: { type: Boolean, default: true },
  overrideRoles: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

const ReviewAuditSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  reviewId: { type: String, required: true },
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  role: String,
  details: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true });

export const ReviewRequestModel = mongoose.model('ReviewRequest', ReviewRequestSchema);
export const EscalationRuleModel = mongoose.model('EscalationRule', EscalationRuleSchema);
export const ConfidenceThresholdModel = mongoose.model('ConfidenceThreshold', ConfidenceThresholdSchema);
export const ReviewAuditModel = mongoose.model('ReviewAudit', ReviewAuditSchema);

export class HITLService {
  /**
   * Check if action needs human review
   */
  async shouldReview(params: {
    tenantId: string;
    action: string;
    category?: string;
    confidence: number;
    value?: number;
    userId?: string;
  }): Promise<{ needsReview: boolean; reason: string; priority: ReviewPriority }> {
    const { tenantId, action, category, confidence } = params;

    const threshold = await ConfidenceThresholdModel.findOne({
      tenantId,
      action,
      category,
      active: true
    });

    if (!threshold) {
      // Default: review if confidence < 0.7
      return {
        needsReview: confidence < 0.7,
        reason: confidence < 0.7 ? 'Confidence below default threshold (0.7)' : 'Confidence acceptable',
        priority: confidence < 0.5 ? ReviewPriority.HIGH : ReviewPriority.MEDIUM
      };
    }

    if (confidence >= threshold.autoApproveAbove) {
      return { needsReview: false, reason: 'Confidence above auto-approve threshold', priority: ReviewPriority.LOW };
    }

    if (confidence < threshold.autoApproveBelow) {
      return { needsReview: false, reason: 'Confidence below review threshold - auto-block', priority: ReviewPriority.HIGH };
    }

    return {
      needsReview: true,
      reason: 'Confidence in review range',
      priority: ReviewPriority.MEDIUM
    };
  }

  /**
   * Create review request
   */
  async createReview(params: {
    tenantId: string;
    type: ReviewType;
    title: string;
    description: string;
    context: Record<string, unknown>;
    originalAction: { type: string; params: Record<string, unknown>; result?: unknown; confidence?: number };
    aiRecommendation: { action: string; confidence: number; reasoning: string };
    assignedTo?: string;
    reviewerRole?: string;
    priority?: ReviewPriority;
    slaHours?: number;
  }): Promise<ReviewRequest> {
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + (params.slaHours || 24));

    const review = new ReviewRequestModel({
      ...params,
      id: uuid(),
      slaDeadline,
      priority: params.priority || ReviewPriority.MEDIUM
    });

    await review.save();
    await this.logAudit(review.tenantId, review.id, 'created', 'system', 'Review request created');

    return review.toObject() as ReviewRequest;
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(tenantId: string, params?: {
    assignedTo?: string;
    priority?: ReviewPriority;
    limit?: number;
  }): Promise<ReviewRequest[]> {
    const filter: Record<string, unknown> = {
      tenantId,
      status: { $in: [ReviewStatus.PENDING, ReviewStatus.IN_REVIEW] }
    };

    if (params?.assignedTo) filter.assignedTo = params.assignedTo;
    if (params?.priority) filter.priority = params.priority;

    const reviews = await ReviewRequestModel.find(filter)
      .sort({ priority: -1, slaDeadline: 1 })
      .limit(params?.limit || 50);

    return reviews.map(r => r.toObject() as ReviewRequest);
  }

  /**
   * Make decision on review
   */
  async decide(params: {
    reviewId: string;
    tenantId: string;
    decision: 'approve' | 'reject' | 'override' | 'escalate';
    decidedBy: string;
    decisionNote?: string;
    escalatedTo?: string;
  }): Promise<ReviewRequest> {
    const review = await ReviewRequestModel.findOne({
      _id: params.reviewId,
      tenantId: params.tenantId
    });

    if (!review) throw new Error('Review not found');
    if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.IN_REVIEW) {
      throw new Error('Review already decided');
    }

    review.decision = params.decision;
    review.decidedBy = params.decidedBy;
    review.decidedAt = new Date();
    review.decisionNote = params.decisionNote;

    switch (params.decision) {
      case 'approve':
      case 'reject':
        review.status = params.decision === 'approve' ? ReviewStatus.APPROVED : ReviewStatus.REJECTED;
        break;
      case 'override':
        review.status = ReviewStatus.OVERRIDDEN;
        break;
      case 'escalate':
        review.status = ReviewStatus.ESCALATED;
        review.escalatedTo = params.escalatedTo;
        break;
    }

    await review.save();
    await this.logAudit(review.tenantId, review.id, 'decided', params.decidedBy, { decision: params.decision });

    return review.toObject() as ReviewRequest;
  }

  /**
   * Check escalation rules
   */
  async checkEscalation(params: {
    tenantId: string;
    action: string;
    value?: number;
    userId?: string;
    riskScore?: number;
  }): Promise<{ shouldEscalate: boolean; escalateTo?: string; reason?: string }> {
    const rules = await EscalationRuleModel.find({
      tenantId: params.tenantId,
      active: true
    });

    for (const rule of rules) {
      let matches = true;

      for (const condition of rule.conditions) {
        const value = (params as any)[condition.field];
        switch (condition.operator) {
          case 'greater_than':
            if (!(value > condition.value)) matches = false;
            break;
          case 'less_than':
            if (!(value < condition.value)) matches = false;
            break;
          case 'equals':
            if (value !== condition.value) matches = false;
            break;
        }
      }

      if (matches) {
        return {
          shouldEscalate: rule.action === 'escalate' || rule.action === 'require_review',
          escalateTo: rule.escalateTo,
          reason: rule.reason
        };
      }
    }

    return { shouldEscalate: false };
  }

  /**
   * Get review statistics
   */
  async getStats(tenantId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, todayDecisions, avgResolutionTime] = await Promise.all([
      ReviewRequestModel.countDocuments({ tenantId, status: { $in: [ReviewStatus.PENDING, ReviewStatus.IN_REVIEW] } }),
      ReviewRequestModel.countDocuments({ tenantId, decidedAt: { $gte: today } }),
      this.calculateAvgResolutionTime(tenantId)
    ]);

    return {
      pendingReviews: pending,
      todayDecisions,
      avgResolutionTimeHours: avgResolutionTime,
      urgentOverdue: await ReviewRequestModel.countDocuments({
        tenantId,
        status: ReviewStatus.PENDING,
        priority: ReviewPriority.URGENT,
        slaDeadline: { $lt: new Date() }
      })
    };
  }

  private async calculateAvgResolutionTime(tenantId: string): Promise<number> {
    const reviews = await ReviewRequestModel.find({
      tenantId,
      decidedAt: { $exists: true }
    }).sort({ decidedAt: -1 }).limit(100);

    if (reviews.length === 0) return 0;

    const totalMs = reviews.reduce((sum, r) => {
      const created = new Date(r.createdAt).getTime();
      const decided = new Date(r.decidedAt!).getTime();
      return sum + (decided - created);
    }, 0);

    return totalMs / reviews.length / (1000 * 60 * 60); // Hours
  }

  private async logAudit(tenantId: string, reviewId: string, action: string, performedBy: string, details?: any): Promise<void> {
    await ReviewAuditModel.create({
      tenantId,
      reviewId,
      action,
      performedBy,
      details
    });
  }
}

export const hitlService = new HITLService();
