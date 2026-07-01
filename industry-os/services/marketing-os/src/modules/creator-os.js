/**
 * CreatorOS - Creator Economy Platform
 * Phase 4: Creator Marketplace, Twins, Contracts, Payments, UGC
 * Date: July 2, 2026
 */

const mongoose = require('mongoose');
const logger = require('../config/logger');

// ========================================
// CREATOR SCHEMAS
// ========================================

const creatorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  platform: { type: String, enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'linkedin'], required: true },
  handle: { type: String, required: true },
  profileUrl: String,
  avatar: String,

  // Audience metrics
  audience: {
    size: { type: Number, default: 0 },
    demographics: {
      age: { type: Map, of: String },
      gender: { type: Map, of: Number },
      location: { type: Map, of: Number }
    },
    interests: [String],
    engagementRate: { type: Number, default: 0 }
  },

  // Content categories
  categories: [String],
  niche: String,

  // Performance history
  performance: {
    avgReach: { type: Number, default: 0 },
    avgImpressions: { type: Number, default: 0 },
    avgEngagement: { type: Number, default: 0 },
    avgLikes: { type: Number, default: 0 },
    avgComments: { type: Number, default: 0 },
    avgShares: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },

  // Trust & verification
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  verification: {
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    verifiedAt: Date,
    documents: [String]
  },

  // Pricing
  pricing: {
    minRate: { type: Number, default: 0 },
    preferredRate: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    negotiationAllowed: { type: Boolean, default: true }
  },

  // Payment info
  payment: {
    bankName: String,
    accountNumber: String,
    ifsc: String,
    upi: String,
    payeeName: String
  },

  // Stats
  stats: {
    campaignsCompleted: { type: Number, default: 0 },
    campaignsInProgress: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    pendingPayouts: { type: Number, default: 0 },
    avgRating: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 }
  },

  // Status
  status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },

  // Metadata
  merchantId: String,
  organizationId: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Creator Twin Schema
const creatorTwinSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },

  // Audience Twin
  audienceTwin: {
    size: Number,
    demographics: mongoose.Schema.Types.Mixed,
    interests: [String],
    engagementRate: Number,
    growthRate: Number,
    demographicScore: Number,
    influenceScore: Number
  },

  // Performance Twin
  performanceTwin: {
    avgReach: Number,
    avgEngagement: Number,
    conversionRate: Number,
    brandSentiment: Number,
    consistencyScore: Number
  },

  // Trust Twin
  trustTwin: {
    score: Number,
    completedCampaigns: Number,
    avgRating: Number,
    responseRate: Number,
    onTimeDelivery: Number,
    communicationScore: Number
  },

  // Price Twin
  priceTwin: {
    minAcceptable: Number,
    preferred: Number,
    marketAvg: Number,
    valueScore: Number
  },

  // Brand Fit Twin
  brandFitTwin: {
    luxury: Number,
    mass: Number,
    youth: Number,
    professional: Number,
    lifestyle: Number
  },

  // Predictions
  predictions: {
    successProbability: Number,
    riskScore: Number,
    churnRisk: Number,
    potentialValue: Number
  },

  updatedAt: { type: Date, default: Date.now }
});

