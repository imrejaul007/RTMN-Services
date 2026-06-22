/**
 * CorpID Cloud - Consent Platform Routes
 * GDPR/DPDP consent management endpoints
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  consentRecords,
  consentHistory,
  cookieConsents,
  dataRequests,
  CONSENT_TYPES,
  LEGAL_BASIS,
  getOrCreateConsent,
  updateConsent,
  grantConsent,
  withdrawConsent,
  getConsentHistory,
  setCookieConsent,
  getCookieConsent,
  createDataExportRequest,
  createDataDeletionRequest,
  createDataPortabilityRequest,
  createRectificationRequest,
  getDataRequests,
  acceptPolicy,
  getConsentStats
} from '../models/consent.model.js';

const router = express.Router();

/**
 * Get consent config
 * GET /api/consent/config
 */
router.get('/config',
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      types: CONSENT_TYPES,
      legalBasis: LEGAL_BASIS
    });
  })
);

/**
 * Get my consent settings
 * GET /api/consent/me
 */
router.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consent = getOrCreateConsent(req.user.id);
    res.json({ success: true, consent });
  })
);

/**
 * Update consent
 * PUT /api/consent/me
 */
router.put('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { category, permissions } = req.body;
    if (!category || !permissions) {
      throw new AppError('Category and permissions are required', 400, 'VALIDATION_ERROR');
    }

    const consent = updateConsent(req.user.id, category, permissions);
    dataAudit('consent.updated', req, 'consent', consent.id, { category });

    res.json({ success: true, message: 'Consent updated', consent });
  })
);

/**
 * Update specific consent category
 * PUT /api/consent/me/:category
 */
router.put('/me/:category',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const consent = updateConsent(req.user.id, req.params.category, req.body);
    dataAudit('consent.category_updated', req, 'consent', consent.id, { category: req.params.category });
    res.json({ success: true, consent });
  })
);

/**
 * Grant explicit consent
 * POST /api/consent/me/grant
 */
router.post('/me/grant',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type, purpose, legalBasis } = req.body;
    if (!type || !purpose) {
      throw new AppError('Type and purpose are required', 400, 'VALIDATION_ERROR');
    }

    const record = grantConsent(req.user.id, type, purpose, legalBasis);
    dataAudit('consent.granted', req, 'consent', record.id, { type, purpose });

    res.status(201).json({ success: true, message: 'Consent granted', record });
  })
);

/**
 * Withdraw consent
 * POST /api/consent/me/withdraw
 */
router.post('/me/withdraw',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type } = req.body;
    if (!type) {
      throw new AppError('Type is required', 400, 'VALIDATION_ERROR');
    }

    const record = withdrawConsent(req.user.id, type);
    dataAudit('consent.withdrawn', req, 'consent', record.id, { type });

    res.json({ success: true, message: 'Consent withdrawn', record });
  })
);

/**
 * Get consent history
 * GET /api/consent/me/history
 */
router.get('/me/history',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { type, limit = 50 } = req.query;
    const history = getConsentHistory(req.user.id, { type })
      .slice(0, parseInt(limit));

    res.json({ success: true, count: history.length, history });
  })
);

/**
 * Accept privacy policy
 * POST /api/consent/me/policy/accept
 */
router.post('/me/policy/accept',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { version } = req.body;
    if (!version) {
      throw new AppError('Policy version is required', 400, 'VALIDATION_ERROR');
    }

    const consent = acceptPolicy(req.user.id, version);
    dataAudit('consent.policy_accepted', req, 'consent', consent.id, { version });

    res.json({ success: true, message: 'Policy accepted', consent });
  })
);

// ============ DATA SUBJECT RIGHTS ============

/**
 * Request data export (GDPR Article 15)
 * POST /api/consent/me/data/export
 */
router.post('/me/data/export',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const request = createDataExportRequest(req.user.id);
    dataAudit('consent.data_export_requested', req, 'consent_request', request.id);

    res.status(201).json({
      success: true,
      message: 'Data export request created. You will receive an email when ready.',
      request,
      estimatedCompletion: '30 days'
    });
  })
);

/**
 * Request data deletion (GDPR Article 17)
 * POST /api/consent/me/data/delete
 */
router.post('/me/data/delete',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const request = createDataDeletionRequest(req.user.id);
    dataAudit('consent.data_deletion_requested', req, 'consent_request', request.id);

    res.status(201).json({
      success: true,
      message: 'Data deletion request created. Your data will be deleted in 30 days.',
      request,
      scheduledFor: request.scheduledFor
    });
  })
);

/**
 * Request data portability (GDPR Article 20)
 * POST /api/consent/me/data/portability
 */
router.post('/me/data/portability',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { format = 'json' } = req.body;
    const request = createDataPortabilityRequest(req.user.id, format);
    dataAudit('consent.data_portability_requested', req, 'consent_request', request.id);

    res.status(201).json({
      success: true,
      message: 'Data portability request created',
      request
    });
  })
);

/**
 * Request data rectification (GDPR Article 16)
 * POST /api/consent/me/data/rectify
 */
router.post('/me/data/rectify',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { corrections } = req.body;
    if (!corrections) {
      throw new AppError('Corrections are required', 400, 'VALIDATION_ERROR');
    }

    const request = createRectificationRequest(req.user.id, corrections);
    dataAudit('consent.data_rectification_requested', req, 'consent_request', request.id);

    res.status(201).json({
      success: true,
      message: 'Rectification request created',
      request
    });
  })
);

/**
 * Get my data requests
 * GET /api/consent/me/data/requests
 */
router.get('/me/data/requests',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const requests = getDataRequests(req.user.id);
    res.json({ success: true, count: requests.length, requests });
  })
);

// ============ COOKIE CONSENT (PUBLIC) ============

/**
 * Set cookie consent (public)
 * POST /api/consent/cookies
 */
router.post('/cookies',
  asyncHandler(async (req, res) => {
    const { visitorId, functional, analytics, advertising, socialMedia } = req.body;
    if (!visitorId) {
      throw new AppError('Visitor ID is required', 400, 'VALIDATION_ERROR');
    }

    const record = setCookieConsent(visitorId, {
      functional, analytics, advertising, socialMedia,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ success: true, message: 'Cookie consent saved', record });
  })
);

/**
 * Get cookie consent (public)
 * GET /api/consent/cookies/:visitorId
 */
router.get('/cookies/:visitorId',
  asyncHandler(async (req, res) => {
    const record = getCookieConsent(req.params.visitorId);
    if (!record) {
      return res.json({ success: true, consent: null, message: 'No cookie consent found' });
    }
    res.json({ success: true, consent: record });
  })
);

// ============ ADMIN ROUTES ============

/**
 * Get consent statistics
 * GET /api/consent/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const stats = getConsentStats();
    res.json({ success: true, stats });
  })
);

/**
 * Get pending data requests
 * GET /api/consent/requests/pending
 */
router.get('/requests/pending',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const pending = Array.from(dataRequests.values())
      .filter(r => r.status === 'pending')
      .map(r => ({
        id: r.id,
        userId: r.userId,
        type: r.type,
        requestedAt: r.requestedAt,
        scheduledFor: r.scheduledFor
      }));

    res.json({ success: true, count: pending.length, pending });
  })
);

export default router;
