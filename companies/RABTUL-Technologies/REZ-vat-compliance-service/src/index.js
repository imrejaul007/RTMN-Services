/**
 * REZ VAT Compliance Service
 * EU VAT Compliance - Number Validation, MOSS, OSS, B2C/B2B
 * Port: 4311
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

const PORT = 4311;
const APP = express();

// In-memory storage
const vatRegistrations = new Map();
const vatTransactions = new Map();
const complianceRecords = new Map();

// EU Member States with country codes and standard VAT rates
const EU_COUNTRIES = {
  'AT': { name: 'Austria', code: 'AT', rate: 20 },
  'BE': { name: 'Belgium', code: 'BE', rate: 21 },
  'BG': { name: 'Bulgaria', code: 'BG', rate: 20 },
  'HR': { name: 'Croatia', code: 'HR', rate: 25 },
  'CY': { name: 'Cyprus', code: 'CY', rate: 19 },
  'CZ': { name: 'Czech Republic', code: 'CZ', rate: 21 },
  'DK': { name: 'Denmark', code: 'DK', rate: 25 },
  'EE': { name: 'Estonia', code: 'EE', rate: 22 },
  'FI': { name: 'Finland', code: 'FI', rate: 25.5 },
  'FR': { name: 'France', code: 'FR', rate: 20 },
  'DE': { name: 'Germany', code: 'DE', rate: 19 },
  'GR': { name: 'Greece', code: 'GR', rate: 24 },
  'HU': { name: 'Hungary', code: 'HU', rate: 27 },
  'IE': { name: 'Ireland', code: 'IE', rate: 23 },
  'IT': { name: 'Italy', code: 'IT', rate: 22 },
  'LV': { name: 'Latvia', code: 'LV', rate: 21 },
  'LT': { name: 'Lithuania', code: 'LT', rate: 21 },
  'LU': { name: 'Luxembourg', code: 'LU', rate: 17 },
  'MT': { name: 'Malta', code: 'MT', rate: 18 },
  'NL': { name: 'Netherlands', code: 'NL', rate: 21 },
  'PL': { name: 'Poland', code: 'PL', rate: 23 },
  'PT': { name: 'Portugal', code: 'PT', rate: 23 },
  'RO': { name: 'Romania', code: 'RO', rate: 19 },
  'SK': { name: 'Slovakia', code: 'SK', rate: 20 },
  'SI': { name: 'Slovenia', code: 'SI', rate: 22 },
  'ES': { name: 'Spain', code: 'ES', rate: 21 },
  'SE': { name: 'Sweden', code: 'SE', rate: 25 }
};

// VAT Rates by type
const VAT_RATES = {
  standard: {
    'AT': 20, 'BE': 21, 'BG': 20, 'HR': 25, 'CY': 19, 'CZ': 21, 'DK': 25,
    'EE': 22, 'FI': 25.5, 'FR': 20, 'DE': 19, 'GR': 24, 'HU': 27, 'IE': 23,
    'IT': 22, 'LV': 21, 'LT': 21, 'LU': 17, 'MT': 18, 'NL': 21, 'PL': 23,
    'PT': 23, 'RO': 19, 'SK': 20, 'SI': 22, 'ES': 21, 'SE': 25
  },
  reduced: {
    'AT': 10, 'BE': 12, 'BG': 9, 'HR': 13, 'CY': 9, 'CZ': 15, 'DK': 25,
    'EE': 9, 'FI': 14, 'FR': 10, 'DE': 7, 'GR': 13, 'HU': 18, 'IE': 13.5,
    'IT': 10, 'LV': 12, 'LT': 12, 'LU': 14, 'MT': 5, 'NL': 9, 'PL': 8,
    'PT': 13, 'RO': 9, 'SK': 10, 'SI': 9.5, 'ES': 10, 'SE': 12
  },
  superReduced: {
    'AT': 10, 'BE': 6, 'BG': 0, 'HR': 0, 'CY': 0, 'CZ': 0, 'DK': 0,
    'EE': 0, 'FI': 10, 'FR': 2.1, 'DE': 0, 'GR': 0, 'HU': 5, 'IE': 4.8,
    'IT': 4, 'LV': 0, 'LT': 0, 'LU': 3, 'MT': 0, 'NL': 0, 'PL': 0,
    'PT': 6, 'RO': 0, 'SK': 0, 'SI': 0, 'ES': 4, 'SE': 6
  }
};

// Middleware
APP.use(helmet());
APP.use(cors());
APP.use(express.json());

// Logging middleware
APP.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

/**
 * Validate VAT Number format
 * Format: Country Code (2 letters) + 2-13 alphanumeric characters
 */
