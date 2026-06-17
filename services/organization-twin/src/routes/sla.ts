import { Router, Request, Response } from 'express';
import { SLAPolicy } from '../models/SLAPolicy';
import mongoose from 'mongoose';

const router = Router();

// Get tenant ID from header or query
const getTenantId = (req: Request): string | undefined => {
  return (req.headers['x-tenant-id'] as string) || (req.query.tenantId as string);
};

// Build base query with tenant isolation
const buildQuery = (tenantId?: string) => {
  return tenantId ? { tenantId } : {};
};

// GET /api/sla - List SLA policies
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const { organizationId, departmentId, priority, status, page = 1, limit = 50 } = req.query;
    const filter: Record<string, unknown> = { ...query };

    if (organizationId) filter.organizationId = organizationId;
    if (departmentId) filter.departmentId = departmentId;
    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    // Only show currently effective policies by default
    if (!req.query.includeAll) {
      const now = new Date();
      filter.effectiveFrom = { $lte: now };
      filter.$or = [
        { effectiveTo: null },
        { effectiveTo: { $gte: now } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [policies, total] = await Promise.all([
      SLAPolicy.find(filter)
        .populate('organizationId', 'name code')
        .populate('departmentId', 'name code')
        .sort({ priority: 1, name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      SLAPolicy.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: policies,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/sla - Create SLA policy
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-ID header is required' });
    }

    const slaPolicy = new SLAPolicy({
      ...req.body,
      tenantId,
    });

    await slaPolicy.save();

    res.status(201).json({
      success: true,
      data: slaPolicy,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    if (error instanceof mongoose.Error.MongoServerError && (error as unknown as { code: number }).code === 11000) {
      return res.status(409).json({ success: false, error: 'SLA policy code already exists' });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/sla/priority/:priority - Get SLA by priority
router.get('/priority/:priority', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const { organizationId, departmentId } = req.query;
    const filter: Record<string, unknown> = {
      priority: req.params.priority,
      ...query,
    };

    if (organizationId) filter.organizationId = organizationId;
    if (departmentId) filter.departmentId = departmentId;

    if (!req.query.includeAll) {
      filter.status = 'active';
      const now = new Date();
      filter.effectiveFrom = { $lte: now };
      filter.$or = [
        { effectiveTo: null },
        { effectiveTo: { $gte: now } },
      ];
    }

    const policies = await SLAPolicy.find(filter)
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name code')
      .sort({ priority: 1 })
      .lean();

    // Return the most specific match (department > organization > global)
    const sortedPolicies = policies.sort((a, b) => {
      if (a.departmentId && !b.departmentId) return -1;
      if (!a.departmentId && b.departmentId) return 1;
      if (a.organizationId && !b.organizationId) return -1;
      if (!a.organizationId && b.organizationId) return 1;
      return 0;
    });

    res.json({
      success: true,
      data: sortedPolicies,
      bestMatch: sortedPolicies[0] || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/sla/:id - Get SLA policy by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const slaPolicy = await SLAPolicy.findOne({
      _id: req.params.id,
      ...query,
    })
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name code');

    if (!slaPolicy) {
      return res.status(404).json({ success: false, error: 'SLA policy not found' });
    }

    res.json({ success: true, data: slaPolicy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/sla/:id - Update SLA policy
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const slaPolicy = await SLAPolicy.findOneAndUpdate(
      { _id: req.params.id, ...query },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!slaPolicy) {
      return res.status(404).json({ success: false, error: 'SLA policy not found' });
    }

    res.json({ success: true, data: slaPolicy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/sla/:id - Delete SLA policy
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const slaPolicy = await SLAPolicy.findOneAndDelete({
      _id: req.params.id,
      ...query,
    });

    if (!slaPolicy) {
      return res.status(404).json({ success: false, error: 'SLA policy not found' });
    }

    res.json({ success: true, message: 'SLA policy deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/sla/:id/activate - Activate SLA policy
router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const slaPolicy = await SLAPolicy.findOneAndUpdate(
      { _id: req.params.id, ...query },
      {
        $set: {
          status: 'active',
          effectiveFrom: req.body.effectiveFrom || new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!slaPolicy) {
      return res.status(404).json({ success: false, error: 'SLA policy not found' });
    }

    res.json({ success: true, data: slaPolicy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/sla/:id/deactivate - Deactivate SLA policy
router.post('/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const slaPolicy = await SLAPolicy.findOneAndUpdate(
      { _id: req.params.id, ...query },
      {
        $set: {
          status: 'inactive',
          effectiveTo: req.body.effectiveTo || new Date(),
        },
      },
      { new: true, runValidators: true }
    );

    if (!slaPolicy) {
      return res.status(404).json({ success: false, error: 'SLA policy not found' });
    }

    res.json({ success: true, data: slaPolicy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
