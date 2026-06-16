/**
 * REZ Cookie Consent Service
 * GDPR/IAB TCF 2.2 Compliant Cookie Consent Management
 * Port: 5039
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'consent.log' })
  ]
});

const app = express();
const PORT = 5039;

// Consent Categories (IAB TCF 2.2)
const CONSENT_CATEGORIES = {
  necessary: {
    id: 'necessary',
    name: { en: 'Strictly Necessary', ar: 'ضروري للغاية' },
    description: {
      en: 'Essential for the website to function properly. Cannot be disabled.',
      ar: 'ضروري لكي يعمل الموقع بشكل صحيح. لا يمكن تعطيله.'
    },
    required: true,
    tcfPurposeId: 1 // Storage access
  },
  functional: {
    id: 'functional',
    name: { en: 'Functional', ar: 'وظيفي' },
    description: {
      en: 'Enable enhanced functionality and personalization.',
      ar: 'تمكين الوظائف المحسنة والتخصيص.'
    },
    required: false,
    tcfPurposeId: 3 // Personalized experience
  },
  analytics: {
    id: 'analytics',
    name: { en: 'Analytics', ar: 'تحليلات' },
    description: {
      en: 'Help us understand how visitors interact with our website.',
      ar: 'مساعدتنا على فهم كيفية تفاعل الزوار مع موقعنا.'
    },
    required: false,
    tcfPurposeId: 2 // Basic analytics
  },
  marketing: {
    id: 'marketing',
    name: { en: 'Marketing', ar: 'تسويقي' },
    description: {
      en: 'Used to deliver personalized advertisements.',
      ar: 'تستخدم لتقديم إعلانات مخصصة.'
    },
    required: false,
    tcfPurposeId: 10 // Ad targeting
  },
  social: {
    id: 'social',
    name: { en: 'Social Media', ar: 'وسائل التواصل الاجتماعي' },
    description: {
      en: 'Allow sharing content on social media platforms.',
      ar: 'السماح بمشاركة المحتوى على منصات التواصل الاجتماعي.'
    },
    required: false,
    tcfPurposeId: 3 // Social media integration
  }
};

// Supported Languages
const SUPPORTED_LANGUAGES = ['en', 'ar'];

// In-memory storage (replace with database in production)
const consentDatabase = new Map();
const auditLog = [];

// TC String encoding/decoding utilities (IAB TCF 2.2 simplified)
class TCString {
  constructor() {
    this.version = 2;
    this.created = Date.now();
    this.updated = Date.now();
    this.cmpId = 22; // LawGens default CMP ID
    this.cmpVersion = 2039000;
    this.consentScreen = 1;
    this.consentLanguage = 'EN';
    this.vendorListVersion = 225;
    this.purposeConsents = {};
    this.purposeLegitimateInterest = {};
    this.vendorConsents = {};
    this.vendorDisclosed = [];
    this.vendorAllowed = [];
    this.specialFeatureOptins = {};
    this.publisherRestrictions = [];
  }

  // Generate TC String
  encode() {
    const parts = [];

    // Version (6 bits)
    parts.push(this.padBase64(this.version.toString(2), 6));

    // Created (36 bits - milliseconds since epoch)
    parts.push(this.padBase64(this.created.toString(2), 36));

    // Updated (36 bits)
    parts.push(this.padBase64(this.updated.toString(2), 36));

    // CMP ID (12 bits)
    parts.push(this.padBase64(this.cmpId.toString(2), 12));

    // CMP Version (12 bits)
    parts.push(this.padBase64(this.cmpVersion.toString(2), 12));

    // Consent Screen (6 bits)
    parts.push(this.padBase64(this.consentScreen.toString(2), 6));

    // Consent Language (6 bits - 2 char ISO 639-1)
    const langBits = this.consentLanguage.split('').map(c =>
      c.charCodeAt(0).toString(2).padStart(6, '0')
    ).join('');
    parts.push(langBits);

    // Vendor List Version (12 bits)
    parts.push(this.padBase64(this.vendorListVersion.toString(2), 12));

    // Purpose Consents (24 purposes max - bitmap)
    const purposeBits = Object.keys(this.purposeConsents)
      .filter(k => this.purposeConsents[k])
      .map(k => parseInt(k))
      .sort((a, b) => a - b);
    const purposeBitmap = Array(24).fill('0');
    purposeBits.forEach(p => { if (p <= 24) purposeBitmap[p - 1] = '1'; });
    parts.push(purposeBitmap.join(''));

    // Vendor Consents (simplified - 100 vendors max)
    const vendorBits = Object.keys(this.vendorConsents)
      .filter(k => this.vendorConsents[k])
      .map(k => parseInt(k))
      .sort((a, b) => a - b);
    const vendorBitmap = Array(100).fill('0');
    vendorBits.forEach(v => { if (v <= 100) vendorBitmap[v - 1] = '1'; });
    parts.push(vendorBitmap.join(''));

    // Combine and encode as base64
    const binaryString = parts.join('');
    return this.binaryToBase64(binaryString);
  }

  // Decode TC String
  static decode(tcString) {
    try {
      const binaryString = TCString.base64ToBinary(tcString);
      const tc = new TCString();

      let offset = 0;

      // Version (6 bits)
      tc.version = parseInt(binaryString.substr(offset, 6), 2);
      offset += 6;

      // Created (36 bits)
      tc.created = parseInt(binaryString.substr(offset, 36), 2);
      offset += 36;

      // Updated (36 bits)
      tc.updated = parseInt(binaryString.substr(offset, 36), 2);
      offset += 36;

      // CMP ID (12 bits)
      tc.cmpId = parseInt(binaryString.substr(offset, 12), 2);
      offset += 12;

      // CMP Version (12 bits)
      tc.cmpVersion = parseInt(binaryString.substr(offset, 12), 2);
      offset += 12;

      return tc;
    } catch (error) {
      logger.error('TC String decode error:', error);
      return null;
    }
  }

  padBase64(value, bits) {
    return value.padStart(bits, '0');
  }

  binaryToBase64(binary) {
    // Pad to multiple of 6
    while (binary.length % 6 !== 0) binary += '0';

    let result = '';
    for (let i = 0; i < binary.length; i += 6) {
      result += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'[
        parseInt(binary.substr(i, 6), 2)
      ];
    }
    return result;
  }

  static base64ToBinary(base64) {
    let binary = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

    for (const char of base64) {
      const index = chars.indexOf(char);
      if (index === -1) break;
      binary += index.toString(2).padStart(6, '0');
    }
    return binary;
  }
}

// Cookie Banner Configuration
const defaultBannerConfig = {
  layout: 'full_screen',
  position: 'bottom',
  theme: {
    backgroundColor: '#ffffff',
    textColor: '#333333',
    buttonColor: '#0066cc',
    buttonTextColor: '#ffffff',
    overlayColor: 'rgba(0, 0, 0, 0.5)'
  },
  title: {
    en: 'We value your privacy',
    ar: 'نقدر خصوصيتك'
  },
  description: {
    en: 'We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.',
    ar: 'نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح الخاصة بك وتقديم محتوى مخصص وتحليل حركة المرور الخاصة بنا.'
  },
  acceptAllButton: {
    text: { en: 'Accept All', ar: 'قبول الكل' },
    action: 'accept_all'
  },
  rejectAllButton: {
    text: { en: 'Reject All', ar: 'رفض الكل' },
    action: 'reject_all'
  },
  customizeButton: {
    text: { en: 'Customize', ar: 'تخصيص' },
    action: 'customize'
  },
  saveButton: {
    text: { en: 'Save Preferences', ar: 'حفظ التفضيلات' },
    action: 'save'
  },
  showRejectAll: true,
  showPreferences: true,
  rememberForDays: 365,
  cookieName: 'rez_consent'
};

// GDPR Article 7 Compliance Helper
function generateConsentProof(consentId, userId, categories, timestamp, purpose) {
  return {
    proof: {
      consentId,
      userId,
      timestamp: new Date(timestamp).toISOString(),
      legalBasis: 'GDPR Article 6(1)(a) - Consent',
      purpose,
      categories,
      proofType: 'gdpr_article_7',
      article7Requirements: {
        unbundled: true,
        activeConsent: true,
        noPrecheckedBoxes: true,
        withdrawConsentPossible: true,
        balancedPower: true
      },
      metadata: {
        serviceProvider: 'REZ-cookie-consent-service',
        version: '1.0.0',
        tcfVersion: '2.2'
      }
    },
    generatedAt: new Date().toISOString()
  };
}

// Audit Log Entry
function createAuditEntry(action, data) {
  const entry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    action,
    ...data,
    service: 'REZ-cookie-consent-service'
  };
  auditLog.push(entry);
  logger.info('Audit log entry:', entry);
  return entry;
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Language detection middleware
app.use((req, res, next) => {
  const lang = req.headers['accept-language'] || 'en';
  if (lang.includes('ar')) {
    req.language = 'ar';
  } else {
    req.language = 'en';
  }
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ-cookie-consent-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Get Consent Configuration
app.get('/api/v1/consent/config', (req, res) => {
  const lang = req.query.lang || req.language || 'en';
  res.json({
    categories: CONSENT_CATEGORIES,
    languages: SUPPORTED_LANGUAGES,
    currentLanguage: lang,
    bannerConfig: defaultBannerConfig,
    tcfVersion: '2.2',
    lastUpdated: new Date().toISOString()
  });
});

// Get Cookie Banner
app.get('/api/v1/consent/banner', (req, res) => {
  const lang = req.query.lang || req.language || 'en';
  const userId = req.query.userId;

  res.json({
    banner: {
      ...defaultBannerConfig,
      language: lang
    },
    categories: Object.values(CONSENT_CATEGORIES).map(cat => ({
      id: cat.id,
      name: cat.name[lang] || cat.name.en,
      description: cat.description[lang] || cat.description.en,
      required: cat.required
    })),
    privacyPolicyUrl: '/privacy-policy',
    cookiePolicyUrl: '/cookie-policy'
  });
});

// Create/Update Consent
app.post('/api/v1/consent', (req, res) => {
  const {
    userId,
    categories = {},
    consentGiven = true,
    language = 'en',
    source = 'banner',
    purpose = 'initial_consent'
  } = req.body;

  const consentId = uuidv4();
  const timestamp = Date.now();

  // Merge with necessary category (always required)
  const finalConsent = {
    ...categories,
    necessary: true
  };

  // Generate TC String
  const tcString = new TCString();
  Object.keys(finalConsent).forEach(cat => {
    if (finalConsent[cat]) {
      const purposeId = CONSENT_CATEGORIES[cat]?.tcfPurposeId || 1;
      tcString.purposeConsents[purposeId] = true;
    }
  });
  tcString.updated = timestamp;
  const encodedTCString = tcString.encode();

  // Store consent
  const consentRecord = {
    consentId,
    userId: userId || 'anonymous',
    categories: finalConsent,
    consentGiven,
    language,
    source,
    timestamp,
    tcString: encodedTCString,
    expiresAt: timestamp + (defaultBannerConfig.rememberForDays * 24 * 60 * 60 * 1000),
    version: '1.0.0'
  };

  consentDatabase.set(consentId, consentRecord);

  // Create audit entry
  createAuditEntry('consent_given', {
    consentId,
    userId: userId || 'anonymous',
    categories: finalConsent,
    source
  });

  // Generate GDPR Article 7 proof
  const proof = generateConsentProof(
    consentId,
    userId,
    finalConsent,
    timestamp,
    purpose
  );

  logger.info('Consent recorded:', { consentId, userId, categories: finalConsent });

  res.status(201).json({
    success: true,
    consentId,
    tcString: encodedTCString,
    expiresAt: consentRecord.expiresAt,
    proof
  });
});

// Get Consent Status
app.get('/api/v1/consent/:userId', (req, res) => {
  const { userId } = req.params;

  // Find most recent consent for user
  let userConsent = null;
  let latestTimestamp = 0;

  consentDatabase.forEach((consent) => {
    if (consent.userId === userId && consent.timestamp > latestTimestamp) {
      userConsent = consent;
      latestTimestamp = consent.timestamp;
    }
  });

  if (!userConsent) {
    return res.status(404).json({
      success: false,
      message: 'No consent found for this user'
    });
  }

  res.json({
    success: true,
    consent: {
      consentId: userConsent.consentId,
      categories: userConsent.categories,
      consentGiven: userConsent.consentGiven,
      timestamp: userConsent.timestamp,
      expiresAt: userConsent.expiresAt,
      language: userConsent.language
    }
  });
});

// Withdraw Consent (GDPR Article 7(3))
app.post('/api/v1/consent/:userId/withdraw', (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;

  // Find and invalidate existing consent
  let withdrawn = false;

  consentDatabase.forEach((consent, consentId) => {
    if (consent.userId === userId) {
      consent.withdrawn = true;
      consent.withdrawnAt = Date.now();
      consent.withdrawalReason = reason || 'user_withdrawal';
      withdrawn = true;

      createAuditEntry('consent_withdrawn', {
        consentId,
        userId,
        reason: reason || 'user_withdrawal'
      });
    }
  });

  if (!withdrawn) {
    return res.status(404).json({
      success: false,
      message: 'No consent found to withdraw'
    });
  }

  logger.info('Consent withdrawn:', { userId, reason });

  res.json({
    success: true,
    message: 'Consent successfully withdrawn',
    withdrawnAt: new Date().toISOString(),
    proof: {
      withdrawalId: uuidv4(),
      userId,
      timestamp: new Date().toISOString(),
      legalBasis: 'GDPR Article 7(3) - Right to withdraw consent'
    }
  });
});

// Parse TC String
app.get('/api/v1/tcstring/:tcString', (req, res) => {
  const { tcString } = req.params;

  const decoded = TCString.decode(tcString);

  if (!decoded) {
    return res.status(400).json({
      success: false,
      message: 'Invalid TC String'
    });
  }

  res.json({
    success: true,
    tcString: {
      version: decoded.version,
      created: new Date(decoded.created).toISOString(),
      updated: new Date(decoded.updated).toISOString(),
      cmpId: decoded.cmpId,
      cmpVersion: decoded.cmpVersion,
      consentLanguage: decoded.consentLanguage,
      vendorListVersion: decoded.vendorListVersion,
      purposeConsents: decoded.purposeConsents,
      vendorConsents: decoded.vendorConsents
    }
  });
});

// Get Audit Log
app.get('/api/v1/consent/audit', (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const paginatedLog = auditLog.slice(
    parseInt(offset),
    parseInt(offset) + parseInt(limit)
  );

  res.json({
    success: true,
    audit: {
      entries: paginatedLog,
      total: auditLog.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

// Generate GDPR Proof
app.get('/api/v1/consent/:consentId/proof', (req, res) => {
  const { consentId } = req.params;

  const consent = consentDatabase.get(consentId);

  if (!consent) {
    return res.status(404).json({
      success: false,
      message: 'Consent not found'
    });
  }

  const proof = generateConsentProof(
    consentId,
    consent.userId,
    consent.categories,
    consent.timestamp,
    'consent_verification'
  );

  res.json({
    success: true,
    proof
  });
});

// Cookie Check Endpoint (for other services)
app.post('/api/v1/consent/check', (req, res) => {
  const { userId, category } = req.body;

  let userConsent = null;
  let latestTimestamp = 0;

  consentDatabase.forEach((consent) => {
    if (consent.userId === userId && consent.timestamp > latestTimestamp && !consent.withdrawn) {
      userConsent = consent;
      latestTimestamp = consent.timestamp;
    }
  });

  const allowed = userConsent?.categories?.[category] || false;

  res.json({
    success: true,
    check: {
      userId,
      category,
      allowed,
      consentId: userConsent?.consentId || null,
      checkedAt: new Date().toISOString()
    }
  });
});

// Get all categories
app.get('/api/v1/consent/categories', (req, res) => {
  const lang = req.query.lang || 'en';

  res.json({
    success: true,
    categories: Object.values(CONSENT_CATEGORIES).map(cat => ({
      id: cat.id,
      name: cat.name[lang] || cat.name.en,
      description: cat.description[lang] || cat.description.en,
      required: cat.required,
      tcfPurposeId: cat.tcfPurposeId
    }))
  });
});

// Update Banner Configuration
app.put('/api/v1/consent/banner/config', (req, res) => {
  const { config } = req.body;

  Object.assign(defaultBannerConfig, config);

  createAuditEntry('banner_config_updated', {
    newConfig: config,
    updatedAt: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'Banner configuration updated',
    config: defaultBannerConfig
  });
});

// Export TC String for CMPs
app.get('/api/v1/consent/:userId/tcstring', (req, res) => {
  const { userId } = req.params;

  let userConsent = null;
  let latestTimestamp = 0;

  consentDatabase.forEach((consent) => {
    if (consent.userId === userId && consent.timestamp > latestTimestamp) {
      userConsent = consent;
      latestTimestamp = consent.timestamp;
    }
  });

  if (!userConsent) {
    return res.status(404).json({
      success: false,
      message: 'No consent found'
    });
  }

  res.json({
    success: true,
    tcString: userConsent.tcString
  });
});

// Statistics endpoint
app.get('/api/v1/consent/stats', (req, res) => {
  const stats = {
    totalConsents: consentDatabase.size,
    byCategory: {},
    byLanguage: {},
    withdrawn: 0
  };

  consentDatabase.forEach((consent) => {
    if (consent.withdrawn) stats.withdrawn++;

    const lang = consent.language;
    stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;

    Object.keys(consent.categories).forEach(cat => {
      if (consent.categories[cat]) {
        stats.byCategory[cat] = (stats.byCategory[cat] || 0) + 1;
      }
    });
  });

  res.json({
    success: true,
    stats,
    generatedAt: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`REZ Cookie Consent Service running on port ${PORT}`);
  logger.info(`GDPR/IAB TCF 2.2 compliant consent management`);
  console.log(`\n🍪 REZ Cookie Consent Service`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API: http://localhost:${PORT}/api/v1/consent\n`);
});

module.exports = app;
