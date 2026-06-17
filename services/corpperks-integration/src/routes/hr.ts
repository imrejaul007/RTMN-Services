import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { EmployeeProfile, EmployeeCreateInput, EmployeeUpdateInput, EmployeeQueryParams, validateEmployeeProfile } from '../models/EmployeeProfile';
import { syncEmployeeToTwin } from '../services/employeeSync';
import { logger } from '../index';

const router = Router();

// In-memory store for demo (replace with database in production)
const employees: Map<string, EmployeeProfile> = new Map();

// Helper to build response
function buildEmployeeResponse(employee: EmployeeProfile) {
  return {
    success: true,
    data: employee,
    timestamp: new Date().toISOString()
  };
}

function buildListResponse(employees: EmployeeProfile[], total: number, page: number, limit: number) {
  return {
    success: true,
    data: employees,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    timestamp: new Date().toISOString()
  };
}

// Create new employee
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: EmployeeCreateInput = req.body;

    // Validate input
    const errors = validateEmployeeProfile(input);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
        timestamp: new Date().toISOString()
      });
    }

    const employeeId = uuidv4();
    const employeeNumber = `EMP-${Date.now().toString(36).toUpperCase()}`;

    const employee: EmployeeProfile = {
      employeeId,
      employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      companyId: input.companyId,
      department: input.department,
      jobTitle: input.jobTitle,
      employmentType: input.employmentType,
      workLocation: input.workLocation,
      managerId: input.managerId,
      payStructure: input.payStructure,
      bankAccount: input.bankAccount,
      taxInformation: input.taxInformation,
      emergencyContact: input.emergencyContact,
      benefitsPackage: input.benefitsPackage,
      status: 'pending',
      hireDate: new Date().toISOString(),
      twins: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
      version: 1
    };

    employees.set(employeeId, employee);

    // Sync to Employee Twin
    try {
      const twinResult = await syncEmployeeToTwin(employee);
      if (twinResult.success) {
        employee.twins.employeeTwinId = twinResult.twinId;
        employee.syncStatus = 'synced';
        employee.lastSyncedAt = new Date().toISOString();
        employees.set(employeeId, employee);
      }
    } catch (syncError) {
      logger.warn('Failed to sync employee to twin:', syncError);
    }

    logger.info(`Employee created: ${employeeId}`);
    res.status(201).json(buildEmployeeResponse(employee));
  } catch (error) {
    next(error);
  }
});

// Get all employees with filtering
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const params: EmployeeQueryParams = {
      companyId: req.query.companyId as string,
      department: req.query.department as string,
      status: req.query.status as EmployeeProfile['status'],
      employmentType: req.query.employmentType as EmployeeProfile['employmentType'],
      managerId: req.query.managerId as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || 'hireDate',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    let filtered = Array.from(employees.values());

    // Apply filters
    if (params.companyId) {
      filtered = filtered.filter(e => e.companyId === params.companyId);
    }
    if (params.department) {
      filtered = filtered.filter(e => e.department === params.department);
    }
    if (params.status) {
      filtered = filtered.filter(e => e.status === params.status);
    }
    if (params.employmentType) {
      filtered = filtered.filter(e => e.employmentType === params.employmentType);
    }
    if (params.managerId) {
      filtered = filtered.filter(e => e.managerId === params.managerId);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = (a as any)[params.sortBy!] || '';
      const bVal = (b as any)[params.sortBy!] || '';
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return params.sortOrder === 'asc' ? comparison : -comparison;
    });

    const total = filtered.length;
    const page = params.page!;
    const limit = params.limit!;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    res.json(buildListResponse(paginated, total, page, limit));
  } catch (error) {
    next(error);
  }
});

// Get employee by ID
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = employees.get(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
        employeeId: req.params.id,
        timestamp: new Date().toISOString()
      });
    }

    res.json(buildEmployeeResponse(employee));
  } catch (error) {
    next(error);
  }
});

