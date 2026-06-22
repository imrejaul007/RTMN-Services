import mongoose, { Schema } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { EntityType, TrustLevel, TrustScore, Verification, Review, TrustEdge, Badge } from '../types/index.js';

const TrustScoreSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  entityType: { type: String, enum: Object.values(EntityType), required: true },
  entityId: { type: String, required: true },
  overallScore: { type: Number, default: 50 },
  reliabilityScore: { type: Number, default: 50 },
  qualityScore: { type: Number, default: 50 },
  responsivenessScore: { type: Number, default: 50 },
  deliveryScore: { type: Number, default: 50 },
  trustLevel: { type: String, enum: Object.values(TrustLevel), default: TrustLevel.UNVERIFIED },
  factors: {
    positiveReviews: { type: Number, default: 0 },
    negativeReviews: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    responseRate: { type: Number, default: 0 },
    deliveryRate: { type: Number, default: 0 },
    disputeRate: { type: Number, default: 0 },
    verifiedBadges: [String],
    tenure: { type: Number, default: 0 },
    volumeScore: { type: Number, default: 0 }
  },
  scoreHistory: [{
    date: Date,
    score: Number
  }],
  lastUpdated: Date
}, { timestamps: true });

TrustScoreSchema.index({ tenantId: 1, entityType: 1, entityId: 1 }, { unique: true });
TrustScoreSchema.index({ tenantId: 1, trustLevel: 1 });

const VerificationSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  entityType: { type: String, enum: Object.values(EntityType), required: true },
  entityId: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, enum: ['pending', 'verified', 'rejected', 'expired'], default: 'pending' },
  level: { type: String, enum: ['basic', 'standard', 'enhanced', 'premium'] },
  provider: String,
  externalId: String,
  verifiedAt: Date,
  expiresAt: Date,
  metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true });

VerificationSchema.index({ tenantId: 1, entityId: 1, status: 1 });

const ReviewSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  reviewerId: { type: String, required: true },
  reviewerType: { type: String, enum: Object.values(EntityType), required: true },
  entityId: { type: String, required: true },
  entityType: { type: String, enum: Object.values(EntityType), required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  content: String,
  categories: { type: Map, of: Number },
  isVerified: { type: Boolean, default: false },
  isAnonymous: { type: Boolean, default: false },
  orderId: String,
  transactionValue: Number,
  helpful: { type: Number, default: 0 },
  unhelpful: { type: Number, default: 0 },
  response: {
    content: String,
    respondedAt: Date,
    respondedBy: String
  },
  status: { type: String, enum: ['published', 'hidden', 'flagged', 'disputed'], default: 'published' }
}, { timestamps: true });

ReviewSchema.index({ tenantId: 1, entityId: 1, status: 1 });
ReviewSchema.index({ tenantId: 1, reviewerId: 1 });

const TrustEdgeSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  sourceType: { type: String, enum: Object.values(EntityType), required: true },
  sourceId: { type: String, required: true },
  targetType: { type: String, enum: Object.values(EntityType), required: true },
  targetId: { type: String, required: true },
  relationship: { type: String, required: true },
  strength: { type: Number, default: 0.5 },
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  lastInteraction: Date,
  interactionCount: { type: Number, default: 0 }
}, { timestamps: true });

TrustEdgeSchema.index({ tenantId: 1, sourceId: 1, targetId: 1 }, { unique: true });
TrustEdgeSchema.index({ tenantId: 1, sourceId: 1, relationship: 1 });

const BadgeSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: String,
  icon: String,
  color: String,
  criteria: {
    minTransactions: Number,
    minRating: Number,
    minTrustScore: Number,
    requiredVerifications: [String],
    maxDisputeRate: Number
  },
  tier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'] },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export const TrustScoreModel = mongoose.model('TrustScore', TrustScoreSchema);
export const VerificationModel = mongoose.model('Verification', VerificationSchema);
export const ReviewModel = mongoose.model('Review', ReviewSchema);
export const TrustEdgeModel = mongoose.model('TrustEdge', TrustEdgeSchema);
export const BadgeModel = mongoose.model('Badge', BadgeSchema);

