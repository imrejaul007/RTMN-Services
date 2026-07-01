/**
 * Tax API Routes - Complete Tax Management
 */

const express = require('express');
const router = express.Router();
const taxOS = require('../modules/taxOS');

// ============================================================
// INDIA TAX ROUTES
// ============================================================

// Get available GST rates
router.get('/india/gst-rates', (req, res) => {
  res.json({
    rates: taxOS.IndiaTax.GST_RATES,
    source: 'india_gst'
  });
});

// Calculate GST
router.post('/india/gst/calculate', (req, res) => {
  const { amount, rate, type = 'intra' } = req.body;

  if (!amount || !rate) {
    return res.status(400).json({ error: 'Amount and rate are required' });
  }

  const result = taxOS.IndiaTax.calculateGST(amount, parseFloat(rate), type);

  res.json({
    ...result,
    breakdown: {
      base_amount: amount,
      rate: `${rate}%`,
      cgst: result.cgst.toFixed(2),
      sgst: result.sgst.toFixed(2),
      igst: result.igst.toFixed(2),
      total_gst: (result.cgst + result.sgst + result.igst).toFixed(2),
      grand_total: result.total.toFixed(2)
    }
  });
});

// Get TDS sections
router.get('/india/tds/sections', (req, res) => {
  res.json({
    sections: taxOS.IndiaTax.TDS_RATES,
    source: 'india_tds'
  });
});

// Calculate TDS
router.post('/india/tds/calculate', (req, res) => {
  const { section, amount, payerType = 'individual' } = req.body;

  if (!section || !amount) {
    return res.status(400).json({ error: 'Section and amount are required' });
  }

  const result = taxOS.IndiaTax.calculateTDS(section.toUpperCase(), parseFloat(amount), payerType);

  if (result.error) {
    return res.status(400).json(result);
  }

  res.json({
    ...result,
    breakdown: {
      gross_amount: amount,
      tds_rate: `${result.rate}%`,
      tds_deducted: result.tdsAmount.toFixed(2),
      net_amount_payable: result.netAmount.toFixed(2),
      section: result.section,
      description: result.sectionDescription
    }
  });
});

// Get TCS sections
router.get('/india/tcs/sections', (req, res) => {
  res.json({
    sections: taxOS.IndiaTax.TCS_RATES,
    source: 'india_tcs'
  });
});

// Calculate TCS
router.post('/india/tcs/calculate', (req, res) => {
  const { section, amount } = req.body;

  if (!section || !amount) {
    return res.status(400).json({ error: 'Section and amount are required' });
  }

  const result = taxOS.IndiaTax.calculateTCS(section, parseFloat(amount));

  if (result.error) {
    return res.status(400).json(result);
  }

  res.json({
    ...result,
    breakdown: {
      amount: amount,
      tcs_rate: `${result.rate}%`,
      tcs_collected: result.tcsAmount.toFixed(2),
      total_amount: result.netAmount.toFixed(2)
    }
  });
});

// Generate GSTR-1
router.post('/india/gstr1', (req, res) => {
  const { invoices, gstin, period } = req.body;

  if (!invoices || !Array.isArray(invoices)) {
    return res.status(400).json({ error: 'Invoices array is required' });
  }

  const gstr1 = taxOS.IndiaTax.generateGSTR1(invoices);

  res.json({
    gstr1: {
      ...gstr1,
      gstin,
      period,
      generatedAt: new Date().toISOString()
    },
    summary: {
      totalInvoices: invoices.length,
      totalTaxableValue: gstr1.summary.totalTaxableValue.toFixed(2),
      totalCGST: gstr1.summary.totalCgst.toFixed(2),
      totalSGST: gstr1.summary.totalSgst.toFixed(2),
      totalIGST: gstr1.summary.totalIgst.toFixed(2),
      totalTax: (gstr1.summary.totalCgst + gstr1.summary.totalSgst + gstr1.summary.totalIgst).toFixed(2)
    }
  });
});

