import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { contractService } from '../services/contractService';
import { pdfGenerator } from '../services/pdfGenerator';
import { workflowEngine } from '../services/workflowEngine';
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

router.post('/',
  [
    body('title').isString().trim().notEmpty().withMessage('Title is required'),
    body('type').isIn(['nda', 'msa', 'sow', 'employment', 'vendor', 'custom']).withMessage('Invalid contract type'),
    body('parties').isArray({ min: 1 }).withMessage('At least one party is required'),
    body('parties.*.name').isString().trim().notEmpty(),
    body('parties.*.email').isEmail().withMessage('Invalid email address'),
    body('parties.*.role').isIn(['signer', 'witness', 'approver']),
    body('content').isString(),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('endDate').isISO8601().withMessage('Invalid end date'),
    body('autoRenew').optional().isBoolean(),
    body('renewalTermMonths').optional().isInt({ min: 1 }),
    body('terms').optional().isArray()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';

      const contract = await contractService.create({
        title: req.body.title,
        type: req.body.type,
        parties: req.body.parties,
        content: req.body.content,
        variables: req.body.variables,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        autoRenew: req.body.autoRenew,
        renewalTermMonths: req.body.renewalTermMonths,
        terms: req.body.terms,
        createdBy: userId,
        tenantId
      });

      res.status(201).json({
        success: true,
        data: contract
      });
    } catch (error) {
      logger.error('Error creating contract', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['draft', 'pending_signature', 'partially_signed', 'signed', 'expired', 'terminated']),
    query('type').optional().isIn(['nda', 'msa', 'sow', 'employment', 'vendor', 'custom']),
    query('search').optional().isString()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { page, limit, status, type, search } = req.query;

      const result = await contractService.findAll({
        tenantId,
        status: status as string,
        type: type as string,
        search: search as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      });

      res.json({
        success: true,
        data: result.contracts,
        pagination: {
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? parseInt(limit as string, 10) : 20,
          total: result.total,
          pages: Math.ceil(result.total / (limit ? parseInt(limit as string, 10) : 20))
        }
      });
    } catch (error) {
      logger.error('Error fetching contracts', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/upcoming-renewals',
  [
    query('days').optional().isInt({ min: 1, max: 365 })
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;

      const renewals = await contractService.getUpcomingRenewals(tenantId, days);

      res.json({
        success: true,
        data: renewals,
        count: renewals.length
      });
    } catch (error) {
      logger.error('Error fetching upcoming renewals', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/stats',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const stats = await contractService.getStats(tenantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error fetching contract stats', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/:id',
  [
    param('id').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userEmail = req.headers['x-user-email'] as string;

      const contract = userEmail
        ? await contractService.findByIdWithAccess(req.params.id, tenantId, userEmail)
        : await contractService.findById(req.params.id, tenantId);

      if (!contract) {
        res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
        return;
      }

      res.json({
        success: true,
        data: contract
      });
    } catch (error) {
      logger.error('Error fetching contract', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.put('/:id',
  [
    param('id').isString().trim().notEmpty(),
    body('title').optional().isString().trim().notEmpty(),
    body('type').optional().isIn(['nda', 'msa', 'sow', 'employment', 'vendor', 'custom']),
    body('parties').optional().isArray(),
    body('content').optional().isString(),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('autoRenew').optional().isBoolean(),
    body('renewalTermMonths').optional().isInt({ min: 1 }),
    body('terms').optional().isArray()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';

      const updateData: Record<string, unknown> = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.type) updateData.type = req.body.type;
      if (req.body.parties) updateData.parties = req.body.parties;
      if (req.body.content) updateData.content = req.body.content;
      if (req.body.variables) updateData.variables = req.body.variables;
      if (req.body.startDate) updateData.startDate = new Date(req.body.startDate);
      if (req.body.endDate) updateData.endDate = new Date(req.body.endDate);
      if (req.body.autoRenew !== undefined) updateData.autoRenew = req.body.autoRenew;
      if (req.body.renewalTermMonths) updateData.renewalTermMonths = req.body.renewalTermMonths;
      if (req.body.terms) updateData.terms = req.body.terms;

      const contract = await contractService.update(
        req.params.id,
        tenantId,
        req.body,
        userId
      );

      if (!contract) {
        res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
        return;
      }

      res.json({
        success: true,
        data: contract,
        message: `Contract updated to version ${contract.metadata.version}`
      });
    } catch (error) {
      logger.error('Error updating contract', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.delete('/:id',
  [
    param('id').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const deleted = await contractService.delete(req.params.id, tenantId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Contract deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting contract', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.get('/:id/history',
  [
    param('id').isString().trim().notEmpty()
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const history = await contractService.getHistory(req.params.id, tenantId);

      if (!history) {
        res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
        return;
      }

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error fetching contract history', { error });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/:id/generate-pdf',
  [
    param('id').isString().trim().notEmpty(),
    body('includeSignaturePage').optional().isBoolean(),
    body('includeAuditTrail').optional().isBoolean(),
    body('includePartyDetails').optional().isBoolean(),
    body('pageSize').optional().isIn(['Letter', 'A4'])
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;

      const pdf = await pdfGenerator.generateContractPDF(req.params.id, tenantId, {
        includeSignaturePage: req.body.includeSignaturePage,
        includeAuditTrail: req.body.includeAuditTrail,
        includePartyDetails: req.body.includePartyDetails,
        pageSize: req.body.pageSize
      });

      res.json({
        success: true,
        data: {
          filename: pdf.filename,
          filepath: pdf.filepath,
          size: pdf.size,
          downloadUrl: `/contracts/${req.params.id}/download-pdf`
        }
      });
    } catch (error) {
      logger.error('Error generating PDF', { error, contractId: req.params.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

router.post('/:id/send-for-signature',
  [
    param('id').isString().trim().notEmpty(),
    body('parties').isArray({ min: 1 }).withMessage('At least one party is required'),
    body('parties.*.name').isString().trim().notEmpty(),
    body('parties.*.email').isEmail(),
    body('parties.*.role').isIn(['signer', 'witness', 'approver']),
    body('expiryDays').optional().isInt({ min: 1, max: 365 })
  ],
  validate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const userId = req.headers['x-user-id'] as string || 'system';

      const contract = await contractService.findById(req.params.id, tenantId);
      if (!contract) {
        res.status(404).json({
          success: false,
          error: 'Contract not found'
        });
        return;
      }

      await contractService.updateStatus(
        req.params.id,
        tenantId,
        'pending_signature',
        userId
      );

      const signatureResult = await (await import('../services/signatureService')).signatureService.sendForSignature({
        contractId: req.params.id,
        parties: req.body.parties,
        tenantId,
        requestedBy: userId,
        expiryDays: req.body.expiryDays
      });

      workflowEngine.startWorkflow('signature_workflow', req.params.id, tenantId, {
        parties: req.body.parties
      });

      res.json({
        success: true,
        data: {
          signatures: signatureResult.signatures,
          message: 'Signature requests sent successfully'
        }
      });
    } catch (error) {
      logger.error('Error sending for signature', { error, contractId: req.params.id });
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

export default router;
