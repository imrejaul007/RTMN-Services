import { Router, Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { resolveService } from '../services/resolve.service';
import { IdentityType } from '../models/identity.model';
import { logger } from '../utils/logger';

const router = Router();

const resolveSchema = Joi.object({
  identityId: Joi.string(),
  type: Joi.string().valid(...Object.values(IdentityType)),
  identifier: Joi.string(),
  email: Joi.string().email(),
  phone: Joi.string(),
  clusterId: Joi.string()
}).or('identityId', 'type', 'identifier', 'email', 'phone', 'clusterId');

const resolveOptionsSchema = Joi.object({
  includeActivity: Joi.boolean().default(true),
  activityDays: Joi.number().default(30),
  privacyFilter: Joi.boolean().default(true)
});

const mergeClustersSchema = Joi.object({
  sourceClusterId: Joi.string().required(),
  targetClusterId: Joi.string().required(),
  reason: Joi.string().required()
});

async function validateRequest(schema: Joi.Schema, data: unknown): Promise<unknown> {
  const { error, value } = schema.validate(data, { abortEarly: false });
  if (error) {
    throw new Error(`Validation error: ${error.details.map((d) => d.message).join(', ')}`);
  }
  return value;
}

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identityId, type, identifier, email, phone, clusterId, ...options } = req.body;

    const validatedOptions = await validateRequest(resolveOptionsSchema, options);

    const profile = await resolveService.resolve(
      { identityId, type, identifier, email, phone, clusterId },
      validatedOptions as any
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Identity or cluster not found'
      });
    }

    logger.info('Identity resolved via API', { clusterId: profile.clusterId });

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

router.get('/cluster/:clusterId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clusterId } = req.params;
    const options = {
      includeActivity: req.query.includeActivity !== 'false',
      activityDays: parseInt(req.query.activityDays as string) || 30,
      privacyFilter: req.query.privacyFilter !== 'false'
    };

    const profile = await resolveService.buildUnifiedProfile(clusterId, options);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Cluster not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

router.get('/email/:email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.params;
    const options = {
      includeActivity: req.query.includeActivity !== 'false',
      activityDays: parseInt(req.query.activityDays as string) || 30,
      privacyFilter: req.query.privacyFilter !== 'false'
    };

    const profile = await resolveService.resolve({ email }, options);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Identity not found for this email'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

router.get('/phone/:phone', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.params;
    const options = {
      includeActivity: req.query.includeActivity !== 'false',
      activityDays: parseInt(req.query.activityDays as string) || 30,
      privacyFilter: req.query.privacyFilter !== 'false'
    };

    const profile = await resolveService.resolve({ phone }, options);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Identity not found for this phone'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

router.get('/identity/:identityId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identityId } = req.params;
    const options = {
      includeActivity: req.query.includeActivity !== 'false',
      activityDays: parseInt(req.query.activityDays as string) || 30,
      privacyFilter: req.query.privacyFilter !== 'false'
    };

    const profile = await resolveService.resolve({ identityId }, options);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Identity not found'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    next(error);
  }
});

router.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [clusterStats, identityStats] = await Promise.all([
      resolveService.getClusterStats(),
      resolveService.getIdentityCount()
    ]);

    res.json({
      success: true,
      data: {
        clusters: clusterStats,
        identities: identityStats
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/clusters/merge', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = await validateRequest(mergeClustersSchema, req.body);
    const result = await resolveService.mergeClusters(
      validated.sourceClusterId,
      validated.targetClusterId,
      validated.reason
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logger.info('Clusters merged via API', {
      sourceClusterId: validated.sourceClusterId,
      targetClusterId: validated.targetClusterId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

router.get('/cluster/:clusterId/traits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { clusterId } = req.params;
    const traits = await resolveService.predictUserTraits(clusterId);

    res.json({
      success: true,
      data: traits
    });
  } catch (error) {
    next(error);
  }
});

export default router;
