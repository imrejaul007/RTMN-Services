/**
 * REZ-eInvoicing Service
 * EU E-Invoicing Implementation with Peppol, ZUGFeRD, XRechnung, Factur-X
 * Port: 4320
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Constants
const PORT = 4320;
const APP = express();

// In-memory storage (replace with MongoDB in production)
const invoices = new Map();
const countries = ['DE', 'FR', 'AT', 'NL', 'BE', 'IT', 'ES', 'PL', 'SE', 'DK', 'FI', 'IE', 'PT', 'GR', 'CZ', 'HU', 'SK', 'SI', 'EE', 'LV', 'LT', 'CY', 'LU', 'MT', 'BG', 'HR', 'RO'];

// EU VAT rates by country
const VAT_RATES = {
  'DE': 19, 'FR': 20, 'AT': 20, 'NL': 21, 'BE': 21, 'IT': 22, 'ES': 21,
  'PL': 23, 'SE': 25, 'DK': 25, 'FI': 24, 'IE': 23, 'PT': 23, 'GR': 24,
  'CZ': 21, 'HU': 27, 'SK': 20, 'SI': 22, 'EE': 22, 'LV': 21, 'LT': 21,
  'CY': 19, 'LU': 17, 'MT': 18, 'BG': 20, 'HR': 25, 'RO': 19
};

// Peppol BIS 3.0 Invoice XML template
const PEPPOL_INVOICE_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>{{INVOICE_NUMBER}}</cbc:ID>
  <cbc:IssueDate>{{ISSUE_DATE}}</cbc:IssueDate>
  <cbc:DueDate>{{DUE_DATE}}</cbc:DueDate>
  <cbc:InvoiceTypeCode listAgencyID="6" listID="UNCL1001">{{INVOICE_TYPE}}</cbc:InvoiceTypeCode>
  <cbc:Note>{{NOTES}}</cbc:Note>
  <cbc:DocumentCurrencyCode>{{CURRENCY}}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:EndpointID schemeID="{{SELLER_SCHEME}}">{{SELLER_ID}}</cbc:EndpointID>
      <cac:PartyName><cbc:Name>{{SELLER_NAME}}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>{{SELLER_STREET}}</cbc:StreetName>
        <cbc:CityName>{{SELLER_CITY}}</cbc:CityName>
        <cbc:PostalZone>{{SELLER_POSTAL}}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>{{SELLER_COUNTRY}}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>{{SELLER_VAT}}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cbc:EndpointID schemeID="{{BUYER_SCHEME}}">{{BUYER_ID}}</cbc:EndpointID>
      <cac:PartyName><cbc:Name>{{BUYER_NAME}}</cbc:Name></cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>{{BUYER_STREET}}</cbc:StreetName>
        <cbc:CityName>{{BUYER_CITY}}</cbc:CityName>
        <cbc:PostalZone>{{BUYER_POSTAL}}</cbc:PostalZone>
        <cac:Country><cbc:IdentificationCode>{{BUYER_COUNTRY}}</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme><cbc:CompanyID>{{BUYER_VAT}}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="{{CURRENCY}}">{{TAX_AMOUNT}}</cbc:TaxAmount>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="{{CURRENCY}}">{{NET_AMOUNT}}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="{{CURRENCY}}">{{NET_AMOUNT}}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="{{CURRENCY}}">{{TOTAL_AMOUNT}}</cbc:TaxInclusiveAmount>
    <cbc:DuePayableAmount currencyID="{{CURRENCY}}">{{TOTAL_AMOUNT}}</cbc:DuePayableAmount>
  </cac:LegalMonetaryTotal>
  {{LINE_ITEMS}}
</Invoice>`;

// Middleware
APP.use(helmet());
APP.use(cors());
APP.use(express.json({ limit: '10mb' }));
APP.use(express.urlencoded({ extended: true }));

// Request logging
APP.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { body: req.body });
  next();
});

// Health check
APP.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ-eInvoicing Service',
    version: '1.0.0',
    port: PORT,
    supportedFormats: ['PEPPOL_BIS_3_0', 'ZUGFeRD_2_1', 'XRechnung', 'Factur-X'],
    features: ['invoice_crud', 'format_conversion', 'pdf_generation', 'peppol_integration', 'vat_validation']
  });
});

// Validate EU VAT number
function validateVAT(vatNumber) {
  if (!vatNumber) return { valid: false, message: 'VAT number is required' };

  const cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();
  const countryMatch = cleanVAT.match(/^([A-Z]{2})?(.*)$/);

  if (!countryMatch) return { valid: false, message: 'Invalid VAT format' };

  const countryCode = countryMatch[1] || null;
  const number = countryMatch[2];

  if (!countryCode || !VAT_RATES[countryCode]) {
    return { valid: false, message: 'Unknown EU country code' };
  }

  // Basic format validation (varies by country, simplified here)
  if (number.length < 6 || number.length > 12) {
    return { valid: false, message: 'Invalid VAT number length' };
  }

  return { valid: true, countryCode, vatNumber: cleanVAT };
}

// Calculate VAT for a line item
function calculateLineVAT(amount, vatRate, vatExempt = false) {
  if (vatExempt) {
    return { netAmount: amount, vatRate: 0, vatAmount: 0, grossAmount: amount };
  }
  const vatAmount = amount * (vatRate / 100);
  return {
    netAmount: amount,
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    grossAmount: Math.round((amount + vatAmount) * 100) / 100
  };
}

// Calculate totals for invoice
function calculateInvoiceTotals(lineItems, currency = 'EUR') {
  let netTotal = 0;
  let vatTotal = 0;
  let grossTotal = 0;

  lineItems.forEach(item => {
    const lineCalc = calculateLineVAT(item.amount, item.vatRate || 20, item.vatExempt);
    netTotal += lineCalc.netAmount;
    vatTotal += lineCalc.vatAmount;
    grossTotal += lineCalc.grossAmount;
  });

  return {
    netAmount: Math.round(netTotal * 100) / 100,
    vatAmount: Math.round(vatTotal * 100) / 100,
    totalAmount: Math.round(grossTotal * 100) / 100,
    currency
  };
}

// Generate Peppol line items XML
function generateLineItemsXML(lineItems, currency) {
  let xml = '';
  lineItems.forEach((item, index) => {
    const calc = calculateLineVAT(item.amount, item.vatRate || 20, item.vatExempt);
    xml += `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${item.unit || 'C62'}">${item.quantity || 1}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${calc.netAmount}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${item.description || 'Item ' + (index + 1)}</cbc:Name>
      ${item.productCode ? `<cac:SellersItemIdentification><cbc:ID>${item.productCode}</cbc:ID></cac:SellersItemIdentification>` : ''}
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${item.unitPrice || item.amount}</cbc:PriceAmount>
    </cac:Price>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="${currency}">${calc.vatAmount}</cbc:TaxAmount>
    </cac:TaxTotal>
  </cac:InvoiceLine>`;
  });
  return xml;
}

// Generate Peppol BIS 3.0 XML
function generatePeppolXML(invoice) {
  let xml = PEPPOL_INVOICE_TEMPLATE;

  const totals = calculateInvoiceTotals(invoice.lineItems, invoice.currency);
  const lineItemsXML = generateLineItemsXML(invoice.lineItems, invoice.currency);

  xml = xml.replace('{{INVOICE_NUMBER}}', invoice.invoiceNumber);
  xml = xml.replace('{{ISSUE_DATE}}', invoice.issueDate || new Date().toISOString().split('T')[0]);
  xml = xml.replace('{{DUE_DATE}}', invoice.dueDate || '');
  xml = xml.replace('{{INVOICE_TYPE}}', invoice.type === 'credit' ? '381' : '380');
  xml = xml.replace('{{NOTES}}', invoice.notes || '');
  xml = xml.replace('{{CURRENCY}}', invoice.currency || 'EUR');
  xml = xml.replace('{{SELLER_SCHEME}}', invoice.seller?.scheme || 'SE');
  xml = xml.replace('{{SELLER_ID}}', invoice.seller?.id || '');
  xml = xml.replace('{{SELLER_NAME}}', invoice.seller?.name || '');
  xml = xml.replace('{{SELLER_STREET}}', invoice.seller?.address?.street || '');
  xml = xml.replace('{{SELLER_CITY}}', invoice.seller?.address?.city || '');
  xml = xml.replace('{{SELLER_POSTAL}}', invoice.seller?.address?.postalCode || '');
  xml = xml.replace('{{SELLER_COUNTRY}}', invoice.seller?.country || '');
  xml = xml.replace('{{SELLER_VAT}}', invoice.seller?.vatNumber || '');
  xml = xml.replace('{{BUYER_SCHEME}}', invoice.buyer?.scheme || 'SE');
  xml = xml.replace('{{BUYER_ID}}', invoice.buyer?.id || '');
  xml = xml.replace('{{BUYER_NAME}}', invoice.buyer?.name || '');
  xml = xml.replace('{{BUYER_STREET}}', invoice.buyer?.address?.street || '');
  xml = xml.replace('{{BUYER_CITY}}', invoice.buyer?.address?.city || '');
  xml = xml.replace('{{BUYER_POSTAL}}', invoice.buyer?.address?.postalCode || '');
  xml = xml.replace('{{BUYER_COUNTRY}}', invoice.buyer?.country || '');
  xml = xml.replace('{{BUYER_VAT}}', invoice.buyer?.vatNumber || '');
  xml = xml.replace(/{{TAX_AMOUNT}}/g, totals.vatAmount);
  xml = xml.replace('{{NET_AMOUNT}}', totals.netAmount);
  xml = xml.replace('{{TOTAL_AMOUNT}}', totals.totalAmount);
  xml = xml.replace('{{LINE_ITEMS}}', lineItemsXML);

  return xml;
}

// Generate ZUGFeRD 2.1 XML (simplified)
function generateZUGFeRDXML(invoice) {
  const totals = calculateInvoiceTotals(invoice.lineItems, invoice.currency);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
                          xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataTypes:100"
                          xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${invoice.invoiceNumber}</ram:ID>
    <ram:TypeCode>${invoice.type === 'credit' ? '381' : '380'}</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">${invoice.issueDate?.replace(/-/g, '') || ''}</udt:DateTimeString></ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    ${invoice.lineItems.map((item, i) => {
      const calc = calculateLineVAT(item.amount, item.vatRate || 20, item.vatExempt);
      return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${i + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${item.description || 'Item ' + (i + 1)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${calc.netAmount}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${item.quantity || 1}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>${item.vatExempt ? 'E' : 'S'}</ram:CategoryCode>
          <ram:RateApplicablePercent>${calc.vatRate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
    }).join('')}
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${invoice.currency || 'EUR'}</ram:InvoiceCurrencyCode>
      <ram:ApplicableTradeTax>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>${totals.netAmount}</ram:BasisAmount>
        <ram:CalculatedAmount>${totals.vatAmount}</ram:CalculatedAmount>
      </ram:ApplicableTradeTax>
      <ram:GrandTotalAmount>${totals.totalAmount}</ram:GrandTotalAmount>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

// Generate XRechnung (German CIUS)
function generateXRechnung(invoice) {
  const totals = calculateInvoiceTotals(invoice.lineItems, invoice.currency);

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
         xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataTypes:100"
         xmlns="urn:cen.eu:en16931:2017">
  < rams:ExchangedDocumentContext>
    <ram:BusinessProcess女方>EN16931</ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${invoice.invoiceNumber}</ram:ID>
    <ram:TypeCode>${invoice.type === 'credit' ? '381' : '380'}</ram:TypeCode>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${invoice.currency || 'EUR'}</ram:InvoiceCurrencyCode>
      <ram:TaxCurrencyCode>${invoice.currency || 'EUR'}</ram:TaxCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount currencyID="${invoice.currency || 'EUR'}">${totals.netAmount}</ram:LineTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency || 'EUR'}">${totals.vatAmount}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount currencyID="${invoice.currency || 'EUR'}">${totals.totalAmount}</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</Invoice>`;
}

// Generate Factur-X (French e-invoice standard, similar to ZUGFeRD)
function generateFacturX(invoice) {
  return generateZUGFeRDXML(invoice); // Factur-X is based on ZUGFeRD profile
}

// Format conversion
function convertFormat(invoice, targetFormat) {
  switch (targetFormat.toUpperCase()) {
    case 'PEPPOL_BIS_3_0':
    case 'PEPPOL':
      return generatePeppolXML(invoice);
    case 'ZUGFeRD_2_1':
    case 'ZUGFERD':
      return generateZUGFeRDXML(invoice);
    case 'XRECHNUNG':
    case 'XRECHNUNG_DE':
      return generateXRechnung(invoice);
    case 'FACTUR_X':
    case 'FACTURX':
      return generateFacturX(invoice);
    default:
      throw new Error(`Unsupported format: ${targetFormat}`);
  }
}

// Validate EN 16931 compliance
function validateEN16931(invoice) {
  const errors = [];

  if (!invoice.invoiceNumber) errors.push('Invoice number is required');
  if (!invoice.seller?.name) errors.push('Seller name is required');
  if (!invoice.buyer?.name) errors.push('Buyer name is required');
  if (!invoice.lineItems?.length) errors.push('At least one line item is required');

  invoice.lineItems?.forEach((item, i) => {
    if (!item.description && !item.productCode) {
      errors.push(`Line item ${i + 1}: description or product code is required`);
    }
    if (typeof item.amount !== 'number' || item.amount <= 0) {
      errors.push(`Line item ${i + 1}: valid amount is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    standard: 'EN 16931:2017'
  };
}

// Create invoice
APP.post('/api/invoices', (req, res) => {
  try {
    const invoiceData = {
      ...req.body,
      id: uuidv4(),
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Calculate totals
    invoiceData.totals = calculateInvoiceTotals(invoiceData.lineItems, invoiceData.currency);

    // Validate EN 16931
    const validation = validateEN16931(invoiceData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'EN 16931 validation failed',
        details: validation
      });
    }

    invoices.set(invoiceData.id, invoiceData);

    logger.info(`Invoice created: ${invoiceData.id}`);

    res.status(201).json({
      success: true,
      invoice: invoiceData
    });
  } catch (error) {
    logger.error('Create invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all invoices
APP.get('/api/invoices', (req, res) => {
  try {
    const { status, sellerId, buyerId, fromDate, toDate, limit = 100 } = req.query;

    let filteredInvoices = Array.from(invoices.values());

    if (status) filteredInvoices = filteredInvoices.filter(i => i.status === status);
    if (sellerId) filteredInvoices = filteredInvoices.filter(i => i.seller?.id === sellerId);
    if (buyerId) filteredInvoices = filteredInvoices.filter(i => i.buyer?.id === buyerId);
    if (fromDate) filteredInvoices = filteredInvoices.filter(i => i.issueDate >= fromDate);
    if (toDate) filteredInvoices = filteredInvoices.filter(i => i.issueDate <= toDate);

    filteredInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      count: filteredInvoices.length,
      invoices: filteredInvoices.slice(0, parseInt(limit))
    });
  } catch (error) {
    logger.error('Get invoices error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get invoice by ID
APP.get('/api/invoices/:id', (req, res) => {
  try {
    const invoice = invoices.get(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      invoice
    });
  } catch (error) {
    logger.error('Get invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update invoice
APP.put('/api/invoices/:id', (req, res) => {
  try {
    const existing = invoices.get(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    if (existing.status === 'sent' || existing.status === 'accepted') {
      return res.status(400).json({
        success: false,
        error: 'Cannot modify sent or accepted invoice'
      });
    }

    const updatedData = {
      ...existing,
      ...req.body,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    // Recalculate totals if line items changed
    if (req.body.lineItems) {
      updatedData.totals = calculateInvoiceTotals(updatedData.lineItems, updatedData.currency);
    }

    // Validate EN 16931
    const validation = validateEN16931(updatedData);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'EN 16931 validation failed',
        details: validation
      });
    }

    invoices.set(req.params.id, updatedData);

    logger.info(`Invoice updated: ${req.params.id}`);

    res.json({
      success: true,
      invoice: updatedData
    });
  } catch (error) {
    logger.error('Update invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete invoice
APP.delete('/api/invoices/:id', (req, res) => {
  try {
    const existing = invoices.get(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    if (existing.status === 'sent' || existing.status === 'accepted') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete sent or accepted invoice'
      });
    }

    invoices.delete(req.params.id);

    logger.info(`Invoice deleted: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Invoice deleted'
    });
  } catch (error) {
    logger.error('Delete invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send invoice (simulate Peppol send)
APP.post('/api/invoices/:id/send', (req, res) => {
  try {
    const invoice = invoices.get(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    if (invoice.status === 'sent') {
      return res.status(400).json({
        success: false,
        error: 'Invoice already sent'
      });
    }

    // Generate XML for sending
    const xml = generatePeppolXML(invoice);

    invoice.status = 'sent';
    invoice.sentAt = new Date().toISOString();
    invoice.sentTo = invoice.buyer?.id || 'PEPPOL_NETWORK';
    invoice.xmlDocument = xml;

    invoices.set(req.params.id, invoice);

    logger.info(`Invoice sent via Peppol: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Invoice sent via Peppol network',
      invoiceId: invoice.id,
      sentTo: invoice.sentTo,
      sentAt: invoice.sentAt
    });
  } catch (error) {
    logger.error('Send invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get invoice as specific format
APP.get('/api/invoices/:id/format/:format', (req, res) => {
  try {
    const invoice = invoices.get(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const format = req.params.format.toUpperCase();
    const xml = convertFormat(invoice, format);

    const contentTypes = {
      'PEPPOL_BIS_3_0': 'application/xml',
      'PEPPOL': 'application/xml',
      'ZUGFeRD_2_1': 'application/xml',
      'ZUGFERD': 'application/xml',
      'XRECHNUNG': 'application/xml',
      'XRECHNUNG_DE': 'application/xml',
      'FACTUR_X': 'application/xml',
      'FACTURX': 'application/xml'
    };

    res.setHeader('Content-Type', contentTypes[format] || 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}_${format}.xml"`);

    res.send(xml);
  } catch (error) {
    logger.error('Get invoice format error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Convert invoice format
APP.post('/api/invoices/:id/convert', (req, res) => {
  try {
    const { targetFormat } = req.body;

    if (!targetFormat) {
      return res.status(400).json({
        success: false,
        error: 'Target format is required'
      });
    }

    const invoice = invoices.get(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const xml = convertFormat(invoice, targetFormat);

    res.json({
      success: true,
      invoiceId: invoice.id,
      sourceFormat: invoice.format || 'INTERNAL',
      targetFormat,
      xml
    });
  } catch (error) {
    logger.error('Convert invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// VAT validation endpoint
APP.post('/api/vat/validate', (req, res) => {
  try {
    const { vatNumber } = req.body;

    if (!vatNumber) {
      return res.status(400).json({
        success: false,
        error: 'VAT number is required'
      });
    }

    const validation = validateVAT(vatNumber);

    if (validation.valid) {
      const vatRate = VAT_RATES[validation.countryCode];
      res.json({
        success: true,
        valid: true,
        vatNumber: validation.vatNumber,
        countryCode: validation.countryCode,
        standardVATRate: vatRate,
        message: `Valid EU VAT number for ${validation.countryCode}`
      });
    } else {
      res.json({
        success: true,
        valid: false,
        vatNumber,
        message: validation.message
      });
    }
  } catch (error) {
    logger.error('VAT validation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get VAT rates
APP.get('/api/vat/rates', (req, res) => {
  try {
    const { country } = req.query;

    if (country) {
      const upperCountry = country.toUpperCase();
      if (VAT_RATES[upperCountry]) {
        return res.json({
          success: true,
          countryCode: upperCountry,
          standardRate: VAT_RATES[upperCountry]
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Unknown country code'
        });
      }
    }

    res.json({
      success: true,
      rates: VAT_RATES,
      supportedCountries: countries
    });
  } catch (error) {
    logger.error('Get VAT rates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate invoice EN 16931 compliance
APP.post('/api/invoices/:id/validate', (req, res) => {
  try {
    const invoice = invoices.get(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found'
      });
    }

    const validation = validateEN16931(invoice);

    res.json({
      success: true,
      validation
    });
  } catch (error) {
    logger.error('Validate invoice error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Calculate invoice totals
APP.post('/api/calculate', (req, res) => {
  try {
    const { lineItems, currency = 'EUR' } = req.body;

    if (!lineItems || !Array.isArray(lineItems)) {
      return res.status(400).json({
        success: false,
        error: 'Line items array is required'
      });
    }

    const totals = calculateInvoiceTotals(lineItems, currency);

    res.json({
      success: true,
      lineItems: lineItems.map((item, i) => ({
        ...item,
        calculated: calculateLineVAT(item.amount, item.vatRate || 20, item.vatExempt)
      })),
      totals
    });
  } catch (error) {
    logger.error('Calculate error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
APP.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
APP.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
APP.listen(PORT, () => {
  logger.info(`REZ-eInvoicing Service started on port ${PORT}`);
  logger.info(`Supported formats: Peppol BIS 3.0, ZUGFeRD 2.1, XRechnung, Factur-X`);
  logger.info(`Standard: EN 16931:2017`);
});

module.exports = APP;
