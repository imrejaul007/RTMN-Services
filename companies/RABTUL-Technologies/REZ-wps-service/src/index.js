/**
 * REZ WPS Service
 * UAE Wage Protection System Compliance
 * Port: 4313
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

const PORT = 4313;
const APP = express();

// In-memory storage
const companies = new Map();
const employees = new Map();
const salaryPayments = new Map();
const MOLFileSubmissions = new Map();

// MOL (Ministry of Human Resources & Emiratisation) file types
const MOL_FILE_TYPES = {
  'WPS': 'Wage Protection System File',
  'ADD': 'Advance Deposit Deduction File',
  'EOS': 'End of Service File',
  'VAC': 'Vacation Allowance File'
};

// UAE Banks participating in WPS
const WPS_BANKS = [
  { code: 'ABU', name: 'Abu Dhabi Commercial Bank' },
  { code: 'ADCB', name: 'ADCB - Abu Dhabi Commercial Bank' },
  { code: 'AUB', name: 'Al Masraf Bank' },
  { code: 'CBD', name: 'Commercial Bank of Dubai' },
  { code: 'CBI', name: 'Commercial Bank International' },
  { code: 'DHB', name: 'Dubai Holding Bank' },
  { code: 'DIB', name: 'Dubai Islamic Bank' },
  { code: 'ENBD', name: 'Emirates NBD Bank' },
  { code: 'FAB', name: 'First Abu Dhabi Bank' },
  { code: 'HSBC', name: 'HSBC Bank Middle East' },
  { code: 'ICBK', name: 'ICICI Bank' },
  { code: 'MASH', name: 'Mashreq Bank' },
  { code: 'NBAD', name: 'National Bank of Abu Dhabi' },
  { code: 'NBQ', name: 'National Bank of Ras Al Khaimah' },
  { code: 'SIB', name: 'Standard Chartered Bank' },
  { code: 'UAB', name: 'United Arab Bank' }
];

/**
 * Validate UAE company establishment card
 */
function validateEstablishmentCard(establishmentCard) {
  if (!establishmentCard) {
    return { valid: false, error: 'Establishment card is required' };
  }

  // UAE establishment card format: 4 digits + 2 letters + 4 digits (e.g., 1234AB5678)
  const pattern = /^\d{4}[A-Z]{2}\d{4}$/;
  if (!pattern.test(establishmentCard)) {
    return { valid: false, error: 'Invalid establishment card format (expected: 1234AB5678)' };
  }

  return { valid: true, establishmentCard: establishmentCard.toUpperCase() };
}

/**
 * Validate MOL establishment number
 */
function validateMOLNumber(molNumber) {
  if (!molNumber) {
    return { valid: false, error: 'MOL number is required' };
  }

  // MOL number format: 7 digits
  const pattern = /^\d{7}$/;
  if (!pattern.test(molNumber)) {
    return { valid: false, error: 'Invalid MOL number format (expected: 7 digits)' };
  }

  return { valid: true, molNumber };
}

/**
 * Validate UAE IBAN
 */
function validateUAIIBAN(iban) {
  if (!iban) {
    return { valid: false, error: 'IBAN is required' };
  }

  const cleanIBAN = iban.replace(/\s/g, '').toUpperCase();

  // UAE IBAN: AE + 2 digits + 3 zeros + 16 digits = 23 characters
  if (cleanIBAN.length !== 23) {
    return { valid: false, error: 'UAE IBAN must be 23 characters' };
  }

  if (!cleanIBAN.startsWith('AE')) {
    return { valid: false, error: 'IBAN must start with AE' };
  }

  const numericPart = 'AE' + cleanIBAN.substring(2).replace(/[A-Z]/g, (char) => char.charCodeAt(0) - 55);
  const isValid = BigInt(numericPart) % 97n === 1n;

  if (!isValid) {
    return { valid: false, error: 'Invalid IBAN checksum' };
  }

  return {
    valid: true,
    iban: cleanIBAN,
    bankCode: cleanIBAN.substring(5, 8),
    accountNumber: cleanIBAN.substring(8)
  };
}

