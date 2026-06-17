import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { EmployeeProfile, BenefitsPackage, LeaveBalance } from '../models/EmployeeProfile';
import { logger } from '../index';

const router = Router();

// In-memory stores for demo
const benefitEnrollments: Map<string, BenefitEnrollment> = new Map();
const leaveRecords: Map<string, LeaveRequest> = new Map();
const employees: Map<string, EmployeeProfile> = new Map();

interface BenefitEnrollment {
  enrollmentId: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  benefits: {
    health: {
      enrolled: boolean;
      planId?: string;
      coverageType?: 'individual' | 'family' | 'spouse';
      effectiveDate?: string;
      monthlyPremium?: number;
    };
    dental: {
      enrolled: boolean;
      planId?: string;
      effectiveDate?: string;
      monthlyPremium?: number;
    };
    vision: {
      enrolled: boolean;
      planId?: string;
      effectiveDate?: string;
      monthlyPremium?: number;
    };
    life: {
      enrolled: boolean;
      coverageAmount?: number;
      effectiveDate?: string;
      monthlyPremium?: number;
    };
    retirement: {
      enrolled: boolean;
      planId?: string;
      contributionPercentage?: number;
      employerMatch?: number;
      effectiveDate?: string;
    };
  };
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  enrollmentDate: string;
  effectiveDate: string;
  terminationDate?: string;
  twins: {
    industryTwinId?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface LeaveRequest {
  requestId: string;
  employeeId: string;
  employeeName: string;
  companyId: string;
  department: string;
  type: LeaveBalance['type'];
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: string;
  comments?: string;
  balance: {
    available: number;
    used: number;
    remaining: number;
  };
  createdAt: string;
  updatedAt: string;
}

// Get benefits enrollment for an employee
router.get('/enrollment/:employeeId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollment = Array.from(benefitEnrollments.values())
      .find(e => e.employeeId === req.params.employeeId && e.status === 'active');

    if (!enrollment) {
      // Return default enrollment structure
      return res.json({
        success: true,
        enrollment: {
          employeeId: req.params.employeeId,
          benefits: {
            health: { enrolled: false },
            dental: { enrolled: false },
            vision: { enrolled: false },
            life: { enrolled: false },
            retirement: { enrolled: false }
          },
          status: 'pending'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      enrollment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Enroll employee in benefits
router.post('/enrollment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, benefits } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Get employee info
    let employee = employees.get(employeeId);
    if (!employee) {
      // Create sample employee for demo
      employee = {
        employeeId,
        employeeNumber: `EMP-${employeeId.substring(0, 8).toUpperCase()}`,
        firstName: 'Sample',
        lastName: 'Employee',
        email: 'sample@example.com',
        phone: '555-0100',
        companyId: 'DEMO-COMPANY',
        department: 'General',
        jobTitle: 'Employee',
        employmentType: 'full-time',
        workLocation: 'Remote',
        payStructure: {
          baseSalary: 60000,
          payFrequency: 'biweekly',
          currency: 'USD',
          overtimeEligible: true
        },
        bankAccount: {
          bankName: 'Demo Bank',
          accountNumber: '****1234',
          routingNumber: '****5678',
          accountType: 'checking'
        },
        taxInformation: {
          ssn: '***-**-1234',
          filingStatus: 'single',
          allowances: 1,
          additionalWithholding: 0,
          stateTaxExempt: false,
          localTaxExempt: false
        },
        emergencyContact: {
          name: 'Emergency Contact',
          relationship: 'Spouse',
          phone: '555-0199'
        },
        status: 'active',
        hireDate: new Date().toISOString(),
        twins: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
        version: 1
      };
      employees.set(employee.employeeId, employee);
    }

    const enrollment: BenefitEnrollment = {
      enrollmentId: uuidv4(),
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      companyId: employee.companyId,
      benefits: benefits || {
        health: { enrolled: false },
        dental: { enrolled: false },
        vision: { enrolled: false },
        life: { enrolled: false },
        retirement: { enrolled: false }
      },
      status: 'pending',
      enrollmentDate: new Date().toISOString(),
      effectiveDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      twins: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    benefitEnrollments.set(enrollment.enrollmentId, enrollment);

    logger.info(`Benefits enrollment created for employee ${employeeId}`);
    res.status(201).json({
      success: true,
      enrollment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update benefits enrollment
router.patch('/enrollment/:enrollmentId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollment = benefitEnrollments.get(req.params.enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Benefit enrollment not found',
        timestamp: new Date().toISOString()
      });
    }

    const updatedEnrollment: BenefitEnrollment = {
      ...enrollment,
      benefits: { ...enrollment.benefits, ...req.body.benefits },
      updatedAt: new Date().toISOString()
    };

    benefitEnrollments.set(req.params.enrollmentId, updatedEnrollment);

    logger.info(`Benefits enrollment ${req.params.enrollmentId} updated`);
    res.json({
      success: true,
      enrollment: updatedEnrollment,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get leave balances for an employee
router.get('/leave/balance/:employeeId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const balances: LeaveBalance[] = [
      { type: 'vacation', total: 15, used: 5, pending: 2, available: 8 },
      { type: 'sick', total: 10, used: 2, pending: 0, available: 8 },
      { type: 'personal', total: 3, used: 1, pending: 0, available: 2 },
      { type: 'bereavement', total: 5, used: 0, pending: 0, available: 5 },
      { type: 'parental', total: 60, used: 0, pending: 0, available: 60 }
    ];

    res.json({
      success: true,
      employeeId: req.params.employeeId,
      balances,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Request leave
router.post('/leave/request', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeId, type, startDate, endDate, reason } = req.body;

    if (!employeeId || !type || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID, leave type, start date, and end date are required',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Get employee info
    let employee = employees.get(employeeId);
    if (!employee) {
      employee = {
        employeeId,
        employeeNumber: `EMP-${employeeId.substring(0, 8).toUpperCase()}`,
        firstName: 'Sample',
        lastName: 'Employee',
        companyId: 'DEMO-COMPANY',
        department: 'General',
        jobTitle: 'Employee',
        employmentType: 'full-time',
        workLocation: 'Remote',
        payStructure: {
          baseSalary: 60000,
          payFrequency: 'biweekly',
          currency: 'USD',
          overtimeEligible: true
        },
        bankAccount: {
          bankName: 'Demo Bank',
          accountNumber: '****1234',
          routingNumber: '****5678',
          accountType: 'checking'
        },
        taxInformation: {
          ssn: '***-**-1234',
          filingStatus: 'single',
          allowances: 1,
          additionalWithholding: 0,
          stateTaxExempt: false,
          localTaxExempt: false
        },
        emergencyContact: {
          name: 'Emergency Contact',
          relationship: 'Spouse',
          phone: '555-0199'
        },
        status: 'active',
        hireDate: new Date().toISOString(),
        twins: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
        version: 1
      };
      employees.set(employee.employeeId, employee);
    }

    const leaveRequest: LeaveRequest = {
      requestId: uuidv4(),
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      companyId: employee.companyId,
      department: employee.department,
      type,
      startDate,
      endDate,
      totalDays,
      reason: reason || '',
      status: 'pending',
      balance: {
        available: 10,
        used: 0,
        remaining: 10
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    leaveRecords.set(leaveRequest.requestId, leaveRequest);

    logger.info(`Leave request created for employee ${employeeId}: ${type}`);
    res.status(201).json({
      success: true,
      request: leaveRequest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Approve/reject leave request
router.patch('/leave/:requestId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const leaveRequest = leaveRecords.get(req.params.requestId);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found',
        timestamp: new Date().toISOString()
      });
    }

    const { status, approvedBy, comments } = req.body;

    if (!['approved', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses: ['approved', 'rejected', 'cancelled'],
        timestamp: new Date().toISOString()
      });
    }

    leaveRequest.status = status;
    leaveRequest.updatedAt = new Date().toISOString();

    if (status === 'approved') {
      leaveRequest.approvedBy = approvedBy || 'System';
      leaveRequest.approvedAt = new Date().toISOString();
      leaveRequest.balance.used += leaveRequest.totalDays;
      leaveRequest.balance.remaining -= leaveRequest.totalDays;
    }

    if (comments) {
      leaveRequest.comments = comments;
    }

    leaveRecords.set(leaveRequest.requestId, leaveRequest);

    logger.info(`Leave request ${req.params.requestId} ${status}`);
    res.json({
      success: true,
      request: leaveRequest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get leave requests for an employee
router.get('/leave/requests/:employeeId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = Array.from(leaveRecords.values())
      .filter(r => r.employeeId === req.params.employeeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const status = req.query.status as string;
    const filtered = status
      ? requests.filter(r => r.status === status)
      : requests;

    res.json({
      success: true,
      requests: filtered,
      count: filtered.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get all pending leave requests (for managers)
router.get('/leave/pending', (req: Request, res: Response, next: NextFunction) => {
  try {
    const pending = Array.from(leaveRecords.values())
      .filter(r => r.status === 'pending')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    res.json({
      success: true,
      requests: pending,
      count: pending.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get available benefit plans
router.get('/plans', (req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = {
      health: [
        { planId: 'HEALTH-BASIC', name: 'Basic Health', monthlyPremium: 200, deductible: 3000, coverage: 'individual' },
        { planId: 'HEALTH-STANDARD', name: 'Standard Health', monthlyPremium: 400, deductible: 1500, coverage: 'family' },
        { planId: 'HEALTH-PREMIUM', name: 'Premium Health', monthlyPremium: 600, deductible: 500, coverage: 'family' }
      ],
      dental: [
        { planId: 'DENTAL-BASIC', name: 'Basic Dental', monthlyPremium: 25 },
        { planId: 'DENTAL-PREMIUM', name: 'Premium Dental', monthlyPremium: 50 }
      ],
      vision: [
        { planId: 'VISION-BASIC', name: 'Basic Vision', monthlyPremium: 15 },
        { planId: 'VISION-PREMIUM', name: 'Premium Vision', monthlyPremium: 30 }
      ],
      life: [
        { planId: 'LIFE-100K', name: '$100,000 Life Insurance', coverageAmount: 100000, monthlyPremium: 25 },
        { planId: 'LIFE-250K', name: '$250,000 Life Insurance', coverageAmount: 250000, monthlyPremium: 50 },
        { planId: 'LIFE-500K', name: '$500,000 Life Insurance', coverageAmount: 500000, monthlyPremium: 90 }
      ],
      retirement: [
        { planId: '401K-STANDARD', name: 'Standard 401(k)', employerMatch: 3 },
        { planId: '401K-ENHANCED', name: 'Enhanced 401(k)', employerMatch: 6 }
      ]
    };

    res.json({
      success: true,
      plans,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Sync benefits to Industry Twin
router.post('/enrollment/:enrollmentId/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollment = benefitEnrollments.get(req.params.enrollmentId);

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Benefit enrollment not found',
        timestamp: new Date().toISOString()
      });
    }

    // Sync to Industry Twin (HR)
    enrollment.twins.industryTwinId = `HR-TWIN-${enrollment.enrollmentId.substring(0, 8)}`;
    benefitEnrollments.set(enrollment.enrollmentId, enrollment);

    logger.info(`Benefits enrollment ${enrollment.enrollmentId} synced to Industry Twin`);
    res.json({
      success: true,
      enrollment,
      syncInfo: {
        industryTwinId: enrollment.twins.industryTwinId,
        syncedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as benefitsRouter, benefitEnrollments, leaveRecords, employees };
export default router;
