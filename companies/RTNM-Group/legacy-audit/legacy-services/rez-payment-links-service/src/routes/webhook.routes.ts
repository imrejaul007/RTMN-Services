import { Router, Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import { logger } from '../utils/logger';

const router = Router();

const verifyWebhookSignature = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const signature = req.headers['x-webhook-signature'] as string;

  // SECURITY FIX: Fail at startup if WEBHOOK_SECRET is not set
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    logger.error('[FATAL] WEBHOOK_SECRET environment variable is required');
    res.status(500).json({
      success: false,
      error: 'Server misconfiguration'
    });
    return;
  }

  if (!signature) {
    logger.warn('Webhook request without signature', {
      ip: req.ip,
      path: req.path
    });
    res.status(401).json({
      success: false,
      error: 'Missing webhook signature'
    });
    return;
  }

  // SECURITY FIX: Use crypto module (already imported in project)
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  // SECURITY FIX: Use timing-safe comparison to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    logger.warn('Webhook signature verification failed', {
      ip: req.ip,
      path: req.path
    });
    res.status(401).json({
      success: false,
      error: 'Invalid webhook signature'
    });
    return;
  }

  next();
};

router.post(
  '/payment',
  verifyWebhookSignature,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = req.body;

      logger.info('Payment webhook received', {
        transactionId: payload.transactionId,
        status: payload.status
      });

      if (!payload.transactionId || !payload.merchantId) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: transactionId, merchantId'
        });
        return;
      }

      const paymentLink = await paymentService.handlePaymentWebhook({
        transactionId: payload.transactionId,
        upiId: payload.upiId,
        amount: payload.amount,
        status: payload.status,
        timestamp: payload.timestamp || new Date().toISOString(),
        merchantId: payload.merchantId,
        metadata: payload.metadata
      });

      if (!paymentLink) {
        res.status(404).json({
          success: false,
          error: 'No matching payment link found'
        });
        return;
      }

      logger.info('Payment webhook processed', {
        paymentLinkId: paymentLink.id,
        newStatus: paymentLink.status
      });

      res.json({
        success: true,
        received: true
      });
    } catch (error) {
      logger.error('Webhook processing error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }
);

router.post(
  '/refund',
  verifyWebhookSignature,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = req.body;

      logger.info('Refund webhook received', {
        refundId: payload.refundId,
        status: payload.status
      });

      if (!payload.refundId) {
        res.status(400).json({
          success: false,
          error: 'Missing refundId'
        });
        return;
      }

      const refund = paymentService.getRefund(payload.refundId);

      if (refund) {
        logger.info('Refund webhook processed', {
          refundId: payload.refundId,
          status: payload.status
        });
      }

      res.json({
        success: true,
        received: true
      });
    } catch (error) {
      logger.error('Refund webhook processing error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Webhook processing failed'
      });
    }
  }
);

export default router;
