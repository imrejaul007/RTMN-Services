import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { EmployeeProfile } from '../models/EmployeeProfile';
import { logger } from '../index';

const router = Router();

// In-memory stores for demo (replace with database in production)
const payrollRecords: Map<string, PayrollRecord> = new Map();
const employees: Map<string, EmployeeProfile> = new Map();

// Import employees from hr route's store
// In production, this would be a shared database

export interface PayrollRecord {
  recordId: string;
  employeeId: string;
  employeeName: string;
  payPeriod: {
    start: string;
    end: string;
    type: 'weekly' | 'biweekly' | 'monthly' | 'semimonthly';
  };
  earnings: {
    regular: number;
    overtime: number;
    bonus: number;
    commission: number;
    allowances: number;
    total: number;
  };
  deductions: {
    federalTax: number;
    stateTax: number;
    localTax: number;
    socialSecurity: number;
    medicare: number;
    healthInsurance: number;
    dentalInsurance: number;
    visionInsurance: number;
    lifeInsurance: number;
    retirement401k: number;
    other: number;
    total: number;
  };
  netPay: number;
  paymentDate: string;
  paymentMethod: 'direct_deposit' | 'check' | 'cash';
  status: 'pending' | 'processed' | 'paid' | 'failed' | 'cancelled';
  processedAt?: string;
  paidAt?: string;
  paymentReference?: string;
  twins: {
    paymentTwinId?: string;
  };
  metadata: {
    companyId: string;
    department: string;
    processedBy?: string;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PayPeriodInput {
  employeeId: string;
  hoursWorked?: number;
  overtimeHours?: number;
  bonus?: number;
  commission?: number;
  notes?: string;
}

interface PayPeriodResponse {
  success: boolean;
  record?: PayrollRecord;
  error?: string;
  timestamp: string;
}

// Calculate payroll for an employee
function calculatePayroll(employee: EmployeeProfile, input: PayPeriodInput): PayrollRecord {
  const baseSalary = employee.payStructure.baseSalary;
  const payFrequency = employee.payStructure.payFrequency;

  // Calculate period salary based on frequency
  let periodBase = 0;
  switch (payFrequency) {
    case 'weekly':
      periodBase = baseSalary / 52;
      break;
    case 'biweekly':
      periodBase = baseSalary / 26;
      break;
    case 'semimonthly':
      periodBase = baseSalary / 24;
      break;
    case 'monthly':
      periodBase = baseSalary / 12;
      break;
  }

  // Calculate hourly rate if applicable
  const hourlyRate = baseSalary / (52 * 40); // Assuming 40 hours/week

  // Calculate earnings
  const regularHours = (input.hoursWorked || 80) - (input.overtimeHours || 0);
  const regularPay = regularHours * hourlyRate;
  const overtimePay = (input.overtimeHours || 0) * hourlyRate * (employee.payStructure.overtimeRate || 1.5);
  const bonus = input.bonus || 0;
  const commission = input.commission || 0;

  const totalEarnings = regularPay + overtimePay + bonus + commission;

  // Calculate deductions
  const federalTax = totalEarnings * 0.22; // Simplified
  const stateTax = totalEarnings * 0.05; // Simplified
  const localTax = totalEarnings * 0.01;
  const socialSecurity = totalEarnings * 0.062;
  const medicare = totalEarnings * 0.0145;

  // Benefits deductions
  const healthInsurance = employee.benefitsPackage?.healthInsurance?.monthlyPremium || 0;
  const dentalInsurance = employee.benefitsPackage?.dentalInsurance?.monthlyPremium || 0;
  const visionInsurance = employee.benefitsPackage?.visionInsurance?.monthlyPremium || 0;
  const lifeInsurance = employee.benefitsPackage?.lifeInsurance?.monthlyPremium || 0;
  const retirement401k = employee.benefitsPackage?.retirement401k
    ? (totalEarnings * employee.benefitsPackage.retirement401k.contributionPercentage / 100)
    : 0;

  const totalDeductions = federalTax + stateTax + localTax + socialSecurity + medicare +
    healthInsurance + dentalInsurance + visionInsurance + lifeInsurance + retirement401k;

  const netPay = totalEarnings - totalDeductions;

  // Calculate pay period dates
  const now = new Date();
  const periodStart = new Date(now);
  periodStart.setDate(periodStart.getDate() - 14); // Last 2 weeks
  const periodEnd = new Date(now);

  return {
    recordId: uuidv4(),
    employeeId: employee.employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    payPeriod: {
      start: periodStart.toISOString().split('T')[0],
      end: periodEnd.toISOString().split('T')[0],
      type: payFrequency
    },
    earnings: {
      regular: regularPay,
      overtime: overtimePay,
      bonus: bonus,
      commission: commission,
      allowances: 0,
      total: totalEarnings
    },
    deductions: {
      federalTax,
      stateTax,
      localTax,
      socialSecurity,
      medicare,
      healthInsurance,
      dentalInsurance,
      visionInsurance,
      lifeInsurance,
      retirement401k,
      other: 0,
      total: totalDeductions
    },
    netPay,
    paymentDate: now.toISOString(),
    paymentMethod: 'direct_deposit',
    status: 'pending',
    twins: {},
    metadata: {
      companyId: employee.companyId,
      department: employee.department
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// Process payroll for a pay period
router.post('/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input: PayPeriodInput = req.body;

    if (!input.employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // In production, fetch employee from database
    // For demo, we need to create a sample employee if not exists
    let employee = employees.get(input.employeeId);

    if (!employee) {
      // Create a sample employee for demo
      employee = {
        employeeId: input.employeeId,
        employeeNumber: `EMP-${input.employeeId.substring(0, 8).toUpperCase()}`,
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
          overtimeEligible: true,
          overtimeRate: 1.5
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

    const record = calculatePayroll(employee, input);
    payrollRecords.set(record.recordId, record);

    logger.info(`Payroll processed for employee ${input.employeeId}: ${record.netPay}`);
    res.status(201).json({
      success: true,
      record,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get payroll record by ID
router.get('/record/:recordId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = payrollRecords.get(req.params.recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found',
        recordId: req.params.recordId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      record,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get payroll records for an employee
router.get('/employee/:employeeId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const employeeRecords = Array.from(payrollRecords.values())
      .filter(r => r.employeeId === req.params.employeeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const filtered = employeeRecords.filter(r => {
      const recordYear = new Date(r.payPeriod.start).getFullYear();
      return recordYear === year;
    });

    res.json({
      success: true,
      records: filtered,
      count: filtered.length,
      year,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Get payroll summary
router.get('/summary', (req: Request, res: Response, next: NextFunction) => {
  try {
    const allRecords = Array.from(payrollRecords.values());
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string) : undefined;

    let filtered = allRecords.filter(r => {
      const recordYear = new Date(r.payPeriod.start).getFullYear();
      if (month !== undefined) {
        const recordMonth = new Date(r.payPeriod.start).getMonth();
        return recordYear === year && recordMonth === month;
      }
      return recordYear === year;
    });

    const summary = {
      totalRecords: filtered.length,
      totalGrossPay: filtered.reduce((sum, r) => sum + r.earnings.total, 0),
      totalNetPay: filtered.reduce((sum, r) => sum + r.netPay, 0),
      totalDeductions: filtered.reduce((sum, r) => sum + r.deductions.total, 0),
      totalFederalTax: filtered.reduce((sum, r) => sum + r.deductions.federalTax, 0),
      totalStateTax: filtered.reduce((sum, r) => sum + r.deductions.stateTax, 0),
      totalSocialSecurity: filtered.reduce((sum, r) => sum + r.deductions.socialSecurity, 0),
      totalMedicare: filtered.reduce((sum, r) => sum + r.deductions.medicare, 0),
      totalBenefitsDeductions: filtered.reduce((sum, r) =>
        sum + r.deductions.healthInsurance + r.deductions.dentalInsurance +
        r.deductions.visionInsurance + r.deductions.retirement401k, 0),
      byStatus: {
        pending: filtered.filter(r => r.status === 'pending').length,
        processed: filtered.filter(r => r.status === 'processed').length,
        paid: filtered.filter(r => r.status === 'paid').length,
        failed: filtered.filter(r => r.status === 'failed').length
      }
    };

    res.json({
      success: true,
      summary,
      year,
      month,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Update payroll status
router.patch('/record/:recordId/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = payrollRecords.get(req.params.recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found',
        recordId: req.params.recordId,
        timestamp: new Date().toISOString()
      });
    }

    const { status, paymentReference } = req.body;

    if (!['pending', 'processed', 'paid', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses: ['pending', 'processed', 'paid', 'failed', 'cancelled'],
        timestamp: new Date().toISOString()
      });
    }

    record.status = status;
    record.updatedAt = new Date().toISOString();

    if (status === 'processed') {
      record.processedAt = new Date().toISOString();
    }

    if (status === 'paid') {
      record.paidAt = new Date().toISOString();
      if (paymentReference) {
        record.paymentReference = paymentReference;
      }
    }

    payrollRecords.set(record.recordId, record);

    logger.info(`Payroll record ${record.recordId} status updated to ${status}`);
    res.json({
      success: true,
      record,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Batch process payroll
router.post('/batch/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { employeeIds, payPeriod } = req.body;

    const results = {
      success: 0,
      failed: 0,
      records: [] as PayrollRecord[],
      errors: [] as string[]
    };

    for (const employeeId of employeeIds) {
      try {
        const employee = employees.get(employeeId);
        if (!employee) {
          results.failed++;
          results.errors.push(`Employee not found: ${employeeId}`);
          continue;
        }

        const record = calculatePayroll(employee, { employeeId, hoursWorked: payPeriod?.hoursWorked });
        payrollRecords.set(record.recordId, record);
        results.records.push(record);
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Error processing ${employeeId}: ${error.message}`);
      }
    }

    logger.info(`Batch payroll processed: ${results.success} success, ${results.failed} failed`);
    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Export payroll records
router.get('/export', (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = req.query.format || 'json';
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    let records = Array.from(payrollRecords.values())
      .filter(r => new Date(r.payPeriod.start).getFullYear() === year);

    if (format === 'csv') {
      const headers = ['Record ID', 'Employee ID', 'Employee Name', 'Period Start', 'Period End',
        'Gross Pay', 'Net Pay', 'Federal Tax', 'State Tax', 'Status'];
      const rows = records.map(r => [
        r.recordId, r.employeeId, r.employeeName, r.payPeriod.start, r.payPeriod.end,
        r.earnings.total.toFixed(2), r.netPay.toFixed(2),
        r.deductions.federalTax.toFixed(2), r.deductions.stateTax.toFixed(2), r.status
      ]);

      const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payroll-${year}.csv`);
      res.send(csv);
    } else {
      res.json({
        success: true,
        records,
        count: records.length,
        year,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
});

// Sync payroll to Payment Twin
router.post('/record/:recordId/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = payrollRecords.get(req.params.recordId);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found',
        timestamp: new Date().toISOString()
      });
    }

    // In production, call Payment Twin service
    const paymentTwinUrl = process.env.PAYMENT_TWIN_URL || 'http://localhost:3012';

    // Simulate Payment Twin sync
    record.twins.paymentTwinId = `PAY-TWIN-${record.recordId.substring(0, 8)}`;
    payrollRecords.set(record.recordId, record);

    logger.info(`Payroll record ${record.recordId} synced to Payment Twin`);
    res.json({
      success: true,
      record,
      syncInfo: {
        paymentTwinId: record.twins.paymentTwinId,
        syncedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export { router as payrollRouter, payrollRecords, employees };
export default router;
