import mongoose, { Document, Schema } from 'mongoose';

// FAQ Category
export enum FAQCategory {
  GENERAL = 'general',
  PURCHASING = 'purchasing',
  SHIPPING = 'shipping',
  RETURNS = 'returns',
  WARRANTY = 'warranty',
  TECHNICAL = 'technical',
  USAGE = 'usage',
  MAINTENANCE = 'maintenance',
  COMPATIBILITY = 'compatibility',
  SECURITY = 'security'
}

// FAQ Status
export enum FAQStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

// FAQ Vote
export interface IFAQVote {
  userId?: string;
  sessionId?: string;
  isHelpful: boolean;
  timestamp: Date;
}

// FAQ Response
export interface IFAQResponse {
  text: string;
  author?: string;
  timestamp: Date;
  isOfficial: boolean;
}

// FAQ Interface
export interface IFAQ extends Document {
  tenantId: string;
  productId: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  category: FAQCategory;
  status: FAQStatus;
  order: number;
  votes: {
    helpful: number;
    notHelpful: number;
    voters: IFAQVote[];
  };
  responses: IFAQResponse[];
  tags: string[];
  relatedFAQs: mongoose.Types.ObjectId[];
  viewCount: number;
  lastViewed?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// FAQ Schema
const FAQVoteSchema = new Schema<IFAQVote>(
  {
    userId: String,
    sessionId: String,
    isHelpful: {
      type: Boolean,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const FAQResponseSchema = new Schema<IFAQResponse>(
  {
    text: {
      type: String,
      required: true
    },
    author: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    isOfficial: {
      type: Boolean,
      default: false
    }
  },
  { _id: false }
);

const VotesSchema = new Schema(
  {
    helpful: {
      type: Number,
      default: 0
    },
    notHelpful: {
      type: Number,
      default: 0
    },
    voters: [FAQVoteSchema]
  },
  { _id: false }
);

const FAQSchema = new Schema<IFAQ>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    question: {
      type: String,
      required: true,
      index: 'text'
    },
    answer: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: Object.values(FAQCategory),
      default: FAQCategory.GENERAL,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(FAQStatus),
      default: FAQStatus.DRAFT,
      index: true
    },
    order: {
      type: Number,
      default: 0
    },
    votes: {
      type: VotesSchema,
      default: () => ({})
    },
    responses: [FAQResponseSchema],
    tags: {
      type: [String],
      default: []
    },
    relatedFAQs: [
      {
        type: Schema.Types.ObjectId,
        ref: 'FAQ'
      }
    ],
    viewCount: {
      type: Number,
      default: 0
    },
    lastViewed: Date,
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'faqs'
  }
);

// Indexes
FAQSchema.index({ tenantId: 1, productId: 1 });
FAQSchema.index({ tenantId: 1, productId: 1, status: 1 });
FAQSchema.index({ tenantId: 1, productId: 1, category: 1 });
FAQSchema.index({ tenantId: 1, tags: 1 });
FAQSchema.index({ question: 'text', answer: 'text' });

// Virtual for helpfulness percentage
FAQSchema.virtual('helpfulnessPercentage').get(function () {
  const total = this.votes.helpful + this.votes.notHelpful;
  if (total === 0) return 0;
  return Math.round((this.votes.helpful / total) * 100);
});

// Method to record a vote
FAQSchema.methods.recordVote = function (
  isHelpful: boolean,
  userId?: string,
  sessionId?: string
): boolean {
  // Check for duplicate vote
  const existingVote = this.votes.voters.find(
    (v: IFAQVote) =>
      (userId && v.userId === userId) || (sessionId && v.sessionId === sessionId)
  );

  if (existingVote) {
    return false; // Already voted
  }

  if (isHelpful) {
    this.votes.helpful += 1;
  } else {
    this.votes.notHelpful += 1;
  }

  this.votes.voters.push({
    userId,
    sessionId,
    isHelpful,
    timestamp: new Date()
  });

  return true;
};

// Method to add a response
FAQSchema.methods.addResponse = function (
  text: string,
  author?: string,
  isOfficial: boolean = false
) {
  this.responses.push({
    text,
    author,
    timestamp: new Date(),
    isOfficial
  });
};

// Method to increment view count
FAQSchema.methods.incrementViews = function () {
  this.viewCount += 1;
  this.lastViewed = new Date();
};

// Static method to find published FAQs
FAQSchema.statics.findPublished = function (
  tenantId: string,
  productId?: mongoose.Types.ObjectId
) {
  const query: any = { tenantId, status: FAQStatus.PUBLISHED };
  if (productId) {
    query.productId = productId;
  }
  return this.find(query).sort({ order: 1, viewCount: -1 });
};

// Static method to find by category
FAQSchema.statics.findByCategory = function (
  tenantId: string,
  productId: mongoose.Types.ObjectId,
  category: FAQCategory
) {
  return this.find({
    tenantId,
    productId,
    category,
    status: FAQStatus.PUBLISHED
  }).sort({ order: 1 });
};

// Static method to get FAQ statistics
FAQSchema.statics.getStats = async function (
  tenantId: string,
  productId: mongoose.Types.ObjectId
) {
  const stats = await this.aggregate([
    { $match: { tenantId, productId } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        totalViews: { $sum: '$viewCount' },
        totalHelpful: { $sum: '$votes.helpful' },
        totalNotHelpful: { $sum: '$votes.notHelpful' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return stats.map((s) => ({
    category: s._id,
    faqCount: s.count,
    totalViews: s.totalViews,
    helpfulVotes: s.totalHelpful,
    notHelpfulVotes: s.totalNotHelpful
  }));
};

// Export the model
export const FAQ = mongoose.model<IFAQ>('FAQ', FAQSchema);
export default FAQ;
