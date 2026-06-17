import { Router, Request, Response } from 'express';
import { Department } from '../models/Department';
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

// GET /api/departments - List departments
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const { organizationId, status, type, parentDepartmentId, page = 1, limit = 50 } = req.query;
    const filter: Record<string, unknown> = { ...query };

    if (organizationId) filter.organizationId = organizationId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (parentDepartmentId) filter.parentDepartmentId = parentDepartmentId;
    else if (req.query.rootOnly === 'true') filter.parentDepartmentId = null;

    const skip = (Number(page) - 1) * Number(limit);

    const [departments, total] = await Promise.all([
      Department.find(filter)
        .populate('organizationId', 'name code')
        .populate('parentDepartmentId', 'name code')
        .populate('managerEmployeeId', 'firstName lastName employeeId')
        .sort({ name: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Department.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: departments,
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

// POST /api/departments - Create department
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-ID header is required' });
    }

    const department = new Department({
      ...req.body,
      tenantId,
    });

    await department.save();

    res.status(201).json({
      success: true,
      data: department,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/departments/:id - Get department by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const department = await Department.findOne({
      _id: req.params.id,
      ...query,
    })
      .populate('organizationId', 'name code email')
      .populate('parentDepartmentId', 'name code')
      .populate('managerEmployeeId', 'firstName lastName employeeId email');

    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    res.json({ success: true, data: department });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/departments/:id - Update department
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, ...query },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    res.json({ success: true, data: department });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/departments/:id - Delete department
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    // Check if department has child departments
    const childCount = await Department.countDocuments({
      parentDepartmentId: req.params.id,
      ...query,
    });

    if (childCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete department with child departments',
        childCount,
      });
    }

    const department = await Department.findOneAndDelete({
      _id: req.params.id,
      ...query,
    });

    if (!department) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/departments/:id/tree - Get department subtree
router.get('/:id/tree', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const buildTree = async (deptId: string): Promise<Record<string, unknown>> => {
      const dept = await Department.findOne({ _id: deptId, ...query })
        .populate('managerEmployeeId', 'firstName lastName employeeId')
        .lean();

      if (!dept) throw new Error('Department not found');

      const children = await Department.find({
        parentDepartmentId: deptId,
        ...query,
      }).lean();

      const childTrees = await Promise.all(children.map(c => buildTree(c._id.toString())));

      return {
        ...dept,
        children: childTrees,
      };
    };

    const tree = await buildTree(req.params.id);

    res.json({ success: true, data: tree });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (message === 'Department not found') {
      return res.status(404).json({ success: false, error: message });
    }
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
