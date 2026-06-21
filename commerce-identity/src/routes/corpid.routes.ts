import { Router, Request, Response } from 'express';
import { SutarBridgeService } from '../services/sutar-bridge.service';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler, HttpError } from '../middleware/error.middleware';
import { logger } from '../config/logger';

const router = Router();

/**
 * POST /api/corpid/issue
 *
 * Mint a new CorpID. Requires service-to-service auth (internal-key) OR a
 * valid system/admin JWT — closes B-AUTH-1 in NEXHA-DEEP-AUDIT.md (the
 * previous version was public and let anyone mint an admin corpId).
 *
 * The first public-flow that needs a corpId should use
 * `/api/guest-suppliers/onboard` instead (which is phone-OTP-verified).
 *
 * Internal callers (e.g. admin tools, future rez-auth-service integration)
 * send the x-internal-key header.
 */
router.post(
  '/issue',
  requireAuth('strict'),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, businessName, email, phone, isGuest } = req.body as {
      type: 'supplier' | 'buyer';
      businessName: string;
      email: string;
      phone: string;
      isGuest?: boolean;
    };
    if (!type || !businessName || !phone) {
      throw new HttpError(400, 'type, businessName, phone are required');
    }
    // requireAuth('strict') accepts either a JWT or an internal-key.
    // The internal-key path sets role='system' or 'admin'; JWT path matches
    // an identity. Either way, the caller is no longer anonymous.
    const corpId = await SutarBridgeService.requestCorpId({ type, businessName, email, phone, isGuest });
    logger.info('CorpID issued', { type, businessName, isGuest, corpId });
    res.json({ success: true, data: { corpId } });
  })
);

export { router as corpidRouter };