/**
 * Generate MOL WPS file format
 */
function generateMOLFile(paymentData) {
  const { company, employees, month, year, batchNumber } = paymentData;

  // MOL WPS file format - fixed width format
  const records = [];
  let totalAmount = 0;

  for (const emp of employees) {
    const amount = parseFloat(emp.salary);
    totalAmount += amount;

    const record = {
      recordType: 'D', // Detail record
      companyEstablishmentNumber: company.establishmentCard.padEnd(15),
      companyMOLNumber: company.molNumber.padEnd(7),
      companyName: company.name.substring(0, 50).padEnd(50),
      employeeSequence: emp.sequence.toString().padStart(6, '0'),
      employeeFileNumber: (emp.fileNumber || '').substring(0, 15).padEnd(15),
      employeeName: emp.name.substring(0, 50).padEnd(50),
      employeeBankCode: emp.bankCode.padEnd(4),
      employeeAccountNumber: emp.accountNumber.padEnd(19),
      salaryAmount: Math.round(amount * 100).toString().padStart(15, '0'),
      allowanceAmount: Math.round((emp.allowances || 0) * 100).toString().padStart(13, '0'),
      deductionsAmount: Math.round((emp.deductions || 0) * 100).toString().padStart(13, '0'),
      netAmount: Math.round(amount * 100).toString().padStart(15, '0'),
      paymentMonth: month.toString().padStart(2, '0'),
      paymentYear: year.toString(),
      filler: ''.padEnd(30)
    };

    records.push(record);
  }

  const headerRecord = {
    recordType: 'H',
    fileReferenceNumber: `WPS${year}${month}${batchNumber.toString().padStart(4, '0')}`,
    companyEstablishmentNumber: company.establishmentCard.padEnd(15),
    companyMOLNumber: company.molNumber.padEnd(7),
    companyName: company.name.substring(0, 50).padEnd(50),
    totalRecords: records.length.toString().padStart(8, '0'),
    totalAmount: Math.round(totalAmount * 100).toString().padStart(17, '0'),
    creationDate: new Date().toISOString().split('T')[0].replace(/-/g, ''),
    filler: ''.padEnd(53)
  };

  const trailerRecord = {
    recordType: 'T',
    totalRecords: records.length.toString().padStart(8, '0'),
    totalAmount: Math.round(totalAmount * 100).toString().padStart(17, '0'),
    hashTotal: records.reduce((sum, r) => sum + parseInt(r.salaryAmount), 0).toString().padStart(18, '0'),
    filler: ''.padEnd(87)
  };

  return { header: headerRecord, records, trailer: trailerRecord, totalAmount };
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
    service: 'REZ-wps-service',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/banks - List WPS participating banks
 */
APP.get('/api/banks', (req, res) => {
  res.json({ count: WPS_BANKS.length, banks: WPS_BANKS });
});

/**
 * POST /api/validate/iban - Validate UAE IBAN
 */
APP.post('/api/validate/iban', (req, res) => {
  const { iban } = req.body;

  if (!iban) {
    return res.status(400).json({ error: 'IBAN is required' });
  }

  const result = validateUAIIBAN(iban);
  logger.info(`UAE IBAN validation: ${iban} - ${result.valid ? 'valid' : result.error}`);
  res.json(result);
});

/**
 * POST /api/validate/establishment - Validate establishment card
 */
APP.post('/api/validate/establishment', (req, res) => {
  const { establishmentCard } = req.body;

  if (!establishmentCard) {
    return res.status(400).json({ error: 'Establishment card is required' });
  }

  const result = validateEstablishmentCard(establishmentCard);
  res.json(result);
});

/**
 * POST /api/validate/mol - Validate MOL number
 */
APP.post('/api/validate/mol', (req, res) => {
  const { molNumber } = req.body;

  if (!molNumber) {
    return res.status(400).json({ error: 'MOL number is required' });
  }

  const result = validateMOLNumber(molNumber);
  res.json(result);
});

/**
 * POST /api/companies - Register company
 */
APP.post('/api/companies', (req, res) => {
  const { name, establishmentCard, molNumber, bankCode, bankAccount, tradeLicense } = req.body;

  if (!name || !establishmentCard || !molNumber) {
    return res.status(400).json({ error: 'Missing required fields: name, establishmentCard, molNumber' });
  }

  const estValidation = validateEstablishmentCard(establishmentCard);
  const molValidation = validateMOLNumber(molNumber);

  if (!estValidation.valid || !molValidation.valid) {
    return res.status(400).json({
      error: 'Validation failed',
      establishmentCard: estValidation,
      molNumber: molValidation
    });
  }

  const companyId = `WPS-CO-${uuidv4().substring(0, 8).toUpperCase()}`;
  const company = {
    id: companyId,
    name,
    establishmentCard: estValidation.establishmentCard,
    molNumber: molValidation.molNumber,
    bankCode: bankCode || null,
    bankAccount: bankAccount || null,
    tradeLicense: tradeLicense || null,
    status: 'registered',
    registeredAt: new Date().toISOString()
  };

  companies.set(companyId, company);
  logger.info(`Company registered: ${companyId} - ${name}`);
  res.status(201).json(company);
});

/**
 * GET /api/companies - List companies
 */
APP.get('/api/companies', (req, res) => {
  const companyList = Array.from(companies.values());
  res.json({ count: companyList.length, companies: companyList });
});

/**
 * POST /api/employees - Register employee
 */
APP.post('/api/employees', (req, res) => {
  const { companyId, name, fileNumber, bankCode, accountNumber, basicSalary, allowances = 0 } = req.body;

  if (!companyId || !name || !bankCode || !accountNumber) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const ibanValidation = validateUAIIBAN(`AE00${bankCode}${accountNumber}`);
  if (!ibanValidation.valid) {
    return res.status(400).json({ error: 'Invalid bank account', details: ibanValidation });
  }

  // Check employee count for sequence
  const companyEmployees = Array.from(employees.values()).filter(e => e.companyId === companyId);
  const sequence = companyEmployees.length + 1;

  const employeeId = `WPS-EMP-${uuidv4().substring(0, 8).toUpperCase()}`;
  const employee = {
    id: employeeId,
    companyId,
    sequence,
    name,
    fileNumber: fileNumber || null,
    bankCode,
    accountNumber,
    basicSalary: parseFloat(basicSalary) || 0,
    allowances,
    status: 'active',
    registeredAt: new Date().toISOString()
  };

  employees.set(employeeId, employee);
  logger.info(`Employee registered: ${employeeId} for company ${companyId}`);
  res.status(201).json(employee);
});

/**
 * GET /api/employees - List employees
 */
APP.get('/api/employees', (req, res) => {
  const { companyId } = req.query;
  let employeeList = Array.from(employees.values());

  if (companyId) {
    employeeList = employeeList.filter(e => e.companyId === companyId);
  }

  res.json({ count: employeeList.length, employees: employeeList });
});

/**
 * POST /api/salary/file - Generate MOL WPS file
 */
APP.post('/api/salary/file', (req, res) => {
  const { companyId, month, year, employees: employeeIds, batchNumber = 1 } = req.body;

  if (!companyId || !month || !year || !employeeIds || employeeIds.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const company = companies.get(companyId);
  if (!company) {
    return res.status(404).json({ error: 'Company not found' });
  }

  const employeeList = employeeIds.map(id => employees.get(id)).filter(e => e);
  if (employeeList.length === 0) {
    return res.status(400).json({ error: 'No valid employees found' });
  }

  const molFile = generateMOLFile({
    company,
    employees: employeeList,
    month,
    year,
    batchNumber
  });

  const fileId = `WPS-FILE-${year}${month.toString().padStart(2, '0')}-${batchNumber.toString().padStart(4, '0')}`;
  const submission = {
    id: fileId,
    companyId,
    month,
    year,
    batchNumber,
    employeeCount: employeeList.length,
    totalAmount: molFile.totalAmount,
    currency: 'AED',
    status: 'generated',
    fileContent: molFile,
    createdAt: new Date().toISOString()
  };

  MOLFileSubmissions.set(fileId, submission);
  logger.info(`WPS file generated: ${fileId} - ${employeeList.length} employees, ${molFile.totalAmount} AED`);

  res.status(201).json({
    fileId,
    employeeCount: employeeList.length,
    totalAmount: molFile.totalAmount,
    currency: 'AED',
    recordCount: molFile.records.length,
    preview: {
      header: molFile.header,
      detailCount: molFile.records.length,
      trailer: molFile.trailer
    }
  });
});

/**
 * GET /api/salary/files - List WPS file submissions
 */
APP.get('/api/salary/files', (req, res) => {
  const { companyId, month, year, status } = req.query;
  let files = Array.from(MOLFileSubmissions.values());

  if (companyId) files = files.filter(f => f.companyId === companyId);
  if (month) files = files.filter(f => f.month === parseInt(month));
  if (year) files = files.filter(f => f.year === parseInt(year));
  if (status) files = files.filter(f => f.status === status);

  res.json({ count: files.length, files });
});

/**
 * GET /api/salary/files/:fileId - Get WPS file details
 */
APP.get('/api/salary/files/:fileId', (req, res) => {
  const { fileId } = req.params;
  const file = MOLFileSubmissions.get(fileId);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  res.json(file);
});

/**
 * PATCH /api/salary/files/:fileId/status - Update file status
 */
APP.patch('/api/salary/files/:fileId/status', (req, res) => {
  const { fileId } = req.params;
  const { status } = req.body;

  const file = MOLFileSubmissions.get(fileId);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const validStatuses = ['generated', 'submitted', 'processing', 'completed', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` });
  }

  file.status = status;
  file.updatedAt = new Date().toISOString();
  MOLFileSubmissions.set(fileId, file);

  logger.info(`WPS file ${fileId} status updated to ${status}`);
  res.json(file);
});

/**
 * POST /api/payments - Record salary payment
 */
APP.post('/api/payments', (req, res) => {
  const { companyId, employeeId, amount, month, year, reference } = req.body;

  if (!companyId || !employeeId || !amount || !month || !year) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const employee = employees.get(employeeId);
  if (!employee) {
    return res.status(404).json({ error: 'Employee not found' });
  }

  const paymentId = `WPS-PAY-${uuidv4().substring(0, 8).toUpperCase()}`;
  const payment = {
    id: paymentId,
    companyId,
    employeeId,
    amount: parseFloat(amount),
    currency: 'AED',
    month,
    year,
    reference,
    status: 'completed',
    paidAt: new Date().toISOString()
  };

  salaryPayments.set(paymentId, payment);
  logger.info(`Salary payment recorded: ${paymentId} - ${amount} AED to ${employeeId}`);
  res.status(201).json(payment);
});

/**
 * GET /api/payments - List salary payments
 */
APP.get('/api/payments', (req, res) => {
  const { companyId, employeeId, month, year } = req.query;
  let payments = Array.from(salaryPayments.values());

  if (companyId) payments = payments.filter(p => p.companyId === companyId);
  if (employeeId) payments = payments.filter(p => p.employeeId === employeeId);
  if (month) payments = payments.filter(p => p.month === parseInt(month));
  if (year) payments = payments.filter(p => p.year === parseInt(year));

  res.json({ count: payments.length, payments });
});

// Error handling
APP.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
APP.listen(PORT, () => {
  logger.info(`REZ WPS Service running on port ${PORT}`);
  logger.info('UAE Wage Protection System compliance support');
});

module.exports = APP;
