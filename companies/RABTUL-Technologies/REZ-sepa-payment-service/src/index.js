/**
 * REZ SEPA Payment Service
 * European SEPA Direct Debit and Credit Transfer
 * Port: 4312
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

const PORT = 4312;
const APP = express();

// In-memory storage
const payments = new Map();
const mandates = new Map();
const accounts = new Map();

// SEPA countries
const SEPA_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'GB', 'IS', 'LI',
  'NO', 'CH', 'MC', 'SM', 'VA', 'AD', 'GG', 'JE', 'IM', 'FK'
];

/**
 * Validate IBAN format
 */
function validateIBAN(iban) {
  if (!iban || typeof iban !== 'string') {
    return { valid: false, error: 'IBAN is required' };
  }

  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

  // Check length (varies by country, but 15-34 chars)
  if (cleanIBAN.length < 15 || cleanIBAN.length > 34) {
    return { valid: false, error: 'Invalid IBAN length' };
  }

  // Check country code (first 2 chars)
  const countryCode = cleanIBAN.substring(0, 2);
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { valid: false, error: 'Invalid country code' };
  }

  // Check SEPA country
  const isSEPA = SEPA_COUNTRIES.includes(countryCode);

  // Check digits (2 chars after country code)
  const checkDigits = cleanIBAN.substring(2, 4);
  if (!/^[0-9]{2}$/.test(checkDigits)) {
    return { valid: false, error: 'Invalid check digits' };
  }

  // Basic MOD-97 validation
  const rearranged = cleanIBAN.substring(4) + cleanIBAN.substring(0, 4);
  let numericIBAN = '';
  for (const char of rearranged) {
    if (/[A-Z]/.test(char)) {
      numericIBAN += (char.charCodeAt(0) - 55).toString();
    } else {
      numericIBAN += char;
    }
  }

  // Check if divisible by 97
  const isValidChecksum = BigInt(numericIBAN) % 97n === 1n;

  if (!isValidChecksum) {
    return { valid: false, error: 'Invalid IBAN checksum', countryCode, isSEPA };
  }

  return {
    valid: true,
    iban: cleanIBAN,
    countryCode,
    isSEPA,
    formatted: formatIBAN(cleanIBAN)
  };
}

/**
 * Format IBAN with spaces
 */
function formatIBAN(iban) {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Validate BIC/SWIFT code
 */
function validateBIC(bic) {
  if (!bic || typeof bic !== 'string') {
    return { valid: false, error: 'BIC is required' };
  }

  const cleanBIC = bic.replace(/\s/g, '').toUpperCase();

  // BIC is 8 or 11 characters
  if (cleanBIC.length !== 8 && cleanBIC.length !== 11) {
    return { valid: false, error: 'BIC must be 8 or 11 characters' };
  }

  // Format: BBBBCCLL or BBBBCCLLBBB
  // BBBB = Bank code (letters)
  // CC = Country code (letters)
  // LL = Location code (alphanumeric)
  // BBB = Branch code (optional, alphanumeric)

  const bankCode = cleanBIC.substring(0, 4);
  const countryCode = cleanBIC.substring(4, 6);
  const locationCode = cleanBIC.substring(6, 8);
  const branchCode = cleanBIC.length === 11 ? cleanBIC.substring(8) : '';

  if (!/^[A-Z]{4}$/.test(bankCode)) {
    return { valid: false, error: 'Invalid bank code' };
  }

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { valid: false, error: 'Invalid country code' };
  }

  if (!/^[A-Z0-9]{2}$/.test(locationCode)) {
    return { valid: false, error: 'Invalid location code' };
  }

  if (branchCode && !/^[A-Z0-9]{3}$/.test(branchCode)) {
    return { valid: false, error: 'Invalid branch code' };
  }

  return {
    valid: true,
    bic: cleanBIC,
    bankCode,
    countryCode,
    locationCode,
    branchCode: branchCode || null
  };
}

/**
 * Create SEPA payment
 */
