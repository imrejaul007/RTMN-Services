import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CustomerOpsBridge } from '../services/customerOpsBridge';
import { TransferRequest, createTransferRequest } from '../models/FinanceProfile';
import winston from 'winston';

// In-memory storage for demo (replace with database in production)
const transfers: Map<string, TransferRequest> = new Map();

/**
 * Remittance Routes
 * Handles money transfers and remittance operations
 */
export default function remittanceRoutes(
  customerOpsBridge: CustomerOpsBridge,
  logger: winston.Logger
): Router {
  const router = Router();

  /**
   * POST /api/remittance/transfer
   * Initiate a new money transfer
   */
  router.post('/transfer', async (req: Request, res: Response) => {
    try {
      const {
        senderId,
        senderAccountId,
        recipientId,
        recipientName,
        recipientBank,
        recipientAccountNumber,
        amount,
        currency,
        targetCurrency,
        purpose,
        reference,
        notes,
        urgency = 'standard'
      } = req.body;

      // Validation
      if (!senderId || !recipientId || !recipientName || !amount || !currency) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: senderId, recipientId, recipientName, amount, currency'
        });
      }

      // Create transfer request
      const transfer = createTransferRequest({
        senderId,
        senderAccountId,
        recipientId,
        recipientAccountId: recipientAccountNumber,
        recipientName,
        recipientBank,
        recipientAccountNumber,
        amount,
        currency,
        targetCurrency: targetCurrency || currency,
        exchangeRate: targetCurrency && targetCurrency !== currency ? 0.012 : 1,
        fee: calculateTransferFee(amount, urgency),
        totalAmount: amount + calculateTransferFee(amount, urgency),
        purpose,
        reference,
        notes,
        urgency
      });

      // Trust Intelligence check
      const trustCheck = await customerOpsBridge.checkTrustScore(senderId);
      transfer.trustScore = trustCheck.score;
      transfer.complianceCheckPassed = trustCheck.compliant;

      if (!transfer.complianceCheckPassed) {
        transfer.status = 'failed';
        transfer.failureReason = 'Compliance check failed';
        transfers.set(transfer.id!, transfer);
        return res.status(400).json({
          success: false,
          error: 'Transfer failed compliance check',
          transfer,
          trustCheck
        });
      }

      // Process transfer through customer ops bridge
      const processedTransfer = await customerOpsBridge.processTransfer(transfer);

      // Store transfer
      transfers.set(processedTransfer.id!, processedTransfer);

      // Publish event
      await customerOpsBridge.publishTransferEvent(processedTransfer, 'initiated');

      logger.info({
        action: 'transfer_initiated',
        transferId: processedTransfer.id,
        senderId,
        recipientId,
        amount,
        currency
      });

      res.status(201).json({
        success: true,
        transfer: processedTransfer,
        message: 'Transfer initiated successfully'
      });
    } catch (error: any) {
      logger.error({
        action: 'transfer_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/remittance/quote
   * Get a transfer quote
   */
  router.get('/quote', async (req: Request, res: Response) => {
    try {
      const { amount, currency, targetCurrency, urgency = 'standard' } = req.query;

      if (!amount || !currency) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: amount, currency'
        });
      }

      const amountNum = parseFloat(amount as string);
      const fee = calculateTransferFee(amountNum, urgency as string);
      const exchangeRate = targetCurrency && targetCurrency !== currency
        ? getExchangeRate(currency as string, targetCurrency as string)
        : 1;
      const convertedAmount = amountNum * exchangeRate;

      const quote = {
        id: `Q-${uuidv4().substring(0, 8).toUpperCase()}`,
        amount: amountNum,
        currency: currency as string,
        targetCurrency: (targetCurrency || currency) as string,
        exchangeRate,
        convertedAmount,
        fee,
        totalAmount: amountNum + fee,
        totalWithConversion: convertedAmount + fee,
        urgency: urgency as string,
        estimatedDelivery: getDeliveryEstimate(urgency as string),
        validUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        createdAt: new Date().toISOString()
      };

      res.json({
        success: true,
        quote
      });
    } catch (error: any) {
      logger.error({
        action: 'quote_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/remittance/history
   * Get transfer history
   */
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const { accountId, status, startDate, endDate, limit = 50, offset = 0 } = req.query;

      let filteredTransfers = Array.from(transfers.values());

      // Filter by account
      if (accountId) {
        filteredTransfers = filteredTransfers.filter(
          t => t.senderAccountId === accountId || t.senderId === accountId
        );
      }

      // Filter by status
      if (status) {
        filteredTransfers = filteredTransfers.filter(t => t.status === status);
      }

      // Filter by date range
      if (startDate) {
        filteredTransfers = filteredTransfers.filter(
          t => new Date(t.createdAt!) >= new Date(startDate as string)
        );
      }
      if (endDate) {
        filteredTransfers = filteredTransfers.filter(
          t => new Date(t.createdAt!) <= new Date(endDate as string)
        );
      }

      // Sort by date descending
      filteredTransfers.sort((a, b) =>
        new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      );

      // Paginate
      const total = filteredTransfers.length;
      const paginatedTransfers = filteredTransfers.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        success: true,
        transfers: paginatedTransfers,
        pagination: {
          total,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          hasMore: parseInt(offset as string) + paginatedTransfers.length < total
        }
      });
    } catch (error: any) {
      logger.error({
        action: 'history_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/remittance/:id
   * Get transfer by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const transfer = transfers.get(id);

      if (!transfer) {
        return res.status(404).json({
          success: false,
          error: 'Transfer not found'
        });
      }

      res.json({
        success: true,
        transfer
      });
    } catch (error: any) {
      logger.error({
        action: 'get_transfer_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/remittance/:id/cancel
   * Cancel a pending transfer
   */
  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const transfer = transfers.get(id);

      if (!transfer) {
        return res.status(404).json({
          success: false,
          error: 'Transfer not found'
        });
      }

      if (transfer.status !== 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Only pending transfers can be cancelled'
        });
      }

      transfer.status = 'cancelled';
      transfer.failureReason = reason || 'Cancelled by sender';
      transfer.completedAt = new Date();

      transfers.set(id, transfer);

      await customerOpsBridge.publishTransferEvent(transfer, 'cancelled');

      logger.info({
        action: 'transfer_cancelled',
        transferId: id,
        reason
      });

      res.json({
        success: true,
        transfer,
        message: 'Transfer cancelled successfully'
      });
    } catch (error: any) {
      logger.error({
        action: 'cancel_transfer_error',
        error: error.message
      });
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
}

/**
 * Calculate transfer fee based on amount and urgency
 */
function calculateTransferFee(amount: number, urgency: string): number {
  let feePercentage = 0.01; // 1% base fee

  switch (urgency) {
    case 'instant':
      feePercentage = 0.025; // 2.5%
      break;
    case 'express':
      feePercentage = 0.015; // 1.5%
      break;
    default:
      feePercentage = 0.01; // 1%
  }

  const fee = amount * feePercentage;
  return Math.max(fee, 1); // Minimum fee of 1
}

/**
 * Get exchange rate (simplified - use real API in production)
 */
function getExchangeRate(from: string, to: string): number {
  const rates: { [key: string]: { [key: string]: number } } = {
    USD: { EUR: 0.92, GBP: 0.79, INR: 83.12, JPY: 149.50 },
    EUR: { USD: 1.09, GBP: 0.86, INR: 90.50, JPY: 162.80 },
    GBP: { USD: 1.27, EUR: 1.16, INR: 105.20, JPY: 189.30 },
    INR: { USD: 0.012, EUR: 0.011, GBP: 0.0095, JPY: 1.80 }
  };

  if (from === to) return 1;
  return rates[from]?.[to] || 1;
}

/**
 * Get estimated delivery time
 */
function getDeliveryEstimate(urgency: string): string {
  switch (urgency) {
    case 'instant':
      return 'Within 1 minute';
    case 'express':
      return 'Within 2 hours';
    default:
      return 'Within 1-3 business days';
  }
}
