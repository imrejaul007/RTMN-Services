import { Router, Request, Response } from 'express';
import { Organization, IOrganization } from '../models/Organization';
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

// GET /api/organizations - List all organizations
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const { status, industry, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = { ...query };

    if (status) filter.status = status;
    if (industry) filter.industry = industry;

    const skip = (Number(page) - 1) * Number(limit);

    const [organizations, total] = await Promise.all([
      Organization.find(filter)
        .populate('parentOrgId', 'name code')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Organization.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: organizations,
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

// POST /api/organizations - Create organization
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-ID header is required' });
    }

    const organization = new Organization({
      ...req.body,
      tenantId,
    });

    await organization.save();

    res.status(201).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/organizations/:id - Get organization by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const organization = await Organization.findOne({
      _id: req.params.id,
      ...query,
    }).populate('parentOrgId', 'name code email');

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    res.json({ success: true, data: organization });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/organizations/:id - Update organization
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const organization = await Organization.findOneAndUpdate(
      { _id: req.params.id, ...query },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    res.json({ success: true, data: organization });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/organizations/:id - Delete organization
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const organization = await Organization.findOneAndDelete({
      _id: req.params.id,
      ...query,
    });

    if (!organization) {
      return res.status(404).json({ success: false, error: 'Organization not found' });
    }

    res.json({ success: true, message: 'Organization deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/organizations/:id/tree - Get organization hierarchy tree
router.get('/:id/tree', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const buildTree = async (orgId: string): Promise<Record<string, unknown>> => {
      const org = await Organization.findOne({ _id: orgId, ...query }).lean();
      if (!org) throw new Error('Organization not found');

      const children = await Organization.find({
        parentOrgId: orgId,
        ...query,
      }).lean();

      const childTrees = await Promise.all(children.map(c => buildTree(c._id.toString())));

      return {
        ...org,
        children: childTrees,
      };
    };

    const tree = await buildTree(req.params.id);

    res.json({ success: true, data: tree });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Organization not found') {
      return res.status(404).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
