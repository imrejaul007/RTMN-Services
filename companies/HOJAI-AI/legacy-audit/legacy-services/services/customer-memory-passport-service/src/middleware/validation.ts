import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import {
  MemoryType,
  MemoryImportance,
  SentimentLabel,
  InteractionChannel,
  InteractionType,
  GraphNodeType,
  GraphRelationshipType,
} from '../models/passport.js';

// ============================================
// CUSTOMER PASSPORT SCHEMAS
// ============================================

export const createPassportSchema = z.object({
  customerId: z
    .string()
    .min(1, 'Customer ID is required')
    .max(255, 'Customer ID too long'),
  customerEmail: z
    .string()
    .email('Invalid email format')
    .optional(),
  customerPhone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  customerName: z
    .string()
    .min(1, 'Customer name cannot be empty')
    .max(255, 'Customer name too long')
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const updatePassportSchema = z.object({
  customerEmail: z
    .string()
    .email('Invalid email format')
    .optional(),
  customerPhone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  customerName: z
    .string()
    .min(1)
    .max(255)
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// MEMORY SCHEMAS
// ============================================

export const memoryTagSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  confidence: z.number().min(0).max(1).default(1),
});

export const addMemorySchema = z.object({
  type: z.nativeEnum(MemoryType, {
    errorMap: () => ({ message: 'Invalid memory type' }),
  }),
  title: z
    .string()
    .min(1, 'Title is required')
    .max(500, 'Title too long'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(50000, 'Content too long'),
  summary: z
    .string()
    .max(1000, 'Summary too long')
    .optional(),
  importance: z
    .nativeEnum(MemoryImportance)
    .default(MemoryImportance.MEDIUM),
  tags: z.array(memoryTagSchema).max(50).default([]),
  source: z
    .string()
    .min(1, 'Source is required')
    .max(255),
  sourceId: z.string().max(255).optional(),
  channel: z
    .nativeEnum(InteractionChannel)
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  sentiment: z
    .nativeEnum(SentimentLabel)
    .optional(),
  sentimentScore: z
    .number()
    .min(-1)
    .max(1)
    .optional(),
  entities: z.array(z.string().max(255)).max(100).optional(),
  keywords: z.array(z.string().max(100)).max(50).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const updateMemorySchema = z.object({
  title: z
    .string()
    .min(1)
    .max(500)
    .optional(),
  content: z
    .string()
    .min(1)
    .max(50000)
    .optional(),
  summary: z
    .string()
    .max(1000)
    .optional(),
  importance: z
    .nativeEnum(MemoryImportance)
    .optional(),
  tags: z.array(memoryTagSchema).max(50).optional(),
  metadata: z.record(z.unknown()).optional(),
  sentiment: z
    .nativeEnum(SentimentLabel)
    .optional(),
  sentimentScore: z
    .number()
    .min(-1)
    .max(1)
    .optional(),
});

export const deleteMemorySchema = z.object({
  deletedBy: z.string().max(255).optional(),
});

// ============================================
// MEMORY FILTERS SCHEMA
// ============================================

export const memoryFiltersSchema = z.object({
  type: z
    .union([z.nativeEnum(MemoryType), z.array(z.nativeEnum(MemoryType))])
    .optional(),
  importance: z
    .union([z.nativeEnum(MemoryImportance), z.array(z.nativeEnum(MemoryImportance))])
    .optional(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  channel: z.nativeEnum(InteractionChannel).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeDeleted: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(1000))
    .optional(),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0))
    .optional(),
});

// ============================================
// SEARCH SCHEMA
// ============================================

export const searchQuerySchema = z.object({
  query: z
    .string()
    .min(1, 'Search query is required')
    .max(500, 'Search query too long'),
  limit: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('50'),
  offset: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(0))
    .optional()
    .default('0'),
  types: z
    .string()
    .transform((val) => val.split(',').map((t) => t.trim()))
    .pipe(z.array(z.nativeEnum(MemoryType)))
    .optional(),
  companyId: z.string().optional(),
});

// ============================================
// COMPANY LINK SCHEMA
// ============================================

export const linkCompanySchema = z.object({
  companyId: z
    .string()
    .min(1, 'Company ID is required')
    .max(255),
  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(255),
  linkedBy: z.string().max(255).optional(),
  status: z.enum(['active', 'inactive', 'churned']).default('active'),
  lifetimeValue: z.number().min(0).default(0),
  engagementScore: z.number().min(0).max(100).default(0),
  preferences: z.record(z.unknown()).default({}),
});

// ============================================
// CONTEXT SCHEMA
// ============================================

export const contextOptionsSchema = z.object({
  includeMemories: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('10'),
  includeInteractions: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100))
    .optional()
    .default('5'),
  includePreferences: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default('true'),
  includeSentiment: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default('true'),
  includePatterns: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default('false'),
});

