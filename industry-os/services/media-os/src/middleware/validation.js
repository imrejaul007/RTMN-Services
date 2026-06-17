/**
 * Media OS - Validation Middleware
 * Request validation using Joi schemas
 */

const Joi = require('joi');

/**
 * Validation middleware factory
 * Creates middleware that validates request against schema
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors,
      });
    }

    // Replace request property with validated/sanitized value
    req[property] = value;
    next();
  };
}

/**
 * Validate query parameters
 */
function validateQuery(schema) {
  return validate(schema, 'query');
}

/**
 * Validate URL parameters
 */
function validateParams(schema) {
  return validate(schema, 'params');
}

// ============================================
// AUTH SCHEMAS
// ============================================

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  name: Joi.string().min(2).max(100).required(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/),
  businessId: Joi.string(),
  role: Joi.string().valid('viewer', 'creator', 'advertiser', 'admin').default('viewer'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ============================================
// VIEWER SCHEMAS
// ============================================

const createViewerSchema = Joi.object({
  displayName: Joi.string().min(2).max(100).required(),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/),
  avatar: Joi.string().uri(),
  dateOfBirth: Joi.date().max('now').iso(),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
  location: Joi.object({
    city: Joi.string().max(100),
    state: Joi.string().max(100),
    country: Joi.string().max(100).default('India'),
    pincode: Joi.string().max(20),
  }),
  preferences: Joi.object({
    language: Joi.array().items(Joi.string()),
    genres: Joi.array().items(Joi.string()),
    maturityRating: Joi.string().valid('G', 'PG', 'PG-13', 'UA', 'A', 'adult'),
    subtitles: Joi.boolean().default(true),
    autoplay: Joi.boolean().default(true),
  }),
});

const updateViewerSchema = Joi.object({
  displayName: Joi.string().min(2).max(100),
  avatar: Joi.string().uri(),
  dateOfBirth: Joi.date().max('now').iso(),
  gender: Joi.string().valid('male', 'female', 'other', 'prefer_not_to_say'),
  location: Joi.object({
    city: Joi.string().max(100),
    state: Joi.string().max(100),
    country: Joi.string().max(100),
    pincode: Joi.string().max(20),
  }),
  preferences: Joi.object({
    language: Joi.array().items(Joi.string()),
    genres: Joi.array().items(Joi.string()),
    maturityRating: Joi.string().valid('G', 'PG', 'PG-13', 'UA', 'A', 'adult'),
    subtitles: Joi.boolean(),
    autoplay: Joi.boolean(),
  }),
});

// ============================================
// CONTENT SCHEMAS
// ============================================

const createContentSchema = Joi.object({
  title: Joi.string().min(1).max(500).required(),
  originalTitle: Joi.string().max(500),
  synopsis: Joi.string().max(2000),
  description: Joi.string().max(5000),
  type: Joi.string().valid(
    'movie', 'series', 'episode', 'podcast', 'short', 'reel', 'live', 'documentary', 'music_video'
  ).required(),
  language: Joi.string().required(),
  genres: Joi.array().items(Joi.string()).min(1).required(),
  tags: Joi.array().items(Joi.string()),
  rating: Joi.string().valid('G', 'PG', 'PG-13', 'UA', 'A', 'adult'),
  releaseDate: Joi.date().iso(),
  duration: Joi.number().integer().min(1), // in minutes
  thumbnail: Joi.string().uri(),
  poster: Joi.string().uri(),
  videoUrl: Joi.string().uri(),
  cast: Joi.array().items(Joi.object({
    name: Joi.string().required(),
    role: Joi.string(),
    image: Joi.string().uri(),
    type: Joi.string().valid('actor', 'director', 'producer', 'writer', 'crew'),
  })),
  status: Joi.string().valid('draft', 'processing', 'ready', 'published', 'archived'),
});

const updateContentSchema = Joi.object({
  title: Joi.string().min(1).max(500),
  originalTitle: Joi.string().max(500),
  synopsis: Joi.string().max(2000),
  description: Joi.string().max(5000),
  genres: Joi.array().items(Joi.string()).min(1),
  tags: Joi.array().items(Joi.string()),
  rating: Joi.string().valid('G', 'PG', 'PG-13', 'UA', 'A', 'adult'),
  thumbnail: Joi.string().uri(),
  poster: Joi.string().uri(),
  status: Joi.string().valid('draft', 'processing', 'ready', 'published', 'archived'),
});

// ============================================
// CAMPAIGN SCHEMAS
// ============================================

const createCampaignSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  advertiserId: Joi.string().required(),
  objective: Joi.string().valid(
    'awareness', 'consideration', 'conversion', 'traffic', 'engagement', 'product_launch'
  ).required(),
  schedule: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
    timezone: Joi.string().default('Asia/Kolkata'),
    daysOfWeek: Joi.array().items(Joi.number().min(0).max(6)),
  }).required(),
  targeting: Joi.object({
    demographics: Joi.object({
      ageRange: Joi.object({ min: Joi.number().min(0), max: Joi.number().max(100) }),
      gender: Joi.array().items(Joi.string().valid('male', 'female', 'other')),
      locations: Joi.array().items(Joi.object({
        type: Joi.string().valid('country', 'state', 'city'),
        value: Joi.string(),
      })),
      language: Joi.array().items(Joi.string()),
    }),
  }),
  budget: Joi.object({
    total: Joi.number().positive().required(),
    daily: Joi.number().positive(),
    currency: Joi.string().default('INR'),
  }).required(),
  bidding: Joi.object({
    strategy: Joi.string().valid('cpm', 'cpc', 'cpv', 'cpa', 'fixed'),
    maxBid: Joi.number().positive(),
    pacing: Joi.string().valid('standard', 'accelerated'),
  }),
});

// ============================================
// CREATOR SCHEMAS
// ============================================

const createCreatorSchema = Joi.object({
  displayName: Joi.string().min(2).max(100).required(),
  handle: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/).required(),
  bio: Joi.string().max(500),
  email: Joi.string().email(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{6,14}$/),
  avatar: Joi.string().uri(),
  niche: Joi.array().items(Joi.string()).min(1),
  contentTypes: Joi.array().items(Joi.string().valid('video', 'shorts', 'reels', 'podcast', 'blog', 'live')),
  languages: Joi.array().items(Joi.string()),
});

const updateCreatorSchema = Joi.object({
  displayName: Joi.string().min(2).max(100),
  bio: Joi.string().max(500),
  avatar: Joi.string().uri(),
  coverImage: Joi.string().uri(),
  niche: Joi.array().items(Joi.string()).min(1),
  contentTypes: Joi.array().items(Joi.string().valid('video', 'shorts', 'reels', 'podcast', 'blog', 'live')),
  languages: Joi.array().items(Joi.string()),
  socialLinks: Joi.object({
    youtube: Joi.string().uri(),
    instagram: Joi.string(),
    twitter: Joi.string(),
    tiktok: Joi.string(),
    facebook: Joi.string(),
    website: Joi.string().uri(),
  }),
});

// ============================================
// CHANNEL SCHEMAS
// ============================================

const createChannelSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  type: Joi.string().valid(
    'news', 'movie', 'sports', 'music', 'kids', 'entertainment', 'lifestyle', 'infotainment', 'regional', 'international'
  ).required(),
  category: Joi.string().required(),
  language: Joi.string().required(),
  region: Joi.array().items(Joi.string()),
  logo: Joi.string().uri(),
  tagline: Joi.string().max(200),
  description: Joi.string().max(1000),
  subscriptionType: Joi.string().valid('free', 'freemium', 'premium'),
  adSupported: Joi.boolean().default(true),
  hdAvailable: Joi.boolean().default(false),
});

// ============================================
// SUBSCRIPTION SCHEMAS
// ============================================

const createSubscriptionSchema = Joi.object({
  viewerId: Joi.string().required(),
  plan: Joi.object({
    type: Joi.string().valid('free', 'basic', 'premium', 'family', 'vip').required(),
    name: Joi.string(),
    description: Joi.string(),
  }).required(),
  pricing: Joi.object({
    amount: Joi.number().required(),
    currency: Joi.string().default('INR'),
    billingCycle: Joi.string().valid('monthly', 'quarterly', 'yearly').default('monthly'),
  }).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  payment: Joi.object({
    method: Joi.string().valid('card', 'upi', 'netbanking', 'wallet', 'gift'),
    autoRenew: Joi.boolean().default(true),
  }),
});

// ============================================
// PAGINATION SCHEMA
// ============================================

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().max(200),
});

// ============================================
// ID PARAM SCHEMA
// ============================================

const mongoIdSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
});

// ============================================
// WATCH HISTORY SCHEMA
// ============================================

const watchHistorySchema = Joi.object({
  contentId: Joi.string().required(),
  progress: Joi.number().min(0).max(100),
  watchTime: Joi.number().min(0),
});

// ============================================
// REVIEW SCHEMA
// ============================================

const createReviewSchema = Joi.object({
  contentId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  title: Joi.string().max(200),
  text: Joi.string().max(2000),
});

module.exports = {
  validate,
  validateQuery,
  validateParams,
  // Auth
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  // Viewer
  createViewerSchema,
  updateViewerSchema,
  // Content
  createContentSchema,
  updateContentSchema,
  // Campaign
  createCampaignSchema,
  // Creator
  createCreatorSchema,
  updateCreatorSchema,
  // Channel
  createChannelSchema,
  // Subscription
  createSubscriptionSchema,
  // Common
  paginationSchema,
  mongoIdSchema,
  watchHistorySchema,
  createReviewSchema,
};
