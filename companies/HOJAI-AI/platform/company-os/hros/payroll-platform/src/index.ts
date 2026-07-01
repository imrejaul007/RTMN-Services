/**
 * HROS - Payroll Platform
 *
 * Complete payroll processing for India + Global
 * Inspired by:greythr + Keka + Rizq + BambooHR
 *
 * Modules:
 * - Salary Processing
 * - Statutory Compliance (PF/ESI/TDS/PT/LWF)
 * - Reimbursements
 * - Loans & Advances
 * - Payroll Reports
 * - Payslip Generation
 * - Bank Transfers
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface EmployeePayroll {
  employeeId: string;
  employeeCode: string;
  name: string;
  department: string;
  designation: string;
  location: string;

  // Salary Components
  salary: SalaryComponents;

  // Statutory
  statutory: StatutoryComponents;

  // Bank Details
  bank: BankDetails;

  // Tax
  tax: TaxInfo;
}

export interface SalaryComponents {
  basic: number;
  hra: number;
  conveyance: number;
  medical: number;
  special: number;
  lta: number;
  allowances: number;
  bonuses: number;
  incentives: number;
  totalEarnings: number;
  professionalTax: number;
  tds: number;
  deductions: number;
  totalDeductions: number;
  netPay: number;
}

export interface StatutoryComponents {
  pf: PFContribution;
  esi: ESIContribution;
  tds: TDSDeduction;
  professionalTax: number;
  labourWelfareFund: number;
}

export interface PFContribution {
  epf: number;          // Employee PF deduction
  eps: number;          // Pension scheme
  erf: number;          // Employer PF contribution
  edli: number;         // Insurance
  totalEmployer: number;
}

export interface ESIContribution {
  employeeShare: number;
  employerShare: number;
  total: number;
}

export interface TDSDeduction {
  section: string;
  amount: number;
  exemptAllowances: number;
  taxablePerquisites: number;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: 'savings' | 'current';
  salaryType: 'bank' | 'upi' | 'wallet';
}

export interface TaxInfo {
  pan: string;
  tan?: string;
  taxRegime: 'old' | 'new';
  financialYear: string;
  assessmentYear: string;
  exemptAllowances: ExemptAllowance[];
  deductions80C: Deduction80C;
  deductions80D: Deduction80D;
  otherDeductions: OtherDeduction[];
  totalTaxableIncome: number;
  totalTax: number;
  cess: number;
  totalTaxPayable: number;
}

export interface ExemptAllowance {
  type: 'hra' | 'lta' | 'conveyance' | 'food' | 'education' | 'other';
  amount: number;
  maximumExemption: number;
  exemptAmount: number;
  taxableAmount: number;
}

export interface Deduction80C {
  section: string;
  items: { name: string; amount: number }[];
  total: number;
  maxLimit: number;
}

export interface Deduction80D {
  section: string;
  selfHealth: number;
  parentHealth: number;
  total: number;
  maxLimit: number;
}

export interface OtherDeduction {
  section: string;
  description: string;
  amount: number;
}

export interface PayrollRun {
  id: string;
  month: string;          // '2026-07'
  status: 'draft' | 'calculating' | 'approved' | 'processed' | 'paid';
  employeeCount: number;
  totalEarnings: number;
  totalDeductions: number;
  totalNetPay: number;
  processedAt?: Date;
  approvedBy?: string;
  paidAt?: Date;
  paymentReference?: string;
}

export interface Reimbursement {
  id: string;
  employeeId: string;
  type: 'travel' | 'medical' | 'phone' | 'internet' | 'books' | 'fuel' | 'other';
  description: string;
  amount: number;
  receipts: string[];
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedAt?: Date;
  paidInMonth?: string;
}

export interface Loan {
  id: string;
  employeeId: string;
  type: 'salary_advance' | 'personal' | 'vehicle' | 'housing';
  principal: number;
  interestRate: number;
  tenure: number;        // months
  emi: number;
  outstanding: number;
  disbursedOn: Date;
  nextDueDate: Date;
  status: 'active' | 'closed' | 'defaulted';
  repayments: Repayment[];
}

export interface Repayment {
  date: Date;
  amount: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface Payslip {
  id: string;
  employeeId: string;
  month: string;
  payrollRunId: string;

  employee: {
    name: string;
    code: string;
    designation: string;
    department: string;
    uan?: string;      // PF number
    esiNumber?: string;
    pan: string;
    bank: string;
    accountNo: string;
  };

  earnings: {
    basic: number;
    hra: number;
    allowances: number;
    bonus: number;
    totalEarnings: number;
  };

  deductions: {
    pf: number;
    esi: number;
    tds: number;
    professionalTax: number;
    otherDeductions: number;
    totalDeductions: number;
  };

  employerContributions: {
    pf: number;
    esi: number;
    lwf: number;
  };

  netPay: number;
  workingDays: number;
  paidDays: number;
  lossOfPay: number;

  generatedAt: Date;
}

// ============================================================
// STORAGE
// ============================================================

const employeeSalaries = new Map<string, EmployeePayroll>();
const payrollRuns = new Map<string, PayrollRun>();
const reimbursements = new Map<string, Reimbursement[]>();
const loans = new Map<string, Loan[]>();
const payslips = new Map<string, Payslip[]>();

// Statutory Configurations
const STATUTORY_CONFIG = {
  pf: {
    epfRate: 0.12,          // 12% of basic
    epsRate: 0.0833,        // 8.33% of basic (capped at 15000)
    erfRate: 0.0367,        // 3.67% of basic
    edliRate: 0.005,        // 0.5% of basic (capped at 75)
    maxSalary: 15000,        // Salary cap for PF
    minWage: 17825,         // Minimum wage for Delhi
  },
  esi: {
    employeeRate: 0.0075,    // 0.75%
    employerRate: 0.0325,    // 3.25%
    maxSalary: 21000,       // Salary cap for ESI
  },
  tds: {
    oldRegime: {
      '0-300000': 0,
      '300001-600000': 0.05,
      '600001-900000': 0.10,
      '900001-1200000': 0.15,
      '1200001-1500000': 0.20,
      '1500000+': 0.30,
    },
    newRegime: {
      '0-300000': 0,
      '300001-700000': 0.05,
      '700001-1000000': 0.10,
      '1000001-1200000': 0.15,
      '1200001-1500000': 0.20,
      '1500000+': 0.30,
    },
  },
  professionalTax: {
    '0-5000': 0,
    '5001-10000': 175,
    '10001-99999999': 200,
  },
};

// ============================================================
// ROUTES - EMPLOYEE SALARY SETUP
// ============================================================

router.post('/salaries', async (req, res) => {
  try {
    const { employeeId, salary, statutory, bank, tax } = req.body;

    const payroll: EmployeePayroll = {
      employeeId,
      employeeCode: req.body.employeeCode,
      name: req.body.name,
      department: req.body.department,
      designation: req.body.designation,
      location: req.body.location || 'Bangalore',
      salary: calculateSalaryComponents(salary || {}),
      statutory: calculateStatutory(employeeId, salary?.basic || 0),
      bank: bank || {},
      tax: tax || { pan: '', taxRegime: 'new', financialYear: '2026-27' },
    };

    employeeSalaries.set(employeeId, payroll);
    res.status(201).json({ success: true, payroll });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/salaries/:employeeId', async (req, res) => {
  try {
    const payroll = employeeSalaries.get(req.params.employeeId);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Employee salary not found' });
    }
    res.json({ success: true, payroll });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/salaries/:employeeId', async (req, res) => {
  try {
    const payroll = employeeSalaries.get(req.params.employeeId);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Employee salary not found' });
    }

    const updates = req.body;
    Object.assign(payroll, updates);

    // Recalculate if salary changed
    if (updates.salary) {
      payroll.salary = calculateSalaryComponents(updates.salary);
      payroll.statutory = calculateStatutory(req.params.employeeId, updates.salary.basic);
    }

    employeeSalaries.set(req.params.employeeId, payroll);
    res.json({ success: true, payroll });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - PAYROLL RUN
// ============================================================

router.post('/runs', async (req, res) => {
  try {
    const { month } = req.body;

    const run: PayrollRun = {
      id: crypto.randomUUID(),
      month,
      status: 'draft',
      employeeCount: 0,
      totalEarnings: 0,
      totalDeductions: 0,
      totalNetPay: 0,
    };

    payrollRuns.set(run.id, run);
    res.status(201).json({ success: true, run });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/runs/:id/process', async (req, res) => {
  try {
    const run = payrollRuns.get(req.params.id);
    if (!run) {
      return res.status(404).json({ success: false, error: 'Payroll run not found' });
    }

    run.status = 'calculating';
    payrollRuns.set(run.id, run);

    // Process all employees
    let totalEarnings = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;
    let processed = 0;

    for (const [employeeId, payroll] of employeeSalaries) {
      // Get reimbursements for this month
      const empReimbursements = (reimbursements.get(employeeId) || [])
        .filter(r => r.status === 'approved' && !r.paidInMonth)
        .reduce((sum, r) => sum + r.amount, 0);

      // Deduct loan EMIs
      const activeLoans = (loans.get(employeeId) || [])
        .filter(l => l.status === 'active');

      const loanEmi = activeLoans.reduce((sum, l) => sum + l.emi, 0);

      // Calculate net pay
      const netPay = payroll.salary.netPay + empReimbursements - loanEmi;

      totalEarnings += payroll.salary.totalEarnings + empReimbursements;
      totalDeductions += payroll.salary.totalDeductions + loanEmi;
      totalNetPay += netPay;
      processed++;
    }

    run.employeeCount = processed;
    run.totalEarnings = totalEarnings;
    run.totalDeductions = totalDeductions;
    run.totalNetPay = totalNetPay;
    run.status = 'approved';
    run.processedAt = new Date();

    payrollRuns.set(run.id, run);
    res.json({ success: true, run });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/runs', async (req, res) => {
  try {
    const { status, month } = req.query;
    let result = Array.from(payrollRuns.values());

    if (status) result = result.filter(r => r.status === status);
    if (month) result = result.filter(r => r.month === month);

    result.sort((a, b) => b.month.localeCompare(a.month));

    res.json({ success: true, runs: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - REIMBURSEMENTS
// ============================================================

router.post('/reimbursements', async (req, res) => {
  try {
    const { employeeId, type, description, amount, receipts } = req.body;

    const reimbursement: Reimbursement = {
      id: crypto.randomUUID(),
      employeeId,
      type,
      description,
      amount,
      receipts: receipts || [],
      status: 'pending',
    };

    const empReimbursements = reimbursements.get(employeeId) || [];
    empReimbursements.push(reimbursement);
    reimbursements.set(employeeId, empReimbursements);

    res.status(201).json({ success: true, reimbursement });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reimbursements/:employeeId', async (req, res) => {
  try {
    const empReimbursements = reimbursements.get(req.params.employeeId) || [];
    const { status, month } = req.query;

    let result = empReimbursements;
    if (status) result = result.filter(r => r.status === status);

    res.json({ success: true, reimbursements: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/reimbursements/:id/approve', async (req, res) => {
  try {
    const { employeeId } = req.body;

    for (const [empId, empReimbursements] of reimbursements) {
      const idx = empReimbursements.findIndex(r => r.id === req.params.id);
      if (idx !== -1) {
        empReimbursements[idx].status = 'approved';
        empReimbursements[idx].approvedBy = req.body.approvedBy;
        empReimbursements[idx].approvedAt = new Date();
        reimbursements.set(empId, empReimbursements);
        res.json({ success: true, reimbursement: empReimbursements[idx] });
        return;
      }
    }

    res.status(404).json({ success: false, error: 'Reimbursement not found' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - LOANS
// ============================================================

router.post('/loans', async (req, res) => {
  try {
    const { employeeId, type, principal, interestRate, tenure } = req.body;

    const emi = calculateEMI(principal, interestRate, tenure);

    const loan: Loan = {
      id: crypto.randomUUID(),
      employeeId,
      type,
      principal,
      interestRate,
      tenure,
      emi,
      outstanding: principal,
      disbursedOn: new Date(),
      nextDueDate: calculateNextDueDate(tenure),
      status: 'active',
      repayments: [],
    };

    const empLoans = loans.get(employeeId) || [];
    empLoans.push(loan);
    loans.set(employeeId, empLoans);

    res.status(201).json({ success: true, loan });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/loans/:employeeId', async (req, res) => {
  try {
    const empLoans = loans.get(req.params.employeeId) || [];
    res.json({ success: true, loans: empLoans, count: empLoans.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - REPORTS
// ============================================================

router.get('/reports/payroll-register/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const run = Array.from(payrollRuns.values()).find(r => r.month === month);

    const register = Array.from(employeeSalaries.entries()).map(([id, payroll]) => {
      const empReimbursements = (reimbursements.get(id) || [])
        .filter(r => r.status === 'approved' && !r.paidInMonth)
        .reduce((sum, r) => sum + r.amount, 0);

      const activeLoans = (loans.get(id) || []).filter(l => l.status === 'active');
      const loanEmi = activeLoans.reduce((sum, l) => sum + l.emi, 0);

      return {
        employeeId: id,
        name: payroll.name,
        code: payroll.employeeCode,
        department: payroll.department,
        basic: payroll.salary.basic,
        earnings: payroll.salary.totalEarnings + empReimbursements,
        deductions: payroll.salary.totalDeductions + loanEmi,
        netPay: payroll.salary.netPay + empReimbursements - loanEmi,
      };
    });

    const totals = register.reduce(
      (acc, emp) => ({
        earnings: acc.earnings + emp.earnings,
        deductions: acc.deductions + emp.deductions,
        netPay: acc.netPay + emp.netPay,
      }),
      { earnings: 0, deductions: 0, netPay: 0 }
    );

    res.json({
      success: true,
      month,
      run,
      register,
      totals,
      employeeCount: register.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/statutory/:month', async (req, res) => {
  try {
    const { month } = req.params;

    let totalPF = 0;
    let totalESI = 0;
    let totalTDS = 0;
    let totalPT = 0;

    for (const [, payroll] of employeeSalaries) {
      totalPF += payroll.statutory.pf.totalEmployer + payroll.statutory.pf.epf;
      totalESI += payroll.statutory.esi.total;
      totalTDS += payroll.statutory.tds.amount;
      totalPT += payroll.statutory.professionalTax;
    }

    res.json({
      success: true,
      month,
      statutory: {
        pf: {
          employeeContribution: totalPF * 0.75,
          employerContribution: totalPF * 0.25,
          totalPF,
        },
        esi: totalESI,
        tds: totalTDS,
        professionalTax: totalPT,
        grandTotal: totalPF + totalESI + totalTDS + totalPT,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reports/bank-transfer/:month', async (req, res) => {
  try {
    const { month } = req.params;

    const transfers = Array.from(employeeSalaries.entries()).map(([id, payroll]) => {
      const empReimbursements = (reimbursements.get(id) || [])
        .filter(r => r.status === 'approved' && !r.paidInMonth)
        .reduce((sum, r) => sum + r.amount, 0);

      const activeLoans = (loans.get(id) || []).filter(l => l.status === 'active');
      const loanEmi = activeLoans.reduce((sum, l) => sum + l.emi, 0);

      return {
        employeeId: id,
        name: payroll.name,
        accountNumber: payroll.bank.accountNumber,
        ifscCode: payroll.bank.ifscCode,
        amount: payroll.salary.netPay + empReimbursements - loanEmi,
      };
    });

    const total = transfers.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      month,
      transfers,
      totalAmount: total,
      employeeCount: transfers.length,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - TAX CALCULATION
// ============================================================

router.post('/tax/calculate/:employeeId', async (req, res) => {
  try {
    const payroll = employeeSalaries.get(req.params.employeeId);
    if (!payroll) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const tax = calculateIncomeTax(payroll);

    res.json({ success: true, tax });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateSalaryComponents(input: Partial<SalaryComponents>): SalaryComponents {
  const basic = input.basic || 0;
  const hra = input.hra || basic * 0.4;
  const conveyance = input.conveyance || 1600;
  const medical = input.medical || 1250;
  const special = input.special || basic * 0.1;
  const lta = input.lta || basic * 0.1;
  const allowances = input.allowances || 0;
  const bonuses = input.bonuses || 0;
  const incentives = input.incentives || 0;

  const totalEarnings = basic + hra + conveyance + medical + special + lta + allowances + bonuses + incentives;

  const professionalTax = calculateProfessionalTax(totalEarnings);
  const tds = input.tds || 0;
  const deductions = professionalTax + tds;
  const totalDeductions = deductions;
  const netPay = totalEarnings - totalDeductions;

  return {
    basic,
    hra,
    conveyance,
    medical,
    special,
    lta,
    allowances,
    bonuses,
    incentives,
    totalEarnings,
    professionalTax,
    tds,
    deductions,
    totalDeductions,
    netPay,
  };
}

function calculateStatutory(employeeId: string, basic: number): StatutoryComponents {
  // PF calculation (capped at 15000)
  const pfBasic = Math.min(basic, 15000);
  const epf = pfBasic * 0.12;
  const eps = Math.min(pfBasic * 0.0833, 15000 * 0.0833);
  const erf = pfBasic * 0.0367;
  const edli = pfBasic * 0.005;

  // ESI calculation (if salary <= 21000)
  const esiBasic = basic <= 21000 ? basic : 0;
  const employeeESI = esiBasic * 0.0075;
  const employerESI = esiBasic * 0.0325;

  return {
    pf: {
      epf,
      eps,
      erf,
      edli,
      totalEmployer: erf + eps + edli,
    },
    esi: {
      employeeShare: employeeESI,
      employerShare: employerESI,
      total: employeeESI + employerESI,
    },
    tds: {
      section: '192',
      amount: 0,
      exemptAllowances: 0,
      taxablePerquisites: 0,
    },
    professionalTax: calculateProfessionalTax(basic * 12) / 12,
    labourWelfareFund: 0,
  };
}

function calculateProfessionalTax(annualIncome: number): number {
  const config = STATUTORY_CONFIG.professionalTax;
  if (annualIncome <= 5000) return config['0-5000'] || 0;
  if (annualIncome <= 10000) return config['5001-10000'] || 175;
  return config['10001-99999999'] || 200;
}

function calculateIncomeTax(payroll: EmployeePayroll): TaxInfo {
  const grossIncome = payroll.salary.totalEarnings * 12;
  const exemptAllowances = calculateExemptAllowances(payroll);

  const taxableIncome = grossIncome - exemptAllowances.total;

  // Simplified tax calculation (New Regime)
  let tax = 0;
  if (taxableIncome <= 300000) tax = 0;
  else if (taxableIncome <= 700000) tax = (taxableIncome - 300000) * 0.05;
  else if (taxableIncome <= 1000000) tax = 20000 + (taxableIncome - 700000) * 0.10;
  else if (taxableIncome <= 1200000) tax = 50000 + (taxableIncome - 1000000) * 0.15;
  else if (taxableIncome <= 1500000) tax = 80000 + (taxableIncome - 1200000) * 0.20;
  else tax = 140000 + (taxableIncome - 1500000) * 0.30;

  const cess = tax * 0.04;

  return {
    ...payroll.tax,
    exemptAllowances: exemptAllowances.items,
    totalTaxableIncome: taxableIncome,
    totalTax: Math.round(tax),
    cess: Math.round(cess),
    totalTaxPayable: Math.round(tax + cess),
  };
}

function calculateExemptAllowances(payroll: EmployeePayroll): { total: number; items: ExemptAllowance[] } {
  const items: ExemptAllowance[] = [];
  let total = 0;

  // HRA Exemption (simplified)
  const hraExempt = Math.min(
    payroll.salary.hra * 12,
    payroll.salary.basic * 0.4 * 12,
    payroll.salary.basic * 0.5 * 12
  );
  items.push({
    type: 'hra',
    amount: payroll.salary.hra * 12,
    maximumExemption: payroll.salary.basic * 0.5 * 12,
    exemptAmount: hraExempt,
    taxableAmount: (payroll.salary.hra * 12) - hraExempt,
  });
  total += hraExempt;

  // LTA Exemption
  items.push({
    type: 'lta',
    amount: payroll.salary.lta * 12,
    maximumExemption: payroll.salary.basic * 12 * 0.1,
    exemptAmount: Math.min(payroll.salary.lta * 12, payroll.salary.basic * 12 * 0.1),
    taxableAmount: 0,
  });

  return { total, items };
}

function calculateEMI(principal: number, annualRate: number, tenure: number): number {
  const monthlyRate = annualRate / 12 / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) /
    (Math.pow(1 + monthlyRate, tenure) - 1);
  return Math.round(emi);
}

function calculateNextDueDate(tenure: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
}

export default router;
