import { Router, Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/paymentService';
import {
  CreatePaymentLinkRequest,
  RefundRequest,
  ShareRequest,
  PaymentStatus
} from '../models/PaymentLink';
import { logger } from '../utils/logger';

const router = Router();

interface AuthenticatedRequest extends Request {
  merchantId?: string;
}

const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: 'API key is required',
      code: 'MISSING_API_KEY'
    });
    return;
  }

  const validApiKeys: Record<string, string> = {
    'test-api-key-123': 'merchant-001',
    'test-api-key-456': 'merchant-002',
    [process.env.API_KEY || '']: process.env.MERCHANT_ID || ''
  };

  const merchantId = validApiKeys[apiKey];

  if (!merchantId) {
    res.status(401).json({
      success: false,
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
    return;
  }

  req.merchantId = merchantId;
  next();
};

const validateCreateRequest = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const { amount, purpose } = req.body;

  if (amount === undefined || amount === null) {
    res.status(400).json({
      success: false,
      error: 'Amount is required',
      code: 'MISSING_AMOUNT'
    });
    return;
  }

  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({
      success: false,
      error: 'Amount must be a positive number',
      code: 'INVALID_AMOUNT'
    });
    return;
  }

  if (amount > 1000000) {
    res.status(400).json({
      success: false,
      error: 'Amount exceeds maximum limit of 10,00,000 INR',
      code: 'AMOUNT_EXCEEDS_LIMIT'
    });
    return;
  }

  if (!purpose || typeof purpose !== 'string' || purpose.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Purpose is required',
      code: 'MISSING_PURPOSE'
    });
    return;
  }

  if (purpose.length > 200) {
    res.status(400).json({
      success: false,
      error: 'Purpose must be less than 200 characters',
      code: 'PURPOSE_TOO_LONG'
    });
    return;
  }

  next();
};

const validateRefundRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { paymentLinkId, reason } = req.body;

  if (!paymentLinkId) {
    res.status(400).json({
      success: false,
      error: 'Payment link ID is required',
      code: 'MISSING_PAYMENT_LINK_ID'
    });
    return;
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    res.status(400).json({
      success: false,
      error: 'Refund reason is required',
      code: 'MISSING_REASON'
    });
    return;
  }

  if (reason.length > 500) {
    res.status(400).json({
      success: false,
      error: 'Reason must be less than 500 characters',
      code: 'REASON_TOO_LONG'
    });
    return;
  }

  const { amount } = req.body;
  if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
    res.status(400).json({
      success: false,
      error: 'Refund amount must be a positive number',
      code: 'INVALID_REFUND_AMOUNT'
    });
    return;
  }

  next();
};

const validateShareRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { paymentLinkId, channels } = req.body;

  if (!paymentLinkId) {
    res.status(400).json({
      success: false,
      error: 'Payment link ID is required',
      code: 'MISSING_PAYMENT_LINK_ID'
    });
    return;
  }

  if (!channels || !Array.isArray(channels) || channels.length === 0) {
    res.status(400).json({
      success: false,
      error: 'At least one channel (SMS, WHATSAPP, or EMAIL) is required',
      code: 'MISSING_CHANNELS'
    });
    return;
  }

  const validChannels = ['SMS', 'WHATSAPP', 'EMAIL'];
  const invalidChannels = channels.filter((c: string) => !validChannels.includes(c));

  if (invalidChannels.length > 0) {
    res.status(400).json({
      success: false,
      error: `Invalid channels: ${invalidChannels.join(', ')}`,
      code: 'INVALID_CHANNELS'
    });
    return;
  }

  next();
};

router.post(
  '/',
  authMiddleware,
  validateCreateRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const request: CreatePaymentLinkRequest = {
        merchantId: req.merchantId!,
        amount: req.body.amount,
        currency: req.body.currency || 'INR',
        purpose: req.body.purpose.trim(),
        description: req.body.description?.trim(),
        customerName: req.body.customerName?.trim(),
        customerPhone: req.body.customerPhone?.trim(),
        customerEmail: req.body.customerEmail?.trim(),
        expiresIn: req.body.expiresIn,
        metadata: req.body.metadata,
        webhookUrl: req.body.webhookUrl?.trim(),
        redirectUrl: req.body.redirectUrl?.trim(),
        maxUsageCount: req.body.maxUsageCount
      };

      const result = await paymentService.createPaymentLink(request);

      logger.info('Payment link created via API', {
        paymentLinkId: result.id,
        merchantId: req.merchantId
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error creating payment link', {
        error: error instanceof Error ? error.message : 'Unknown error',
        merchantId: req.merchantId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create payment link',
        code: 'CREATE_FAILED'
      });
    }
  }
);

