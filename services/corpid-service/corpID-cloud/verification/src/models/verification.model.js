/**
 * CorpID Cloud - Identity Verification Model
 * Automated verification services (email, phone, domain, business, employee)
 */

import { v4 as uuidv4 } from 'uuid';
import { generateOTP, generateToken, hashAPIKey } from '../../../shared/utils/security.js';

// ============ IN-MEMORY STORES ============

export const emailVerifications = new Map();   // token -> EmailVerification
export const phoneVerifications = new Map();   // phone -> PhoneVerification
export const domainVerifications = new Map();  // domain -> DomainVerification
export const businessVerifications = new Map(); // businessId -> BusinessVerification
export const employeeVerifications = new Map(); // employeeId -> EmployeeVerification

// ============ MODEL FACTORY ============

/**
 * Create email verification
 */
export function createEmailVerification(email, userId = null) {
  const token = generateToken(24);
  const now = new Date().toISOString();

  const verification = {
    id: `ev-${uuidv4().slice(0, 12)}`,
    email: email.toLowerCase(),
    token,
    userId,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    verifiedAt: null
  };

  emailVerifications.set(token, verification);
  return verification;
}

/**
 * Verify email token
 */
export function verifyEmailToken(token) {
  const verification = emailVerifications.get(token);
  if (!verification) return { success: false, error: 'Invalid token' };
  if (verification.status === 'verified') return { success: true, alreadyVerified: true };
  if (new Date(verification.expiresAt) < new Date()) {
    verification.status = 'expired';
    return { success: false, error: 'Token expired' };
  }

  verification.attempts++;
  if (verification.attempts > 5) {
    verification.status = 'invalid';
    return { success: false, error: 'Too many attempts' };
  }

  verification.status = 'verified';
  verification.verifiedAt = new Date().toISOString();
  emailVerifications.set(token, verification);

  return { success: true, verification };
}

/**
 * Create phone verification
 */
export function createPhoneVerification(phone, userId = null) {
  const otp = generateOTP(6);
  const now = new Date().toISOString();

  const verification = {
    id: `pv-${uuidv4().slice(0, 12)}`,
    phone,
    otp, // In production, would be hashed
    userId,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    verifiedAt: null
  };

  phoneVerifications.set(phone, verification);
  return verification;
}

/**
 * Verify phone OTP
 */
export function verifyPhoneOTP(phone, otp) {
  const verification = phoneVerifications.get(phone);
  if (!verification) return { success: false, error: 'No verification found' };
  if (verification.status === 'verified') return { success: true, alreadyVerified: true };
  if (new Date(verification.expiresAt) < new Date()) {
    verification.status = 'expired';
    return { success: false, error: 'OTP expired' };
  }

  verification.attempts++;
  if (verification.attempts > 3) {
    verification.status = 'invalid';
    return { success: false, error: 'Too many attempts' };
  }

  if (verification.otp !== otp) {
    return { success: false, error: 'Invalid OTP' };
  }

  verification.status = 'verified';
  verification.verifiedAt = new Date().toISOString();
  phoneVerifications.set(phone, verification);

  return { success: true, verification };
}

/**
 * Verify email format
 */
export function checkEmailFormat(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);

  // Check for disposable domains (simplified list)
  const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];
  const domain = email.split('@')[1]?.toLowerCase();
  const isDisposable = disposableDomains.includes(domain);

  // Check for role-based emails
  const rolePrefixes = ['admin', 'support', 'info', 'noreply', 'postmaster'];
  const localPart = email.split('@')[0]?.toLowerCase();
  const isRoleBased = rolePrefixes.includes(localPart);

  return {
    valid: isValid,
    email,
    domain,
    isDisposable,
    isRoleBased,
    suggestions: !isValid ? ['Email format is invalid'] :
                  isDisposable ? ['This appears to be a disposable email'] :
                  isRoleBased ? ['This is a role-based email address'] : []
  };
}

/**
 * Verify phone format
 */
export function checkPhoneFormat(phone) {
  const digits = phone.replace(/\D/g, '');

  // Determine country
  let country = null;
  let lineType = null;

  if (digits.startsWith('91') && digits.length === 12) {
    country = 'IN';
    lineType = 'mobile'; // Simplified
  } else if (digits.startsWith('1') && digits.length === 11) {
    country = 'US';
    lineType = 'mobile';
  } else if (digits.length >= 10 && digits.length <= 15) {
    country = 'unknown';
    lineType = 'unknown';
  }

  return {
    valid: digits.length >= 10 && digits.length <= 15,
    phone,
    formatted: `+${digits}`,
    country,
    lineType,
    carrier: null // Would require carrier lookup API
  };
}

/**
 * Create domain verification
 */
export function createDomainVerification(domain, organizationId, method = 'dns') {
  const token = generateToken(16);
  const now = new Date().toISOString();

  const verification = {
    id: `dv-${uuidv4().slice(0, 12)}`,
    domain: domain.toLowerCase(),
    organizationId,
    method, // dns, meta_tag, file
    token,
    status: 'pending',
    createdAt: now,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    verifiedAt: null,

    // Verification details
    dnsRecord: `_corpid-verify.${domain} TXT "${token}"`,
    metaTag: `<meta name="corpid-verification" content="${token}">`,
    filePath: `/.well-known/corpid-verify.txt`,
    fileContent: `corpid-verification=${token}`
  };

  domainVerifications.set(domain, verification);
  return verification;
}

/**
 * Check domain verification
 */
