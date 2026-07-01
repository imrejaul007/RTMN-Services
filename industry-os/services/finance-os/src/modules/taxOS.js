/**
 * TaxOS - Complete Tax Management System
 *
 * Supports:
 * - India: GST (GSTR-1, GSTR-2, GSTR-3B), TDS (194Q, 194O, 194H, 194J, 194C), TCS, PF/ESI
 * - UAE: VAT, Corporate Tax, ESR
 * - Corporate Tax: Income tax computation
 */

const crypto = require('crypto');

// ============================================================
// INDIA TAX MODULE
// ============================================================

const IndiaTax = {

  // GST Rates (as of 2024)
  GST_RATES: {
    '0': { rate: 0, name: 'Exempt' },
    '5': { rate: 5, name: 'Essential items' },
    '12': { rate: 12, name: 'Standard rate' },
    '18': { rate: 18, name: 'Standard rate' },
    '28': { rate: 28, name: 'Luxury items' }
  },

  // TDS Rates under different sections
  TDS_RATES: {
    // Section 194Q - Purchase of goods
    '194Q': {
      threshold: 5000000, // ₹50 lakhs
      rate: 0.1,
      description: 'TDS on purchase of goods exceeding ₹50 lakhs'
    },

    // Section 194O - E-commerce operators
    '194O': {
      threshold: 500000, // ₹5 lakhs
      rate: 1,
      description: 'TDS on e-commerce transactions'
    },

    // Section 194H - Commission/Brokerage
    '194H': {
      threshold: 15000, // Per transaction threshold
      rate: 5,
      description: 'TDS on commission/brokerage'
    },

    // Section 194J - Professional/Technical services
    '194J': {
      threshold: 30000, // Per transaction threshold
      rates: {
        'general': 10, // General professional services
        'call_center': 2, // Call center services
        'royalty': 10,
        'fys_fee': 10
      },
      description: 'TDS on professional/technical services'
    },

    // Section 194C - Contractors
    '194C': {
      threshold: 30000, // Per transaction
      rates: {
        'individual': 1,
        'huf': 1,
        'company': 2
      },
      description: 'TDS on payments to contractors'
    },

    // Section 194A - Interest other than from banks
    '194A': {
      threshold: 40000, // ₹40,000 per year
      rates: {
        'individual_huf': 10,
        'company': 10
      },
      description: 'TDS on interest income'
    },

    // Section 192 - Salary
    '192': {
      description: 'TDS on salary',
      calculation: 'slab_based'
    },

    // Section 194 - Dividends
    '194': {
      rate: 10,
      threshold: 5000,
      description: 'TDS on dividends'
    },

    // Section 194EE - NSS deposits
    '194EE': {
      rate: 10,
      description: 'TDS on NSS deposits'
    },

    // Section 194F - Repurchase of units
    '194F': {
      rate: 20,
      description: 'TDS on repurchase of units'
    },

    // Section 194G - Lottery/Cricket
    '194G': {
      rate: 5,
      description: 'TDS on lottery/commission on lottery'
    },

    // Section 194IB - Rent
    '194IB': {
      rate: 5,
      threshold: 50000, // Per month
      description: 'TDS on rent'
    },

    // Section 194IC - Jackpot
    '194IC': {
      rate: 5,
      description: 'TDS on jackpot/winnings'
    }
  },

  // TCS Rates
  TCS_RATES: {
    '06AAAB': { rate: 1, description: 'TCS on overseas remittance (LRS)' },
    '0208': { rate: 5, description: 'TCS on sale of goods (specific cases)' },
    'tax_collected': { rate: 0.075, description: 'TCS collected by seller' }
  },

  // Calculate GST
  calculateGST(amount, rate, type = 'intra') {
    const gstAmount = amount * (rate / 100);
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    const igst = type === 'inter' ? gstAmount : 0;

    return {
      amount,
      rate,
      cgst: type === 'intra' ? cgst : 0,
      sgst: type === 'intra' ? sgst : 0,
      igst: type === 'inter' ? gstAmount : 0,
      total: amount + gstAmount,
      source: 'gst'
    };
  },

  // Calculate TDS
  calculateTDS(section, amount, payerType = 'individual') {
    const sectionConfig = this.TDS_RATES[section];
    if (!sectionConfig) {
      return { error: `Unknown TDS section: ${section}` };
    }

    // Check threshold
    if (sectionConfig.threshold && amount < sectionConfig.threshold) {
      return {
        tdsAmount: 0,
        netAmount: amount,
        section,
        note: `Below threshold of ₹${sectionConfig.threshold.toLocaleString()}`
      };
    }

    let rate = sectionConfig.rate;

    // Handle different rate structures
    if (sectionConfig.rates) {
      rate = sectionConfig.rates[payerType] || sectionConfig.rates['general'] || sectionConfig.rate;
    }

    const tdsAmount = amount * (rate / 100);
    const tdsSection = `194Q,194O,194H`.includes(section) ? section : '192';

    return {
      tdsAmount: Math.round(tdsAmount * 100) / 100,
      netAmount: amount - tdsAmount,
      rate,
      section,
      sectionDescription: sectionConfig.description
    };
  },

  // Calculate TCS
  calculateTCS(section, amount) {
    const sectionConfig = this.TCS_RATES[section];
    if (!sectionConfig) {
      return { error: `Unknown TCS section: ${section}` };
    }

    const tcsAmount = amount * (sectionConfig.rate / 100);

    return {
      tcsAmount: Math.round(tcsAmount * 100) / 100,
      netAmount: amount + tcsAmount,
      rate: sectionConfig.rate,
      section,
      description: sectionConfig.description
    };
  },

  // Generate GSTR-1 data (Sales)
  generateGSTR1(invoices) {
    const gstr1 = {
      summary: {
        totalTaxableValue: 0,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 0,
        totalCess: 0,
        invoiceCount: invoices.length
      },
      b2b: [], // B2B invoices (>₹2.5 lakhs)
      b2cl: [], // B2C Large (>₹2.5 lakhs, inter-state)
      b2cs: [], // B2C Small (<₹2.5 lakhs)
      exp: [], // Exports
      cdnr: [], // Credit/Debit Notes registered
      cdnur: [] // Credit/Debit Notes unregistered
    };

    invoices.forEach(inv => {
      const taxableValue = inv.amount;
      const taxAmount = inv.gstAmount || (taxableValue * inv.gstRate / 100);

      gstr1.summary.totalTaxableValue += taxableValue;

      if (inv.type === 'inter') {
        gstr1.summary.totalIgst += taxAmount;
        if (taxableValue > 250000) {
          gstr1.b2cl.push({
            invNo: inv.number,
            invDate: inv.date,
            invValue: inv.total,
            placeOfSupply: inv.placeOfSupply,
            rate: inv.gstRate,
            taxableValue,
            igst: taxAmount,
            cess: 0
          });
        } else {
          gstr1.b2cs.push({
            placeOfSupply: inv.placeOfSupply,
            rate: inv.gstRate,
            taxableValue,
            igst: taxAmount,
            cess: 0,
            type: 'OE'
          });
        }
      } else {
        const cgst = sgst = taxAmount / 2;
        gstr1.summary.totalCgst += cgst;
        gstr1.summary.totalSgst += sgst;

        if (taxableValue > 250000) {
          gstr1.b2b.push({
            ctin: inv.gstin,
            inv: [{
              invNo: inv.number,
              invDate: inv.date,
              invValue: inv.total,
              rate: inv.gstRate,
              taxableValue,
              cgst,
              sgst,
              igst: 0,
              cess: 0
            }]
          });
        } else {
          gstr1.b2cs.push({
            placeOfSupply: inv.placeOfSupply,
            rate: inv.gstRate,
            taxableValue,
            cgst,
            sgst,
            cess: 0,
            type: 'OE'
          });
        }
      }
    });

    return gstr1;
  },

  // Generate GSTR-3B data (Summary return)
  generateGSTR3B(gstr1, gstr2b) {
    return {
      summary: {
        gstin: gstr1.gstin || '',
        ret_period: gstr1.period || '',

        // Outward supplies
        osupplies: {
          taxable: gstr1.summary.totalTaxableValue,
          exempt: 0,
          nil_rated: 0,
          non_gst: 0
        },

        // Outward taxable (7A, 7B, 8A, 8B, 9A, 9B)
        itc: {
          a: gstr1.summary.totalIgst, // IGST claimed
          b: gstr1.summary.totalCgst + gstr1.summary.totalSgst, // CGST+SGST claimed
          c: gstr1.summary.totalCess, // Cess claimed
          d: 0 // ITC not available
        }
      },

      // Tax liability
      tax_payable: {
        igst: gstr1.summary.totalIgst,
        cgst: gstr1.summary.totalCgst,
        sgst: gstr1.summary.totalSgst,
        cess: gstr1.summary.totalCess,
        total: gstr1.summary.totalIgst + gstr1.summary.totalCgst +
               gstr1.summary.totalSgst + gstr1.summary.totalCess
      },

      // Input tax credit from GSTR-2B
      itc_available: gstr2b?.itc_available || 0,

      // Interest calculation (if applicable)
      interest: 0,

      // Late fee
      late_fee: 0
    };
  },

  // E-Way Bill generation
  generateEWayBill(data) {
    const { invoiceNumber, invoiceDate, gstin,
            supplierName, supplierAddress,
            recipientGstin, recipientName, recipientAddress,
            placeOfSupply, goodsDescription, hsnCode,
            quantity, unit, taxableValue, rate,
            transportMode, vehicleNumber, distance } = data;

    // Generate unique EWB number
    const ewbNumber = `EWB${Date.now()}${Math.random().toString(36).substr(2, 8).toUpperCase()}`;

    const ewb = {
      ewbNo: ewbNumber,
      ewbDate: new Date().toISOString(),
      genMode: 'E',
      supplyType: 'O', // Outward

      // Document details
      docNo: invoiceNumber,
      docDate: invoiceDate,

      // Bill From
      fromGstin: gstin,
      fromTrdName: supplierName,
      fromAddr: supplierAddress,
      fromPlace: placeOfSupply,

      // Bill To
      toGstin: recipientGstin,
      toTrdName: recipientName,
      toAddr: recipientAddress,
      toPlace: data.recipientPlaceOfSupply || placeOfSupply,

      // Goods
      itemList: [{
        slNo: 1,
        productName: goodsDescription,
        hsnCode,
        qty: quantity,
        unit,
        taxableAmount: taxableValue,
        rate,
        cgst: (taxableValue * rate / 100) / 2,
        sgst: (taxableValue * rate / 100) / 2,
        igst: taxableValue * rate / 100,
        cess: 0,
        cessNonAdvol: 0
      }],

      // Totals
      totalValue: taxableValue,
      cgstValue: (taxableValue * rate / 100) / 2,
      sgstValue: (taxableValue * rate / 100) / 2,
      igstValue: taxableValue * rate / 100,
      cessValue: 0,
      totalInvoiceValue: taxableValue * (1 + rate / 100),

      // Transport
      transMode: transportMode, // 1-Road, 2-Rail, 3-Air, 4-Ship
      distance: distance || 100,
      transporterId: '',
      transporterName: '',
      vehicleNo: vehicleNumber || '',

      // Valid Until
      validUpto: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours

      // Status
      status: 'ACT',
      alert: ''
    };

    return ewb;
  },

  // E-Invoice generation (IRN)
  generateEInvoice(data) {
    // Generate Invoice Reference Number (IRN)
    const irnHash = crypto
      .createHash('sha256')
      .update(`${data.gstin}${data.invoiceNumber}${data.invoiceDate}${data.taxableValue}`)
      .digest('hex')
      .substr(0, 15)
      .toUpperCase();

    const eInvoice = {
      Version: '1.1',
      Irn: irnHash,
      TrnDsDt: new Date().toISOString(),

      // Supplier Details
      Supplier: {
        Gstin: data.gstin,
        LegalName: data.supplierName,
        TradeName: data.supplierName,
        Address1: data.supplierAddress,
        City: data.supplierCity,
        Pincode: data.supplierPincode,
        State: data.supplierStateCode
      },

      // Buyer Details
      Buyer: {
        Gstn: data.buyerGstin,
        LegalName: data.buyerName,
        TradeName: data.buyerName,
        Address1: data.buyerAddress,
        City: data.buyerCity,
        Pincode: data.buyerPincode,
        State: data.buyerStateCode,
        Pos: data.placeOfSupply
      },

      // Dispatch Details
      Dispatch: {
        Gstin: data.dispatchGstin || 'URP',
        LegalName: data.dispatchName,
        Address1: data.dispatchAddress,
        City: data.dispatchCity,
        State: data.dispatchStateCode
      },

      // Shipment Details
      Shipment: {
        Gstn: data.shipToGstin || 'URP',
        LegalName: data.shipToName,
        Address1: data.shipToAddress,
        City: data.shipToCity,
        State: data.shipToStateCode
      },

      // Invoice Details
      Document: {
        Typ: 'INV', // Invoice
        No: data.invoiceNumber,
        Dt: data.invoiceDate
      },

      // Items
      Items: [{
        SlNo: '1',
        PrdDesc: data.itemDescription,
        IsServc: 'N',
        HsnCd: data.hsnCode,
        Barcde: data.barcode || '',
        Qty: data.quantity,
        Unit: data.unit || 'NOS',
        UnitPrice: data.unitPrice,
        TotAmt: data.taxableValue,
        Discount: data.discount || 0,
        AssAmt: data.taxableValue - (data.discount || 0),
        GstRt: data.gstRate,
        Igst: data.gstRate > 0 ? data.taxableValue * data.gstRate / 100 : 0,
        Cgst: data.gstRate > 0 ? data.taxableValue * data.gstRate / 200 : 0,
        Sgst: data.gstRate > 0 ? data.taxableValue * data.gstRate / 200 : 0,
        CesRt: 0,
        CesAmt: 0,
        CesNonAdvAmt: 0,
        StateCes: 0,
        StateCesAmt: 0,
        OthChrg: 0,
        DeductBy: 0,
        TotItemVal: data.totalValue,
        OrgCntry: 'IN'
      }],

      // Valuation
      Valuation: {
        AssVal: data.taxableValue,
        CgstVal: data.taxableValue * data.gstRate / 200,
        SgstVal: data.taxableValue * data.gstRate / 200,
        IgstVal: data.taxableValue * data.gstRate / 100,
        CesVal: 0,
        StCesVal: 0,
        Disc: data.discount || 0,
        OthChrg: data.otherCharges || 0,
        RndOffAmt: data.roundOff || 0,
        TotInvVal: data.totalValue,
        TotInvValFc: data.totalValueFc || 0
      },

      // Payment
      PayData: {
        Term: data.paymentTerms || 'ON Receipt',
        PayNm: data.paymentMethod || 'Cash',
        PayInstr: '',
        CrTrn: '',
        Payee: '',
        CrDay: data.creditDays || 0,
        DiscDue: ''
      },

      // Reference
      RefDoc: {
        InvRm: 'As per invoice',
        PmtChlNo: '',
        PmtChlDt: '',
        DtOfVouch: '',
        ExtRefNum: ''
      }
    };

    return eInvoice;
  },

  // Tax calendar for India
  getTaxCalendar() {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    return {
      quarterly: [
        { due: `${currentYear}-07-31`, return: 'GSTR-3B', period: 'Q1 Apr-Jun', type: 'gst' },
        { due: `${currentYear}-10-31`, return: 'GSTR-3B', period: 'Q2 Jul-Sep', type: 'gst' },
        { due: `${currentYear}-01-31`, return: 'GSTR-3B', period: 'Q3 Oct-Dec', type: 'gst' },
        { due: `${currentYear + 1}-04-30`, return: 'GSTR-3B', period: 'Q4 Jan-Mar', type: 'gst' }
      ],
      annual: [
        { due: `${currentYear + 1}-12-31`, return: 'GSTR-9', period: `${currentYear}-${currentYear + 1}`, type: 'gst_annual' }
      ],
      tds: [
        { due: `${currentYear}-05-15`, return: 'TDS Certificate (Q4)', period: 'Jan-Mar', type: 'tds' },
        { due: `${currentYear}-08-15`, return: 'TDS Certificate (Q1)', period: 'Apr-Jun', type: 'tds' },
        { due: `${currentYear}-11-15`, return: 'TDS Certificate (Q2)', period: 'Jul-Sep', type: 'tds' },
        { due: `${currentYear + 1}-02-15`, return: 'TDS Certificate (Q3)', period: 'Oct-Dec', type: 'tds' }
      ],
      income_tax: [
        { due: `${currentYear}-07-31`, return: 'Income Tax Return', period: `FY ${currentYear}-${currentYear + 1}`, type: 'income_tax' },
        { due: `${currentYear}-10-31`, return: 'Tax Audit Report', period: `FY ${currentYear}-${currentYear + 1}`, type: 'income_tax' }
      ]
    };
  }
};

