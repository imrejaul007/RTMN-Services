/**
 * CorpID Cloud - KYC Platform Model
 * Know Your Customer verification system
 * Manages identity documents, business documents, biometric data, and AML checks
 */

import { v4 as uuidv4 } from 'uuid';

// ============ IN-MEMORY STORES ============

export const kycRecords = new Map(); // userId -> KYC Record
export const kycDocuments = new Map(); // docId -> Document
export const kycReviews = new Map(); // reviewId -> Review
export const kycVerifications = []; // Verification log

// ============ KYC LEVELS ============

export const KYC_LEVELS = {
  LEVEL_1: {
    level: 1,
    name: 'Basic',
    description: 'Email and phone verified',
    requirements: ['email_verified', 'phone_verified']
  },
  LEVEL_2: {
    level: 2,
    name: 'Standard',
    description: 'Government ID verified',
    requirements: ['email_verified', 'phone_verified', 'id_document']
  },
  LEVEL_3: {
    level: 3,
    name: 'Enhanced',
    description: 'Full KYC with biometric and liveness',
    requirements: ['email_verified', 'phone_verified', 'id_document', 'address_proof', 'biometric', 'liveness']
  }
};

// ============ DOCUMENT TYPES ============

export const DOCUMENT_TYPES = {
  // Identity
  aadhaar: { name: 'Aadhaar Card', country: 'IN', category: 'identity', format: '####-####-####' },
  passport: { name: 'Passport', country: '*', category: 'identity', format: 'A########' },
  pan: { name: 'PAN Card', country: 'IN', category: 'identity', format: 'AAAAA####A' },
  driving_license: { name: 'Driving License', country: '*', category: 'identity', format: 'varies' },
  voter_id: { name: 'Voter ID', country: 'IN', category: 'identity', format: 'AAA#######' },
  ssn: { name: 'Social Security Number', country: 'US', category: 'identity', format: '###-##-####' },

  // Address
  utility_bill: { name: 'Utility Bill', category: 'address' },
  bank_statement: { name: 'Bank Statement', category: 'address' },
  rent_agreement: { name: 'Rent Agreement', category: 'address' },

  // Business
  gst_certificate: { name: 'GST Certificate', country: 'IN', category: 'business' },
  business_registration: { name: 'Business Registration', category: 'business' },
  shop_act: { name: 'Shop Act License', country: 'IN', category: 'business' },
  cin: { name: 'Corporate Identity Number', country: 'IN', category: 'business' },
  llp: { name: 'LLP Registration', country: 'IN', category: 'business' },

  // Financial
  bank_account: { name: 'Bank Account Proof', category: 'financial' },
  cancelled_cheque: { name: 'Cancelled Cheque', category: 'financial' }
};

// ============ KYC STATUSES ============