export function checkDomainVerification(domain, method, providedToken) {
  const verification = domainVerifications.get(domain);
  if (!verification) return { verified: false, error: 'No verification found' };
  if (verification.status === 'verified') return { verified: true, alreadyVerified: true };
  if (new Date(verification.expiresAt) < new Date()) {
    verification.status = 'expired';
    return { verified: false, error: 'Verification expired' };
  }
  if (verification.method !== method) {
    return { verified: false, error: 'Method mismatch' };
  }
  if (verification.token !== providedToken) {
    return { verified: false, error: 'Token mismatch' };
  }

  verification.status = 'verified';
  verification.verifiedAt = new Date().toISOString();
  domainVerifications.set(domain, verification);

  return { verified: true, verification };
}

/**
 * Create business verification
 */
export function createBusinessVerification(businessData) {
  const id = `bv-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const verification = {
    id,
    businessId: businessData.businessId,
    legalName: businessData.legalName,
    registrationNumber: businessData.registrationNumber,
    taxId: businessData.taxId,

    // Checks
    checks: {
      nameMatch: { status: 'pending', result: null },
      registration: { status: 'pending', result: null },
      address: { status: 'pending', result: null },
      tax: { status: 'pending', result: null },
      director: { status: 'pending', result: null }
    },

    // Overall
    status: 'pending',
    trustScore: 0,
    verifiedAt: null,

    createdAt: now,
    updatedAt: now
  };

  businessVerifications.set(id, verification);

  // Simulate checks
  setTimeout(() => {
    runBusinessChecks(id, businessData);
  }, 100);

  return verification;
}

/**
 * Run business checks
 */
function runBusinessChecks(verificationId, businessData) {
  const verification = businessVerifications.get(verificationId);
  if (!verification) return;

  // Simulate checks (in production, would call external APIs)
  verification.checks.nameMatch = {
    status: 'passed',
    result: { match: true, confidence: 0.95 }
  };
  verification.checks.registration = {
    status: 'passed',
    result: { registered: true, status: 'active' }
  };
  verification.checks.address = {
    status: 'passed',
    result: { verified: true }
  };
  verification.checks.tax = {
    status: 'passed',
    result: { valid: true, taxId: businessData.taxId }
  };
  verification.checks.director = {
    status: 'passed',
    result: { verified: true }
  };

  // Calculate trust score
  const passedChecks = Object.values(verification.checks).filter(c => c.status === 'passed').length;
  verification.trustScore = Math.round((passedChecks / 5) * 100);

  // Determine status
  if (verification.trustScore === 100) {
    verification.status = 'verified';
    verification.verifiedAt = new Date().toISOString();
  } else if (verification.trustScore >= 60) {
    verification.status = 'partially_verified';
  } else {
    verification.status = 'failed';
  }

  verification.updatedAt = new Date().toISOString();
  businessVerifications.set(verificationId, verification);
}

/**
 * Create employee verification
 */
export function createEmployeeVerification(data) {
  const id = `empv-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const verification = {
    id,
    userId: data.userId,
    employeeId: data.employeeId,
    organizationId: data.organizationId,
    email: data.email,
    workEmail: data.workEmail,

    // Checks
    checks: {
      emailDomain: { status: 'pending', result: null },
      department: { status: 'pending', result: null },
      title: { status: 'pending', result: null },
      manager: { status: 'pending', result: null }
    },

    status: 'pending',
    trustScore: 0,
    verifiedAt: null,

    createdAt: now,
    updatedAt: now
  };

  employeeVerifications.set(id, verification);

  // Run checks
  setTimeout(() => {
    runEmployeeChecks(id, data);
  }, 100);

  return verification;
}

/**
 * Run employee checks
 */
function runEmployeeChecks(verificationId, data) {
  const verification = employeeVerifications.get(verificationId);
  if (!verification) return;

  // Email domain check
  if (data.email && data.workEmail) {
    const emailDomain = data.email.split('@')[1];
    const workDomain = data.workEmail.split('@')[1];
    verification.checks.emailDomain = {
      status: emailDomain === workDomain ? 'passed' : 'manual_review',
      result: { personalDomain: emailDomain, workDomain }
    };
  }

  // Department check
  verification.checks.department = {
    status: data.department ? 'passed' : 'pending',
    result: { department: data.department }
  };

  // Title check
  verification.checks.title = {
    status: data.title ? 'passed' : 'pending',
    result: { title: data.title }
  };

  // Manager verification
  verification.checks.manager = {
    status: data.managerId ? 'passed' : 'pending',
    result: { managerId: data.managerId }
  };

  // Calculate trust score
  const passedChecks = Object.values(verification.checks).filter(c => c.status === 'passed').length;
  verification.trustScore = Math.round((passedChecks / 4) * 100);

  if (verification.trustScore >= 75) {
    verification.status = 'verified';
    verification.verifiedAt = new Date().toISOString();
  } else if (verification.trustScore >= 50) {
    verification.status = 'partially_verified';
  } else {
    verification.status = 'pending';
  }

  verification.updatedAt = new Date().toISOString();
  employeeVerifications.set(verificationId, verification);
}

/**
 * Get verification stats
 */
export function getVerificationStats() {
  return {
    emailVerifications: emailVerifications.size,
    phoneVerifications: phoneVerifications.size,
    domainVerifications: domainVerifications.size,
    businessVerifications: businessVerifications.size,
    employeeVerifications: employeeVerifications.size,

    emailVerified: Array.from(emailVerifications.values()).filter(v => v.status === 'verified').length,
    phoneVerified: Array.from(phoneVerifications.values()).filter(v => v.status === 'verified').length,
    domainVerified: Array.from(domainVerifications.values()).filter(v => v.status === 'verified').length,
    businessVerified: Array.from(businessVerifications.values()).filter(v => v.status === 'verified').length,
    employeeVerified: Array.from(employeeVerifications.values()).filter(v => v.status === 'verified').length
  };
}
