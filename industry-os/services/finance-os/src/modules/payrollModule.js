/**
 * RTMN Finance OS - Payroll Module
 */

import express from 'express';
const router = express.Router();

// Salary Components
const SALARY_COMPONENTS = [
  { id: 'basic', name: 'Basic', type: 'earning', percentage: 50, taxable: true },
  { id: 'hra', name: 'HRA', type: 'earning', percentage: 40, taxable: true },
  { id: 'conveyance', name: 'Conveyance', type: 'earning', percentage: 5, taxable: false },
  { id: 'medical', name: 'Medical Allowance', type: 'earning', percentage: 5, taxable: false },
  { id: 'special', name: 'Special Allowance', type: 'earning', percentage: 0, taxable: true },
  { id: 'pf', name: 'PF', type: 'deduction', percentage: 12, employer: 12, capped: 1800 },
  { id: 'esi', name: 'ESI', type: 'deduction', percentage: 0.75, employer: 3.25 },
  { id: 'tds', name: 'TDS', type: 'deduction', percentage: 0, taxable: true },
  { id: 'prof_tax', name: 'Professional Tax', type: 'deduction', percentage: 0, fixed: 200 },
];

// Statutory Components
const STATUTORY_RATES = {
  pf: { employee: 12, employer: 13, maxSalary: 15000 },
  esi: { employee: 0.75, employer: 3.25, maxSalary: 21000 },
  tds: { rate: 0 }, // Calculated based on slabs
  professionalTax: { states: { Karnataka: 200, Maharashtra: 200, Delhi: 200, Tamil Nadu: 0, Other: 0 } },
};

// TDS Slabs (FY 2025-26)
const TDS_SLABS = [
  { min: 0, max: 300000, rate: 0, surcharge: 0 },
  { min: 300001, max: 600000, rate: 5, surcharge: 0 },
  { min: 600001, max: 900000, rate: 10, surcharge: 0 },
  { min: 900001, max: 1200000, rate: 15, surcharge: 0 },
  { min: 1200001, max: 1500000, rate: 20, surcharge: 0 },
  { min: 1500001, max: Infinity, rate: 30, surcharge: 0 },
];

// Get salary components
router.get('/components', (req, res) => {
  res.json({
    salaryComponents: SALARY_COMPONENTS,
    statutoryRates: STATUTORY_RATES,
  });
});

// Create payroll run
router.post('/runs', (req, res) => {
  const { month, year, departmentId, employeeIds } = req.body;

  if (!month || !year) {
    return res.status(400).json({ error: 'Month and year required' });
  }

  const id = `PAYRUN-${year}-${month.padStart(2, '0')}`;
  const date = new Date(year, month - 1, 1).toISOString();

  // Get employees (from mock data)
  const employees = Array.from(db.employees?.values() || []);
  const selectedEmployees = employeeIds?.length
    ? employees.filter(e => employeeIds.includes(e.id))
    : employees;

  const payrollRecords = selectedEmployees.map(emp => {
    const gross = emp.salary?.basic || 50000;
    const components = calculateSalaryComponents(gross);

    return {
      id: `PAY-${id}-${emp.id}`,
      employeeId: emp.id,
      employeeName: emp.firstName + ' ' ' + emp.lastName,
      department: emp.departmentId,
      month,
      year,
      ...components,
      status: 'calculated',
      processedAt: null,
    };
  });

  const run = {
    id,
    month,
    year,
    date,
    departmentId,
    employeeCount: payrollRecords.length,
    employees: payrollRecords,
    summary: {
      totalGross: payrollRecords.reduce((sum, r) => sum + r.grossSalary, 0),
      totalDeductions: payrollRecords.reduce((sum, r) => sum + r.totalDeductions, 0),
      totalNet: payrollRecords.reduce((sum, r) => sum + r.netSalary, 0),
      totalPF: payrollRecords.reduce((sum, r) => sum + r.pfEmployee, 0),
      totalTDS: payrollRecords.reduce((sum, r) => sum + r.tds, 0),
    },
    status: 'draft',
    approvedBy: null,
    approvedAt: null,
    bankFileGenerated: false,
    createdAt: new Date().toISOString(),
  };

  db.payrollRuns = db.payrollRuns || new Map();
  db.payrollRuns.set(id, run);

  res.status(201).json(run);
});

