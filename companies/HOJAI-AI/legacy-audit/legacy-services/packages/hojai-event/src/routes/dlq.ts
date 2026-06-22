import express, { Request, Response, NextFunction } from 'express';
import { DLQModel } from '../models/dlqModel.js';

const router = express.Router();

/**
 * GET /api/dlq
 * List dead letter queue entries
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const { status, reason, limit, offset } = req.query;

    const filter: Record<string, unknown> = { tenantId };
    if (status) filter.status = status;
    if (reason) filter.reason = reason;

    const [entries, total] = await Promise.all([
      DLQModel.find(filter)
        .sort({ failedAt: -1 })
        .skip(offset ? parseInt(offset as string) : 0)
        .limit(limit ? parseInt(limit as string) : 50),
      DLQModel.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: entries,
      pagination: {
        total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dlq/:id/retry
 * Retry a failed event
 */
router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const entry = await DLQModel.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      {
        $set: { status: 'retrying' },
        $inc: { retryCount: 1 }
      },
      { new: true }
    );

    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
      return;
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dlq/:id/resolve
 * Mark a failed event as resolved
 */
router.post('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const entry = await DLQModel.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      {
        $set: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: req.body.resolvedBy || 'manual'
        }
      },
      { new: true }
    );

    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
      return;
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/dlq/retry-all
 * Retry all pending entries
 */
router.post('/retry-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const result = await DLQModel.updateMany(
      { tenantId, status: 'pending' },
      {
        $set: { status: 'retrying' }
      }
    );

    res.json({
      success: true,
      data: {
        updated: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
