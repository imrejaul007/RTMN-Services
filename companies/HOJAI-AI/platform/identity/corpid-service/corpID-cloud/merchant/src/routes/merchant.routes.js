/**
 * CorpID Cloud - Merchant Identity Routes
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  merchants,
  branches,
  merchantStaff,
  merchantSettlements,
  createMerchant,
  createBranch,
  addStaff,
  addSettlementAccount,
  getMerchantById,
  getMerchantBySlug,
  getMerchantBranches,
  getMerchantStaff,
  getMerchantSettlements,
  getBranchById,
  updateMerchant,
  updateKYC,
  addKYCDocument
} from '../models/merchant.model.js';

const router = express.Router();

/**
 * Create merchant
 * POST /api/merchants
 */
router.post('/',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const existing = getMerchantBySlug(req.body.slug);
    if (existing) {
      throw new AppError('Merchant with this name/slug already exists', 409, 'MERCHANT_EXISTS');
    }

    const merchant = createMerchant({
      ...req.body,
      ownerId: req.user.id
    });

    dataAudit('merchant.created', req, 'merchant', merchant.id);

    res.status(201).json({
      success: true,
      message: 'Merchant created',
      merchant
    });
  })
);

/**
 * Get merchant by ID
 * GET /api/merchants/:id
 */
router.get('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const merchant = getMerchantById(req.params.id);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    res.json({ success: true, merchant });
  })
);

/**
 * Get merchant by slug
 * GET /api/merchants/slug/:slug
 */
router.get('/slug/:slug',
  asyncHandler(async (req, res) => {
    const merchant = getMerchantBySlug(req.params.slug);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    res.json({ success: true, merchant });
  })
);

/**
 * Update merchant
 * PUT /api/merchants/:id
 */
router.put('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const merchant = getMerchantById(req.params.id);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (merchant.ownerId !== req.user.id && req.user.role !== 'superadmin' && req.user.role !== 'org-admin') {
      throw new AppError('Only the owner can update merchant', 403, 'ACCESS_DENIED');
    }

    const updated = updateMerchant(req.params.id, req.body);

    dataAudit('merchant.updated', req, 'merchant', req.params.id);

    res.json({
      success: true,
      message: 'Merchant updated',
      merchant: updated
    });
  })
);

/**
 * Add KYC document
 * POST /api/merchants/:id/kyc/documents
 */
router.post('/:id/kyc/documents',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const merchant = getMerchantById(req.params.id);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (merchant.ownerId !== req.user.id) {
      throw new AppError('Only the owner can add KYC documents', 403, 'ACCESS_DENIED');
    }

    const doc = addKYCDocument(req.params.id, req.body);

    dataAudit('merchant.kyc_document_added', req, 'merchant', req.params.id, { type: doc.type });

    res.status(201).json({
      success: true,
      message: 'KYC document added',
      document: doc
    });
  })
);

/**
 * Update KYC status
 * PUT /api/merchants/:id/kyc
 */
router.put('/:id/kyc',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const merchant = getMerchantById(req.params.id);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    const updated = updateKYC(req.params.id, {
      ...req.body,
      verifiedBy: req.user.id
    });

    dataAudit('merchant.kyc_updated', req, 'merchant', req.params.id, { status: req.body.status });

    res.json({
      success: true,
      message: 'KYC updated',
      kyc: updated.kyc,
      verification: updated.verification
    });
  })
);

// ============ BRANCH ROUTES ============

/**
 * Create branch
 * POST /api/merchants/:merchantId/branches
 */
router.post('/:merchantId/branches',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const merchant = getMerchantById(req.params.merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (merchant.ownerId !== req.user.id && req.user.role !== 'superadmin') {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    const branch = createBranch({
      ...req.body,
      merchantId: req.params.merchantId
    });

    dataAudit('merchant.branch_created', req, 'branch', branch.id);

    res.status(201).json({
      success: true,
      message: 'Branch created',
      branch
    });
  })
);

/**
 * List branches
 * GET /api/merchants/:merchantId/branches
 */
router.get('/:merchantId/branches',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const branchList = getMerchantBranches(req.params.merchantId);
    res.json({
      success: true,
      count: branchList.length,
      branches: branchList
    });
  })
);

/**
 * Get branch
 * GET /api/merchants/:merchantId/branches/:id
 */
router.get('/:merchantId/branches/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const branch = getBranchById(req.params.id);
    if (!branch || branch.merchantId !== req.params.merchantId) {
      throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
    }

    res.json({ success: true, branch });
  })
);

// ============ STAFF ROUTES ============

/**
 * Add staff
 * POST /api/merchants/:merchantId/staff
 */
router.post('/:merchantId/staff',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const merchant = getMerchantById(req.params.merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (merchant.ownerId !== req.user.id) {
      throw new AppError('Only the owner can add staff', 403, 'ACCESS_DENIED');
    }

    const staff = addStaff(req.params.merchantId, req.body);

    dataAudit('merchant.staff_added', req, 'staff', staff.id);

    res.status(201).json({
      success: true,
      message: 'Staff added',
      staff
    });
  })
);

/**
 * List staff
 * GET /api/merchants/:merchantId/staff
 */
router.get('/:merchantId/staff',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const staffList = getMerchantStaff(req.params.merchantId);
    res.json({
      success: true,
      count: staffList.length,
      staff: staffList
    });
  })
);

// ============ SETTLEMENT ROUTES ============

/**
 * Add settlement account
 * POST /api/merchants/:merchantId/settlements
 */
router.post('/:merchantId/settlements',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const merchant = getMerchantById(req.params.merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    if (merchant.ownerId !== req.user.id) {
      throw new AppError('Only the owner can add settlement accounts', 403, 'ACCESS_DENIED');
    }

    const account = addSettlementAccount(req.params.merchantId, req.body);

    dataAudit('merchant.settlement_added', req, 'settlement', account.id);

    res.status(201).json({
      success: true,
      message: 'Settlement account added',
      account
    });
  })
);

/**
 * List settlement accounts
 * GET /api/merchants/:merchantId/settlements
 */
router.get('/:merchantId/settlements',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const accounts = getMerchantSettlements(req.params.merchantId);
    res.json({
      success: true,
      count: accounts.length,
      accounts
    });
  })
);

/**
 * List all merchants (admin)
 * GET /api/merchants
 */
router.get('/',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { status, category, kycStatus, page = 1, limit = 20 } = req.query;
    let allMerchants = Array.from(merchants.values());

    if (status) allMerchants = allMerchants.filter(m => m.status === status);
    if (category) allMerchants = allMerchants.filter(m => m.category === category);
    if (kycStatus) allMerchants = allMerchants.filter(m => m.kyc.status === kycStatus);

    const start = (page - 1) * limit;
    const paginated = allMerchants.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      count: allMerchants.length,
      page: parseInt(page),
      limit: parseInt(limit),
      merchants: paginated.map(m => ({
        id: m.id,
        displayName: m.displayName,
        slug: m.slug,
        category: m.category,
        kycStatus: m.kyc.status,
        verificationStatus: m.verification.status,
        status: m.status,
        createdAt: m.createdAt
      }))
    });
  })
);

export default router;