function validateVATFormat(vatNumber) {
  if (!vatNumber || typeof vatNumber !== 'string') {
    return { valid: false, error: 'VAT number is required' };
  }

  const cleanVAT = vatNumber.replace(/\s/g, '').toUpperCase();
  const countryCode = cleanVAT.substring(0, 2);
  const numberPart = cleanVAT.substring(2);

  if (!EU_COUNTRIES[countryCode]) {
    return { valid: false, error: `Invalid country code: ${countryCode}` };
  }

  if (numberPart.length < 2 || numberPart.length > 13) {
    return { valid: false, error: 'VAT number must be 2-13 characters after country code' };
  }

  if (!/^[A-Z0-9+]+$/.test(numberPart)) {
    return { valid: false, error: 'VAT number contains invalid characters' };
  }

  return { valid: true, countryCode, numberPart, formattedVAT: cleanVAT };
}

/**
 * Calculate VAT amount
 */
function calculateVAT(amount, countryCode, rateType = 'standard') {
  const rates = VAT_RATES[rateType] || VAT_RATES.standard;
  const rate = rates[countryCode];

  if (rate === undefined) {
    throw new Error(`Unknown country code: ${countryCode}`);
  }

  const vatAmount = amount * (rate / 100);
  const totalAmount = amount + vatAmount;

  return {
    netAmount: amount,
    vatRate: rate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    countryCode,
    rateType,
    currency: 'EUR'
  };
}

/**
 * Check reverse charge applicability
 */
function checkReverseCharge(sellerCountry, buyerCountry, buyerVAT, transactionType) {
  // B2C within same country: Standard VAT
  if (sellerCountry === buyerCountry && transactionType === 'B2C') {
    return { applicable: false, reason: 'Same country B2C - standard VAT applies' };
  }

  // B2C to different EU country: OSS destination principle
  if (sellerCountry !== buyerCountry && transactionType === 'B2C') {
    return { applicable: false, reason: 'Cross-border B2C - OSS applies in buyer country' };
  }

  // B2B with valid VAT: Reverse charge
  if (buyerVAT && buyerVAT.valid) {
    return { applicable: true, reason: 'B2B cross-border - reverse charge applies' };
  }

  return { applicable: false, reason: 'Standard VAT applies' };
}

/**
 * GET /health - Health check
 */
APP.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ-vat-compliance-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/countries - List EU countries with VAT rates
 */
APP.get('/api/countries', (req, res) => {
  const countries = Object.entries(EU_COUNTRIES).map(([code, data]) => ({
    code,
    name: data.name,
    standardRate: VAT_RATES.standard[code],
    reducedRate: VAT_RATES.reduced[code],
    superReducedRate: VAT_RATES.superReduced[code]
  }));
  res.json({ count: countries.length, countries });
});

/**
 * POST /api/validate - Validate VAT number format
 */
APP.post('/api/validate', (req, res) => {
  const { vatNumber } = req.body;

  if (!vatNumber) {
    return res.status(400).json({ error: 'VAT number is required' });
  }

  const validation = validateVATFormat(vatNumber);

  if (validation.valid) {
    const countryInfo = EU_COUNTRIES[validation.countryCode];
    const record = {
      id: uuidv4(),
      vatNumber: validation.formattedVAT,
      countryCode: validation.countryCode,
      countryName: countryInfo.name,
      validatedAt: new Date().toISOString(),
      status: 'valid_format'
    };
    vatRegistrations.set(record.id, record);
    logger.info(`VAT validated: ${validation.formattedVAT}`);
    res.json({ valid: true, ...record });
  } else {
    logger.warn(`VAT validation failed: ${vatNumber} - ${validation.error}`);
    res.json({ valid: false, error: validation.error });
  }
});