// Generate GSTR-3B
router.post('/india/gstr3b', (req, res) => {
  const { gstr1Data, gstr2bData } = req.body;

  if (!gstr1Data) {
    return res.status(400).json({ error: 'GSTR-1 data is required' });
  }

  const gstr3b = taxOS.IndiaTax.generateGSTR3B(gstr1Data, gstr2bData);

  res.json({
    gstr3b,
    summary: {
      totalTaxPayable: gstr3b.tax_payable.total.toFixed(2),
      itcAvailable: gstr3b.itc_available.toFixed(2),
      netLiability: (gstr3b.tax_payable.total - gstr3b.itc_available).toFixed(2)
    }
  });
});

// Generate E-Way Bill
router.post('/india/ewaybill', (req, res) => {
  const data = req.body;

  // Validate required fields
  const required = ['invoiceNumber', 'invoiceDate', 'gstin', 'recipientGstin',
                    'placeOfSupply', 'goodsDescription', 'hsnCode',
                    'taxableValue', 'rate'];
  const missing = required.filter(f => !data[f]);

  if (missing.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      fields: missing
    });
  }

  const ewb = taxOS.IndiaTax.generateEWayBill(data);

  res.json({
    ewaybill: ewb,
    status: 'generated',
    validUpto: ewb.validUpto
  });
});

// Generate E-Invoice (IRN)
router.post('/india/einvoice', (req, res) => {
  const data = req.body;

  // Validate required fields
  const required = ['invoiceNumber', 'invoiceDate', 'gstin', 'buyerGstin',
                    'itemDescription', 'hsnCode', 'taxableValue', 'gstRate'];
  const missing = required.filter(f => !data[f]);

  if (missing.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      fields: missing
    });
  }

  const eInvoice = taxOS.IndiaTax.generateEInvoice(data);

  res.json({
    eInvoice,
    irn: eInvoice.Irn,
    status: 'generated',
    generatedAt: eInvoice.TrnDsDt
  });
});

// Tax Calendar
router.get('/india/calendar', (req, res) => {
  const calendar = taxOS.IndiaTax.getTaxCalendar();

  res.json({
    calendar,
    currentDate: new Date().toISOString(),
    currentYear: new Date().getFullYear(),
    upcoming: calendar.quarterly.filter(d => new Date(d.due) > new Date()).slice(0, 3)
  });
});

// Income Tax Calculator
router.post('/india/income-tax', (req, res) => {
  const { totalIncome, regime = 'new', age = 'below60' } = req.body;

  if (!totalIncome) {
    return res.status(400).json({ error: 'Total income is required' });
  }

  const result = taxOS.CorporateTax.calculateIncomeTax(
    parseFloat(totalIncome),
    regime,
    age
  );

  res.json({
    ...result,
    breakdown: {
      gross_total_income: totalIncome,
      regime: result.regime,
      taxable_income: result.taxableIncome || totalIncome,
      gross_tax: result.grossTax,
      health_cess: result.healthCess,
      total_tax: result.totalTax,
      marginal_rate: `${result.marginalLiability}%`,
      effective_rate: `${result.effectiveRate}%`
    }
  });
});

// Presumptive Tax
router.post('/india/presumptive-tax', (req, res) => {
  const { businessIncome, scheme = '44AD' } = req.body;

  if (!businessIncome) {
    return res.status(400).json({ error: 'Business income is required' });
  }

  const result = taxOS.CorporateTax.calculatePresumptiveTax(
    parseFloat(businessIncome),
    scheme
  );

  res.json({
    ...result,
    breakdown: {
      gross_receipts: result.businessIncome,
      presumed_profit: result.presumedProfit,
      rate_applied: `${result.presumptiveRate}%`,
      income_tax: result.totalTax
    }
  });
});

// ============================================================
// UAE TAX ROUTES
// ============================================================

