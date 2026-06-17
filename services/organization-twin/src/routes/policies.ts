import { Router, Request, Response } from 'express';
import { Policy } from '../models/Policy';
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

// GET /api/policies - List policies
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const { organizationId, departmentId, branchId, type, status, scope, page = 1, limit = 50 } = req.query;
    const filter: Record<string, unknown> = { ...query };

    if (organizationId) filter.organizationId = organizationId;
    if (departmentId) filter.departmentId = departmentId;
    if (branchId) filter.branchId = branchId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (scope) filter['appliesTo.scope'] = scope;

    // Only show currently effective policies by default
    const now = new Date();
    filter.effectiveFrom = { $lte: now };
    filter.$or = [
      { effectiveTo: null },
      { effectiveTo: { $gte: now } },
    ];

    const skip = (Number(page) - 1) * Number(limit);

    const [policies, total] = await Promise.all([
      Policy.find(filter)
        .populate('organizationId', 'name code')
        .populate('departmentId', 'name code')
        .populate('branchId', 'name code')
        .sort({ type: 1, name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Policy.countDocuments(filter),
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

// POST /api/policies - Create policy
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-ID header is required' });
    }

    const policy = new Policy({
      ...req.body,
      tenantId,
      version: 1,
    });

    await policy.save();

    res.status(201).json({
      success: true,
      data: policy,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    if (error instanceof mongoose.Error.MongoServerError && (error as unknown as { code: number }).code === 11000) {
      return res.status(409).json({ success: false, error: 'Policy code already exists' });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/policies/type/:type - Get policies by type
router.get('/type/:type', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const { organizationId, branchId, includeInactive } = req.query;
    const filter: Record<string, unknown> = {
      type: req.params.type,
      ...query,
    };

    if (organizationId) filter.organizationId = organizationId;
    if (branchId) filter.branchId = branchId;

    if (!includeInactive) {
      filter.status = 'active';
      const now = new Date();
      filter.effectiveFrom = { $lte: now };
      filter.$or = [
        { effectiveTo: null },
        { effectiveTo: { $gte: now } },
      ];
    }

    const policies = await Policy.find(filter)
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name code')
      .populate('branchId', 'name code')
      .sort({ priority: -1, name: 1 })
      .lean();

    res.json({ success: true, data: policies });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/policies/:id - Get policy by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const policy = await Policy.findOne({
      _id: req.params.id,
      ...query,
    })
      .populate('organizationId', 'name code')
      .populate('departmentId', 'name code')
      .populate('branchId', 'name code');

    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    res.json({ success: true, data: policy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/policies/:id - Update policy
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const policy = await Policy.findOneAndUpdate(
      { _id: req.params.id, ...query },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    res.json({ success: true, data: policy });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/policies/:id - Delete policy
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const policy = await Policy.findOneAndDelete({
      _id: req.params.id,
      ...query,
    });

    if (!policy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    res.json({ success: true, message: 'Policy deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/policies/:id/version - Create new version of policy
router.post('/:id/version', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const existingPolicy = await Policy.findOne({ _id: req.params.id, ...query });
    if (!existingPolicy) {
      return res.status(404).json({ success: false, error: 'Policy not found' });
    }

    // Archive the old version
    existingPolicy.status = 'superseded';
    existingPolicy.effectiveTo = new Date();
    await existingPolicy.save();

    // Create new version
    const newPolicy = new Policy({
      ...req.body,
      tenantId,
      organizationId: existingPolicy.organizationId,
      departmentId: existingPolicy.departmentId,
      branchId: existingPolicy.branchId,
      type: existingPolicy.type,
      code: existingPolicy.code,
      appliesTo: existingPolicy.appliesTo,
      name: existingPolicy.name,
      description: existingPolicy.description,
      version: existingPolicy.version + 1,
      effectiveFrom: req.body.effectiveFrom || new Date(),
      status: 'draft',
    });

    await newPolicy.save();

    res.status(201).json({
      success: true,
      data: newPolicy,
      previousVersion: existingPolicy._id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