// ============================================
// GRAPH SCHEMAS
// ============================================

export const createNodeSchema = z.object({
  type: z.nativeEnum(GraphNodeType),
  label: z
    .string()
    .min(1, 'Label is required')
    .max(255),
  properties: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const createEdgeSchema = z.object({
  sourceId: z
    .string()
    .min(1, 'Source ID is required'),
  targetId: z
    .string()
    .min(1, 'Target ID is required'),
  relationship: z.nativeEnum(GraphRelationshipType),
  properties: z.record(z.unknown()).optional(),
  weight: z.number().min(0).max(1).optional(),
});

export const findPathSchema = z.object({
  startType: z.nativeEnum(GraphNodeType),
  endType: z.nativeEnum(GraphNodeType),
});

// ============================================
// INTERACTION SCHEMAS
// ============================================

export const addInteractionSchema = z.object({
  type: z.nativeEnum(InteractionType),
  channel: z.nativeEnum(InteractionChannel),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
  duration: z.number().min(0).optional(),
  summary: z
    .string()
    .min(1, 'Summary is required')
    .max(5000),
  outcome: z.string().max(5000).optional(),
  sentiment: z.nativeEnum(SentimentLabel).optional(),
  sentimentScore: z.number().min(-1).max(1).optional(),
  agentId: z.string().optional(),
  agentName: z.string().optional(),
  companyId: z
    .string()
    .min(1, 'Company ID is required'),
  companyName: z.string().optional(),
  relatedMemories: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ============================================
// MERGE SCHEMA
// ============================================

export const mergePassportsSchema = z.object({
  sourceId: z
    .string()
    .min(1, 'Source ID is required'),
  targetId: z
    .string()
    .min(1, 'Target ID is required'),
  strategy: z
    .enum(['source_wins', 'target_wins', 'newest', 'highest_importance'])
    .default('newest'),
});

// ============================================
// VALIDATION MIDDLEWARE FACTORIES
// ============================================

type ValidationSchema = z.ZodSchema<unknown>;

export const validate = (schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const dataToValidate = req[source];

    try {
      const result = schema.parse(dataToValidate);

      if (source === 'body') {
        req.body = result;
      } else if (source === 'query') {
        req.query = result as typeof req.query;
      } else if (source === 'params') {
        req.params = result as typeof req.params;
      }

      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation error', {
          path: req.path,
          errors,
        });

        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors,
          },
        });
        return;
      }

      next(error);
    }
  };
};

export const validateCreatePassport = validate(createPassportSchema, 'body');
export const validateUpdatePassport = validate(updatePassportSchema, 'body');
export const validateAddMemory = validate(addMemorySchema, 'body');
export const validateUpdateMemory = validate(updateMemorySchema, 'body');
export const validateDeleteMemory = validate(deleteMemorySchema, 'body');
export const validateMemoryFilters = validate(memoryFiltersSchema, 'query');
export const validateSearchQuery = validate(searchQuerySchema, 'query');
export const validateLinkCompany = validate(linkCompanySchema, 'body');
export const validateContextOptions = validate(contextOptionsSchema, 'query');
export const validateCreateNode = validate(createNodeSchema, 'body');
export const validateCreateEdge = validate(createEdgeSchema, 'body');
export const validateFindPath = validate(findPathSchema, 'query');
export const validateAddInteraction = validate(addInteractionSchema, 'body');
export const validateMergePassports = validate(mergePassportsSchema, 'body');

// ============================================
// PARAM VALIDATION
// ============================================

export const validateCustomerId = (req: Request, res: Response, next: NextFunction): void => {
  const { customerId } = req.params;

  if (!customerId || typeof customerId !== 'string' || customerId.length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETER',
        message: 'Customer ID is required',
      },
    });
    return;
  }

  if (customerId.length > 255) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETER',
        message: 'Customer ID too long',
      },
    });
    return;
  }

  next();
};

export const validateMemoryId = (req: Request, res: Response, next: NextFunction): void => {
  const { memoryId } = req.params;

  if (!memoryId || typeof memoryId !== 'string' || memoryId.length === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_PARAMETER',
        message: 'Memory ID is required',
      },
    });
    return;
  }

  next();
};

export const validateUUID = (paramName: string) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  return (req: Request, res: Response, next: NextFunction): void => {
    const value = req.params[paramName];

    if (!value || !uuidRegex.test(value)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMETER',
          message: `Invalid ${paramName} format`,
        },
      });
      return;
    }

    next();
  };
};
