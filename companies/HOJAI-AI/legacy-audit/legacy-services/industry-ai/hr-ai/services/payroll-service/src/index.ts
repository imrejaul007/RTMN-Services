/**
 * HOJAI HR Payroll Service
 * Employee management, payroll processing, attendance
 * Reuses: CorpPerks pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Employee {
  id: string;
  empId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  joiningDate: string;
  status: 'active' | 'on_leave' | 'resigned' | 'terminated';
  salary: { basic: number; hra: number; allowances: number; deductions: number };
  bankAccount?: string;
  pan?: string;
  attendance: { present: number; absent: number; leaves: number };
}

interface Attendance {
  id: string;
  empId: string;
  date: string;
  status: 'present' | 'absent' | 'leave' | 'holiday';
  inTime?: string;
  outTime?: string;
  hoursWorked?: number;
}

interface PayrollRun {
  id: string;
  month: string; // YYYY-MM
  processedAt: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: 'draft' | 'processed' | 'paid';
  slips: PayrollSlip[];
}

interface PayrollSlip {
  empId: string;
  empName: string;
  daysWorked: number;
  grossSalary: number;
  deductions: { pf: number; tds: number; leaves: number; other: number };
  netSalary: number;
  status: 'pending' | 'approved' | 'paid';
}

const employees = new Map<string, Employee>();
const attendance = new Map<string, Attendance>();
const payrollRuns = new Map<string, PayrollRun>();

// Employee CRUD
router.post('/employees', async (req, res) => {
  try {
    const employee: Employee = {
      ...req.body,
      id: uuidv4(),
      attendance: { present: 0, absent: 0, leaves: 0 },
    };
    employees.set(employee.id, employee);
    res.status(201).json({ success: true, employee });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

router.get('/employees', async (req, res) => {
  try {
    const { department, status } = req.query;
    let result = Array.from(employees.values());

    if (department) result = result.filter(e => e.department === department);
    if (status) result = result.filter(e => e.status === status);

    res.json({ employees: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

// Attendance
router.post('/attendance', async (req, res) => {
  try {
    const { empId, date, status, inTime, outTime } = req.body;

    const record: Attendance = {
      id: uuidv4(),
      empId,
      date,
      status,
      inTime,
      outTime,
    };

    if (inTime && outTime) {
      const [inH, inM] = inTime.split(':').map(Number);
      const [outH, outM] = outTime.split(':').map(Number);
      record.hoursWorked = (outH - inH) + (outM - inM) / 60 - 1; // Minus lunch
    }

    attendance.set(record.id, record);

    // Update employee attendance
    const emp = Array.from(employees.values()).find(e => e.empId === empId);
    if (emp) {
      if (status === 'present') emp.attendance.present++;
      if (status === 'absent') emp.attendance.absent++;
      if (status === 'leave') emp.attendance.leaves++;
      employees.set(emp.id, emp);
    }

    res.status(201).json({ success: true, record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record attendance' });
  }
});

router.get('/attendance', async (req, res) => {
  try {
    const { empId, month } = req.query;
    let result = Array.from(attendance.values());

    if (empId) result = result.filter(a => a.empId === empId);
    if (month) result = result.filter(a => a.date.startsWith(month));

    res.json({ records: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// Process payroll
router.post('/payroll/process', async (req, res) => {
  try {
    const { month } = req.body; // YYYY-MM

    const slips: PayrollSlip[] = [];
    let totalGross = 0;
    let totalDeductions = 0;

    employees.forEach(emp => {
      if (emp.status !== 'active') return;

      const gross = emp.salary.basic + emp.salary.hra + emp.salary.allowances;
      const pf = Math.round(emp.salary.basic * 0.12);
      const tds = Math.round(gross * 0.1);
      const leaveDeduction = Math.round(gross / 30 * emp.attendance.absent);
      const totalDeduction = pf + tds + leaveDeduction + emp.salary.deductions;
      const net = gross - totalDeduction;

      slips.push({
        empId: emp.empId,
        empName: emp.name,
        daysWorked: 30 - emp.attendance.absent - emp.attendance.leaves,
        grossSalary: gross,
        deductions: { pf, tds, leaves: leaveDeduction, other: emp.salary.deductions },
        netSalary: net,
        status: 'pending',
      });

      totalGross += gross;
      totalDeductions += totalDeduction;
    });

    const payrollRun: PayrollRun = {
      id: uuidv4(),
      month,
      processedAt: new Date().toISOString(),
      employeeCount: slips.length,
      totalGross,
      totalDeductions,
      totalNet: totalGross - totalDeductions,
      status: 'draft',
      slips,
    };

    payrollRuns.set(payrollRun.id, payrollRun);

    res.status(201).json({ success: true, payroll: payrollRun });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process payroll' });
  }
});

router.get('/payroll/:id', async (req, res) => {
  try {
    const payroll = payrollRuns.get(req.params.id);
    if (!payroll) return res.status(404).json({ error: 'Payroll run not found' });
    res.json({ payroll });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll' });
  }
});

router.get('/payroll', async (req, res) => {
  try {
    const allRuns = Array.from(payrollRuns.values()).sort(
      (a, b) => new Date(b.processedAt).getTime() - new Date(a.processedAt).getTime()
    );
    res.json({ payrollRuns: allRuns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch payroll runs' });
  }
});

export { router, employees, attendance, payrollRuns };
