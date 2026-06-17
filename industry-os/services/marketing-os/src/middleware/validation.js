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
    logo: Joi.object({
      primary: url,
      secondary: url,
      icon: url,
      dark: url,
      light: url,
    }),
    colors: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      hex: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
      usage: Joi.array().items(Joi.string()),
    })),
    typography: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      family: Joi.string().required(),
      weights: Joi.array().items(Joi.string()),
      usage: Joi.string(),
    })),
    guidelines: Joi.object({
      voice: Joi.string(),
      tone: Joi.array().items(Joi.string()),
      messaging: Joi.string(),
      dos: Joi.array().items(Joi.string()),
      donts: Joi.array().items(Joi.string()),
    }),
    industry: Joi.string(),
    positioning: Joi.string(),
    mission: Joi.string(),
    vision: Joi.string(),
    values: Joi.array().items(Joi.string()),
    organizationId: Joi.string().required(),
  }),

  update: Joi.object({
    name: Joi.string().max(100),
    displayName: Joi.string().max(100),
    tagline: Joi.string().max(200),
    description: Joi.string().max(1000),
    colors: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      hex: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
    })),
    industry: Joi.string(),
    positioning: Joi.string(),
    mission: Joi.string(),
    vision: Joi.string(),
    values: Joi.array().items(Joi.string()),
  }),
};

// Campaign schemas
const campaignSchema = {
  create: Joi.object({
    name: Joi.string().required().max(200),
    title: Joi.string().max(200),
    description: Joi.string().max(2000),
    brief: Joi.string().max(5000),
    type: Joi.string().valid(
      'awareness', 'consideration', 'conversion', 'retargeting',
      'brand', 'product_launch', 'seasonal', 'event', 'loyalty'
    ).required(),
    category: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    brandId: objectId,
    brandName: Joi.string(),
    organizationId: Joi.string().required(),
    startDate: date.required(),
    endDate: date.required(),
    budget: Joi.object({
      total: Joi.number().positive().required(),
      currency: Joi.string().default('INR'),
    }).required(),
    channels: Joi.array().items(Joi.object({
      channel: Joi.string().required(),
      budget: Joi.number().min(0),
    })),
    audience: Joi.object({
      segmentId: Joi.string(),
      description: Joi.string(),
      demographics: Joi.object(),
      interests: Joi.array().items(Joi.string()),
      behaviors: Joi.array().items(Joi.string()),
    }),
    targeting: Joi.object({
      locations: Joi.array().items(Joi.string()),
      ageMin: Joi.number().min(13).max(100),
      ageMax: Joi.number().min(13).max(100),
      gender: Joi.array().items(Joi.string()),
      devices: Joi.array().items(Joi.string()),
      platforms: Joi.array().items(Joi.string()),
    }),
    goals: Joi.array().items(Joi.object({
      type: Joi.string().valid('impressions', 'clicks', 'conversions', 'reach', 'engagement', 'revenue').required(),
      target: Joi.number().positive().required(),
      unit: Joi.string(),
    })),
    primaryGoal: Joi.string(),
    team: Joi.array().items(Joi.object({
      userId: Joi.string().required(),
      name: Joi.string(),
      email: email,
      role: Joi.string().valid('owner', 'manager', 'analyst', 'designer', 'content'),
    })),
  }),

  update: Joi.object({
    name: Joi.string().max(200),
    title: Joi.string().max(200),
    description: Joi.string().max(2000),
    brief: Joi.string().max(5000),
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

  launch: Joi.object({
    force: Joi.boolean().default(false),
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
      schedule: Joi.string(),
      conditions: Joi.object(),
    }).required(),
    entryCriteria: Joi.object({
      type: Joi.string().valid('all', 'any', 'none', 'custom'),
      conditions: Joi.array().items(Joi.object({
        field: Joi.string().required(),
        operator: Joi.string().required(),
        value: Joi.any().required(),
      })),
    }),
    steps: Joi.array().items(Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('email', 'sms', 'whatsapp', 'push', 'delay', 'condition', 'action', 'webhook', 'ai').required(),
      order: Joi.number().required(),
      config: Joi.object(),
      branches: Joi.array().items(Joi.object()),
      timing: Joi.object(),
    })),
    goal: Joi.object({
      type: Joi.string().valid('conversion', 'engagement', 'retention', 'revenue', 'custom'),
      metric: Joi.string(),
      target: Joi.number().positive(),
    }),
    settings: Joi.object({
      allowReentry: Joi.boolean(),
      reentryDelay: Joi.number().positive(),
      priority: Joi.number().min(1).max(10),
      consentRequired: Joi.boolean(),
    }),
  }),

  addStep: Joi.object({
    name: Joi.string().required(),
    type: Joi.string().valid('email', 'sms', 'whatsapp', 'push', 'delay', 'condition', 'action', 'webhook', 'ai').required(),
    order: Joi.number(),
    config: Joi.object({
      emailTemplate: Joi.string(),
      emailSubject: Joi.string(),
      messageTemplate: Joi.string(),
      delayDuration: Joi.number().positive(),
      delayUnit: Joi.string().valid('minutes', 'hours', 'days', 'weeks'),
      webhookUrl: url,
      webhookMethod: Joi.string().valid('GET', 'POST'),
      aiAgent: Joi.string(),
    }),
    timing: Joi.object({
      sendTime: Joi.string().valid('immediately', 'scheduled', 'optimal'),
      scheduledTime: Joi.string(),
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
    medium: Joi.string(),
    tags: Joi.array().items(Joi.string()),
    customFields: Joi.object(),
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
    customFields: Joi.object(),
    notes: Joi.string().max(5000),
  }),
};

// Pagination schema
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default('-createdAt'),
  search: Joi.string().max(200),
});

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
  paginationSchema,
  brandSchema,
  campaignSchema,
  journeySchema,
  leadSchema,
  objectId,
  email,
};
