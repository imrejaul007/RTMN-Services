import { Request, Response, NextFunction } from 'express';
import { nbfcPartners, NBFCPartnerConfig } from '../config/nbfcPartners';
import { partnerService } from '../services/partnerService';

// Extended request interface with partner properties
export interface PartnerRequest extends Request {
  partnerId?: string;
  partnerConfig?: NBFCPartnerConfig;
  partnerHealth?: {
    available: boolean;
    latency: number;
    lastCheck: Date;
  };
}

/**
 * Middleware to authenticate NBFC partner requests
 * Validates the partner ID and signature in the request
 */
export const partnerAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partnerId = req.headers['x-partner-id'] as string;
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;

    // Validate partner ID exists and is enabled
    const partnerConfig = nbfcPartners[partnerId as keyof typeof nbfcPartners];
    if (!partnerConfig) {
      res.status(401).json({
        success: false,
        error: 'Unknown partner',
      });
      return;
    }

    if (!partnerConfig.enabled) {
      res.status(403).json({
        success: false,
        error: 'Partner is disabled',
      });
      return;
    }

    // Check timestamp to prevent replay attacks (within 30 seconds)
    if (timestamp) {
      const requestTime = new Date(timestamp).getTime();
      const now = Date.now();
      const thirtySeconds = 30 * 1000;

      if (Math.abs(now - requestTime) > thirtySeconds) {
        res.status(401).json({
          success: false,
          error: 'Request timestamp expired',
        });
        return;
      }
    }

    // Verify signature if provided
    if (signature && req.body) {
      const isValid = partnerService.verifyWebhookSignature(
        partnerId,
        JSON.stringify(req.body),
        signature
      );

      if (!isValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid signature',
        });
        return;
      }
    }

    // Attach partner info to request with proper typing
    const partnerReq = req as PartnerRequest;
    partnerReq.partnerId = partnerId;
    partnerReq.partnerConfig = partnerConfig;

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

/**
 * Middleware to verify partner health before operations
 */
export const requirePartnerHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const partnerReq = req as PartnerRequest;
    const partnerId = partnerReq.partnerId;

    if (!partnerId) {
      res.status(401).json({
        success: false,
        error: 'Partner not authenticated',
      });
      return;
    }

    const health = await partnerService.getPartnerHealth(partnerId);

    if (!health.available) {
      res.status(503).json({
        success: false,
        error: 'Partner service unavailable',
        partnerId,
      });
      return;
    }

    partnerReq.partnerHealth = health;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Partner health check failed',
    });
  }
};

/**
 * Rate limiting middleware for partner requests
 */
export const partnerRateLimit = (
  limit: number = 100,
  windowMs: number = 60000
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const partnerReq = req as PartnerRequest;
    const partnerId = partnerReq.partnerId || req.ip;
    const now = Date.now();

    let record = requests.get(partnerId);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      requests.set(partnerId, record);
    }

    record.count++;

    if (record.count > limit) {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - record.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    next();
  };
};
