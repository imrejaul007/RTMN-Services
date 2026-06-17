import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { fraudDetector } from '../services/fraudDetector';
import { RiskFlagModel } from '../models/Flag';
import {
  EntityTypeSchema,
  FlagSeveritySchema,
  CreateFlagRequestSchema,
  RiskFlagType,
  FlagSeverity,
} from '../types';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const GetFlagsSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  tenantId: z.string().optional(),
});

const CreateFlagSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  type: z.enum([
    'suspicious_transaction',
    'unusual_pattern',
    'address_mismatch',
    'velocity_exceeded',
    'geo_anomaly',
    'device_mismatch',
    'identity_discrepancy',
    'fraud_report',
    'chargeback',
    'policy_violation',
    'compliance_risk',
    'link_to_flagged',
  ]),
  severity: FlagSeveritySchema,
  description: z.string().min(1),
  evidence: z.array(
    z.object({
      type: z.string(),
      data: z.record(z.any()),
      timestamp: z.string().or(z.date()).transform((v) => new Date(v)),
      source: z.string(),
    })
  ),
  tenantId: z.string().optional(),
});

const TransactionAnalysisSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  amount: z.number().positive(),
  currency: z.string().optional(),
  timestamp: z.string().or(z.date()).transform((v) => new Date(v)),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }).optional(),
  ipAddress: z.string().optional(),
  deviceId: z.string().optional(),
  paymentMethod: z.string().optional(),
  merchantId: z.string().optional(),
  velocity: z.number().optional(),
  tenantId: z.string().optional(),
});

/**
 * POST /api/flags
 * Create a new risk flag
 */
router.post(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateFlagSchema.parse(req.body);

      const flag = await fraudDetector.createRiskFlag({
        entityId: validated.entityId,
        entityType: validated.entityType,
        type: validated.type,
        severity: validated.severity,
        description: validated.description,
        evidence: validated.evidence,
        tenantId: validated.tenantId,
      });

      res.status(201).json({
        success: true,
        id: flag._id!.toString(),
        entityId: flag.entityId,
        entityType: flag.entityType,
        type: flag.type,
        severity: flag.severity,
        status: flag.status,
        score: flag.score,
        description: flag.description,
        createdAt: flag.createdAt,
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
 * GET /api/flags/:entityId/:entityType
 * Get all active flags for an entity
 */
router.get(
  '/:entityId/:entityType',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType } = req.params;
      const tenantId = req.query.tenantId as string || 'default';

      const validated = GetFlagsSchema.parse({ entityId, entityType, tenantId });
      const flags = await fraudDetector.getEntityFlags(
        validated.entityId,
        validated.entityType as any,
        validated.tenantId
      );

      res.json({
        entityId,
        entityType,
        flags,
        count: flags.length,
        riskLevel: calculateRiskLevel(flags),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/flags/id/:flagId
 * Get flag by ID
 */
router.get(
  '/id/:flagId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { flagId } = req.params;
      const flag = await RiskFlagModel.findById(flagId);

      if (!flag) {
        return res.status(404).json({
          error: 'Flag not found',
          flagId,
        });
      }

      res.json({
        id: flag._id!.toString(),
        entityId: flag.entityId,
        entityType: flag.entityType,
        tenantId: flag.tenantId,
        type: flag.type,
        severity: flag.severity,
        status: flag.status,
        score: flag.score,
        description: flag.description,
        evidence: flag.evidence,
        resolvedAt: flag.resolvedAt,
        resolvedBy: flag.resolvedBy,
        resolution: flag.resolution,
        escalatedTo: flag.escalatedTo,
        createdAt: flag.createdAt,
        updatedAt: flag.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/flags/:flagId/resolve
 * Resolve a risk flag
 */
router.post(
  '/:flagId/resolve',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { flagId } = req.params;
      const { resolvedBy, resolution } = req.body;

      if (!resolvedBy || !resolution) {
        return res.status(400).json({
          error: 'resolvedBy and resolution are required',
        });
      }

      const flag = await fraudDetector.resolveFlag(flagId, resolvedBy, resolution);

      if (!flag) {
        return res.status(404).json({
          error: 'Flag not found',
          flagId,
        });
      }

      res.json({
        success: true,
        id: flag._id!.toString(),
        status: flag.status,
        resolvedAt: flag.resolvedAt,
        resolvedBy: flag.resolvedBy,
        resolution: flag.resolution,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/flags/:flagId/dismiss
 * Dismiss a risk flag
 */
router.post(
  '/:flagId/dismiss',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { flagId } = req.params;
      const { dismissedBy } = req.body;

      if (!dismissedBy) {
        return res.status(400).json({
          error: 'dismissedBy is required',
        });
      }

      const flag = await fraudDetector.dismissFlag(flagId, dismissedBy);

      if (!flag) {
        return res.status(404).json({
          error: 'Flag not found',
          flagId,
        });
      }

      res.json({
        success: true,
        id: flag._id!.toString(),
        status: flag.status,
        dismissedBy: flag.resolvedBy,
        dismissedAt: flag.resolvedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/flags/:flagId/escalate
 * Escalate a risk flag
 */
router.post(
  '/:flagId/escalate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { flagId } = req.params;
      const { escalateTo } = req.body;

      if (!escalateTo) {
        return res.status(400).json({
          error: 'escalateTo is required',
        });
      }

      const flag = await fraudDetector.escalateFlag(flagId, escalateTo);

      if (!flag) {
        return res.status(404).json({
          error: 'Flag not found',
          flagId,
        });
      }

      res.json({
        success: true,
        id: flag._id!.toString(),
        status: flag.status,
        escalatedTo: flag.escalatedTo,
        escalatedAt: flag.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/flags/analyze
 * Analyze a transaction for fraud
 */
router.post(
  '/analyze',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = TransactionAnalysisSchema.parse(req.body);

      const result = await fraudDetector.analyzeTransaction({
        entityId: validated.entityId,
        entityType: validated.entityType,
        amount: validated.amount,
        currency: validated.currency,
        timestamp: validated.timestamp,
        location: validated.location,
        ipAddress: validated.ipAddress,
        deviceId: validated.deviceId,
        paymentMethod: validated.paymentMethod,
        merchantId: validated.merchantId,
        velocity: validated.velocity,
      }, validated.tenantId);

      res.json({
        entityId: validated.entityId,
        entityType: validated.entityType,
        amount: validated.amount,
        isSuspicious: result.isSuspicious,
        riskScore: result.riskScore,
        flags: result.flags,
        recommendations: result.recommendations,
        analyzedAt: new Date(),
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
 * GET /api/flags/stats
 * Get flag statistics
 */
router.get(
  '/stats',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.query.tenantId as string || 'default';

      const stats = await RiskFlagModel.getFlagStats(tenantId);

      // Format stats
      const formattedStats = {
        byStatus: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        total: 0,
      };

      for (const stat of stats) {
        const status = stat._id.status;
        const severity = stat._id.severity;

        formattedStats.byStatus[status] = (formattedStats.byStatus[status] || 0) + stat.count;
        formattedStats.bySeverity[severity] = (formattedStats.bySeverity[severity] || 0) + stat.count;
        formattedStats.total += stat.count;
      }

      res.json({
        tenantId,
        stats: formattedStats,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  }
);

function calculateRiskLevel(flags: any[]): string {
  if (flags.length === 0) return 'none';

  const severities = flags.map((f) => f.severity);
  if (severities.includes('critical')) return 'critical';
  if (severities.includes('high')) return 'high';
  if (severities.includes('medium')) return 'medium';
  return 'low';
}

export default router;