// Creator Campaign Schema
const creatorCampaignSchema = new mongoose.Schema({
  brandId: { type: String, required: true },
  name: { type: String, required: true },
  description: String,

  // Targeting
  targetCategories: [String],
  targetAudience: {
    age: [String],
    gender: [String],
    location: [String],
    interests: [String]
  },
  minFollowers: { type: Number, default: 0 },
  maxBudget: { type: Number, required: true },
  minBudget: { type: Number, default: 0 },

  // Deliverables
  deliverables: [{
    type: { type: String, enum: ['story', 'post', 'reel', 'video', 'blog'], required: true },
    count: { type: Number, default: 1 },
    requirements: String,
    deadline: Date
  }],

  // Content requirements
  contentRequirements: {
    brandIntegration: { type: String, enum: ['subtle', 'direct', 'exclusive'], default: 'direct' },
    hashtags: [String],
    mentionRequired: Boolean,
    approvalRequired: Boolean
  },

  // Timeline
  startDate: Date,
  endDate: Date,
  applicationDeadline: Date,

  // Status
  status: { type: String, enum: ['draft', 'open', 'reviewing', 'selected', 'in_progress', 'completed', 'cancelled'], default: 'draft' },

  // Matched creators
  matchedCreators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Creator' }],
  selectedCreators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Creator' }],
  rejectedCreators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Creator' }],

  // Budget allocation
  budgetAllocation: {
    total: Number,
    creatorPayout: Number,
    platformFee: Number,
    contentBudget: Number
  },

  // Stats
  stats: {
    views: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Contract Schema
const contractSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreatorCampaign', required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
  brandId: { type: String, required: true },

  // Terms
  terms: {
    deliverables: [{
      type: String,
      count: Number,
      description: String,
      deadline: Date
    }],
    compensation: {
      amount: { type: Number, required: true },
      currency: { type: String, default: 'INR' },
      paymentTerms: String,
      paymentSchedule: { type: String, enum: ['upfront', 'milestone', 'completion'], default: 'completion' }
    },
    timeline: {
      startDate: Date,
      endDate: Date,
      exclusivity: {
        required: Boolean,
        duration: Number
      }
    },
    usageRights: {
      duration: Number,
      platforms: [String],
      territories: [String]
    }
  },

  // Signatures
  signatures: {
    creator: {
      signed: { type: Boolean, default: false },
      signature: String,
      signedAt: Date
    },
    brand: {
      signed: { type: Boolean, default: false },
      signature: String,
      signedAt: Date
    }
  },

  // Milestones
  milestones: [{
    id: String,
    description: String,
    amount: Number,
    dueDate: Date,
    status: { type: String, enum: ['pending', 'invoiced', 'paid'], default: 'pending' },
    paidAt: Date
  }],

  // Deliverables tracking
  deliverables: [{
    id: String,
    type: String,
    contentUrl: String,
    submittedAt: Date,
    status: { type: String, enum: ['pending', 'submitted', 'approved', 'rejected', 'revision_requested'], default: 'pending' },
    feedback: String,
    approvedAt: Date
  }],

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_creator', 'pending_brand', 'active', 'completed', 'cancelled', 'disputed'],
    default: 'draft'
  },

  // Payments
  payments: [{
    milestoneId: String,
    amount: Number,
    currency: String,
    status: { type: String, enum: ['pending', 'processing', 'completed', 'failed'], default: 'pending' },
    transactionId: String,
    paidAt: Date
  }],

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// UGC Schema
const ugcSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreatorCampaign' },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },

  // Content
  type: { type: String, enum: ['image', 'video', 'story', 'reel', 'carousel'], required: true },
  url: String,
  thumbnail: String,
  caption: String,
  hashtags: [String],
  platform: { type: String, enum: ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook'], required: true },

  // Metrics
  metrics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 }
  },

  // Rights
  rights: {
    usage: { type: String, enum: ['campaign_only', 'brand_only', 'perpetual'], default: 'campaign_only' },
    expiresAt: Date,
    territories: [String],
    platforms: [String]
  },

  // Review
  status: {
    type: String,
    enum: ['pending_review', 'approved', 'rejected', 'revision_requested'],
    default: 'pending_review'
  },
  reviewedBy: String,
  reviewedAt: Date,
  feedback: String,

  // Performance bonus
  performanceBonus: {
    threshold: Number,
    bonusAmount: Number,
    eligible: { type: Boolean, default: false },
    achieved: { type: Boolean, default: false }
  },

  createdAt: { type: Date, default: Date.now }
});

// Payment Schema
const paymentSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'CreatorCampaign' },

  // Amount
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  // Breakdown
  breakdown: {
    grossAmount: Number,
    platformFee: Number,
    paymentGatewayFee: Number,
    tax: Number,
    netAmount: Number
  },

  // Milestone
  milestoneId: String,
  milestoneDescription: String,

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },

  // Transaction
  transactionId: String,
  paymentMethod: { type: String, enum: ['bank_transfer', 'upi', 'wallet'], default: 'bank_transfer' },

  // Payout
  payoutScheduledAt: Date,
  payoutCompletedAt: Date,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Models
