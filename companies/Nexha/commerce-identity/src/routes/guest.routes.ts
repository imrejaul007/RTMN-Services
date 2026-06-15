import { Router, Request, Response } from 'express';
import { GuestSupplierService } from '../services/guest-supplier.service';
import { SutarBridgeService } from '../services/sutar-bridge.service';
import { issueGuestToken } from '../services/auth.service';
import { requireAuth } from '../middleware/auth.middleware';
import { asyncHandler, HttpError } from '../middleware/error.middleware';

const router = Router();

// POST /api/guest-suppliers/onboard - public registration (no GST)
router.post(
  '/onboard',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const guest = await GuestSupplierService.onboard(req.body);
    res.status(201).json({
      success: true,
      data: {
        guestId: guest.guestId,
        status: guest.status,
        expiresAt: guest.expiresAt,
        whatsapp: guest.whatsapp,
        promoCode: guest.promoCode,
        message: 'OTP dispatched to your WhatsApp number',
      },
    });
  })
);

// POST /api/guest-suppliers/:guestId/resend-otp
router.post(
  '/:guestId/resend-otp',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const guest = await GuestSupplierService.resendOtp(req.params.guestId);
    res.json({
      success: true,
      data: {
        guestId: guest.guestId,
        status: guest.status,
        message: 'OTP re-dispatched',
      },
    });
  })
);

// POST /api/guest-suppliers/:guestId/verify-otp
router.post(
  '/:guestId/verify-otp',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await GuestSupplierService.verifyOtp(req.params.guestId, req.body.code);
    if (!result.success) {
      throw new HttpError(400, result.message);
    }
    await SutarBridgeService.emitEvent('commerce.guest.activated', {
      guestId: result.guest?.guestId,
      businessName: result.guest?.businessName,
      city: result.guest?.city,
    });

    // Issue a short-lived guest JWT so they can immediately call protected endpoints
    const tokenResult = await issueGuestToken(result.guest!.guestId, result.guest!.whatsapp);

    res.json({
      success: true,
      data: {
        guestId: result.guest?.guestId,
        status: result.guest?.status,
        message: result.message,
        token: tokenResult.token,
        tokenExpiresAt: tokenResult.expiresAt,
      },
    });
  })
);

// POST /api/guest-suppliers/:guestId/convert - convert to full supplier
router.post(
  '/:guestId/convert',
  requireAuth('strict'),
  asyncHandler(async (req: Request, res: Response) => {
    const { corpId, documents } = req.body as { corpId: string; documents: { gstin?: string; pan?: string; fssai?: string; msme?: string } };
    if (!corpId) throw new HttpError(400, 'corpId is required');
    const result = await GuestSupplierService.convertToSupplier(req.params.guestId, corpId, documents || {});
    await SutarBridgeService.emitEvent('commerce.guest.converted', {
      guestId: result.guest.guestId,
      corpId: result.corpId,
    });
    res.json({ success: true, data: result });
  })
);

// GET /api/guest-suppliers/:guestId
router.get(
  '/:guestId',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const guest = await GuestSupplierService.getById(req.params.guestId);
    if (!guest) throw new HttpError(404, 'Guest supplier not found');
    // strip OTP history from public response
    const safe = guest.toObject();
    delete (safe as Record<string, unknown>).otpHistory;
    res.json({ success: true, data: safe });
  })
);

// GET /api/guest-suppliers - list active guests (internal use)
router.get(
  '/',
  requireAuth('strict'),
  asyncHandler(async (req: Request, res: Response) => {
    const { city, state, category, limit } = req.query;
    const guests = await GuestSupplierService.listActive({
      city: city as string | undefined,
      state: state as string | undefined,
      category: category as string | undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data: guests });
  })
);

// POST /api/guest-suppliers/:guestId/events - record RFQ/quote/deal events
router.post(
  '/:guestId/events',
  requireAuth('strict'),
  asyncHandler(async (req: Request, res: Response) => {
    const { event } = req.body as { event: 'rfq_received' | 'quote_submitted' | 'deal_completed' };
    if (!['rfq_received', 'quote_submitted', 'deal_completed'].includes(event)) {
      throw new HttpError(400, 'Invalid event type');
    }
    await GuestSupplierService.recordEvent(req.params.guestId, event);
    res.json({ success: true });
  })
);

export { router as guestSupplierRouter };
