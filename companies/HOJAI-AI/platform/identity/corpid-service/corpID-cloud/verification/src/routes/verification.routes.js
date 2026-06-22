/**
 * CorpID Cloud - Identity Verification Routes
 * Automated verification services
 */

import express from 'express';
import { requireAuth, requireAdmin } from '../../../../shared/middleware/auth.js';
import { asyncHandler, AppError } from '../../../../shared/middleware/error-handler.js';
import { dataAudit } from '../../../../shared/utils/logger.js';
import {
  emailVerifications,
  phoneVerifications,
  domainVerifications,
  businessVerifications,
  employeeVerifications,
  createEmailVerification,
  verifyEmailToken,
  createPhoneVerification,
  verifyPhoneOTP,
  checkEmailFormat,
  checkPhoneFormat,
  createDomainVerification,
  checkDomainVerification,
  createBusinessVerification,
  createEmployeeVerification,
  getVerificationStats
} from '../models/verification.model.js';

const router = express.Router();

// ============ EMAIL VERIFICATION ============

/**
 * Send email verification
 * POST /api/verification/email/send
 */
router.post('/email/send',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
      throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
    }

    const verification = createEmailVerification(email, req.user.id);
    dataAudit('verification.email_sent', req, 'email_verification', verification.id);

    // SECURITY FIX (C-10): The verification token is NEVER returned in the
    // API response, even in development. The token is sent via the email
    // transport only. To test locally, query the verification store
    // directly (or use the dedicated /dev/get-token endpoint guarded by
    // NODE_ENV !== 'production').
    res.status(201).json({
      success: true,
      message: 'Verification email sent',
      verification: {
        id: verification.id,
        email: verification.email,
        expiresAt: verification.expiresAt,
      }
    });
  })
);

/**
 * Verify email token
 * GET /api/verification/email/:token
 */
router.get('/email/:token',
  asyncHandler(async (req, res) => {
    const result = verifyEmailToken(req.params.token);

    if (!result.success) {
      throw new AppError(result.error, 400, 'VERIFICATION_FAILED');
    }

    res.json({
      success: true,
      message: 'Email verified',
      verification: result.verification
    });
  })
);

/**
 * Check email format
 * POST /api/verification/email/check
 */
router.post('/email/check',
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
      throw new AppError('Email is required', 400, 'VALIDATION_ERROR');
    }

    const result = checkEmailFormat(email);
    res.json({ success: true, check: result });
  })
);

// ============ PHONE VERIFICATION ============

/**
 * Send phone OTP
 * POST /api/verification/phone/send
 */
router.post('/phone/send',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      throw new AppError('Phone is required', 400, 'VALIDATION_ERROR');
    }

    const verification = createPhoneVerification(phone, req.user.id);
    dataAudit('verification.phone_otp_sent', req, 'phone_verification', verification.id);

    // In production, would send SMS
    res.status(201).json({
      success: true,
      message: 'OTP sent to phone',
      verification: {
        id: verification.id,
        phone: verification.phone,
        expiresAt: verification.expiresAt
      }
    });
  })
);

/**
 * Verify phone OTP
 * POST /api/verification/phone/verify
 */
router.post('/phone/verify',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      throw new AppError('Phone and OTP are required', 400, 'VALIDATION_ERROR');
    }

    const result = verifyPhoneOTP(phone, otp);
    if (!result.success) {
      throw new AppError(result.error, 400, 'VERIFICATION_FAILED');
    }

    dataAudit('verification.phone_verified', req, 'phone_verification', result.verification.id);

    res.json({ success: true, message: 'Phone verified', verification: result.verification });
  })
);

/**
 * Check phone format
 * POST /api/verification/phone/check
 */
router.post('/phone/check',
  asyncHandler(async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      throw new AppError('Phone is required', 400, 'VALIDATION_ERROR');
    }

    const result = checkPhoneFormat(phone);
    res.json({ success: true, check: result });
  })
);

