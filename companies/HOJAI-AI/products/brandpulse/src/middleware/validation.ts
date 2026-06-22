import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Brand schemas
export const CreateBrandSchema = z.object({
  brandId: z.string().min(1),
  tenantId: z.string().min(1),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  description: z.string().max(2000).optional(),
  industry: z.string().optional(),
  category: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().url().optional(),
    twitter: z.string().url().optional(),
    instagram: z.string().url().optional(),
    linkedin: z.string().url().optional()
  }).optional(),
  settings: z.object({
    sentimentThreshold: z.number().min(-1).max(1).optional(),
    autoModerate: z.boolean().optional(),
    alertChannels: z.array(z.string()).optional(),
    responseTemplates: z.object({
      positive: z.string().optional(),
      neutral: z.string().optional(),
      negative: z.string().optional()
    }).optional()
  }).optional(),
  integrations: z.object({
    google: z.object({
      enabled: z.boolean(),
      apiKey: z.string().optional()
    }).optional(),
    yelp: z.object({
      enabled: z.boolean(),
      businessId: z.string().optional()
    }).optional(),
    tripadvisor: z.object({
      enabled: z.boolean(),
      propertyId: z.string().optional()
    }).optional(),
    facebook: z.object({
      enabled: z.boolean(),
      pageId: z.string().optional()
    }).optional()
  }).optional()
});

export const UpdateBrandSchema = CreateBrandSchema.partial();

// Review schemas
export const CreateReviewSchema = z.object({
  brandId: z.string().min(1),
  tenantId: z.string().min(1),
  source: z.enum(['google', 'yelp', 'tripadvisor', 'facebook', 'direct', 'internal']),
  content: z.string().min(1).max(5000),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  author: z.object({
    name: z.string().min(1),
    avatar: z.string().url().optional(),
    isVerified: z.boolean().optional(),
    reviewCount: z.number().int().optional()
  }),
  sourceId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  publishedAt: z.string().datetime().optional(),
  metadata: z.object({
    location: z.string().optional(),
    device: z.string().optional(),
    language: z.string().optional(),
    verified: z.boolean().optional(),
    sponsored: z.boolean().optional()
  }).optional()
});

export const BulkReviewSchema = z.object({
  reviews: z.array(CreateReviewSchema).min(1).max(100)
});

// Query schemas
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

export const DateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const ReviewFilterSchema = z.object({
  ...PaginationSchema.shape,
  ...DateRangeSchema.shape,
  source: z.enum(['google', 'yelp', 'tripadvisor', 'facebook', 'direct', 'internal']).optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
  rating: z.object({
    min: z.number().int().min(1).max(5).optional(),
    max: z.number().int().min(1).max(5).optional()
  }).optional(),
  sortBy: z.enum(['publishedAt', 'rating', 'sentiment']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export function validate<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { valid: true; data: z.infer<T> } | { valid: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
  return { valid: false, errors };
}

/**
 * Express middleware for request validation
 */
export function validateRequest<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const result = validate(schema, req.body);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        errors: (result as { valid: false; errors: string[] }).errors
      });
    }

    req.validatedBody = (result as { valid: true; data: z.infer<T> }).data;
    next();
  };
}

/**
 * Express middleware for query validation
 */
export function validateQueryParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      });
    }

    req.validatedQuery = result.data;
    next();
  };
}