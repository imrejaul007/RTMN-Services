/**
 * CorpID Cloud - Merchant Identity Model
 * Complete merchant identity with stores, branches, KYC, and settlements
 */

import { v4 as uuidv4 } from 'uuid';
import { encrypt, decrypt } from '../../../shared/utils/security.js';

// ============ IN-MEMORY STORES ============

export const merchants = new Map();
export const branches = new Map();
export const merchantStaff = new Map();
export const merchantDevices = new Map();
export const merchantSettlements = new Map();

// ============ MODEL FACTORY ============

/**
 * Create a merchant identity
 */
export function createMerchant(data) {
  const now = new Date().toISOString();
  const merchantId = `merch-${uuidv4().slice(0, 12)}`;

  const merchant = {
    id: merchantId,
    ownerId: data.ownerId, // CorpID user ID of owner
    organizationId: data.organizationId || null,

    // Basic Info
    legalName: data.legalName,
    displayName: data.displayName,
    slug: data.slug || generateSlug(data.displayName),
    description: data.description || '',
    logo: data.logo || null,
    banner: data.banner || null,

    // Business Type
    type: data.type || 'individual', // individual, partnership, corporation, llp, pvt-ltd
    category: data.category || 'general', // restaurant, retail, healthcare, etc.
    subcategory: data.subcategory || null,
    industry: data.industry || 'general',

    // Registration
    registrationNumber: data.registrationNumber || null,
    gstNumber: data.gstNumber || null,
    panNumber: data.panNumber || null,
    tanNumber: data.tanNumber || null,
    cinNumber: data.cinNumber || null, // Corporate Identity Number
    llpinNumber: data.llpinNumber || null,
    shopActNumber: data.shopActNumber || null,
    fssaiNumber: data.fssaiNumber || null, // For food businesses

    // KYC
    kyc: {
      status: 'pending', // pending, in_progress, approved, rejected, expired
      level: 0, // 0-3
      documents: [],
      verifiedAt: null,
      verifiedBy: null,
      expiresAt: null,
      notes: ''
    },

    // Verification
    verification: {
      status: 'unverified', // unverified, pending, verified, suspended
      verifiedAt: null,
      verifiedBy: null,
      badges: [], // verified, trusted, premium
      trustScore: 0
    },

    // AML
    aml: {
      status: 'clear', // clear, review, flagged, blocked
      lastCheckedAt: null,
      sanctionsMatch: false,
      pepMatch: false, // Politically Exposed Person
      adverseMedia: false
    },

    // Address
    address: {
      line1: data.address?.line1 || '',
      line2: data.address?.line2 || '',
      city: data.address?.city || '',
      state: data.address?.state || '',
      country: data.address?.country || 'IN',
      postalCode: data.address?.postalCode || '',
      coordinates: data.address?.coordinates || null
    },

    // Contact
    contact: {
      email: data.contact?.email || '',
      phone: data.contact?.phone || '',
      website: data.contact?.website || null,
      supportEmail: data.contact?.supportEmail || null,
      supportPhone: data.contact?.supportPhone || null
    },

    // Business Hours
    businessHours: data.businessHours || {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '18:00', closed: false },
      saturday: { open: '09:00', close: '18:00', closed: false },
      sunday: { open: '09:00', close: '18:00', closed: true }
    },

    // Settlement Accounts
    settlementAccounts: data.settlementAccounts || [],

    // Payout Settings
    payout: {
      schedule: data.payout?.schedule || 'weekly', // daily, weekly, monthly
      minimumAmount: data.payout?.minimumAmount || 100,
      currency: data.payout?.currency || 'INR',
      autoPayout: data.payout?.autoPayout ?? true
    },

    // Integrations
    integrations: data.integrations || [],

    // Compliance
    compliance: {
      termsAcceptedAt: data.compliance?.termsAcceptedAt || null,
      privacyPolicyAcceptedAt: data.compliance?.privacyPolicyAcceptedAt || null,
      dataProcessingAgreementSigned: data.compliance?.dataProcessingAgreementSigned || false
    },

    // Stats
    stats: {
      totalBranches: 0,
      totalStaff: 0,
      totalTransactions: 0,
      totalRevenue: 0,
      averageRating: 0,
      totalReviews: 0
    },

    // Status
    status: 'active', // active, inactive, suspended, closed
    suspendedAt: null,
    suspendedReason: null,
    closedAt: null,

    // Tags & Metadata
    tags: data.tags || [],
    metadata: data.metadata || {},

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  merchants.set(merchantId, merchant);
  return merchant;
}

/**
 * Create a branch/store
 */
