/**
 * REZ Sales Tax Service
 * Regional Sales Tax Compliance - US States, Canada GST/HST, India GST
 * Port: 4310
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

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

const PORT = 4310;
const APP = express();

// In-memory storage
const taxRecords = new Map();
const nexusJurisdictions = new Map();

// US State Sales Tax Rates (simplified - base rates, actual may vary by locality)
const US_STATE_TAX_RATES = {
  'AL': 4.0, 'AK': 0, 'AZ': 5.6, 'AR': 6.5, 'CA': 7.25,
  'CO': 2.9, 'CT': 6.35, 'DE': 0, 'FL': 6.0, 'GA': 4.0,
  'HI': 4.0, 'ID': 6.0, 'IL': 6.25, 'IN': 7.0, 'IA': 6.0,
  'KS': 6.5, 'KY': 6.0, 'LA': 4.45, 'ME': 5.5, 'MD': 6.0,
  'MA': 6.25, 'MI': 6.0, 'MN': 6.875, 'MS': 7.0, 'MO': 4.225,
  'MT': 0, 'NE': 5.5, 'NV': 6.85, 'NH': 0, 'NJ': 6.625,
  'NM': 5.125, 'NY': 4.0, 'NC': 4.75, 'ND': 5.0, 'OH': 5.75,
  'OK': 4.5, 'OR': 0, 'PA': 6.0, 'RI': 7.0, 'SC': 6.0,
  'SD': 4.5, 'TN': 7.0, 'TX': 6.25, 'UT': 6.1, 'VT': 6.0,
  'VA': 5.3, 'WA': 6.5, 'WV': 6.0, 'WI': 5.0, 'WY': 4.0,
  'DC': 6.0
};

// Canada GST/HST/PST rates
const CANADA_TAX_RATES = {
  'BC': { gst: 5, pst: 7, hst: 0 },  // British Columbia
  'ON': { gst: 5, pst: 0, hst: 13 }, // Ontario
  'QC': { gst: 5, pst: 9.975, hst: 0 }, // Quebec
  'AB': { gst: 5, pst: 0, hst: 0 },  // Alberta
  'MB': { gst: 5, pst: 7, hst: 0 },  // Manitoba
  'SK': { gst: 5, pst: 6, hst: 0 },  // Saskatchewan
  'NS': { gst: 5, pst: 0, hst: 15 }, // Nova Scotia
  'NB': { gst: 5, pst: 0, hst: 15 }, // New Brunswick
  'NL': { gst: 5, pst: 0, hst: 15 }, // Newfoundland
  'PE': { gst: 5, pst: 0, hst: 15 }, // Prince Edward Island
  'NT': { gst: 5, pst: 0, hst: 0 },  // Northwest Territories
  'YT': { gst: 5, pst: 0, hst: 0 },  // Yukon
  'NU': { gst: 5, pst: 0, hst: 0 }   // Nunavut
};

// India GST Rates
const INDIA_GST_RATES = {
  '0': ['fresh fruits', 'vegetables', 'milk', 'bread', 'books', 'newspapers'],
  '5': ['sugar', 'tea', 'edible oil', 'small restaurants', 'transport services'],
  '12': ['computers', 'processed food', 'business class air travel'],
  '18': ['most items', 'restaurants', 'telecom', 'financial services'],
  '28': ['luxury items', 'cars', 'tobacco', 'aerated drinks', 'air conditioners']
};

// Middleware
APP.use(helmet());
APP.use(cors());
APP.use(express.json());

// Logging middleware
APP.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('user-agent') });
  next();
});

/**
 * Calculate US Sales Tax
 */
function calculateUSTax(state, amount, localityRate = 0) {
  const stateRate = US_STATE_TAX_RATES[state.toUpperCase()] || 0;
  const totalRate = stateRate + localityRate;
  const taxAmount = amount * (totalRate / 100);
  return {
    state,
    stateRate,
    localityRate,
    totalRate,
    taxableAmount: amount,
    taxAmount: Math.round(taxAmount * 100) / 100,
    totalAmount: Math.round((amount + taxAmount) * 100) / 100,
    currency: 'USD'
  };
}

/**
 * Calculate Canada GST/HST/PST
 */
