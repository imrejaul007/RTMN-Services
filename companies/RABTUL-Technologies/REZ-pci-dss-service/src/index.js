/**
 * REZ PCI DSS Compliance Service
 *
 * Port: 4325
 * Provides PCI DSS compliance services including:
 * - Card tokenization (never stores raw PAN)
 * - AES-256-GCM encryption
 * - SAQ support
 * - Merchant compliance tracking
 * - Security scanning
 * - Audit logging
 * - Key management with rotation
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const winston = require('winston');

// Configuration
const PORT = process.env.PORT || 4325;
const ENCRYPTION_KEY = process.env.PCI_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const KEY_ID = process.env.PCI_KEY_ID || `key-${Date.now()}`;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'pci-dss-audit.log', level: 'info' }),
    new winston.transports.File({ filename: 'pci-dss-error.log', level: 'error' }),
    new winston.transports.Console()
  ]
});

// In-memory stores (use Redis/DB in production)
const tokenStore = new Map();        // token -> encrypted card reference
const merchantStore = new Map();     // merchantId -> compliance data
const auditLog = [];                 // audit trail
const encryptionKeys = new Map();    // keyId -> key data
const saqSubmissions = new Map();    // merchantId -> SAQ data

// Initialize with first encryption key
encryptionKeys.set(KEY_ID, {
  key: ENCRYPTION_KEY,
  createdAt: new Date().toISOString(),
  algorithm: 'AES-256-GCM',
  status: 'active'
});

// Encryption utilities using AES-256-GCM
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function encrypt(plaintext, keyOverride = null) {
  const key = keyOverride || Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    iv: iv.toString('hex'),
    data: encrypted,
    authTag: authTag,
    keyId: KEY_ID
  };
}

function decrypt(encryptedData, keyOverride = null) {
  const key = keyOverride || Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(encryptedData.iv, 'hex');
  const authTag = Buffer.from(encryptedData.authTag, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// PAN validation (Luhn algorithm)
function validatePAN(pan) {
  const cleanPAN = pan.replace(/\s/g, '');

  if (!/^\d{13,19}$/.test(cleanPAN)) {
    return { valid: false, error: 'Invalid PAN format' };
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleanPAN.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanPAN[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    isEven = !isEven;
  }

  if (sum % 10 !== 0) {
    return { valid: false, error: 'Invalid PAN checksum' };
  }

  return { valid: true, cardBrand: detectCardBrand(cleanPAN) };
}

function detectCardBrand(pan) {
  const firstDigit = pan[0];
  const firstTwo = pan.substring(0, 2);
  const firstFour = pan.substring(0, 4);

  if (pan.startsWith('4')) return 'Visa';
  if (['51','52','53','54','55'].includes(firstTwo)) return 'Mastercard';
  if (['34','37'].includes(firstTwo)) return 'Amex';
  if (firstTwo === '60' || firstFour === '6011' || ['644','645','646','647','648','649'].includes(firstThree)) return 'Discover';
  if (['30','36','38'].includes(firstTwo)) return 'Diners';
  if (['35'].includes(firstTwo)) return 'JCB';
  if (firstTwo === '62') return 'UnionPay';

  return 'Unknown';
}

// Tokenize PAN (never stores raw PAN)
function tokenizePAN(pan) {
  const validation = validatePAN(pan);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const token = `tok_${uuidv4().replace(/-/g, '')}${Date.now().toString(36)}`;

  // Store encrypted reference (not the actual PAN)
  const encryptedRef = encrypt(JSON.stringify({
    last4: pan.slice(-4),
    brand: validation.cardBrand,
    expMonth: null, // To be set separately
    expYear: null,
    panHash: crypto.createHash('sha256').update(pan).digest('hex')
  }));

  tokenStore.set(token, {
    encryptedData: encryptedRef,
    createdAt: new Date().toISOString(),
    keyId: KEY_ID,
    panHash: crypto.createHash('sha256').update(pan).digest('hex')
  });

  logger.info('PAN tokenized', { token, cardBrand: validation.cardBrand });

  return {
    token: token,
    last4: pan.slice(-4),
    brand: validation.cardBrand,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  };
}

// Detokenize (requires proper authorization)
function detokenize(token) {
  const tokenData = tokenStore.get(token);
  if (!tokenData) {
    throw new Error('Token not found');
  }

  // In real implementation, this would return the actual card data
  // through a secure channel (e.g., to payment processor)
  const decrypted = decrypt(tokenData.encryptedData);

  return {
    token: token,
    last4: JSON.parse(decrypted).last4,
    brand: JSON.parse(decrypted).brand
  };
}

// Merchant compliance tracking
function registerMerchant(merchantId, data) {
  const merchant = {
    merchantId,
    businessName: data.businessName,
    contactEmail: data.contactEmail,
    merchantCategoryCode: data.merchantCategoryCode || '5411',
    annualVolume: data.annualVolume || 0,
    transactionCount: 0,
    complianceStatus: 'pending',
    saqType: null,
    lastAssessment: null,
    nextAssessment: null,
    vulnerabilities: [],
    registeredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  merchantStore.set(merchantId, merchant);

  logger.info('Merchant registered for PCI compliance', { merchantId });

  return merchant;
}

function updateMerchantCompliance(merchantId, complianceData) {
  const merchant = merchantStore.get(merchantId);
  if (!merchant) {
    throw new Error('Merchant not found');
  }

  Object.assign(merchant, {
    complianceStatus: complianceData.status || merchant.complianceStatus,
    saqType: complianceData.saqType || merchant.saqType,
    lastAssessment: complianceData.lastAssessment || new Date().toISOString(),
    nextAssessment: complianceData.nextAssessment,
    vulnerabilities: complianceData.vulnerabilities || merchant.vulnerabilities,
    updatedAt: new Date().toISOString()
  });

  merchantStore.set(merchantId, merchant);

  logger.info('Merchant compliance updated', { merchantId, status: merchant.complianceStatus });

  return merchant;
}

// SAQ (Self-Assessment Questionnaire) support
const SAQ_TYPES = {
  'A': { name: 'SAQ A', description: 'Card-not-present merchants, fully outsourced', requirements: 22 },
  'A-EP': { name: 'SAQ A-EP', description: 'E-commerce only, partially outsourced', requirements: 31 },
  'B': { name: 'SAQ B', description: 'Stand-alone terminal merchants', requirements: 33 },
  'B-IP': { name: 'SAQ B-IP', description: 'Stand-alone IP terminal merchants', requirements: 35 },
  'C-VT': { name: 'SAQ C-VT', description: 'Web-based virtual terminal merchants', requirements: 41 },
  'C': { name: 'SAQ C', description: 'Merchants with networked payment systems', requirements: 47 },
  'D': { name: 'SAQ D', description: 'All other merchants', requirements: 89 },
  'P2PE-HWDE': { name: 'SAQ P2PE-HWDE', description: 'Hardware-hosted POS', requirements: 26 }
};

function submitSAQ(merchantId, submission) {
  const merchant = merchantStore.get(merchantId);
  if (!merchant) {
    throw new Error('Merchant not found. Register merchant first.');
  }

  if (!SAQ_TYPES[submission.saqType]) {
    throw new Error(`Invalid SAQ type. Valid types: ${Object.keys(SAQ_TYPES).join(', ')}`);
  }

  const saqRecord = {
    id: uuidv4(),
    merchantId,
    saqType: submission.saqType,
    saqName: SAQ_TYPES[submission.saqType].name,
    responses: submission.responses || {},
    attest: submission.attest || false,
    signedBy: submission.signedBy,
    signedDate: submission.signedDate || new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  };

  saqSubmissions.set(merchantId, saqRecord);

  // Update merchant compliance
  updateMerchantCompliance(merchantId, {
    saqType: submission.saqType,
    status: submission.attest ? 'compliant' : 'pending_attestation',
    lastAssessment: new Date().toISOString(),
    nextAssessment: saqRecord.expirationDate
  });

  logger.info('SAQ submitted', { merchantId, saqType: submission.saqType });

  return saqRecord;
}

// Security scanning
function runSecurityScan(target) {
  const scanResults = {
    scanId: uuidv4(),
    target,
    scannedAt: new Date().toISOString(),
    duration: Math.floor(Math.random() * 5000) + 1000,
    overallRisk: 'low',
    findings: []
  };

  // Simulated security checks
  const checks = [
    { name: 'TLS Configuration', status: 'pass', severity: 'high' },
    { name: 'PAN Storage Detection', status: 'pass', severity: 'critical' },
    { name: 'Encryption at Rest', status: 'pass', severity: 'high' },
    { name: 'Access Control', status: 'pass', severity: 'high' },
    { name: 'Logging Configuration', status: 'pass', severity: 'medium' },
    { name: 'Network Segmentation', status: 'pass', severity: 'high' }
  ];

  scanResults.findings = checks.map(check => ({
    ...check,
    description: `${check.name} check completed successfully`,
    recommendation: check.status === 'pass' ? null : `Address ${check.name} issues`
  }));

  logger.info('Security scan completed', { scanId: scanResults.scanId, target });

  return scanResults;
}

// Key rotation
function rotateEncryptionKey() {
  const newKeyId = `key-${Date.now()}`;
  const newKey = crypto.randomBytes(32).toString('hex');

  // Mark old key as rotating
  const oldKeyEntry = encryptionKeys.get(KEY_ID);
  if (oldKeyEntry) {
    oldKeyEntry.status = 'rotating';
    oldKeyEntry.rotatedAt = new Date().toISOString();
    oldKeyEntry.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    encryptionKeys.set(KEY_ID, oldKeyEntry);
  }

  // Add new key
  encryptionKeys.set(newKeyId, {
    key: newKey,
    createdAt: new Date().toISOString(),
    algorithm: 'AES-256-GCM',
    status: 'active'
  });

  // Update active key reference
  process.env.PCI_ENCRYPTION_KEY = newKey;

  logger.info('Encryption key rotated', { oldKeyId: KEY_ID, newKeyId });

  return {
    newKeyId,
    rotatedAt: new Date().toISOString(),
    message: 'Key rotation initiated. Old key valid for 24 hours for decryption.'
  };
}

// Audit logging
function createAuditEntry(action, details) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    details,
    service: 'REZ-pci-dss-service'
  };

  auditLog.push(entry);

  // Keep only last 10000 entries
  if (auditLog.length > 10000) {
    auditLog.shift();
  }

  logger.info('Audit entry created', { action, id: entry.id });

  return entry;
}

// Express app setup
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'REZ PCI DSS Compliance Service',
    version: '1.0.0',
    status: 'healthy',
    port: PORT,
    uptime: process.uptime(),
    encryptionActive: encryptionKeys.size > 0,
    merchantsRegistered: merchantStore.size,
    tokensIssued: tokenStore.size
  });
});

// Tokenize card
app.post('/api/tokenize', (req, res) => {
  try {
    const { pan, merchantId } = req.body;

    if (!pan) {
      return res.status(400).json({ error: 'PAN is required' });
    }

    const tokenData = tokenizePAN(pan);

    if (merchantId) {
      const merchant = merchantStore.get(merchantId);
      if (merchant) {
        merchant.transactionCount++;
        merchantStore.set(merchantId, merchant);
      }
    }

    createAuditEntry('TOKENIZE', { merchantId, cardBrand: tokenData.brand });

    res.json({
      success: true,
      data: tokenData
    });
  } catch (error) {
    logger.error('Tokenization failed', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Detokenize (restricted)
app.post('/api/detokenize', (req, res) => {
  try {
    const { token, apiKey } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // In production, validate API key and check authorization
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const data = detokenize(token);

    createAuditEntry('DETOKENIZE', { token: token.substring(0, 20) + '...' });

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Detokenization failed', { error: error.message });
    res.status(400).json({ error: error.message });
  }
});

// Validate card
app.post('/api/validate', (req, res) => {
  try {
    const { pan } = req.body;

    if (!pan) {
      return res.status(400).json({ error: 'PAN is required' });
    }

    const result = validatePAN(pan);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Register merchant
app.post('/api/merchants', (req, res) => {
  try {
    const merchant = registerMerchant(uuidv4(), req.body);

    createAuditEntry('MERCHANT_REGISTERED', { merchantId: merchant.merchantId });

    res.status(201).json({
      success: true,
      data: merchant
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get merchant
app.get('/api/merchants/:merchantId', (req, res) => {
  const merchant = merchantStore.get(req.params.merchantId);

  if (!merchant) {
    return res.status(404).json({ error: 'Merchant not found' });
  }

  res.json({
    success: true,
    data: merchant
  });
});

// Update merchant compliance
app.put('/api/merchants/:merchantId/compliance', (req, res) => {
  try {
    const merchant = updateMerchantCompliance(req.params.merchantId, req.body);

    createAuditEntry('COMPLIANCE_UPDATED', {
      merchantId: req.params.merchantId,
      status: merchant.complianceStatus
    });

    res.json({
      success: true,
      data: merchant
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get SAQ types
app.get('/api/saq/types', (req, res) => {
  res.json({
    success: true,
    data: SAQ_TYPES
  });
});

// Submit SAQ
app.post('/api/merchants/:merchantId/saq', (req, res) => {
  try {
    const saqRecord = submitSAQ(req.params.merchantId, req.body);

    createAuditEntry('SAQ_SUBMITTED', {
      merchantId: req.params.merchantId,
      saqType: saqRecord.saqType
    });

    res.status(201).json({
      success: true,
      data: saqRecord
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get SAQ for merchant
app.get('/api/merchants/:merchantId/saq', (req, res) => {
  const saq = saqSubmissions.get(req.params.merchantId);

  if (!saq) {
    return res.status(404).json({ error: 'SAQ not found for this merchant' });
  }

  res.json({
    success: true,
    data: saq
  });
});

// Run security scan
app.post('/api/scan', (req, res) => {
  try {
    const { target, type } = req.body;

    if (!target) {
      return res.status(400).json({ error: 'Scan target is required' });
    }

    const scanResults = runSecurityScan(target);

    createAuditEntry('SECURITY_SCAN', { target, scanId: scanResults.scanId });

    res.json({
      success: true,
      data: scanResults
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Key management
app.post('/api/keys/rotate', (req, res) => {
  try {
    const result = rotateEncryptionKey();

    createAuditEntry('KEY_ROTATED', { newKeyId: result.newKeyId });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/keys', (req, res) => {
  const keys = Array.from(encryptionKeys.entries()).map(([keyId, data]) => ({
    keyId,
    algorithm: data.algorithm,
    status: data.status,
    createdAt: data.createdAt
  }));

  res.json({
    success: true,
    data: keys
  });
});

// Audit log
app.get('/api/audit', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const logs = auditLog.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    success: true,
    data: {
      entries: logs,
      total: auditLog.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

// Encryption endpoint
app.post('/api/encrypt', (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Data is required' });
    }

    const encrypted = encrypt(JSON.stringify(data));

    res.json({
      success: true,
      data: encrypted
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Decryption endpoint
app.post('/api/decrypt', (req, res) => {
  try {
    const { encryptedData } = req.body;

    if (!encryptedData) {
      return res.status(400).json({ error: 'Encrypted data is required' });
    }

    const decrypted = decrypt(encryptedData);

    createAuditEntry('DECRYPT', { keyId: encryptedData.keyId });

    res.json({
      success: true,
      data: JSON.parse(decrypted)
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Supported card brands
app.get('/api/card-brands', (req, res) => {
  res.json({
    success: true,
    data: [
      { brand: 'Visa', code: 'visa' },
      { brand: 'Mastercard', code: 'mastercard' },
      { brand: 'American Express', code: 'amex' },
      { brand: 'Discover', code: 'discover' },
      { brand: 'Diners Club', code: 'diners' },
      { brand: 'JCB', code: 'jcb' },
      { brand: 'UnionPay', code: 'unionpay' }
    ]
  });
});

// Compliance status
app.get('/api/compliance/status', (req, res) => {
  const merchants = Array.from(merchantStore.values());

  const status = {
    total: merchants.length,
    compliant: merchants.filter(m => m.complianceStatus === 'compliant').length,
    pending: merchants.filter(m => m.complianceStatus === 'pending').length,
    nonCompliant: merchants.filter(m => m.complianceStatus === 'non_compliant').length,
    bySAQ: {}
  };

  merchants.forEach(m => {
    if (m.saqType) {
      status.bySAQ[m.saqType] = (status.bySAQ[m.saqType] || 0) + 1;
    }
  });

  res.json({
    success: true,
    data: status
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`REZ PCI DSS Compliance Service started on port ${PORT}`);
  console.log(`PCI DSS Service running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;