// Calculate UAE VAT
router.post('/uae/vat/calculate', (req, res) => {
  const { amount } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  const result = taxOS.UAETax.calculateVAT(parseFloat(amount));

  res.json({
    ...result,
    breakdown: {
      amount_excluding_vat: amount,
      vat_rate: `${result.vatRate}%`,
      vat_amount: result.vatAmount.toFixed(2),
      total_including_vat: result.total.toFixed(2)
    }
  });
});

// Calculate UAE Corporate Tax
router.post('/uae/corporate-tax', (req, res) => {
  const { income, freeZoneBenefit = false } = req.body;

  if (income === undefined) {
    return res.status(400).json({ error: 'Income is required' });
  }

  const result = taxOS.UAETax.calculateCorporateTax(parseFloat(income), freeZoneBenefit);

  res.json({
    ...result,
    breakdown: {
      total_income: result.totalIncome,
      threshold: result.threshold,
      taxable_income: result.taxableIncome,
      rate_applied: `${result.rate}%`,
      tax_amount: result.taxAmount.toFixed(2),
      effective_rate: `${result.effectiveRate}%`,
      free_zone_benefit: result.freeZoneBenefit ? 'Yes (0% tax on qualifying income)' : 'No'
    }
  });
});

// Generate UAE VAT Return
router.post('/uae/vat-return', (req, res) => {
  const { sales, purchases } = req.body;

  if (!sales || !purchases) {
    return res.status(400).json({ error: 'Sales and purchases data are required' });
  }

  const vatCollected = sales.total * 0.05;
  const vatPaid = purchases.total * 0.05;

  const vatReturn = taxOS.UAETax.generateUAEVATReturn(
    sales,
    purchases,
    vatCollected,
    vatPaid
  );

  res.json({
    vatReturn,
    summary: {
      output_vat: vatCollected.toFixed(2),
      input_vat: vatPaid.toFixed(2),
      net_vat_payable: vatReturn.netVat.toFixed(2),
      net_vat_refundable: vatReturn.netVatRefund.toFixed(2)
    }
  });
});

// ESR Compliance Check
router.post('/uae/esr-check', (req, res) => {
  const entity = req.body;

  const result = taxOS.UAETax.checkESRCompliance(entity);

  res.json({
    esrCheck: result,
    requirements: result.required ? {
      coreIncomeActivities: 'Must conduct core income-generating activities in UAE',
      adequateEmployees: 'Must have adequate employees in UAE',
      adequateExpenses: 'Must incur adequate expenses in UAE',
      managedFromUAE: 'Must be managed and controlled from UAE'
    } : null
  });
});

// ============================================================
// TAX DASHBOARD
// ============================================================

// Unified Tax Dashboard
router.get('/dashboard', (req, res) => {
  const calendar = taxOS.IndiaTax.getTaxCalendar();
  const today = new Date();

  // Find upcoming deadlines
  const upcomingIndia = [
    ...calendar.quarterly.map(d => ({ ...d, source: 'India' })),
  ].filter(d => new Date(d.due) > today)
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .slice(0, 5);

  res.json({
    summary: {
      india: {
        activeRates: Object.keys(taxOS.IndiaTax.GST_RATES).length,
        tdsSections: Object.keys(taxOS.IndiaTax.TDS_RATES).length,
        tcsSections: Object.keys(taxOS.IndiaTax.TCS_RATES).length
      },
      uae: {
        vatRate: `${taxOS.UAETax.VAT_RATE * 100}%`,
        corporateTaxRate: `${taxOS.UAETax.CORPORATE_TAX_RATES.standard * 100}%`,
        freeZoneRate: `${taxOS.UAETax.CORPORATE_TAX_RATES.qualifying_income * 100}%`
      }
    },
    upcomingDeadlines: upcomingIndia,
    generatedAt: new Date().toISOString()
  });
});

// ============================================================
// ROUTE REGISTRATION
// ============================================================

module.exports = router;
