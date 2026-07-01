/**
 * FinanceOS - Tax OS
 *
 * Complete Indian tax compliance
 * Inspired by: ClearTax + TaxBuddy + Zoho Tax
 *
 * Modules:
 * - GST Filing
 * - TDS/TCS
 * - Income Tax
 * - International Tax
 * - Tax Reports
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface TaxConfig {
  id: string;
  type: TaxType;
  name: string;
  rate: number;
  threshold?: number;
  section?: string;
  accounts: { debitAccount: string; creditAccount: string };
  isActive: boolean;
}

export type TaxType = 'gst' | 'tds' | 'tcs' | 'cess' | 'customs_duty';

export interface GSTTransaction {
  id: string;
  type: 'sale' | 'purchase' | 'export' | 'import' | 'reverse_charge';

  invoiceId?: string;
  invoiceNumber?: string;
  date: string;

  partyName: string;
  gstin: string;
  partyState: string;

  placeOfSupply: string;
  supplyType: 'intra_state' | 'inter_state' | 'export' | 'import';

  taxableValue: number;
  rate: GSTRate;
  cgst?: number;
  sgst?: number;
  igst: number;
  cess?: number;
  totalTax: number;
  invoiceValue: number;

  hsnSummary: HSNSummary[];

  itcEligibility: 'eligible' | 'partial' | 'ineligible';
  filingStatus: 'pending' | 'filed' | 'amended';
  filedIn?: string;
}

export interface GSTRate {
  rate: number;  // 0, 5, 12, 18, 28
  type: 'exempt' | 'nil' | 'standard' | 'cess';
  description?: string;
}

export interface HSNSummary {
  hsnCode: string;
  description: string;
  uqc: string;
  quantity: number;
  totalValue: number;
  rate: number;
  taxableValue: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
}

export interface TDSEntry {
  id: string;
  section: TDSSection;

  deductorId: string;
  deductorName: string;
  deductorTAN: string;

  deducteeId: string;
  deducteeName: string;
  deducteePAN: string;
  deducteeStatus: 'individual' | 'company' | 'firm' | 'others';
  deducteeState?: string;

  paymentType: 'salary' | 'contract' | 'professional' | 'rent' | 'interest' | 'commission' | 'dividend' | 'winnings' | 'other';

  amountPaid: number;
  TDSRate: number;
  TDSAmount: number;
  surcharge?: number;
  eduCess: number;
  totalTDS: number;

  date: string;
  voucherNumber: string;
  natureOfPayment: string;

  panVerified: boolean;
  tdsRateApplied: string;

  certificateIssued: boolean;
  certificateNumber?: string;

  filingStatus: 'pending' | 'deposited' | 'filed' | 'adjusted';
  status: 'pending' | 'completed';
}

export type TDSSection = '192' | '192A' | '193' | '194' | '194A' | '194B' | '194C' | '194D' | '194H' | '194I' | '194J' | '194K' | '194LA' | '194O' | '194Q' | '195' | '196';

export interface TDSRate {
  section: TDSSection;
  description: string;
  rate: number;
  threshold: number;
  payerType: string;
  deducteeTypes: string[];
}

export interface TCSEntry {
  id: string;
  section: '206C' | '206C(1)' | '206C(1F)' | '206C(1G)';

  collectorId: string;
  collectorName: string;
  collectorGSTIN: string;

  sellerId: string;
  sellerName: string;
  sellerGSTIN: string;

  natureOfCollection: string;
  rate: number;

  amount: number;
  TCSAmount: number;

  date: string;
  receiptNumber: string;

  eInvoiceLinked?: string;
  eWaybillLinked?: string;

  filingStatus: 'pending' | 'deposited' | 'filed';
  status: 'pending' | 'completed';
}

export interface TaxFiling {
  id: string;
  type: 'gst' | 'tds' | 'tcs' | 'income_tax';

  period: string;  // '2026-07'
  year: string;

  status: 'draft' | 'filed' | 'accepted' | 'rejected';

  returnType: string;
  filingDate?: Date;
  acknowledgmentNumber?: string;

  summary: FilingSummary;

  payment: TaxPayment;

  generatedAt: Date;
  filedAt?: Date;
  filedBy?: string;
}

export interface FilingSummary {
  grossTurnover?: number;
  taxableValue?: number;
  taxLiability?: number;
  itcClaimed?: number;
  taxPayable?: number;
  interest?: number;
  lateFee?: number;
  totalTax?: number;
  totalPayment?: number;
}

export interface TaxPayment {
  amount: number;
  paymentDate: string;
  bsrCode?: string;
  challanNumber?: string;
  status: 'pending' | 'paid' | 'adjusted' | 'refunded';
}

export interface GSTReturn {
  id: string;
  type: 'gstr1' | 'gstr2' | 'gstr3b' | 'gstr9';

  period: string;
  year: string;

  // GSTR-1 (Outward)
  outwardTaxable: OutwardSummary;
  outwardZeroRated: OutwardSummary;
  outwardExempt: OutwardSummary;
  outwardNilRated: OutwardSummary;

  // GSTR-2B (Inward)
  inwardSummary: InwardSummary;

  // GSTR-3B (Summary)
  taxLiability: TaxLiabilitySummary;
  itcClaimed: ITCSummary;

  // File status
  status: 'pending' | 'filed' | 'accepted' | 'rejected';
  filedAt?: Date;
  arn?: string;
}

export interface OutwardSummary {
  count: number;
  taxableValue: number;
  rate: number;
  tax: number;
}

export interface InwardSummary {
  count: number;
  taxableValue: number;
  itcAvailable: number;
  itcNotAvailable: number;
}

export interface TaxLiabilitySummary {
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  interest: number;
  penalty: number;
  lateFee: number;
}

export interface ITCSummary {
  igst: { available: number; claimed: number };
  cgst: { available: number; claimed: number };
  sgst: { available: number; claimed: number };
  cess: { available: number; claimed: number };
}

// ============================================================
// STORAGE
// ============================================================

const taxConfigs = new Map<string, TaxConfig>();
const gstTransactions = new Map<string, GSTTransaction>();
const tdsEntries = new Map<string, TDSEntry>();
const tcsEntries = new Map<string, TCSEntry>();
const filings = new Map<string, TaxFiling>();

// Initialize GST rates
function initializeGSTConfig() {
  const rates: TaxConfig[] = [
    { id: 'gst-0', type: 'gst', name: 'GST 0%', rate: 0, accounts: { debitAccount: '', creditAccount: '' }, isActive: true },
    { id: 'gst-5', type: 'gst', name: 'GST 5%', rate: 5, accounts: { debitAccount: '', creditAccount: '' }, isActive: true },
    { id: 'gst-12', type: 'gst', name: 'GST 12%', rate: 12, accounts: { debitAccount: '', creditAccount: '' }, isActive: true },
    { id: 'gst-18', type: 'gst', name: 'GST 18%', rate: 18, accounts: { debitAccount: '', creditAccount: '' }, isActive: true },
    { id: 'gst-28', type: 'gst', name: 'GST 28%', rate: 28, accounts: { debitAccount: '', creditAccount: '' }, isActive: true },
  ];

  rates.forEach(r => taxConfigs.set(r.id, r));

  console.log(`Initialized ${rates.length} GST rates`);
}

initializeGSTConfig();

// TDS rates
const TDS_RATES: TDSRate[] = [
  { section: '192', description: 'Salary', rate: 'Slab', threshold: 0, payerType: 'Any', deducteeTypes: ['Individual', 'HUF'] },
  { section: '194A', description: 'Interest', rate: 10, threshold: 40000, payerType: 'Others', deducteeTypes: ['All'] },
  { section: '194B', description: 'Lottery/Winnings', rate: 30, threshold: 10000, payerType: 'Any', deducteeTypes: ['All'] },
  { section: '194C', description: 'Contractor', rate: 1, threshold: 30000, payerType: 'Individual/HUF', deducteeTypes: ['Individual', 'HUF', 'Firm'] },
  { section: '194C', description: 'Contractor', rate: 2, threshold: 30000, payerType: 'Others', deducteeTypes: ['Company'] },
  { section: '194D', description: 'Insurance Commission', rate: 5, threshold: 15000, payerType: 'Any', deducteeTypes: ['All'] },
  { section: '194H', description: 'Commission/Brokerage', rate: 5, threshold: 15000, payerType: 'Any', deducteeTypes: ['All'] },
  { section: '194I', description: 'Rent - Land/Building', rate: 10, threshold: 240000, payerType: 'Any', deducteeTypes: ['All'] },
  { section: '194I', description: 'Rent - Machinery', rate: 2, threshold: 240000, payerType: 'Any', deducteeTypes: ['All'] },
  { section: '194J', description: 'Professional Services', rate: 10, threshold: 30000, payerType: 'Individual/HUF', deducteeTypes: ['Individual', 'HUF'] },
  { section: '194J', description: 'Professional Services', rate: 10, threshold: 30000, payerType: 'Others', deducteeTypes: ['Company'] },
  { section: '194Q', description: 'Purchase of Goods', rate: 0.1, threshold: 5000000, payerType: 'Company', deducteeTypes: ['Resident Seller'] },
];

// ============================================================
// ROUTES - GST
// ============================================================

router.post('/gst/transactions', async (req, res) => {
  try {
    const { type, invoiceId, date, partyName, gstin, taxableValue, rate, placeOfSupply } = req.body;

    // Determine if intra-state or inter-state
    const ourState = req.body.ourState || 'Karnataka';
    const isIntraState = placeOfSupply === ourState;

    // Calculate GST
    const taxRate = rate / 100;
    const cgst = isIntraState ? taxableValue * taxRate / 2 : 0;
    const sgst = isIntraState ? taxableValue * taxRate / 2 : 0;
    const igst = isIntraState ? 0 : taxableValue * taxRate;
    const totalTax = cgst + sgst + igst;

    const transaction: GSTTransaction = {
      id: crypto.randomUUID(),
      type,
      invoiceId,
      invoiceNumber: req.body.invoiceNumber,
      date,
      partyName,
      gstin,
      partyState: req.body.partyState,
      placeOfSupply,
      supplyType: isIntraState ? 'intra_state' : 'inter_state',
      taxableValue,
      rate: { rate, type: rate === 0 ? 'nil' : 'standard' },
      igst,
      cgst,
      sgst,
      totalTax,
      invoiceValue: taxableValue + totalTax,
      hsnSummary: req.body.hsnSummary || [],
      itcEligibility: req.body.itcEligibility || 'eligible',
      filingStatus: 'pending',
    };

    gstTransactions.set(transaction.id, transaction);
    res.status(201).json({ success: true, transaction });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gst/transactions', async (req, res) => {
  try {
    const { type, period, filingStatus } = req.query;
    let result = Array.from(gstTransactions.values());

    if (type) result = result.filter(t => t.type === type);
    if (filingStatus) result = result.filter(t => t.filingStatus === filingStatus);

    res.json({ success: true, transactions: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/gst/summary/:period', async (req, res) => {
  try {
    const { period } = req.params;  // Format: '2026-07'
    const [year, month] = period.split('-');

    const transactions = Array.from(gstTransactions.values())
      .filter(t => t.date.startsWith(`${year}-${month}`));

    const summary = {
      period,
      totalTransactions: transactions.length,
      outward: {
        taxable: transactions.filter(t => t.type === 'sale' || t.type === 'export'),
        zeroRated: transactions.filter(t => t.type === 'sale' && t.rate.rate === 0),
        exempt: transactions.filter(t => t.type === 'sale' && t.rate.type === 'exempt'),
      },
      inward: {
        taxable: transactions.filter(t => t.type === 'purchase'),
        import: transactions.filter(t => t.type === 'import'),
      },
      taxSummary: {
        igst: { collected: 0, paid: 0 },
        cgst: { collected: 0, paid: 0 },
        sgst: { collected: 0, paid: 0 },
        cess: { collected: 0, paid: 0 },
      },
      itc: {
        eligible: transactions.filter(t => t.itcEligibility === 'eligible').length,
        partial: transactions.filter(t => t.itcEligibility === 'partial').length,
        ineligible: transactions.filter(t => t.itcEligibility === 'ineligible').length,
      },
    };

    // Calculate tax collected/paid
    for (const t of transactions) {
      if (t.type === 'sale' || t.type === 'export') {
        summary.taxSummary.igst.collected += t.igst;
        summary.taxSummary.cgst.collected += t.cgst || 0;
        summary.taxSummary.sgst.collected += t.sgst || 0;
        summary.taxSummary.cess.collected += t.cess || 0;
      } else {
        summary.taxSummary.igst.paid += t.igst;
        summary.taxSummary.cgst.paid += t.cgst || 0;
        summary.taxSummary.sgst.paid += t.sgst || 0;
        summary.taxSummary.cess.paid += t.cess || 0;
      }
    }

    // Calculate net liability
    const netIGST = summary.taxSummary.igst.collected - summary.taxSummary.igst.paid;
    const netCGST = summary.taxSummary.cgst.collected - summary.taxSummary.cgst.paid;
    const netSGST = summary.taxSummary.sgst.collected - summary.taxSummary.sgst.paid;

    summary.netLiability = {
      igst: netIGST,
      cgst: netCGST,
      sgst: netSGST,
      total: netIGST + netCGST + netSGST,
    };

    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gst/returns/gstr1', async (req, res) => {
  try {
    const { period } = req.body;
    const [year, month] = period.split('-');

    const transactions = Array.from(gstTransactions.values())
      .filter(t => t.date.startsWith(`${year}-${month}`) &&
        (t.type === 'sale' || t.type === 'export'));

    const gstr1: GSTReturn = {
      id: crypto.randomUUID(),
      type: 'gstr1',
      period,
      year,
      outwardTaxable: calculateOutwardSummary(transactions, t => t.rate.rate > 0 && t.supplyType !== 'export'),
      outwardZeroRated: calculateOutwardSummary(transactions, t => t.rate.rate === 0 && t.supplyType !== 'export'),
      outwardExempt: calculateOutwardSummary(transactions, t => t.rate.type === 'exempt'),
      outwardNilRated: calculateOutwardSummary(transactions, t => t.rate.type === 'nil'),
      inwardSummary: calculateInwardSummary([]),
      taxLiability: calculateTaxLiability(transactions),
      itcClaimed: calculateITC([]),
      status: 'pending',
    };

    res.json({ success: true, gstr1 });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/gst/returns/gstr3b', async (req, res) => {
  try {
    const { period } = req.body;
    const [year, month] = period.split('-');

    const transactions = Array.from(gstTransactions.values())
      .filter(t => t.date.startsWith(`${year}-${month}`));

    const summary = calculateTaxLiability(transactions);
    const itc = calculateITC(transactions);

    const taxPayable = summary.igst + summary.cgst + summary.sgst - itc.igst.claimed - itc.cgst.claimed - itc.sgst.claimed;

    const filing: TaxFiling = {
      id: crypto.randomUUID(),
      type: 'gst',
      period,
      year,
      status: 'draft',
      returnType: 'GSTR-3B',
      summary: {
        taxableValue: transactions.reduce((s, t) => s + t.taxableValue, 0),
        taxLiability: summary.igst + summary.cgst + summary.sgst,
        itcClaimed: itc.igst.claimed + itc.cgst.claimed + itc.sgst.claimed,
        taxPayable: Math.max(0, taxPayable),
        totalTax: Math.max(0, taxPayable) + summary.interest + summary.lateFee,
      },
      payment: { amount: Math.max(0, taxPayable), paymentDate: '', status: 'pending' },
      generatedAt: new Date(),
    };

    filings.set(filing.id, filing);
    res.status(201).json({ success: true, filing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - TDS
// ============================================================

router.post('/tds/entries', async (req, res) => {
  try {
    const { section, deductor, deductee, paymentType, amountPaid, date } = req.body;

    const rateConfig = TDS_RATES.find(r => r.section === section);
    if (!rateConfig) {
      return res.status(400).json({ success: false, error: 'Invalid TDS section' });
    }

    // Calculate TDS
    const threshold = rateConfig.threshold || 0;
    const applicableAmount = Math.max(0, amountPaid - threshold);
    const tdsRate = typeof rateConfig.rate === 'number' ? rateConfig.rate : 10;
    const tdsAmount = applicableAmount * tdsRate / 100;
    const eduCess = tdsAmount * 0.04;
    const totalTDS = Math.round(tdsAmount + eduCess);

    const entry: TDSEntry = {
      id: crypto.randomUUID(),
      section,
      deductorId: deductor.id,
      deductorName: deductor.name,
      deductorTAN: deductor.tan,
      deducteeId: deductee.id,
      deducteeName: deductee.name,
      deducteePAN: deductee.pan,
      deducteeStatus: deductee.status,
      paymentType,
      amountPaid,
      TDSRate: tdsRate,
      TDSAmount: Math.round(tdsAmount),
      eduCess: Math.round(eduCess),
      totalTDS,
      date,
      voucherNumber: `TDS/${section}/${Date.now()}`,
      natureOfPayment: rateConfig.description,
      panVerified: true,
      tdsRateApplied: `${tdsRate}%`,
      certificateIssued: false,
      filingStatus: 'pending',
      status: 'completed',
    };

    tdsEntries.set(entry.id, entry);
    res.status(201).json({ success: true, entry });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tds/entries', async (req, res) => {
  try {
    const { section, period, filingStatus } = req.query;
    let result = Array.from(tdsEntries.values());

    if (section) result = result.filter(e => e.section === section);
    if (filingStatus) result = result.filter(e => e.filingStatus === filingStatus);

    res.json({ success: true, entries: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tds/summary/:quarter/:year', async (req, res) => {
  try {
    const { quarter, year } = req.params;
    const quarters: Record<string, string[]> = {
      'Q1': ['01', '02', '03'],
      'Q2': ['04', '05', '06'],
      'Q3': ['07', '08', '09'],
      'Q4': ['10', '11', '12'],
    };

    const months = quarters[quarter] || [];
    const dateFilter = (date: string) => {
      const month = date.split('-')[1];
      return months.includes(month) && date.startsWith(year);
    };

    const entries = Array.from(tdsEntries.values())
      .filter(e => dateFilter(e.date));

    const summary = {
      quarter,
      year,
      totalEntries: entries.length,
      totalAmount: entries.reduce((s, e) => s + e.amountPaid, 0),
      totalTDS: entries.reduce((s, e) => s + e.totalTDS, 0),
      bySection: {} as Record<string, { count: number; amount: number; tds: number }>,
      byStatus: {} as Record<string, number>,
    };

    for (const entry of entries) {
      if (!summary.bySection[entry.section]) {
        summary.bySection[entry.section] = { count: 0, amount: 0, tds: 0 };
      }
      summary.bySection[entry.section].count++;
      summary.bySection[entry.section].amount += entry.amountPaid;
      summary.bySection[entry.section].tds += entry.totalTDS;

      summary.byStatus[entry.filingStatus] = (summary.byStatus[entry.filingStatus] || 0) + 1;
    }

    res.json({ success: true, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/tds/rates', async (req, res) => {
  try {
    res.json({ success: true, rates: TDS_RATES });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// ROUTES - FILINGS
// ============================================================

router.get('/filings', async (req, res) => {
  try {
    const { type, status, period } = req.query;
    let result = Array.from(filings.values());

    if (type) result = result.filter(f => f.type === type);
    if (status) result = result.filter(f => f.status === status);
    if (period) result = result.filter(f => f.period === period);

    res.json({ success: true, filings: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/filings/:id/file', async (req, res) => {
  try {
    const filing = filings.get(req.params.id);
    if (!filing) {
      return res.status(404).json({ success: false, error: 'Filing not found' });
    }

    filing.status = 'filed';
    filing.filedAt = new Date();
    filing.filedBy = req.body.filedBy;

    // Mark transactions as filed
    if (filing.type === 'gst') {
      for (const [id, txn] of gstTransactions) {
        if (txn.date.startsWith(filing.period)) {
          txn.filingStatus = 'filed';
          txn.filedIn = filing.id;
          gstTransactions.set(id, txn);
        }
      }
    }

    filings.set(req.params.id, filing);
    res.json({ success: true, filing });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function calculateOutwardSummary(
  transactions: GSTTransaction[],
  filter: (t: GSTTransaction) => boolean
): OutwardSummary {
  const filtered = transactions.filter(filter);
  return {
    count: filtered.length,
    taxableValue: filtered.reduce((s, t) => s + t.taxableValue, 0),
    rate: filtered[0]?.rate.rate || 0,
    tax: filtered.reduce((s, t) => s + t.igst + (t.cgst || 0) + (t.sgst || 0), 0),
  };
}

function calculateInwardSummary(transactions: GSTTransaction[]): InwardSummary {
  const taxable = transactions.filter(t => t.type === 'purchase' || t.type === 'import');
  return {
    count: taxable.length,
    taxableValue: taxable.reduce((s, t) => s + t.taxableValue, 0),
    itcAvailable: taxable.reduce((s, t) => s + t.totalTax, 0),
    itcNotAvailable: 0,
  };
}

function calculateTaxLiability(transactions: GSTTransaction[]): TaxLiabilitySummary {
  const outward = transactions.filter(t => t.type === 'sale' || t.type === 'export');
  return {
    igst: outward.reduce((s, t) => s + t.igst, 0),
    cgst: outward.reduce((s, t) => s + (t.cgst || 0), 0),
    sgst: outward.reduce((s, t) => s + (t.sgst || 0), 0),
    cess: outward.reduce((s, t) => s + (t.cess || 0), 0),
    interest: 0,
    penalty: 0,
    lateFee: 0,
  };
}

function calculateITC(transactions: GSTTransaction[]): ITCSummary {
  const inward = transactions.filter(t => t.type === 'purchase');
  return {
    igst: { available: inward.reduce((s, t) => s + t.igst, 0), claimed: inward.filter(t => t.itcEligibility === 'eligible').reduce((s, t) => s + t.igst, 0) },
    cgst: { available: inward.reduce((s, t) => s + (t.cgst || 0), 0), claimed: inward.filter(t => t.itcEligibility === 'eligible').reduce((s, t) => s + (t.cgst || 0), 0) },
    sgst: { available: inward.reduce((s, t) => s + (t.sgst || 0), 0), claimed: inward.filter(t => t.itcEligibility === 'eligible').reduce((s, t) => s + (t.sgst || 0), 0) },
    cess: { available: inward.reduce((s, t) => s + (t.cess || 0), 0), claimed: 0 },
  };
}

export default router;