// ============================================================
// UAE TAX MODULE
// ============================================================

const UAETax = {

  // VAT Rate
  VAT_RATE: 0.05,

  // Corporate Tax Rate (effective 2023)
  CORPORATE_TAX_RATES: {
    // Free Zone qualifying income
    qualifying_income: 0,
    // Standard rate
    standard: 0.09,
    // UAE Corporate Tax (federal)
    federal: 0.09,
    // Emirate level (varies)
    emirate: 0
  },

  // ESR (Economic Substance Report) thresholds
  ESR_THRESHOLDS: {
    revenue: 2000000, // AED 2 million
    profit: 250000    // AED 250,000
  },

  // Calculate UAE VAT
  calculateVAT(amount) {
    const vatAmount = amount * this.VAT_RATE;

    return {
      amount,
      vatRate: this.VAT_RATE * 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      total: Math.round((amount + vatAmount) * 100) / 100,
      source: 'uae_vat'
    };
  },

  // Calculate UAE Corporate Tax
  calculateCorporateTax(income, freeZoneBenefit = false) {
    let taxableIncome = income;
    let effectiveRate;
    let taxAmount;

    if (freeZoneBenefit) {
      // Qualifying income from UAE Free Zone
      effectiveRate = this.CORPORATE_TAX_RATES.qualifying_income;
      taxAmount = 0;
    } else {
      // Standard rate for income exceeding AED 375,000
      if (income <= 375000) {
        effectiveRate = 0;
        taxAmount = 0;
      } else {
        taxableIncome = income - 375000;
        effectiveRate = this.CORPORATE_TAX_RATES.standard;
        taxAmount = Math.round(taxableIncome * effectiveRate * 100) / 100;
      }
    }

    return {
      totalIncome: income,
      threshold: 375000,
      taxableIncome: Math.max(0, income - 375000),
      rate: effectiveRate * 100,
      taxAmount,
      effectiveRate: income > 0 ? (taxAmount / income * 100).toFixed(2) : 0,
      freeZoneBenefit,
      source: 'uae_corporate_tax'
    };
  },

  // Generate UAE VAT return
  generateUAEVATReturn(sales, purchases, vatCollected, vatPaid) {
    const recoverableVat = Math.min(vatPaid, vatCollected);
    const netVat = vatCollected - recoverableVat;

    return {
      // Standard rated supplies
      standardRatedSupplies: sales.vatStandard,

      // Zero rated supplies
      zeroRatedSupplies: sales.vatZero || 0,

      // Exempt supplies
      exemptSupplies: sales.vatExempt || 0,

      // Total supplies
      totalSupplies: sales.total,

      // Output VAT
      outputVat: vatCollected,

      // Input VAT recoverable
      inputVatRecoverable: recoverableVat,

      // Net VAT payable/refundable
      netVat: netVat > 0 ? netVat : 0,
      netVatRefund: netVat < 0 ? Math.abs(netVat) : 0,

      // Adjustments
      adjustments: {
        recoverable: recoverableVat - vatPaid,
        otherAdjustments: 0
      },

      // Tax period
      taxPeriod: {
        start: sales.periodStart,
        end: sales.periodEnd
      },

      // Due date (28th of following month)
      dueDate: new Date(new Date(sales.periodEnd).setDate(28)).toISOString()
    };
  },

  // ESR compliance check
  checkESRCompliance(entity) {
    const revenueThreshold = this.ESR_THRESHOLDS.revenue;
    const profitThreshold = this.ESR_THRESHOLDS.profit;

    const meetsThreshold = entity.revenue >= revenueThreshold ||
                          entity.netProfit >= profitThreshold;

    if (!meetsThreshold) {
      return {
        required: false,
        reason: 'Below ESR thresholds',
        threshold: this.ESR_THRESHOLDS
      };
    }

    return {
      required: true,
      reason: 'Above ESR thresholds',
      threshold: this.ESR_THRESHOLDS,
      currentValues: {
        revenue: entity.revenue,
        netProfit: entity.netProfit
      },
      requirements: {
        coreIncomeActivities: entity.hasCoreActivities,
        adequateEmployees: entity.adequateEmployees,
        adequateExpenses: entity.adequateExpenses,
        managedFromUAE: entity.managedFromUAE
      },
      dueDate: `${new Date().getFullYear()}-06-30`
    };
  }
};

