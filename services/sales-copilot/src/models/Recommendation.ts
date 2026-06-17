import mongoose, { Schema } from 'mongoose';
import { IRecommendation, RecommendationType, RecommendationStatus } from '../types';

const RecommendationSchema = new Schema<IRecommendation>(
  {
    leadId: {
      type: String,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(RecommendationType),
      required: true
    },
    priority: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    action: {
      type: String,
      required: true
    },
    reasoning: {
      type: String
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    status: {
      type: String,
      enum: Object.values(RecommendationStatus),
      default: RecommendationStatus.PENDING
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Indexes
RecommendationSchema.index({ leadId: 1, status: 1 });
RecommendationSchema.index({ leadId: 1, type: 1 });
RecommendationSchema.index({ priority: -1 });
RecommendationSchema.index({ status: 1, createdAt: -1 });

// Virtual for isPending
RecommendationSchema.virtual('isPending').get(function() {
  return this.status === RecommendationStatus.PENDING;
});

// Methods
RecommendationSchema.methods.accept = async function() {
  this.status = RecommendationStatus.ACCEPTED;
  return this.save();
};

RecommendationSchema.methods.reject = async function() {
  this.status = RecommendationStatus.REJECTED;
  return this.save();
};

RecommendationSchema.methods.complete = async function() {
  this.status = RecommendationStatus.COMPLETED;
  this.completedAt = new Date();
  return this.save();
};

// Static methods
RecommendationSchema.statics.getPendingForLead = function(leadId: string) {
  return this.find({ leadId, status: RecommendationStatus.PENDING })
    .sort({ priority: -1 });
};

RecommendationSchema.statics.getTopRecommendations = function(limit = 10) {
  return this.find({ status: RecommendationStatus.PENDING })
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

export const Recommendation = mongoose.model<IRecommendation>('Recommendation', RecommendationSchema);