// Update employee
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = employees.get(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
        employeeId: req.params.id,
        timestamp: new Date().toISOString()
      });
    }

    const input: EmployeeUpdateInput = req.body;
    const updatedEmployee: EmployeeProfile = {
      ...employee,
      ...input,
      employeeId: employee.employeeId,
      employeeNumber: employee.employeeNumber,
      companyId: employee.companyId,
      updatedAt: new Date().toISOString(),
      version: employee.version + 1,
      syncStatus: 'pending'
    };

    employees.set(req.params.id, updatedEmployee);

    // Sync update to Employee Twin
    try {
      const twinResult = await syncEmployeeToTwin(updatedEmployee);
      if (twinResult.success) {
        updatedEmployee.syncStatus = 'synced';
        updatedEmployee.lastSyncedAt = new Date().toISOString();
        employees.set(req.params.id, updatedEmployee);
      }
    } catch (syncError) {
      logger.warn('Failed to sync employee update to twin:', syncError);
    }

    logger.info(`Employee updated: ${req.params.id}`);
    res.json(buildEmployeeResponse(updatedEmployee));
  } catch (error) {
    next(error);
  }
});

// Delete employee (soft delete - set status to terminated)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employee = employees.get(req.params.id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
        employeeId: req.params.id,
        timestamp: new Date().toISOString()
      });
    }

    employee.status = 'terminated';
    employee.terminationDate = new Date().toISOString();
    employee.terminationReason = req.body.reason || 'Not specified';
    employee.updatedAt = new Date().toISOString();
    employee.syncStatus = 'pending';

    employees.set(req.params.id, employee);

    // Sync termination to Employee Twin
    try {
      await syncEmployeeToTwin(employee);
    } catch (syncError) {
      logger.warn('Failed to sync termination to twin:', syncError);
    }

    logger.info(`Employee terminated: ${req.params.id}`);
    res.json(buildEmployeeResponse(employee));
  } catch (error) {
    next(error);
  }
});

// Get employee by manager
router.get('/manager/:managerId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const directReports = Array.from(employees.values())
      .filter(e => e.managerId === req.params.managerId);

    res.json({
      success: true,
      data: directReports,
      count: directReports.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get employees by department
router.get('/department/:department', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deptEmployees = Array.from(employees.values())
      .filter(e => e.department === req.params.department);

    res.json({
      success: true,
      data: deptEmployees,
      count: deptEmployees.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get employee statistics
router.get('/stats/summary', (req: Request, res: Response, next: NextFunction) => {
  try {
    const allEmployees = Array.from(employees.values());

    const stats = {
      total: allEmployees.length,
      byStatus: {
        active: allEmployees.filter(e => e.status === 'active').length,
        onLeave: allEmployees.filter(e => e.status === 'on-leave').length,
        pending: allEmployees.filter(e => e.status === 'pending').length,
        terminated: allEmployees.filter(e => e.status === 'terminated').length
      },
      byEmploymentType: {
        fullTime: allEmployees.filter(e => e.employmentType === 'full-time').length,
        partTime: allEmployees.filter(e => e.employmentType === 'part-time').length,
        contractor: allEmployees.filter(e => e.employmentType === 'contractor').length,
        intern: allEmployees.filter(e => e.employmentType === 'intern').length
      },
      departments: Array.from(new Set(allEmployees.map(e => e.department))).map(dept => ({
        name: dept,
        count: allEmployees.filter(e => e.department === dept).length
      })),
      synced: allEmployees.filter(e => e.syncStatus === 'synced').length,
      pendingSync: allEmployees.filter(e => e.syncStatus === 'pending').length,
      failedSync: allEmployees.filter(e => e.syncStatus === 'failed').length
    };

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Bulk sync employees to twins
router.post('/sync/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const employee of employees.values()) {
      try {
        const twinResult = await syncEmployeeToTwin(employee);
        if (twinResult.success) {
          employee.twins.employeeTwinId = twinResult.twinId;
          employee.syncStatus = 'synced';
          employee.lastSyncedAt = new Date().toISOString();
          employees.set(employee.employeeId, employee);
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`Failed to sync ${employee.employeeId}: ${twinResult.error}`);
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error syncing ${employee.employeeId}: ${error.message}`);
      }
    }

    logger.info(`Bulk sync completed: ${results.success} success, ${results.failed} failed`);
    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