export const KYC_STATUSES = {
  NOT_STARTED: 'not_started',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DOCUMENTS_REQUIRED: 'documents_required',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// ============ MODEL FACTORY ============

/**
 * Create a KYC record
 */
export function createKYCRecord(userId, userType = 'consumer') {
  const now = new Date().toISOString();
  const recordId = `kyc-${uuidv4().slice(0, 12)}`;

  const record = {
    id: recordId,
    userId,
    userType, // 'consumer' | 'merchant' | 'employee'

    // Verification level
    level: 0,
    targetLevel: 2, // Default target
    status: KYC_STATUSES.NOT_STARTED,

    // Personal info (encrypted at rest in production)
    personalInfo: {
      firstName: null,
      lastName: null,
      dateOfBirth: null,
      gender: null,
      nationality: null
    },

    // Contact info
    contactInfo: {
      email: null,
      phone: null,
      address: null
    },

    // Documents
    identityProofs: [],
    addressProofs: [],
    businessProofs: [],

    // Biometric
    biometric: {
      faceVerified: false,
      livenessCheck: false,
      livenessScore: 0,
      faceMatchScore: 0,
      fingerprint: null,
      verifiedAt: null
    },

    // Background checks
    backgroundChecks: [],

    // AML
    amlStatus: 'clear', // clear, review, flagged, blocked
    amlScore: 0,
    sanctionsMatch: false,
    pepMatch: false, // Politically Exposed Person
    adverseMedia: false,

    // Review
    review: {
      required: false,
      assignedTo: null,
      status: 'pending',
      notes: '',
      reviewedAt: null
    },

    // Vendor
    vendor: 'internal', // internal, sumsub, jumio, onfido
    vendorCaseId: null,
    vendorResponse: null,

    // Validity
    validFrom: null,
    validUntil: null,
    renewalRequired: false,
    lastRenewedAt: null,

    // Audit
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };

  kycRecords.set(userId, record);
  return record;
}

/**
 * Get KYC record
 */
export function getKYCRecord(userId) {
  return kycRecords.get(userId) || null;
}

/**
 * Update personal info
 */
export function updatePersonalInfo(userId, data) {
  const record = kycRecords.get(userId) || createKYCRecord(userId);
  record.personalInfo = { ...record.personalInfo, ...data };
  record.status = KYC_STATUSES.IN_PROGRESS;
  record.updatedAt = new Date().toISOString();
  kycRecords.set(userId, record);
  return record;
}

/**
 * Add document to KYC
 */
export function addKYCDocument(userId, documentData) {
  const record = kycRecords.get(userId) || createKYCRecord(userId);
  const docId = `doc-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const docType = DOCUMENT_TYPES[documentData.type];
  if (!docType) {
    throw new Error(`Invalid document type: ${documentData.type}`);
  }

  const document = {
    id: docId,
    type: documentData.type,
    category: docType.category,
    number: documentData.number || null, // Will be encrypted in production
    country: docType.country || null,
    documentUrls: documentData.documentUrls || [], // Front, back, etc.
    ocrData: documentData.ocrData || null,
    extractedFields: documentData.extractedFields || {},
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    verificationMethod: null, // 'manual', 'automatic', 'vendor'
    expiresAt: documentData.expiresAt || null,
    uploadedAt: now
  };

  kycDocuments.set(docId, document);

  // Add to appropriate category
  if (docType.category === 'identity') {
    record.identityProofs.push(document);
  } else if (docType.category === 'address') {
    record.addressProofs.push(document);
  } else if (docType.category === 'business') {
    record.businessProofs.push(document);
  }

  record.status = KYC_STATUSES.DOCUMENTS_REQUIRED;
  record.updatedAt = now;
  kycRecords.set(userId, record);

  return document;
}

/**
 * Verify document
 */
export function verifyDocument(docId, method = 'manual', verifiedBy = null) {
  const doc = kycDocuments.get(docId);
  if (!doc) return null;

  doc.verified = true;
  doc.verifiedAt = new Date().toISOString();
  doc.verifiedBy = verifiedBy;
  doc.verificationMethod = method;
  kycDocuments.set(docId, doc);

  // Check if user's KYC can be advanced
  const userId = doc.userId || findUserByDocument(docId);
  if (userId) {
    checkKYCLevelAdvancement(userId);
  }

  return doc;
}

/**
 * Find user by document ID
 */
function findUserByDocument(docId) {
  for (const [userId, record] of kycRecords.entries()) {
    const allDocs = [...record.identityProofs, ...record.addressProofs, ...record.businessProofs];
    if (allDocs.find(d => d.id === docId)) return userId;
  }
  return null;
}

/**
 * Check if KYC level can be advanced
 */
function checkKYCLevelAdvancement(userId) {
  const record = kycRecords.get(userId);
  if (!record) return;

  const verifiedDocs = (docs) => docs.filter(d => d.verified).length;
  const identityCount = verifiedDocs(record.identityProofs);
  const addressCount = verifiedDocs(record.addressProofs);

  let newLevel = 0;
  if (identityCount >= 1) newLevel = 2; // Level 2 with ID proof
  if (identityCount >= 1 && addressCount >= 1) newLevel = 2;
  if (identityCount >= 1 && addressCount >= 1 && record.biometric.faceVerified) {
    newLevel = 3;
  }

  if (newLevel > record.level) {
    record.level = newLevel;
  }

  // Auto-approve if Level 2 met
  if (newLevel >= 2 && record.status === KYC_STATUSES.DOCUMENTS_REQUIRED) {
    record.status = KYC_STATUSES.APPROVED;
    record.validFrom = new Date().toISOString();
    record.validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    record.completedAt = new Date().toISOString();
  }

  record.updatedAt = new Date().toISOString();
  kycRecords.set(userId, record);
}

/**
 * Update biometric
 */
export function updateBiometric(userId, data) {
  const record = kycRecords.get(userId) || createKYCRecord(userId);

  record.biometric = {
    ...record.biometric,
    ...data,
    verifiedAt: new Date().toISOString()
  };

  record.status = KYC_STATUSES.UNDER_REVIEW;
  record.updatedAt = new Date().toISOString();
  kycRecords.set(userId, record);

  checkKYCLevelAdvancement(userId);

  return record;
}

/**
 * Run background check
 */
export function runBackgroundCheck(userId, type) {
  const record = kycRecords.get(userId) || createKYCRecord(userId);

  const check = {
    id: `bg-${uuidv4().slice(0, 12)}`,
    type, // pan_verification, gst_verification, cibil, watchlist, sanctions
    status: 'pending',
    result: null,
    completedAt: null,
    createdAt: new Date().toISOString()
  };

  record.backgroundChecks.push(check);
  record.updatedAt = new Date().toISOString();
  kycRecords.set(userId, record);

  // Simulate automatic check
  setTimeout(() => {
    completeBackgroundCheck(check.id, userId, {
      status: 'passed',
      result: { matched: false, score: 95 }
    });
  }, 100);

  return check;
}

/**
 * Complete background check
 */
function completeBackgroundCheck(checkId, userId, data) {
  const record = kycRecords.get(userId);
  if (!record) return;

  const check = record.backgroundChecks.find(c => c.id === checkId);
  if (!check) return;

  check.status = data.status;
  check.result = data.result;
  check.completedAt = new Date().toISOString();

  // Update AML status based on checks
  if (data.status === 'failed') {
    record.amlStatus = 'flagged';
  }

  record.updatedAt = new Date().toISOString();
  kycRecords.set(userId, record);
}

/**
 * Submit for review
 */
export function submitForReview(userId) {
  const record = kycRecords.get(userId);
  if (!record) return null;

  record.status = KYC_STATUSES.UNDER_REVIEW;
  record.review.required = true;
  record.review.status = 'pending';
  record.review.submittedAt = new Date().toISOString();
  record.updatedAt = new Date().toISOString();
  kycRecords.set(userId, record);

  return record;
}

/**
 * Approve KYC
 */
export function approveKYC(userId, reviewerId, notes = '') {
  const record = kycRecords.get(userId);
  if (!record) return null;

  record.status = KYC_STATUSES.APPROVED;
  record.review.status = 'approved';
  record.review.notes = notes;
  record.review.reviewedAt = new Date().toISOString();
  record.review.assignedTo = reviewerId;
  record.validFrom = new Date().toISOString();
  record.validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  record.completedAt = new Date().toISOString();
  record.updatedAt = record.completedAt;
  kycRecords.set(userId, record);

  // Log verification
  kycVerifications.push({
    id: uuidv4(),
    userId,
    action: 'approved',
    reviewer: reviewerId,
    notes,
    timestamp: record.completedAt
  });

  return record;
}

/**
 * Reject KYC
 */
export function rejectKYC(userId, reviewerId, reason) {
  const record = kycRecords.get(userId);
  if (!record) return null;

  record.status = KYC_STATUSES.REJECTED;
  record.review.status = 'rejected';
  record.review.notes = reason;
  record.review.reviewedAt = new Date().toISOString();
  record.review.assignedTo = reviewerId;
  record.updatedAt = new Date().toISOString();
  kycRecords.set(userId, record);

  kycVerifications.push({
    id: uuidv4(),
    userId,
    action: 'rejected',
    reviewer: reviewerId,
    reason,
    timestamp: record.updatedAt
  });

  return record;
}

/**
 * Get KYC statistics
 */
export function getKYCStats() {
  const allRecords = Array.from(kycRecords.values());

  const byStatus = {};
  const byLevel = {};
  const byUserType = {};

  for (const record of allRecords) {
    byStatus[record.status] = (byStatus[record.status] || 0) + 1;
    byLevel[record.level] = (byLevel[record.level] || 0) + 1;
    byUserType[record.userType] = (byUserType[record.userType] || 0) + 1;
  }

  return {
    totalRecords: allRecords.length,
    byStatus,
    byLevel,
    byUserType,
    totalDocuments: kycDocuments.size,
    totalVerifications: kycVerifications.length
  };
}
