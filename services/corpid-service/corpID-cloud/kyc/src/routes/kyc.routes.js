/**
 * CorpID Cloud - KYC Platform Routes
 * Know Your Customer verification endpoints
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../shared/utils/logger.js';
import {
  kycRecords,
  kycDocuments,
  kycVerifications,
  KYC_LEVELS,
  KYC_STATUSES,
  DOCUMENT_TYPES,
  createKYCRecord,
  getKYCRecord,
  updatePersonalInfo,
  addKYCDocument,
  verifyDocument,
  updateBiometric,
  runBackgroundCheck,
  submitForReview,
  approveKYC,
  rejectKYC,
  getKYCStats
} from '../models/kyc.model.js';

const router = express.Router();

/**
 * Get KYC levels and document types
 * GET /api/kyc/config
 */
router.get('/config',
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      levels: KYC_LEVELS,
      statuses: KYC_STATUSES,
      documentTypes: DOCUMENT_TYPES
    });
  })
);

/**
 * Get my KYC record
 * GET /api/kyc/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const record = getKYCRecord(req.user.id) || createKYCRecord(req.user.id);
    res.json({ success: true, kyc: record });
  })
);

/**
 * Update personal info
 * PUT /api/kyc/me/personal
 */
router.put('/me/personal',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const record = updatePersonalInfo(req.user.id, req.body);
    dataAudit('kyc.personal_info_updated', req, 'kyc', record.id);
    res.json({ success: true, message: 'Personal info updated', kyc: record });
  })
);

/**
 * Add document
 * POST /api/kyc/me/documents
 */
router.post('/me/documents',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type, number, documentUrls, ocrData, extractedFields, expiresAt } = req.body;
    if (!type) {
      throw new AppError('Document type is required', 400, 'VALIDATION_ERROR');
    }
    if (!DOCUMENT_TYPES[type]) {
      throw new AppError('Invalid document type', 400, 'INVALID_DOCUMENT_TYPE');
    }

    const document = addKYCDocument(req.user.id, {
      type, number, documentUrls, ocrData, extractedFields, expiresAt
    });

    dataAudit('kyc.document_added', req, 'kyc_document', document.id, { type });

    res.status(201).json({ success: true, message: 'Document added', document });
  })
);

/**
 * List my documents
 * GET /api/kyc/me/documents
 */
router.get('/me/documents',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const record = getKYCRecord(req.user.id) || createKYCRecord(req.user.id);
    const documents = [
      ...record.identityProofs,
      ...record.addressProofs,
      ...record.businessProofs
    ];
    res.json({ success: true, count: documents.length, documents });
  })
);

/**
 * Update biometric data
 * PUT /api/kyc/me/biometric
 */
router.put('/me/biometric',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { faceVerified, livenessCheck, livenessScore, faceMatchScore } = req.body;
    const record = updateBiometric(req.user.id, {
      faceVerified, livenessCheck, livenessScore, faceMatchScore
    });

    dataAudit('kyc.biometric_updated', req, 'kyc', record.id);

    res.json({ success: true, message: 'Biometric data updated', biometric: record.biometric });
  })
);

/**
 * Run background check
 * POST /api/kyc/me/background-checks
 */
router.post('/me/background-checks',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    if (!type) {
      throw new AppError('Check type is required', 400, 'VALIDATION_ERROR');
    }

    const check = runBackgroundCheck(req.user.id, type);
    dataAudit('kyc.background_check_initiated', req, 'kyc', check.id, { type });

    res.status(201).json({ success: true, message: 'Background check initiated', check });
  })
);

/**
 * Submit for review
 * POST /api/kyc/me/submit
 */
router.post('/me/submit',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const record = submitForReview(req.user.id);
    if (!record) {
      throw new AppError('KYC record not found', 404, 'KYC_NOT_FOUND');
    }
    dataAudit('kyc.submitted_for_review', req, 'kyc', record.id);
    res.json({ success: true, message: 'KYC submitted for review', kyc: record });
  })
);

// ============ ADMIN ROUTES ============

/**
 * Get user KYC (admin)
 * GET /api/kyc/user/:userId
 */
router.get('/user/:userId',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const record = getKYCRecord(req.params.userId);
    if (!record) {
      throw new AppError('KYC record not found', 404, 'KYC_NOT_FOUND');
    }
    res.json({ success: true, kyc: record });
  })
);

/**
 * Verify document (admin)
 * POST /api/kyc/documents/:docId/verify
 */
router.post('/documents/:docId/verify',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { method = 'manual' } = req.body;
    const doc = verifyDocument(req.params.docId, method, req.user.id);
    if (!doc) {
      throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }
    dataAudit('kyc.document_verified', req, 'kyc_document', doc.id, { method });
    res.json({ success: true, message: 'Document verified', document: doc });
  })
);

/**
 * Approve KYC (admin)
 * POST /api/kyc/user/:userId/approve
 */
router.post('/user/:userId/approve',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { notes } = req.body;
    const record = approveKYC(req.params.userId, req.user.id, notes);
    if (!record) {
      throw new AppError('KYC record not found', 404, 'KYC_NOT_FOUND');
    }
    dataAudit('kyc.approved', req, 'kyc', record.id, { notes });
    res.json({ success: true, message: 'KYC approved', kyc: record });
  })
);

/**
 * Reject KYC (admin)
 * POST /api/kyc/user/:userId/reject
 */
router.post('/user/:userId/reject',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { reason } = req.body;
    if (!reason) {
      throw new AppError('Rejection reason is required', 400, 'VALIDATION_ERROR');
    }
    const record = rejectKYC(req.params.userId, req.user.id, reason);
    if (!record) {
      throw new AppError('KYC record not found', 404, 'KYC_NOT_FOUND');
    }
    dataAudit('kyc.rejected', req, 'kyc', record.id, { reason });
    res.json({ success: true, message: 'KYC rejected', kyc: record });
  })
);

/**
 * KYC statistics (admin)
 * GET /api/kyc/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const stats = getKYCStats();
    res.json({ success: true, stats });
  })
);

/**
 * List pending reviews (admin)
 * GET /api/kyc/pending
 */
router.get('/pending',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const pending = Array.from(kycRecords.values())
      .filter(r => r.status === KYC_STATUSES.UNDER_REVIEW)
      .map(r => ({
        id: r.id,
        userId: r.userId,
        userType: r.userType,
        level: r.level,
        status: r.status,
        documentCount: r.identityProofs.length + r.addressProofs.length + r.businessProofs.length,
        submittedAt: r.review.submittedAt
      }));

    res.json({ success: true, count: pending.length, pending });
  })
);

export default router;