function calculateCanadaTax(province, amount) {
  const rates = CANADA_TAX_RATES[province.toUpperCase()] || CANADA_TAX_RATES['ON'];
  const gstAmount = amount * (rates.gst / 100);
  const pstAmount = amount * (rates.pst / 100);
  const hstAmount = amount * (rates.hst / 100);
  const totalTax = gstAmount + pstAmount + hstAmount;

  return {
    province,
    gst: rates.gst,
    pst: rates.pst,
    hst: rates.hst,
    taxableAmount: amount,
    gstAmount: Math.round(gstAmount * 100) / 100,
    pstAmount: Math.round(pstAmount * 100) / 100,
    hstAmount: Math.round(hstAmount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalAmount: Math.round((amount + totalTax) * 100) / 100,
    currency: 'CAD'
  };
}

/**
 * Calculate India GST
 */
function calculateIndiaGST(rate, amount) {
  const ratePercent = parseFloat(rate);
  const cgst = amount * (ratePercent / 200); // Half of GST goes to CGST
  const sgst = amount * (ratePercent / 200); // Half goes to SGST
  const totalGST = cgst + sgst;

  return {
    rate: ratePercent,
    taxableAmount: amount,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    totalGST: Math.round(totalGST * 100) / 100,
    totalAmount: Math.round((amount + totalGST) * 100) / 100,
    currency: 'INR'
  };
}

/**
 * GET /health - Health check endpoint
 */
APP.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ-sales-tax-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/rates/us - Get US state tax rates
 */
APP.get('/api/rates/us', (req, res) => {
  res.json({ rates: US_STATE_TAX_RATES, currency: 'USD' });
});

/**
 * GET /api/rates/canada - Get Canada provincial tax rates
 */
APP.get('/api/rates/canada', (req, res) => {
  res.json({ rates: CANADA_TAX_RATES, currency: 'CAD' });
});

/**
 * GET /api/rates/india - Get India GST rates
 */
APP.get('/api/rates/india', (req, res) => {
  res.json({ rates: INDIA_GST_RATES, currency: 'INR' });
});

/**
 * POST /api/calculate/us - Calculate US sales tax
 */
APP.post('/api/calculate/us', (req, res) => {
  const { state, amount, localityRate = 0 } = req.body;

  if (!state || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields: state, amount' });
  }

  if (amount < 0) {
    return res.status(400).json({ error: 'Amount must be non-negative' });
  }

  const result = calculateUSTax(state, parseFloat(amount), parseFloat(localityRate));
  const recordId = uuidv4();
  taxRecords.set(recordId, { ...result, timestamp: new Date().toISOString() });

  logger.info(`US Tax calculated for ${state}: ${result.taxAmount} on ${amount}`);
  res.json({ recordId, ...result });
});

/**
 * POST /api/calculate/canada - Calculate Canada GST/HST/PST
 */
APP.post('/api/calculate/canada', (req, res) => {
  const { province, amount } = req.body;

  if (!province || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields: province, amount' });
  }

  const result = calculateCanadaTax(province, parseFloat(amount));
  const recordId = uuidv4();
  taxRecords.set(recordId, { ...result, timestamp: new Date().toISOString() });

  logger.info(`Canada Tax calculated for ${province}: ${result.totalTax} on ${amount}`);
  res.json({ recordId, ...result });
});

/**
 * POST /api/calculate/india - Calculate India GST
 */
APP.post('/api/calculate/india', (req, res) => {
  const { rate, amount } = req.body;

  if (!rate || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields: rate, amount' });
  }

  const validRates = ['0', '5', '12', '18', '28'];
  if (!validRates.includes(rate.toString())) {
    return res.status(400).json({ error: 'Invalid GST rate. Use: 0, 5, 12, 18, or 28' });
  }

  const result = calculateIndiaGST(rate, parseFloat(amount));
  const recordId = uuidv4();
  taxRecords.set(recordId, { ...result, timestamp: new Date().toISOString() });

  logger.info(`India GST calculated for rate ${rate}%: ${result.totalGST} on ${amount}`);
  res.json({ recordId, ...result });
});

/**
 * POST /api/nexus - Register business nexus in jurisdiction
 */
APP.post('/api/nexus', (req, res) => {
  const { businessId, jurisdiction, jurisdictionType, effectiveDate } = req.body;

  if (!businessId || !jurisdiction || !jurisdictionType) {
    return res.status(400).json({ error: 'Missing required fields: businessId, jurisdiction, jurisdictionType' });
  }

  const nexusRecord = {
    id: uuidv4(),
    businessId,
    jurisdiction: jurisdiction.toUpperCase(),
    jurisdictionType,
    effectiveDate: effectiveDate || new Date().toISOString(),
    status: 'active'
  };

  const key = `${businessId}:${jurisdiction}`;
  nexusJurisdictions.set(key, nexusRecord);

  logger.info(`Nexus registered: ${businessId} in ${jurisdiction}`);
  res.status(201).json(nexusRecord);
});

/**
 * GET /api/nexus/:businessId - Get nexus jurisdictions for a business
 */
APP.get('/api/nexus/:businessId', (req, res) => {
  const { businessId } = req.params;
  const jurisdictions = [];

  for (const [key, record] of nexusJurisdictions) {
    if (key.startsWith(`${businessId}:`)) {
      jurisdictions.push(record);
    }
  }

  res.json({ businessId, jurisdictions });
});

/**
 * GET /api/records - Get all tax calculation records
 */
APP.get('/api/records', (req, res) => {
  const records = Array.from(taxRecords.values());
  res.json({ count: records.length, records });
});

/**
 * GET /api/records/:recordId - Get specific tax record
 */
APP.get('/api/records/:recordId', (req, res) => {
  const { recordId } = req.params;
  const record = taxRecords.get(recordId);

  if (!record) {
    return res.status(404).json({ error: 'Record not found' });
  }

  res.json({ recordId, ...record });
});

/**
 * POST /api/batch-calculate - Batch tax calculations
 */
APP.post('/api/batch-calculate', (req, res) => {
  const { calculations } = req.body;

  if (!calculations || !Array.isArray(calculations)) {
    return res.status(400).json({ error: 'Missing or invalid calculations array' });
  }

  const results = calculations.map(calc => {
    try {
      if (calc.region === 'US') {
        return { ...calc, result: calculateUSTax(calc.state, calc.amount, calc.localityRate) };
      } else if (calc.region === 'Canada') {
        return { ...calc, result: calculateCanadaTax(calc.province, calc.amount) };
      } else if (calc.region === 'India') {
        return { ...calc, result: calculateIndiaGST(calc.rate, calc.amount) };
      }
      return { ...calc, error: 'Invalid region' };
    } catch (err) {
      return { ...calc, error: err.message };
    }
  });

  res.json({ count: results.length, results });
});

// Error handling
APP.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
APP.listen(PORT, () => {
  logger.info(`REZ Sales Tax Service running on port ${PORT}`);
  logger.info('Supported regions: US States, Canada Provinces, India GST');
});

module.exports = APP;