// ============================================================
// CORPORATE TAX MODULE
// ============================================================

const CorporateTax = {

  // Income tax slabs for individuals (new regime 2024)
  INCOME_TAX_SLABS_NEW: [
    { min: 0, max: 300000, rate: 0 },
    { min: 300001, max: 600000, rate: 5 },
    { min: 600001, max: 900000, rate: 10 },
    { min: 900001, max: 1200000, rate: 15 },
    { min: 1200001, max: 1500000, rate: 20 },
    { min: 1500001, max: Infinity, rate: 30 }
  ],

  // Calculate income tax for individuals
  calculateIncomeTax(totalIncome, regime = 'new', age = 'below60') {
    if (regime === 'new') {
      return this.calculateNewRegimeTax(totalIncome);
    } else {
      return this.calculateOldRegimeTax(totalIncome, age);
    }
  },

  calculateNewRegimeTax(totalIncome) {
    let tax = 0;
    let remaining = totalIncome;
    let cess = 0;

    for (const slab of this.INCOME_TAX_SLABS_NEW) {
      if (remaining <= 0) break;

      const slabIncome = Math.min(remaining, slab.max - slab.min);
      if (slabIncome > 0 && slab.rate > 0) {
        tax += slabIncome * (slab.rate / 100);
      }
      remaining -= slabIncome;
    }

    // Add health cess (4% if tax > 0)
    if (tax > 0) {
      cess = tax * 0.04;
    }

    return {
      totalIncome,
      grossTax: Math.round(tax),
      healthCess: Math.round(cess),
      totalTax: Math.round(tax + cess),
      surcharge: 0,
      marginalLiability: ((tax + cess) / totalIncome * 100).toFixed(2),
      effectiveRate: totalIncome > 0 ? ((tax + cess) / totalIncome * 100).toFixed(2) : 0,
      regime: 'new',
      source: 'income_tax'
    };
  },

  calculateOldRegimeTax(totalIncome, age) {
    // Simplified old regime calculation
    const rebate80C = Math.min(150000, totalIncome * 0.3); // Max ₹1.5L
    const rebate80D = Math.min(25000, totalIncome * 0.05); // Max ₹25K
    const taxableIncome = Math.max(0, totalIncome - rebate80C - rebate80D);

    // Old slabs
    let tax = 0;
    if (taxableIncome <= 250000) {
      tax = 0;
    } else if (taxableIncome <= 500000) {
      tax = (taxableIncome - 250000) * 0.05;
    } else if (taxableIncome <= 1000000) {
      tax = 12500 + (taxableIncome - 500000) * 0.20;
    } else {
      tax = 112500 + (taxableIncome - 1000000) * 0.30;
    }

    // Rebate under 87A (for income < ₹5L)
    if (totalIncome <= 500000) {
      tax = Math.max(0, tax - totalIncome * 0.125);
    }

    const cess = tax * 0.04;

    return {
      totalIncome,
      taxableIncome,
      deductions: {
        rebate80C,
        rebate80D
      },
      grossTax: Math.round(tax),
      healthCess: Math.round(cess),
      totalTax: Math.round(tax + cess),
      effectiveRate: totalIncome > 0 ? ((tax + cess) / totalIncome * 100).toFixed(2) : 0,
      regime: 'old',
      source: 'income_tax'
    };
  },

  // Calculate presumptive tax for businesses
  calculatePresumptiveTax(businessIncome, scheme = '44AD') {
    const rates = {
      '44AD': { rate: 0.06, description: 'Presumptive taxation for businesses' },
      '44ADA': { rate: 0.50, description: 'Presumptive for professionals' },
      '44AE': { rate: 0.06, description: 'Presumptive for transport businesses' }
    };

    const config = rates[scheme];
    const presumedProfit = businessIncome * config.rate;
    const taxOnProfit = this.calculateNewRegimeTax(presumedProfit);

    return {
      businessIncome,
      presumedProfit,
      presumptiveRate: config.rate * 100,
      scheme: scheme,
      description: config.description,
      ...taxOnProfit
    };
  }
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  IndiaTax,
  UAETax,
  CorporateTax,

  // Convenience functions
  calculateGST: (amount, rate, type) => IndiaTax.calculateGST(amount, rate, type),
  calculateTDS: (section, amount, payerType) => IndiaTax.calculateTDS(section, amount, payerType),
  calculateTCS: (section, amount) => IndiaTax.calculateTCS(section, amount),
  calculateVAT: (amount) => UAETax.calculateVAT(amount),
  calculateCorporateTax: (income, freeZone) => UAETax.calculateCorporateTax(income, freeZone),
  calculateIncomeTax: (income, regime, age) => CorporateTax.calculateIncomeTax(income, regime, age)
};
