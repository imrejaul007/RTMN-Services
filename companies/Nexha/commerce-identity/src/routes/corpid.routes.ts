import { Router, Request, Response } from 'express';
import { SutarBridgeService } from '../services/sutar-bridge.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

/**
 * POST /api/corpid/issue
 *
 * Public route (also used by the supplier/buyer registration flow) that
 * asks the SUTAR CorpID service to mint a new universal identity. If
 * SUTAR is unreachable we return a local fallback id.
 */
router.post(
  '/issue',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, businessName, email, phone, isGuest } = req.body as {
      type: 'supplier' | 'buyer';
      businessName: string;
      email: string;
      phone: string;
      isGuest?: boolean;
    };
    if (!type || !businessName || !phone) {
      res.status(400).json({ success: false, error: 'type, businessName, phone are required' });
      return;
    }
    const corpId = await SutarBridgeService.requestCorpId({ type, businessName, email, phone, isGuest });
    res.json({ success: true, data: { corpId } });
  })
);

export { router as corpidRouter };