export function createBranch(data) {
  const branchId = `branch-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const branch = {
    id: branchId,
    merchantId: data.merchantId,
    name: data.name,
    code: data.code || null,
    type: data.type || 'store', // store, warehouse, office, franchise

    // Address
    address: {
      line1: data.address?.line1 || '',
      line2: data.address?.line2 || '',
      city: data.address?.city || '',
      state: data.address?.state || '',
      country: data.address?.country || 'IN',
      postalCode: data.address?.postalCode || '',
      coordinates: data.address?.coordinates || null
    },

    // Contact
    phone: data.phone || null,
    email: data.email || null,

    // Manager
    managerId: data.managerId || null,
    staffIds: data.staffIds || [],

    // Devices
    deviceIds: data.deviceIds || [],

    // Business Hours
    businessHours: data.businessHours || null,

    // Operations
    timezone: data.timezone || 'Asia/Kolkata',
    currency: data.currency || 'INR',

    // Status
    status: 'active',
    isMainBranch: data.isMainBranch || false,

    // Stats
    stats: {
      totalOrders: 0,
      totalRevenue: 0,
      staffCount: 0
    },

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  branches.set(branchId, branch);

  // Update merchant stats
  const merchant = merchants.get(data.merchantId);
  if (merchant) {
    merchant.stats.totalBranches = (merchant.stats.totalBranches || 0) + 1;
    merchants.set(data.merchantId, merchant);
  }

  return branch;
}

/**
 * Add staff to merchant
 */
export function addStaff(merchantId, data) {
  const staffId = `staff-${uuidv4().slice(0, 12)}`;
  const now = new Date().toISOString();

  const staff = {
    id: staffId,
    merchantId,
    userId: data.userId,
    branchId: data.branchId || null,

    // Role
    role: data.role || 'staff', // owner, manager, staff, cashier
    title: data.title || '',

    // Permissions
    permissions: data.permissions || [],

    // Status
    status: 'active',
    joinedAt: data.joinedAt || now,

    // Timestamps
    createdAt: now,
    updatedAt: now
  };

  const merchantStaffList = merchantStaff.get(merchantId) || [];
  merchantStaffList.push(staff);
  merchantStaff.set(merchantId, merchantStaffList);

  // Update merchant stats
  const merchant = merchants.get(merchantId);
  if (merchant) {
    merchant.stats.totalStaff = (merchant.stats.totalStaff || 0) + 1;
    merchants.set(merchantId, merchant);
  }

  return staff;
}

/**
 * Add settlement account
 */
export function addSettlementAccount(merchantId, data) {
  const account = {
    id: `settle-${uuidv4().slice(0, 12)}`,
    merchantId,
    type: data.type || 'bank', // bank, upi, paypal
    bankName: data.bankName || null,
    accountHolderName: data.accountHolderName,
    accountNumber: data.accountNumber, // Should be encrypted
    ifsc: data.ifsc || null,
    upiId: data.upiId || null,
    paypalEmail: data.paypalEmail || null,
    isPrimary: data.isPrimary || false,
    isVerified: false,
    verifiedAt: null,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  const accounts = merchantSettlements.get(merchantId) || [];
  accounts.push(account);
  merchantSettlements.set(merchantId, accounts);

  return account;
}

// ============ QUERY HELPERS ============

export function getMerchantById(id) {
  return merchants.get(id) || null;
}

export function getMerchantBySlug(slug) {
  for (const merchant of merchants.values()) {
    if (merchant.slug === slug) return merchant;
  }
  return null;
}

export function getMerchantBranches(merchantId) {
  return Array.from(branches.values()).filter(b => b.merchantId === merchantId);
}

export function getMerchantStaff(merchantId) {
  return merchantStaff.get(merchantId) || [];
}

export function getMerchantSettlements(merchantId) {
  return merchantSettlements.get(merchantId) || [];
}

export function getBranchById(id) {
  return branches.get(id) || null;
}

/**
 * Update merchant
 */
export function updateMerchant(id, data) {
  const merchant = merchants.get(id);
  if (!merchant) return null;

  const allowedFields = [
    'legalName', 'displayName', 'description', 'logo', 'banner',
    'category', 'subcategory', 'address', 'contact', 'businessHours',
    'payout', 'tags', 'metadata', 'status'
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      merchant[field] = data[field];
    }
  }

  merchant.updatedAt = new Date().toISOString();
  merchants.set(id, merchant);
  return merchant;
}

/**
 * Update KYC status
 */
export function updateKYC(merchantId, data) {
  const merchant = merchants.get(merchantId);
  if (!merchant) return null;

  merchant.kyc = { ...merchant.kyc, ...data };
  merchant.updatedAt = new Date().toISOString();
  merchants.set(merchantId, merchant);

  // Update verification status based on KYC
  if (merchant.kyc.status === 'approved') {
    merchant.verification.status = 'verified';
    merchant.verification.verifiedAt = new Date().toISOString();
    merchant.verification.trustScore = Math.min(100, (merchant.verification.trustScore || 0) + 50);
  }

  return merchant;
}

/**
 * Add KYC document
 */
export function addKYCDocument(merchantId, document) {
  const merchant = merchants.get(merchantId);
  if (!merchant) return null;

  const doc = {
    id: `doc-${uuidv4().slice(0, 12)}`,
    type: document.type,
    number: document.number || null,
    documentUrls: document.documentUrls || [],
    ocrData: document.ocrData || null,
    verified: false,
    verifiedAt: null,
    uploadedAt: new Date().toISOString()
  };

  merchant.kyc.documents.push(doc);
  merchant.updatedAt = new Date().toISOString();
  merchants.set(merchantId, merchant);

  return doc;
}

// ============ HELPERS ============

function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}