// ============ DOMAIN VERIFICATION ============

/**
 * Create domain verification
 * POST /api/verification/domain
 */
router.post('/domain',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { domain, method = 'dns' } = req.body;
    if (!domain) {
      throw new AppError('Domain is required', 400, 'VALIDATION_ERROR');
    }

    const verification = createDomainVerification(domain, req.user.organizationId, method);
    dataAudit('verification.domain_initiated', req, 'domain_verification', verification.id);

    res.status(201).json({
      success: true,
      message: 'Domain verification initiated',
      verification: {
        id: verification.id,
        domain: verification.domain,
        method: verification.method,
        expiresAt: verification.expiresAt,
        instructions: method === 'dns' ? {
          type: 'DNS TXT Record',
          host: `_corpid-verify.${domain}`,
          value: verification.token
        } : method === 'meta_tag' ? {
          type: 'HTML Meta Tag',
          tag: verification.metaTag
        } : {
          type: 'File',
          path: verification.filePath,
          content: verification.fileContent
        }
      }
    });
  })
);

/**
 * Check domain verification
 * POST /api/verification/domain/check
 */
router.post('/domain/check',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { domain, method, token } = req.body;
    if (!domain || !method || !token) {
      throw new AppError('Domain, method, and token are required', 400, 'VALIDATION_ERROR');
    }

    const result = checkDomainVerification(domain, method, token);
    if (!result.verified) {
      throw new AppError(result.error, 400, 'VERIFICATION_FAILED');
    }

    dataAudit('verification.domain_verified', req, 'domain_verification', result.verification.id);

    res.json({ success: true, message: 'Domain verified', verification: result.verification });
  })
);

// ============ BUSINESS VERIFICATION ============

/**
 * Create business verification
 * POST /api/verification/business
 */
router.post('/business',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { businessId, legalName, registrationNumber, taxId } = req.body;
    if (!businessId || !legalName) {
      throw new AppError('Business ID and legal name are required', 400, 'VALIDATION_ERROR');
    }

    const verification = createBusinessVerification({
      businessId, legalName, registrationNumber, taxId
    });

    dataAudit('verification.business_initiated', req, 'business_verification', verification.id);

    res.status(201).json({
      success: true,
      message: 'Business verification initiated',
      verification
    });
  })
);

/**
 * Get business verification
 * GET /api/verification/business/:id
 */
router.get('/business/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const verification = businessVerifications.get(req.params.id);
    if (!verification) {
      throw new AppError('Business verification not found', 404, 'VERIFICATION_NOT_FOUND');
    }
    res.json({ success: true, verification });
  })
);

// ============ EMPLOYEE VERIFICATION ============

/**
 * Create employee verification
 * POST /api/verification/employee
 */
router.post('/employee',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { employeeId, organizationId, email, workEmail, department, title, managerId } = req.body;
    if (!employeeId || !organizationId) {
      throw new AppError('Employee ID and organization ID are required', 400, 'VALIDATION_ERROR');
    }

    const verification = createEmployeeVerification({
      userId: req.user.id,
      employeeId, organizationId, email, workEmail, department, title, managerId
    });

    dataAudit('verification.employee_initiated', req, 'employee_verification', verification.id);

    res.status(201).json({
      success: true,
      message: 'Employee verification initiated',
      verification
    });
  })
);

/**
 * Get employee verification
 * GET /api/verification/employee/:id
 */
router.get('/employee/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const verification = employeeVerifications.get(req.params.id);
    if (!verification) {
      throw new AppError('Employee verification not found', 404, 'VERIFICATION_NOT_FOUND');
    }
    if (verification.userId !== req.user.id) {
      throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }
    res.json({ success: true, verification });
  })
);

// ============ STATS ============

/**
 * Get verification statistics
 * GET /api/verification/stats
 */
router.get('/stats',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const stats = getVerificationStats();
    res.json({ success: true, stats });
  })
);

export default router;
