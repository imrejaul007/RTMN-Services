import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { identityService } from '../services/identity.service';
import { IdentityType, IIdentity } from '../models/identity.model';
import { logger } from '../utils/logger';

// Typed interfaces for validated data
interface CreateIdentityInput {
  type: IdentityType;
  identifier: string;
  metadata?: {
    source?: string;
    userAgent?: string;
    ipAddress?: string;
    platform?: string;
    appVersion?: string;
    traits?: Record<string, unknown>;
  };
  privacySettings?: {
    trackingEnabled?: boolean;
    dataRetentionDays?: number;
    marketingConsent?: boolean;
    analyticsConsent?: boolean;
    thirdPartySharing?: boolean;
  };
}

interface UpdateIdentityInput {
  metadata?: {
    source?: string;
    userAgent?: string;
    ipAddress?: string;
    platform?: string;
    appVersion?: string;
    traits?: Record<string, unknown>;
  };
  privacySettings?: {
    trackingEnabled?: boolean;
    dataRetentionDays?: number;
    marketingConsent?: boolean;
    analyticsConsent?: boolean;
    thirdPartySharing?: boolean;
  };
}

const router = Router();

const createIdentitySchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(IdentityType))
    .required(),
  identifier: Joi.string().required(),
  metadata: Joi.object({
    source: Joi.string(),
    userAgent: Joi.string(),
    ipAddress: Joi.string(),
    platform: Joi.string(),
    appVersion: Joi.string(),
    traits: Joi.object()
  }),
  privacySettings: Joi.object({
    trackingEnabled: Joi.boolean(),
    dataRetentionDays: Joi.number(),
    marketingConsent: Joi.boolean(),
    analyticsConsent: Joi.boolean(),
    thirdPartySharing: Joi.boolean()
  })
});

const updateIdentitySchema = Joi.object({
  metadata: Joi.object({
    source: Joi.string(),
    userAgent: Joi.string(),
    ipAddress: Joi.string(),
    platform: Joi.string(),
    appVersion: Joi.string(),
    traits: Joi.object()
  }),
  privacySettings: Joi.object({
    trackingEnabled: Joi.boolean(),
    dataRetentionDays: Joi.number(),
    marketingConsent: Joi.boolean(),
    analyticsConsent: Joi.boolean(),
    thirdPartySharing: Joi.boolean()
  })
});

const resolveSchema = Joi.object({
  identityId: Joi.string(),
  type: Joi.string().valid(...Object.values(IdentityType)),
  identifier: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string(),
  clusterId: Joi.string()
}).or('identityId', 'type', 'identifier', 'email', 'phone', 'clusterId');

async function validateRequest(schema: Joi.Schema, data: unknown): Promise<unknown> {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw new Error(`Validation error: ${error.details.map((d) => d.message).join(', ')}`);
  }
  return value;
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = await validateRequest(createIdentitySchema, req.body) as CreateIdentityInput;
    const identity = await identityService.createIdentity(validated);

    logger.info('Identity created via API', {
      identityId: identity.identityId,
      type: identity.type
    });

    res.status(201).json({
      success: true,
      data: identity
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:identityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identityId } = req.params;
    const result = await identityService.getIdentity(identityId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Identity not found'
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.put('/:identityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identityId } = req.params;
    const validated = await validateRequest(updateIdentitySchema, req.body) as UpdateIdentityInput;
    const identity = await identityService.updateIdentity(identityId, validated);

    if (!identity) {
      return res.status(404).json({
        success: false,
        error: 'Identity not found'
      });
    }

    logger.info('Identity updated via API', { identityId });

    res.json({
      success: true,
      data: identity
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:identityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identityId } = req.params;
    const success = await identityService.softDeleteIdentity(identityId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Identity not found'
      });
    }

    logger.info('Identity deleted via API', { identityId });

    res.json({
      success: true,
      message: 'Identity deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/type/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    if (!Object.values(IdentityType).includes(type as IdentityType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid identity type'
      });
    }

    const identities = await identityService.getIdentitiesByType(type as IdentityType, limit);

    res.json({
      success: true,
      data: identities,
      count: identities.length
    });
  } catch (error) {
    next(error);
  }
});

router.get('/cluster/:clusterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clusterId } = req.params;
    const identities = await identityService.getIdentitiesByCluster(clusterId);

    res.json({
      success: true,
      data: identities,
      count: identities.length
    });
  } catch (error) {
    next(error);
  }
});

router.get('/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q } = req.query;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query parameter "q" is required'
      });
    }

    const identities = await identityService.searchIdentities(q, limit);

    res.json({
      success: true,
      data: identities,
      count: identities.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
