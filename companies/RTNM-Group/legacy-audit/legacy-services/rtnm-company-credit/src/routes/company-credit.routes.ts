import { Router, Request, Response } from 'express';
import { companyCreditService } from '../services/company-credit.service';
import { RiskLevel } from '../models/company-credit.model';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /credit/:corpId
 * Get credit information for a company
 */
router.get('/credit/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    const credit = await companyCreditService.getCredit(corpId);

    if (!credit) {
      return res.status(404).json({
        success: false,
        error: 'Credit record not found',
        corpId,
      });
    }

    return res.status(200).json({
      success: true,
      data: credit,
    });
  } catch (error) {
    logger.error('Error in GET /credit/:corpId', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * PUT /credit/:corpId
 * Update credit information for a company
 */
router.put('/credit/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const updateData = req.body;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    // Validate risk level if provided
    if (updateData.riskLevel && !Object.values(RiskLevel).includes(updateData.riskLevel)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid risk level',
        validValues: Object.values(RiskLevel),
      });
    }

    // Validate numeric fields
    if (updateData.creditLimit !== undefined && updateData.creditLimit < 0) {
      return res.status(400).json({
        success: false,
        error: 'creditLimit must be non-negative',
      });
    }

    if (updateData.currentUtilization !== undefined && updateData.currentUtilization < 0) {
      return res.status(400).json({
        success: false,
        error: 'currentUtilization must be non-negative',
      });
    }

    if (updateData.creditScore !== undefined && (updateData.creditScore < 300 || updateData.creditScore > 900)) {
      return res.status(400).json({
        success: false,
        error: 'creditScore must be between 300 and 900',
      });
    }

    if (updateData.paymentTermsDays !== undefined && (updateData.paymentTermsDays < 0 || updateData.paymentTermsDays > 180)) {
      return res.status(400).json({
        success: false,
        error: 'paymentTermsDays must be between 0 and 180',
      });
    }

    const credit = await companyCreditService.updateCredit(corpId, updateData);

    return res.status(200).json({
      success: true,
      data: credit,
      message: 'Credit updated successfully',
    });
  } catch (error) {
    logger.error('Error in PUT /credit/:corpId', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /can-extend-credit
 * Check if credit can be extended to a company
 */
router.post('/can-extend-credit', async (req: Request, res: Response) => {
  try {
    const { corpId, amount } = req.body;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    if (amount === undefined || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number',
      });
    }

    const result = await companyCreditService.canExtendCredit(corpId, amount);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in POST /can-extend-credit', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /terms/:corpId
 * Get payment terms for a company
 */
router.get('/terms/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    const terms = await companyCreditService.getPaymentTerms(corpId);

    if (!terms) {
      return res.status(404).json({
        success: false,
        error: 'Payment terms not found',
        corpId,
      });
    }

    return res.status(200).json({
      success: true,
      data: terms,
    });
  } catch (error) {
    logger.error('Error in GET /terms/:corpId', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /payment
 * Record a payment transaction
 */
router.post('/payment', async (req: Request, res: Response) => {
  try {
    const { corpId, amount, status, description, dueDate } = req.body;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number',
      });
    }

    const credit = await companyCreditService.recordPayment(corpId, {
      amount,
      status,
      description: description || 'Payment transaction',
      dueDate: dueDate ? new Date(dueDate) : undefined,
    });

    if (!credit) {
      return res.status(404).json({
        success: false,
        error: 'Credit record not found',
        corpId,
      });
    }

    return res.status(200).json({
      success: true,
      data: credit,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    logger.error('Error in POST /payment', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /utilization
 * Update credit utilization (for BNPL operations)
 */
router.post('/utilization', async (req: Request, res: Response) => {
  try {
    const { corpId, amount, operation } = req.body;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number',
      });
    }

    if (!operation || !['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        success: false,
        error: 'operation must be "add" or "subtract"',
      });
    }

    const credit = await companyCreditService.updateUtilization(corpId, amount, operation);

    if (!credit) {
      return res.status(404).json({
        success: false,
        error: 'Credit record not found',
        corpId,
      });
    }

    return res.status(200).json({
      success: true,
      data: credit,
      message: 'Utilization updated successfully',
    });
  } catch (error) {
    logger.error('Error in POST /utilization', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /credits
 * Get all companies with credit (admin view)
 */
router.get('/credits', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      riskLevel,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await companyCreditService.getAllCredits({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      riskLevel: riskLevel as RiskLevel | undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    });

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    logger.error('Error in GET /credits', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /risk-level/:corpId
 * Calculate risk level for a company
 */
router.get('/risk-level/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;

    if (!corpId) {
      return res.status(400).json({
        success: false,
        error: 'corpId is required',
      });
    }

    const riskLevel = await companyCreditService.calculateRiskLevel(corpId);

    return res.status(200).json({
      success: true,
      data: {
        corpId,
        riskLevel,
      },
    });
  } catch (error) {
    logger.error('Error in GET /risk-level/:corpId', { error });
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;