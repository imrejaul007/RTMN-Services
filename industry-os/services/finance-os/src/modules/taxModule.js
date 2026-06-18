/**
 * RTMN Finance OS - Tax Module
 *
 * GST, TDS, Income Tax, Compliance
 */

import express from 'express';
const router = express.Router();

// GST Rates
const GST_RATES = {
  '5': ['wheat flour', 'sugar', 'tea', 'edible oils'],
  '12': ['computers', 'processed foods'],
  '18': ['financial services', 'transport', 'restaurants'],
  '28': ['luxury goods', 'tobacco', 'aerated beverages'],
};

// GST Registration Types
const GST_REGISTRATIONS = [
  { type: 'regular', name: 'Regular', rate: 18 },
  { type: 'composition', name: 'Composition', rate: 3 },
  { type: 'gstin', name: 'GSTIN', pattern: /^([0-9]{2}[A-Z]{4}[0-9]{4}[A-Z]{1}[0-9]{1}[Z]{1}[0-9]{1}$/ },
];

// TDS Sections
const TDS_SECTIONS = {
  '192': { name: 'Salaries', rate: 'Average slab', description: 'Payment of salary' },
  '192A': { name: 'PF', rate: '10', description: 'Premature PF withdrawal' },
  '193': { name: 'Securities', rate: '10', description: 'Interest on securities' },
  '194': { name: 'Dividends', rate: '10', description: 'Dividend' },
  '194C': { name: 'Contractors', rate: '1/2', description: 'Payment to contractors' },
  '194H': { name: 'Commission', rate: '10', description: 'Brokerage/Commission' },
  '194I': { name: 'Rent', rate: '10/20', description: 'Rent' },
  '194J': { name: 'Professional', rate: '10', description: 'Professional fees' },
  '194Q': { name: 'TCS', rate: '0.1', description: 'Purchase of goods > 50L' },
};

// ============================================================
// GST MODULE
// ============================================================

// Get GST summary
router.get('/gst/summary', (req, res) => {
  const invoices = Array.from(db.invoices.values());
  const bills = Array.from(db.bills.values());

  const salesGST = invoices.reduce((sum, inv) => {
    const tax = inv.items?.reduce((s, i) => s + (i.tax || 0), 0) || 0;
    return sum + tax;
  }, 0);

  const purchaseGST = bills.reduce((sum, bill) => {
    const tax = bill.items?.reduce((s, i) => s + (i.tax || 0), 0) || 0;
    return sum + tax;
  }, 0);

  const gstr1 = {
    b2b: invoices.filter(i => i.gstin).length,
    b2c: invoices.filter(i => !i.gstin).length,
    totalInvoices: invoices.length,
    totalSales: invoices.reduce((sum, i) => sum + i.total, 0),
    taxCollected: salesGST,
  };

  const gstr3b = {
    totalTaxableValue: invoices.reduce((sum, i) => sum + i.subtotal, 0),
    cgst: salesGST / 2,
    sgst: salesGST / 2,
    igst: 0,
    totalTax: salesGST,
    itcClaimed: purchaseGST,
    taxPayable: Math.max(0, salesGST - purchaseGST),
  };

  res.json({
    period: new Date().toISOString().slice(0, 7),
    gstr1,
    gstr3b,
    summary: {
      gstrDue: Math.max(0, salesGST - purchaseGST),
      itcAvailable: purchaseGST,
      cashFlow: -gstr3b.taxPayable,
    },
    filingDue: '20th of next month',
  });
});

// Calculate GST
router.post('/gst/calculate', (req, res) => {
  const { amount, type, category, hsnCode } = req.body;

  let rate = 18; // Default
  if (category && GST_RATES[category]) {
    rate = parseInt(category);
  }

  const cgst = (amount * rate) / 200;
  const sgst = cgst;
  const igst = 0;
  const totalTax = cgst + sgst + igst;

  res.json({
    amount,
    rate,
    cgst,
    sgst,
    igst,
    totalTax,
    totalWithTax: amount + totalTax,
    hsnCode: hsnCode || '9999',
  });
});

// GST Invoice
router.post('/gst/invoice', (req, res) => {
  const { customerName, customerGstin, items, placeOfSupply, reverseCharge } = req.body;

  // Validate GSTIN
  const gstinRegex = /^([0-9]{2}[A-Z]{4}[0-9]{4}[A-Z]{1}[0-9]{1}[Z]{1}[0-9]{1}$/;
  if (customerGstin && !gstinRegex.test(customerGstin)) {
    return res.status(400).json({ error: 'Invalid GSTIN format' });
  }

  // Calculate tax
  const taxableValue = items.reduce((sum, i) => sum + (i.amount || 0), 0);
  const cgst = taxableValue * 0.09;
  const sgst = cgst;
  const igst = 0;

  const invoice = {
    id: `GSTINV-${Date.now()}`,
    invoiceNumber: `GST-${new Date().getTime()}`,
    date: new Date().toISOString(),
    customerName,
    customerGstin,
    placeOfSupply,
    reverseCharge: reverseCharge || false,
    items,
    taxableValue,
    cgst,
    sgst,
    igst,
    totalTax: cgst + sgst + igst,
    totalAmount: taxableValue + cgst + sgst + igst,
    status: 'generated',
  };

  res.status(201).json(invoice);
});

// GST Reconciliation
router.get('/gst/reconciliation', (req, res) => {
  const invoices = Array.from(db.invoices.values());
  const journalEntries = Array.from(db.journalEntries.values());

  // GST from invoices
  const gstFromInvoices = invoices.reduce((sum, inv) => {
    return sum + (inv.tax || 0);
  }, 0);

  // GST from GL
  const gstFromGL = journalEntries
    .filter(je => je.entries.some(e => e.account === 'GST_PAYABLE'))
    .reduce((sum, je) => {
      const gstEntry = je.entries.find(e => e.account === 'GST_PAYABLE');
      return sum + (gstEntry?.credit || 0);
    }, 0);

  res.json({
    gstFromInvoices,
    gstFromGL,
    mismatch: Math.abs(gstFromInvoices - gstFromGL) > 1,
    difference: gstFromInvoices - gstFromGL,
    status: Math.abs(gstFromInvoices - gstFromGL) < 1 ? 'Reconciled' : 'MISMATCH',
  });
});

// GST Filing Calendar
router.get('/gst/filing-calendar', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const filings = [
    {
      return: 'GSTR-1',
      frequency: 'Monthly',
      dueDate: `${year}-${String(month + 2).padStart(2, '0')}-11`,
      status: now.getDate() > 11 ? 'Overdue' : 'Pending',
    },
    {
      return: 'GSTR-3B',
      frequency: 'Monthly',
      dueDate: `${year}-${String(month + 2).padStart(2, '0')}-20`,
      status: now.getDate() > 20 ? 'Overdue' : 'Pending',
    },
    {
      return: 'GSTR-9',
      frequency: 'Annual',
      dueDate: `${year + 1}-12-31`,
      status: 'Pending',
    },
  ];

  res.json({
    currentPeriod: `${year}-${String(month + 1).padStart(2, '0')}`,
    filings,
  });
});

// ============================================================
// TDS MODULE
// ============================================================

// Get TDS summary
router.get('/tds/summary', (req, res) => {
  const journalEntries = Array.from(db.journalEntries.values());

  // TDS from payroll
  const payrollTDS = journalEntries
    .filter(je => je.reference?.startsWith('PAY-'))
    .reduce((sum, je) => {
      const tdsEntry = je.entries.find(e => e.account === 'TDS_PAYABLE');
      return sum + (tdsEntry?.debit || 0);
    }, 0);

  // TDS from contractors
  const contractorTDS = journalEntries
    .filter(je => je.description?.toLowerCase().includes('contractor'))
    .reduce((sum, je) => {
      const tdsEntry = je.entries.find(e => e.account === 'TDS_PAYABLE');
      return sum + (tdsEntry?.credit || 0);
    }, 0);

  // TDS from rent
  const rentTDS = journalEntries
    .filter(je => je.description?.toLowerCase().includes('rent'))
    .reduce((sum, je) => {
      const tdsEntry = je.entries.find(e => e.account === 'TDS_PAYABLE');
      return sum + (tdsEntry?.credit || 0);
    }, 0);

  res.json({
    period: new Date().toISOString().slice(0, 7),
    sections: TDS_SECTIONS,
    summary: {
      payroll: payrollTDS,
      contractors: contractorTDS,
      rent: rentTDS,
      total: payrollTDS + contractorTDS + rentTDS,
    },
    filingDue: '7th of next month',
  });
});

// Calculate TDS
router.post('/tds/calculate', (req, res) => {
  const { section, amount, panAvailable } = req.body;

  const sectionInfo = TDS_SECTIONS[section];
  if (!sectionInfo) {
    return res.status(400).json({ error: 'Invalid TDS section' });
  }

  let rate = 0;
  const rateStr = sectionInfo.rate;

  if (rateStr === 'Average slab') {
    // Calculate based on average rate (simplified)
    rate = 20;
  } else if (rateStr.includes('/')) {
    rate = rateStr.split('/').map(r => parseFloat(r))[0];
  } else {
    rate = parseFloat(rateStr);
  }

  // Higher rate without PAN
  const effectiveRate = panAvailable ? rate : rate * 2;
  const tds = (amount * effectiveRate) / 100;

  res.json({
    section: sectionInfo.name,
    amount,
    rate: effectiveRate,
    tds,
    tdsRateWithPan: rate,
    tdsRateWithoutPan: rate * 2,
    tan: 'XXXX00000X',
  });
});

// Form 16A Generator
router.get('/tds/form16a/:quarter/:year', (req, res) => {
  const { quarter, year } = req.params;

  const form16a = {
    certificateNumber: `192Q${quarter}${year}`,
    quarter: `Q${quarter}`,
    year,
    deductor: {
      name: 'RTMN Technologies Pvt Ltd',
      tan: 'XXXX00000X',
      gstin: '29XXXXX0000X0XX',
      address: 'Bangalore, Karnataka',
    },
    deductee: {
      name: 'Contractor Name',
      pan: 'XXXXX0000X',
      address: 'Address',
    },
    details: [
      { srNo: 1, date: '2026-01-15', amount: 100000, rate: 10, tds: 10000 },
      { srNo: 2, date: '2026-02-15', amount: 100000, rate: 10, tds: 10000 },
      { srNo: 3, date: '2026-03-15', amount: 100000, rate: 10, tds: 10000 },
    ],
    totalAmount: 300000,
    totalTDS: 30000,
    taxDeducted: 30000,
    bookEntry: 'Available',
    status: 'Generated',
  };

  res.json(form16a);
});

// ============================================================
// INCOME TAX MODULE
// ============================================================

// Tax Slabs FY 2025-26
const INCOME_TAX_SLABS = {
  'old': [
    { min: 0, max: 250000, rate: 0, tax: 0 },
    { min: 250001, max: 500000, rate: 5, tax: 12500 },
    { min: 500001, max: 1000000, rate: 20, tax: 112500 },
    { min: 1000001, max: Infinity, rate: 30, tax: 112500 + 150000 },
  ],
  'new': [
    { min: 0, max: 300000, rate: 0, tax: 0 },
    { min: 300001, max: 700000, rate: 5, tax: 20000 },
    { min: 700001, max: 1000000, rate: 10, tax: 20000 + 30000 },
    { min: 1000001, max: 1200000, rate: 15, tax: 50000 + 30000 },
    { min: 1200001, max: 1500000, rate: 20, tax: 80000 + 60000 },
    { min: 1500001, max: Infinity, rate: 30, tax: 140000 + 150000 },
  ],
};

// Calculate Income Tax
router.post('/income-tax/calculate', (req, res) => {
  const { grossSalary, deductions, regime } = req.body;

  // Simplified calculation
  const exemptions = {
    '80C': Math.min(deductions?.['80C'] || 0, 150000),
    '80D': Math.min(deductions?.['80D'] || 0, 25000),
    '80CCD1B': Math.min(deductions?.['80CCD1B'] || 0, 50000),
    hra: Math.min(deductions?.hra || 0, grossSalary * 0.4),
    standardDeduction: 75000,
  };

  const totalDeductions = Object.values(exemptions).reduce((sum, v) => sum + v, 0);
  const taxableIncome = Math.max(0, grossSalary - totalDeductions);

  // Calculate tax based on regime
  const slabs = regime === 'new' ? INCOME_TLABS.new : INCOME_TAX_SLABS.old;
  let tax = 0;
  let remaining = taxableIncome;

  for (const slab of slabs) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, slab.max - slab.min + 1);
    if (taxable > 0 && slab.rate > 0) {
      tax += (taxable * slab.rate) / 100;
    }
    remaining -= taxable;
  }

  // Rebate under 87A
  const rebate = taxableIncome <= 500000 ? tax : 0;
  tax = Math.max(0, tax - rebate);

  // Add cess
  const totalTax = tax + (tax * 0.04);

  res.json({
    regime: regime === 'new' ? 'New Tax Regime' : 'Old Tax Regime',
    grossSalary,
    exemptions,
    totalDeductions,
    taxableIncome,
    taxBeforeRebate: tax,
    rebate87A: rebate,
    taxAfterRebate: tax - rebate,
    cess4Percent: tax * 0.04,
    totalTaxLiability: totalTax,
    effectiveRate: ((totalTax / grossSalary) * 100).toFixed(2),
    monthlyTax: totalTax / 12,
  });
});

