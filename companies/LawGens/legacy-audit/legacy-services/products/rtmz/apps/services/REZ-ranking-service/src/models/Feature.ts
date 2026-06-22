import mongoose, { Schema, Document } from 'mongoose';

export interface IFeature extends Document {
  entityId: string;
  entityType: string;
  features: {
    relevance: {
      textMatch?: number;
      semanticScore?: number;
      categoryMatch?: number;
    };
    popularity: {
      views?: number;
      clicks?: number;
      purchases?: number;
      ratings?: number;
      avgRating?: number;
    };
    recency: {
      createdAt?: Date;
      updatedAt?: Date;
      hoursSinceUpdate?: number;
    };
    quality: {
      avgRating?: number;
      reviewCount?: number;
      qaCount?: number;
      completionRate?: number;
    };
    location: {
      country?: string;
      region?: string;
      city?: string;
      distance?: number;
    };
    personalization: {
      userAffinity?: number;
      viewCount?: number;
      purchaseCount?: number;
      avgPosition?: number;
    };
    trending: {
      velocity?: number;
      trendScore?: number;
      spikeCount?: number;
    };
    custom: Record<string, number>;
  };
  computedAt: Date;
  expiresAt?: Date;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeatureSchema = new Schema<IFeature>({
  entityId: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true },
  features: {
    relevance: {
      textMatch: Number,
      semanticScore: Number,
      categoryMatch: Number
    },
    popularity: {
      views: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      ratings: { type: Number, default: 0 },
      avgRating: Number
    },
    recency: {
      createdAt: Date,
      updatedAt: Date,
      hoursSinceUpdate: Number
    },
    quality: {
      avgRating: Number,
      reviewCount: { type: Number, default: 0 },
      qaCount: { type: Number, default: 0 },
      completionRate: Number
    },
    location: {
      country: String,
      region: String,
      city: String,
      distance: Number
    },
    personalization: {
      userAffinity: Number,
      viewCount: { type: Number, default: 0 },
      purchaseCount: { type: Number, default: 0 },
      avgPosition: Number
    },
    trending: {
      velocity: Number,
      trendScore: Number,
      spikeCount: Number
    },
    custom: { type: Map, of: Number, default: {} }
  },
  computedAt: { type: Date, default: Date.now },
  expiresAt: Date,
  version: { type: String, default: '1.0' }
}, {
  timestamps: true
});

FeatureSchema.index({ entityId: 1, entityType: 1 }, { unique: true });
FeatureSchema.index({ entityType: 1, 'popularity.views': -1 });
FeatureSchema.index({ entityType: 1, 'trending.trendScore': -1 });
FeatureSchema.index({ expiresAt: 1 }, { expires: 0 });

export const Feature = mongoose.model<IFeature>('Feature', FeatureSchema);
