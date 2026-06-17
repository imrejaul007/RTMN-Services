/**
 * Marketing OS - Joi Validation Schemas
 */

const Joi = require('joi');

// Common schemas
const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
const email = Joi.string().email();
const date = Joi.date();
const url = Joi.string().uri();

// Brand schemas
const brandSchema = {
  create: Joi.object({
    name: Joi.string().required().max(100),
    displayName: Joi.string().max(100),
    tagline: Joi.string().max(200),
    description: Joi.string().max(1000),
    industry: Joi.string(),
    organizationId: Joi.string().required(),
  }),

  update: Joi.object({
    name: Joi.string().max(100),
    displayName: Joi.string().max(100),
    tagline: Joi.string().max(200),
    description: Joi.string().max(1000),
    industry: Joi.string(),
  }),
};

// Campaign schemas
const campaignSchema = {
  create: Joi.object({
    name: Joi.string().required().max(200),
    title: Joi.string().max(200),
    description: Joi.string().max(2000),
    type: Joi.string().valid(
      'awareness', 'consideration', 'conversion', 'retargeting',
      'brand', 'product_launch', 'seasonal', 'event', 'loyalty'
    ).required(),
    category: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    brandId: objectId,
    organizationId: Joi.string().required(),
    startDate: date.required(),
    endDate: date.required(),
    budget: Joi.object({
      total: Joi.number().positive().required(),
      currency: Joi.string().default('INR'),
    }).required(),
    goals: Joi.array().items(Joi.object({
      type: Joi.string().valid('impressions', 'clicks', 'conversions', 'reach', 'engagement', 'revenue').required(),
      target: Joi.number().positive().required(),
    })),
  }),

  update: Joi.object({
    name: Joi.string().max(200),
    title: Joi.string().max(200),
    description: Joi.string().max(2000),
    type: Joi.string().valid(
      'awareness', 'consideration', 'conversion', 'retargeting',
      'brand', 'product_launch', 'seasonal', 'event', 'loyalty'
    ),
    tags: Joi.array().items(Joi.string()),
    startDate: date,
    endDate: date,
    budget: Joi.object({
      total: Joi.number().positive(),
      spent: Joi.number().min(0),
    }),
    status: Joi.string().valid(
      'planning', 'approved', 'launching', 'active', 'paused', 'completed', 'cancelled'
    ),
  }),
};

// Journey schemas
const journeySchema = {
  create: Joi.object({
    name: Joi.string().required().max(200),
    title: Joi.string().max(200),
    description: Joi.string().max(2000),
    type: Joi.string().valid(
      'onboarding', 'welcome', 'abandoned_cart', 'win_back',
      'reengagement', 'upsell', 'cross_sell', 'loyalty', 'event', 'custom'
    ).required(),
    category: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    organizationId: Joi.string().required(),
    trigger: Joi.object({
      type: Joi.string().valid('event', 'segment', 'manual', 'api', 'schedule', 'form', 'purchase', 'abandon').required(),
      event: Joi.string(),
      segmentId: Joi.string(),
    }).required(),
    steps: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('email', 'sms', 'whatsapp', 'push', 'delay', 'condition', 'action', 'webhook', 'ai').required(),
      order: Joi.number().required(),
      config: Joi.object(),
    })),
    goal: Joi.object({
      type: Joi.string().valid('conversion', 'engagement', 'retention', 'revenue', 'custom'),
      metric: Joi.string(),
      target: Joi.number().positive(),
    }),
  }),
};

// Lead schemas
const leadSchema = {
  create: Joi.object({
    email: email.required(),
    phone: Joi.string().pattern(/^[+]?[0-9]{10,15}$/),
    firstName: Joi.string().required().max(100),
    lastName: Joi.string().max(100),
    company: Joi.string().max(200),
    jobTitle: Joi.string().max(100),
    organizationId: Joi.string().required(),
    source: Joi.string().valid(
      'organic', 'paid', 'referral', 'social', 'email', 'event', 'webinar', 'other'
    ),
    campaignId: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  }),

  update: Joi.object({
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
    company: Joi.string().max(200),
    jobTitle: Joi.string().max(100),
    phone: Joi.string(),
    status: Joi.string().valid(
      'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
    ),
    score: Joi.number().min(0).max(100),
    tags: Joi.array().items(Joi.string()),
    notes: Joi.string().max(5000),
  }),
};

// Validation middleware factory
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      });
    }

    req[property] = value;
    next();
  };
}

module.exports = {
  validate,
  brandSchema,
  campaignSchema,
  journeySchema,
  leadSchema,
  objectId,
  email,
};