// ============================================================
// COMPLIANCE CALENDAR
// ============================================================

router.get('/compliance/calendar', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const compliance = [
    {
      type: 'GST',
      return: 'GSTR-1',
      dueDate: `${year}-${String(month + 2).padStart(2, '0')}-11`,
      status: 'Pending',
      penalty: '₹200/day',
    },
    {
      type: 'GST',
      return: 'GSTR-3B',
      dueDate: `${year}-${String(month + 2).padStart(2, '0')}-20`,
      status: 'Pending',
      penalty: '₹50/day',
    },
    {
      type: 'TDS',
      return: 'TDS 24Q',
      dueDate: `${year}-${String(month + 2).padStart(2, '0')}-31`,
      status: 'Pending',
      penalty: '₹200/day',
    },
    {
      type: 'PF',
      return: 'EPF Challan',
      dueDate: `${year}-${String(month + 2).padStart(2, '0')}-15`,
      status: 'Pending',
      penalty: '₹500/day',
    },
    {
      type: 'ESI',
      return: 'ESI Challan',
      dueDate: `${year}-${String(month + 2).padStart(2, '0')}-21`,
      status: 'Pending',
      penalty: '₹500/day',
    },
    {
      type: 'Professional Tax',
      return: 'PT Return',
      dueDate: `${year}-${String(month + 2).padStart(2, '0')}-30`,
      status: 'Pending',
      penalty: 'Varies by state',
    },
    {
      type: 'Income Tax',
      return: 'Advance Tax',
      dueDate: `${year}-06-15`,
      status: 'Pending',
      penalty: 'Interest @ 1%',
    },
    {
      type: 'GST',
      return: 'Annual Return GSTR-9',
      dueDate: `${year + 1}-12-31`,
      status: 'Pending',
      penalty: '₹200/day',
    },
  ];

  res.json({
    currentDate: now.toISOString(),
    compliance,
    upcomingCount: compliance.filter(c => c.status === 'Pending').length,
  });
});

export default router;
