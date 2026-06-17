import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Worker, IWorker, WorkerStatus, ServiceType } from '../models/Worker';

const router = Router();

// Validation schemas
const createWorkerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional(),
  skills: z.array(z.nativeEnum(ServiceType)).optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  status: z.nativeEnum(WorkerStatus).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateWorkerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  skills: z.array(z.nativeEnum(ServiceType)).optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  status: z.nativeEnum(WorkerStatus).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(WorkerStatus),
});

// Middleware to extract tenant ID
const extractTenant = (req: Request, _res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    return next(new Error('X-Tenant-ID header is required'));
  }
  req.body.tenantId = tenantId;
  next();
};

// List workers with filters
router.get('/', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { status, skill, language, limit = 50, offset = 0 } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (status) {
      query.status = status;
    }

    if (skill) {
      query.skills = skill;
    }

    if (language) {
      query.languages = language;
    }

    const workers = await Worker.find(query)
      .sort({ 'stats.lastActiveAt': -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .select('-__v');

    const total = await Worker.countDocuments(query);

    res.json({
      success: true,
      data: workers,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get worker by ID
router.get('/:id', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const worker = await Worker.findOne({ _id: id, tenantId }).select('-__v');

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found',
      });
    }

    res.json({
      success: true,
      data: worker,
    });
  } catch (error) {
    next(error);
  }
});

// Create worker
router.post('/', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = createWorkerSchema.parse(req.body);

    // Check if email already exists
    const existingWorker = await Worker.findOne({ email: validatedData.email });
    if (existingWorker) {
      return res.status(409).json({
        success: false,
        error: 'Worker with this email already exists',
      });
    }

    const worker = new Worker({
      ...validatedData,
      tenantId,
    });

    await worker.save();

    res.status(201).json({
      success: true,
      data: worker,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Update worker
router.put('/:id', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;
    const validatedData = updateWorkerSchema.parse(req.body);

    const worker = await Worker.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found',
      });
    }

    res.json({
      success: true,
      data: worker,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Delete worker
router.delete('/:id', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const worker = await Worker.findOneAndDelete({ _id: id, tenantId });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found',
      });
    }

    res.json({
      success: true,
      message: 'Worker deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Get worker statistics
router.get('/:id/stats', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const worker = await Worker.findOne({ _id: id, tenantId }).select('stats name email');

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found',
      });
    }

    res.json({
      success: true,
      data: {
        workerId: worker._id,
        name: worker.name,
        email: worker.email,
        stats: worker.stats,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update worker status
router.put('/:id/status', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const worker = await Worker.findOneAndUpdate(
      { _id: id, tenantId },
      {
        $set: {
          status,
          'stats.lastActiveAt': new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found',
      });
    }

    res.json({
      success: true,
      data: worker,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors,
      });
    }
    next(error);
  }
});

// Get available workers for a specific job type
router.get('/available/:skill', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { skill } = req.params;
    const { language } = req.query;

    const query: Record<string, unknown> = {
      tenantId,
      status: WorkerStatus.AVAILABLE,
      skills: skill as ServiceType,
    };

    if (language) {
      query.languages = language;
    }

    const workers = await Worker.find(query)
      .sort({ 'stats.averageRating': -1, 'stats.totalJobsCompleted': -1 })
      .select('-__v');

    res.json({
      success: true,
      data: workers,
      count: workers.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;