export class TrustService {
  /**
   * Calculate trust score
   */
  async calculateScore(params: {
    tenantId: string;
    entityType: EntityType;
    entityId: string;
  }): Promise<TrustScore> {
    const { tenantId, entityType, entityId } = params;

    // Get factors
    const factors = await this.getFactors(tenantId, entityType, entityId);

    // Calculate scores
    const reliabilityScore = this.calcReliabilityScore(factors);
    const qualityScore = this.calcQualityScore(factors);
    const responsivenessScore = this.calcResponsivenessScore(factors);
    const deliveryScore = this.calcDeliveryScore(factors);

    // Weighted overall
    const overallScore = Math.round(
      reliabilityScore * 0.3 +
      qualityScore * 0.25 +
      responsivenessScore * 0.2 +
      deliveryScore * 0.25
    );

    // Determine trust level
    const trustLevel = this.getTrustLevel(overallScore, factors);

    // Get existing score for history
    const existing = await TrustScoreModel.findOne({ tenantId, entityType, entityId });

    const scoreData = {
      tenantId,
      entityType,
      entityId,
      overallScore,
      reliabilityScore,
      qualityScore,
      responsivenessScore,
      deliveryScore,
      trustLevel,
      factors,
      lastUpdated: new Date(),
      scoreHistory: existing?.scoreHistory || []
    };

    // Add to history
    scoreData.scoreHistory.push({ date: new Date(), score: overallScore });
    if (scoreData.scoreHistory.length > 30) {
      scoreData.scoreHistory = scoreData.scoreHistory.slice(-30);
    }

    const score = await TrustScoreModel.findOneAndUpdate(
      { tenantId, entityType, entityId },
      scoreData,
      { upsert: true, new: true }
    );

    return score.toObject() as TrustScore;
  }

