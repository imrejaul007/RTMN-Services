/**
 * CorpPerks GST Routes
 * Invoice generation, ITC optimization, GSTR-1
 */

const express = require('express');
const router = express.Router();

// In-memory store
const invoicesStore = [];

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// POST /api/gst/calculate
router.post('/calculate', (req, res) => {
  const { amount, gstRate } = req.body;
  const taxableAmount = Math.round(amount / (1 + gstRate / 100));
  const cgst = Math.round(taxableAmount * (gstRate / 200));
  const sgst = cgst;
  const igst = gstRate > 0 ? taxableAmount * (gstRate / 100) - cgst - sgst : 0;

  res.json({
    success: true,
    data: {
      originalAmount: amount,
      taxableAmount,
      cgstRate: gstRate / 2,
      cgstAmount: cgst,
      sgstRate: gstRate / 2,
      sgstAmount: sgst,
      igstAmount: igst,
      totalTax: cgst + sgst + igst,
      grandTotal: amount,
      itcEligible: true,
    }
  });
});

// POST /api/gst/itc-check
router.post('/itc-check', (req, res) => {
  const { companyGstIn, vendorGstIn, invoiceAmount } = req.body;

  // Demo ITC eligibility check
  const eligible = companyGstIn && vendorGstIn &&
    companyGstIn.slice(0, 2) === vendorGstIn.slice(0, 2);

  res.json({
    success: true,
    data: {
      eligible,
      reason: eligible ? 'ITC claimable' : 'ITC not eligible - GSTIN mismatch or unregistered vendor',
      maxClaimable: eligible ? invoiceAmount : 0,
    }
  });
});

// POST /api/gst/invoices
router.post('/invoices', requireAuth, (req, res) => {
  const { companyName, gstIn, items, billingAddress, shippingAddress } = req.body;

  const subtotal = items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
  const taxableAmount = Math.round(subtotal / 1.12);
  const cgst = Math.round(taxableAmount * 0.06);
  const sgst = cgst;

  const invoice = {
    invoiceNumber: `INV/CORP/${new Date().getFullYear()}/${String(invoicesStore.length + 1).padStart(4, '0')}`,
    invoiceDate: new Date().toISOString(),
    companyName,
    gstIn,
    billingAddress,
    shippingAddress,
    items,
    subtotal,
    taxableAmount,
    cgst,
    sgst,
    totalTax: cgst + sgst,
    grandTotal: subtotal,
    itcEligible: true,
    status: 'created',
    ewayBill: null,
    qrCode: `https://api.qrserver.com/v1/create-qr-code/?data=${Date.now()}`,
  };

  invoicesStore.push(invoice);
  res.status(201).json({ success: true, data: invoice });
});

// GET /api/gst/invoices
router.get('/invoices', (req, res) => {
  const { status, from, to } = req.query;
  let invoices = invoicesStore;
  if (status) invoices = invoices.filter(i => i.status === status);
  if (from) invoices = invoices.filter(i => new Date(i.invoiceDate) >= new Date(from));
  if (to) invoices = invoices.filter(i => new Date(i.invoiceDate) <= new Date(to));
  res.json({ success: true, data: invoices, count: invoices.length });
});

// GET /api/gst/invoices/:number
router.get('/invoices/:number', (req, res) => {
  const invoice = invoicesStore.find(i => i.invoiceNumber === req.params.number);
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, data: invoice });
});

// POST /api/gst/reports/gstr1
router.post('/reports/gstr1', requireAuth, (req, res) => {
  const { period } = req.body; // e.g., "04-2026"

  const report = {
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      totalInvoices: invoicesStore.length,
      totalTaxableValue: invoicesStore.reduce((sum, i) => sum + i.taxableAmount, 0),
      totalCgst: invoicesStore.reduce((sum, i) => sum + i.cgst, 0),
      totalSgst: invoicesStore.reduce((sum, i) => sum + i.sgst, 0),
      totalItcClaimable: invoicesStore.reduce((sum, i) => sum + (i.itcEligible ? i.totalTax : 0), 0),
    },
    invoices: invoicesStore.map(i => ({
      invoiceNumber: i.invoiceNumber,
      invoiceDate: i.invoiceDate,
      gstIn: i.gstIn,
      taxableAmount: i.taxableAmount,
      cgst: i.cgst,
      sgst: i.sgst,
    })),
    status: 'generated',
  };

  res.json({ success: true, data: report });
});

// POST /api/gst/einvoice/:number
router.post('/einvoice/:number', requireAuth, (req, res) => {
  const invoice = invoicesStore.find(i => i.invoiceNumber === req.params.number);
  if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

  invoice.einvoiceStatus = 'submitted';
  invoice.einvoiceAckNumber = `EA${Date.now()}`;
  invoice.einvoiceAckDate = new Date().toISOString();

  res.json({ success: true, data: invoice });
});

module.exports = router;