router.get(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const paymentLink = await paymentService.getPaymentLink(id);

      if (!paymentLink) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
          code: 'NOT_FOUND'
        });
        return;
      }

      if (paymentLink.merchantId !== req.merchantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      res.json({
        success: true,
        data: paymentLink
      });
    } catch (error) {
      logger.error('Error fetching payment link', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentLinkId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment link',
        code: 'FETCH_FAILED'
      });
    }
  }
);

router.get(
  '/:id/status',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const status = await paymentService.getPaymentLinkStatus(id);

      if (!status) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
          code: 'NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logger.error('Error fetching payment status', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentLinkId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment status',
        code: 'STATUS_FETCH_FAILED'
      });
    }
  }
);

router.get(
  '/:id/qrcode',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const qrCode = await paymentService.generateQRCode(id);

      if (!qrCode) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
          code: 'NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          qrCode
        }
      });
    } catch (error) {
      logger.error('Error generating QR code', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentLinkId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to generate QR code',
        code: 'QR_GENERATION_FAILED'
      });
    }
  }
);

router.post(
  '/share',
  authMiddleware,
  validateShareRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const request: ShareRequest = {
        paymentLinkId: req.body.paymentLinkId,
        channels: req.body.channels,
        recipientPhone: req.body.recipientPhone,
        recipientEmail: req.body.recipientEmail,
        customMessage: req.body.customMessage
      };

      const paymentLink = await paymentService.getPaymentLink(request.paymentLinkId);

      if (!paymentLink) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
          code: 'NOT_FOUND'
        });
        return;
      }

      if (paymentLink.merchantId !== req.merchantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      const result = await paymentService.sharePaymentLink(request);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error sharing payment link', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentLinkId: req.body.paymentLinkId
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Cannot share')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
          code: 'INVALID_STATUS'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to share payment link',
        code: 'SHARE_FAILED'
      });
    }
  }
);

router.post(
  '/refund',
  authMiddleware,
  validateRefundRequest,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const request: RefundRequest = {
        paymentLinkId: req.body.paymentLinkId,
        amount: req.body.amount,
        reason: req.body.reason,
        initiatedBy: req.merchantId!
      };

      const paymentLink = await paymentService.getPaymentLink(request.paymentLinkId);

      if (!paymentLink) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
          code: 'NOT_FOUND'
        });
        return;
      }

      if (paymentLink.merchantId !== req.merchantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      const result = await paymentService.initiateRefund(request);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error initiating refund', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentLinkId: req.body.paymentLinkId
      });

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage.includes('Cannot refund')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
          code: 'INVALID_REFUND_STATUS'
        });
        return;
      }

      if (errorMessage.includes('not found')) {
        res.status(404).json({
          success: false,
          error: errorMessage,
          code: 'NOT_FOUND'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to initiate refund',
        code: 'REFUND_FAILED'
      });
    }
  }
);

router.get(
  '/:id/refunds',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const paymentLink = await paymentService.getPaymentLink(id);

      if (!paymentLink) {
        res.status(404).json({
          success: false,
          error: 'Payment link not found',
          code: 'NOT_FOUND'
        });
        return;
      }

      if (paymentLink.merchantId !== req.merchantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          code: 'ACCESS_DENIED'
        });
        return;
      }

      const refunds = paymentService.getRefundsForPaymentLink(id);

      res.json({
        success: true,
        data: refunds
      });
    } catch (error) {
      logger.error('Error fetching refunds', {
        error: error instanceof Error ? error.message : 'Unknown error',
        paymentLinkId: req.params.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch refunds',
        code: 'REFUND_FETCH_FAILED'
      });
    }
  }
);

router.get(
  '/',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const filters: {
        status?: PaymentStatus;
        fromDate?: Date;
        toDate?: Date;
        limit?: number;
        offset?: number;
      } = {};

      if (req.query.status) {
        filters.status = req.query.status as PaymentStatus;
      }

      if (req.query.fromDate) {
        filters.fromDate = new Date(req.query.fromDate as string);
      }

      if (req.query.toDate) {
        filters.toDate = new Date(req.query.toDate as string);
      }

      if (req.query.limit) {
        const limit = parseInt(req.query.limit as string, 10);
        filters.limit = isNaN(limit) ? 20 : Math.min(limit, 100);
      }

      if (req.query.offset) {
        filters.offset = parseInt(req.query.offset as string, 10);
      }

      const paymentLinks = await paymentService.listPaymentLinks(req.merchantId!, filters);

      res.json({
        success: true,
        data: paymentLinks
      });
    } catch (error) {
      logger.error('Error listing payment links', {
        error: error instanceof Error ? error.message : 'Unknown error',
        merchantId: req.merchantId
      });

      res.status(500).json({
        success: false,
        error: 'Failed to list payment links',
        code: 'LIST_FAILED'
      });
    }
  }
);

export default router;