  private async getFactors(tenantId: string, entityType: EntityType, entityId: string): Promise<any> {
    // Get basic counts
    const [reviews, verifications, edges] = await Promise.all([
      ReviewModel.countDocuments({ tenantId, entityId, status: 'published' }),
      VerificationModel.countDocuments({ tenantId, entityId, status: 'verified' }),
      TrustEdgeModel.countDocuments({ tenantId, targetId: entityId, relationship: 'customer_of' })
    ]);

    // Calculate negative reviews (rating < 3)
    const negativeReviews = await ReviewModel.countDocuments({
      tenantId,
      entityId,
      status: 'published',
      rating: { $lt: 3 }
    });

    // Calculate average rating
    const avgRatingResult = await ReviewModel.aggregate([
      { $match: { tenantId, entityId, status: 'published' } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    // Calculate response rate from entity's message responsiveness
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const messagesSent = await this.countMessages(tenantId, entityId, thirtyDaysAgo);
    const messagesResponded = await this.countMessagesResponded(tenantId, entityId, thirtyDaysAgo);
    const responseRate = messagesSent > 0 ? Math.round((messagesResponded / messagesSent) * 100) : 80;

    // Calculate delivery rate from transactions
    const deliveredTransactions = await this.countDeliveredTransactions(tenantId, entityId);
    const deliveryRate = edges > 0 ? Math.round((deliveredTransactions / edges) * 100) : 95;

    // Calculate dispute rate from disputes/claims
    const disputes = await this.countDisputes(tenantId, entityId);
    const disputeRate = edges > 0 ? Math.round((disputes / edges) * 100) : 0;

    // Calculate tenure from entity creation
    const entity = await TrustEntityModel.findOne({ tenantId, entityId });
    const tenure = entity?.createdAt
      ? Math.floor((Date.now() - entity.createdAt.getTime()) / (24 * 60 * 60 * 1000))
      : 0;

    return {
      positiveReviews: reviews,
      negativeReviews,
      totalTransactions: edges,
      avgRating: avgRatingResult[0]?.avg || 0,
      responseRate,
      deliveryRate,
      disputeRate,
      verifiedBadges: verifications > 0 ? ['verified'] : [],
      tenure,
      volumeScore: Math.min(edges * 2, 100)
    };
  }

  private async countMessages(tenantId: string, entityId: string, since: Date): Promise<number> {
    // Count messages sent by entity (implement based on your message model)
    const MessageModel = mongoose.model('Message') || mongoose.model('TrustMessage', new mongoose.Schema({
      tenantId: String,
      senderId: String,
      createdAt: Date
    }));
    return MessageModel.countDocuments({ tenantId, senderId: entityId, createdAt: { $gte: since } });
  }

  private async countMessagesResponded(tenantId: string, entityId: string, since: Date): Promise<number> {
    // Count messages that received a response
    const MessageModel = mongoose.model('Message') || mongoose.model('TrustMessage', new mongoose.Schema({
      tenantId: String,
      senderId: String,
      respondedAt: Date,
      createdAt: Date
    }));
    return MessageModel.countDocuments({
      tenantId,
      senderId: entityId,
      respondedAt: { $exists: true, $ne: null },
      createdAt: { $gte: since }
    });
  }

  private async countDeliveredTransactions(tenantId: string, entityId: string): Promise<number> {
    // Count delivered/completed transactions
    const TransactionModel = mongoose.model('Transaction') || mongoose.model('TrustTransaction', new mongoose.Schema({
      tenantId: String,
      entityId: String,
      status: String
    }));
    return TransactionModel.countDocuments({
      tenantId,
      entityId,
      status: { $in: ['delivered', 'completed', 'success'] }
    });
  }

  private async countDisputes(tenantId: string, entityId: string): Promise<number> {
    // Count disputes/claims
    const DisputeModel = mongoose.model('Dispute') || mongoose.model('TrustDispute', new mongoose.Schema({
      tenantId: String,
      entityId: String,
      status: String
    }));
    return DisputeModel.countDocuments({
      tenantId,
      entityId,
      status: { $in: ['open', 'pending', 'escalated'] }
    });
  }

  private calcReliabilityScore(f: any): number {
    const factors = [
      f.tenure > 30 ? 30 : f.tenure,
      f.verifiedBadges.length * 15,
      f.disputeRate < 5 ? 25 : Math.max(0, 25 - f.disputeRate * 5)
    ];
    return Math.min(Math.round(factors.reduce((a: number, b: number) => a + b, 0)), 100);
  }

  private calcQualityScore(f: any): number {
    const ratingScore = (f.avgRating / 5) * 60;
    const volumeBonus = Math.min(f.volumeScore, 40);
    return Math.round(ratingScore + volumeBonus);
  }

  private calcResponsivenessScore(f: any): number {
    return Math.round(f.responseRate);
  }

  private calcDeliveryScore(f: any): number {
    return Math.round(f.deliveryRate);
  }

  private getTrustLevel(score: number, factors: any): TrustLevel {
    if (score >= 90 && factors.verifiedBadges.length >= 2) return TrustLevel.ELITE;
    if (score >= 75) return TrustLevel.TRUSTED;
    if (score >= 50) return TrustLevel.VERIFIED;
    if (score >= 25) return TrustLevel.BASIC;
    return TrustLevel.UNVERIFIED;
  }

  /**
   * Get trust score
   */
  async getScore(params: { tenantId: string; entityType: EntityType; entityId: string }): Promise<TrustScore | null> {
    const score = await TrustScoreModel.findOne(params);
    return score ? (score.toObject() as TrustScore) : null;
  }

  /**
   * Create review
   */
  async createReview(review: Omit<Review, 'id' | 'createdAt' | 'updatedAt'>): Promise<Review> {
    const doc = await ReviewModel.create({ ...review, id: uuid() });

    // Recalculate trust score
    await this.calculateScore({
      tenantId: review.tenantId,
      entityType: review.entityType,
      entityId: review.entityId
    });

    return doc.toObject() as Review;
  }

  /**
   * Get reviews
   */
  async getReviews(params: {
    tenantId: string;
    entityId: string;
    limit?: number;
  }): Promise<Review[]> {
    const reviews = await ReviewModel.find({
      tenantId: params.tenantId,
      entityId: params.entityId,
      status: 'published'
    }).sort({ createdAt: -1 }).limit(params.limit || 20);

    return reviews.map(r => r.toObject() as Review);
  }

  /**
   * Add verification
   */
  async addVerification(verification: Omit<Verification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Verification> {
    const doc = await VerificationModel.create({ ...verification, id: uuid() });

    // Recalculate trust score
    await this.calculateScore({
      tenantId: verification.tenantId,
      entityType: verification.entityType,
      entityId: verification.entityId
    });

    return doc.toObject() as Verification;
  }

  /**
   * Get trust graph connections
   */
  async getConnections(params: {
    tenantId: string;
    entityId: string;
    relationship?: string;
  }): Promise<TrustEdge[]> {
    const edges = await TrustEdgeModel.find({
      tenantId: params.tenantId,
      sourceId: params.entityId,
      ...(params.relationship ? { relationship: params.relationship } : {})
    });

    return edges.map(e => e.toObject() as TrustEdge);
  }

  /**
   * Add trust edge
   */
  async addEdge(edge: Omit<TrustEdge, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrustEdge> {
    const doc = await TrustEdgeModel.findOneAndUpdate(
      { tenantId: edge.tenantId, sourceId: edge.sourceId, targetId: edge.targetId },
      { ...edge, id: uuid() },
      { upsert: true, new: true }
    );
    return doc.toObject() as TrustEdge;
  }

  /**
   * Get top merchants by trust
   */
  async getTopMerchants(tenantId: string, limit = 10): Promise<TrustScore[]> {
    const scores = await TrustScoreModel.find({
      tenantId,
      entityType: EntityType.MERCHANT,
      trustLevel: { $in: [TrustLevel.TRUSTED, TrustLevel.ELITE] }
    }).sort({ overallScore: -1 }).limit(limit);

    return scores.map(s => s.toObject() as TrustScore);
  }
}

export const trustService = new TrustService();