/**
 * POST /api/calculate - Calculate VAT
 */
APP.post('/api/calculate', (req, res) => {
  const { amount, countryCode, rateType = 'standard' } = req.body;

  if (!amount || !countryCode) {
    return res.status(400).json({ error: 'Missing required fields: amount, countryCode' });
  }

  try {
    const result = calculateVAT(parseFloat(amount), countryCode.toUpperCase(), rateType);
    const recordId = uuidv4();
    vatTransactions.set(recordId, { ...result, timestamp: new Date().toISOString() });
    logger.info(`VAT calculated: ${result.vatAmount} for ${amount} in ${countryCode}`);
    res.json({ recordId, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/reverse-charge - Check reverse charge applicability
 */
APP.post('/api/reverse-charge', (req, res) => {
  const { sellerCountry, buyerCountry, buyerVAT, transactionType } = req.body;

  if (!sellerCountry || !buyerCountry || !transactionType) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const buyerVATValidation = buyerVAT ? validateVATFormat(buyerVAT) : { valid: false };
  const result = checkReverseCharge(
    sellerCountry.toUpperCase(),
    buyerCountry.toUpperCase(),
    buyerVATValidation,
    transactionType.toUpperCase()
  );

  res.json({
    sellerCountry: sellerCountry.toUpperCase(),
    buyerCountry: buyerCountry.toUpperCase(),
    transactionType: transactionType.toUpperCase(),
    buyerVATValid: buyerVATValidation.valid,
    ...result
  });
});

/**
 * POST /api/oss/register - Register for OSS
 */
APP.post('/api/oss/register', (req, res) => {
  const { businessId, homeCountry, expectedVolume } = req.body;

  if (!businessId || !homeCountry) {
    return res.status(400).json({ error: 'Missing required fields: businessId, homeCountry' });
  }

  const registration = {
    id: uuidv4(),
    businessId,
    homeCountry: homeCountry.toUpperCase(),
    scheme: 'OSS',
    status: 'registered',
    expectedVolume,
    registeredAt: new Date().toISOString()
  };

  complianceRecords.set(registration.id, registration);
  logger.info(`OSS registration: ${businessId} in ${homeCountry}`);
  res.status(201).json(registration);
});

/**
 * POST /api/moss/register - Register for MOSS (non-EU)
 */
APP.post('/api/moss/register', (req, res) => {
  const { businessId, businessCountry, scheme = 'nonUnionMOSS' } = req.body;

  if (!businessId || !businessCountry) {
    return res.status(400).json({ error: 'Missing required fields: businessId, businessCountry' });
  }

  const registration = {
    id: uuidv4(),
    businessId,
    businessCountry: businessCountry.toUpperCase(),
    scheme,
    status: 'registered',
    registeredAt: new Date().toISOString()
  };

  complianceRecords.set(registration.id, registration);
  logger.info(`MOSS registration: ${businessId} from ${businessCountry}`);
  res.status(201).json(registration);
});

/**
 * GET /api/records - Get compliance records
 */
APP.get('/api/records', (req, res) => {
  const records = Array.from(complianceRecords.values());
  res.json({ count: records.length, records });
});

/**
 * GET /api/transactions - Get VAT transactions
 */
APP.get('/api/transactions', (req, res) => {
  const transactions = Array.from(vatTransactions.values());
  res.json({ count: transactions.length, transactions });
});

// Error handling
APP.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
APP.listen(PORT, () => {
  logger.info(`REZ VAT Compliance Service running on port ${PORT}`);
  logger.info('EU VAT, OSS, MOSS compliance support');
});

module.exports = APP;
