import { Router, Request, Response } from 'express';
import { Branch, IBranch } from '../models/Branch';
import { BusinessHours } from '../models/BusinessHours';
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

// GET /api/branches - List branches
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const { organizationId, departmentId, type, status, city, isHeadquarters, page = 1, limit = 50 } = req.query;
    const filter: Record<string, unknown> = { ...query };

    if (organizationId) filter.organizationId = organizationId;
    if (departmentId) filter.departmentId = departmentId;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (city) filter['address.city'] = city;
    if (isHeadquarters !== undefined) filter.isHeadquarters = isHeadquarters === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [branches, total] = await Promise.all([
      Branch.find(filter)
        .populate('organizationId', 'name code')
        .populate('departmentId', 'name code')
        .populate('managerEmployeeId', 'firstName lastName employeeId')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Branch.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: branches,
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

// POST /api/branches - Create branch
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-ID header is required' });
    }

    // If this is marked as headquarters, unset other headquarters
    if (req.body.isHeadquarters) {
      await Branch.updateMany(
        { organizationId: req.body.organizationId, ...query },
        { $set: { isHeadquarters: false } }
      );
    }

    const branch = new Branch({
      ...req.body,
      tenantId,
    });

    await branch.save();

    // Create default business hours for the branch
    const businessHours = new BusinessHours({
      tenantId,
      branchId: branch._id,
      schedule: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
        saturday: { isOpen: false },
        sunday: { isOpen: false },
      },
    });

    await businessHours.save();

    res.status(201).json({
      success: true,
      data: {
        ...branch.toObject(),
        businessHours: businessHours.toObject(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/branches/:id - Get branch by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const branch = await Branch.findOne({
      _id: req.params.id,
      ...query,
    })
      .populate('organizationId', 'name code email')
      .populate('departmentId', 'name code')
      .populate('managerEmployeeId', 'firstName lastName employeeId email');

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    res.json({ success: true, data: branch });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/branches/:id - Update branch
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    // If marking as headquarters, unset other headquarters first
    if (req.body.isHeadquarters) {
      const currentBranch = await Branch.findOne({ _id: req.params.id, ...query });
      if (currentBranch && currentBranch.organizationId) {
        await Branch.updateMany(
          { organizationId: currentBranch.organizationId, _id: { $ne: req.params.id } },
          { $set: { isHeadquarters: false } }
        );
      }
    }

    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, ...query },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    res.json({ success: true, data: branch });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/branches/:id - Delete branch
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const branch = await Branch.findOneAndDelete({
      _id: req.params.id,
      ...query,
    });

    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    // Also delete associated business hours
    await BusinessHours.deleteOne({ branchId: req.params.id });

    res.json({ success: true, message: 'Branch deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/branches/:id/hours - Get branch business hours
router.get('/:id/hours', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const branch = await Branch.findOne({ _id: req.params.id, ...query });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    let businessHours = await BusinessHours.findOne({ branchId: req.params.id });

    if (!businessHours) {
      // Create default business hours if not exists
      businessHours = new BusinessHours({
        tenantId: branch.tenantId,
        branchId: branch._id,
      });
      await businessHours.save();
    }

    res.json({ success: true, data: businessHours });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/branches/:id/hours - Update branch business hours
router.put('/:id/hours', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const branch = await Branch.findOne({ _id: req.params.id, ...query });
    if (!branch) {
      return res.status(404).json({ success: false, error: 'Branch not found' });
    }

    let businessHours = await BusinessHours.findOne({ branchId: req.params.id });

    if (!businessHours) {
      businessHours = new BusinessHours({
        tenantId: branch.tenantId,
        branchId: branch._id,
        ...req.body,
      });
    } else {
      businessHours.set(req.body);
    }

    await businessHours.save();

    res.json({ success: true, data: businessHours });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
