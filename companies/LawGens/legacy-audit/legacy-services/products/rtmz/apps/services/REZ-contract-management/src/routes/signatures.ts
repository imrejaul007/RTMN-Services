import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { signatureService } from '../services/signatureService';
import { logger } from '../utils/logger';

const router = Router();

const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

router.get('/:contractId/signatures',
  [
    param('contractId').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const status = await signatureService.getSignatureStatus(
        req.params.contractId,
        tenantId
      );

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error fetching signature status', { error, contractId: req.params.contractId });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/:contractId/sign',
  [
    param('contractId').isString().trim().notEmpty(),
    body('signatureToken').isString().trim().notEmpty().withMessage('Signature token is required'),
    body('signatureData').isString().withMessage('Signature data is required')
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await signatureService.signContract({
        signatureToken: req.body.signatureToken,
        signatureData: req.body.signatureData,
        ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: {
          message: result.remainingSignatures > 0
            ? `Contract signed. ${result.remainingSignatures} signature(s) remaining.`
            : 'Contract fully signed by all parties.',
          contractId: result.contractId,
          remainingSignatures: result.remainingSignatures
        }
      });
    } catch (error) {
      logger.error('Error signing contract', { error, contractId: req.params.contractId });
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/:contractId/decline',
  [
    param('contractId').isString().trim().notEmpty(),
    body('signatureToken').isString().trim().notEmpty().withMessage('Signature token is required'),
    body('reason').isString().trim().notEmpty().withMessage('Decline reason is required')
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      await signatureService.declineSignature({
        signatureToken: req.body.signatureToken,
        reason: req.body.reason
      });

      res.json({
        success: true,
        data: {
          message: 'Signature declined successfully'
        }
      });
    } catch (error) {
      logger.error('Error declining signature', { error, contractId: req.params.contractId });
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/:signatureId/resend',
  [
    param('signatureId').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      await signatureService.resendSignatureRequest(req.params.signatureId, tenantId);

      res.json({
        success: true,
        data: {
          message: 'Signature request resent successfully'
        }
      });
    } catch (error) {
      logger.error('Error resending signature request', { error, signatureId: req.params.signatureId });
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/verify/:token',
  [
    param('token').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const signature = await signatureService.getSignatureByToken(req.params.token);

      if (!signature) {
        res.status(404).json({
          success: false,
          error: 'Signature request not found'
        });
        return;
      }

      const isValid = signature.status === 'pending' && new Date() < signature.tokenExpiry;

      res.json({
        success: true,
        data: {
          valid: isValid,
          status: signature.status,
          contractId: signature.contractId,
          partyName: signature.partyName,
          partyEmail: signature.partyEmail,
          partyRole: signature.partyRole,
          expiryDate: signature.tokenExpiry,
          signedAt: signature.signedAt
        }
      });
    } catch (error) {
      logger.error('Error verifying signature token', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/pending',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { page = 1, limit = 20 } = req.query;

      const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

      const { Signature } = await import('../models/Signature');
      const query = { tenantId, status: 'pending' };

      const [signatures, total] = await Promise.all([
        Signature.find(query)
          .sort({ sentAt: -1 })
          .skip(skip)
          .limit(parseInt(limit as string, 10))
          .lean(),
        Signature.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: signatures,
        pagination: {
          page: parseInt(page as string, 10),
          limit: parseInt(limit as string, 10),
          total,
          pages: Math.ceil(total / parseInt(limit as string, 10))
        }
      });
    } catch (error) {
      logger.error('Error fetching pending signatures', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

export default router;
