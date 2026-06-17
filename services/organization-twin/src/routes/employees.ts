import { Router, Request, Response } from 'express';
import { Employee } from '../models/Employee';
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

// GET /api/employees - List employees
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const {
      organizationId,
      departmentId,
      branchId,
      status,
      employmentType,
      role,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const filter: Record<string, unknown> = { ...query };

    if (organizationId) filter.organizationId = organizationId;
    if (departmentId) filter.departmentId = departmentId;
    if (branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;
    if (role) filter.role = role;

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { employeeId: searchRegex },
        { jobTitle: searchRegex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate('organizationId', 'name code')
        .populate('departmentId', 'name code')
        .populate('branchId', 'name code')
        .populate('reportsToEmployeeId', 'firstName lastName employeeId email')
        .sort({ lastName: 1, firstName: 1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Employee.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: employees,
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

// POST /api/employees - Create employee
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'X-Tenant-ID header is required' });
    }

    const employee = new Employee({
      ...req.body,
      tenantId,
    });

    await employee.save();

    // If reportsTo is provided, update the manager's subordinates reference
    if (req.body.reportsToEmployeeId) {
      const manager = await Employee.findById(req.body.reportsToEmployeeId);
      // Subordinates are tracked via queries, no need to update manager document
    }

    res.status(201).json({
      success: true,
      data: employee,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    if (error instanceof mongoose.Error.MongoServerError && (error as unknown as { code: number }).code === 11000) {
      return res.status(409).json({ success: false, error: 'Employee ID or email already exists' });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/employees/:id - Get employee by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const employee = await Employee.findOne({
      _id: req.params.id,
      ...query,
    })
      .populate('organizationId', 'name code email')
      .populate('departmentId', 'name code')
      .populate('branchId', 'name code type')
      .populate('reportsToEmployeeId', 'firstName lastName employeeId email jobTitle');

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// PUT /api/employees/:id - Update employee
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, ...query },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, data: employee });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, error: message, details: error.errors });
    }
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/employees/:id - Delete employee
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const employee = await Employee.findOneAndDelete({
      _id: req.params.id,
      ...query,
    });

    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Update subordinates to remove their manager reference
    await Employee.updateMany(
      { reportsToEmployeeId: req.params.id },
      { $set: { reportsToEmployeeId: null, reportsTo: null } }
    );

    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/employees/:id/subordinates - Get reporting chain (all subordinates)
router.get('/:id/subordinates', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const query = buildQuery(tenantId);

    const employee = await Employee.findOne({ _id: req.params.id, ...query });
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Build hierarchy tree of subordinates
    const getSubordinates = async (empId: string, depth = 0, maxDepth = 10): Promise<unknown[]> => {
      if (depth > maxDepth) return [];

      const subordinates = await Employee.find({
        reportsToEmployeeId: empId,
        ...query,
      })
        .select('firstName lastName employeeId email jobTitle role departmentId')
        .lean();

      const result = [];
      for (const sub of subordinates) {
        const children = await getSubordinates(sub._id.toString(), depth + 1, maxDepth);
        result.push({
          ...sub,
          directReports: children.length,
          children,
        });
      }

      return result;
    };

    const subordinates = await getSubordinates(req.params.id);

    // Also get the reporting chain (managers up to top)
    const getReportingChain = async (empId: string | null): Promise<unknown[]> => {
      const chain = [];
      let currentId = empId;

      while (currentId) {
        const manager = await Employee.findById(currentId)
          .select('firstName lastName employeeId email jobTitle reportsToEmployeeId')
          .lean();

        if (!manager) break;

        chain.push(manager);
        currentId = manager.reportsToEmployeeId?.toString() || null;
      }

      return chain;
    };

    const reportingChain = await getReportingChain(employee.reportsToEmployeeId);

    res.json({
      success: true,
      data: {
        directReports: subordinates.length,
        hierarchy: subordinates,
        reportingChain,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