// Get payroll runs
router.get('/runs', (req, res) => {
  const { year, status } = req.query;
  let runs = Array.from(db.payrollRuns?.values() || []);

  if (year) runs = runs.filter(r => r.year === year);
  if (status) runs = runs.filter(r => r.status === status);

  runs.sort((a, b) => new Date(b.date) - new Date(a.date));

  res.json({ runs, total: runs.length });
});

// Get payroll run details
router.get('/runs/:id', (req, res) => {
  const run = db.payrollRuns?.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });

  res.json(run);
});

// Approve payroll
router.post('/runs/:id/approve', (req, res) => {
  const run = db.payrollRuns?.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });

  const { approvedBy } = req.body;
  run.status = 'approved';
  run.approvedBy = approvedBy || 'finance_manager';
  run.approvedAt = new Date().toISOString();

  db.payrollRuns.set(run.id, run);

  res.json(run);
});

// Process payroll
router.post('/runs/:id/process', (req, res) => {
  const run = db.payrollRuns?.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });

  // Create journal entries for each employee
  run.employees.forEach(record => {
    const jeId = `JE-${record.id}`;
    const journalEntry = {
      id: jeId,
      date: run.date,
      description: `Salary - ${record.employeeName} - ${run.month}/${run.year}`,
      reference: record.id,
      entries: [
        { account: 'SALARY_EXP', debit: record.grossSalary, credit: 0 },
        { account: 'PF_PAYABLE', debit: record.pfEmployee, credit: 0 },
        { account: 'TDS_PAYABLE', debit: record.tds, credit: 0 },
        { account: 'BANK', debit: 0, credit: record.netSalary },
      ],
      status: 'posted',
      source: 'payroll',
      createdBy: 'system',
      createdAt: new Date().toISOString(),
    };

    db.journalEntries.set(jeId, journalEntry);
  });

  run.status = 'processed';
  run.processedAt = new Date().toISOString();
  run.bankFileGenerated = true;

  db.payrollRuns.set(run.id, run);

  res.json(run);
});

// Generate bank file
router.get('/runs/:id/bank-file', (req, res) => {
  const run = db.payrollRuns?.get(req.params.id);
  if (!run) return res.status(404).json({ error: 'Payroll run not found' });

  // Generate NEFT/RTPS file format
  const bankFile = run.employees.map(emp => ({
    accountNumber: 'XXXX1234',
    employeeName: emp.employeeName,
    bankName: 'HDFC Bank',
    ifsc: 'HDFC0001234',
    amount: emp.netSalary,
    mode: 'NEFT',
    remark: `Salary ${run.month}/${run.year}`,
  }));

  res.json({
    runId: run.id,
    fileFormat: 'NEFT',
    recordCount: bankFile.length,
    totalAmount: run.summary.totalNet,
    records: bankFile,
  });
});

// Calculate TDS
function calculateTDS(annualGross) {
  let tax = 0;
  let remaining = annualGross;

  for (const slab of TDS_SLABS) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, slab.max - slab.min + 1);
    tax += taxable * (slab.rate / 100);
    remaining -= taxable;
  }

  // Rebate under 87A for income < 5L
  if (annualGross <= 500000) tax = 0;

  // Add cess
  tax = tax + (tax * 0.04);

  return Math.round(tax / 12); // Monthly TDS
}

// Calculate salary components
function calculateSalaryComponents(grossSalary) {
  const basic = grossSalary * 0.5; // 50% of gross
  const hra = basic * 0.4; // 40% of basic
  const conveyance = Math.min(grossSalary * 0.05, 1600);
  const medical = Math.min(grossSalary * 0.05, 1250);
  const special = grossSalary - basic - hra - conveyance - medical;

  const earnings = basic + hra + conveyance + medical + special;

  // PF (12% of basic, max 1800)
  const pfEmployee = Math.min(basic * 0.12, 1800);
  const pfEmployer = Math.min(basic * 0.13, 1800);

  // ESI (0.75% of gross < 21000)
  const esiEmployee = grossSalary <= 21000 ? grossSalary * 0.0075 : 0;
  const esiEmployer = grossSalary <= 21000 ? grossSalary * 0.0325 : 0;

  // Professional Tax
  const profTax = 200;

  // TDS (simplified)
  const annualGross = grossSalary * 12;
  const tds = Math.round(calculateTDS(annualGross) / 12);

  const totalEarnings = basic + hra + conveyance + medical + special;
  const totalDeductions = pfEmployee + esiEmployee + tds + profTax;

  return {
    grossSalary,
    basic,
    hra,
    conveyance,
    medical,
    specialAllowance: special,
    totalEarnings,
    pfEmployee,
    pfEmployer,
    esiEmployee,
    esiEmployer,
    tds,
    profTax,
    totalDeductions,
    netSalary: totalEarnings - totalDeductions,
  };
}