const Creator = mongoose.model('Creator', creatorSchema);
const CreatorTwin = mongoose.model('CreatorTwin', creatorTwinSchema);
const CreatorCampaign = mongoose.model('CreatorCampaign', creatorCampaignSchema);
const Contract = mongoose.model('Contract', contractSchema);
const UGC = mongoose.model('UGC', ugcSchema);
const Payment = mongoose.model('CreatorPayment', paymentSchema);

// ========================================
// CREATOROS CLASS
// ========================================

class CreatorOS {
  constructor() {
    this.PLATFORM_FEE_RATE = 0.10; // 10% platform fee
    this.PAYMENT_GATEWAY_FEE = 0.029; // 2.9% + ₹3
  }

  // ========================================
  // CREATOR MANAGEMENT
  // ========================================

  async registerCreator(data) {
    try {
      const creator = new Creator({
        name: data.name,
        email: data.email,
        phone: data.phone,
        platform: data.platform,
        handle: data.handle,
        profileUrl: data.profileUrl,
        avatar: data.avatar,
        audience: {
          size: data.audienceSize || 0,
          demographics: data.demographics || {},
          interests: data.interests || [],
          engagementRate: data.engagementRate || 0
        },
        categories: data.categories || [],
        niche: data.niche,
        pricing: {
          minRate: data.minRate || 0,
          preferredRate: data.preferredRate || 0
        },
        merchantId: data.merchantId,
        organizationId: data.organizationId
      });

      await creator.save();

      // Create Creator Twin
      await this.createCreatorTwin(creator._id);

      logger.info('Creator registered', { creatorId: creator._id, email: creator.email });

      return { success: true, data: creator };
    } catch (error) {
      logger.error('CreatorOS.registerCreator error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCreator(creatorId) {
    try {
      const creator = await Creator.findById(creatorId);
      if (!creator) {
        return { success: false, error: 'Creator not found' };
      }

      const twin = await this.getCreatorTwin(creatorId);
      const stats = await this.getCreatorStats(creatorId);

      return {
        success: true,
        data: { ...creator.toObject(), twin: twin.data, stats }
      };
    } catch (error) {
      logger.error('CreatorOS.getCreator error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCreators(filters = {}) {
    try {
      const {
        category,
        minFollowers,
        maxRate,
        platform,
        verified,
        page = 1,
        limit = 20
      } = filters;

      const query = { status: 'active' };
      if (category) query.categories = { $in: Array.isArray(category) ? category : [category] };
      if (minFollowers) query['audience.size'] = { $gte: parseInt(minFollowers) };
      if (maxRate) query['pricing.preferredRate'] = { $lte: parseFloat(maxRate) };
      if (platform) query.platform = platform;
      if (verified) query['verification.status'] = 'verified';

      const creators = await Creator.find(query)
        .sort({ trustScore: -1, 'audience.size': -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Creator.countDocuments(query);

      return {
        success: true,
        data: { creators, total, page, pages: Math.ceil(total / limit) }
      };
    } catch (error) {
      logger.error('CreatorOS.getCreators error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCreator(creatorId, data) {
    try {
      const creator = await Creator.findByIdAndUpdate(
        creatorId,
        { ...data, updatedAt: new Date() },
        { new: true }
      );

      if (!creator) {
        return { success: false, error: 'Creator not found' };
      }

      // Update twin
      await this.updateCreatorTwin(creatorId);

      return { success: true, data: creator };
    } catch (error) {
      logger.error('CreatorOS.updateCreator error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // CREATOR TWIN
  // ========================================

  async createCreatorTwin(creatorId) {
    try {
      const creator = await Creator.findById(creatorId);
      if (!creator) return { success: false, error: 'Creator not found' };

      const twin = new CreatorTwin({
        creatorId,
        audienceTwin: {
          size: creator.audience.size,
          demographics: creator.audience.demographics,
          interests: creator.audience.interests,
          engagementRate: creator.audience.engagementRate,
          growthRate: 0,
          demographicScore: 50,
          influenceScore: this.calculateInfluenceScore(creator)
        },
        performanceTwin: {
          avgReach: creator.performance.avgReach,
          avgEngagement: creator.performance.avgEngagement,
          conversionRate: creator.performance.conversionRate,
          brandSentiment: 0,
          consistencyScore: 50
        },
        trustTwin: {
          score: creator.trustScore,
          completedCampaigns: creator.stats.campaignsCompleted,
          avgRating: creator.stats.avgRating,
          responseRate: 100,
          onTimeDelivery: 100,
          communicationScore: 100
        },
        priceTwin: {
          minAcceptable: creator.pricing.minRate,
          preferred: creator.pricing.preferredRate,
          marketAvg: creator.pricing.preferredRate * 0.9,
          valueScore: 50
        },
        brandFitTwin: {
          luxury: 50,
          mass: 50,
          youth: 50,
          professional: 50,
          lifestyle: 50
        }
      });

      await twin.save();
      return { success: true, data: twin };
    } catch (error) {
      logger.error('CreatorOS.createCreatorTwin error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCreatorTwin(creatorId) {
    try {
      let twin = await CreatorTwin.findOne({ creatorId });

      if (!twin) {
        await this.createCreatorTwin(creatorId);
        twin = await CreatorTwin.findOne({ creatorId });
      }

      return { success: true, data: twin };
    } catch (error) {
      logger.error('CreatorOS.getCreatorTwin error:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCreatorTwin(creatorId) {
    try {
      const creator = await Creator.findById(creatorId);
      if (!creator) return { success: false, error: 'Creator not found' };

      await CreatorTwin.findOneAndUpdate(
        { creatorId },
        {
          audienceTwin: {
            size: creator.audience.size,
            engagementRate: creator.audience.engagementRate
          },
          performanceTwin: {
            avgReach: creator.performance.avgReach,
            avgEngagement: creator.performance.avgEngagement,
            conversionRate: creator.performance.conversionRate
          },
          trustTwin: {
            score: creator.trustScore,
            completedCampaigns: creator.stats.campaignsCompleted,
            avgRating: creator.stats.avgRating
          },
          updatedAt: new Date()
        }
      );

      return { success: true };
    } catch (error) {
      logger.error('CreatorOS.updateCreatorTwin error:', error);
      return { success: false, error: error.message };
    }
  }

  calculateInfluenceScore(creator) {
    const engagementScore = Math.min(creator.audience.engagementRate * 10, 30);
    const reachScore = Math.min(Math.log10(creator.audience.size + 1) * 10, 40);
    const trustScore = creator.trustScore * 0.3;
    return Math.round(engagementScore + reachScore + trustScore);
  }

  // ========================================
  // CAMPAIGN MANAGEMENT
  // ========================================

  async createCampaign(data) {
    try {
      const campaign = new CreatorCampaign({
        brandId: data.brandId,
        name: data.name,
        description: data.description,
        targetCategories: data.categories || [],
        targetAudience: data.targetAudience || {},
        minFollowers: data.minFollowers || 0,
        maxBudget: data.budget,
        deliverables: data.deliverables || [],
        contentRequirements: data.contentRequirements || {},
        startDate: data.startDate,
        endDate: data.endDate,
        applicationDeadline: data.applicationDeadline
      });

      await campaign.save();

      // Match creators automatically
      if (data.autoMatch !== false) {
        const matches = await this.matchCreatorsToCampaign(campaign._id);
        campaign.matchedCreators = matches.data.map(m => m.creator._id);
        await campaign.save();
      }

      logger.info('Creator campaign created', { campaignId: campaign._id });

      return { success: true, data: campaign };
    } catch (error) {
      logger.error('CreatorOS.createCampaign error:', error);
      return { success: false, error: error.message };
    }
  }

  async matchCreatorsToCampaign(campaignId) {
    try {
      const campaign = await CreatorCampaign.findById(campaignId);
      if (!campaign) return { success: false, error: 'Campaign not found' };

      // Find matching creators
      const query = {
        status: 'active',
        'verification.status': 'verified'
      };

      if (campaign.targetCategories.length > 0) {
        query.categories = { $in: campaign.targetCategories };
      }
      if (campaign.minFollowers > 0) {
        query['audience.size'] = { $gte: campaign.minFollowers };
      }
      if (campaign.maxBudget > 0) {
        query['pricing.preferredRate'] = { $lte: campaign.maxBudget };
      }

      const creators = await Creator.find(query);

      // Score each creator
      const scored = await Promise.all(creators.map(async (creator) => {
        const twin = await this.getCreatorTwin(creator._id);
        const score = this.calculateMatchScore(campaign, twin.data, creator);
        return { creator, score, twin: twin.data };
      }));

      // Sort by score
      scored.sort((a, b) => b.score - a.score);

      // Update campaign with matched creators
      await CreatorCampaign.findByIdAndUpdate(campaignId, {
        matchedCreators: scored.slice(0, 50).map(s => s.creator._id)
      });

      return { success: true, data: scored.slice(0, campaign.maxCreators || 10) };
    } catch (error) {
      logger.error('CreatorOS.matchCreatorsToCampaign error:', error);
      return { success: false, error: error.message };
    }
  }

  calculateMatchScore(campaign, twin, creator) {
    let score = 0;

    // Category match (25%)
    const categoryMatch = campaign.targetCategories.filter(c =>
      creator.categories.includes(c)
    ).length;
    score += (categoryMatch / Math.max(campaign.targetCategories.length, 1)) * 25;

    // Audience fit (25%)
    const audienceFit = Math.min(creator.audience.size / campaign.minFollowers, 2) * 12.5;
    const engagementFit = creator.audience.engagementRate * 12.5;
    score += audienceFit + engagementFit;

    // Performance (25%)
    if (twin?.performanceTwin) {
      score += (twin.performanceTwin.avgEngagement / 10) * 10;
      score += (twin.performanceTwin.conversionRate / 10) * 10;
      score += (twin.performanceTwin.brandSentiment / 100) * 5;
    }

    // Trust (15%)
    if (twin?.trustTwin) {
      score += (twin.trustTwin.score / 100) * 15;
    }

    // Price fit (10%)
    const priceFit = campaign.maxBudget > 0
      ? (1 - (creator.pricing.preferredRate / campaign.maxBudget)) * 10
      : 5;
    score += Math.max(priceFit, 0);

    return Math.round(score * 100) / 100;
  }

  // ========================================
  // CONTRACT MANAGEMENT
  // ========================================

  async createContract(campaignId, creatorId, terms) {
    try {
      const contract = new Contract({
        campaignId,
        creatorId,
        brandId: terms.brandId,
        terms: {
          deliverables: terms.deliverables,
          compensation: terms.compensation,
          timeline: terms.timeline,
          usageRights: terms.usageRights
        },
        status: 'pending_creator'
      });

      // Create milestones from deliverables
      if (terms.compensation.paymentSchedule === 'milestone') {
        const milestoneCount = terms.deliverables.length || 1;
        const amountPerMilestone = terms.compensation.amount / milestoneCount;

        terms.deliverables.forEach((deliverable, index) => {
          contract.milestones.push({
            id: `milestone_${index + 1}`,
            description: deliverable.description || `Deliverable ${index + 1}`,
            amount: amountPerMilestone,
            dueDate: deliverable.deadline
          });
        });
      }

      await contract.save();

      // Update creator stats
      await Creator.findByIdAndUpdate(creatorId, {
        $inc: { 'stats.campaignsInProgress': 1 }
      });

      logger.info('Contract created', { contractId: contract._id });

      return { success: true, data: contract };
    } catch (error) {
      logger.error('CreatorOS.createContract error:', error);
      return { success: false, error: error.message };
    }
  }

  async signContract(contractId, signer, signature) {
    try {
      const contract = await Contract.findById(contractId);
      if (!contract) return { success: false, error: 'Contract not found' };

      if (signer === 'creator') {
        contract.signatures.creator = {
          signed: true,
          signature,
          signedAt: new Date()
        };
        if (contract.signatures.brand.signed) {
          contract.status = 'active';
        } else {
          contract.status = 'pending_brand';
        }
      } else if (signer === 'brand') {
        contract.signatures.brand = {
          signed: true,
          signature,
          signedAt: new Date()
        };
        if (contract.signatures.creator.signed) {
          contract.status = 'active';
        } else {
          contract.status = 'pending_creator';
        }
      }

      contract.updatedAt = new Date();
      await contract.save();

      return { success: true, data: contract };
    } catch (error) {
      logger.error('CreatorOS.signContract error:', error);
      return { success: false, error: error.message };
    }
  }

  async submitDeliverable(contractId, deliverableData) {
    try {
      const contract = await Contract.findById(contractId);
      if (!contract) return { success: false, error: 'Contract not found' };

      const deliverable = {
        id: `del_${Date.now()}`,
        type: deliverableData.type,
        contentUrl: deliverableData.url,
        submittedAt: new Date(),
        status: deliverableData.approvalRequired ? 'pending_review' : 'approved'
      };

      contract.deliverables.push(deliverable);
      contract.updatedAt = new Date();
      await contract.save();

      // Create UGC entry
      const ugc = new UGC({
        contractId,
        campaignId: contract.campaignId,
        creatorId: contract.creatorId,
        type: deliverableData.type,
        url: deliverableData.url,
        caption: deliverableData.caption,
        hashtags: deliverableData.hashtags,
        platform: deliverableData.platform || 'instagram',
        status: deliverableData.approvalRequired ? 'pending_review' : 'approved'
      });
      await ugc.save();

      return { success: true, data: { contract, ugc } };
    } catch (error) {
      logger.error('CreatorOS.submitDeliverable error:', error);
      return { success: false, error: error.message };
    }
  }

  async approveDeliverable(ugcId, feedback) {
    try {
      const ugc = await UGC.findByIdAndUpdate(
        ugcId,
        {
          status: 'approved',
          reviewedAt: new Date(),
          feedback
        },
        { new: true }
      );

      if (!ugc) return { success: false, error: 'UGC not found' };

      return { success: true, data: ugc };
    } catch (error) {
      logger.error('CreatorOS.approveDeliverable error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // PAYMENT PROCESSING
  // ========================================

  async processPayment(contractId, milestoneId) {
    try {
      const contract = await Contract.findById(contractId);
      if (!contract) return { success: false, error: 'Contract not found' };

      const milestone = contract.milestones.id(milestoneId);
      if (!milestone) return { success: false, error: 'Milestone not found' };

      // Calculate fees
      const grossAmount = milestone.amount;
      const platformFee = grossAmount * this.PLATFORM_FEE_RATE;
      const paymentGatewayFee = grossAmount * this.PAYMENT_GATEWAY_FEE + 3;
      const tax = (grossAmount - platformFee) * 0.18; // 18% GST
      const netAmount = grossAmount - platformFee - paymentGatewayFee - tax;

      // Create payment record
      const payment = new Payment({
        contractId,
        creatorId: contract.creatorId,
        campaignId: contract.campaignId,
        amount: grossAmount,
        breakdown: {
          grossAmount,
          platformFee,
          paymentGatewayFee,
          tax,
          netAmount
        },
        milestoneId,
        milestoneDescription: milestone.description,
        status: 'processing'
      });
      await payment.save();

      // Mark milestone as paid
      milestone.status = 'paid';
      milestone.paidAt = new Date();
      await contract.save();

      // Update creator stats
      await Creator.findByIdAndUpdate(contract.creatorId, {
        $inc: {
          'stats.totalEarnings': netAmount,
          'stats.pendingPayouts': netAmount
        }
      });

      // Update campaign stats
      await CreatorCampaign.findByIdAndUpdate(contract.campaignId, {
        $inc: { 'budgetAllocation.creatorPayout': netAmount }
      });

      logger.info('Payment processed', { paymentId: payment._id, amount: netAmount });

      return { success: true, data: payment };
    } catch (error) {
      logger.error('CreatorOS.processPayment error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCreatorEarnings(creatorId) {
    try {
      const payments = await Payment.find({ creatorId });

      const totalGross = payments.reduce((sum, p) => sum + p.amount, 0);
      const totalNet = payments.reduce((sum, p) => sum + p.breakdown.netAmount, 0);
      const totalPlatformFees = payments.reduce((sum, p) => sum + p.breakdown.platformFee, 0);

      const pending = await Payment.find({ creatorId, status: 'processing' });
      const pendingAmount = pending.reduce((sum, p) => sum + p.breakdown.netAmount, 0);

      return {
        success: true,
        data: {
          totalGross,
          totalNet,
          totalPlatformFees,
          pendingAmount,
          completedPayments: payments.filter(p => p.status === 'completed').length,
          pendingPayments: pending.length
        }
      };
    } catch (error) {
      logger.error('CreatorOS.getCreatorEarnings error:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // ANALYTICS & STATS
  // ========================================

  async getCreatorStats(creatorId) {
    try {
      const creator = await Creator.findById(creatorId);
      if (!creator) return { success: false, error: 'Creator not found' };

      // Get campaign history
      const campaigns = await Contract.find({ creatorId });
      const completedCampaigns = campaigns.filter(c => c.status === 'completed');

      // Get UGC performance
      const ugcs = await UGC.find({ creatorId });

      // Calculate averages
      const avgViews = ugcs.length > 0
        ? ugcs.reduce((sum, u) => sum + u.metrics.views, 0) / ugcs.length
        : 0;
      const avgEngagement = ugcs.length > 0
        ? ugcs.reduce((sum, u) => sum + u.metrics.likes + u.metrics.comments, 0) / ugcs.length
        : 0;

      return {
        success: true,
        data: {
          campaigns: {
            total: campaigns.length,
            completed: completedCampaigns.length,
            inProgress: campaigns.filter(c => c.status === 'active').length
          },
          ugc: {
            total: ugcs.length,
            avgViews: Math.round(avgViews),
            avgEngagement: Math.round(avgEngagement)
          },
          earnings: {
            total: creator.stats.totalEarnings,
            pending: creator.stats.pendingPayouts
          },
          performance: {
            avgRating: creator.stats.avgRating,
            totalReviews: creator.stats.totalReviews
          }
        }
      };
    } catch (error) {
      logger.error('CreatorOS.getCreatorStats error:', error);
      return { success: false, error: error.message };
    }
  }

  async getCampaignAnalytics(campaignId) {
    try {
      const campaign = await CreatorCampaign.findById(campaignId);
      if (!campaign) return { success: false, error: 'Campaign not found' };

      const contracts = await Contract.find({ campaignId });
      const ugcs = await UGC.find({ campaignId });

      // Calculate aggregated metrics
      const totalViews = ugcs.reduce((sum, u) => sum + u.metrics.views, 0);
      const totalEngagement = ugcs.reduce((sum, u) => sum + u.metrics.likes + u.metrics.comments + u.metrics.shares, 0);
      const totalReach = ugcs.reduce((sum, u) => sum + u.metrics.reach, 0);

      return {
        success: true,
        data: {
          campaign: {
            name: campaign.name,
            status: campaign.status,
            budget: campaign.maxBudget
          },
          contracts: {
            total: contracts.length,
            active: contracts.filter(c => c.status === 'active').length,
            completed: contracts.filter(c => c.status === 'completed').length
          },
          ugc: {
            total: ugcs.length,
            approved: ugcs.filter(u => u.status === 'approved').length,
            pending: ugcs.filter(u => u.status === 'pending_review').length
          },
          performance: {
            totalViews,
            totalEngagement,
            totalReach,
            avgViewsPerUGC: ugcs.length > 0 ? Math.round(totalViews / ugcs.length) : 0,
            avgEngagementPerUGC: ugcs.length > 0 ? Math.round(totalEngagement / ugcs.length) : 0,
            engagementRate: totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : 0
          }
        }
      };
    } catch (error) {
      logger.error('CreatorOS.getCampaignAnalytics error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton and models
const creatorOS = new CreatorOS();
module.exports = {
  creatorOS,
  Creator,
  CreatorTwin,
  CreatorCampaign,
  Contract,
  UGC,
  Payment
};
