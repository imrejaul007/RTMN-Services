import { Router, Request, Response, NextFunction } from 'express';
import { contractService } from '../services/contract.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Error handling wrapper
 */
const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Create a new contract
 * POST /contracts
 */
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { type, parties, terms, machineReadable, expiresAt, metadata } = req.body;

      if (!type || !parties || !terms) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: type, parties, terms',
        });
        return;
      }

      if (!parties.buyer || !parties.seller) {
        res.status(400).json({
          success: false,
          error: 'Both buyer and seller parties are required',
        });
        return;
      }

      const contract = await contractService.createContract({
        type,
        parties,
        terms,
        machineReadable,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        metadata,
      });

      logger.info('Contract created via API', { contractId: contract.contractId });

      res.status(201).json({
        success: true,
        data: contract,
        message: 'Contract created successfully',
      });
    } catch (error: any) {
      logger.error('Failed to create contract', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get contract by ID
 * GET /contracts/:contractId
 */
router.get(
  '/:contractId',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { contractId } = req.params;

      const contract = await contractService.getContract(contractId);

      res.json({
        success: true,
        data: contract,
      });
    } catch (error: any) {
      logger.error('Failed to get contract', { error: error.message });

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Update contract
 * PUT /contracts/:contractId
 */
router.put(
  '/:contractId',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { contractId } = req.params;
      const { terms, machineReadable, status, expiresAt, metadata } = req.body;

      const contract = await contractService.updateContract(contractId, {
        terms,
        machineReadable,
        status,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        metadata,
      });

      logger.info('Contract updated via API', { contractId });

      res.json({
        success: true,
        data: contract,
        message: 'Contract updated successfully',
      });
    } catch (error: any) {
      logger.error('Failed to update contract', { error: error.message });

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get entity's contracts
 * GET /contracts/entity/:entityId
 */
router.get(
  '/entity/:entityId',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { entityId } = req.params;
      const { status, type, limit, offset } = req.query;

      const contracts = await contractService.getContracts(entityId, {
        status: status as string,
        type: type as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({
        success: true,
        data: contracts,
        count: contracts.length,
      });
    } catch (error: any) {
      logger.error('Failed to get entity contracts', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Sign contract
 * POST /contracts/:contractId/sign
 */
router.post(
  '/:contractId/sign',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { contractId } = req.params;
      const { party, signedBy, signature } = req.body;

      if (!party || !signedBy) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: party, signedBy',
        });
        return;
      }

      if (!['buyer', 'seller'].includes(party)) {
        res.status(400).json({
          success: false,
          error: 'Invalid party. Must be "buyer" or "seller"',
        });
        return;
      }

      const result = await contractService.signContract(contractId, party, signedBy, signature);

      logger.info('Contract signed via API', { contractId, party });

      res.json({
        success: true,
        data: result,
        message: `Contract signed by ${party}`,
      });
    } catch (error: any) {
      logger.error('Failed to sign contract', { error: error.message });

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Execute contract
 * POST /contracts/:contractId/execute
 */
router.post(
  '/:contractId/execute',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { contractId } = req.params;
      const { action, params, triggeredBy } = req.body;

      if (!action) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: action',
        });
        return;
      }

      const result = await contractService.executeContract(contractId, {
        action,
        params,
        triggeredBy,
      });

      logger.info('Contract executed via API', { contractId, action });

      res.json({
        success: true,
        data: result,
        message: `Action ${action} executed successfully`,
      });
    } catch (error: any) {
      logger.error('Failed to execute contract', { error: error.message });

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get execution history
 * GET /contracts/:contractId/history
 */
router.get(
  '/:contractId/history',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { contractId } = req.params;
      const { limit } = req.query;

      const history = await contractService.getExecutionHistory(
        contractId,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({
        success: true,
        data: history,
        count: history.length,
      });
    } catch (error: any) {
      logger.error('Failed to get execution history', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Validate contract
 * POST /contracts/:contractId/validate
 */
router.post(
  '/:contractId/validate',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const { contractId } = req.params;

      const validation = await contractService.validateContract(contractId);

      res.json({
        success: true,
        data: validation,
      });
    } catch (error: any) {
      logger.error('Failed to validate contract', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

/**
 * Get contract statistics
 * GET /contracts/stats
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await contractService.getContractStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Failed to get contract stats', { error: error.message });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  })
);

export default router;