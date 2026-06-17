import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { verificationService } from '../services/verification';
import {
  EntityTypeSchema,
  VerificationMethodSchema,
  VerificationRequestSchema,
} from '../types';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const InitiateVerificationSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  method: VerificationMethodSchema,
  data: z.record(z.any()),
  tenantId: z.string().optional(),
});

const GetVerificationSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  tenantId: z.string().optional(),
});

/**
 * POST /api/verify
 * Initiate a new verification request
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = VerificationRequestSchema.parse(req.body);

      const verification = await verificationService.initiateVerification({
        entityId: validated.entityId,
        entityType: validated.entityType,
        method: validated.method,
        data: validated.data,
        tenantId: validated.tenantId,
      });

      res.status(201).json({
        success: true,
        id: verification._id!.toString(),
        entityId: verification.entityId,
        entityType: verification.entityType,
        method: verification.method,
        status: verification.status,
        level: verification.level,
        provider: verification.provider,
        createdAt: verification.createdAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/verify/:entityId/:entityType
 * Get all verifications for an entity
 */
router.get(
  '/:entityId/:entityType',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType } = req.params;
      const tenantId = req.query.tenantId as string || 'default';

      const validated = GetVerificationSchema.parse({ entityId, entityType, tenantId });
      const verifications = await verificationService.getVerification(
        validated.entityId,
        validated.entityType as any,
        validated.tenantId
      );

      res.json({
        entityId,
        entityType,
        verifications,
        count: verifications.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/verify/id/:verificationId
 * Get verification by ID
 */
router.get(
  '/id/:verificationId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { verificationId } = req.params;
      const verification = await verificationService.getVerificationById(verificationId);

      if (!verification) {
        return res.status(404).json({
          error: 'Verification not found',
          verificationId,
        });
      }

      res.json({
        id: verification._id!.toString(),
        entityId: verification.entityId,
        entityType: verification.entityType,
        method: verification.method,
        status: verification.status,
        level: verification.level,
        provider: verification.provider,
        referenceId: verification.referenceId,
        score: verification.score,
        verifiedAt: verification.verifiedAt,
        expiresAt: verification.expiresAt,
        rejectionReason: verification.rejectionReason,
        documents: verification.documents,
        attempts: verification.attempts,
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/verify/:entityId/:entityType/level
 * Get aggregated verification level for an entity
 */
router.get(
  '/:entityId/:entityType/level',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType } = req.params;
      const tenantId = req.query.tenantId as string || 'default';

      const validated = GetVerificationSchema.parse({ entityId, entityType, tenantId });
      const level = await verificationService.getEntityVerificationLevel(
        validated.entityId,
        validated.entityType as any,
        validated.tenantId
      );

      // Calculate level score
      const levelScores = {
        none: 0,
        basic: 20,
        standard: 50,
        enhanced: 70,
        full: 100,
      };

      res.json({
        entityId,
        entityType,
        verificationLevel: level,
        verificationScore: levelScores[level],
        description: getLevelDescription(level),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/verify/:verificationId/revoke
 * Revoke a verification
 */
router.post(
  '/:verificationId/revoke',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { verificationId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          error: 'Reason is required for revocation',
        });
      }

      const verification = await verificationService.revokeVerification(
        verificationId,
        reason
      );

      if (!verification) {
        return res.status(404).json({
          error: 'Verification not found',
          verificationId,
        });
      }

      res.json({
        success: true,
        id: verification._id!.toString(),
        status: verification.status,
        rejectionReason: verification.rejectionReason,
        revokedAt: verification.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/verify/expire
 * Expire old verifications (admin endpoint)
 */
router.post(
  '/expire',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await verificationService.expireVerifications();

      res.json({
        success: true,
        expiredCount: count,
        message: `${count} verifications expired`,
      });
    } catch (error) {
      next(error);
    }
  }
);

function getLevelDescription(level: string): string {
  const descriptions: Record<string, string> = {
    none: 'No verification completed',
    basic: 'Basic verification (email or phone)',
    standard: 'Standard verification (document or bank)',
    enhanced: 'Enhanced verification (multiple methods)',
    full: 'Full verification (KYC + biometric)',
  };
  return descriptions[level] || 'Unknown level';
}

export default router;
