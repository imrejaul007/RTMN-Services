import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Employee, IEmployee } from '../models/Employee';
import { Skill } from '../models/Skill';
import { generateEmployeeInsights } from '../services/insights';
import { calculateWorkload } from '../services/workload';

const router = Router();

// Middleware to extract tenant ID
const extractTenantId = (req: Request): string => {
  return req.headers['x-tenant-id'] as string || 'default';
};

// Create employee
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const employeeData = {
      ...req.body,
      tenantId,
      employeeId: req.body.employeeId || uuidv4()
    };

    const employee = new Employee(employeeData);
    await employee.save();

    // Create empty skill record
    const skill = new Skill({ tenantId, employeeId: employee.employeeId });
    await skill.save();

    res.status(201).json({
      success: true,
      data: employee,
      message: 'Employee created successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get all employees (with pagination and filtering)
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const {
      page = 1,
      limit = 20,
      department,
      status,
      level,
      search
    } = req.query;

    const filter: any = { tenantId };
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (level) filter.level = level;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      Employee.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: employees,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single employee by ID
router.get('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const employee = await Employee.findOne({
      tenantId,
      employeeId: req.params.employeeId
    }).populate('skills certifications schedules trainings performanceRecords');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update employee
router.put('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const employee = await Employee.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      { $set: { ...req.body, tenantId } },
      { new: true, runValidators: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee,
      message: 'Employee updated successfully'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete employee (soft delete - change status)
router.delete('/:employeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const employee = await Employee.findOneAndUpdate(
      { tenantId, employeeId: req.params.employeeId },
      { $set: { status: 'terminated' } },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee terminated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get employee with insights
router.get('/:employeeId/insights', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const employee = await Employee.findOne({
      tenantId,
      employeeId: req.params.employeeId
    }).populate('skills certifications schedules trainings performanceRecords');

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    const insights = await generateEmployeeInsights(employee as IEmployee, tenantId);

    res.json({
      success: true,
      data: {
        employee: {
          employeeId: employee.employeeId,
          name: `${employee.firstName} ${employee.lastName}`,
          department: employee.department,
          role: employee.role,
          level: employee.level
        },
        insights
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get employee workload
router.get('/:employeeId/workload', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const { startDate, endDate } = req.query;

    const workload = await calculateWorkload(
      tenantId,
      req.params.employeeId,
      startDate as string,
      endDate as string
    );

    res.json({
      success: true,
      data: workload
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get department employees
router.get('/department/:department', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const employees = await Employee.find({
      tenantId,
      department: req.params.department,
      status: 'active'
    }).select('-__v');

    res.json({
      success: true,
      data: employees,
      count: employees.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get team members (same manager)
router.get('/team/:managerId', async (req: Request, res: Response) => {
  try {
    const tenantId = extractTenantId(req);
    const employees = await Employee.find({
      tenantId,
      managerId: req.params.managerId,
      status: 'active'
    }).select('-__v');

    res.json({
      success: true,
      data: employees,
      count: employees.length
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
