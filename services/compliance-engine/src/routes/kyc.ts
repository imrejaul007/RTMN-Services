/**
 * KYC Routes
 * Know Your Customer endpoints
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { kycStore, KYCRequest, Document, VerificationLevel } from '../models/KYC';
import { AuditAction, AuditEntityType, auditStore } from '../models/Audit';
import { AuditLogger } from '../services/auditLogger';
import { KYCValidator } from '../services/validator';
import { KYCChecker } from '../services/kycChecker';
import { logger } from '../index';

const router = Router();
const auditLogger = new AuditLogger(logger);
const validator = new KYCValidator();
const kycChecker = new KYCChecker();

// Create new KYC record
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, verificationLevel, personalInfo, businessInfo, documents } = req.body;

    // Validate required fields
    if (!userId || !verificationLevel) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['userId', 'verificationLevel']
      });
    }

    // Check if user already has KYC
    const existingKYC = kycStore.getKYCByUserId(userId);
    if (existingKYC) {
      return res.status(409).json({
        error: 'KYC already exists for this user',
        kycId: existingKYC.id,
        status: existingKYC.status
      });
    }

    // Validate verification level
    if (!Object.values(VerificationLevel).includes(verificationLevel)) {
      return res.status(400).json({
        error: 'Invalid verification level',
        validLevels: Object.values(VerificationLevel)
      });
    }

    // Validate personal/business info if provided
    if (personalInfo) {
      const validation = validator.validatePersonalInfo(personalInfo);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid personal information',
          details: validation.errors
        });
      }
    }

    const kycRequest: KYCRequest = {
      userId,
      verificationLevel,
      personalInfo,
      businessInfo,
      documents
    };

    const kyc = kycStore.createKYC(kycRequest);

    // Log the action
    auditLogger.logAction(
      AuditAction.KYC_CREATED,
      AuditEntityType.KYC_RECORD,
      kyc.id,
      userId,
      'SYSTEM',
      'service',
      { verificationLevel, status: kyc.status },
      'success',
      req.headers['x-request-id'] as string
    );

    res.status(201).json({
      success: true,
      kyc: {
        id: kyc.id,
        userId: kyc.userId,
        status: kyc.status,
        verificationLevel: kyc.verificationLevel,
        expiresAt: kyc.expiresAt,
        createdAt: kyc.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating KYC', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to create KYC record' });
  }
});

// Get KYC by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if it's a user ID
    let kyc = kycStore.getKYCById(id);
    if (!kyc) {
      kyc = kycStore.getKYCByUserId(id);
    }

    if (!kyc) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    // Log data access
    auditLogger.logAction(
      AuditAction.DATA_ACCESSED,
      AuditEntityType.KYC_RECORD,
      kyc.id,
      kyc.userId,
      'SYSTEM',
      'service',
      undefined,
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({ kyc });
  } catch (error) {
    logger.error('Error fetching KYC', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch KYC record' });
  }
});

// Get KYC by user ID
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const kyc = kycStore.getKYCByUserId(userId);

    if (!kyc) {
      return res.status(404).json({ error: 'KYC record not found for user' });
    }

    res.json({ kyc });
  } catch (error) {
    logger.error('Error fetching KYC', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch KYC record' });
  }
});

// Upload document
router.post('/:id/documents', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const document: Document = {
      id: `DOC-${uuidv4()}`,
      type: req.body.type,
      documentNumber: req.body.documentNumber,
      issuingCountry: req.body.issuingCountry,
      expiryDate: new Date(req.body.expiryDate),
      verificationStatus: 'pending',
      fileUrl: req.body.fileUrl,
      uploadedAt: new Date()
    };

    const kyc = kycStore.getKYCById(id);
    if (!kyc) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    const updatedKYC = kycStore.addDocument(id, document);

    // Log document upload
    auditLogger.logAction(
      AuditAction.KYC_DOCUMENT_UPLOADED,
      AuditEntityType.DOCUMENT,
      document.id,
      kyc.userId,
      'SYSTEM',
      'service',
      { documentType: document.type, kycId: id },
      'success',
      req.headers['x-request-id'] as string
    );

    res.status(201).json({
      success: true,
      document: {
        id: document.id,
        type: document.type,
        verificationStatus: document.verificationStatus,
        uploadedAt: document.uploadedAt
      },
      kyc: updatedKYC
    });
  } catch (error) {
    logger.error('Error uploading document', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Verify document
router.post('/:id/documents/:documentId/verify', async (req: Request, res: Response) => {
  try {
    const { id, documentId } = req.params;
    const { status, verifiedBy, rejectionReason } = req.body;

    if (!status || !['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        error: 'Invalid verification status',
        validStatuses: ['verified', 'rejected']
      });
    }

    const kyc = kycStore.getKYCById(id);
    if (!kyc) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    const updatedKYC = kycStore.verifyDocument(id, documentId, {
      status,
      verifiedBy: verifiedBy || 'SYSTEM',
      rejectionReason
    });

    if (!updatedKYC) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Log verification
    auditLogger.logAction(
      status === 'verified' ? AuditAction.KYC_DOCUMENT_VERIFIED : AuditAction.KYC_DOCUMENT_REJECTED,
      AuditEntityType.DOCUMENT,
      documentId,
      kyc.userId,
      verifiedBy || 'SYSTEM',
      'user',
      { kycId: id, documentId, status },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      kyc: updatedKYC
    });
  } catch (error) {
    logger.error('Error verifying document', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to verify document' });
  }
});

// Approve KYC
router.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { verifiedBy } = req.body;

    const kyc = kycStore.getKYCById(id);
    if (!kyc) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    // Run KYC checks before approval
    const checks = await kycChecker.performAllChecks(kyc);

    if (checks.some(check => check.status === 'fail' && check.required)) {
      return res.status(400).json({
        error: 'KYC validation failed',
        checks
      });
    }

    const updatedKYC = kycStore.approveKYC(id, verifiedBy || 'SYSTEM');

    // Log approval
    auditLogger.logAction(
      AuditAction.KYC_APPROVED,
      AuditEntityType.KYC_RECORD,
      id,
      kyc.userId,
      verifiedBy || 'SYSTEM',
      'user',
      { previousStatus: kyc.status },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      kyc: updatedKYC
    });
  } catch (error) {
    logger.error('Error approving KYC', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to approve KYC' });
  }
});

// Reject KYC
router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { verifiedBy, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const kyc = kycStore.getKYCById(id);
    if (!kyc) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    const updatedKYC = kycStore.rejectKYC(id, verifiedBy || 'SYSTEM', reason);

    // Log rejection
    auditLogger.logAction(
      AuditAction.KYC_REJECTED,
      AuditEntityType.KYC_RECORD,
      id,
      kyc.userId,
      verifiedBy || 'SYSTEM',
      'user',
      { previousStatus: kyc.status, reason },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      kyc: updatedKYC
    });
  } catch (error) {
    logger.error('Error rejecting KYC', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to reject KYC' });
  }
});

// Get KYC statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const allKYC = kycStore.getAllKYCRecords();
    const expiredKYC = kycStore.getExpiredKYC();

    const summary = {
      total: allKYC.length,
      byStatus: {} as Record<string, number>,
      byVerificationLevel: {} as Record<string, number>,
      expired: expiredKYC.length,
      averageRiskScore: 0
    };

    allKYC.forEach(kyc => {
      summary.byStatus[kyc.status] = (summary.byStatus[kyc.status] || 0) + 1;
      summary.byVerificationLevel[kyc.verificationLevel] = (summary.byVerificationLevel[kyc.verificationLevel] || 0) + 1;
      summary.averageRiskScore += kyc.riskScore;
    });

    if (allKYC.length > 0) {
      summary.averageRiskScore = Math.round(summary.averageRiskScore / allKYC.length);
    }

    res.json({ summary });
  } catch (error) {
    logger.error('Error fetching KYC stats', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Update KYC
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const kyc = kycStore.getKYCById(id);
    if (!kyc) {
      return res.status(404).json({ error: 'KYC record not found' });
    }

    const previousState = { ...kyc };
    const updatedKYC = kycStore.updateKYC(id, updates);

    // Log update
    auditLogger.logAction(
      AuditAction.KYC_UPDATED,
      AuditEntityType.KYC_RECORD,
      id,
      kyc.userId,
      'SYSTEM',
      'service',
      { previousState, newState: updatedKYC },
      'success',
      req.headers['x-request-id'] as string
    );

    res.json({
      success: true,
      kyc: updatedKYC
    });
  } catch (error) {
    logger.error('Error updating KYC', { error, requestId: req.headers['x-request-id'] });
    res.status(500).json({ error: 'Failed to update KYC' });
  }
});

export default router;
