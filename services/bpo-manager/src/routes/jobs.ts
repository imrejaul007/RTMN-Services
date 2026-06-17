import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobStatus, JobPriority, IJob } from '../models/Job';
import { Worker, ServiceType, WorkerStatus } from '../models/Worker';
import { autoAssignJob } from '../services/jobRouter';

const router = Router();

// Validation schemas
const createJobSchema = z.object({
  type: z.nativeEnum(ServiceType),
  clientId: z.string().min(1),
  clientName: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  requirements: z
    .object({
      skills: z.array(z.nativeEnum(ServiceType)).optional(),
      languages: z.array(z.string()).optional(),
      minRating: z.number().min(0).max(5).optional(),
      certifications: z.array(z.string()).optional(),
      experience: z.string().optional(),
    })
    .optional(),
  priority: z.number().min(1).max(5).optional(),
  ticketId: z.string().optional(),
  voiceData: z
    .object({
      customerPhone: z.string().min(1),
      customerName: z.string().optional(),
      campaignId: z.string().optional(),
      script: z.string().optional(),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
  estimatedDuration: z.number().optional(),
  payment: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
  autoAssign: z.boolean().optional(),
});

const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  requirements: z
    .object({
      skills: z.array(z.nativeEnum(ServiceType)).optional(),
      languages: z.array(z.string()).optional(),
      minRating: z.number().min(0).max(5).optional(),
      certifications: z.array(z.string()).optional(),
      experience: z.string().optional(),
    })
    .optional(),
  priority: z.number().min(1).max(5).optional(),
  voiceData: z
    .object({
      customerPhone: z.string().min(1).optional(),
      customerName: z.string().optional(),
      campaignId: z.string().optional(),
      script: z.string().optional(),
      disposition: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
  estimatedDuration: z.number().optional(),
  payment: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const assignJobSchema = z.object({
  workerId: z.string().min(1),
});

const completeJobSchema = z.object({
  output: z.record(z.unknown()).optional(),
  rating: z.number().min(0).max(5).optional(),
  feedback: z.string().optional(),
  payment: z.number().optional(),
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

// List jobs with filters
router.get('/', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { status, type, clientId, workerId, priority, limit = 50, offset = 0 } = req.query;

    const query: Record<string, unknown> = { tenantId };

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (clientId) {
      query.clientId = clientId;
    }

    if (workerId) {
      query.worker = workerId;
    }

    if (priority) {
      query.priority = { $gte: priority };
    }

    const jobs = await Job.find(query)
      .populate('worker', 'name email status')
      .sort({ priority: -1, createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .select('-__v');

    const total = await Job.countDocuments(query);

    res.json({
      success: true,
      data: jobs,
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

// Get job by ID
router.get('/:id', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const job = await Job.findOne({ _id: id, tenantId })
      .populate('worker', 'name email status skills')
      .select('-__v');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

// Create job
router.post('/', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const validatedData = createJobSchema.parse(req.body);

    const job = new Job({
      ...validatedData,
      tenantId,
      jobId: `BPO-${tenantId.substring(0, 4).toUpperCase()}-${uuidv4().substring(0, 8).toUpperCase()}`,
      status: JobStatus.PENDING,
      priority: validatedData.priority || JobPriority.NORMAL,
    });

    await job.save();

    // Auto-assign if requested
    if (validatedData.autoAssign) {
      try {
        const assignment = await autoAssignJob(job);
        if (assignment.success) {
          return res.status(201).json({
            success: true,
            data: job,
            assignment: assignment.message,
          });
        }
      } catch (assignError) {
        console.log('Auto-assignment failed, job created as pending:', assignError);
      }
    }

    res.status(201).json({
      success: true,
      data: job,
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

// Update job
router.put('/:id', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;
    const validatedData = updateJobSchema.parse(req.body);

    const job = await Job.findOneAndUpdate(
      { _id: id, tenantId },
      { $set: validatedData },
      { new: true, runValidators: true }
    ).populate('worker', 'name email status');

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    res.json({
      success: true,
      data: job,
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

// Cancel job
router.delete('/:id', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const job = await Job.findOne({ _id: id, tenantId });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status === JobStatus.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed job',
      });
    }

    // If job was assigned, free up the worker
    if (job.worker && job.status !== JobStatus.PENDING) {
      await Worker.findByIdAndUpdate(job.worker, {
        status: WorkerStatus.AVAILABLE,
      });
    }

    job.status = JobStatus.CANCELLED;
    await job.save();

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

// Manually assign job to worker
router.post('/:id/assign', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;
    const { workerId } = assignJobSchema.parse(req.body);

    const job = await Job.findOne({ _id: id, tenantId });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== JobStatus.PENDING) {
      return res.status(400).json({
        success: false,
        error: `Cannot assign job with status: ${job.status}`,
      });
    }

    const worker = await Worker.findOne({ _id: workerId, tenantId });

    if (!worker) {
      return res.status(404).json({
        success: false,
        error: 'Worker not found',
      });
    }

    if (worker.status !== WorkerStatus.AVAILABLE) {
      return res.status(400).json({
        success: false,
        error: 'Worker is not available',
      });
    }

    // Assign job to worker
    job.worker = worker._id as unknown as typeof job.worker;
    job.workerName = worker.name;
    job.status = JobStatus.ASSIGNED;
    await job.save();

    // Update worker status
    worker.status = WorkerStatus.BUSY;
    worker.stats.totalJobsAssigned += 1;
    await worker.save();

    res.json({
      success: true,
      data: job,
      worker: {
        id: worker._id,
        name: worker.name,
      },
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

// Start work on job
router.post('/:id/start', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;

    const job = await Job.findOne({ _id: id, tenantId });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (job.status !== JobStatus.ASSIGNED) {
      return res.status(400).json({
        success: false,
        error: `Cannot start job with status: ${job.status}`,
      });
    }

    job.status = JobStatus.IN_PROGRESS;
    await job.save();

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
});

// Complete job
router.post('/:id/complete', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { id } = req.params;
    const validatedData = completeJobSchema.parse(req.body);

    const job = await Job.findOne({ _id: id, tenantId });

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found',
      });
    }

    if (![JobStatus.ASSIGNED, JobStatus.IN_PROGRESS].includes(job.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot complete job with status: ${job.status}`,
      });
    }

    // Update job
    job.status = JobStatus.COMPLETED;
    job.completedAt = new Date();
    if (validatedData.output) {
      job.output = validatedData.output;
    }
    if (validatedData.rating !== undefined) {
      job.rating = validatedData.rating;
    }
    if (validatedData.feedback) {
      job.feedback = validatedData.feedback;
    }
    if (validatedData.payment !== undefined) {
      job.payment = validatedData.payment;
    }
    await job.save();

    // Update worker stats
    if (job.worker) {
      const worker = await Worker.findById(job.worker);
      if (worker) {
        await worker.addCompletedJob(
          validatedData.rating,
          job.actualDuration
        );
        if (validatedData.payment) {
          worker.stats.earnings += validatedData.payment;
          await worker.save();
        }

        // Check if worker has other active jobs
        const activeJobs = await Job.countDocuments({
          worker: job.worker,
          status: { $in: [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS] },
          _id: { $ne: job._id },
        });

        if (activeJobs === 0) {
          worker.status = WorkerStatus.AVAILABLE;
          await worker.save();
        }
      }
    }

    res.json({
      success: true,
      data: job,
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

// Get jobs by status (dashboard summary)
router.get('/status/summary', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;

    const summary = await Job.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      PENDING: 0,
      ASSIGNED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      total: 0,
    };

    summary.forEach((item) => {
      result[item._id as keyof typeof result] = item.count;
      result.total += item.count;
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Get pending jobs (for auto-assignment)
router.get('/pending/list', extractTenant, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.body.tenantId;
    const { limit = 20 } = req.query;

    const jobs = await Job.findPendingJobs(tenantId, Number(limit));

    res.json({
      success: true,
      data: jobs,
      count: jobs.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;