// Payslip
router.get('/payslip/:employeeId/:month/:year', (req, res) => {
  const { employeeId, month, year } = req.params;

  const run = Array.from(db.payrollRuns?.values() || [])
    .find(r => r.year === year && r.month === month);

  if (!run) return res.status(404).json({ error: 'Payslip not found' });

  const record = run.employees.find(e => e.employeeId === employeeId);
  if (!record) return res.status(404).json({ error: 'Payslip not found' });

  res.json({
    payslip: {
      ...record,
      month,
      year,
      companyName: 'RTMN Technologies Pvt Ltd',
      department: record.department,
      bankName: 'HDFC Bank',
      accountNumber: 'XXXX1234',
      pan: 'XXXXXXXXXX',
      uan: 'XXXXXXXXXXXX',
      workingDays: 30,
      daysPaid: 30,
      lop: 0,
    },
    earnings: [
      { item: 'Basic', amount: record.basic },
      { item: 'HRA', amount: record.hra },
      { item: 'Conveyance', amount: record.conveyance },
      { item: 'Medical', amount: record.medical },
      { item: 'Special Allowance', amount: record.specialAllowance },
    ],
    deductions: [
      { item: 'PF', amount: record.pfEmployee },
      { item: 'ESI', amount: record.esiEmployee },
      { item: 'TDS', amount: record.tds },
      { item: 'Professional Tax', amount: record.profTax },
    ],
  });
});

// Statutory returns
router.get('/returns/:type', (req, res) => {
  const { type } = req.params;
  const runs = Array.from(db.payrollRuns?.values() || []);

  switch (type) {
    case 'pf':
      const pfData = runs.flatMap(r => r.employees.map(e => ({
        uan: 'XXXXXXXXXXXX',
        name: e.employeeName,
        gross: e.grossSalary,
        pfWages: Math.min(e.basic, 15000),
        epf: e.pfEmployee,
        eps: e.pfEmployer - e.pfEmployee,
        er: e.pfEmployer,
      }));
      res.json({ type: 'EPF Challan', data: pfData });
      break;

    case 'esi':
      const esiData = runs.flatMap(r => r.employees
        .filter(e => e.grossSalary <= 21000)
        .map(e => ({
          ipName: e.employeeName,
          monthlyWages: e.grossSalary,
          esiEmployee: e.esiEmployee,
          esiEmployer: e.esiEmployer,
        })));
      res.json({ type: 'ESI Challan', data: esiData });
      break;

    case 'tds':
      const tdsData = runs.flatMap(r => r.employees.map(e => ({
        pan: 'XXXXXXXXXX',
        name: e.employeeName,
        grossSalary: e.grossSalary,
        amount: e.tds,
      })));
      res.json({ type: 'TDS 24Q', data: tdsData });
      break;

    default:
      res.status(400).json({ error: 'Invalid return type' });
  }
});

// Leave Encashment
router.post('/encashment', (req, res) => {
  const { employeeId, days, leaveType } = req.body;
  const basic = 50000;

  const encashmentAmount = (basic / 30) * days;

  res.json({
    employeeId,
    leaveType,
    days,
    basicSalary: basic,
    dailyRate: basic / 30,
    encashmentAmount,
    TDS: encashmentAmount * 0.1,
    netPayable: encashmentAmount * 0.9,
    eligible: days <= 15 ? 'Yes' : 'No (Max 15 days)',
  });
});

// Full and Final Settlement
router.get('/full-final/:employeeId', (req, res) => {
  const { employeeId } = req.params;

  const settlement = {
    employeeId,
    earnings: {
      salary: 50000,
      leaveEncashment: 25000,
      gratuity: 75000,
      noticePay: 50000,
    },
    deductions: {
      noticeRecovery: 0,
      leaveRecovery: 0,
      otherRecovery: 0,
    },
    summary: {
      totalEarnings: 150000,
      totalDeductions: 0,
      netPayable: 150000,
    },
  };

  res.json(settlement);
});

export default router;
