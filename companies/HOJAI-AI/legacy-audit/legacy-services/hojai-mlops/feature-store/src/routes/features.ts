/**
 * Feature Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { featureService } from '../services/feature';
import {
  storeFeaturesSchema,
  batchGetSchema,
  entityIdSchema,
  featureNameSchema,
} from '../validators';
import { ValidationError } from '../middleware/error';
import { ZodError } from 'zod';

const router = Router();

/**
 * POST /api/features/:entityId
 * Store features for an entity
 */
router.post(
  '/:entityId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate entity ID
      const entityIdResult = entityIdSchema.safeParse(req.params.entityId);
      if (!entityIdResult.success) {
        throw new ValidationError('Invalid entity ID');
      }

      // Validate request body
      const bodyResult = storeFeaturesSchema.safeParse(req.body);
      if (!bodyResult.success) {
        throw new ValidationError(
          bodyResult.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')
        );
      }

      const featureSet = await featureService.storeFeatures(
        entityIdResult.data,
        bodyResult.data
      );

      res.status(201).json({
        entity_id: featureSet.entity_id,
        features: featureSet.features,
        last_updated: featureSet.last_updated,
        features_stored: bodyResult.data.features.length,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            error.errors
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', ')
          )
        );
        return;
      }
      next(error);
    }
  }
);

/**
 * GET /api/features/:entityId
 * Get all features for an entity
 */
router.get(
  '/:entityId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate entity ID
      const entityIdResult = entityIdSchema.safeParse(req.params.entityId);
      if (!entityIdResult.success) {
        throw new ValidationError('Invalid entity ID');
      }

      const featureSet = await featureService.getFeatures(
        entityIdResult.data
      );

      if (!featureSet) {
        res.status(404).json({
          entity_id: entityIdResult.data,
          features: {},
          last_updated: '',
          found: false,
        });
        return;
      }

      res.json({
        entity_id: featureSet.entity_id,
        features: featureSet.features,
        last_updated: featureSet.last_updated,
        found: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/features/:entityId/:featureName
 * Get a single feature for an entity
 */
router.get(
  '/:entityId/:featureName',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate entity ID
      const entityIdResult = entityIdSchema.safeParse(req.params.entityId);
      if (!entityIdResult.success) {
        throw new ValidationError('Invalid entity ID');
      }

      // Validate feature name
      const featureNameResult = featureNameSchema.safeParse(
        req.params.featureName
      );
      if (!featureNameResult.success) {
        throw new ValidationError('Invalid feature name');
      }

      const feature = await featureService.getFeature(
        entityIdResult.data,
        featureNameResult.data
      );

      if (!feature) {
        res.status(404).json({
          entity_id: entityIdResult.data,
          feature: null,
          found: false,
        });
        return;
      }

      res.json({
        entity_id: entityIdResult.data,
        feature,
        found: true,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/features/:entityId
 * Delete all features for an entity
 */
router.delete(
  '/:entityId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate entity ID
      const entityIdResult = entityIdSchema.safeParse(req.params.entityId);
      if (!entityIdResult.success) {
        throw new ValidationError('Invalid entity ID');
      }

      const result = await featureService.deleteFeatures(
        entityIdResult.data
      );

      res.json({
        entity_id: entityIdResult.data,
        deleted: result.deleted,
        features_deleted: result.featuresDeleted,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/features/batch
 * Batch get features for multiple entities
 */
router.post(
  '/batch',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const bodyResult = batchGetSchema.safeParse(req.body);
      if (!bodyResult.success) {
        throw new ValidationError(
          bodyResult.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')
        );
      }

      const results = await featureService.batchGetFeatures(bodyResult.data);

      res.json({
        results,
        total: results.length,
        found_count: results.filter((r) => r.found).length,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            error.errors
              .map((e) => `${e.path.join('.')}: ${e.message}`)
              .join(', ')
          )
        );
        return;
      }
      next(error);
    }
  }
);

export default router;