function createSEPAPayment(paymentData) {
  const {
    type, // 'SCT' (credit transfer) or 'SDD' (direct debit)
    fromAccount,
    toAccount,
    amount,
    currency = 'EUR',
    reference,
    description,
    requestedDate
  } = paymentData;

  // Validate accounts
  const fromIBAN = validateIBAN(fromAccount);
  const toIBAN = validateIBAN(toAccount);

  if (!fromIBAN.valid) {
    throw new Error(`Invalid sender IBAN: ${fromIBAN.error}`);
  }
  if (!toIBAN.valid) {
    throw new Error(`Invalid recipient IBAN: ${toIBAN.error}`);
  }

  // Check SEPA countries
  if (!fromIBAN.isSEPA) {
    logger.warn(`Sender IBAN ${fromIBAN.countryCode} may not be in SEPA zone`);
  }
  if (!toIBAN.isSEPA) {
    logger.warn(`Recipient IBAN ${toIBAN.countryCode} may not be in SEPA zone`);
  }

  // Currency check
  if (currency !== 'EUR') {
    logger.warn(`SEPA typically uses EUR, received ${currency}`);
  }

  const paymentId = `SEPA-${uuidv4().substring(0, 8).toUpperCase()}`;
  const now = new Date();

  const payment = {
    id: paymentId,
    type,
    status: 'pending',
    fromAccount: fromIBAN.formatted,
    fromCountry: fromIBAN.countryCode,
    toAccount: toIBAN.formatted,
    toCountry: toIBAN.countryCode,
    amount: parseFloat(amount),
    currency,
    reference: reference || `REF-${paymentId}`,
    description,
    requestedExecutionDate: requestedDate || now.toISOString().split('T')[0],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  // Simulate processing
  setTimeout(() => {
    payment.status = 'accepted';
    payment.updatedAt = new Date().toISOString();
    logger.info(`Payment ${paymentId} accepted for processing`);
  }, 100);

  return payment;
}

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
 * GET /health - Health check
 */
APP.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ-sepa-payment-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/countries - List SEPA countries
 */
APP.get('/api/countries', (req, res) => {
  res.json({ count: SEPA_COUNTRIES.length, countries: SEPA_COUNTRIES });
});

/**
 * POST /api/validate/iban - Validate IBAN
 */
APP.post('/api/validate/iban', (req, res) => {
  const { iban } = req.body;

  if (!iban) {
    return res.status(400).json({ error: 'IBAN is required' });
  }

  const result = validateIBAN(iban);
  logger.info(`IBAN validation: ${iban} - ${result.valid ? 'valid' : result.error}`);
  res.json(result);
});

/**
 * POST /api/validate/bic - Validate BIC
 */
APP.post('/api/validate/bic', (req, res) => {
  const { bic } = req.body;

  if (!bic) {
    return res.status(400).json({ error: 'BIC is required' });
  }

  const result = validateBIC(bic);
  logger.info(`BIC validation: ${bic} - ${result.valid ? 'valid' : result.error}`);
  res.json(result);
});

/**
 * POST /api/credit-transfer - Create SEPA Credit Transfer (SCT)
 */
APP.post('/api/credit-transfer', (req, res) => {
  const { fromAccount, toAccount, amount, currency, reference, description, requestedDate } = req.body;

  if (!fromAccount || !toAccount || !amount) {
    return res.status(400).json({ error: 'Missing required fields: fromAccount, toAccount, amount' });
  }

  try {
    const payment = createSEPAPayment({
      type: 'SCT',
      fromAccount,
      toAccount,
      amount,
      currency,
      reference,
      description,
      requestedDate
    });

    payments.set(payment.id, payment);
    logger.info(`SCT created: ${payment.id} - ${amount} ${currency}`);
    res.status(201).json(payment);
  } catch (err) {
    logger.error(`SCT creation failed: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/direct-debit - Create SEPA Direct Debit (SDD)
 */
APP.post('/api/direct-debit', (req, res) => {
  const { creditorAccount, debtorAccount, amount, currency, mandateId, reference, description, requestedDate } = req.body;

  if (!creditorAccount || !debtorAccount || !amount || !mandateId) {
    return res.status(400).json({ error: 'Missing required fields: creditorAccount, debtorAccount, amount, mandateId' });
  }

  // Check mandate exists
  const mandate = mandates.get(mandateId);
  if (!mandate) {
    return res.status(400).json({ error: 'Mandate not found. Create mandate first.' });
  }

  if (mandate.status !== 'active') {
    return res.status(400).json({ error: `Mandate is ${mandate.status}` });
  }

  try {
    const payment = createSEPAPayment({
      type: 'SDD',
      fromAccount: debtorAccount,
      toAccount: creditorAccount,
      amount,
      currency,
      reference,
      description,
      requestedDate
    });

    payment.mandateId = mandateId;
    payments.set(payment.id, payment);
    logger.info(`SDD created: ${payment.id} - ${amount} ${currency}`);
    res.status(201).json(payment);
  } catch (err) {
    logger.error(`SDD creation failed: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/mandates - Create direct debit mandate
 */
APP.post('/api/mandates', (req, res) => {
  const { creditorName, creditorIBAN, debtorName, debtorIBAN, scheme = 'CORE' } = req.body;

  if (!creditorName || !creditorIBAN || !debtorName || !debtorIBAN) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const creditorIBANValidation = validateIBAN(creditorIBAN);
  const debtorIBANValidation = validateIBAN(debtorIBAN);

  if (!creditorIBANValidation.valid || !debtorIBANValidation.valid) {
    return res.status(400).json({ error: 'Invalid IBAN provided' });
  }

  const mandateId = `MAND-${uuidv4().substring(0, 8).toUpperCase()}`;
  const mandate = {
    id: mandateId,
    creditorName,
    creditorIBAN: creditorIBANValidation.formatted,
    creditorCountry: creditorIBANValidation.countryCode,
    debtorName,
    debtorIBAN: debtorIBANValidation.formatted,
    debtorCountry: debtorIBANValidation.countryCode,
    scheme, // CORE or B2B
    status: 'active',
    createdAt: new Date().toISOString()
  };

  mandates.set(mandateId, mandate);
  logger.info(`Mandate created: ${mandateId}`);
  res.status(201).json(mandate);
});

/**
 * GET /api/mandates - List mandates
 */
APP.get('/api/mandates', (req, res) => {
  const mandateList = Array.from(mandates.values());
  res.json({ count: mandateList.length, mandates: mandateList });
});

/**
 * GET /api/mandates/:mandateId - Get mandate details
 */
APP.get('/api/mandates/:mandateId', (req, res) => {
  const { mandateId } = req.params;
  const mandate = mandates.get(mandateId);

  if (!mandate) {
    return res.status(404).json({ error: 'Mandate not found' });
  }

  res.json(mandate);
});

/**
 * PATCH /api/mandates/:mandateId - Update mandate status
 */
APP.patch('/api/mandates/:mandateId', (req, res) => {
  const { mandateId } = req.params;
  const { status } = req.body;

  const mandate = mandates.get(mandateId);
  if (!mandate) {
    return res.status(404).json({ error: 'Mandate not found' });
  }

  const validStatuses = ['active', 'cancelled', 'expired'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` });
  }

  mandate.status = status;
  mandate.updatedAt = new Date().toISOString();
  mandates.set(mandateId, mandate);

  logger.info(`Mandate ${mandateId} updated to ${status}`);
  res.json(mandate);
});

/**
 * GET /api/payments - List payments
 */
APP.get('/api/payments', (req, res) => {
  const { status, type } = req.query;
  let paymentList = Array.from(payments.values());

  if (status) {
    paymentList = paymentList.filter(p => p.status === status);
  }
  if (type) {
    paymentList = paymentList.filter(p => p.type === type);
  }

  res.json({ count: paymentList.length, payments: paymentList });
});

/**
 * GET /api/payments/:paymentId - Get payment details
 */
APP.get('/api/payments/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const payment = payments.get(paymentId);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json(payment);
});

/**
 * POST /api/accounts - Create virtual account
 */
APP.post('/api/accounts', (req, res) => {
  const { ownerId, iban, currency = 'EUR', name } = req.body;

  if (!ownerId || !iban) {
    return res.status(400).json({ error: 'Missing required fields: ownerId, iban' });
  }

  const ibanValidation = validateIBAN(iban);
  if (!ibanValidation.valid) {
    return res.status(400).json({ error: `Invalid IBAN: ${ibanValidation.error}` });
  }

  const accountId = `ACC-${uuidv4().substring(0, 8).toUpperCase()}`;
  const account = {
    id: accountId,
    ownerId,
    iban: ibanValidation.formatted,
    country: ibanValidation.countryCode,
    currency,
    name,
    balance: 0,
    createdAt: new Date().toISOString()
  };

  accounts.set(accountId, account);
  logger.info(`Account created: ${accountId}`);
  res.status(201).json(account);
});

/**
 * GET /api/accounts/:accountId - Get account details
 */
APP.get('/api/accounts/:accountId', (req, res) => {
  const { accountId } = req.params;
  const account = accounts.get(accountId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  res.json(account);
});

// Error handling
APP.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
APP.listen(PORT, () => {
  logger.info(`REZ SEPA Payment Service running on port ${PORT}`);
  logger.info('SEPA SCT (Credit Transfer) and SDD (Direct Debit) support');
});

module.exports = APP;
